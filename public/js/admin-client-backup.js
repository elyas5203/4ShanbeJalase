// Admin Panel Client-side JavaScript
// Real-time chat management for detectives/admins

// Initialize Socket.IO connection with admin flag
const socket = io({ query: { isAdmin: true } });

// Global variables
let selectedUserId = null;
let selectedUsername = '';
let chatMessages = null;
let userList = null;
let messageInput = null;
let sendButton = null;
let senderTypeSelect = null;
let adminFileInput = null;
let adminFileButton = null;
let selectedUserDisplay = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    userList = document.getElementById('user-list');
    messageInput = document.getElementById('admin-message-input');
    sendButton = document.getElementById('send-admin-message');
    senderTypeSelect = document.getElementById('sender-type');
    adminFileInput = document.getElementById('admin-file-input');
    adminFileButton = document.getElementById('admin-file-button');
    selectedUserDisplay = document.getElementById('selected-user');
    chatMessages = document.getElementById('chat-messages');
});

// Handle user list clicks
userList.addEventListener('click', (e) => {
    const userItem = e.target.closest('.user-item');
    if (userItem) {
        // Remove previous selection
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select current user
        userItem.classList.add('selected');
        selectedUserId = userItem.dataset.userid;
        selectedUsername = userItem.dataset.username;
        
        // Update selected user display
        selectedUserDisplay.textContent = `چت با: ${selectedUsername}`;
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Load chat history for selected user
        socket.emit('load_chat_history', selectedUserId);
    }
});

// Handle send message button
sendButton.addEventListener('click', () => {
    sendAdminMessage();
});

// File upload functionality for admin
adminFileButton.addEventListener('click', () => {
    adminFileInput.click();
});

adminFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedUserId) {
        alert('لطفاً ابتدا یک کاربر را انتخاب کنید');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            const senderType = senderTypeSelect.value;
            
            // Send file URL as message
            socket.emit('admin_message', {
                targetUserId: selectedUserId,
                content: result.fileUrl,
                senderType: senderType
            });
        } else {
            alert('خطا در آپلود فایل: ' + result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('خطا در آپلود فایل');
    }

    // Clear file input
    adminFileInput.value = '';
});

// Function to send admin message
function sendAdminMessage() {
    if (!selectedUserId) {
        alert('لطفاً ابتدا یک کاربر را انتخاب کنید');
        return;
    }
    
    const messageContent = messageInput.value.trim();
    const senderType = senderTypeSelect.value;
    
    if (messageContent === '') {
        return;
    }
    
    // Send message to server
    socket.emit('admin_message', {
        targetUserId: selectedUserId,
        content: messageContent,
        senderType: senderType
    });
    
    // Clear textarea and reset height
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

// Listen for chat history from server
socket.on('chat_history', (messages) => {
    chatMessages.innerHTML = '';
    messages.forEach(message => {
        displayAdminMessage(message);
    });
    scrollToBottom();
});

// Listen for new messages
socket.on('new_message', (messageData) => {
    // Only display if it's for the currently selected user
    if (messageData.user_id == selectedUserId) {
        displayAdminMessage(messageData);
        scrollToBottom();
    }
});

// Function to display a message in admin chat
function displayAdminMessage(messageData) {
    const messageElement = document.createElement('div');
    messageElement.className = `admin-message ${messageData.sender_type}`;
    
    const timestamp = new Date(messageData.timestamp).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let senderName = '';
    let senderIcon = '';
    switch(messageData.sender_type) {
        case 'user':
            senderName = selectedUsername;
            senderIcon = '👤';
            break;
        case 'detective':
            senderName = 'کارآگاه';
            senderIcon = '🕵️';
            break;
        case 'hacker':
            senderName = 'هکر';
            senderIcon = '💀';
            break;
        case 'admin':
            senderName = 'کارآگاه ارشد';
            senderIcon = '👨‍💼';
            break;
    }
    
    // Check if content is a file URL
    let contentHtml = '';
    const content = messageData.content;
    
    // Check if content starts with /uploads/ (uploaded file)
    if (content.startsWith('/uploads/')) {
        // Check for image files
        if (content.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            contentHtml = `<img src="${content}" alt="تصویر ارسالی" class="chat-image" onclick="openImageModal('${content}')">`;
        }
        // Check for video files
        else if (content.match(/\.(mp4|webm|ogg)$/i)) {
            contentHtml = `<video controls class="chat-video">
                            <source src="${content}" type="video/mp4">
                            ویدیو قابل نمایش نیست
                          </video>`;
        }
        // Other file types
        else {
            const fileName = content.split('/').pop();
            contentHtml = `<a href="${content}" download class="file-download">📎 ${fileName}</a>`;
        }
    }
    // Regular text message
    else {
        contentHtml = content;
    }

    messageElement.innerHTML = `
        <div class="admin-message-header">
            <span class="sender-info">
                <span class="sender-icon">${senderIcon}</span>
                <span class="sender-name">${senderName}</span>
            </span>
            <span class="message-time">${timestamp}</span>
        </div>
        <div class="admin-message-content">${contentHtml}</div>
    `;
    
    chatMessages.appendChild(messageElement);
}

// Function to scroll chat to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Image modal functionality
function openImageModal(imageSrc) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <img id="modal-image" src="" alt="تصویر بزرگ">
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal when clicking X or outside
        modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }
    
    // Show modal with image
    document.getElementById('modal-image').src = imageSrc;
    modal.style.display = 'block';
}

// Handle connection errors
socket.on('connect_error', (error) => {
    console.error('Admin connection error:', error);
});

socket.on('disconnect', () => {
    console.log('Admin disconnected from server');
});

// Update user status indicators (for future use)
socket.on('user_status_update', (data) => {
    const userItem = document.querySelector(`[data-userid="${data.userId}"]`);
    if (userItem) {
        const statusIndicator = userItem.querySelector('.user-status');
        if (statusIndicator) {
            statusIndicator.className = `user-status ${data.status}`;
        }
    }
});
 // End of DOMContentLoaded
