-- اضافه کردن ستون is_online به جدول users
USE detective_game;

ALTER TABLE `users` ADD COLUMN `is_online` BOOLEAN DEFAULT FALSE AFTER `username`;

-- اضافه کردن ستون‌های مورد نیاز برای messages
ALTER TABLE `messages` ADD COLUMN `file_url` VARCHAR(500) NULL AFTER `content`;
ALTER TABLE `messages` ADD COLUMN `file_type` VARCHAR(100) NULL AFTER `file_url`;

-- به‌روزرسانی ساختار game_states برای پشتیبانی از فازهای جدید
ALTER TABLE `game_states` MODIFY COLUMN `current_phase` VARCHAR(20) DEFAULT 'normal';
ALTER TABLE `game_states` ADD COLUMN `progress` INT DEFAULT 0 AFTER `current_phase`;

-- نمایش ساختار جداول برای تأیید
DESCRIBE users;
DESCRIBE messages;
DESCRIBE game_states;
