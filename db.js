const mysql = require('mysql2');
require('dotenv').config();

// Create MySQL connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'detective_game',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Get promise-based pool for async/await usage
const promisePool = pool.promise();

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to MySQL database successfully');
    connection.release();
});

module.exports = promisePool;
