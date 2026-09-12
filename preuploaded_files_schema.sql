-- ایجاد جدول فایل‌های پیش‌آپلود شده برای ارسال سریع ادمین
CREATE TABLE IF NOT EXISTS preuploaded_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'نام نمایشی فایل',
    description TEXT COMMENT 'توضیحات فایل',
    file_url VARCHAR(500) NOT NULL COMMENT 'مسیر فایل',
    file_type VARCHAR(100) COMMENT 'نوع فایل (image/video/document)',
    category VARCHAR(100) DEFAULT 'general' COMMENT 'دسته‌بندی فایل',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'فعال/غیرفعال',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- درج داده‌های نمونه
INSERT INTO preuploaded_files (name, description, file_url, file_type, category) VALUES
('مدرک شماره 1', 'عکس مظنون اصلی', '/uploads/preloaded/evidence1.jpg', 'image/jpeg', 'evidence'),
('مدرک شماره 2', 'فیلم نظارتی', '/uploads/preloaded/evidence2.mp4', 'video/mp4', 'evidence'),
('سرنخ A', 'نقشه محل جرم', '/uploads/preloaded/clue-a.jpg', 'image/jpeg', 'clues'),
('سرنخ B', 'گزارش پلیس', '/uploads/preloaded/clue-b.txt', 'text/plain', 'clues'),
('فیلم آموزشی', 'نحوه تحلیل شواهد', '/uploads/preloaded/tutorial.mp4', 'video/mp4', 'tutorial'),
('راهنمای بازی', 'قوانین و مقررات', '/uploads/preloaded/guide.pdf', 'application/pdf', 'guide');

-- ایجاد پوشه uploads/preloaded (باید دستی ایجاد شود)
-- mkdir uploads/preloaded
