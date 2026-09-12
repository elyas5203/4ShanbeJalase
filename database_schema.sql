--
-- ساختار پایگاه داده برای: `detective_game` 
--

-- ایجاد پایگاه داده (در صورت عدم وجود)
CREATE DATABASE IF NOT EXISTS `detective_game` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `detective_game`;

-- --------------------------------------------------------

--
-- جدول `users` : برای ذخیره اطلاعات کاربران (گروه‌ها)
--
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- جدول `game_states` : برای ذخیره وضعیت بازی هر کاربر
--
CREATE TABLE `game_states` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `current_phase` INT DEFAULT 1 COMMENT '1: Normal, 2: Hacked, 3: Counter-Hack',
  `completed_stages` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- جدول `messages` : برای ذخیره تاریخچه چت‌ها
--
CREATE TABLE `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `sender_type` ENUM('user', 'detective', 'hacker', 'admin') NOT NULL,
  `content` TEXT NOT NULL,
  `message_type` ENUM('text', 'image', 'file') DEFAULT 'text',
  `file_path` VARCHAR(500) NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- جدول `admin_users` : برای مدیریت کارآگاهان (ادمین‌ها)
--
CREATE TABLE `admin_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('detective', 'senior_detective', 'admin') DEFAULT 'detective',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- جدول `game_sessions` : برای مدیریت جلسات بازی
--
CREATE TABLE `game_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `admin_id` INT NULL,
  `session_status` ENUM('waiting', 'active', 'completed', 'abandoned') DEFAULT 'waiting',
  `started_at` TIMESTAMP NULL,
  `ended_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- اضافه کردن ایندکس‌ها برای بهبود عملکرد
--
CREATE INDEX idx_messages_user_timestamp ON `messages` (`user_id`, `timestamp`);
CREATE INDEX idx_game_states_user ON `game_states` (`user_id`);
CREATE INDEX idx_game_sessions_user ON `game_sessions` (`user_id`);
CREATE INDEX idx_game_sessions_admin ON `game_sessions` (`admin_id`);

-- --------------------------------------------------------

--
-- داده‌های نمونه برای تست (اختیاری)
--
INSERT INTO `admin_users` (`username`, `password_hash`, `role`) VALUES
('detective1', '$2b$10$example_hash_here', 'detective'),
('senior_detective', '$2b$10$example_hash_here', 'senior_detective'),
('admin', '$2b$10$example_hash_here', 'admin');
