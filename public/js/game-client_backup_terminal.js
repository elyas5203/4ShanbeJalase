// ========== ترمینال اطلاعاتی سینمایی ==========
// کلاینت کارآگاهی با افکت CRT، ویجت‌های تعاملی و انیمیشن Scramble

console.log('🖥️ ترمینال اطلاعاتی سینمایی در حال بارگذاری...');

// ========== متغیرهای سراسری ==========
let socket;
let messageCounter = 0;

// عناصر DOM
let terminalOutput;
let messageInput;
let sendBtn;
let fileBtn;
let fileInput;
let imageModal;

// متغیرهای انیمیشن
let audioContext;
let analyser;
let dataArray;
let bufferLength;

// کاراکترهای رمزگشایی
const scrambleChars = "ABCDEFGHIJKLMN0123456789Δ#@$٠١٢٣٤٥٦٧٨٩";

// ========== راه‌اندازی اولیه ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 راه‌اندازی ترمینال سینمایی...');
    
    // راه‌اندازی عناصر DOM
    initializeDOMElements();
    
    // راه‌اندازی ساعت‌های HUD
    initializeClocks();
    
    // راه‌اندازی Socket.IO
    initializeSocket();
    
    // راه‌اندازی رویدادها
    setupEventListeners();
    
    // پیام خوش‌آمدگویی
    addSystemMessage('ترمینال اطلاعاتی فعال شد - آماده دریافت داده‌ها');
    
    console.log('✅ ترمینال سینمایی آماده است');
});

// ========== راه‌اندازی عناصر DOM ==========
function initializeDOMElements() {
    terminalOutput = document.getElementById('terminalOutput');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    fileBtn = document.getElementById('fileBtn');
    fileInput = document.getElementById('fileInput');
    imageModal = document.getElementById('imageModal');
    
    console.log('📋 عناصر DOM راه‌اندازی شدند');
}

// ========== راه‌اندازی ساعت‌های HUD ==========
function initializeClocks() {
    function updateClocks() {
        const now = new Date();
        
        // UTC
        const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        document.getElementById('utc').textContent = utc.toLocaleTimeString('fa-IR', {hour12: false});
        
        // تهران
        const tehran = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
        document.getElementById('tehran').textContent = tehran.toLocaleTimeString('fa-IR', {hour12: false});
        
        // برلین
        const berlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
        document.getElementById('berlin').textContent = berlin.toLocaleTimeString('fa-IR', {hour12: false});
        
        // شبیه‌سازی تاخیر شبکه
        const latency = 25 + Math.random() * 15;
        document.getElementById('latency').textContent = Math.round(latency) + 'ms';
        
        // شبیه‌سازی پهنای باند
        const bandwidth = (1.0 + Math.random() * 0.5).toFixed(1);
        document.getElementById('bandwidth').textContent = bandwidth + 'MB/s';
    }
    
    updateClocks();
    setInterval(updateClocks, 1000);
}

// ========== راه‌اندازی Socket.IO ==========
function initializeSocket() {
    socket = io({
        query: {
            userId: userId,
            username: username
        }
    });
    
    socket.on('connect', () => {
        console.log('🔗 اتصال به مرکز فرماندهی برقرار شد');
        document.getElementById('connectionStatus').textContent = 'متصل';
        addSystemMessage('اتصال به مرکز فرماندهی برقرار شد');
        
        // پیوستن به اتاق کاربر
        socket.emit('join_room', { userId: userId });
        
        // درخواست تاریخچه چت
        requestChatHistory();
    });
    
    socket.on('disconnect', () => {
        console.log('❌ اتصال قطع شد');
        document.getElementById('connectionStatus').textContent = 'قطع شده';
        addSystemMessage('اتصال به مرکز فرماندهی قطع شد');
    });
    
    socket.on('new_message', (messageData) => {
        console.log('📨 پیام جدید دریافت شد:', messageData);
        displayMessage(messageData, true);
    });
    
    socket.on('chat_history', (messages) => {
        console.log('📜 تاریخچه چت بارگذاری شد:', messages.length, 'پیام');
        messages.forEach(message => {
            displayMessage(message, false);
        });
    });
    
    socket.on('scrambled_message', (messageData) => {
        console.log('🔐 پیام رمزگذاری شده دریافت شد:', messageData);
        displayScrambledMessage(messageData);
    });
    
    socket.on('reconnect', () => {
        console.log('🔄 اتصال مجدد برقرار شد');
        document.getElementById('connectionStatus').textContent = 'متصل';
        addSystemMessage('اتصال مجدد برقرار شد');
        requestChatHistory();
    });
}

