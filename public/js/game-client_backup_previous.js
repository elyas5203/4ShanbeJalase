// ========== میز کار هولوگرافیک سه‌بعدی ==========
// کلاینت کارآگاهی با ساده‌سازی برای کودکان و فارسی‌سازی کامل

console.log('🎬 میز کار هولوگرافیک در حال بارگذاری...');

// ========== متغیرهای سراسری ==========
let socket;
let ambientLines = [];
let evidenceCards = [];
let messageHistory = [];

// عناصر DOM
let ambientContainer;
let gridContainer;
let cliInput;
let sendBtn;
let fileBtn;
let fileInput;

// ========== راه‌اندازی اولیه ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 راه‌اندازی رابط هولوگرافیک...');
    
    // راه‌اندازی عناصر DOM
    initializeDOMElements();
    
    // راه‌اندازی Socket.IO
    initializeSocket();
    
    // راه‌اندازی رویدادها
    setupEventListeners();
    
    // ایجاد جریان داده محیطی
    createAmbientStream();
    
    // ایجاد گرید شواهد اولیه
    createInitialEvidenceGrid();
    
    console.log('✅ رابط هولوگرافیک آماده است');
});

// ========== راه‌اندازی عناصر DOM ==========
function initializeDOMElements() {
    ambientContainer = document.getElementById('ambient');
    gridContainer = document.getElementById('grid');
    cliInput = document.getElementById('cliInput');
    sendBtn = document.getElementById('sendBtn');
    fileBtn = document.getElementById('fileBtn');
    fileInput = document.getElementById('fileInput');
    
    console.log('📋 عناصر DOM راه‌اندازی شدند');
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
        addAmbientMessage('اتصال به مرکز فرماندهی برقرار شد', 'success');
        
        // پیوستن به اتاق کاربر
        socket.emit('join_room', { userId: userId });
        
        // درخواست تاریخچه چت
        requestChatHistory();
    });
    
    socket.on('disconnect', () => {
        console.log('❌ اتصال قطع شد');
        addAmbientMessage('اتصال به مرکز فرماندهی قطع شد', 'error');
    });
    
    socket.on('new_message', (messageData) => {
        console.log('📨 پیام جدید دریافت شد:', messageData);
        addAmbientMessage(messageData.content, messageData.sender_type, messageData);
        
        // اگر پیام از ادمین باشد، احتمال استخراج شاهد
        if (messageData.sender_type !== 'user' && Math.random() > 0.6) {
            setTimeout(() => {
                triggerEvidenceExtraction(messageData);
            }, 2000);
        }
    });
    
    socket.on('chat_history', (messages) => {
        console.log('📜 تاریخچه چت بارگذاری شد:', messages.length, 'پیام');
        messageHistory = messages;
        messages.forEach(message => {
            addAmbientMessage(message.content, message.sender_type, message, false);
        });
    });
    
    socket.on('evidence_extracted', (evidenceData) => {
        console.log('🔍 استخراج شاهد فعال شد:', evidenceData);
        triggerEvidenceExtraction(evidenceData.evidenceData);
    });
    
    socket.on('reconnect', () => {
        console.log('🔄 اتصال مجدد برقرار شد');
        addAmbientMessage('اتصال مجدد برقرار شد', 'success');
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
    cliInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // دکمه فایل
    fileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // آپلود فایل
    fileInput.addEventListener('change', handleFileUpload);
    
    // راهنمای بصری برای کودکان
    addVisualGuides();
}

// ========== ایجاد جریان داده محیطی ==========
function createAmbientStream() {
    // پیام‌های اولیه محیطی
    const initialMessages = [
        'سیستم کارآگاهی آنلاین است',
        'در انتظار دستورات...',
        'اتصال امن برقرار است',
        'مرکز فرماندهی آماده دریافت گزارش'
    ];
    
    initialMessages.forEach((msg, index) => {
        setTimeout(() => {
            addAmbientMessage(msg, 'system', null, false);
        }, index * 800);
    });
}

// ========== اضافه کردن پیام به جریان محیطی ==========
function addAmbientMessage(content, senderType = 'system', messageData = null, withAnimation = true) {
    const line = document.createElement('div');
    line.className = 'ambient-line';
    
    // تعیین رنگ و محتوا بر اساس نوع فرستنده
    let displayContent = content;
    let color = 'var(--muted)';
    
    switch(senderType) {
        case 'user':
            displayContent = `کاربر: ${content}`;
            color = 'var(--text)';
            break;
        case 'detective':
            displayContent = `کارآگاه: ${content}`;
            color = 'var(--accent)';
            break;
        case 'hacker':
            displayContent = `هکر: ${content}`;
            color = 'var(--warn)';
            break;
        case 'admin':
            displayContent = `مرکز فرماندهی: ${content}`;
            color = 'var(--hud)';
            break;
        case 'success':
            displayContent = `✅ ${content}`;
            color = '#66ffcc';
            break;
        case 'error':
            displayContent = `❌ ${content}`;
            color = 'var(--warn)';
            break;
    }
    
    line.textContent = displayContent;
    line.style.color = color;
    line.style.top = Math.random() * 80 + 10 + '%';
    line.style.opacity = withAnimation ? '0' : '0.18';
    
    // اضافه کردن فایل اگر وجود دارد
    if (messageData && messageData.file_url) {
        const fileIcon = messageData.file_type?.startsWith('image/') ? '🖼️' : 
                        messageData.file_type?.startsWith('video/') ? '🎥' : '📎';
        line.textContent += ` ${fileIcon}`;
        line.style.cursor = 'pointer';
        line.addEventListener('click', () => {
            if (messageData.file_type?.startsWith('image/') || messageData.file_type?.startsWith('video/')) {
                openImageModal(messageData.file_url);
            } else {
                window.open(messageData.file_url, '_blank');
            }
        });
    }
    
    ambientContainer.appendChild(line);
    ambientLines.push(line);
    
    // انیمیشن ورود
    if (withAnimation) {
        gsap.to(line, {
            opacity: 0.18,
            duration: 1,
            ease: "power2.out"
        });
        
        // هایلایت موقت برای پیام‌های جدید
        if (senderType !== 'system') {
            line.classList.add('highlight');
            setTimeout(() => {
                line.classList.remove('highlight');
            }, 3000);
        }
    }
    
    // حذف خطوط قدیمی
    if (ambientLines.length > 15) {
        const oldLine = ambientLines.shift();
        gsap.to(oldLine, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => oldLine.remove()
        });
    }
    
    // اسکرول خودکار محیطی
    animateAmbientFlow();
}

