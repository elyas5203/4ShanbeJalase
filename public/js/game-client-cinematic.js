// ========== CINEMATIC GAME CLIENT ==========
// Enhanced with Data Stream Cards, Holographic Evidence Wall, and Particle Extraction

console.log('🎬 Cinematic Game Client Loading...');

// ========== GLOBAL VARIABLES ==========
let socket;
let messageCounter = 0;
let evidenceCounter = 0;

// DOM Elements
let messagesContainer;
let evidenceWall;
let messageInput;
let sendButton;
let fileInput;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Cinematic Interface...');
    
    // Initialize DOM elements
    messagesContainer = document.getElementById('messages');
    evidenceWall = document.getElementById('evidence-wall');
    messageInput = document.getElementById('input');
    sendButton = document.getElementById('send-button');
    fileInput = document.getElementById('file-input');
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Setup event listeners
    setupEventListeners();
    
    // Auto-resize textarea
    setupTextareaResize();
    
    console.log('✅ Cinematic Interface Initialized');
});

// ========== SOCKET.IO INITIALIZATION ==========
function initializeSocket() {
    socket = io({
        query: {
            userId: userId,
            username: username
        }
    });
    
    socket.on('connect', () => {
        console.log('🔗 Connected to Command Center');
        addSystemMessage('اتصال به مرکز فرماندهی برقرار شد', 'success');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from Command Center');
        addSystemMessage('اتصال قطع شد', 'error');
    });
    
    socket.on('new_message', (messageData) => {
        console.log('📨 New message received:', messageData);
        displayDataCard(messageData);
    });
    
    socket.on('evidence_extracted', (evidenceData) => {
        console.log('🔍 Evidence extraction triggered:', evidenceData);
        triggerExtractionAnimation(evidenceData);
    });
    
    socket.on('reconnect', () => {
        console.log('🔄 Reconnected to Command Center');
        addSystemMessage('اتصال مجدد برقرار شد', 'success');
    });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Send button
    sendButton.addEventListener('click', sendMessage);
    
    // Enter key handling
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // File upload
    fileInput.addEventListener('change', handleFileUpload);
}

function setupTextareaResize() {
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

// ========== DATA CARD CREATION (Prototype 1) ==========
function displayDataCard(messageData) {
    messageCounter++;
    
    const cardElement = document.createElement('div');
    cardElement.className = 'data-card';
    cardElement.id = `card-${messageCounter}`;
    
    // Determine sender type and icon
    const senderInfo = getSenderInfo(messageData.sender_type);
    
    // Create card content
    let content = messageData.content;
    
    // Handle file messages
    if (messageData.file_url) {
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            content = `<img src="${messageData.file_url}" alt="Evidence" style="max-width: 100%; border-radius: 8px; cursor: pointer; margin: 8px 0;" onclick="openImageModal('${messageData.file_url}')">`;
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            content = `<video src="${messageData.file_url}" controls style="max-width: 100%; border-radius: 8px; margin: 8px 0;">Your browser does not support video playback.</video>`;
        } else {
            content = `<a href="${messageData.file_url}" target="_blank" style="color: #6cf1ff;">📎 ${messageData.content || 'File Attachment'}</a>`;
        }
    }
    
    const timestamp = new Date(messageData.timestamp).toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    cardElement.innerHTML = `
        <div class="reveal-mask"></div>
        
        <div class="build-line"></div>
        
        <div class="card-row">
            <div class="type-icon">${senderInfo.icon}</div>
            <div class="meta">
                <span>${senderInfo.type} • Hash: ${generateHash()}</span>
                <span>Source: ${senderInfo.source} • ${timestamp}</span>
            </div>
        </div>
        
        <div class="card-line" style="margin: 8px 0;"></div>
        
        <div class="card-row">
            <div class="card-text">${content}</div>
        </div>
        
        ${messageData.sender_type !== 'user' ? `
        <div class="card-row">
            <div class="card-text" style="font-size: 12px; color: #9fb6d6;">
                Confidence: ${(Math.random() * 0.3 + 0.7).toFixed(2)} — Signal strength: ${Math.floor(Math.random() * 30 + 70)}%
            </div>
        </div>
        ` : ''}
    `;
    
    messagesContainer.appendChild(cardElement);
    
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add hover parallax effect
    addCardHoverEffect(cardElement);
    
    // Check if this should trigger evidence extraction
    if (messageData.sender_type !== 'user' && Math.random() > 0.7) {
        setTimeout(() => {
            triggerExtractionAnimation({
                sourceCard: cardElement,
                evidenceData: messageData
            });
        }, 2000);
    }
}

