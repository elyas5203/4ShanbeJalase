// ========== کاکپیت شیشه‌ای پیشرفته ==========
// کلاینت کارآگاهی با طراحی دو پنلی و انیمیشن‌های سینمایی

console.log('🚀 کاکپیت شیشه‌ای در حال بارگذاری...');

// ========== متغیرهای سراسری ==========
let socket;
let messageCounter = 0;
let activeStages = [];

// عناصر DOM
let messagesArea;
let messageInput;
let sendBtn;
let fileBtn;
let fileInput;
let neuralNodes;
let holographicTooltip;
let imageModal;

// ========== راه‌اندازی اولیه ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 راه‌اندازی کاکپیت شیشه‌ای...');
    
    // راه‌اندازی عناصر DOM
    initializeDOMElements();
    
    // ایجاد پس‌زمینه پویا
    createAnimatedBackground();
    
    // راه‌اندازی Socket.IO
    initializeSocket();
    
    // راه‌اندازی رویدادها
    setupEventListeners();
    
    // راه‌اندازی نودهای شبکه عصبی
    setupNeuralNodes();
    
    console.log('✅ کاکپیت شیشه‌ای آماده است');
});

// ========== راه‌اندازی عناصر DOM ==========
function initializeDOMElements() {
    messagesArea = document.getElementById('messagesArea');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    fileBtn = document.getElementById('fileBtn');
    fileInput = document.getElementById('fileInput');
    neuralNodes = document.getElementById('neuralNodes');
    holographicTooltip = document.getElementById('holographicTooltip');
    imageModal = document.getElementById('imageModal');
    
    console.log('📋 عناصر DOM راه‌اندازی شدند');
}

// ========== ایجاد پس‌زمینه پویا ==========
function createAnimatedBackground() {
    const bg = document.getElementById('animatedBg');
    
    // ایجاد ذرات شناور
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            createFloatingParticle(bg);
        }, i * 200);
    }
    
    // ایجاد ذرات جدید به صورت مداوم
    setInterval(() => {
        createFloatingParticle(bg);
    }, 2000);
}

function createFloatingParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (15 + Math.random() * 10) + 's';
    particle.style.animationDelay = Math.random() * 5 + 's';
    
    container.appendChild(particle);
    
    // حذف ذره بعد از انیمیشن
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, 25000);
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
        addSystemMessage('اتصال به مرکز فرماندهی برقرار شد', 'success');
        
        // پیوستن به اتاق کاربر
        socket.emit('join_room', { userId: userId });
        
        // درخواست تاریخچه چت
        requestChatHistory();
    });
    
    socket.on('disconnect', () => {
        console.log('❌ اتصال قطع شد');
        addSystemMessage('اتصال به مرکز فرماندهی قطع شد', 'error');
    });
    
    socket.on('new_message', (messageData) => {
        console.log('📨 پیام جدید دریافت شد:', messageData);
        displayDataCard(messageData, true);
        
        // احتمال استخراج شاهد برای پیام‌های ادمین
        if (messageData.sender_type !== 'user' && Math.random() > 0.5) {
            setTimeout(() => {
                triggerEvidenceExtraction(messageData);
            }, 2500);
        }
    });
    
    socket.on('chat_history', (messages) => {
        console.log('📜 تاریخچه چت بارگذاری شد:', messages.length, 'پیام');
        messages.forEach(message => {
            displayDataCard(message, false);
        });
    });
    
    socket.on('evidence_extracted', (evidenceData) => {
        console.log('🔍 استخراج شاهد فعال شد:', evidenceData);
        triggerEvidenceExtraction(evidenceData.evidenceData);
    });
    
    socket.on('reconnect', () => {
        console.log('🔄 اتصال مجدد برقرار شد');
        addSystemMessage('اتصال مجدد برقرار شد', 'success');
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
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
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

// ========== نمایش کارت داده با انیمیشن Scanline ==========
function displayDataCard(messageData, withAnimation = true) {
    messageCounter++;
    
    const card = document.createElement('div');
    card.className = 'data-card';
    card.id = `card-${messageCounter}`;
    
    // تعیین نوع پیام
    if (messageData.sender_type === 'user') {
        card.classList.add('user-message');
    } else {
        card.classList.add('admin-message');
    }
    
    // محتوای کارت
    let content = messageData.content || '';
    let mediaHtml = '';
    
    // اضافه کردن فایل اگر وجود دارد
    if (messageData.file_url) {
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            mediaHtml = `
                <div class="media-display" onclick="openImageModal('${messageData.file_url}')">
                    <img src="${messageData.file_url}" alt="تصویر" loading="lazy">
                </div>
            `;
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            mediaHtml = `
                <div class="media-display" onclick="openImageModal('${messageData.file_url}')">
                    <video src="${messageData.file_url}" controls>
                        مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                    </video>
                </div>
            `;
        } else {
            content += ` <a href="${messageData.file_url}" target="_blank" style="color: var(--accent-cyan);">📎 فایل ضمیمه</a>`;
        }
    }
    
    const timestamp = new Date(messageData.timestamp).toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const senderName = getSenderName(messageData.sender_type);
    
    card.innerHTML = `
        <div class="card-content">
            <div class="card-header">
                <span>${senderName}</span>
                <span>${timestamp}</span>
            </div>
            <div class="card-text">${content}</div>
            ${mediaHtml}
        </div>
    `;
    
    messagesArea.appendChild(card);
    
    // انیمیشن ورود
    if (withAnimation) {
        // انیمیشن Scanline
        setTimeout(() => {
            gsap.to(card, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out"
            });
        }, 100);
    } else {
        // بدون انیمیشن برای تاریخچه
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }
    
    // اسکرول خودکار
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    return card;
}

