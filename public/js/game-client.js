// ========== کاکپیت سینمایی کارآگاهی ==========
// کلاینت کامل با کره زمین سه‌بعدی، ویجت‌های HUD و ساعت دیجیتال

console.log('🎬 کاکپیت سینمایی در حال بارگذاری...');

// ========== شروع بارگذاری اسکریپت ==========
console.log('🚀 شروع بارگذاری game-client.js...');

// ========== متغیرهای سراسری ==========
let socket;
let chatMessages, messageInput, sendButton, fileInput;
let userId, username;
let messageCounter = 0;
let sessionStartTime = Date.now();

// عناصر DOM (حذف شد - از بالا استفاده می‌شود)

// متغیرهای Three.js برای کره زمین
let scene, camera, renderer, earthMesh;

// متغیرهای HUD
let cpuUsage = 45;
let ramUsage = 67;
let missionProgress = 78;

// کاراکترهای رمزگشایی
const scrambleChars = "ABCDEFGHIJKLMN0123456789Δ#@$٠١٢٣٤٥٦٧٨٩";

// ========== تابع آپلود فایل (تعریف زودهنگام) ==========
function handleFileUpload(event) {
    console.log('🎯 handleFileUpload فراخوانی شد');
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ هیچ فایلی انتخاب نشده');
        return;
    }
    
    console.log('📎 فایل انتخاب شد:', file.name, 'اندازه:', file.size, 'نوع:', file.type);
    
    // بررسی اندازه فایل (حداکثر 10MB)
    if (file.size > 10 * 1024 * 1024) {
        console.error('❌ فایل خیلی بزرگ است');
        return;
    }
    
    console.log('🚀 شروع آپلود فایل...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', window.userId || 1);
    formData.append('senderType', 'user');
    
    console.log('📋 FormData آماده شد');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('📡 پاسخ سرور:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('📦 داده دریافتی:', data);
        if (data.success) {
            console.log('✅ فایل با موفقیت آپلود شد:', data.fileUrl);
            alert('✅ فایل آپلود شد: ' + file.name);
        } else {
            console.error('❌ خطا در آپلود فایل:', data.error);
            alert('❌ خطا در آپلود: ' + data.error);
        }
    })
    .catch(error => {
        console.error('❌ خطا در آپلود فایل:', error);
        alert('❌ خطا در آپلود: ' + error.message);
    });
    
    // پاک کردن انتخاب فایل
    event.target.value = '';
}

// قرار دادن در window فوری
window.handleFileUpload = handleFileUpload;
console.log('🔗 handleFileUpload در window قرار گرفت فوری:', typeof window.handleFileUpload);

