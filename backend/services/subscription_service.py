import json
import uuid
import datetime
from sqlalchemy.orm import Session
from backend.models.database_models import User, Product, Plan, Subscription, Payment
from backend.services.notifier import Notifier
from backend.services.payping_service import PayPingService

class SubscriptionService:
    @staticmethod
    def get_or_create_user(db: Session, platform: str, platform_user_id: str, name: str = "", phone: str = "", email: str = "") -> User:
        """Finds existing user by platform ID or phone, or creates a new user record."""
        user = None
        if platform == "telegram":
            user = db.query(User).filter(User.telegram_id == str(platform_user_id)).first()
        elif platform == "bale":
            user = db.query(User).filter(User.bale_id == str(platform_user_id)).first()
            
        if not user and phone:
            user = db.query(User).filter(User.phone == phone).first()

        if not user:
            user = User(
                name=name,
                phone=phone,
                email=email,
                telegram_id=str(platform_user_id) if platform == "telegram" else None,
                bale_id=str(platform_user_id) if platform == "bale" else None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update missing contact details
            updated = False
            if name and not user.name:
                user.name = name
                updated = True
            if phone and not user.phone:
                user.phone = phone
                updated = True
            if email and not user.email:
                user.email = email
                updated = True
            if platform == "telegram" and not user.telegram_id:
                user.telegram_id = str(platform_user_id)
                updated = True
            if platform == "bale" and not user.bale_id:
                user.bale_id = str(platform_user_id)
                updated = True
            if updated:
                db.commit()
                db.refresh(user)

        return user

    @staticmethod
    async def create_purchase_order(db: Session, user: User, product_id: int, plan_id: int, customer_info: dict, platform: str):
        """Creates a pending subscription & PayPing payment order."""
        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        product = db.query(Product).filter(Product.id == product_id).first()
        if not plan or not product:
            return None, "پلن یا محصول یافت نشد."

        # Check if user already has an active or pending subscription for this product (Smart Renewal)
        existing_sub = db.query(Subscription).filter(
            Subscription.user_id == user.id,
            Subscription.product_id == product.id,
            Subscription.status.in_(["ACTIVE", "PENDING_ACTIVATION"])
        ).first()

        if existing_sub:
            sub = existing_sub
            sub.plan_id = plan.id
            sub.customer_info = json.dumps(customer_info, ensure_ascii=False)
        else:
            sub = Subscription(
                user_id=user.id,
                product_id=product.id,
                plan_id=plan.id,
                status="PENDING_PAYMENT",
                source_platform=platform,
                customer_info=json.dumps(customer_info, ensure_ascii=False)
            )
            db.add(sub)
            db.flush()

        # If the plan has a direct PayPing product link (e.g. ppng.ir/d/gEQe), use it directly
        if plan.payping_product_url:
            direct_url = plan.payping_product_url.strip()
            if not direct_url.startswith("http://") and not direct_url.startswith("https://"):
                direct_url = f"https://{direct_url}"
            return direct_url, None

        # Generate unique reference ID
        client_ref_id = f"SUB-{sub.id}-{uuid.uuid4().hex[:6].upper()}"

        # Request PayPing payment
        desc = f"خرید {product.name} - {plan.name} برای {user.name or 'مشتری'}"
        pay_res = await PayPingService.create_payment(
            amount_tomans=plan.price,
            client_ref_id=client_ref_id,
            description=desc,
            payer_name=user.name or "",
            payer_phone=user.phone or ""
        )

        if not pay_res.get("success"):
            return None, pay_res.get("error", "خطا در برقراری ارتباط با درگاه پی‌پینگ")

        # Save payment transaction
        payment = Payment(
            subscription_id=sub.id,
            user_id=user.id,
            amount=plan.price,
            client_ref_id=client_ref_id,
            payment_code=pay_res.get("code"),
            status="PENDING"
        )
        db.add(payment)
        db.commit()

        return pay_res.get("payment_url"), None

    @staticmethod
    async def process_successful_payment(db: Session, client_ref_id: str, payment_code: str):
        """Called when user successfully returns from PayPing."""
        payment = db.query(Payment).filter(Payment.client_ref_id == client_ref_id).first()
        if not payment:
            return False, "تراکنش یافت نشد."

        if payment.status == "SUCCESS":
            return True, "این تراکنش قبلاً تأیید و ثبت شده است."

        # Verify with PayPing API
        verify_res = await PayPingService.verify_payment(payment_code, payment.amount)
        if not verify_res.get("success"):
            payment.status = "FAILED"
            db.commit()
            return False, f"تأیید تراکنش در درگاه ناموفق بود: {verify_res.get('error')}"

        payment.status = "SUCCESS"
        payment.ref_id = verify_res.get("ref_id", "")
        payment.paid_at = datetime.datetime.utcnow()

        # Update Subscription status and handle SMART RENEWAL
        sub = db.query(Subscription).filter(Subscription.id == payment.subscription_id).first()
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        product = db.query(Product).filter(Product.id == sub.product_id).first()
        user = db.query(User).filter(User.id == sub.user_id).first()

        now = datetime.datetime.utcnow()

        if sub.status == "ACTIVE" and sub.end_date and sub.end_date > now:
            # Smart renewal: Add plan days to existing end date!
            sub.end_date = sub.end_date + datetime.timedelta(days=plan.duration_days)
            sub.auto_renew_count += 1
            renewed = True
        else:
            # New purchase or expired renewal -> pending activation by admin
            sub.status = "PENDING_ACTIVATION"
            renewed = False

        db.commit()

        # 1. Notify Admin in Telegram
        cust_info_text = ""
        try:
            info_dict = json.loads(sub.customer_info) if sub.customer_info else {}
            for k, v in info_dict.items():
                cust_info_text += f"\n▫️ {k}: <b>{v}</b>"
        except:
            cust_info_text = sub.customer_info or ""

        admin_msg = (
            f"🔔 <b>خرید اشتراک جدید!</b>\n\n"
            f"👤 کاربر: <b>{user.name or 'بدون نام'}</b>\n"
            f"📞 شماره: <b>{user.phone or '-'}</b>\n"
            f"📦 محصول: <b>{product.name}</b>\n"
            f"⏳ پلن: <b>{plan.name} ({plan.duration_days} روز)</b>\n"
            f"💰 مبلغ: <b>{plan.price:,} تومان</b>\n"
            f"💳 کد پیگیری شاپرک: <code>{payment.ref_id}</code>\n"
            f"📋 اطلاعات ثبت‌شده:{cust_info_text}\n\n"
            f"⚡️ <i>لطفاً وارد پنل ادمین شده و اشتراک را فعال کنید.</i>"
        )
        await Notifier.notify_admin(admin_msg)

        # 2. Notify User in Telegram / Bale
        user_chat_id = user.telegram_id if sub.source_platform == "telegram" else user.bale_id
        if user_chat_id:
            user_msg = (
                f"✅ <b>پرداخت شما با موفقیت تأیید شد.</b>\n\n"
                f"سفارش شما برای <b>{product.name} ({plan.name})</b> با شماره پیگیری <code>{payment.ref_id}</code> ثبت گردید.\n"
                f"به زودی دسترسی شما فعال شده و مشخصات اطلاع‌رسانی خواهد شد.\n"
                f"با تشکر از اعتماد شما."
            )
            await Notifier.notify_user(sub.source_platform, user_chat_id, user_msg)

        return True, "پرداخت با موفقیت تأیید شد."

    @staticmethod
    async def activate_subscription(db: Session, subscription_id: int, admin_notes: str = ""):
        """Admin activates subscription from admin dashboard."""
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            return False, "اشتراک یافت نشد."

        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        product = db.query(Product).filter(Product.id == sub.product_id).first()
        user = db.query(User).filter(User.id == sub.user_id).first()

        now = datetime.datetime.utcnow()
        sub.status = "ACTIVE"
        sub.start_date = now
        sub.end_date = now + datetime.timedelta(days=plan.duration_days)
        if admin_notes:
            sub.admin_notes = admin_notes

        db.commit()

        # Send activation notice to buyer
        user_chat_id = user.telegram_id if sub.source_platform == "telegram" else user.bale_id
        if user_chat_id:
            msg = (
                f"🎉 <b>اشتراک شما فعال شد!</b>\n\n"
                f"محصول: <b>{product.name}</b>\n"
                f"مدت زمان: <b>{plan.duration_days} روز</b>\n"
                f"تاریخ پایان اعتبار: <b>{sub.end_date.strftime('%Y-%m-%d')}</b>\n\n"
                f"اکنون می‌توانید از خدمات استفاده کنید. در صورت نیاز به راهنمایی با پشتیبانی در ارتباط باشید."
            )
            await Notifier.notify_user(sub.source_platform, user_chat_id, msg)

        return True, "اشتراک با موفقیت فعال گردید."
