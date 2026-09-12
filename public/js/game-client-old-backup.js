/**
 * GAME CLIENT - CINEMATIC DATA STREAM VERSION
 * Complete user-side chat functionality with evidence system
 * Supports image zoom, proper message alignment, and real-time communication
 */

// ========== GLOBAL VARIABLES ==========
let socket;
let stream;
let evidenceWall;
let messageInput;
let fileInput;
let fileButton;
let sendButton;
let isTyping = false;
let evidenceCount = 0;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Game Client initializing...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Initialize Socket.IO connection
    initializeSocket();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ Game Client initialized successfully');
});

function initializeDOMElements() {
    stream = document.getElementById('stream');
    evidenceWall = document.getElementById('evidence-wall');
    messageInput = document.getElementById('input');
    fileInput = document.getElementById('file-input');
    fileButton = document.getElementById('file-button');
    sendButton = document.getElementById('send-button');
}

function initializeSocket() {
    // Connect to Socket.IO server
    socket = io({
        query: {
            userId: userId,
            username: username
        }
    });

    // Socket event listeners
    socket.on('connect', () => {
        console.log('🔗 Connected to Command Center');
        addSystemLine('[CONNECTED] Link to Command Center established');
        socket.emit('join_room', { userId: userId });
    });

    socket.on('disconnect', () => {
        console.log('❌ Connection lost');
        addSystemLine('[ERROR] Connection to Command Center lost');
    });

    // Handle chat history
    socket.on('chat_history', (messages) => {
        console.log('📜 Loading data stream history:', messages.length, 'entries');
        
        if (messages && messages.length > 0) {
            // Clear initial messages
            if (stream) {
                stream.innerHTML = '';
            }
            
            // Display history instantly (no typing animation)
            messages.forEach(message => {
                displayInstantMessage(message);
            });
        }
        
        // Add typing caret
        addTypingCaret();
    });

    // Handle new messages
    socket.on('new_message', (messageData) => {
        console.log('💬 New data received:', messageData);
        displayTypedMessage(messageData);
    });

    // Handle evidence extraction
    socket.on('evidence_extracted', (evidenceData) => {
        console.log('🔮 Evidence extraction initiated:', evidenceData);
        handleEvidenceExtraction(evidenceData);
    });

    // Handle phase changes
    socket.on('phase_changed', (phaseData) => {
        console.log('🎯 Phase transition detected:', phaseData);
        handlePhaseChange(phaseData);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        addSystemLine('[ERROR] Failed to establish connection');
    });
}

function setupEventListeners() {
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // File upload
    fileButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileUpload);
}

// ========== MESSAGE DISPLAY FUNCTIONS ==========
function displayInstantMessage(messageData) {
    const messageElement = createMessageElement(messageData);
    stream.appendChild(messageElement);
    scrollToBottom();
}

async function displayTypedMessage(messageData) {
    if (isTyping) return; // Prevent overlapping animations
    
    removeTypingCaret();
    
    // Check if this is an evidence message
    if (isEvidenceMessage(messageData.content)) {
        playEvidenceSound();
    }
    
    const messageElement = createMessageElement(messageData, true);
    stream.appendChild(messageElement);
    
    // Type the message content
    const contentElement = messageElement.querySelector('.message-content');
    const originalContent = contentElement.innerHTML;
    contentElement.innerHTML = '';
    
    await typeLine(contentElement, originalContent);
    
    // Add evidence pulse if needed
    if (isEvidenceMessage(messageData.content)) {
        messageElement.classList.add('evidence-pulse');
        setTimeout(() => {
            messageElement.classList.remove('evidence-pulse');
        }, 3000);
    }
    
    addTypingCaret();
    scrollToBottom();
}

