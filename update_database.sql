-- اضافه کردن ستون hack_status به جدول users
-- این اسکریپت را در phpMyAdmin یا MySQL Workbench اجرا کنید

USE detective_game;

-- بررسی و اضافه کردن ستون hack_status اگر وجود نداشته باشد
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hack_status VARCHAR(20) DEFAULT NULL 
COMMENT 'وضعیت هک شدن کاربر: NULL=عادی, hacked=هک شده';

-- نمایش ساختار جدول به‌روزرسانی شده
DESCRIBE users;

-- نمایش تمام کاربران و وضعیت هک آنها
SELECT id, username, hack_status, created_at FROM users ORDER BY created_at DESC;
