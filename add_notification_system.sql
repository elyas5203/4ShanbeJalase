-- اضافه کردن ستون برای شمارش پیام‌های خوانده نشده
ALTER TABLE users ADD COLUMN unread_count INT DEFAULT 0;

-- اضافه کردن ستون برای ردیابی آخرین بازدید ادمین از چت کاربر
ALTER TABLE users ADD COLUMN last_admin_read TIMESTAMP NULL;

-- به‌روزرسانی تمام کاربران موجود
UPDATE users SET unread_count = 0, last_admin_read = CURRENT_TIMESTAMP WHERE unread_count IS NULL;

-- نمایش جدول به‌روز شده
SELECT id, username, unread_count, last_admin_read FROM users;
