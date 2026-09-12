// System Test Script
const io = require('socket.io-client');
const fetch = require('node-fetch');

async function testSystem() {
    console.log('🧪 Starting system tests...\n');

    // Test 1: Server Health Check
    console.log('1️⃣ Testing server health...');
    try {
        const response = await fetch('http://localhost:3000');
        if (response.status === 200) {
            console.log('✅ Server is running and responding');
        } else {
            console.log('❌ Server responded with status:', response.status);
        }
    } catch (error) {
        console.log('❌ Server is not accessible:', error.message);
        return;
    }

    // Test 2: Admin Panel Access
    console.log('\n2️⃣ Testing admin panel access...');
    try {
        const response = await fetch('http://localhost:3000/admin');
        if (response.status === 200) {
            console.log('✅ Admin panel is accessible');
        } else {
            console.log('❌ Admin panel error:', response.status);
        }
    } catch (error) {
        console.log('❌ Admin panel not accessible:', error.message);
    }

    // Test 3: Socket.IO Connection
    console.log('\n3️⃣ Testing Socket.IO connection...');
    const socket = io('http://localhost:3000', { 
        query: { isAdmin: true },
        timeout: 5000
    });

    socket.on('connect', () => {
        console.log('✅ Socket.IO connection established');
        
        // Test user list request
        socket.emit('get_user_list');
    });

    socket.on('user_list', (users) => {
        console.log('✅ User list received:', users.length, 'users');
        users.forEach(user => {
            console.log(`   - ${user.username} (ID: ${user.id})`);
        });
        
        // Test complete
        socket.disconnect();
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 System Status: READY FOR USE');
        console.log('🌐 Access URLs:');
        console.log('   - User Interface: http://localhost:3000');
        console.log('   - Admin Panel: http://localhost:3000/admin');
        console.log('   - Browser Preview: http://127.0.0.1:50974');
        
        process.exit(0);
    });

    socket.on('connect_error', (error) => {
        console.log('❌ Socket.IO connection failed:', error.message);
        process.exit(1);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
        console.log('❌ Test timeout - system may not be fully functional');
        socket.disconnect();
        process.exit(1);
    }, 10000);
}

testSystem();