// ========== انیمیشن جریان محیطی ==========
function animateAmbientFlow() {
    ambientLines.forEach((line, index) => {
        const speed = 0.2 + Math.random() * 0.3;
        gsap.to(line, {
            x: -window.innerWidth - 200,
            duration: 20 + Math.random() * 10,
            ease: "none",
            repeat: -1,
            delay: index * 0.5
        });
    });
}

// ========== ایجاد گرید شواهد اولیه ==========
function createInitialEvidenceGrid() {
    // کارت‌های خالی اولیه
    for (let i = 0; i < 12; i++) {
        createEvidenceCard({
            title: 'در انتظار شاهد...',
            meta: 'آماده دریافت اطلاعات',
            isEmpty: true
        });
    }
}

// ========== ایجاد کارت شاهد ==========
function createEvidenceCard(evidenceData) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="glare"></div>
        <h3>${evidenceData.title}</h3>
        <div class="meta">${evidenceData.meta}</div>
    `;
    
    // افکت هولوگرافیک
    addHolographicEffect(card);
    
    gridContainer.appendChild(card);
    evidenceCards.push(card);
    
    return card;
}

// ========== افکت هولوگرافیک ==========
function addHolographicEffect(card) {
    const glare = card.querySelector('.glare');
    
    let px = 0, py = 0, rx = 0, ry = 0;
    const damp = (from, to, k = 0.12) => from + (to - from) * k;
    
    function onMove(e) {
        const bounds = card.getBoundingClientRect();
        const x = (e.clientX - bounds.left) / bounds.width;
        const y = (e.clientY - bounds.top) / bounds.height;
        px = (x - 0.5) * 2;
        py = (y - 0.5) * 2;
        
        glare.style.setProperty('--gx', `${x * 100}%`);
        glare.style.setProperty('--gy', `${y * 100}%`);
        glare.style.opacity = 1;
    }
    
    function onLeave() {
        px = 0; py = 0;
        glare.style.opacity = 0;
    }
    
    function tick() {
        ry = damp(ry, px * 12);
        rx = damp(rx, -py * 10);
        card.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(0px)`;
        requestAnimationFrame(tick);
    }
    
    tick();
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
}