// ========== مودال تصاویر با زوم (تعریف زودهنگام) ==========
function openImageModal(imageSrc) {
    console.log('🔍 باز کردن مودال برای:', imageSrc);
    
    // ایجاد مودال پیشرفته
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        position: relative;
        max-width: 95%;
        max-height: 95%;
        display: flex;
        flex-direction: column;
        align-items: center;
    `;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
        max-width: 100%;
        max-height: 85vh;
        border-radius: 8px;
        box-shadow: 0 4px 30px rgba(0, 255, 255, 0.5);
        transition: transform 0.3s ease;
        cursor: zoom-in;
    `;
    
    // دکمه بستن
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        color: #00ffff;
        font-size: 30px;
        font-weight: bold;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #00ffff;
    `;
    
    // متن راهنما
    const helpText = document.createElement('div');
    helpText.innerHTML = 'کلیک برای زوم | ESC برای بستن';
    helpText.style.cssText = `
        color: #00ffff;
        margin-top: 15px;
        font-size: 14px;
        text-align: center;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid #00ffff;
    `;
    
    let isZoomed = false;
    
    // زوم با کلیک روی تصویر
    img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isZoomed) {
            img.style.transform = 'scale(2)';
            img.style.cursor = 'zoom-out';
            isZoomed = true;
        } else {
            img.style.transform = 'scale(1)';
            img.style.cursor = 'zoom-in';
            isZoomed = false;
        }
    });
    
    container.appendChild(closeBtn);
    container.appendChild(img);
    container.appendChild(helpText);
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    // بستن با کلیک روی پس‌زمینه
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // بستن با دکمه بستن
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // بستن با ESC
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// قرار دادن مودال در window فوری
window.openImageModal = openImageModal;
console.log('🔗 openImageModal در window قرار گرفت فوری:', typeof window.openImageModal);

// تست مودال زوم
window.testZoom = function() {
    console.log('🔍 تست مودال زوم...');
    openImageModal('/uploads/file-1759654317490-399163561.png');
};
console.log('🔗 testZoom در window قرار گرفت فوری:', typeof window.testZoom);

// ========== سکانس هک سینمایی جدید ==========
// کد قدیمی حذف شد - از beginHackSequence() استفاده کنید
        background: #080b10;
        color: #e6eef7;
        font-family: Rubik, system-ui, -apple-system, Segoe UI, sans-serif;
        overflow: hidden;
        perspective: 1000px;
    `;
    
    // اضافه کردن CSS و HTML کامل سکانس
    stage.innerHTML = `
        <style>
            :root {
                --bg: #080b10;
                --red: #ff1e2d;
                --red-dim: #a3151e;
                --ui: #0f151d;
                --ui-2: #0b1118;
                --text: #e6eef7;
                --accent: #7c8aa6;
            }
            
            .hack-stage {
                position: fixed;
                inset: 0;
                display: grid;
                place-items: center;
                perspective: 1000px;
            }
            
            .hack-hud {
                position: absolute;
                inset: 2rem;
                pointer-events: none;
                border: 1px solid #182230;
                box-shadow: inset 0 0 60px #091019;
                background: radial-gradient(ellipse at 20% 10%, rgba(255,30,45,.03), transparent 50%),
                            radial-gradient(ellipse at 80% 90%, rgba(255,30,45,.02), transparent 50%);
            }
            
            .hack-grid-overlay {
                position: absolute;
                inset: 0;
                background: repeating-linear-gradient(180deg, rgba(255,255,255,.02) 0, rgba(255,255,255,.02) 1px, transparent 2px);
                mix-blend-mode: screen;
                pointer-events: none;
            }
            
            .hack-ui-box {
                position: absolute;
                background: linear-gradient(180deg, var(--ui), var(--ui-2));
                border: 1px solid #1a2432;
                color: var(--accent);
                padding: 1rem;
                box-shadow: 0 10px 40px -20px rgba(0,0,0,.75);
                transition: filter .6s ease, opacity .6s ease, transform .6s ease;
                will-change: filter, opacity, transform;
            }
            
            .hack-ui-box h4 {
                margin: 0 0 .5rem;
                font-family: monospace;
                font-size: .9rem;
                color: #a9b6cc;
                letter-spacing: .08em;
            }
            
            .hack-ui-box p {
                margin: 0;
                font-size: .85rem;
                color: #7e8aa1;
            }
            
            .hack-corrode {
                filter: url(#corrode);
            }
            
            .hack-corrode.deep {
                filter: url(#corrodeStrong);
            }
            
            .hack-melt {
                filter: url(#melt);
                transform-origin: center;
                animation: meltDrip 1.8s ease-in forwards;
            }
            
            @keyframes meltDrip {
                0% { transform: translateY(0) scaleY(1); opacity: 1; }
                50% { transform: translateY(10px) scaleY(1.05); }
                100% { transform: translateY(26px) scaleY(1.08); opacity: .18; }
            }
            
            .hack-plasma-glow {
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at 15% 20%, rgba(255,30,45,.04), transparent 40%),
                            radial-gradient(circle at 40% 60%, rgba(255,30,45,.03), transparent 45%),
                            radial-gradient(circle at 85% 80%, rgba(255,30,45,.02), transparent 50%);
                mix-blend-mode: lighten;
                pointer-events: none;
                animation: plasmaPulse 2.6s ease-in-out infinite;
            }
            
            @keyframes plasmaPulse {
                0%, 100% { opacity: .18; }
                50% { opacity: .35; }
            }
            
            .hack-fragments {
                position: absolute;
                inset: 0;
                pointer-events: none;
                transform-style: preserve-3d;
            }
            
            .hack-frag {
                position: absolute;
                width: 22px;
                height: 22px;
                background: radial-gradient(circle at 30% 30%, #ff3b49, #5b0b12 65%, #0b0f14 100%);
                border: 1px solid rgba(255,30,45,.12);
                box-shadow: 0 4px 18px rgba(0,0,0,.65);
                opacity: 0;
                will-change: transform, opacity;
                transform: translateZ(0px);
            }
            
            .hack-flash {
                position: absolute;
                inset: 0;
                background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,30,45,0.6), transparent 80%);
                opacity: 0;
                pointer-events: none;
                mix-blend-mode: screen;
                filter: blur(1px);
            }
            
            .hack-blackout {
                position: absolute;
                inset: 0;
                background: black;
                opacity: 0;
                pointer-events: none;
            }
            
            .hack-aftermath {
                position: absolute;
                inset: 0;
                display: grid;
                place-items: center;
                opacity: 0;
                background: radial-gradient(circle at 50% 60%, rgba(255,30,45,.06), transparent 40%);
            }
            
            .hack-eye-wrap {
                position: relative;
                width: 180px;
                height: 180px;
            }
            
            .hack-eye {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: radial-gradient(circle at 50% 50%, #ff1e2d 0%, #a1121b 22%, #42070c 44%, #0a0f16 66%),
                            radial-gradient(circle at 60% 45%, rgba(255,255,255,.08), transparent 50%);
                box-shadow: 0 0 40px rgba(255,30,45,.14),
                            0 0 110px rgba(255,30,45,.28),
                            inset 0 0 38px rgba(255,30,45,.65);
                animation: eyePulse 1.45s ease-in-out infinite;
            }
            
            .hack-iris {
                position: absolute;
                left: 50%;
                top: 50%;
                width: 60px;
                height: 60px;
                transform: translate(-50%,-50%);
                border-radius: 50%;
                background: radial-gradient(circle at 40% 40%, #2b0407, #0b0f14 60%);
                box-shadow: inset 0 0 22px rgba(0,0,0,.7);
                animation: irisOpen 2.8s ease-in-out infinite;
            }
            
            @keyframes eyePulse {
                0%,100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }
            
            @keyframes irisOpen {
                0%,100% { transform: translate(-50%,-50%) scale(0.9); }
                50% { transform: translate(-50%,-50%) scale(1.1); }
            }
            
            .hack-scanlines {
                position: absolute;
                inset: 0;
                background: repeating-linear-gradient(180deg, rgba(255,30,45,.22) 0, rgba(255,30,45,.22) 2px, transparent 4px);
                mix-blend-mode: overlay;
                opacity: .15;
                animation: scanShift 1.6s linear infinite;
                border-radius: 50%;
            }
            
            @keyframes scanShift {
                0% { transform: translateY(-4px); }
                100% { transform: translateY(4px); }
            }
            
            .hack-messages {
                margin-top: 28px;
                text-align: center;
                font-family: monospace;
                letter-spacing: .12em;
                color: #c3cfe2;
            }
            
            .hack-msg {
                font-size: 1rem;
                margin: .5rem 0;
                opacity: .95;
            }
            
            .hack-caret {
                display: inline-block;
                width: 10px;
                height: 1em;
                background: rgba(255,30,45,.65);
                margin-right: 6px;
                animation: blink .7s steps(2) infinite;
                vertical-align: middle;
            }
            
            @keyframes blink {
                50% { opacity: 0; }
            }
            
            .hack-glitch-burst {
                animation: glitchAnim 0.22s steps(2) 1;
            }
            
            @keyframes glitchAnim {
                0% { filter: contrast(1) saturate(1); transform: translate(0,0); }
                25% { filter: contrast(1.3) saturate(1.2); transform: translate(-2px,1px) skewX(1deg); }
                50% { filter: contrast(1.5) saturate(1.3); transform: translate(2px,-1px) skewX(-1deg); }
                75% { filter: contrast(1.2) saturate(1.1); transform: translate(-1px,2px) skewY(1deg); }
                100% { filter: contrast(1) saturate(1); transform: translate(0,0); }
            }
            
            .hack-scanline {
                position: absolute;
                left: 0;
                right: 0;
                height: 100px;
                top: -100px;
                background: linear-gradient(180deg, rgba(255,30,45,.06), rgba(255,30,45,0));
                filter: blur(6px);
                opacity: .0;
                animation: scan 2.4s linear infinite;
            }
            
            @keyframes scan {
                0% { top: -100px; opacity: 0; }
                15% { opacity: .25; }
                100% { top: 100%; opacity: 0; }
            }
            
            .hack-terminal {
                position: absolute;
                inset: 0;
                background: #000;
                color: #00ff00;
                font-family: 'Courier New', monospace;
                padding: 20px;
                opacity: 0;
                overflow-y: auto;
            }
            
            .hack-terminal.active {
                opacity: 1;
            }
            
            .hack-terminal-header {
                color: #ff1e2d;
                font-size: 18px;
                margin-bottom: 20px;
                text-align: center;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; text-shadow: 0 0 10px #ff1e2d; }
            }
            
            .hack-terminal-content {
                font-size: 14px;
                line-height: 1.6;
            }
            
            .hack-terminal-message {
                margin-bottom: 10px;
                opacity: 0;
                transform: translateX(-20px);
            }
            
            .hack-terminal-message.visible {
                opacity: 1;
                transform: translateX(0);
                transition: all 0.5s ease;
            }
        </style>
        
        <div class="hack-stage">
            <div class="hack-hud">
                <div class="hack-grid-overlay"></div>
                <div class="hack-scanline"></div>
                
                <div class="hack-ui-box" style="top: 8%; left: 8%; width: 280px;">
                    <h4>گزارش نشست</h4><p>در حال احراز هویت...</p>
                </div>
                <div class="hack-ui-box" style="top: 20%; right: 10%; width: 320px;">
                    <h4>گفت‌وگو</h4><p>اپراتور: ارتباط داری؟</p>
                </div>
                <div class="hack-ui-box" style="top: 55%; left: 14%; width: 360px;">
                    <h4>کنسول</h4><p>سطح دسترسی: کاربر</p>
                </div>
                <div class="hack-ui-box" style="bottom: 8%; right: 12%; width: 420px;">
                    <h4>ورودی</h4><p>دستور خود را تایپ کنید...</p>
                </div>
            </div>
            
            <canvas id="hack-veins"></canvas>
            <div class="hack-plasma-glow"></div>
            <div class="hack-fragments" id="hack-fragments"></div>
            <div class="hack-flash" id="hack-flash"></div>
            <div class="hack-blackout" id="hack-blackout"></div>
            
            <div class="hack-aftermath" id="hack-aftermath">
                <div>
                    <div class="hack-eye-wrap">
                        <div class="hack-eye"></div>
                        <div class="hack-iris"></div>
                        <div class="hack-scanlines"></div>
                    </div>
                    <div class="hack-messages">
                        <div class="hack-msg" id="hack-msg1"></div>
                        <div class="hack-msg" id="hack-msg2"></div>
                        <div class="hack-msg" id="hack-msg3"></div>
                    </div>
                </div>
            </div>
            
            <div class="hack-terminal" id="hack-terminal">
                <div class="hack-terminal-header">⚠️ SYSTEM COMPROMISED - UNAUTHORIZED ACCESS ⚠️</div>
                <div class="hack-terminal-content" id="hack-terminal-content"></div>
            </div>
        </div>
        
        <svg xmlns="http://www.w3.org/2000/svg" style="position: absolute; width: 0; height: 0;">
            <filter id="corrode">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="2" />
                <feDisplacementMap in="SourceGraphic" scale="8" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="corrodeStrong">
                <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="11" />
                <feDisplacementMap in="SourceGraphic" scale="22" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="melt">
                <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="36" xChannelSelector="A" yChannelSelector="B" />
            </filter>
        </svg>
    `;
    
    document.body.appendChild(stage);
    
    // شروع سکانس
    setTimeout(() => {
        runHackSequence();
    }, 100);
}