function createMessageElement(messageData, withTyping = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `stream-line ${getSenderClass(messageData.sender_type)}`;
    
    if (withTyping) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(-20px)';
    }
    
    const timestamp = new Date(messageData.timestamp).toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const senderPrefix = getSenderPrefix(messageData.sender_type);
    let content = messageData.content;
    
    // Handle file messages
    if (messageData.file_url) {
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            content = `<img src="${messageData.file_url}" alt="Evidence Image" class="message-image" onclick="openImageModal('${messageData.file_url}')" style="max-width: 300px; border-radius: 8px; cursor: pointer; margin: 5px 0; display: block;">`;
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            content = `<video src="${messageData.file_url}" controls class="message-video" onclick="openImageModal('${messageData.file_url}')" style="max-width: 300px; border-radius: 8px; cursor: pointer; margin: 5px 0; display: block;">Your browser does not support video playback.</video>`;
        } else {
            content = `<a href="${messageData.file_url}" target="_blank" class="file-link">📎 ${messageData.content || 'File Attachment'}</a>`;
        }
    }
    
    messageElement.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="sender">${senderPrefix}</span>
        <span class="message-content">${content}</span>
    `;
    
    if (withTyping) {
        // Trigger slide-in animation
        setTimeout(() => {
            messageElement.style.transition = 'all 0.3s ease';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateX(0)';
        }, 10);
    }
    
    return messageElement;
}

function getSenderClass(senderType) {
    const classes = {
        'user': 'user-message',
        'admin': 'admin-message',
        'detective': 'detective-message',
        'hacker': 'hacker-message'
    };
    return classes[senderType] || 'system-message';
}

function getSenderPrefix(senderType) {
    const prefixes = {
        'user': '[USER]',
        'admin': '[HQ-ADMIN]',
        'detective': '[DETECTIVE]',
        'hacker': '[UNKNOWN]'
    };
    return prefixes[senderType] || '[SYSTEM]';
}

async function typeLine(element, text) {
    isTyping = true;
    
    // Handle HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    
    if (tempDiv.querySelector('img, a')) {
        // If it contains HTML elements, display instantly
        element.innerHTML = text;
    } else {
        // Type character by character for text
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        element.textContent = '';
        
        for (let i = 0; i < plainText.length; i++) {
            element.textContent += plainText[i];
            await new Promise(resolve => setTimeout(resolve, 30)); // 30ms per character
        }
    }
    
    isTyping = false;
}

function addTypingCaret() {
    removeTypingCaret(); // Remove any existing caret
    
    const caretElement = document.createElement('div');
    caretElement.className = 'typing-caret';
    caretElement.innerHTML = '<span class="caret-blink">▋</span>';
    stream.appendChild(caretElement);
}

function removeTypingCaret() {
    const existingCaret = stream.querySelector('.typing-caret');
    if (existingCaret) {
        existingCaret.remove();
    }
}

function addSystemLine(message) {
    const systemElement = document.createElement('div');
    systemElement.className = 'stream-line system-message';
    
    const timestamp = new Date().toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    systemElement.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="sender">[SYSTEM]</span>
        <span class="message-content">${message}</span>
    `;
    
    stream.appendChild(systemElement);
    scrollToBottom();
}

function scrollToBottom() {
    if (stream) {
        stream.scrollTop = stream.scrollHeight;
    }
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
}

// ========== MESSAGE SENDING ==========
function sendMessage() {
    const content = messageInput.value;
    if (!content.trim()) return;
    
    console.log('📤 Sending message:', content);
    
    const messageData = {
        userId: userId,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('user_message', messageData);
    
    // Clear input
    messageInput.value = '';
    autoResizeTextarea();
    
    // Focus back to input
    messageInput.focus();
}

function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;
    
    console.log('📎 Uploading file:', file.name);
    
    // Show upload indicator
    addSystemLine(`[UPLOADING] ${file.name}...`);
    
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
            addSystemLine('[UPLOADED] File transmitted successfully');
        } else {
            console.error('❌ File upload failed:', data.error);
            addSystemLine('[ERROR] File transmission failed');
        }
        
        // Clear file input
        fileInput.value = '';
    })
    .catch(error => {
        console.error('❌ File upload error:', error);
        addSystemLine('[ERROR] File transmission error');
        fileInput.value = '';
    });
}

// ========== EVIDENCE SYSTEM ==========
function isEvidenceMessage(content) {
    const evidenceKeywords = [
        '[EVIDENCE DETECTED]', 'EVIDENCE:', 'CLUE FOUND:', 'DISCOVERY:',
        'ANOMALY DETECTED:', 'BREAKTHROUGH:', 'CRITICAL FINDING:'
    ];
    return evidenceKeywords.some(keyword => content.includes(keyword));
}

