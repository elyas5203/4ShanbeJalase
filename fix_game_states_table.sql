-- Fix game_states table structure
USE detective_game;

-- Add progress column if it doesn't exist
ALTER TABLE game_states 
ADD COLUMN IF NOT EXISTS progress TEXT DEFAULT '{}';

-- Add current_stage column if it doesn't exist  
ALTER TABLE game_states 
ADD COLUMN IF NOT EXISTS current_stage INT DEFAULT 1;

-- Show table structure
DESCRIBE game_states;

-- Show current data
SELECT * FROM game_states;