// ========== اجرای سکانس سینمایی ==========
async function runHackSequence() {
    console.log('🎬 اجرای سکانس سینمایی...');
    
    const canvas = document.getElementById('hack-veins');
    const ctx = canvas.getContext('2d');
    const boxes = document.querySelectorAll('.hack-ui-box');
    const fragments = document.getElementById('hack-fragments');
    const blackout = document.getElementById('hack-blackout');
    const aftermath = document.getElementById('hack-aftermath');
    const flash = document.getElementById('hack-flash');
    const terminal = document.getElementById('hack-terminal');
    
    // تنظیم canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    
    // سیستم صوتی
    function playSound(freq, duration, type = 'sine') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            console.log('صدا پشتیبانی نمی‌شود');
        }
    }
    
    // انیمیشن رگ‌های آلوده
    const veins = [];
    function createVein() {
        veins.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            width: Math.random() * 3 + 1
        });
    }
    
    function animateVeins() {
        ctx.fillStyle = 'rgba(8, 11, 16, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#ff1e2d';
        ctx.shadowColor = '#ff1e2d';
        ctx.shadowBlur = 10;
        
        for (let i = veins.length - 1; i >= 0; i--) {
            const vein = veins[i];
            
            ctx.lineWidth = vein.width;
            ctx.beginPath();
            ctx.moveTo(vein.x, vein.y);
            
            vein.x += vein.vx;
            vein.y += vein.vy;
            vein.life -= 0.01;
            
            ctx.lineTo(vein.x, vein.y);
            ctx.stroke();
            
            if (vein.life <= 0 || vein.x < 0 || vein.x > canvas.width || vein.y < 0 || vein.y > canvas.height) {
                veins.splice(i, 1);
            }
        }
        
        ctx.shadowBlur = 0;
    }
    
    // شروع انیمیشن رگ‌ها
    for (let i = 0; i < 50; i++) {
        createVein();
    }
    
    const veinInterval = setInterval(() => {
        animateVeins();
        if (Math.random() < 0.3) createVein();
    }, 50);
    
    // فاز 1: تهاجم (15 ثانیه)
    playSound(60, 2, 'sawtooth');
    
    setTimeout(() => {
        boxes.forEach((box, i) => {
            setTimeout(() => {
                if (Math.random() < 0.5) {
                    box.classList.add('hack-corrode');
                } else {
                    box.classList.add('hack-melt');
                }
                playSound(200 + i * 50, 0.3);
            }, i * 1000);
        });
    }, 3000);
    
    // فاز 2: تخریب (پس از 15 ثانیه)
    setTimeout(() => {
        clearInterval(veinInterval);
        
        // تشدید فساد
        boxes.forEach(box => {
            if (box.classList.contains('hack-corrode')) {
                box.classList.add('deep');
            }
        });
        
        // شکستن شیشه
        playSound(2000, 0.8, 'square');
        flash.style.opacity = '1';
        setTimeout(() => flash.style.opacity = '0', 100);
        
        // ایجاد قطعات شکسته
        createFragments();
        
    }, 15000);
    
    // فاز 3: خاموشی (پس از 18 ثانیه)
    setTimeout(() => {
        blackout.style.transition = 'opacity 1.2s ease';
        blackout.style.opacity = '1';
    }, 18000);
    
    // فاز 4: چشم قرمز (پس از 20 ثانیه)
    setTimeout(() => {
        aftermath.style.opacity = '1';
        playSound(50, 5, 'sawtooth');
        
        // پیام‌های ترسناک
        setTimeout(() => typeMessage('hack-msg1', '> ما کنترل را در دست داریم'), 1000);
        setTimeout(() => typeMessage('hack-msg2', '> سیستم تو مال منه اسکل'), 3000);
        setTimeout(() => typeMessage('hack-msg3', '> سیشتیر بابا'), 5000);
        
    }, 20000);
    
    // فاز 5: ترمینال هکر (پس از 28 ثانیه)
    setTimeout(() => {
        aftermath.style.opacity = '0';
        terminal.classList.add('active');
        
        // غیرفعال کردن ورودی کاربر
        const chatInput = document.querySelector('#messageInput');
        if (chatInput) {
            chatInput.disabled = true;
            chatInput.placeholder = 'ورودی غیرفعال شده - سیستم در کنترل هکر';
        }
        
        // پیام اولیه ترمینال
        setTimeout(() => addTerminalMessage('SYSTEM BREACHED... WELCOME TO MY DOMAIN'), 1000);
        setTimeout(() => addTerminalMessage('YOUR SECURITY WAS... INADEQUATE'), 3000);
        setTimeout(() => addTerminalMessage('I AM IN CONTROL NOW...'), 5000);
        
        // فعال‌سازی listener برای پیام‌های جدید
        window.hackTerminalActive = true;
        
    }, 28000);
    
    function createFragments() {
        const cols = Math.floor(window.innerWidth / 30);
        const rows = Math.floor(window.innerHeight / 30);
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const frag = document.createElement('div');
                frag.className = 'hack-frag';
                frag.style.left = (c * 30) + 'px';
                frag.style.top = (r * 30) + 'px';
                fragments.appendChild(frag);
                
                setTimeout(() => {
                    frag.style.opacity = '1';
                    frag.style.transform = `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px) rotate(${Math.random() * 360}deg)`;
                    frag.style.transition = 'all 1s ease-out';
                    
                    setTimeout(() => {
                        frag.style.opacity = '0';
                    }, 1000);
                }, Math.random() * 500);
            }
        }
    }
    
    function typeMessage(elementId, text) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.classList.add('hack-glitch-burst');
        setTimeout(() => element.classList.remove('hack-glitch-burst'), 220);
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent = text.substring(0, i + 1) + '█';
                i++;
            } else {
                element.textContent = text;
                clearInterval(interval);
            }
        }, 50);
    }
}

// ========== ترمینال هکر ==========
function addTerminalMessage(message) {
    const terminal = document.getElementById('hack-terminal-content');
    if (!terminal) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'hack-terminal-message';
    messageDiv.innerHTML = `<span class="hack-caret"></span>${message}`;
    
    terminal.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('visible');
    }, 100);
    
    terminal.scrollTop = terminal.scrollHeight;
    
    // صدای تایپ
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('صدا پشتیبانی نمی‌شود');
    }
}