// ========== HOLOGRAPHIC EVIDENCE CARD (Prototype 2) ==========
function createHolographicCard(evidenceData) {
    evidenceCounter++;
    
    const holoCard = document.createElement('div');
    holoCard.className = 'holo-card';
    holoCard.id = `evidence-${evidenceCounter}`;
    
    const evidenceType = getEvidenceType(evidenceData);
    
    holoCard.innerHTML = `
        <div class="glare"></div>
        <div class="holo-content">
            <div class="holo-tag">${evidenceType.tag}</div>
            <div class="holo-title">${evidenceType.title}</div>
            <div class="holo-meta">${evidenceType.meta}</div>
        </div>
    `;
    
    evidenceWall.appendChild(holoCard);
    
    // Add holographic tilt effect
    addHolographicEffect(holoCard);
    
    return holoCard;
}

// ========== PARTICLE EXTRACTION ANIMATION (Prototype 3) ==========
function triggerExtractionAnimation(data) {
    const sourceCard = data.sourceCard;
    const targetCard = createHolographicCard(data.evidenceData);
    
    console.log('🎆 Starting extraction animation...');
    
    // Create particles
    const particles = createParticles(sourceCard, 120);
    
    // Cinematic build-up
    gsap.to(sourceCard, { 
        duration: 0.25, 
        scale: 0.98, 
        opacity: 0.85, 
        boxShadow: "0 10px 50px rgba(0,0,0,0.55)" 
    });
    
    // Subtle shake effect
    gsap.fromTo(sourceCard, 
        { x: -0.5, y: 0.5 }, 
        { x: 0.5, y: -0.5, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }
    );
    
    // Pre-flight glow on target
    gsap.to(targetCard, { 
        duration: 0.25, 
        opacity: 0.2, 
        scale: 0.96 
    });
    
    // Animate particles
    animateParticles(particles, sourceCard, targetCard);
    
    // Target rebuild with holographic shimmer
    gsap.delayedCall(1.2, () => {
        gsap.to(targetCard, {
            opacity: 1,
            scale: 1,
            duration: 0.45,
            ease: "back.out(1.6)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.7)"
        });
        
        // Holographic shimmer effect
        gsap.fromTo(targetCard, 
            { filter: "brightness(1) saturate(1)" }, 
            { filter: "brightness(1.15) saturate(1.08)", yoyo: true, repeat: 1, duration: 0.6 }
        );
    });
    
    // Dim source card after extraction
    gsap.delayedCall(1.0, () => {
        gsap.to(sourceCard, { opacity: 0.35, duration: 0.4 });
    });
}

