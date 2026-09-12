-- به‌روزرسانی کاربران موجود که comment ندارند
UPDATE users SET comment = 'کاربر عادی' WHERE comment IS NULL OR comment = '';

-- نمایش کاربران برای بررسی
SELECT id, username, comment, created_at FROM users;