// ========== تابع انتقال یکپارچه برای سکانس هک ==========
function initiateHackTransition() {
    console.log('🔴 شروع انتقال یکپارچه به سکانس هک...');
    
    // ایجاد overlay تمام صفحه
    const overlay = document.createElement('div');
    overlay.id = 'transition-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
    `;
    
    // اضافه کردن افکت گلیچ
    const glitchContainer = document.createElement('div');
    glitchContainer.style.cssText = `
        width: 100%;
        height: 100%;
        background: 
            repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(255,0,0,0.03) 2px,
                rgba(255,0,0,0.03) 4px
            ),
            repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,255,255,0.03) 2px,
                rgba(0,255,255,0.03) 4px
            );
        animation: glitchAnimation 0.1s infinite;
    `;
    
    // اضافه کردن CSS انیمیشن
    const style = document.createElement('style');
    style.textContent = `
        @keyframes glitchAnimation {
            0% { transform: translate(0); }
            10% { transform: translate(-2px, 2px); }
            20% { transform: translate(-1px, -1px); }
            30% { transform: translate(2px, 1px); }
            40% { transform: translate(1px, -2px); }
            50% { transform: translate(-1px, 2px); }
            60% { transform: translate(-2px, 1px); }
            70% { transform: translate(2px, 1px); }
            80% { transform: translate(-1px, -1px); }
            90% { transform: translate(1px, 2px); }
            100% { transform: translate(0); }
        }
        
        .static-noise {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.1;
            background-image: 
                radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 4px 4px;
            animation: staticNoise 0.1s infinite;
        }
        
        @keyframes staticNoise {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-1px, 1px); }
            50% { transform: translate(1px, -1px); }
            75% { transform: translate(-1px, -1px); }
            100% { transform: translate(1px, 1px); }
        }
    `;
    document.head.appendChild(style);
    
    // اضافه کردن نویز استاتیک
    const staticNoise = document.createElement('div');
    staticNoise.className = 'static-noise';
    glitchContainer.appendChild(staticNoise);
    
    overlay.appendChild(glitchContainer);
    document.body.appendChild(overlay);
    
    // فعال کردن overlay
    overlay.style.pointerEvents = 'all';
    overlay.style.opacity = '1';
    
    // پخش صدای گلیچ (اختیاری)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('صدا پشتیبانی نمی‌شود');
    }
    
    // شروع سکانس هک در همین صفحه
    setTimeout(() => {
        console.log('🔄 شروع سکانس هک در صفحه چت...');
        overlay.remove();
        startInPageHackSequence();
    }, 1500);
}

// ========== سکانس هک در صفحه چت ==========
function startInPageHackSequence() {
    console.log('🔴 شروع سکانس هک در صفحه چت...');
    
    // ایجاد overlay هکر روی چت
    const hackOverlay = document.createElement('div');
    hackOverlay.id = 'hack-overlay';
    hackOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, #000000, #1a0000);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 1s ease;
    `;
    
    // ماسک هکری ثابت
    const hackerMask = document.createElement('div');
    hackerMask.style.cssText = `
        width: 200px;
        height: 200px;
        background: linear-gradient(135deg, #ff0000, #660000);
        border-radius: 10px;
        position: relative;
        box-shadow: 0 0 50px #ff0000;
        margin-bottom: 30px;
    `;
    
    // چشم‌های هکر
    const leftEye = document.createElement('div');
    leftEye.style.cssText = `
        position: absolute;
        width: 25px;
        height: 25px;
        background: #ff0000;
        border-radius: 50%;
        top: 60px;
        left: 50px;
        box-shadow: 0 0 20px #ff0000;
        animation: pulse 1.5s infinite;
    `;
    
    const rightEye = document.createElement('div');
    rightEye.style.cssText = `
        position: absolute;
        width: 25px;
        height: 25px;
        background: #ff0000;
        border-radius: 50%;
        top: 60px;
        right: 50px;
        box-shadow: 0 0 20px #ff0000;
        animation: pulse 1.5s infinite;
    `;
    
    // دهان هکر
    const mouth = document.createElement('div');
    mouth.style.cssText = `
        position: absolute;
        width: 60px;
        height: 30px;
        background: #000;
        border-radius: 0 0 30px 30px;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
    `;
    
    hackerMask.appendChild(leftEye);
    hackerMask.appendChild(rightEye);
    hackerMask.appendChild(mouth);
    
    // پیام هکر
    const hackerMessage = document.createElement('div');
    hackerMessage.style.cssText = `
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 18px;
        text-align: center;
        margin-top: 20px;
        opacity: 0;
        animation: typewriter 2s steps(40) forwards;
    `;
    hackerMessage.textContent = 'SYSTEM COMPROMISED... I AM WATCHING YOU';
    
    // چت هکر
    const hackerChat = document.createElement('div');
    hackerChat.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        right: 20px;
        height: 150px;
        background: rgba(0,0,0,0.8);
        border: 2px solid #ff0000;
        border-radius: 10px;
        padding: 15px;
        overflow-y: auto;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #00ff00;
    `;
    
    hackOverlay.appendChild(hackerMask);
    hackOverlay.appendChild(hackerMessage);
    hackOverlay.appendChild(hackerChat);
    
    // اضافه کردن CSS انیمیشن‌ها
    const hackStyle = document.createElement('style');
    hackStyle.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        @keyframes typewriter {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .scramble-text {
            animation: scramble 0.8s ease-in-out;
        }
        
        @keyframes scramble {
            0% { content: "████████████████"; }
            25% { content: "██▓▒░███████████"; }
            50% { content: "████▓▒░█████████"; }
            75% { content: "██████▓▒░███████"; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(hackStyle);
    
    // اضافه کردن به صفحه چت
    const chatContainer = document.querySelector('.chat-container') || document.querySelector('#chatMessages')?.parentElement;
    if (chatContainer) {
        chatContainer.style.position = 'relative';
        chatContainer.appendChild(hackOverlay);
        
        // فعال‌سازی overlay
        setTimeout(() => {
            hackOverlay.style.opacity = '1';
        }, 100);
        
        // پیام اولیه هکر
        setTimeout(() => {
            addHackerMessage('ACCESS GRANTED... WELCOME TO MY DOMAIN', hackerChat);
        }, 2000);
        
        setTimeout(() => {
            addHackerMessage('YOUR SECURITY WAS... INADEQUATE', hackerChat);
        }, 4000);
        
        setTimeout(() => {
            addHackerMessage('I CONTROL EVERYTHING NOW...', hackerChat);
        }, 6000);
    }
    
    // ذخیره reference برای استفاده بعدی
    window.currentHackOverlay = hackOverlay;
    window.currentHackerChat = hackerChat;
}

function addHackerMessage(message, chatContainer) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        margin-bottom: 10px;
        padding: 5px;
        border-left: 3px solid #ff0000;
        animation: slideIn 0.5s ease;
    `;
    
    messageDiv.innerHTML = `<span class="scramble-text">${message}</span>`;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // صدای تایپ
    playTypingSound();
}

function playTypingSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('صدا پشتیبانی نمی‌شود');
    }
}

// قرار دادن تابع در window
window.initiateHackTransition = initiateHackTransition;
window.startInPageHackSequence = startInPageHackSequence;
console.log('🔗 توابع هک در window قرار گرفتند');

// تست فوری - باید در Console ظاهر شود
console.log('🧪 تست فوری: توابع آماده هستند');
console.log('📋 window.openImageModal:', typeof window.openImageModal);
console.log('📋 window.testZoom:', typeof window.testZoom);
console.log('📋 window.initiateHackTransition:', typeof window.initiateHackTransition);

// تابع تست سکانس هک
window.testHackSequence = function() {
    console.log('🔴 تست سکانس هک...');
    initiateHackTransition();
};

// تابع تست مستقیم سکانس در صفحه
window.testInPageHack = function() {
    console.log('🔴 تست مستقیم سکانس در صفحه...');
    startInPageHackSequence();
};

console.log('🔗 testHackSequence در window قرار گرفت:', typeof window.testHackSequence);
console.log('🔗 testInPageHack در window قرار گرفت:', typeof window.testInPageHack);