function requestChatHistory() {
    socket.emit('load_chat_history', { userId: userId });
}

// ========== راه‌اندازی رویدادها ==========
function setupEventListeners() {
    // دکمه ارسال
    sendBtn.addEventListener('click', sendMessage);
    
    // کلید Enter
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // تنظیم ارتفاع خودکار textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
    
    // دکمه فایل
    fileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // آپلود فایل
    fileInput.addEventListener('change', handleFileUpload);
    
    // بستن مودال
    document.getElementById('closeModal').addEventListener('click', closeImageModal);
    
    // کلیک روی پس‌زمینه مودال
    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            closeImageModal();
        }
    });
}

// ========== نمایش پیام‌ها ==========
function displayMessage(messageData, withAnimation = true) {
    messageCounter++;
    
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.id = `line-${messageCounter}`;
    
    // تعیین نوع پیام
    if (messageData.sender_type === 'user') {
        line.classList.add('user');
    } else if (messageData.sender_type === 'system') {
        line.classList.add('system');
    } else {
        line.classList.add('admin');
    }
    
    const timestamp = new Date(messageData.timestamp).toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const senderName = getSenderName(messageData.sender_type);
    
    // بررسی نوع محتوا
    if (messageData.file_url) {
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            // ویجت تصویر
            line.innerHTML = createImageWidget(messageData, timestamp, senderName);
        } else if (messageData.file_type && messageData.file_type.startsWith('audio/')) {
            // ویجت صدا
            line.innerHTML = createAudioWidget(messageData, timestamp, senderName);
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            // ویجت ویدیو
            line.innerHTML = createVideoWidget(messageData, timestamp, senderName);
        } else {
            // فایل عادی
            line.innerHTML = `<div class="message-bubble"><small>[${timestamp}] ${senderName}:</small><br>${messageData.content || ''} <a href="${messageData.file_url}" target="_blank" style="color: var(--accent);">📎 فایل ضمیمه</a></div>`;
        }
    } else {
        // پیام متنی عادی - حفظ فرمت اینتر و فاصله‌ها
        const formattedContent = (messageData.content || '').replace(/\n/g, '<br>');
        if (messageData.sender_type === 'system') {
            line.innerHTML = `<div class="message-bubble">${formattedContent}</div>`;
        } else {
            line.innerHTML = `<div class="message-bubble"><small>[${timestamp}] ${senderName}:</small><br>${formattedContent}</div>`;
        }
    }
    
    terminalOutput.appendChild(line);
    
    // انیمیشن ظهور
    if (withAnimation) {
        line.style.animationDelay = '0.1s';
    } else {
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
    }
    
    // اسکرول خودکار
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
    
    return line;
}

// ========== ایجاد ویجت تصویر ==========
function createImageWidget(messageData, timestamp, senderName) {
    const widgetId = `widget-img-${messageCounter}`;
    const subjectId = `SUBJECT-${String(messageCounter).padStart(2, '0')}`;
    
    return `
        <div class="message-bubble">
            <small>[${timestamp}] ${senderName}: تحلیل تصویری</small>
            <div class="widget image-widget" id="${widgetId}" style="margin-top: 8px;">
                <img src="${messageData.file_url}" alt="تصویر تحلیلی" onclick="openImageModal('${messageData.file_url}')">
                <div class="widget-scanlines"></div>
                <div class="face-detection"></div>
                <div class="widget-overlay">ID: ${subjectId}</div>
            </div>
        </div>
    `;
}