// ========== راه‌اندازی نودهای شبکه عصبی ==========
function setupNeuralNodes() {
    const nodes = neuralNodes.querySelectorAll('.neural-node');
    
    nodes.forEach((node, index) => {
        const stage = parseInt(node.dataset.stage);
        
        // رویداد hover برای نمایش tooltip
        node.addEventListener('mouseenter', function(e) {
            showHolographicTooltip(e, stage);
        });
        
        node.addEventListener('mouseleave', function() {
            hideHolographicTooltip();
        });
        
        // رویداد کلیک
        node.addEventListener('click', function() {
            if (node.classList.contains('active')) {
                showStageDetails(stage);
            }
        });
    });
}

// ========== نمایش Tooltip هولوگرافیک ==========
function showHolographicTooltip(event, stage) {
    const tooltipData = getStageTooltipData(stage);
    
    document.getElementById('tooltipTitle').textContent = tooltipData.title;
    document.getElementById('tooltipContent').textContent = tooltipData.content;
    
    const rect = event.target.getBoundingClientRect();
    holographicTooltip.style.left = (rect.left - 100) + 'px';
    holographicTooltip.style.top = (rect.top - 80) + 'px';
    
    holographicTooltip.classList.add('show');
}

function hideHolographicTooltip() {
    holographicTooltip.classList.remove('show');
}

function getStageTooltipData(stage) {
    const tooltips = {
        1: { title: 'مرحله اول', content: 'شروع تحقیقات و جمع‌آوری اطلاعات اولیه' },
        2: { title: 'مرحله دوم', content: 'تجزیه و تحلیل داده‌های جمع‌آوری شده' },
        3: { title: 'مرحله سوم', content: 'کشف الگوها و ارتباطات مخفی' },
        4: { title: 'مرحله چهارم', content: 'شناسایی مظنون اصلی و انگیزه' },
        5: { title: 'مرحله پایانی', content: 'حل کامل پرونده و دستگیری مجرم' }
    };
    return tooltips[stage] || { title: 'نامشخص', content: 'اطلاعات در دسترس نیست' };
}

// ========== انیمیشن استخراج شاهد ==========
function triggerEvidenceExtraction(messageData) {
    console.log('🎆 شروع انیمیشن استخراج شاهد...');
    
    // پیدا کردن کارت مربوطه
    const cards = messagesArea.querySelectorAll('.data-card');
    let sourceCard = null;
    
    // پیدا کردن آخرین کارت ادمین
    for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].classList.contains('admin-message')) {
            sourceCard = cards[i];
            break;
        }
    }
    
    if (!sourceCard) return;
    
    // هایلایت کارت منبع
    sourceCard.style.borderColor = 'rgba(108, 241, 255, 0.8)';
    sourceCard.style.boxShadow = '0 0 30px rgba(108, 241, 255, 0.5)';
    
    // ایجاد ذرات
    const particles = createExtractionParticles(sourceCard, 60);
    
    // پیدا کردن نود غیرفعال بعدی
    const nextNode = findNextInactiveNode();
    
    if (nextNode) {
        // انیمیشن ذرات
        animateExtractionParticles(particles, sourceCard, nextNode);
        
        // فعال کردن نود بعد از انیمیشن
        setTimeout(() => {
            activateNeuralNode(nextNode);
        }, 1500);
    }
    
    // کم کردن نور کارت منبع
    setTimeout(() => {
        sourceCard.style.opacity = '0.6';
        sourceCard.style.borderColor = 'rgba(108, 241, 255, 0.15)';
        sourceCard.style.boxShadow = 'none';
    }, 2000);
}

