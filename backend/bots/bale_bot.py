import asyncio
import json
import logging
import httpx
from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.models.database_models import Product, Plan, User, Subscription, SystemSetting
from backend.services.subscription_service import SubscriptionService

logger = logging.getLogger("bale_bot")

class BaleBot:
    def __init__(self):
        self.token = settings.BALE_BOT_TOKEN
        self.base_url = f"https://tapi.bale.ai/bot{self.token}"
        self.offset = 0
        self.user_states = {} # chat_id -> state dict

    async def send_message(self, chat_id: str, text: str, reply_markup=None):
        payload = {"chat_id": chat_id, "text": text}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(f"{self.base_url}/sendMessage", json=payload)
        except Exception as e:
            logger.error(f"Bale send_message failed: {e}")

    async def start_polling(self):
        if not self.token:
            logger.warning("Bale Bot Token is not set. Bale Bot will not start polling.")
            return

        logger.info("Starting Bale Bot polling...")
        while True:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(f"{self.base_url}/getUpdates", json={"offset": self.offset, "timeout": 20})
                    if resp.status_code == 200:
                        data = resp.json()
                        updates = data.get("result", [])
                        for update in updates:
                            self.offset = update["update_id"] + 1
                            await self.handle_update(update)
            except Exception as e:
                logger.error(f"Bale polling exception: {e}")
                await asyncio.sleep(5)

    async def handle_update(self, update: dict):
        # 1. Callback query from inline buttons
        if "callback_query" in update:
            cb = update["callback_query"]
            chat_id = str(cb["message"]["chat"]["id"])
            data = cb.get("data", "")
            await self.handle_callback(chat_id, data)
            return

        # 2. Text message
        if "message" in update and "text" in update["message"]:
            msg = update["message"]
            chat_id = str(msg["chat"]["id"])
            text = msg["text"].strip()
            sender_name = msg.get("from", {}).get("first_name", "کاربر بله")

            if text == "/start" or text == "منو":
                self.user_states.pop(chat_id, None)
                db = SessionLocal()
                try:
                    row = db.query(SystemSetting).filter(SystemSetting.key == "welcome_msg").first()
                    template = row.value if row and row.value else "سلام {name} عزیز! 🌸\nبه سامانه فروش اشتراک خوش آمدید."
                    welcome = template.replace("{name}", sender_name)
                finally:
                    db.close()
                keyboard = {
                    "inline_keyboard": [
                        [{"text": "🛍 مشاهده و خرید اشتراک", "callback_data": "show_products"}],
                        [{"text": "📋 استعلام وضعیت اشتراک‌های من", "callback_data": "my_subs"}]
                    ]
                }
                await self.send_message(chat_id, welcome, reply_markup=keyboard)
                return

            # Check if user is currently filling required fields
            state = self.user_states.get(chat_id)
            if state and state.get("step") == "entering_field":
                await self.process_field_input(chat_id, text, sender_name)

    async def handle_callback(self, chat_id: str, data: str):
        db = SessionLocal()
        try:
            if data == "show_products":
                products = db.query(Product).filter(Product.is_active == True).all()
                buttons = [[{"text": f"✨ {p.name}", "callback_data": f"prod_{p.id}"}] for p in products]
                keyboard = {"inline_keyboard": buttons}
                await self.send_message(chat_id, "لطفاً محصول مورد نظر را انتخاب نمایید:", reply_markup=keyboard)

            elif data.startswith("prod_"):
                prod_id = int(data.split("_")[1])
                product = db.query(Product).filter(Product.id == prod_id).first()
                plans = db.query(Plan).filter(Plan.product_id == prod_id, Plan.is_active == True).order_by(Plan.display_order).all()
                
                buttons = []
                for pl in plans:
                    buttons.append([{"text": f"⏳ {pl.name} ({pl.duration_days} روز) - {pl.price:,} تومان", "callback_data": f"plan_{pl.id}"}])
                buttons.append([{"text": "🔙 بازگشت به محصولات", "callback_data": "show_products"}])
                keyboard = {"inline_keyboard": buttons}

                text = f"📦 {product.name}\n\n{product.description or ''}\n\nپلن مورد نظر را انتخاب کنید:"
                await self.send_message(chat_id, text, reply_markup=keyboard)

            elif data.startswith("plan_"):
                plan_id = int(data.split("_")[1])
                plan = db.query(Plan).filter(Plan.id == plan_id).first()
                product = db.query(Product).filter(Product.id == plan.product_id).first()
                req_fields = json.loads(product.required_fields) if product.required_fields else []

                self.user_states[chat_id] = {
                    "step": "entering_field",
                    "product_id": product.id,
                    "product_name": product.name,
                    "plan_id": plan.id,
                    "plan_name": plan.name,
                    "plan_price": plan.price,
                    "fields": req_fields,
                    "field_index": 0,
                    "collected": {}
                }

                if not req_fields:
                    await self.finish_order(chat_id, "کاربر بله")
                    return

                first_field = req_fields[0]
                prompt = f"📝 لطفا {first_field.get('label', first_field.get('key'))} خود را ارسال نمایید:"
                await self.send_message(chat_id, prompt)

            elif data == "my_subs":
                user = db.query(User).filter(User.bale_id == chat_id).first()
                if not user or not user.subscriptions:
                    await self.send_message(chat_id, "شما اشتراک فعالی در بله ندارید.")
                    return
                msg = "📋 اشتراک‌های شما در سیستم:\n\n"
                for s in user.subscriptions:
                    end_str = s.end_date.strftime("%Y-%m-%d") if s.end_date else "در انتظار فعال‌سازی"
                    msg += f"▫️ {s.product.name} ({s.plan.name})\nوضعیت: {s.status}\nپایان: {end_str}\n\n"
                await self.send_message(chat_id, msg)
        finally:
            db.close()

    async def process_field_input(self, chat_id: str, text: str, sender_name: str):
        state = self.user_states[chat_id]
        fields = state["fields"]
        idx = state["field_index"]
        collected = state["collected"]

        key = fields[idx].get("key")
        collected[key] = text
        idx += 1

        if idx < len(fields):
            state["field_index"] = idx
            state["collected"] = collected
            next_f = fields[idx]
            await self.send_message(chat_id, f"لطفاً {next_f.get('label', next_f.get('key'))} خود را وارد فرمایید:")
        else:
            state["collected"] = collected
            await self.finish_order(chat_id, sender_name)

    async def finish_order(self, chat_id: str, sender_name: str):
        state = self.user_states.pop(chat_id, {})
        collected = state.get("collected", {})

        db = SessionLocal()
        try:
            user = SubscriptionService.get_or_create_user(
                db=db,
                platform="bale",
                platform_user_id=chat_id,
                name=collected.get("name", sender_name),
                phone=collected.get("phone", ""),
                email=collected.get("email", "")
            )

            payment_url, err = await SubscriptionService.create_purchase_order(
                db=db,
                user=user,
                product_id=state["product_id"],
                plan_id=state["plan_id"],
                customer_info=collected,
                platform="bale"
            )

            if err:
                await self.send_message(chat_id, f"❌ خطا در ساخت فاکتور:\n{err}")
                return

            keyboard = {
                "inline_keyboard": [
                    [{"text": "💳 پرداخت آنلاین فاکتور با PayPing", "url": payment_url}]
                ]
            }

            text = (
                f"🧾 فاکتور سفارش:\n\n"
                f"📦 محصول: {state['product_name']}\n"
                f"⏳ پلن: {state['plan_name']}\n"
                f"💰 مبلغ: {state['plan_price']:,} تومان\n\n"
                f"برای تکمیل خرید روی دکمه پرداخت زیر کلیک کنید:"
            )
            await self.send_message(chat_id, text, reply_markup=keyboard)
        finally:
            db.close()