// ========== ایجاد ویجت صدا ==========
function createAudioWidget(messageData, timestamp, senderName) {
    const widgetId = `widget-audio-${messageCounter}`;
    const canvasId = `canvas-${messageCounter}`;
    
    setTimeout(() => {
        initializeAudioWidget(canvasId, messageData.file_url);
    }, 100);
    
    return `
        <div class="message-bubble">
            <small>[${timestamp}] ${senderName}: تحلیل صوتی</small>
            <div class="widget audio-widget" id="${widgetId}" style="margin-top: 8px;">
                <div class="audio-header">ویژوالایزر موج صدا</div>
                <div class="audio-controls">
                    <button class="audio-btn" onclick="playAudio('${messageData.file_url}', '${canvasId}')">پخش</button>
                    <button class="audio-btn" onclick="stopAudio('${canvasId}')">توقف</button>
                </div>
                <canvas class="audio-canvas" id="${canvasId}" width="400" height="80"></canvas>
            </div>
        </div>
    `;
}

// ========== ایجاد ویجت ویدیو ==========
function createVideoWidget(messageData, timestamp, senderName) {
    const widgetId = `widget-video-${messageCounter}`;
    
    return `
        <div class="message-bubble">
            <small>[${timestamp}] ${senderName}: تحلیل ویدیویی</small>
            <div class="widget image-widget" id="${widgetId}" style="margin-top: 8px;">
                <video src="${messageData.file_url}" controls style="width: 100%; height: auto;" onclick="openImageModal('${messageData.file_url}')">
                    مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                </video>
                <div class="widget-scanlines"></div>
                <div class="widget-overlay">VIDEO ANALYSIS</div>
            </div>
        </div>
    `;
}

// ========== نمایش پیام رمزگذاری شده ==========
function displayScrambledMessage(messageData) {
    const line = displayMessage({
        ...messageData,
        content: '█ █ █ █ █ █ █ █ █ █ █'
    }, true);
    
    const textElement = line.querySelector('.scramble-text') || line;
    textElement.classList.add('scramble-text');
    
    // پخش صدای رمزگشایی
    playDecryptSound();
    
    // شروع انیمیشن رمزگشایی
    setTimeout(() => {
        scrambleToText(textElement, messageData.content);
    }, 500);
}

// ========== انیمیشن Scramble Text ==========
function scrambleToText(element, targetText) {
    const reveal = Array(targetText.length).fill(false);
    const startTime = performance.now();
    const duration = 1400; // مدت زمان انیمیشن
    
    function frame(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        const revealCount = Math.floor(progress * targetText.length);
        
        // فعال کردن کاراکترهای جدید
        for (let i = 0; i < revealCount; i++) {
            reveal[i] = true;
        }
        
        // ساخت رشته خروجی
        let outputText = '';
        for (let i = 0; i < targetText.length; i++) {
            if (targetText[i] === ' ') {
                outputText += ' ';
                continue;
            }
            
            if (reveal[i]) {
                outputText += targetText[i];
            } else {
                outputText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            }
        }
        
        // به‌روزرسانی متن
        const currentContent = element.innerHTML;
        const timestampMatch = currentContent.match(/^\[.*?\]/);
        const prefix = timestampMatch ? timestampMatch[0] + ' ' : '';
        
        element.innerHTML = prefix + outputText;
        
        // ادامه انیمیشن
        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }
    
    requestAnimationFrame(frame);
}

// ========== پخش صدای رمزگشایی ==========
function playDecryptSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        const osc = ctx.createOscillator();
        
        osc.type = "square";
        osc.frequency.value = 80;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
        
        // تغییر فرکانس برای ایجاد افکت رمزگشایی
        for (let i = 0; i < 8; i++) {
            const t = now + (i / 8) * 1.4;
            osc.frequency.linearRampToValueAtTime(80 + i * 120, t + 0.08);
        }
        
        gain.gain.linearRampToValueAtTime(0, now + 1.4);
        
        setTimeout(() => {
            try { osc.stop(); } catch(e) {}
        }, 1480);
    } catch(e) {
        console.log('صدا پشتیبانی نمی‌شود');
    }
}

// ========== راه‌اندازی ویجت صدا ==========
function initializeAudioWidget(canvasId, audioUrl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // شبیه‌سازی موج صدا
    function drawWaveform() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(84,255,189,0.85)';
        ctx.beginPath();
        
        const samples = 100;
        const amplitude = canvas.height / 2;
        
        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * canvas.width;
            const y = amplitude + Math.sin(i * 0.1 + Date.now() * 0.01) * amplitude * 0.3;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        requestAnimationFrame(drawWaveform);
    }
    
    drawWaveform();
}