// ========== ایجاد ذرات استخراج ==========
function createExtractionParticles(sourceElement, count = 60) {
    const rect = sourceElement.getBoundingClientRect();
    const particles = [];
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'extraction-particle';
        
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

// ========== انیمیشن ذرات استخراج ==========
function animateExtractionParticles(particles, sourceEl, targetEl) {
    const targetRect = targetEl.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    particles.forEach((particle, i) => {
        const delay = (i % 20) * 0.03;
        const duration = 1.2 + Math.random() * 0.4;
        
        // انیمیشن پرواز ذرات
        gsap.timeline()
            .set(particle, { opacity: 0 })
            .to(particle, { 
                opacity: 1, 
                duration: 0.2, 
                ease: "power2.out" 
            }, delay)
            .to(particle, {
                x: targetX - parseFloat(particle.style.left),
                y: targetY - parseFloat(particle.style.top),
                scale: 0.5,
                duration: duration,
                ease: "power3.inOut"
            }, delay + 0.2)
            .to(particle, { 
                opacity: 0, 
                scale: 0.2,
                duration: 0.3 
            }, delay + duration + 0.2)
            .add(() => particle.remove(), delay + duration + 0.5);
    });
}

// ========== پیدا کردن نود غیرفعال بعدی ==========
function findNextInactiveNode() {
    const nodes = neuralNodes.querySelectorAll('.neural-node');
    for (let node of nodes) {
        if (!node.classList.contains('active')) {
            return node;
        }
    }
    return null;
}

// ========== فعال کردن نود شبکه عصبی ==========
function activateNeuralNode(node) {
    node.classList.add('active');
    const stage = parseInt(node.dataset.stage);
    activeStages.push(stage);
    
    // انیمیشن فعال‌سازی
    gsap.fromTo(node, 
        { scale: 1 },
        { 
            scale: 1.2, 
            duration: 0.3, 
            yoyo: true, 
            repeat: 1,
            ease: "power2.inOut"
        }
    );
    
    console.log(`🎯 مرحله ${stage} فعال شد`);
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
    addSystemMessage(`در حال آپلود فایل: ${file.name}`, 'info');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ فایل با موفقیت آپلود شد');
            addSystemMessage('فایل با موفقیت ارسال شد', 'success');
        } else {
            console.error('❌ خطا در آپلود فایل:', data.error);
            addSystemMessage('خطا در آپلود فایل', 'error');
        }
    })
    .catch(error => {
        console.error('❌ خطا در آپلود فایل:', error);
        addSystemMessage('خطا در آپلود فایل', 'error');
    });
    
    fileInput.value = '';
}

// ========== پیام‌های سیستم ==========
function addSystemMessage(message, type = 'info') {
    const systemMessage = {
        content: message,
        sender_type: 'system',
        timestamp: new Date().toISOString()
    };
    
    displayDataCard(systemMessage, true);
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
    } else {
        mediaElement = document.createElement('img');
        mediaElement.src = mediaSrc;
    }
    
    mediaElement.className = 'modal-content';
    
    // زوم با چرخ ماوس
    let scale = 1;
    mediaElement.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(3, scale + delta));
        mediaElement.style.transform = `scale(${scale})`;
    });
    
    modalContent.appendChild(mediaElement);
    imageModal.style.display = 'flex';
}

function closeImageModal() {
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

function showStageDetails(stage) {
    const details = getStageTooltipData(stage);
    alert(`${details.title}\n\n${details.content}`);
}

// دسترسی سراسری به توابع
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

console.log('🎬 کاکپیت شیشه‌ای آماده است!');