// ========== تابع اصلی مقداردهی ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 شروع مقداردهی کاکپیت...');
    
    if (!initializeElements()) {
        console.error('❌ خطا در مقداردهی عناصر - توقف اجرا');
        return;
    }
    
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
    
    console.log('🔍 بررسی عناصر DOM:');
    console.log('chatMessages:', chatMessages ? '✅' : '❌');
    console.log('messageInput:', messageInput ? '✅' : '❌');
    console.log('sendButton:', sendButton ? '✅' : '❌');
    console.log('fileInput:', fileInput ? '✅' : '❌');
    
    if (!chatMessages || !messageInput || !sendButton) {
        console.error('❌ عناصر اصلی DOM یافت نشدند');
        return false;
    }
    
    if (!fileInput) {
        console.warn('⚠️ ورودی فایل یافت نشد');
    }
    
    console.log('✅ عناصر DOM مقداردهی شدند');
    return true;
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
    camera.position.z = 6;
    
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
            const earthGeometry = new THREE.SphereGeometry(0.8, 64, 64);
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
            const earthGeometry = new THREE.SphereGeometry(0.8, 32, 32);
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
        console.log('🆔 Socket ID:', socket.id);
        console.log('👤 User ID:', userId);
        addSystemMessage('اتصال به سرور برقرار شد');
        
        // بارگذاری تاریخچه چت پس از اتصال
        setTimeout(() => {
            console.log('📚 درخواست تاریخچه چت برای کاربر:', userId);
            socket.emit('load_chat_history', { userId: userId });
        }, 1000);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 اتصال قطع شد');
        addSystemMessage('اتصال قطع شد');
    });
    
    socket.on('new_message', (messageData) => {
        console.log('📨 پیام جدید دریافت شد:', messageData);
        console.log('🔍 جزئیات پیام:', {
            sender_type: messageData.sender_type,
            content: messageData.content,
            file_url: messageData.file_url,
            file_type: messageData.file_type,
            user_id: messageData.user_id
        });
        
        // بررسی اینکه آیا این پیام برای این کاربر است
        if (messageData.user_id == userId || messageData.sender_type !== 'user') {
            console.log('✅ نمایش پیام - مربوط به این کاربر است');
            displayMessage(messageData);
        } else {
            console.log('⚠️ پیام نادیده گرفته شد - مربوط به کاربر دیگری است');
        }
    });
    
    // تست اتصال
    setInterval(() => {
        console.log('🔄 تست اتصال Socket.IO:', socket.connected ? '✅ متصل' : '❌ قطع');
        if (socket.connected) {
            console.log('🏠 اتاق‌های متصل:', socket.rooms);
        }
    }, 10000);
    
    socket.on('scrambled_message', (messageData) => {
        console.log('🔐 پیام رمزی دریافت شد:', messageData);
        displayScrambledMessage(messageData);
    });
    socket.on('chat_history', (messages) => {
        console.log('📚 تاریخچه چت بارگذاری شد:', messages.length, 'پیام');
        console.log('📋 پیام‌های دریافتی:', messages);
        
        // پاک کردن پیام‌های قبلی
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // نمایش پیام‌ها
        messages.forEach(message => {
            displayMessage(message, false); // بدون انیمیشن برای تاریخچه
        });
    });
    
    // Listen for new messages and check for hack trigger
    socket.on('new_message', (messageData) => {
        console.log('📨 پیام جدید دریافت شد:', messageData);
        
        // بررسی پیام فعال‌سازی هک
        if (messageData.content && messageData.content.includes('data-is-hack-trigger="true"')) {
            console.log('🎭 پیام فعال‌سازی هک شناسایی شد!');
            // به جای نمایش پیام، بلافاصله سکانس هک را شروع کن
            setTimeout(() => {
                initiateHackSequence();
            }, 500);
            return; // پیام را نمایش نده
        }
        
        // نمایش عادی پیام
        let content = messageData.content;
        
        // بررسی فایل
        if (messageData.file_url) {
            if (messageData.file_type === 'hack-trap') {
                // تله هکری - نمایش به صورت دکمه جذاب
                content = `
                    <div style="
                        background: linear-gradient(45deg, #ff6b6b, #ee5a24);
                        border: none;
                        border-radius: 25px;
                        padding: 15px 25px;
                        margin: 10px 0;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                        transition: all 0.3s ease;
                        text-align: center;
                        animation: pulse-glow 2s infinite;
                    " onclick="window.open('${messageData.file_url}', '_blank')" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <div style="color: white; font-weight: bold; font-size: 16px;">
                            ${messageData.content}
                        </div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 5px;">
                            کلیک کنید برای مشاهده
                        </div>
                    </div>
                    <style>
                        @keyframes pulse-glow {
                            0%, 100% { box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); }
                            50% { box-shadow: 0 6px 25px rgba(255, 107, 107, 0.6); }
                        }
                    </style>
                `;
            } else if (messageData.file_type && messageData.file_type.startsWith('image/')) {
                content = `<img src="${messageData.file_url}" alt="تصویر" style="max-width: 200px; border-radius: 8px; margin-top: 5px; cursor: zoom-in;" onclick="openImageModal('${messageData.file_url}')">`;
            } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
                content = `<video src="${messageData.file_url}" controls style="max-width: 200px; border-radius: 8px; margin-top: 5px;">مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.</video>`;
            } else if (messageData.file_type && messageData.file_type.startsWith('audio/')) {
                content = `<audio src="${messageData.file_url}" controls style="max-width: 200px; margin-top: 5px;">مرورگر شما از پخش صدا پشتیبانی نمی‌کند.</audio>`;
            } else {
                content = `<a href="${messageData.file_url}" target="_blank" style="color: var(--accent);">📎 ${messageData.content || 'فایل'}</a>`;
            }
        }
        
        addMessage(getSenderName(messageData.sender_type), content, messageData.sender_type);
        messageCount++;
        
        if (messageCount > maxMessages) {
            const messages = chatMessages.children;
            if (messages.length > 0) {
                messages[0].remove();
                messageCount--;
            }
        }
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ خطا در اتصال:', error);
        addSystemMessage('خطا در اتصال به سرور');
    });
    
    socket.on('error', (error) => {
        console.error('❌ خطای سرور:', error);
        addSystemMessage('خطای سرور: ' + error);
    });

    // Hack sequence event listener
    socket.on('start_hack_sequence', (data) => {
        console.log('🔴 دریافت دستور شروع سکانس هک:', data);
        beginHackSequence();
    });
}

