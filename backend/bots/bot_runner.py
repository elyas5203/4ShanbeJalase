import asyncio
import logging
from backend.bots.telegram_bot import setup_telegram_bot
from backend.bots.bale_bot import BaleBot

logger = logging.getLogger("bot_runner")

async def run_bots():
    """Launches both Telegram Bot and Bale Bot concurrently."""
    tasks = []

    # 1. Start Telegram Bot if token provided
    try:
        bot, dp = setup_telegram_bot()
        if bot and dp:
            logger.info("Starting Telegram Bot Polling...")
            tasks.append(asyncio.create_task(dp.start_polling(bot)))
    except Exception as e:
        logger.error(f"Failed starting Telegram Bot: {e}")

    # 2. Start Bale Bot if token provided
    try:
        bale = BaleBot()
        if bale.token:
            logger.info("Starting Bale Bot Polling...")
            tasks.append(asyncio.create_task(bale.start_polling()))
    except Exception as e:
        logger.error(f"Failed starting Bale Bot: {e}")

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
