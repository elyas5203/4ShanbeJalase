import json
from sqlalchemy.orm import Session
from backend.models.database_models import Product, Plan

def seed_initial_data(db: Session):
    # Check if products already exist
    existing = db.query(Product).count()
    if existing > 0:
        return

    # Single Sample Product: AI Subscription
    ai_prod = Product(
        name="اشتراک هوش مصنوعی",
        slug="ai-subscription",
        description="دسترسی اختصاصی به سرویس هوش مصنوعی با بالاترین سرعت و بدون محدودیت.",
        is_active=True,
        required_fields=json.dumps([
            {"key": "name", "label": "نام و نام خانوادگی", "type": "text", "required": True},
            {"key": "phone", "label": "شماره موبایل فعال", "type": "phone", "required": True}
        ], ensure_ascii=False)
    )
    db.add(ai_prod)
    db.flush()

    # 1 Single Sample Plan
    db.add(
        Plan(product_id=ai_prod.id, name="پلن ۱ ماهه استاندارد (نمونه)", duration_days=30, price=350000, display_order=1)
    )

    db.commit()
    print("Initial fresh product and plan seeded successfully.")

