-- اضافه کردن ستون comment به جدول users
ALTER TABLE users ADD COLUMN comment TEXT DEFAULT NULL;

-- به‌روزرسانی کاربران موجود با کامنت پیش‌فرض
UPDATE users SET comment = 'کاربر عادی' WHERE comment IS NULL;