// ========== پخش صدا ==========
function playAudio(audioUrl, canvasId) {
    console.log('پخش صدا:', audioUrl);
    
    const audio = new Audio(audioUrl);
    audio.play().catch(e => {
        console.log('خطا در پخش صدا:', e);
        addSystemMessage('خطا در پخش فایل صوتی');
    });
    
    // انیمیشن ویژوالایزر
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        animateAudioCanvas(canvas);
    }
}

function stopAudio(canvasId) {
    console.log('توقف صدا');
    // در اینجا می‌توان منطق توقف صدا را اضافه کرد
}

// ========== انیمیشن کانواس صدا ==========
function animateAudioCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    let animationId;
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(84,255,189,0.85)';
        ctx.beginPath();
        
        const samples = 80;
        const amplitude = canvas.height / 2;
        
        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * canvas.width;
            const frequency = 0.02 + Math.random() * 0.05;
            const y = amplitude + Math.sin(i * frequency + Date.now() * 0.005) * amplitude * (0.2 + Math.random() * 0.3);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        animationId = requestAnimationFrame(draw);
    }
    
    draw();
    
    // توقف انیمیشن بعد از 5 ثانیه
    setTimeout(() => {
        cancelAnimationFrame(animationId);
    }, 5000);
}

// ========== ارسال پیام ==========
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    console.log('📤 ارسال پیام:', message);
    
    socket.emit('user_message', {
        userId: userId,
        content: message,
        timestamp: new Date().toISOString()
    });
    
    // پاک کردن ورودی
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

// ========== آپلود فایل ==========
function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;
    
    console.log('📎 آپلود فایل:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('senderType', 'user');
    
    // نمایش پیام بارگذاری
    addSystemMessage(`در حال آپلود فایل: ${file.name}`);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ فایل با موفقیت آپلود شد');
            addSystemMessage('فایل با موفقیت ارسال شد');
        } else {
            console.error('❌ خطا در آپلود فایل:', data.error);
            addSystemMessage('خطا در آپلود فایل');
        }
    })
    .catch(error => {
        console.error('❌ خطا در آپلود فایل:', error);
        addSystemMessage('خطا در آپلود فایل');
    });
    
    fileInput.value = '';
}

// ========== پیام‌های سیستم ==========
function addSystemMessage(message) {
    const systemMessage = {
        content: message,
        sender_type: 'system',
        timestamp: new Date().toISOString()
    };
    
    displayMessage(systemMessage, true);
}

// ========== مودال تصاویر ==========
function openImageModal(mediaSrc) {
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = '';
    
    const isVideo = mediaSrc.includes('.mp4') || mediaSrc.includes('.webm') || mediaSrc.includes('.mov');
    
    let mediaElement;
    if (isVideo) {
        mediaElement = document.createElement('video');
        mediaElement.src = mediaSrc;
        mediaElement.controls = true;
        mediaElement.autoplay = true;
        mediaElement.style.maxWidth = '90%';
        mediaElement.style.maxHeight = '90%';
    } else {
        mediaElement = document.createElement('img');
        mediaElement.src = mediaSrc;
    }
    
    mediaElement.className = 'modal-content';
    
    // جلوگیری از بسته شدن مودال هنگام کلیک روی ویدیو
    mediaElement.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // زوم با چرخ ماوس (فقط برای تصاویر)
    if (!isVideo) {
        let scale = 1;
        mediaElement.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            scale = Math.max(0.5, Math.min(3, scale + delta));
            mediaElement.style.transform = `scale(${scale})`;
        });
    }
    
    modalContent.appendChild(mediaElement);
    imageModal.style.display = 'flex';
}

function closeImageModal() {
    const modalContent = document.getElementById('modalContent');
    // توقف ویدیو در صورت وجود
    const video = modalContent.querySelector('video');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    imageModal.style.display = 'none';
}

// ========== توابع کمکی ==========
function getSenderName(senderType) {
    const names = {
        'user': 'شما',
        'detective': 'کارآگاه',
        'hacker': 'هکر',
        'admin': 'مرکز فرماندهی',
        'system': 'سیستم'
    };
    return names[senderType] || 'نامشخص';
}

// دسترسی سراسری به توابع
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.playAudio = playAudio;
window.stopAudio = stopAudio;

console.log('🖥️ ترمینال اطلاعاتی سینمایی آماده است!');