// ========== انیمیشن استخراج شاهد ==========
function triggerEvidenceExtraction(messageData) {
    console.log('🎆 شروع انیمیشن استخراج شاهد...');
    
    // پیدا کردن خط محیطی مربوطه
    const targetLine = ambientLines.find(line => 
        line.textContent.includes(messageData.content?.substring(0, 20))
    );
    
    if (!targetLine) return;
    
    // هایلایت خط
    targetLine.classList.add('highlight');
    
    // ایجاد ذرات
    const particles = createParticles(targetLine, 80);
    
    // پیدا کردن کارت خالی
    const emptyCard = evidenceCards.find(card => 
        card.querySelector('h3').textContent === 'در انتظار شاهد...'
    );
    
    if (!emptyCard) return;
    
    // انیمیشن ذرات
    animateParticles(particles, targetLine, emptyCard);
    
    // به‌روزرسانی کارت با اطلاعات جدید
    setTimeout(() => {
        updateEvidenceCard(emptyCard, {
            title: 'شاهد استخراج شد',
            meta: `منبع: ${getSenderTypeFarsi(messageData.sender_type)}\nزمان: ${new Date().toLocaleString('fa-IR')}`
        });
        
        // افکت درخشش
        gsap.fromTo(emptyCard, 
            { filter: "brightness(1) saturate(1)" }, 
            { filter: "brightness(1.3) saturate(1.2)", yoyo: true, repeat: 3, duration: 0.4 }
        );
    }, 1200);
    
    // کم کردن نور خط محیطی
    setTimeout(() => {
        targetLine.style.opacity = '0.08';
        targetLine.classList.remove('highlight');
    }, 1000);
}

// ========== ایجاد ذرات ==========
function createParticles(sourceElement, count = 80) {
    const rect = sourceElement.getBoundingClientRect();
    const particles = [];
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const x = rect.left + Math.random() * rect.width;
        const y = rect.top + Math.random() * rect.height;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.opacity = '0';
        
        document.body.appendChild(particle);
        particles.push(particle);
    }
    
    return particles;
}

// ========== انیمیشن ذرات ==========
function animateParticles(particles, sourceEl, targetEl) {
    const targetRect = targetEl.getBoundingClientRect();
    
    particles.forEach((particle, i) => {
        const angle = Math.random() * Math.PI * 2;
        const spread = 20 + Math.random() * 30;
        const midX = parseFloat(particle.style.left) + Math.cos(angle) * spread;
        const midY = parseFloat(particle.style.top) + Math.sin(angle) * spread;
        
        const targetX = targetRect.left + 30 + Math.random() * (targetRect.width - 60);
        const targetY = targetRect.top + 30 + Math.random() * (targetRect.height - 60);
        
        const duration = 0.8 + Math.random() * 0.4;
        const delay = (i % 15) * 0.02;
        
        gsap.timeline()
            .set(particle, { opacity: 0 })
            .to(particle, { opacity: 1, duration: 0.2, ease: "power2.out" }, 0)
            .to(particle, { 
                x: midX - parseFloat(particle.style.left), 
                y: midY - parseFloat(particle.style.top), 
                scale: 0.8, 
                duration: 0.3, 
                ease: "power2.out" 
            }, 0.1 + delay)
            .to(particle, {
                x: targetX - parseFloat(particle.style.left),
                y: targetY - parseFloat(particle.style.top),
                scale: 0.4,
                opacity: 0.8,
                duration: duration,
                ease: "power3.inOut"
            }, 0.4 + delay)
            .to(particle, { opacity: 0, duration: 0.3 }, duration + 0.5 + delay)
            .add(() => particle.remove(), duration + 0.8 + delay);
    });
}

