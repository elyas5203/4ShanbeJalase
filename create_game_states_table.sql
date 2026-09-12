-- ایجاد جدول game_states برای ذخیره پیشرفت ماموریت کاربران

CREATE TABLE IF NOT EXISTS game_states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    progress INT DEFAULT 0,
    current_phase VARCHAR(50) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
);

-- اضافه کردن داده‌های اولیه برای کاربران موجود
INSERT IGNORE INTO game_states (user_id, progress, current_phase)
SELECT id, 0, 'normal' FROM users;

-- نمایش جدول ایجاد شده
SELECT * FROM game_states;
