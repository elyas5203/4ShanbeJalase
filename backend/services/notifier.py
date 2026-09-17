import logging
import httpx
from backend.core.config import settings

logger = logging.getLogger("notifier")

class Notifier:
    @staticmethod
    async def send_telegram_message(chat_id: str, text: str):
        """Sends a message via Telegram Bot API using HTTP."""
        token = settings.TELEGRAM_BOT_TOKEN
        if not token or not chat_id:
            logger.info(f"[TELEGRAM SIMULATOR] To: {chat_id} | Text: {text}")
            return False
            
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            logger.error(f"Error sending Telegram message to {chat_id}: {e}")
            return False

    @staticmethod
    async def send_bale_message(chat_id: str, text: str):
        """Sends a message via Bale Messenger Bot API using HTTP."""
        token = settings.BALE_BOT_TOKEN
        if not token or not chat_id:
            logger.info(f"[BALE SIMULATOR] To: {chat_id} | Text: {text}")
            return False
            
        url = f"https://tapi.bale.ai/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            logger.error(f"Error sending Bale message to {chat_id}: {e}")
            return False

    @classmethod
    async def notify_admin(cls, text: str):
        """Sends administrative notifications to the designated Telegram admin chat."""
        admin_chat = settings.ADMIN_TELEGRAM_CHAT_ID
        if admin_chat:
            await cls.send_telegram_message(admin_chat, text)
        else:
            logger.info(f"[ADMIN ALERT] {text}")

    @classmethod
    async def notify_user(cls, platform: str, chat_id: str, text: str):
        """Dispatches notification to user based on their origin platform."""
        if platform == "telegram":
            await cls.send_telegram_message(chat_id, text)
        elif platform == "bale":
            await cls.send_bale_message(chat_id, text)
        else:
            logger.warning(f"Unknown platform '{platform}' for user chat {chat_id}")