function handleEvidenceExtraction(evidenceData) {
    console.log('🔮 Processing evidence extraction:', evidenceData);
    
    // Find the source message
    const sourceMessage = stream.querySelector(`[data-message-id="${evidenceData.messageId}"]`);
    
    if (sourceMessage) {
        // Create extraction beam animation
        createExtractionBeam(sourceMessage, evidenceWall);
    }
    
    // Add evidence card to wall
    setTimeout(() => {
        addEvidenceCard(evidenceData);
        playExtractionSound();
    }, 1000);
}

async function createExtractionBeam(fromElement, toElement) {
    const beam = document.createElement('div');
    beam.className = 'extraction-beam';
    
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    
    const startX = fromRect.right;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left;
    const endY = toRect.top + toRect.height / 2;
    
    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
    
    beam.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: ${length}px;
        height: 3px;
        background: linear-gradient(90deg, #00ffff, #ff00ff);
        transform-origin: 0 50%;
        transform: rotate(${angle}deg);
        z-index: 1000;
        box-shadow: 0 0 10px #00ffff;
        animation: beamPulse 0.5s ease-in-out;
    `;
    
    document.body.appendChild(beam);
    
    // Remove beam after animation
    setTimeout(() => {
        beam.remove();
    }, 500);
}

function addEvidenceCard(evidenceData) {
    evidenceCount++;
    
    const card = document.createElement('div');
    card.className = 'evidence-card holographic';
    card.innerHTML = `
        <div class="card-header">EVIDENCE #${evidenceCount.toString().padStart(3, '0')}</div>
        <div class="card-content">${evidenceData.content}</div>
        <div class="card-footer">${new Date().toLocaleString('fa-IR')}</div>
    `;
    
    card.style.animation = 'cardPop 0.5s ease-out';
    evidenceWall.appendChild(card);
    
    playSuccessSound();
}

// ========== PHASE MANAGEMENT ==========
function handlePhaseChange(phaseData) {
    console.log('🎯 Phase changing to:', phaseData.phase);
    
    // Remove existing phase classes
    document.body.classList.remove('hacker-mode', 'senior-mode');
    
    // Add new phase class
    if (phaseData.phase === 'hacker') {
        document.body.classList.add('hacker-mode');
        addSystemLine('[ALERT] Hacker intrusion detected - System compromised');
    } else if (phaseData.phase === 'senior') {
        document.body.classList.add('senior-mode');
        addSystemLine('[BACKUP] Senior Detective taking control');
    } else {
        addSystemLine('[STATUS] Normal operations restored');
    }
}

// ========== AUDIO FUNCTIONS ==========
function playEvidenceSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not available');
    }
}

function playExtractionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio not available');
    }
}

function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio not available');
    }
}

// ========== IMAGE MODAL FUNCTIONS ==========
function openImageModal(mediaSrc) {
    const modal = document.getElementById('image-modal');
    
    if (modal) {
        // Clear previous content
        modal.innerHTML = '';
        
        // Determine if it's video or image
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
        mediaElement.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.5)';
        mediaElement.style.transition = 'transform 0.3s ease';
        
        // Add zoom functionality
        let scale = 1;
        mediaElement.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            scale = Math.max(0.5, Math.min(3, scale + delta));
            mediaElement.style.transform = `scale(${scale})`;
        });
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '20px';
        closeBtn.style.right = '20px';
        closeBtn.style.background = 'rgba(255, 0, 0, 0.7)';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.width = '40px';
        closeBtn.style.height = '40px';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '2001';
        closeBtn.onclick = closeImageModal;
        
        modal.appendChild(mediaElement);
        modal.appendChild(closeBtn);
        
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modal.style.zIndex = '2000';
        modal.style.backdropFilter = 'blur(10px)';
        
        modalImg.style.maxWidth = '90%';
        modalImg.style.maxHeight = '90%';
        modalImg.style.borderRadius = '10px';
        modalImg.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.5)';
        
        // Close on click outside
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
        modal.innerHTML = ''; // Clear content
    }
}

// Make functions globally accessible
window.openImageModal = openImageModal;

// Auto-reconnect functionality
socket.on('reconnect', () => {
    console.log('🔄 Reconnected to Command Center');
    addSystemLine('[RECONNECTED] Connection restored');
});

console.log('📋 Game Client Script Loaded Successfully');
