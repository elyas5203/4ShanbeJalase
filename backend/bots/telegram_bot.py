import json
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.models.database_models import Product, Plan, User, Subscription, SystemSetting
from backend.services.subscription_service import SubscriptionService

logger = logging.getLogger("telegram_bot")

class BuyWizard(StatesGroup):
    selecting_product = State()
    selecting_plan = State()
    entering_field = State()

def get_main_reply_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🛍 مشاهده و خرید اشتراک")],
            [KeyboardButton(text="📋 اشتراک‌های من"), KeyboardButton(text="📞 پشتیبانی")]
        ],
        resize_keyboard=True
    )

def setup_telegram_bot():
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram Bot Token is not set. Telegram Bot will not start polling.")
        return None, None

    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    dp = Dispatcher()

    @dp.message(Command("start"))
    async def cmd_start(message: types.Message, state: FSMContext):
        await state.clear()
        user_name = message.from_user.full_name or "کاربر"
        
        # Check custom welcome message from database
        db = SessionLocal()
        custom_welcome = None
        try:
            setting = db.query(SystemSetting).filter(SystemSetting.key == "welcome_msg").first()
            if setting and setting.value:
                custom_welcome = setting.value
        except Exception:
            pass
        finally:
            db.close()

        if custom_welcome:
            welcome_text = custom_welcome.replace("{name}", user_name)
        else:
            welcome_text = (
                f"سلام <b>{user_name}</b> عزیز! 👋\n\n"
                f"به سیستم خرید اشتراک هوش مصنوعی خوش آمدید.\n"
                f"جهت مشاهده و خرید اشتراک روی گزینه‌های زیر کلیک فرمایید:"
            )

        await message.answer(welcome_text, parse_mode="HTML", reply_markup=get_main_reply_keyboard())

    @dp.message(F.text == "🛍 مشاهده و خرید اشتراک")
    async def show_products(message: types.Message, state: FSMContext):
        await state.clear()
        db = SessionLocal()
        try:
            products = db.query(Product).filter(Product.is_active == True).all()
            if not products:
                await message.answer("در حال حاضر محصول فعالی در سیستم تعریف نشده است.")
                return

            buttons = []
            for p in products:
                buttons.append([InlineKeyboardButton(text=f"✨ {p.name}", callback_data=f"prod_{p.id}")])

            keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
            await message.answer("لطفاً محصول مورد نظر خود را انتخاب کنید:", reply_markup=keyboard)
        finally:
            db.close()

    @dp.callback_query(F.data.startswith("prod_"))
    async def on_product_selected(callback: types.CallbackQuery, state: FSMContext):
        product_id = int(callback.data.split("_")[1])
        db = SessionLocal()
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                await callback.answer("محصول یافت نشد!", show_alert=True)
                return

            plans = db.query(Plan).filter(Plan.product_id == product_id, Plan.is_active == True).order_by(Plan.display_order).all()
            if not plans:
                await callback.answer("پلنی برای این محصول تعریف نشده است.", show_alert=True)
                return

            await state.update_data(product_id=product_id, product_name=product.name)

            buttons = []
            for plan in plans:
                text = f"⏳ {plan.name} ({plan.duration_days} روز) - {plan.price:,} تومان"
                buttons.append([InlineKeyboardButton(text=text, callback_data=f"plan_{plan.id}")])
            buttons.append([InlineKeyboardButton(text="🔙 بازگشت به لیست محصولات", callback_data="back_products")])

            keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
            desc_text = f"📦 <b>{product.name}</b>\n\n{product.description or ''}\n\nلطفاً پلن مورد نظر خود را انتخاب کنید:"
            await callback.message.edit_text(desc_text, parse_mode="HTML", reply_markup=keyboard)
        finally:
            db.close()

    @dp.callback_query(F.data == "back_products")
    async def back_to_products(callback: types.CallbackQuery, state: FSMContext):
        db = SessionLocal()
        try:
            products = db.query(Product).filter(Product.is_active == True).all()
            buttons = [[InlineKeyboardButton(text=f"✨ {p.name}", callback_data=f"prod_{p.id}")] for p in products]
            keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)
            await callback.message.edit_text("لطفاً محصول مورد نظر خود را انتخاب کنید:", reply_markup=keyboard)
        finally:
            db.close()

    @dp.callback_query(F.data.startswith("plan_"))
    async def on_plan_selected(callback: types.CallbackQuery, state: FSMContext):
        plan_id = int(callback.data.split("_")[1])
        db = SessionLocal()
        try:
            plan = db.query(Plan).filter(Plan.id == plan_id).first()
            product = db.query(Product).filter(Product.id == plan.product_id).first()
            
            req_fields = json.loads(product.required_fields) if product.required_fields else []
            
            await state.update_data(
                plan_id=plan_id,
                plan_name=plan.name,
                plan_price=plan.price,
                required_fields=req_fields,
                current_field_index=0,
                collected_data={}
            )

            if not req_fields:
                # No dynamic fields needed, proceed directly to payment
                await initiate_payment(callback.message, state, callback.from_user)
                return

            first_field = req_fields[0]
            await state.set_state(BuyWizard.entering_field)
            prompt = (
                f"📝 برای صدور فاکتور <b>{product.name} ({plan.name})</b>:\n\n"
                f"لطفاً <b>{first_field.get('label', first_field.get('key'))}</b> خود را ارسال کنید:"
            )
            await callback.message.answer(prompt, parse_mode="HTML")
            await callback.answer()
        finally:
            db.close()

    @dp.message(BuyWizard.entering_field)
    async def process_field_input(message: types.Message, state: FSMContext):
        data = await state.get_data()
        fields = data.get("required_fields", [])
        idx = data.get("current_field_index", 0)
        collected = data.get("collected_data", {})

        current_field = fields[idx]
        key = current_field.get("key")
        collected[key] = message.text.strip()
        idx += 1

        if idx < len(fields):
            next_field = fields[idx]
            await state.update_data(current_field_index=idx, collected_data=collected)
            await message.answer(f"لطفاً <b>{next_field.get('label', next_field.get('key'))}</b> خود را ارسال فرمایید:", parse_mode="HTML")
        else:
            await state.update_data(collected_data=collected)
            await initiate_payment(message, state, message.from_user)

    async def initiate_payment(msg: types.Message, state: FSMContext, from_user: types.User):
        data = await state.get_data()
        product_id = data["product_id"]
        plan_id = data["plan_id"]
        plan_name = data["plan_name"]
        plan_price = data["plan_price"]
        collected = data.get("collected_data", {})

        db = SessionLocal()
        try:
            user = SubscriptionService.get_or_create_user(
                db=db,
                platform="telegram",
                platform_user_id=str(from_user.id),
                name=collected.get("name", from_user.full_name),
                phone=collected.get("phone", ""),
                email=collected.get("email", "")
            )

            payment_url, err = await SubscriptionService.create_purchase_order(
                db=db,
                user=user,
                product_id=product_id,
                plan_id=plan_id,
                customer_info=collected,
                platform="telegram"
            )

            if err:
                await msg.answer(f"❌ خطا در ایجاد فاکتور پرداخت:\n{err}")
                await state.clear()
                return

            buttons = [
                [InlineKeyboardButton(text="💳 پرداخت آنلاین با PayPing", url=payment_url)],
                [InlineKeyboardButton(text="🔄 بازگشت به منو", callback_data="back_products")]
            ]
            keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

            summary = (
                f"🧾 <b>فاکتور خرید اشتراک</b>\n\n"
                f"📦 محصول: <b>{data.get('product_name')}</b>\n"
                f"⏳ پلن: <b>{plan_name}</b>\n"
                f"💰 مبلغ فاکتور: <b>{plan_price:,} تومان</b>\n"
                f"👤 خریدار: <b>{user.name}</b>\n\n"
                f"<i>جهت تکمیل سفارش، روی دکمه پرداخت آنلاین زیر کلیک نمایید:</i>"
            )
            await msg.answer(summary, parse_mode="HTML", reply_markup=keyboard)
            await state.clear()
        finally:
            db.close()

    @dp.message(F.text == "📋 اشتراک‌های من")
    async def my_subscriptions(message: types.Message):
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
            if not user:
                await message.answer("شما تاکنون اشتراکی در سیستم ثبت نکرده‌اید.")
                return

            subs = db.query(Subscription).filter(Subscription.user_id == user.id).all()
            if not subs:
                await message.answer("هیچ اشتراکی برای حساب شما یافت نشد.")
                return

            text = "📋 <b>لیست اشتراک‌های شما:</b>\n\n"
            for s in subs:
                plan = s.plan
                prod = s.product
                status_fa = {
                    "ACTIVE": "🟢 فعال",
                    "PENDING_ACTIVATION": "🟡 در انتظار فعال‌سازی ادمین",
                    "EXPIRED": "🔴 منقضی شده",
                    "CANCELLED": "⚪️ لغو شده"
                }.get(s.status, s.status)

                end_str = s.end_date.strftime("%Y-%m-%d") if s.end_date else "هنوز ثبت نشده"
                text += (
                    f"▫️ <b>{prod.name} ({plan.name})</b>\n"
                    f"   وضعیت: {status_fa}\n"
                    f"   پایان اعتبار: <code>{end_str}</code>\n\n"
                )

            await message.answer(text, parse_mode="HTML")
        finally:
            db.close()

    @dp.message(F.text == "📞 پشتیبانی")
    async def support_info(message: types.Message):
        await message.answer(
            "📞 <b>پشتیبانی و سوالات:</b>\n\n"
            "در صورت وجود هرگونه سوال پیرامون فعال‌سازی، تمدید یا دسترسی، با تیم پشتیبانی در ارتباط باشید:\n"
            "🆔 آیدی پشتیبانی: @ai_support_admin\n"
            "⏱ ساعات پاسخگویی: ۹ صبح الی ۲۴",
            parse_mode="HTML"
        )

    return bot, dp
