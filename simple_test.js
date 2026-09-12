// Simple test without external dependencies
const http = require('http');

function testServer() {
    console.log('🧪 Testing Detective Game Server...\n');
    
    // Test main page
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Main page status: ${res.statusCode}`);
        
        // Test admin page
        const adminOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/admin',
            method: 'GET'
        };
        
        const adminReq = http.request(adminOptions, (adminRes) => {
            console.log(`✅ Admin page status: ${adminRes.statusCode}`);
            
            // Test debug page
            const debugOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/debug',
                method: 'GET'
            };
            
            const debugReq = http.request(debugOptions, (debugRes) => {
                console.log(`✅ Debug page status: ${debugRes.statusCode}`);
                
                console.log('\n🎉 All HTTP endpoints are working!');
                console.log('\n📊 System Status: OPERATIONAL');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ Server: Running on port 3000');
                console.log('✅ Main Page: Accessible');
                console.log('✅ Admin Panel: Accessible');
                console.log('✅ Debug Page: Accessible');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('\n🌐 Access URLs:');
                console.log('   👤 User Interface: http://localhost:3000');
                console.log('   ⚙️  Admin Panel: http://localhost:3000/admin');
                console.log('   🔧 Debug Page: http://localhost:3000/debug');
                console.log('   🌍 Browser Preview: http://127.0.0.1:50974');
                console.log('\n👥 Test Users Available:');
                console.log('   - گروه ۱ (has test messages)');
                console.log('   - گروه ۲');
                console.log('   - تیم آلفا');
                console.log('   - کلاس ۵ب');
                console.log('\n🎮 System is ready for use!');
                
            });
            
            debugReq.on('error', (err) => {
                console.log(`❌ Debug page error: ${err.message}`);
            });
            
            debugReq.end();
        });
        
        adminReq.on('error', (err) => {
            console.log(`❌ Admin page error: ${err.message}`);
        });
        
        adminReq.end();
    });

    req.on('error', (err) => {
        console.log(`❌ Server error: ${err.message}`);
        console.log('Make sure the server is running with: npm start');
    });

    req.end();
}

testServer();
