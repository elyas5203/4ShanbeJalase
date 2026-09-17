import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. "ChatGPT سازمانی"
    slug = Column(String(50), unique=True, nullable=False, index=True) # "chatgpt", "gemini"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    # Stored as JSON string: '[{"key": "name", "label": "نام و نام خانوادگی", "required": true}, ...]'
    required_fields = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    plans = relationship("Plan", back_populates="product", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="product")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String(100), nullable=False) # e.g. "پلن ۱ ماهه"
    duration_days = Column(Integer, nullable=False) # 30, 60, 90
    price = Column(Integer, nullable=False) # in Tomans
    payping_product_url = Column(String(255), nullable=True) # Direct payment link e.g. ppng.ir/d/gEQe
    payping_product_code = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="plans")
    subscriptions = relationship("Subscription", back_populates="plan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True, index=True)
    email = Column(String(150), nullable=True, index=True)
    telegram_id = Column(String(100), nullable=True, index=True)
    bale_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subscriptions = relationship("Subscription", back_populates="user")
    payments = relationship("Payment", back_populates="user")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    
    # Status: PENDING_ACTIVATION, ACTIVE, EXPIRED, CANCELLED
    status = Column(String(30), default="PENDING_ACTIVATION", index=True)
    source_platform = Column(String(20), default="telegram") # 'telegram' | 'bale'
    
    # JSON string of submitted fields (e.g. {"name": "...", "phone": "...", "email": "..."})
    customer_info = Column(Text, default="{}")
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    admin_notes = Column(Text, nullable=True) # Workspace email or invite logs
    auto_renew_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="subscriptions")
    product = relationship("Product", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")
    reminder_logs = relationship("ReminderLog", back_populates="subscription", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False) # Tomans
    client_ref_id = Column(String(100), unique=True, nullable=False, index=True)
    payment_code = Column(String(100), nullable=True) # PayPing code
    ref_id = Column(String(150), nullable=True) # Banking RefId
    status = Column(String(30), default="PENDING", index=True) # PENDING, SUCCESS, FAILED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    subscription = relationship("Subscription", back_populates="payments")
    user = relationship("User", back_populates="payments")


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    reminder_type = Column(String(30), nullable=False) # '5_DAYS', '3_DAYS', 'EXPIRED_TODAY', '2_DAYS_AFTER'
    recipient = Column(String(20), default="USER") # 'USER' or 'ADMIN'
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

    subscription = relationship("Subscription", back_populates="reminder_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    category = Column(String(50), default="general")
    description = Column(Text, nullable=True)
