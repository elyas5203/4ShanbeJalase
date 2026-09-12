// Admin Panel Client-side JavaScript
// Real-time chat management for detectives/admins

// Initialize Socket.IO connection with admin flag
const socket = io({ query: { isAdmin: true } });

// Global variables
let selectedUserId = null;
let selectedUsername = '';

// Connect to admin room when socket connects
socket.on('connect', () => {
    console.log('Admin connected to server');
});

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const messageInput = document.getElementById('admin-message-input');
    const sendButton = document.getElementById('send-admin-message');
    const senderTypeSelect = document.getElementById('sender-type');
    const adminFileInput = document.getElementById('admin-file-input');
    const adminFileButton = document.getElementById('admin-file-button');
    const selectedUserDisplay = document.getElementById('selected-user');
    const chatMessages = document.getElementById('chat-messages');
    
    // Add user functionality
    const newUsernameInput = document.getElementById('new-username');
    const addUserBtn = document.getElementById('add-user-btn');
    
    addUserBtn.addEventListener('click', addNewUser);
    newUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewUser();
        }
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
    
    // Function to add new user
    async function addNewUser() {
        const username = newUsernameInput.value.trim();
        
        if (!username) {
            alert('لطفاً نام کاربری را وارد کنید');
            return;
        }
        
        try {
            const response = await fetch('/admin/add-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('کاربر با موفقیت اضافه شد');
                newUsernameInput.value = '';
                // Refresh user list
                socket.emit('get_user_list');
            } else {
                alert('خطا: ' + result.error);
            }
        } catch (error) {
            console.error('Error adding user:', error);
            alert('خطا در اضافه کردن کاربر');
        }
    }

    // Function to send admin message
    function sendAdminMessage() {
        if (!selectedUserId) {
            alert('لطفاً ابتدا یک کاربر را انتخاب کنید');
            return;
        }
        
        const messageContent = messageInput.value.trim();
        const senderType = senderTypeSelect.value;
        
        if (messageContent !== '') {
            // Send message to server
            socket.emit('admin_message', {
                targetUserId: selectedUserId,
                content: messageContent,
                senderType: senderType
            });
            
            // Clear input
            messageInput.value = '';
        }
    }
});

// Socket event listeners (outside DOMContentLoaded)
socket.on('user_list', (users) => {
    const userList = document.getElementById('user-list');
    if (!userList) return;
    
    userList.innerHTML = '';
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.dataset.userid = user.id;
        userItem.dataset.username = user.username;
        userItem.innerHTML = `
            <div class="user-info">
                <span class="user-name">${user.username}</span>
                <span class="user-status online"></span>
            </div>
        `;
        userList.appendChild(userItem);
    });
});

// Listen for chat history
socket.on('chat_history', (messages) => {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
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
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
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
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
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
