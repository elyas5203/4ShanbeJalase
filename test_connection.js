const mysql = require('mysql2');
require('dotenv').config();

// Test database connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'detective_game'
});

console.log('🔍 Testing database connection...');

connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('💡 Make sure MySQL is running and database exists');
        process.exit(1);
    }
    
    console.log('✅ Connected to MySQL database successfully');
    
    // Test if users table exists
    connection.query('DESCRIBE users', (err, results) => {
        if (err) {
            console.error('❌ Users table not found:', err.message);
            console.log('💡 Run database_schema.sql or fix_users_table.sql first');
        } else {
            console.log('✅ Users table structure:');
            console.table(results);
        }
        
        connection.end();
    });
});
