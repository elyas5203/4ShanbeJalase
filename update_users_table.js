const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'detective_game'
});

console.log('🔧 Updating users table structure...');

connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to database');
    
    // Check current table structure
    connection.query('DESCRIBE users', (err, results) => {
        if (err) {
            console.error('❌ Error describing table:', err.message);
            connection.end();
            return;
        }
        
        console.log('📋 Current table structure:');
        console.table(results);
        
        // Check if is_online column exists
        const hasIsOnline = results.some(row => row.Field === 'is_online');
        
        if (!hasIsOnline) {
            console.log('➕ Adding is_online column...');
            connection.query('ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE', (err) => {
                if (err) {
                    console.error('❌ Error adding is_online column:', err.message);
                } else {
                    console.log('✅ is_online column added successfully');
                }
                
                // Check if last_seen column exists
                const hasLastSeen = results.some(row => row.Field === 'last_seen');
                
                if (!hasLastSeen) {
                    console.log('➕ Adding last_seen column...');
                    connection.query('ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', (err) => {
                        if (err) {
                            console.error('❌ Error adding last_seen column:', err.message);
                        } else {
                            console.log('✅ last_seen column added successfully');
                        }
                        
                        console.log('🎉 Database update completed!');
                        connection.end();
                    });
                } else {
                    console.log('✅ last_seen column already exists');
                    console.log('🎉 Database update completed!');
                    connection.end();
                }
            });
        } else {
            console.log('✅ is_online column already exists');
            console.log('🎉 Database is up to date!');
            connection.end();
        }
    });
});
