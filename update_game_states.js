// Update game states for testing mission map
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateGameStates() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'detective_game'
        });

        console.log('Connected to database');

        // Update game states for testing
        const gameStates = [
            { user_id: 6, current_stage: 3, completed_stages: [1, 2] }, // گروه ۱ - has some progress
            { user_id: 7, current_stage: 1, completed_stages: [] },     // گروه ۲ - just started
            { user_id: 8, current_stage: 5, completed_stages: [1, 2, 3, 4] }, // تیم آلفا - advanced
            { user_id: 9, current_stage: 1, completed_stages: [] }      // کلاس ۵ب - just started
        ];

        for (const state of gameStates) {
            try {
                // Check if game state exists
                const [existing] = await connection.execute(
                    'SELECT id FROM game_states WHERE user_id = ?',
                    [state.user_id]
                );

                const progress = JSON.stringify({ completed_stages: state.completed_stages });

                if (existing.length > 0) {
                    // Update existing
                    await connection.execute(
                        'UPDATE game_states SET current_phase = ?, progress = ? WHERE user_id = ?',
                        [`stage-${state.current_stage}`, progress, state.user_id]
                    );
                    console.log(`Updated game state for user ${state.user_id}`);
                } else {
                    // Insert new
                    await connection.execute(
                        'INSERT INTO game_states (user_id, current_phase, progress) VALUES (?, ?, ?)',
                        [state.user_id, `stage-${state.current_stage}`, progress]
                    );
                    console.log(`Created game state for user ${state.user_id}`);
                }
            } catch (error) {
                console.error(`Error updating game state for user ${state.user_id}:`, error.message);
            }
        }

        // Show current game states
        const [allStates] = await connection.execute(`
            SELECT gs.*, u.username 
            FROM game_states gs 
            JOIN users u ON gs.user_id = u.id 
            ORDER BY gs.user_id
        `);

        console.log('\n📊 Current Game States:');
        allStates.forEach(state => {
            const progress = state.progress ? JSON.parse(state.progress) : {};
            console.log(`- ${state.username}: Stage ${state.current_phase} | Completed: [${progress.completed_stages?.join(', ') || 'none'}]`);
        });

        await connection.end();
        console.log('\n✅ Game states updated successfully!');
    } catch (error) {
        console.error('Database connection error:', error);
    }
}

updateGameStates();