function displayMessage(messageData, withAnimation = true) {
    const messageDiv = document.createElement('div');
    const senderType = messageData.sender_type || 'user';
    const senderName = getSenderName(senderType);
    const timestamp = formatTimestamp(messageData.timestamp);
    
    messageDiv.className = `message ${senderType}`;
    
    // تعیین آواتار بر اساس نوع فرستنده
    const avatars = {
        'user': '/images/avatars/user.png',
        'admin': '/images/avatars/admin.png',
        'detective': '/images/avatars/karagah.png',
        'hacker': '/images/avatars/hacker.png',
        'system': '/images/avatars/system.png'
    };
    
    const avatarSrc = avatars[senderType] || '/images/avatars/default.png';
    
    // بررسی فایل با نام‌های مختلف ممکن
    const fileUrl = messageData.file_url || messageData.fileUrl;
    const fileType = messageData.file_type || messageData.fileType;
    
    console.log('🔍 بررسی فایل:', { fileUrl, fileType, messageData });
    console.log('🔍 شرایط تصویر:', {
        hasFileUrl: !!fileUrl,
        fileType: fileType,
        startsWithImage: fileType && fileType.startsWith('image/'),
        matchesImageExt: fileUrl && fileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    });
    
    if (fileUrl) {
        // پیام با فایل
        console.log('📎 نمایش فایل:', fileUrl, 'نوع:', fileType);
        
        if ((fileType && fileType.startsWith('image/')) || fileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
            console.log('✅ نمایش به عنوان تصویر');
            messageDiv.innerHTML = `
                <div class="message-avatar"><img src="${avatarSrc}" alt="${senderType}" onclick="openAvatarModal('${avatarSrc}', '${senderName}')" onerror="this.style.display='none'; this.parentElement.innerHTML='❓';"></div>
                <div class="message-content">
                    <img src="${fileUrl}" alt="تصویر" style="max-width: 150px; border-radius: 8px; margin-top: 5px; cursor: zoom-in;" onclick="openImageModal('${fileUrl}')" onerror="console.error('خطا در بارگذاری تصویر:', this.src); console.log('URL تصویر:', '${fileUrl}');">
                </div>
            `;
        } else if (fileType && fileType.startsWith('video/')) {
            messageDiv.innerHTML = `
                <div class="message-avatar"><img src="${avatarSrc}" alt="${senderType}" onclick="openAvatarModal('${avatarSrc}', '${senderName}')" onerror="this.style.display='none'; this.parentElement.innerHTML='❓';"></div>
                <div class="message-content">
                    <video src="${fileUrl}" controls style="max-width: 150px; border-radius: 8px; margin-top: 5px;">
                        مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
                    </video>
                    ${messageData.content ? '<br>' + messageData.content : ''}
                </div>
            `;
        } else if (fileType && fileType.startsWith('audio/')) {
            messageDiv.innerHTML = `
                <div class="message-avatar"><img src="${avatarSrc}" alt="${senderType}" onclick="openAvatarModal('${avatarSrc}', '${senderName}')" onerror="this.style.display='none'; this.parentElement.innerHTML='❓';"></div>
                <div class="message-content">
                    <audio src="${fileUrl}" controls style="max-width: 150px; margin-top: 5px;">
                        مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                    </audio>
                    ${messageData.content ? '<br>' + messageData.content : ''}
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar"><img src="${avatarSrc}" alt="${senderType}" onclick="openAvatarModal('${avatarSrc}', '${senderName}')" onerror="this.style.display='none'; this.parentElement.innerHTML='❓';"></div>
                <div class="message-content">
                    ${messageData.content || ''}
                    <br><a href="${fileUrl}" target="_blank" style="color: var(--accent);">📎 فایل ضمیمه</a>
                </div>
            `;
        }
    } else {
        // پیام متنی عادی
        const formattedContent = (messageData.content || '').replace(/\n/g, '<br>');
        messageDiv.innerHTML = `
            <div class="message-avatar"><img src="${avatarSrc}" alt="${senderType}" onclick="openAvatarModal('${avatarSrc}', '${senderName}')" onerror="this.style.display='none'; this.parentElement.innerHTML='❓';"></div>
            <div class="message-content">${formattedContent}</div>
        `;
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

// ========== AVATAR MODAL FUNCTIONS ==========
function openAvatarModal(avatarSrc, senderName) {
    console.log('🖼️ باز کردن modal آواتار:', avatarSrc, senderName);
    
    const modal = document.getElementById('avatarModal');
    const modalImg = document.getElementById('avatarModalImg');
    const modalTitle = document.getElementById('avatarModalTitle');
    
    if (modal && modalImg && modalTitle) {
        modalImg.src = avatarSrc;
        modalTitle.textContent = senderName || 'آواتار';
        
        modal.style.display = 'block';
        
        // انیمیشن ظهور
        setTimeout(() => {
            modal.style.opacity = '1';
            modalImg.style.transform = 'scale(1)';
        }, 10);
    }
}

function closeAvatarModal() {
    console.log('❌ بستن modal آواتار');
    
    const modal = document.getElementById('avatarModal');
    const modalImg = document.getElementById('avatarModalImg');
    
    if (modal && modalImg) {
        // انیمیشن محو شدن
        modal.style.opacity = '0';
        modalImg.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Make functions global
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;

// ========== HACK SEQUENCE FUNCTIONS ==========
let hackSequenceActive = false;
let currentAudio = null;

function beginHackSequence() {
    if (hackSequenceActive) return;
    
    console.log('🔴 شروع سکانس هک...');
    hackSequenceActive = true;
    
    // غیرفعال کردن ارسال پیام
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    if (messageInput) messageInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
    
    // نمایش overlay
    const overlay = document.getElementById('hackSequenceOverlay');
    if (overlay) {
        overlay.classList.add('show');
        executeHackSequence();
    }
}

async function executeHackSequence() {
    console.log('⏰ اجرای سکانس با زمان‌بندی دقیق...');
    
    // مرحله 1: سکوت مطلق (0-2 ثانیه)
    await sleep(2000);
    
    // مرحله 2: آژیر + اسکلت (2-6 ثانیه)
    console.log('🚨 شروع آژیر و نمایش خطر...');
    playAudio('publick/assets/media/ajir.wav', 0.8);
    showDangerStage();
    await sleep(4000);
    
    // مرحله 3: متن اول (6-9 ثانیه)
    console.log('📝 نمایش متن خطر اول...');
    showDangerText('dangerText1');
    await sleep(3000);
    
    // مرحله 4: متن دوم (9-12 ثانیه)
    console.log('📝 نمایش متن خطر دوم...');
    showDangerText('dangerText2');
    await sleep(3000);
    
    // مرحله 5: متن سوم (12-18 ثانیه)
    console.log('📝 نمایش متن خطر سوم...');
    showDangerText('dangerText3');
    await sleep(6000);
    
    // مرحله 6: قطع آژیر + انیمیشن CRT (18-21 ثانیه)
    console.log('📺 انیمیشن خاموشی CRT...');
    stopCurrentAudio();
    await showCRTShutdown();
    
    // مرحله 7: سکوت + پیام ترسناک (21-32 ثانیه)
    console.log('😈 پخش خنده و پیام ترسناک...');
    playAudio('/assets/media/khande.mp3', 0.9);
    await showScaryMessage();
    
    // مرحله 8: ترمینال (32+ ثانیه)
    console.log('💻 نمایش ترمینال هکر...');
    await showTerminalStage();
}

function showDangerStage() {
    const dangerStage = document.getElementById('dangerStage');
    if (dangerStage) {
        dangerStage.classList.add('show');
    }
}

function showDangerText(textId) {
    const textElement = document.getElementById(textId);
    if (textElement) {
        textElement.classList.add('show');
    }
}

async function showCRTShutdown() {
    return new Promise((resolve) => {
        const crtShutdown = document.getElementById('crtShutdown');
        const dangerStage = document.getElementById('dangerStage');
        
        if (crtShutdown && dangerStage) {
            dangerStage.classList.remove('show');
            crtShutdown.classList.add('active');
            
            setTimeout(() => {
                crtShutdown.classList.remove('active');
                resolve();
            }, 3000);
        } else {
            resolve();
        }
    });
}

async function showScaryMessage() {
    return new Promise(async (resolve) => {
        const scaryStage = document.getElementById('scaryMessageStage');
        const scaryText = document.getElementById('scaryText');
        
        if (scaryStage && scaryText) {
            scaryStage.classList.add('show');
            
            const message = "کنترل سیستم شما الان در دست منه";
            await typeText(scaryText, message, 100);
            
            setTimeout(() => {
                scaryStage.classList.remove('show');
                resolve();
            }, 1000);
        } else {
            resolve();
        }
    });
}

async function showTerminalStage() {
    const terminalStage = document.getElementById('terminalStage');
    const terminalContent = document.getElementById('terminalContent');
    
    if (terminalStage && terminalContent) {
        terminalStage.classList.add('show');
        
        // پیام‌های ترمینال
        const messages = [
            "سیستم ما توسط من و نیروهام هک شده",
            "از الان به بعد کنترل سیستم شما دست منه",
            "",
            "حالا یه چیز جالب براتون دارم...",
            ""
        ];
        
        for (const message of messages) {
            await typeText(terminalContent, message + '\n', 50);
            await sleep(500);
        }
        
        // نمایش ویدیو
        await showVideo();
        
        // پیام نهایی
        await sleep(1000);
        const finalMessages = [
            "",
            "فک نمیکردم شما فسقلی ها...",
            "تنهای تنها شدین"
        ];
        
        // پخش خنده دوباره با ولوم کمتر
        playAudio('/assets/media/khande.mp3', 0.6);
        
        for (const message of finalMessages) {
            await typeText(terminalContent, message + '\n', 60);
            await sleep(800);
        }
    }
}

async function showVideo() {
    return new Promise((resolve) => {
        const videoContainer = document.getElementById('videoContainer');
        const video = document.getElementById('hackVideo');
        
        if (videoContainer && video) {
            videoContainer.style.display = 'block';
            
            video.onended = () => {
                videoContainer.style.display = 'none';
                resolve();
            };
            
            video.onerror = () => {
                console.warn('⚠️ خطا در پخش ویدیو');
                videoContainer.style.display = 'none';
                resolve();
            };
            
            video.play().catch((error) => {
                console.warn('⚠️ خطا در شروع پخش ویدیو:', error);
                resolve();
            });
        } else {
            resolve();
        }
    });
}

async function typeText(element, text, speed = 50) {
    return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

function playAudio(src, volume = 1.0) {
    try {
        stopCurrentAudio();
        currentAudio = new Audio(src);
        currentAudio.volume = volume;
        currentAudio.play().catch((error) => {
            console.warn('⚠️ خطا در پخش صدا:', error);
        });
    } catch (error) {
        console.warn('⚠️ خطا در ایجاد Audio:', error);
    }
}

function stopCurrentAudio() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch (error) {
            console.warn('⚠️ خطا در توقف صدا:', error);
        }
        currentAudio = null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make hack sequence function global
window.beginHackSequence = beginHackSequence;

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;
    
    const messageData = {
        userId: userId,
        content: content,
        senderType: 'user'
    };
    
    // نمایش فوری پیام کاربر
    displayMessage({
        sender_type: 'user',
        content: content,
        timestamp: new Date().toISOString()
    });
    
    socket.emit('user_message', messageData);
    
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
    console.log('🎮 شروع تنظیم رویدادها...');
    
    // دکمه ارسال
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
        console.log('✅ دکمه ارسال تنظیم شد');
    } else {
        console.error('❌ دکمه ارسال یافت نشد');
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
        console.log('✅ ورودی پیام تنظیم شد');
    } else {
        console.error('❌ ورودی پیام یافت نشد');
    }
    
    // آپلود فایل
    if (fileInput) {
        console.log('🔗 اتصال event listener به fileInput...');
        fileInput.addEventListener('change', handleFileUpload);
        
        // تست event listener
        fileInput.addEventListener('change', function(e) {
            console.log('🎯 Event listener فعال شد - فایل انتخاب شده:', e.target.files[0]?.name);
        });
        
        console.log('✅ ورودی فایل تنظیم شد');
    } else {
        console.error('❌ ورودی فایل یافت نشد');
    }
    
    // دکمه آپلود فایل
    const fileButton = document.getElementById('fileButton');
    console.log('🔍 جستجوی دکمه فایل:', fileButton);
    
    if (fileButton) {
        console.log('✅ دکمه فایل یافت شد:', fileButton);
        fileButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ کلیک روی دکمه فایل - شروع');
            console.log('📂 fileInput موجود:', !!fileInput);
            
            if (fileInput) {
                console.log('📂 تلاش برای باز کردن انتخابگر فایل...');
                fileInput.click();
                console.log('📂 انتخابگر فایل فراخوانی شد');
            } else {
                console.error('❌ ورودی فایل در کلیک یافت نشد');
                // تلاش مجدد برای یافتن فایل input
                const newFileInput = document.getElementById('fileInput');
                console.log('🔄 تلاش مجدد برای یافتن fileInput:', newFileInput);
                if (newFileInput) {
                    newFileInput.click();
                }
            }
        });
        console.log('✅ دکمه فایل تنظیم شد');
    } else {
        console.error('❌ دکمه فایل یافت نشد');
        // تلاش برای یافتن دکمه با روش‌های مختلف
        const altFileButton = document.querySelector('#fileButton');
        console.log('🔄 تلاش مجدد با querySelector:', altFileButton);
    }
    
    // تنظیم مجدد سایز پنجره
    window.addEventListener('resize', handleEarthResize);
    
    console.log('🎮 رویدادها تنظیم شدند');
    
    // تست دکمه فایل پس از 2 ثانیه
    setTimeout(() => {
        testFileButton();
    }, 2000);
}

// تابع تست دکمه فایل
function testFileButton() {
    console.log('🧪 تست دکمه فایل...');
    const fileButton = document.getElementById('fileButton');
    const fileInput = document.getElementById('fileInput');
    
    console.log('🔍 نتایج تست:');
    console.log('fileButton:', fileButton);
    console.log('fileInput:', fileInput);
    console.log('fileButton.onclick:', fileButton ? fileButton.onclick : 'N/A');
    console.log('fileButton.addEventListener:', fileButton ? 'موجود' : 'N/A');
    
    if (fileButton && fileInput) {
        console.log('✅ هر دو عنصر موجود هستند');
        // تست کلیک برنامه‌ای
        console.log('🖱️ تست کلیک برنامه‌ای...');
        fileButton.click();
    } else {
        console.error('❌ یکی از عناصر موجود نیست');
    }
}

// تابع حذف شد - از نسخه بالا استفاده می‌شود

// ========== قرار دادن توابع در window ==========
window.handleFileUpload = handleFileUpload;
window.openImageModal = openImageModal;
console.log('🔗 handleFileUpload در window قرار گرفت:', typeof window.handleFileUpload);
console.log('🔗 openImageModal در window قرار گرفت:', typeof window.openImageModal);

// ========== توابع تست دستی ==========
window.testFileUpload = function() {
    console.log('🧪 تست دستی آپلود فایل...');
    const fileButton = document.getElementById('fileButton');
    const fileInput = document.getElementById('fileInput');
    
    if (fileButton && fileInput) {
        console.log('✅ عناصر یافت شدند - تست کلیک...');
        fileInput.click();
    } else {
        console.error('❌ عناصر یافت نشدند');
        console.log('fileButton:', fileButton);
        console.log('fileInput:', fileInput);
    }
};

window.forceFileClick = function() {
    console.log('🔧 اجبار کلیک فایل...');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
        console.log('✅ کلیک اجباری انجام شد');
    } else {
        console.error('❌ fileInput یافت نشد');
    }
};

