-- Create preuploaded_files table for quick file sending
CREATE TABLE IF NOT EXISTS preuploaded_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type ENUM('image', 'video', 'document') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add current_phase column to game_states if it doesn't exist
ALTER TABLE game_states 
ADD COLUMN IF NOT EXISTS current_phase VARCHAR(50) DEFAULT 'normal';

-- Insert some sample preloaded files
INSERT INTO preuploaded_files (file_name, file_url, file_type, description) VALUES
('evidence1.jpg', '/uploads/preloaded/evidence1.jpg', 'image', 'سرنخ اول - عکس صحنه جرم'),
('evidence2.jpg', '/uploads/preloaded/evidence2.jpg', 'image', 'مدرک دوم - عکس اثر انگشت'),
('video1.mp4', '/uploads/preloaded/video1.mp4', 'video', 'فیلم اول - ضبط دوربین مداربسته'),
('video2.mp4', '/uploads/preloaded/video2.mp4', 'video', 'فیلم دوم - مصاحبه شاهد'),
('hacker_msg.jpg', '/uploads/preloaded/hacker_msg.jpg', 'image', 'پیام هکر - تهدید سایبری'),
('senior_intro.mp4', '/uploads/preloaded/senior_intro.mp4', 'video', 'معرفی کارآگاه ارشد');
