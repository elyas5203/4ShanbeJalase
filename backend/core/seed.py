import json
from sqlalchemy.orm import Session
from backend.models.database_models import Product, Plan, SystemSetting

DEFAULT_SETTINGS = {
    "welcome_msg": "سلام {name} عزیز! 👋\nبه سیستم خرید اشتراک هوش مصنوعی خوش آمدید.",
    "support_msg": "📞 <b>پشتیبانی و سوالات:</b>\n\nبرای فعال‌سازی، تمدید یا دریافت راهنمایی با پشتیبانی در ارتباط باشید.",
    "reminder_5d_msg": "⏳ اشتراک {product} شما ۵ روز دیگر به پایان می‌رسد. لطفاً برای تمدید اقدام کنید.",
    "reminder_3d_msg": "⏳ فقط ۳ روز تا پایان اشتراک {product} شما باقی مانده است.",
    "reminder_exp_msg": "❗ اشتراک {product} شما امروز به پایان می‌رسد.",
    "admin_expired_msg": "🚨 اشتراک کاربر {name} ({phone}) برای محصول {product} دو روز است منقضی شده است. لطفاً دسترسی را بررسی کنید.",
}

def seed_initial_data(db: Session):
    for key, value in DEFAULT_SETTINGS.items():
        if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
            db.add(SystemSetting(key=key, value=value, category="messages"))
    db.commit()

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
