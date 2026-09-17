import datetime
import json
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.core.config import settings as app_settings
from backend.core.database import get_db
from backend.models.database_models import User, Product, Plan, Subscription, Payment, SystemSetting
from backend.services.subscription_service import SubscriptionService

security = HTTPBasic()

def require_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, app_settings.ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, app_settings.ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="نام کاربری یا رمز عبور ادمین اشتباه است.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

class ActivationPayload(BaseModel):
    admin_notes: str = ""

class SubscriptionUpdatePayload(BaseModel):
    status: str
    admin_notes: str = ""
    extend_days: int = 0

class ProductPayload(BaseModel):
    name: str
    slug: str
    description: str = ""
    is_active: bool = True
    required_fields: list = []

class ProductUpdatePayload(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    required_fields: Optional[list] = None

class PlanPayload(BaseModel):
    product_id: int
    name: str
    duration_days: int
    price: int
    payping_product_url: str = ""
    payping_product_code: str = ""
    is_active: bool = True
    display_order: int = 0

class PlanUpdatePayload(BaseModel):
    name: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[int] = None
    payping_product_url: Optional[str] = None
    payping_product_code: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class SettingPayload(BaseModel):
    key: str
    value: str

# 1. Statistics
@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    start_of_day = datetime.datetime(now.year, now.month, now.day)
    start_of_month = datetime.datetime(now.year, now.month, 1)

    today_sales = db.query(func.sum(Payment.amount)).filter(Payment.status == "SUCCESS", Payment.created_at >= start_of_day).scalar() or 0
    month_sales = db.query(func.sum(Payment.amount)).filter(Payment.status == "SUCCESS", Payment.created_at >= start_of_month).scalar() or 0
    total_sales = db.query(func.sum(Payment.amount)).filter(Payment.status == "SUCCESS").scalar() or 0

    active_count = db.query(Subscription).filter(Subscription.status == "ACTIVE").count()
    pending_count = db.query(Subscription).filter(Subscription.status == "PENDING_ACTIVATION").count()
    expired_count = db.query(Subscription).filter(Subscription.status == "EXPIRED").count()
    total_users = db.query(User).count()

    # Expiring in 5 days
    five_days_ahead = now + datetime.timedelta(days=5)
    expiring_soon_count = db.query(Subscription).filter(
        Subscription.status == "ACTIVE",
        Subscription.end_date.between(now, five_days_ahead)
    ).count()

    return {
        "today_sales": today_sales,
        "month_sales": month_sales,
        "total_sales": total_sales,
        "active_users": active_count,
        "pending_activation": pending_count,
        "expired_users": expired_count,
        "expiring_soon": expiring_soon_count,
        "total_users": total_users
    }

# 2. Subscriptions
@router.get("/subscriptions")
def list_subscriptions(status: str = None, search: str = None, db: Session = Depends(get_db)):
    q = db.query(Subscription).join(User).join(Product).join(Plan)
    if status:
        q = q.filter(Subscription.status == status)
    if search:
        q = q.filter((User.name.ilike(f"%{search}%")) | (User.phone.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    
    subs = q.order_by(Subscription.id.desc()).limit(100).all()
    results = []
    for s in subs:
        results.append({
            "id": s.id,
            "user": {
                "id": s.user.id,
                "name": s.user.name,
                "phone": s.user.phone,
                "email": s.user.email,
                "telegram_id": s.user.telegram_id,
                "bale_id": s.user.bale_id
            },
            "product": {"id": s.product.id, "name": s.product.name, "slug": s.product.slug},
            "plan": {"id": s.plan.id, "name": s.plan.name, "duration_days": s.plan.duration_days, "price": s.plan.price},
            "status": s.status,
            "source_platform": s.source_platform,
            "customer_info": json.loads(s.customer_info) if s.customer_info else {},
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "admin_notes": s.admin_notes,
            "auto_renew_count": s.auto_renew_count,
            "created_at": s.created_at.isoformat()
        })
    return results

@router.post("/subscriptions/{sub_id}/activate")
async def activate_subscription(sub_id: int, payload: ActivationPayload, db: Session = Depends(get_db)):
    success, msg = await SubscriptionService.activate_subscription(db, sub_id, payload.admin_notes)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

@router.patch("/subscriptions/{sub_id}")
def update_subscription(sub_id: int, payload: SubscriptionUpdatePayload, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="اشتراک یافت نشد.")
    
    sub.status = payload.status
    if payload.admin_notes:
        sub.admin_notes = payload.admin_notes
    if payload.extend_days > 0 and sub.end_date:
        sub.end_date = sub.end_date + datetime.timedelta(days=payload.extend_days)
        sub.auto_renew_count += 1
    
    db.commit()
    return {"message": "اشتراک به‌روزرسانی شد."}

# 3. Users
@router.get("/users")
def list_users(search: str = None, db: Session = Depends(get_db)):
    q = db.query(User)
    if search:
        q = q.filter((User.name.ilike(f"%{search}%")) | (User.phone.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    users = q.order_by(User.id.desc()).limit(100).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "email": u.email,
            "telegram_id": u.telegram_id,
            "bale_id": u.bale_id,
            "subscriptions_count": len(u.subscriptions),
            "created_at": u.created_at.isoformat()
        } for u in users
    ]

# 4. Products & Plans
@router.get("/products")
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    res = []
    for p in products:
        res.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "is_active": p.is_active,
            "required_fields": json.loads(p.required_fields) if p.required_fields else [],
            "plans": [
                {
                    "id": pl.id,
                    "name": pl.name,
                    "duration_days": pl.duration_days,
                    "price": pl.price,
                    "payping_product_url": pl.payping_product_url,
                    "payping_product_code": pl.payping_product_code,
                    "is_active": pl.is_active,
                    "display_order": pl.display_order
                } for pl in p.plans
            ]
        })
    return res

@router.post("/products")
def create_product(payload: ProductPayload, db: Session = Depends(get_db)):
    p = Product(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        is_active=payload.is_active,
        required_fields=json.dumps(payload.required_fields, ensure_ascii=False)
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"message": "محصول با موفقیت افزوده شد", "id": p.id}

@router.patch("/products/{product_id}")
def update_product(product_id: int, payload: ProductUpdatePayload, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="محصول یافت نشد.")

    if payload.name is not None:
        p.name = payload.name
    if payload.slug is not None:
        p.slug = payload.slug
    if payload.description is not None:
        p.description = payload.description
    if payload.is_active is not None:
        p.is_active = payload.is_active
    if payload.required_fields is not None:
        p.required_fields = json.dumps(payload.required_fields, ensure_ascii=False)

    db.commit()
    return {"message": "محصول به‌روزرسانی شد."}

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="محصول یافت نشد.")
    db.delete(p)
    db.commit()
    return {"message": "محصول حذف شد."}

