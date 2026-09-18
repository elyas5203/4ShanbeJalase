import asyncio
import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from fastapi import Depends

from backend.core.config import settings
from backend.core.database import engine, Base, SessionLocal
from backend.core.seed import seed_initial_data
from backend.api.routes_admin import router as admin_router, require_admin
from backend.api.routes_payment import router as payment_router
from backend.bots.bot_runner import run_bots
from backend.services.reminder_service import ReminderService
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

scheduler = AsyncIOScheduler()

async def scheduled_reminder_task():
    logger.info("Executing scheduled expiration & reminder check...")
    db = SessionLocal()
    try:
        await ReminderService.check_expirations_and_remind(db)
    except Exception as e:
        logger.error(f"Error in reminder task: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SaaS Subscription Manager Backend...")
    # 1. Create DB Tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed Initial Products & Plans (sample data, edit/replace from admin panel)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()

    # 3. Start Background Bots
    bot_task = asyncio.create_task(run_bots())

    # 4. Start Scheduler for 5-day / 3-day / expiry reminders (Every 6 hours)
    scheduler.add_job(scheduled_reminder_task, 'interval', hours=6)
    scheduler.start()
    
    # Trigger one check after startup
    asyncio.create_task(scheduled_reminder_task())

    yield

    logger.info("Shutting down...")
    scheduler.shutdown()
    bot_task.cancel()

app = FastAPI(
    title="SaaS Subscription Manager API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_router)
app.include_router(admin_router)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SaaS Subscription Manager", "version": "1.0.0"}

# Serve admin panel on /admin and / (protected by admin username/password)
@app.get("/admin")
@app.get("/admin/{full_path:path}")
def serve_admin_panel(username: str = Depends(require_admin)):
    from fastapi.responses import FileResponse
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    elif os.path.exists("index.html"):
        return FileResponse("index.html")
    return {"message": "Admin Panel Build is being compiled or dist not found. Please build frontend."}

# Mount static frontend assets (JS/CSS bundles) if available.
# html=False so the SPA shell itself is only reachable via the
# password-protected /admin route above, not an unauthenticated "/".
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=False), name="static")

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=False)
