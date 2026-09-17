import datetime
import logging
from sqlalchemy.orm import Session
from backend.models.database_models import Subscription, User, Product, ReminderLog
from backend.services.notifier import Notifier

logger = logging.getLogger("reminders")

class ReminderService:
    @classmethod
    async def check_expirations_and_remind(cls, db: Session):
        """
        Runs periodically to inspect all active subscriptions and dispatch renewal warnings.
        Stages:
        - 5 days before expiry -> User & Admin
        - 3 days before expiry -> User
        - Expiry Day -> User
        - 2 days past expiry -> Admin warning to revoke ChatGPT workspace seat!
        """
        now = datetime.datetime.utcnow()
        
        active_subs = db.query(Subscription).filter(
            Subscription.status.in_(["ACTIVE", "EXPIRED"]),
            Subscription.end_date.isnot(None)
        ).all()

        for sub in active_subs:
            user = db.query(User).filter(User.id == sub.user_id).first()
            product = db.query(Product).filter(Product.id == sub.product_id).first()
            if not user or not product:
                continue

            user_chat_id = user.telegram_id if sub.source_platform == "telegram" else user.bale_id
            diff = (sub.end_date - now).total_seconds()
            days_left = diff / 86400.0

            # 1. 5 Days Before Expiry (between 4.0 and 5.0 days)
            if 4.0 < days_left <= 5.0:
                await cls._send_reminder_once(
                    db=db, sub_id=sub.id, stage="5_DAYS", recipient="USER",
                    action=lambda: Notifier.notify_user(
                        sub.source_platform, user_chat_id,
                        f"⏳ <b>یادآوری تمدید اشتراک {product.name}</b>\n\n"
                        f"اشتراک شما ۵ روز دیگر به پایان می‌رسد.\n"
                        f"جهت حفظ دسترسی بدون وقفه، می‌توانید هم‌اکنون از منوی ربات اقدام به تمدید فرمایید."
                    )
                )
                await cls._send_reminder_once(
                    db=db, sub_id=sub.id, stage="5_DAYS", recipient="ADMIN",
                    action=lambda: Notifier.notify_admin(
                        f"⚠️ <b>نزدیک شدن به پایان اشتراک</b>\n\n"
                        f"اشتراک کاربر <b>{user.name}</b> ({user.phone or '-'}) برای محصول <b>{product.name}</b> ۵ روز دیگر تمام می‌شود."
                    )
                )

            # 2. 3 Days Before Expiry (between 2.0 and 3.0 days)
            elif 2.0 < days_left <= 3.0:
                await cls._send_reminder_once(
                    db=db, sub_id=sub.id, stage="3_DAYS", recipient="USER",
                    action=lambda: Notifier.notify_user(
                        sub.source_platform, user_chat_id,
                        f"⏳ <b>یادآوری دوم تمدید اشتراک {product.name}</b>\n\n"
                        f"فقط ۳ روز تا اتمام اشتراک شما باقی مانده است.\n"
                        f"برای تمدید و عدم قطع دسترسی، لطفاً اقدام به خرید پلن جدید فرمایید."
                    )
                )

            # 3. Expiry Day (0 to 1 day remaining)
            elif 0.0 <= days_left <= 1.0:
                await cls._send_reminder_once(
                    db=db, sub_id=sub.id, stage="EXPIRED_TODAY", recipient="USER",
                    action=lambda: Notifier.notify_user(
                        sub.source_platform, user_chat_id,
                        f"❗️ <b>پایان مهلت اشتراک {product.name}</b>\n\n"
                        f"اشتراک شما امروز به پایان می‌رسد.\n"
                        f"جهت جلوگیری از قطع دسترسی و حذف اکانت از فضای سازمانی، لطفاً امروز تمدید نمایید."
                    )
                )

            # 4. 2 Days Past Expiry (days_left <= -2.0) -> Alert Admin to revoke seat!
            elif days_left <= -2.0:
                if sub.status == "ACTIVE":
                    sub.status = "EXPIRED"
                    db.commit()

                await cls._send_reminder_once(
                    db=db, sub_id=sub.id, stage="2_DAYS_AFTER", recipient="ADMIN",
                    action=lambda: Notifier.notify_admin(
                        f"🚨 <b>اقدام ادمین: اشتراک منقضی شده!</b>\n\n"
                        f"اشتراک کاربر <b>{user.name}</b> ({user.phone or '-'}) برای محصول <b>{product.name}</b> ۲ روز است منقضی شده است.\n"
                        f"لطفاً دسترسی را بررسی و در صورت عدم تمدید از فضای Workspace سازمانی قطع کنید."
                    )
                )

    @classmethod
    async def _send_reminder_once(cls, db: Session, sub_id: int, stage: str, recipient: str, action):
        """Prevents duplicate reminder dispatches."""
        existing = db.query(ReminderLog).filter(
            ReminderLog.subscription_id == sub_id,
            ReminderLog.reminder_type == stage,
            ReminderLog.recipient == recipient
        ).first()

        if existing:
            return

        try:
            await action()
            log = ReminderLog(
                subscription_id=sub_id,
                reminder_type=stage,
                recipient=recipient
            )
            db.add(log)
            db.commit()
            logger.info(f"Logged reminder {stage} for sub {sub_id} ({recipient})")
        except Exception as e:
            logger.error(f"Failed sending reminder {stage} for sub {sub_id}: {e}")
