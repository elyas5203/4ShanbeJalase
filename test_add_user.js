// Test script to add sample users
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSampleUsers() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'detective_game'
        });

        console.log('Connected to database');

        // Add sample users
        const users = ['گروه ۱', 'گروه ۲', 'تیم آلفا', 'کلاس ۵ب'];
        
        for (const username of users) {
            try {
                // Check if user exists
                const [existing] = await connection.execute(
                    'SELECT id FROM users WHERE username = ?',
                    [username]
                );

                if (existing.length === 0) {
                    // Insert user
                    const [result] = await connection.execute(
                        'INSERT INTO users (username) VALUES (?)',
                        [username]
                    );
                    console.log(`Added user: ${username} (ID: ${result.insertId})`);
                } else {
                    console.log(`User already exists: ${username}`);
                }
            } catch (error) {
                console.error(`Error adding user ${username}:`, error.message);
            }
        }

        await connection.end();
        console.log('Sample users added successfully!');
    } catch (error) {
        console.error('Database connection error:', error);
    }
}

addSampleUsers();
