// ========== کاکپیت سینمایی کارآگاهی ==========
// کلاینت کامل با کره زمین سه‌بعدی، ویجت‌های HUD و ساعت دیجیتال

console.log('🎬 کاکپیت سینمایی در حال بارگذاری...');

// ========== متغیرهای سراسری ==========
let socket;
let messageCounter = 0;
let sessionStartTime = Date.now();

// عناصر DOM
let chatMessages;
let messageInput;
let sendButton;
let fileInput;

// متغیرهای Three.js برای کره زمین
let scene, camera, renderer, earthMesh;

// متغیرهای HUD
let cpuUsage = 45;
let ramUsage = 67;
let missionProgress = 78;

// کاراکترهای رمزگشایی
const scrambleChars = "ABCDEFGHIJKLMN0123456789Δ#@$٠١٢٣٤٥٦٧٨٩";

// ========== تابع اصلی مقداردهی ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 شروع مقداردهی کاکپیت...');
    
    initializeElements();
    initializeDigitalClock();
    initializeEarth();
    initializeChat();
    initializeHUD();
    initializeEventListeners();
    
    console.log('✅ کاکپیت سینمایی آماده است!');
});

// ========== مقداردهی عناصر DOM ==========
function initializeElements() {
    chatMessages = document.getElementById('chatMessages');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    fileInput = document.getElementById('fileInput');
    
    if (!chatMessages || !messageInput || !sendButton) {
        console.error('❌ عناصر DOM یافت نشدند');
        return;
    }
    
    console.log('✅ عناصر DOM مقداردهی شدند');
}

// ========== ساعت دیجیتال ==========
function initializeDigitalClock() {
    function pad(n) { 
        return n < 10 ? '0' + n : '' + n; 
    }
    
    function updateClock() { 
        const now = new Date();
        const h = pad(now.getHours());
        const m = pad(now.getMinutes());
        const s = pad(now.getSeconds());
        
        const clockElement = document.getElementById('clock');
        if (clockElement) {
            clockElement.innerHTML = `${h}<span class="sep">:</span>${m}<span class="sep">:</span>${s}`;
        }
        
        requestAnimationFrame(updateClock); 
    }
    
    updateClock();
    console.log('🕐 ساعت دیجیتال فعال شد');
}

// ========== کره زمین سه‌بعدی ==========
function initializeEarth() {
    const canvas = document.getElementById('earth-canvas');
    if (!canvas) {
        console.error('❌ Canvas کره زمین یافت نشد');
        return;
    }
    
    const container = canvas.parentElement;
    
    // ایجاد صحنه
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 3;
    
    // رندرر
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    
    // نورپردازی
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 3, 5);
    scene.add(directional);
    
    // بافت و مواد کره زمین
    const loader = new THREE.TextureLoader();
    loader.load(
        "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg",
        function(texture) {
            const earthMaterial = new THREE.MeshPhongMaterial({ map: texture });
            const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
            earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
            scene.add(earthMesh);
            
            console.log('🌍 کره زمین بارگذاری شد');
            animateEarth();
        },
        function(progress) {
            console.log('📥 بارگذاری بافت کره زمین:', Math.round((progress.loaded / progress.total) * 100) + '%');
        },
        function(error) {
            console.error('❌ خطا در بارگذاری بافت کره زمین:', error);
            // ایجاد کره ساده بدون بافت
            const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x4488ff });
            const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
            earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
            scene.add(earthMesh);
            animateEarth();
        }
    );
}