@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).order_by(Plan.product_id, Plan.display_order).all()
    return [
        {
            "id": pl.id,
            "product_id": pl.product_id,
            "name": pl.name,
            "duration_days": pl.duration_days,
            "price": pl.price,
            "payping_product_url": pl.payping_product_url,
            "payping_product_code": pl.payping_product_code,
            "is_active": pl.is_active,
            "display_order": pl.display_order
        } for pl in plans
    ]

@router.post("/plans")
def create_plan(payload: PlanPayload, db: Session = Depends(get_db)):
    url = payload.payping_product_url.strip() if payload.payping_product_url else None
    if url and not url.startswith("http://") and not url.startswith("https://"):
        url = f"https://{url}"

    pl = Plan(
        product_id=payload.product_id,
        name=payload.name,
        duration_days=payload.duration_days,
        price=payload.price,
        payping_product_url=url,
        payping_product_code=payload.payping_product_code or None,
        is_active=payload.is_active,
        display_order=payload.display_order
    )
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return {"message": "پلن افزوده شد", "id": pl.id}

@router.patch("/plans/{plan_id}")
def update_plan(plan_id: int, payload: PlanUpdatePayload, db: Session = Depends(get_db)):
    pl = db.query(Plan).filter(Plan.id == plan_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="پلن یافت نشد.")

    if payload.name is not None:
        pl.name = payload.name
    if payload.duration_days is not None:
        pl.duration_days = payload.duration_days
    if payload.price is not None:
        pl.price = payload.price
    if payload.payping_product_url is not None:
        url = payload.payping_product_url.strip()
        if url and not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"
        pl.payping_product_url = url or None
    if payload.payping_product_code is not None:
        pl.payping_product_code = payload.payping_product_code or None
    if payload.is_active is not None:
        pl.is_active = payload.is_active
    if payload.display_order is not None:
        pl.display_order = payload.display_order

    db.commit()
    return {"message": "پلن به‌روزرسانی شد."}

@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    pl = db.query(Plan).filter(Plan.id == plan_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="پلن یافت نشد.")
    db.delete(pl)
    db.commit()
    return {"message": "پلن حذف شد."}

# 5. Payments
@router.get("/payments")
def list_payments(db: Session = Depends(get_db)):
    payments = db.query(Payment).order_by(Payment.id.desc()).limit(100).all()
    return [
        {
            "id": p.id,
            "subscription_id": p.subscription_id,
            "user_name": p.user.name if p.user else "-",
            "user_phone": p.user.phone if p.user else "-",
            "amount": p.amount,
            "client_ref_id": p.client_ref_id,
            "ref_id": p.ref_id,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "paid_at": p.paid_at.isoformat() if p.paid_at else None
        } for p in payments
    ]

# 6. Settings
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_list = db.query(SystemSetting).all()
    return {s.key: s.value for s in settings_list}

@router.post("/settings")
def update_setting(payload: SettingPayload, db: Session = Depends(get_db)):
    s = db.query(SystemSetting).filter(SystemSetting.key == payload.key).first()
    if s:
        s.value = payload.value
    else:
        s = SystemSetting(key=payload.key, value=payload.value)
        db.add(s)
    db.commit()
    return {"message": "تنظیمات ذخیره شد."}
