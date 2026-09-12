// Add test messages to database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTestMessages() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'detective_game'
        });

        console.log('Connected to database');

        // Add test messages for user ID 6 (گروه ۱)
        const testMessages = [
            { user_id: 6, sender_type: 'user', content: 'سلام کارآگاه! من آماده شروع ماموریت هستم.' },
            { user_id: 6, sender_type: 'detective', content: 'سلام! خوش آمدید. ماموریت اول شما شروع شده است.' },
            { user_id: 6, sender_type: 'user', content: 'چه کاری باید انجام دهم؟' },
            { user_id: 6, sender_type: 'detective', content: 'ابتدا باید سرنخ‌های موجود در محل جرم را بررسی کنید.' }
        ];

        for (const message of testMessages) {
            try {
                await connection.execute(
                    'INSERT INTO messages (user_id, sender_type, content) VALUES (?, ?, ?)',
                    [message.user_id, message.sender_type, message.content]
                );
                console.log(`Added message: ${message.content.substring(0, 30)}...`);
            } catch (error) {
                console.error('Error adding message:', error.message);
            }
        }

        // Check total messages
        const [count] = await connection.execute('SELECT COUNT(*) as total FROM messages');
        console.log(`Total messages in database: ${count[0].total}`);

        await connection.end();
        console.log('Test messages added successfully!');
    } catch (error) {
        console.error('Database connection error:', error);
    }
}

addTestMessages();