// ========== به‌روزرسانی کارت شاهد ==========
function updateEvidenceCard(card, evidenceData) {
    const title = card.querySelector('h3');
    const meta = card.querySelector('.meta');
    
    title.textContent = evidenceData.title;
    meta.textContent = evidenceData.meta;
    
    // تغییر رنگ برای نشان دادن فعال بودن
    card.style.borderColor = 'rgba(0,230,255,0.4)';
    card.style.boxShadow = 'inset 0 0 18px rgba(0,230,255,0.15), 0 6px 24px rgba(0,0,0,0.35)';
}

// ========== ارسال پیام ==========
function sendMessage() {
    const message = cliInput.value.trim();
    if (!message) return;
    
    console.log('📤 ارسال پیام:', message);
    
    socket.emit('user_message', {
        userId: userId,
        content: message,
        timestamp: new Date().toISOString()
    });
    
    // اضافه کردن به جریان محیطی
    addAmbientMessage(message, 'user');
    
    // پاک کردن ورودی
    cliInput.value = '';
    
    // حذف راهنمای بصری بعد از اولین پیام
    sendBtn.classList.remove('guide-pulse');
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
    addAmbientMessage(`در حال آپلود فایل: ${file.name}`, 'system');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ فایل با موفقیت آپلود شد');
            addAmbientMessage('فایل با موفقیت ارسال شد', 'success');
        } else {
            console.error('❌ خطا در آپلود فایل:', data.error);
            addAmbientMessage('خطا در آپلود فایل', 'error');
        }
    })
    .catch(error => {
        console.error('❌ خطا در آپلود فایل:', error);
        addAmbientMessage('خطا در آپلود فایل', 'error');
    });
    
    fileInput.value = '';
}

// ========== راهنمای بصری برای کودکان ==========
function addVisualGuides() {
    // راهنمای اولیه
    setTimeout(() => {
        if (cliInput.value === '') {
            cliInput.placeholder = '👈 اینجا پیام بنویسید و دکمه ارسال را بزنید';
            cliInput.style.fontSize = '14px';
        }
    }, 3000);
    
    // راهنمای کلیک روی کارت‌ها
    setTimeout(() => {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            if (index < 3) {
                card.style.animation = 'guidePulse 3s infinite';
                setTimeout(() => {
                    card.style.animation = '';
                }, 6000);
            }
        });
    }, 8000);
}

// ========== مودال تصاویر ==========
function openImageModal(mediaSrc) {
    const modal = document.getElementById('image-modal');
    
    if (modal) {
        modal.innerHTML = '';
        
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
            mediaElement.style.maxWidth = '90%';
            mediaElement.style.maxHeight = '90%';
        }
        
        mediaElement.style.borderRadius = '10px';
        mediaElement.style.boxShadow = '0 0 30px rgba(0, 230, 255, 0.5)';
        mediaElement.style.transition = 'transform 0.3s ease';
        
        // زوم با چرخ ماوس
        let scale = 1;
        mediaElement.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            scale = Math.max(0.5, Math.min(3, scale + delta));
            mediaElement.style.transform = `scale(${scale})`;
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.className = 'close-btn';
        closeBtn.onclick = closeImageModal;
        
        modal.appendChild(mediaElement);
        modal.appendChild(closeBtn);
        
        modal.style.display = 'flex';
        
        modal.onclick = function(e) {
            if (e.target === modal) {
                closeImageModal();
            }
        };
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

// ========== توابع کمکی ==========
function getSenderTypeFarsi(senderType) {
    const map = {
        'user': 'کاربر',
        'detective': 'کارآگاه', 
        'hacker': 'هکر',
        'admin': 'مرکز فرماندهی'
    };
    return map[senderType] || 'نامشخص';
}

// دسترسی سراسری به توابع
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

console.log('🎬 میز کار هولوگرافیک آماده است!');