function createParticles(sourceElement, count = 120) {
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

function animateParticles(particles, sourceEl, targetEl) {
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    
    particles.forEach((particle, i) => {
        const angle = Math.random() * Math.PI * 2;
        const spread = 18 + Math.random() * 28;
        const midX = parseFloat(particle.style.left) + Math.cos(angle) * spread;
        const midY = parseFloat(particle.style.top) + Math.sin(angle) * spread;
        
        const targetX = targetRect.left + 20 + Math.random() * (targetRect.width - 40);
        const targetY = targetRect.top + 20 + Math.random() * (targetRect.height - 40);
        
        const duration = 0.6 + Math.random() * 0.35;
        const delay = 0.08 + (i % 20) * 0.006;
        
        gsap.timeline()
            .set(particle, { opacity: 0 })
            .to(particle, { opacity: 1, duration: 0.18, ease: "power2.out" }, 0)
            .to(particle, { 
                x: midX - parseFloat(particle.style.left), 
                y: midY - parseFloat(particle.style.top), 
                scale: 0.9, 
                duration: 0.22, 
                ease: "power2.out" 
            }, 0.05 + delay)
            .to(particle, {
                x: targetX - parseFloat(particle.style.left),
                y: targetY - parseFloat(particle.style.top),
                scale: 0.6,
                opacity: 0.9,
                duration: duration,
                ease: "power3.inOut"
            }, 0.28 + delay)
            .to(particle, { opacity: 0, duration: 0.2 }, duration + 0.4 + delay)
            .add(() => particle.remove(), duration + 0.65 + delay);
    });
}

// ========== INTERACTIVE EFFECTS ==========
function addCardHoverEffect(cardElement) {
    cardElement.addEventListener('mousemove', (e) => {
        const rect = cardElement.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        cardElement.style.transform = `translateY(0) scale(1) rotateX(${-y * 2}deg) rotateY(${x * 2}deg)`;
    });
    
    cardElement.addEventListener('mouseleave', () => {
        cardElement.style.transform = `translateY(0) scale(1) rotateX(0deg) rotateY(0deg)`;
    });
}

function addHolographicEffect(holoElement) {
    const glare = holoElement.querySelector('.glare');
    
    let px = 0, py = 0, rx = 0, ry = 0;
    const damp = (from, to, k = 0.12) => from + (to - from) * k;
    
    function onMove(e) {
        const bounds = holoElement.getBoundingClientRect();
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
        glare.style.opacity = 0.6;
    }
    
    function tick() {
        ry = damp(ry, px * 12);
        rx = damp(rx, -py * 10);
        holoElement.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg)`;
        requestAnimationFrame(tick);
    }
    
    tick();
    holoElement.addEventListener('mousemove', onMove);
    holoElement.addEventListener('mouseleave', onLeave);
}

// ========== MESSAGE HANDLING ==========
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    console.log('📤 Sending message:', message);
    
    socket.emit('user_message', {
        userId: userId,
        content: message,
        timestamp: new Date().toISOString()
    });
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;
    
    console.log('📎 Uploading file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('senderType', 'user');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ File uploaded successfully');
        } else {
            console.error('❌ File upload failed:', data.error);
            addSystemMessage('خطا در آپلود فایل', 'error');
        }
    })
    .catch(error => {
        console.error('❌ File upload error:', error);
        addSystemMessage('خطا در آپلود فایل', 'error');
    });
    
    fileInput.value = '';
}

// ========== UTILITY FUNCTIONS ==========
function getSenderInfo(senderType) {
    const senderMap = {
        'user': { icon: 'U', type: 'User Signal', source: 'Terminal-Alpha' },
        'detective': { icon: 'D', type: 'Detective', source: 'HQ-Command' },
        'hacker': { icon: 'H', type: 'Hacker', source: 'Unknown-Node' },
        'admin': { icon: 'A', type: 'Admin', source: 'Control-Center' }
    };
    return senderMap[senderType] || senderMap['user'];
}

function getEvidenceType(messageData) {
    const types = [
        { tag: 'EVIDENCE • CLASS-ALPHA', title: 'Signal Intercept', meta: 'Node: AR-Dome • Confidence: 0.94' },
        { tag: 'EVIDENCE • CLASS-BETA', title: 'Data Fragment', meta: 'Source: Deep-Scan • Integrity: 0.87' },
        { tag: 'EVIDENCE • CLASS-GAMMA', title: 'Trace Analysis', meta: 'Pattern: Anomalous • Match: 0.91' }
    ];
    return types[Math.floor(Math.random() * types.length)];
}

function generateHash() {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
        if (i === 1) result += '-';
    }
    return result;
}

function addSystemMessage(message, type = 'info') {
    const systemCard = document.createElement('div');
    systemCard.className = 'data-card';
    systemCard.style.opacity = '0.7';
    
    const color = type === 'success' ? '#66ffcc' : type === 'error' ? '#ff6666' : '#6cf1ff';
    
    systemCard.innerHTML = `
        <div class="card-row">
            <div class="type-icon" style="background: linear-gradient(135deg, ${color}33, ${color}11);">S</div>
            <div class="meta">
                <span>System • Status: ${type.toUpperCase()}</span>
            </div>
        </div>
        <div class="card-line" style="margin: 8px 0;"></div>
        <div class="card-row">
            <div class="card-text">${message}</div>
        </div>
    `;
    
    messagesContainer.appendChild(systemCard);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ========== IMAGE MODAL ==========
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
        mediaElement.style.boxShadow = '0 0 30px rgba(108, 241, 255, 0.5)';
        mediaElement.style.transition = 'transform 0.3s ease';
        
        // Add zoom functionality
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

// Make functions globally accessible
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

console.log('🎬 Cinematic Game Client Loaded Successfully');