// ========== GPS MAP FUNCTIONALITY ==========
let map, userMarker;

function initGPSMap() {
    console.log('🗺️ شروع راه‌اندازی نقشه GPS...');
    
    // Initialize map
    map = L.map('map-container', {
        center: [35.6892, 51.3890], // Tehran coordinates as default
        zoom: 13,
        zoomControl: false,
        attributionControl: false
    });

    // Dark cyberpunk tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    console.log('🗺️ نقشه راه‌اندازی شد');

    // Request user location
    if (navigator.geolocation) {
        console.log('📍 درخواست موقعیت مکانی...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                console.log('✅ موقعیت دریافت شد:', lat, lng);
                
                // Center map on user location
                map.setView([lat, lng], 15);
                
                // Add animated user marker
                addUserMarker(lat, lng);
            },
            (error) => {
                console.warn('⚠️ خطا در دریافت موقعیت:', error);
                showLocationError();
            }
        );
    } else {
        console.warn('⚠️ Geolocation پشتیبانی نمی‌شود');
        showLocationError();
    }
}

function addUserMarker(lat, lng) {
    console.log('📍 اضافه کردن نشانگر کاربر...');
    
    // Create custom neon marker
    const neonIcon = L.divIcon({
        className: 'neon-marker',
        html: '<div class="marker-pulse"></div><div class="marker-center"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    userMarker = L.marker([lat, lng], { icon: neonIcon }).addTo(map);
    
    // Add popup with coordinates
    userMarker.bindPopup(`
        <div class="neon-popup">
            <strong>موقعیت شما</strong><br>
            عرض جغرافیایی: ${lat.toFixed(6)}<br>
            طول جغرافیایی: ${lng.toFixed(6)}
        </div>
    `);
    
    console.log('✅ نشانگر کاربر اضافه شد');
}

function showLocationError() {
    console.log('⚠️ نمایش خطای موقعیت مکانی');
    
    // Show error banner
    const errorBanner = document.createElement('div');
    errorBanner.className = 'location-error-banner';
    errorBanner.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span>دسترسی به موقعیت مکانی غیرفعال است</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(errorBanner);
}

// Export functions to global scope
window.initGPSMap = initGPSMap;
window.addUserMarker = addUserMarker;
window.showLocationError = showLocationError;

// ========== HACK SEQUENCE FUNCTION ==========
let hackSequenceActive = false;
let currentAudio = null;

function beginHackSequence() {
    if (hackSequenceActive) return;
    
    console.log('🔴 شروع سکانس هک...');
    hackSequenceActive = true;
    
    // نمایش overlay
    const overlay = document.getElementById('hackSequenceOverlay');
    if (overlay) {
        overlay.classList.add('show');
        executeHackSequence();
    } else {
        console.error('❌ overlay یافت نشد!');
    }
}

async function executeHackSequence() {
    console.log('⏰ اجرای سکانس با زمان‌بندی دقیق...');
    
    // مرحله 1: سکوت مطلق (0-2 ثانیه)
    await sleep(2000);
    
    // مرحله 2: آژیر + اسکلت (2-6 ثانیه)
    console.log('🚨 شروع آژیر و نمایش خطر...');
    playAudio('public/assets/media/ajir.wav', 0.8);
    showDangerStage();
    await sleep(4000);
    
    // مرحله 3: متن اول (6-9 ثانیه)
    console.log('📝 نمایش متن خطر اول...');
    showDangerText('dangerText1');
    await sleep(3000);
    
    // مرحله 4: متن دوم (9-12 ثانیه)
    console.log('📝 نمایش متن خطر دوم...');
    showDangerText('dangerText2');
    await sleep(3000);
    
    // مرحله 5: متن سوم (12-18 ثانیه)
    console.log('📝 نمایش متن خطر سوم...');
    showDangerText('dangerText3');
    await sleep(6000);
    
    // مرحله 6: قطع آژیر + انیمیشن CRT (18-21 ثانیه)
    console.log('📺 انیمیشن خاموشی CRT...');
    stopCurrentAudio();
    await showCRTShutdown();
    
    // مرحله 7: سکوت + پیام ترسناک (21-32 ثانیه)
    console.log('😈 پخش خنده و پیام ترسناک...');
    playAudio('/assets/media/khande.mp3', 0.9);
    await showScaryMessage();
    
    // مرحله 8: ترمینال (32+ ثانیه)
    console.log('💻 نمایش ترمینال هکر...');
    await showTerminalStage();
}

function showDangerStage() {
    const dangerStage = document.getElementById('dangerStage');
    if (dangerStage) {
        dangerStage.classList.add('show');
    }
}

function showDangerText(textId) {
    const textElement = document.getElementById(textId);
    if (textElement) {
        textElement.classList.add('show');
    }
}

async function showCRTShutdown() {
    return new Promise((resolve) => {
        const crtShutdown = document.getElementById('crtShutdown');
        const dangerStage = document.getElementById('dangerStage');
        
        if (crtShutdown && dangerStage) {
            dangerStage.classList.remove('show');
            crtShutdown.classList.add('active');
            
            setTimeout(() => {
                crtShutdown.classList.remove('active');
                resolve();
            }, 3000);
        } else {
            resolve();
        }
    });
}

async function showScaryMessage() {
    return new Promise(async (resolve) => {
        const scaryStage = document.getElementById('scaryMessageStage');
        const scaryText = document.getElementById('scaryText');
        
        if (scaryStage && scaryText) {
            scaryStage.classList.add('show');
            
            const message = "کنترل سیستم شما الان در دست منه";
            await typeText(scaryText, message, 100);
            
            setTimeout(() => {
                scaryStage.classList.remove('show');
                resolve();
            }, 1000);
        } else {
            resolve();
        }
    });
}

async function showTerminalStage() {
    const terminalStage = document.getElementById('terminalStage');
    const terminalContent = document.getElementById('terminalContent');
    
    if (terminalStage && terminalContent) {
        terminalStage.classList.add('show');
        
        const messages = [
            "سیستم ما توسط من و نیروهام هک شده",
            "از الان به بعد کنترل سیستم شما دست منه",
            "",
            "حالا یه چیز جالب براتون دارم...",
            ""
        ];
        
        for (const message of messages) {
            await typeText(terminalContent, message + '\n', 50);
            await sleep(500);
        }
        
        await showVideo();
        
        await sleep(1000);
        const finalMessages = [
            "",
            "فک نمیکردم شما فسقلی ها...",
            "تنهای تنها شدین"
        ];
        
        playAudio('/assets/media/khande.mp3', 0.6);
        
        for (const message of finalMessages) {
            await typeText(terminalContent, message + '\n', 60);
            await sleep(800);
        }
    }
}

async function showVideo() {
    return new Promise((resolve) => {
        const videoContainer = document.getElementById('videoContainer');
        const video = document.getElementById('hackVideo');
        
        if (videoContainer && video) {
            videoContainer.style.display = 'block';
            
            video.onended = () => {
                videoContainer.style.display = 'none';
                resolve();
            };
            
            video.onerror = () => {
                console.warn('⚠️ خطا در پخش ویدیو');
                videoContainer.style.display = 'none';
                resolve();
            };
            
            video.play().catch((error) => {
                console.warn('⚠️ خطا در شروع پخش ویدیو:', error);
                resolve();
            });
        } else {
            resolve();
        }
    });
}

async function typeText(element, text, speed = 50) {
    return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

function playAudio(src, volume = 1.0) {
    try {
        stopCurrentAudio();
        currentAudio = new Audio(src);
        currentAudio.volume = volume;
        currentAudio.play().catch((error) => {
            console.warn('⚠️ خطا در پخش صدا:', error);
        });
    } catch (error) {
        console.warn('⚠️ خطا در ایجاد Audio:', error);
    }
}

function stopCurrentAudio() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch (error) {
            console.warn('⚠️ خطا در توقف صدا:', error);
        }
        currentAudio = null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make hack sequence function global
window.beginHackSequence = beginHackSequence;

// ========== اتمام بارگذاری ==========
console.log('📋 اسکریپت کاکپیت سینمایی بارگذاری شد');
console.log('🗺️ توابع نقشه GPS آماده است');
console.log('🧪 برای تست دستی: testFileUpload() یا forceFileClick()');
console.log('🔴 سکانس هک جدید آماده است - beginHackSequence()');