function animateEarth() {
    requestAnimationFrame(animateEarth);
    
    if (earthMesh) {
        earthMesh.rotation.y += 0.002;
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// تنظیم مجدد سایز هنگام تغییر اندازه پنجره
function handleEarthResize() {
    const canvas = document.getElementById('earth-canvas');
    if (!canvas || !camera || !renderer) return;
    
    const container = canvas.parentElement;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ========== سیستم چت ==========
function initializeChat() {
    socket = io({
        query: {
            userId: userId,
            username: username
        }
    });
    
    socket.on('connect', () => {
        console.log('🔗 اتصال به سرور برقرار شد');
        addSystemMessage('اتصال به سرور برقرار شد');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 اتصال قطع شد');
        addSystemMessage('اتصال قطع شد');
    });
    
    socket.on('new_message', (messageData) => {
        console.log('📨 پیام جدید دریافت شد:', messageData);
        displayMessage(messageData);
    });
    
    socket.on('scrambled_message', (messageData) => {
        console.log('🔐 پیام رمزی دریافت شد:', messageData);
        displayScrambledMessage(messageData);
    });
    
    // بارگذاری تاریخچه چت
    socket.emit('load_chat_history', { userId: userId });
    
    socket.on('chat_history', (messages) => {
        console.log('📚 تاریخچه چت بارگذاری شد:', messages.length, 'پیام');
        messages.forEach(message => {
            displayMessage(message, false);
        });
    });
}

function displayMessage(messageData, withAnimation = true) {
    const messageDiv = document.createElement('div');
    const senderType = messageData.sender_type || 'user';
    const senderName = getSenderName(senderType);
    const timestamp = formatTimestamp(messageData.timestamp);
    
    messageDiv.className = `message ${senderType}`;
    
    if (messageData.file_url) {
        // پیام با فایل
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            messageDiv.innerHTML = `
                <strong>${senderName}:</strong><br>
                <img src="${messageData.file_url}" alt="تصویر" style="max-width: 200px; border-radius: 8px; margin-top: 5px; cursor: pointer;" onclick="openImageModal('${messageData.file_url}')">
                ${messageData.content ? '<br>' + messageData.content : ''}
            `;
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            messageDiv.innerHTML = `
                <strong>${senderName}:</strong><br>
                <video src="${messageData.file_url}" controls style="max-width: 200px; border-radius: 8px; margin-top: 5px;">
                    مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                </video>
                ${messageData.content ? '<br>' + messageData.content : ''}
            `;
        } else {
            messageDiv.innerHTML = `
                <strong>${senderName}:</strong><br>
                ${messageData.content || ''}
                <br><a href="${messageData.file_url}" target="_blank" style="color: var(--accent);">📎 فایل ضمیمه</a>
            `;
        }
    } else {
        // پیام متنی عادی
        const formattedContent = (messageData.content || '').replace(/\n/g, '<br>');
        messageDiv.innerHTML = `<strong>${senderName}:</strong><br>${formattedContent}`;
    }
    
    chatMessages.appendChild(messageDiv);
    
    // انیمیشن ظهور
    if (withAnimation) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
        setTimeout(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
    }
    
    // اسکرول به پایین
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // به‌روزرسانی شمارنده پیام‌ها
    messageCounter++;
    updateMessageCount();
}

function displayScrambledMessage(messageData) {
    const messageDiv = document.createElement('div');
    const senderType = messageData.sender_type || 'admin';
    const senderName = getSenderName(senderType);
    
    messageDiv.className = `message ${senderType}`;
    messageDiv.innerHTML = `<strong>${senderName}:</strong><br>█ █ █ █ █ █ █ █ █ █`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // انیمیشن رمزگشایی
    setTimeout(() => {
        scrambleToText(messageDiv, messageData.content, senderName);
    }, 500);
    
    messageCounter++;
    updateMessageCount();
}

function scrambleToText(element, finalText, senderName) {
    const duration = 2000; // 2 ثانیه
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        let displayText = '';
        for (let i = 0; i < finalText.length; i++) {
            if (progress > i / finalText.length) {
                displayText += finalText[i];
            } else {
                displayText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            }
        }
        
        element.innerHTML = `<strong>${senderName}:</strong><br>${displayText}`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function addSystemMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.innerHTML = content;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;
    
    const messageData = {
        userId: userId,
        content: content,
        senderType: 'user'
    };
    
    socket.emit('user_message', messageData);
    
    // نمایش پیام فوری برای کاربر
    displayMessage({
        ...messageData,
        sender_type: 'user',
        timestamp: new Date().toISOString()
    });
    
    // پاک کردن ورودی
    messageInput.value = '';
    autoResizeTextarea();
}

function getSenderName(senderType) {
    const names = {
        'user': 'شما',
        'detective': 'کارآگاه',
        'hacker': 'هکر',
        'admin': 'مرکز فرماندهی'
    };
    return names[senderType] || senderType;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// ========== ویجت‌های HUD ==========
function initializeHUD() {
    updateHUDValues();
    setInterval(updateHUDValues, 3000); // به‌روزرسانی هر 3 ثانیه
    console.log('📊 ویجت‌های HUD فعال شدند');
}

function updateHUDValues() {
    // به‌روزرسانی CPU و RAM به صورت تصادفی برای نمایش
    cpuUsage = Math.floor(Math.random() * 30) + 30; // 30-60%
    ramUsage = Math.floor(Math.random() * 40) + 50; // 50-90%
    
    const cpuElement = document.getElementById('cpu-usage');
    const ramElement = document.getElementById('ram-usage');
    
    if (cpuElement) {
        cpuElement.textContent = cpuUsage + '%';
        const cpuBar = document.querySelector('.hud-widget:nth-child(1) .hud-bar .hud-bar-fill');
        if (cpuBar) cpuBar.style.width = cpuUsage + '%';
    }
    
    if (ramElement) {
        ramElement.textContent = ramUsage + '%';
        const ramBar = document.querySelector('.hud-widget:nth-child(1) .hud-bar:nth-child(4) .hud-bar-fill');
        if (ramBar) ramBar.style.width = ramUsage + '%';
    }
    
    // به‌روزرسانی زمان جلسه
    updateSessionTime();
}

function updateSessionTime() {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const sessionTimeElement = document.getElementById('session-time');
    if (sessionTimeElement) {
        sessionTimeElement.textContent = `${pad(minutes)}:${pad(seconds)}`;
    }
}

function updateMessageCount() {
    const messageCountElement = document.getElementById('message-count');
    if (messageCountElement) {
        messageCountElement.textContent = messageCounter;
    }
}

function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

// ========== رویدادها ==========
function initializeEventListeners() {
    // دکمه ارسال
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // کلید Enter برای ارسال
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', autoResizeTextarea);
    }
    
    // آپلود فایل
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // تنظیم مجدد سایز پنجره
    window.addEventListener('resize', handleEarthResize);
    
    console.log('🎮 رویدادها تنظیم شدند');
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📎 فایل انتخاب شد:', file.name);
    
    // اینجا منطق آپلود فایل اضافه می‌شود
    // فعلاً فقط لاگ می‌کنیم
    addSystemMessage(`فایل انتخاب شد: ${file.name}`);
}

// ========== مودال تصاویر ==========
function openImageModal(imageSrc) {
    // ایجاد مودال ساده
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// ========== توابع کمکی ==========
function showSystemMessage(message) {
    addSystemMessage(message);
}

// ========== اتمام بارگذاری ==========
console.log('📋 اسکریپت کاکپیت سینمایی بارگذاری شد');
