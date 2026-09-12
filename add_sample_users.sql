-- Add sample users for testing
USE detective_game;

-- Insert sample users
INSERT INTO users (username) VALUES 
('گروه ۱'),
('گروه ۲'), 
('تیم آلفا'),
('کلاس ۵ب');

-- Insert corresponding game states
INSERT INTO game_states (user_id, current_phase, progress) 
SELECT id, 'normal', '{}' FROM users WHERE username IN ('گروه ۱', 'گروه ۲', 'تیم آلفا', 'کلاس ۵ب');
