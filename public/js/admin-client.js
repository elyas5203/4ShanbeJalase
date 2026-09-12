/**
 * ADMIN PANEL CLIENT - FINAL PROFESSIONAL VERSION
 * Complete rewrite with collapsible sidebar functionality
 * Supports desktop and mobile responsive design
 */

// ========== GLOBAL VARIABLES ==========
let socket;
let currentUserId = null;
let currentUsername = null;
let users = [];
let studentsCache = [];
let isSidebarOpen = false;
let currentPhase = 'normal';
let currentSenderType = 'detective';
// Per-user input drafts to avoid accidental cross-send
let messageDrafts = {};
// Students management elements
let studentClassIdInput, studentNameInput, studentPhotoInput, studentIdHidden;
let studentsLoadBtn, studentSaveBtn, studentClearBtn, studentsListEl;

// DOM Elements
let sidebarToggle;
let sidebar;
let usersList;
let messagesContainer;
let messageInput;
let sendButton;
let fileInput;
let chatInfo;
let imageModal;
let modalImage;
let closeModal;
let phaseSelector;
let currentCharacterSpan;
// Student modal DOM
let studentModalOverlay, studentModalPhoto, studentModalClose, studentSelector;
// Validation queue DOM
let validationQueueEl;

// Canned Responses Elements
let cannedResponsesBtn;
let cannedResponsesModal;
let cannedModalClose;
let responsesList;
let addResponseForm;
let newResponseName;
let newResponseContent;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Panel initializing...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Initialize Socket.IO connection
    initializeSocket();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize sidebar state based on screen size
    initializeSidebarState();
    
    // Initialize character display
    updateCharacterDisplay();
    
    // Load preloaded files
    loadPreloadedFiles();
    
    // Load canned responses
    loadCannedResponses();
    
    // تست manual برای نوتیفیکیشن (فقط برای debug)
    setTimeout(() => {
        console.log('🧪 Testing notification system...');
        if (users.length > 0) {
            const testUserId = users[0].id;
            console.log('🧪 Simulating notification for user:', testUserId);
            handleUnreadCountUpdate({
                userId: testUserId,
                username: users[0].username,
                unreadCount: 5
            });
        }

// ========== Identity Validation Notification (Simple Counter) ==========
(function(){
  if (typeof document === 'undefined') return;
  try {
    const countEl = document.getElementById('dossier-count');
    if (!countEl) return;
    let count = 0;

    const setCount = () => { countEl.textContent = String(Math.max(0, count)); };
    setCount();

    function onNewRequest(payload){
      try {
        count += 1;
        setCount();
      } catch(_) {}
    }

    function onRequestProcessed(){
      try {
        count -= 1;
        setCount();
      } catch(_) {}
    }

    if (socket) {
      socket.on('new_validation_request', onNewRequest);
      socket.on('request_processed', onRequestProcessed);
    }
  } catch (e) {
    console.warn('⚠️ Simple dossier counter failed:', e);
  }
})();

// ========== STUDENTS MANAGEMENT ==========
async function loadStudentsList(classId) {
    try {
        const qp = classId ? `?classId=${encodeURIComponent(classId)}` : '';
        const res = await fetch(`/api/students${qp}`);
        const data = await res.json();
        const students = Array.isArray(data.students) ? data.students : [];
        studentsCache = students;
        renderStudentsList(students);
    } catch (e) {
        console.error('❌ خطا در دریافت لیست دانش‌آموزان:', e);
        if (studentsListEl) studentsListEl.innerHTML = '<div style="color:#f66;">خطا در دریافت لیست</div>';
    }
}

function renderStudentsList(students) {
    if (!studentsListEl) return;
    if (!students || students.length === 0) {
        studentsListEl.innerHTML = '<div style="font-size:12px; opacity:.7;">لیست خالی است</div>';
        return;
    }
    studentsListEl.innerHTML = '';
    students.forEach(s => {
        const card = document.createElement('div');
        card.className = 'student-card';
        const imgSrc = s.photo ? `/assets/students/${s.photo}` : '/assets/students/default.png';
        card.innerHTML = `
            <img class="student-thumb" src="${imgSrc}" alt="${s.name || ''}" onerror="this.src='/assets/students/default.png'" />
            <div class="student-name">${s.name || 'بدون نام'}</div>
            <div class="student-class">کلاس: ${s.classId || '—'}</div>
            <div class="student-actions">
                <button data-action="edit-student" data-id="${s.id}" data-name="${s.name || ''}" data-photo="${s.photo || ''}" data-classid="${s.classId || ''}">✏️ ویرایش</button>
                <button data-action="delete-student" data-id="${s.id}">🗑 حذف</button>
            </div>
        `;
        // کلیک روی کارت فرم را پر کند (بدون modal)
        card.addEventListener('click', () => fillStudentForm({ id: s.id, name: s.name, photo: s.photo, classId: s.classId }));
        const img = card.querySelector('.student-thumb');
        if (img) img.addEventListener('click', (ev) => { ev.stopPropagation(); try { openImageZoom(imgSrc); } catch(_) {} });
        studentsListEl.appendChild(card);
    });
}

function fillStudentForm({ id, name, photo, classId }) {
    if (studentIdHidden) studentIdHidden.value = id || '';
    if (studentNameInput) studentNameInput.value = name || '';
    if (studentPhotoInput) studentPhotoInput.value = photo || '';
    if (studentClassIdInput && classId) studentClassIdInput.value = classId;
}

function clearStudentForm() {
    if (studentIdHidden) studentIdHidden.value = '';
    if (studentNameInput) studentNameInput.value = '';
    if (studentPhotoInput) studentPhotoInput.value = '';
    // کلاس را خالی نکن تا فیلتر حفظ شود
}

async function saveStudent() {
    const name = studentNameInput ? studentNameInput.value.trim() : '';
    const photo = studentPhotoInput ? studentPhotoInput.value.trim() : '';
    const classId = studentClassIdInput ? studentClassIdInput.value.trim() : '';
    const id = studentIdHidden ? studentIdHidden.value : '';
    if (!name) {
        alert('نام دانش‌آموز را وارد کنید');
        return;
    }
    try {
        const res = await fetch('/api/admin/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id || undefined, name, photo, classId: classId || null })
        });
        const data = await res.json();
        if (data && data.success) {
            // بعد از ذخیره موفق، فرم را برای افزودن سریع نفرات بعدی خالی کن (classId حفظ می‌شود)
            clearStudentForm();
            await loadStudentsList(classId);
            alert('✅ ذخیره شد');
        } else {
            alert('❌ خطا در ذخیره');
        }
    } catch (e) {
        console.error('❌ خطا در ذخیره دانش‌آموز:', e);
        alert('❌ خطای شبکه/سرور');
    }
}

async function deleteStudent(id) {
    if (!id) return;
    try {
        const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data && data.success) {
            await loadStudentsList(studentClassIdInput ? studentClassIdInput.value.trim() : '');
        } else {
            alert('❌ حذف ناموفق');
        }
    } catch (e) {
        console.error('❌ خطا در حذف:', e);
        alert('❌ خطای شبکه/سرور');
    }
}
    }, 3000);
    
    console.log('✅ Admin Panel initialized successfully');
});

function initializeDOMElements() {
    sidebarToggle = document.getElementById('sidebar-toggle');
    sidebar = document.getElementById('admin-sidebar');
    usersList = document.getElementById('users-list');
    messagesContainer = document.getElementById('messages');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-button');
    fileInput = document.getElementById('file-input');
    chatInfo = document.getElementById('chat-info');
    imageModal = document.getElementById('image-modal');
    modalImage = document.getElementById('modal-image');
    closeModal = document.querySelector('.close-modal');
    phaseSelector = document.getElementById('phase-selector');
    currentCharacterSpan = document.getElementById('current-character');
    
    // Canned Responses Elements
    cannedResponsesBtn = document.getElementById('canned-responses-btn');
    cannedResponsesModal = document.getElementById('canned-responses-modal');
    cannedModalClose = document.getElementById('canned-modal-close');
    responsesList = document.getElementById('responses-list');
    addResponseForm = document.getElementById('add-response-form');
    newResponseName = document.getElementById('new-response-name');
    newResponseContent = document.getElementById('new-response-content');
    
    // Students management DOM
    studentClassIdInput = document.getElementById('student-class-id');
    studentNameInput = document.getElementById('student-name');
    studentPhotoInput = document.getElementById('student-photo');
    studentIdHidden = document.getElementById('student-id');
    studentsLoadBtn = document.getElementById('students-load-btn');
    studentSaveBtn = document.getElementById('student-save-btn');
    studentClearBtn = document.getElementById('student-clear-btn');
    studentsListEl = document.getElementById('students-list');
    // Student modal
    studentModalOverlay = document.getElementById('student-modal-overlay');
    studentModalPhoto = document.getElementById('student-modal-photo');
    studentModalClose = document.getElementById('student-modal-close');
    studentSelector = document.getElementById('student-selector');
    validationQueueEl = document.getElementById('validation-queue');
}

function initializeSocket() {
    // Connect to Socket.IO server with admin flag
    socket = io({
        query: {
            isAdmin: true
        }
    });

    // Socket event listeners
    socket.on('connect', () => {
        console.log('🔗 Connected to server as admin');
        requestUsersList();
    });
    
    // Listen for hack sequence confirmation
    socket.on('hack_sequence_initiated', (data) => {
        console.log('📡 دریافت تأیید سکانس هک:', data);
        
        if (data.success) {
            alert(`✅ ${data.message}`);
        } else {
            alert(`❌ ${data.message}`);
            
            // Reset button if failed
            const hackSequenceBtn = document.getElementById('hack-sequence-btn');
            if (hackSequenceBtn) {
                hackSequenceBtn.textContent = '🔴 شروع فاز هک';
                hackSequenceBtn.style.background = 'rgba(255, 0, 0, 0.2)';
                hackSequenceBtn.disabled = false;
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        showSystemMessage('Connection lost. Attempting to reconnect...');
    });

    socket.on('users_list', handleUsersList);
    socket.on('chat_history', handleChatHistory);
    socket.on('new_message', handleNewMessage);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('phase_changed', handlePhaseChanged);
    socket.on('unread_count_update', handleUnreadCountUpdate);
    // Identity validation notifications only (no rendering in sidebar) - ignore legacy event to prevent double count
    socket.on('new_validation_request', (payload) => {
        // intentionally ignored; sidebar count updates via initial_dossiers/new_dossier/dossier_updated
    });
    socket.on('request_processed', ({ userId }) => {
        try { removeValidationRequest(userId); } catch (e) { console.warn('⚠️ removeValidationRequest failed:', e); }
    });
    socket.on('chat_permission_update', (data) => {
        try {
            if (!data || typeof data.userId === 'undefined') return;
            const targetId = Number(data.userId);
            const enabled = !!data.enabled;
            const u = Array.isArray(users) ? users.find(x => Number(x.id) === targetId) : null;
            if (u) u.chat_enabled = enabled ? 1 : 0;
            displayUsersList();
            if (currentUserId && Number(currentUserId) === targetId) {
                updateSelectedUser();
                showSystemMessage(enabled ? '🔓 چت این کاربر هم‌اکنون فعال شد' : '🔒 چت این کاربر هم‌اکنون غیرفعال شد');
            }
        } catch (e) {
            console.warn('⚠️ chat_permission_update handler error:', e);
        }
    });
    socket.on('message_deleted', (payload) => {
        try {
            const id = payload && payload.messageId;
            if (!id) return;
            const el = document.querySelector(`.message-packet[data-message-id="${id}"]`);
            if (el && el.parentElement) el.parentElement.removeChild(el);
        } catch (e) { console.warn('⚠️ message_deleted handler error:', e); }
    });
    socket.on('message_edited', (payload) => {
        try {
            const id = payload && payload.messageId;
            if (!id) return;
            const el = document.querySelector(`.message-packet[data-message-id="${id}"] .packet-content`);
            if (el) el.innerHTML = payload.content || '';
        } catch (e) { console.warn('⚠️ message_edited handler error:', e); }
    });
    
    // تست event listener
    console.log('✅ All Socket.IO event listeners added, including unread_count_update');

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        showSystemMessage('خطا در اتصال. لطفاً صفحه را رفرش کنید.');
    });

    // Auto-reconnect functionality
    socket.on('reconnect', () => {
        console.log('🔄 Reconnected to server');
        showSystemMessage('Reconnected successfully');
        requestUsersList();
        if (currentUserId) {
            loadChatHistory();
        }
    });

    // Hack status reset response (moved here to ensure socket is defined)
    socket.on('hack_status_reset', (data) => {
        console.log('🔄 پاسخ ریست وضعیت هک:', data);
        const resetBtn = document.getElementById('reset-hack-btn');
        if (resetBtn) {
            resetBtn.textContent = '🔄 ریست وضعیت هک';
            resetBtn.disabled = false;
        }
        if (data.success) {
            alert('✅ وضعیت هک کاربر با موفقیت ریست شد');
        } else {
            alert('❌ خطا در ریست کردن وضعیت هک: ' + data.message);
        }
    });

    // دریافت پاسخ افزودن کاربر
    socket.on('user_added_response', function(data) {
        if (data.success) {
            showSystemMessage(`کاربر "${data.username}" با موفقیت اضافه شد`);
            // به‌روزرسانی لیست کاربران
            socket.emit('get_users_list');
        } else {
            alert(`خطا در افزودن کاربر: ${data.message}`);
        }
    });

    // دریافت به‌روزرسانی لیست کاربران
    socket.on('users_list_updated', function(usersList) {
        console.log('🔄 Users list updated:', usersList);
        users = usersList;
        displayUsersList();
    });
}

function setupEventListeners() {
    // Sidebar toggle
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Message sending
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    // Persist draft per user
    messageInput.addEventListener('input', () => {
        try {
            if (!currentUserId) return;
            messageDrafts[String(currentUserId)] = messageInput.value;
        } catch (_) {}
    });
    
    // File upload
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
        console.log('✅ File input event listener added');
    } else {
        console.error('❌ File input not found!');
    }
    
    // Phase change (optional UI - may not exist)
    const changePhaseBtn = document.getElementById('change-phase-btn');
    if (changePhaseBtn) {
        changePhaseBtn.addEventListener('click', changePhase);
    }
    
    // Quick actions
    const broadcastBtn = document.getElementById('broadcast-btn');
    if (broadcastBtn) broadcastBtn.addEventListener('click', broadcastMessage);
    const clearBtn = document.getElementById('clear-chat-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearChatHistory);
    // Chat permission toggles
    const chatEnableBtn = document.getElementById('chat-enable-btn');
    const chatDisableBtn = document.getElementById('chat-disable-btn');
    if (chatEnableBtn) {
        chatEnableBtn.addEventListener('click', async () => {
            if (!currentUserId) { alert('لطفاً ابتدا یک کاربر انتخاب کنید'); return; }
            try {
                const res = await fetch('/api/admin/chat-toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId, enabled: true })
                });
                const data = await res.json();
                if (data && data.success) {
                    showSystemMessage(`🔓 چت برای کاربر ${currentUsername} فعال شد`);
                } else {
                    alert('❌ خطا در فعال‌سازی چت');
                }
            } catch (e) {
                console.error('❌ chat-enable error:', e);
                alert('❌ خطای شبکه/سرور');
            }
        });
    }
    if (chatDisableBtn) {
        chatDisableBtn.addEventListener('click', async () => {
            if (!currentUserId) { alert('لطفاً ابتدا یک کاربر انتخاب کنید'); return; }
            try {
                const res = await fetch('/api/admin/chat-toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId, enabled: false })
                });
                const data = await res.json();
                if (data && data.success) {
                    showSystemMessage(`🔒 چت برای کاربر ${currentUsername} غیرفعال شد`);
                } else {
                    alert('❌ خطا در غیرفعال‌سازی چت');
                }
            } catch (e) {
                console.error('❌ chat-disable error:', e);
                alert('❌ خطای شبکه/سرور');
            }
        });
    }
    
    // افزودن کاربر جدید
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('new-username').value.trim();
            const comment = document.getElementById('new-comment').value.trim();
            const accessCode = (document.getElementById('new-access-code') ? document.getElementById('new-access-code').value.trim() : '');
            
            console.log('🆕 Adding new user:', username, comment);
            
            if (!username || !comment || !accessCode) {
                alert('لطفاً تمام فیلدها را با کد دسترسی پر کنید');
                return;
            }
            
            // ارسال درخواست افزودن کاربر جدید
            socket.emit('add_new_user', {
                username: username,
                comment: comment,
                accessCode: accessCode
            });
            
            // پاک کردن فرم
            document.getElementById('new-username').value = '';
            document.getElementById('new-comment').value = '';
            if (document.getElementById('new-access-code')) document.getElementById('new-access-code').value = '';
            
            // نمایش پیام موفقیت
            showSystemMessage(`درخواست افزودن کاربر "${username}" ارسال شد`);
        });
        console.log('✅ Add user form event listener added');
    } else {
        console.error('❌ Add user form not found!');
    }
    
    // دکمه‌های ارسال سریع ویدیو + تغییر نام با Shift+Click
    function applyQuickVideoLabels() {
        try {
            const map = JSON.parse(localStorage.getItem('quickVideoLabels') || '{}');
            document.querySelectorAll('.quick-video-btn').forEach((btn) => {
                const url = btn.getAttribute('data-file-url');
                const defName = btn.getAttribute('data-file-name') || btn.textContent.replace('📹', '').trim();
                const label = (url && map[url]) ? map[url] : defName;
                if (label) {
                    try { btn.textContent = `📹 ${label}`; } catch(_) {}
                    btn.setAttribute('data-label', label);
                    btn.title = label;
                }
            });
        } catch (_) {}
    }
    applyQuickVideoLabels();

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.quick-video-btn');
        if (!btn) return;
        console.log('🎬 Quick video button clicked:', btn);

        if (e.shiftKey) {
            e.preventDefault();
            const url = btn.getAttribute('data-file-url');
            if (!url) return;
            const current = btn.getAttribute('data-label') || btn.getAttribute('data-file-name') || btn.textContent.replace('📹', '').trim();
            const name = prompt('نام نمایشی برای این ویدیو:', current || '');
            if (name && name.trim()) {
                const map = JSON.parse(localStorage.getItem('quickVideoLabels') || '{}');
                map[url] = name.trim();
                localStorage.setItem('quickVideoLabels', JSON.stringify(map));
                btn.textContent = `📹 ${name.trim()}`;
                btn.setAttribute('data-label', name.trim());
                btn.title = name.trim();
            }
            return;
        }

        if (!currentUserId) {
            alert('لطفاً ابتدا یک کاربر انتخاب کنید');
            return;
        }

        const fileUrl = btn.getAttribute('data-file-url');
        const fileName = btn.getAttribute('data-label') || btn.getAttribute('data-file-name');
        console.log('🎬 Sending video:', fileName, 'to user:', currentUserId);

        const senderType = currentSenderType || 'detective';
        const videoContent = `<video controls style="max-width: 100%; border-radius: 6px;">
                <source src="${fileUrl}" type="video/mp4">
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
            </video>`;
        const messageData = {
            userId: currentUserId,
            content: videoContent,
            senderType: senderType,
            fileUrl: fileUrl,
            fileType: 'video/mp4'
        };
        socket.emit('admin_message', messageData);
        setTimeout(() => { loadChatHistory(); }, 300);
        console.log(`🎬 Sent video: ${fileName} to user ${currentUserId}`);
    });
    console.log('✅ Quick video buttons event listener added + rename with Shift+Click');
    
    // دکمه‌های حذف و ویرایش پیام (پنل کارآگاه معمولی)
    if (messagesContainer) {
        messagesContainer.addEventListener('click', function(e) {
            const deleteBtn = e.target.closest('.delete-message-btn');
            const editBtn = e.target.closest('.edit-message-btn');
            if (!deleteBtn && !editBtn) return;

            if (deleteBtn) {
                const idStr = deleteBtn.getAttribute('data-message-id');
                const messageId = Number(idStr);
                if (!messageId) return;
                if (!confirm('آیا از حذف این پیام مطمئن هستید؟')) return;
                try {
                    socket.emit('admin_delete_message', { messageId });
                } catch (err) {
                    console.warn('admin_delete_message emit failed', err);
                }
                return;
            }

            if (editBtn) {
                const idStr = editBtn.getAttribute('data-message-id');
                const messageId = Number(idStr);
                if (!messageId) return;
                let currentText = '';
                try {
                    const packet = editBtn.closest('.message-packet');
                    const contentEl = packet && packet.querySelector('.packet-content');
                    if (contentEl) currentText = contentEl.textContent || '';
                } catch (_) {}
                const next = prompt('متن جدید پیام را وارد کنید:', (currentText || '').trim());
                if (!next || !next.trim()) return;
                try {
                    socket.emit('admin_edit_message', { messageId, content: next.trim() });
                } catch (err) {
                    console.warn('admin_edit_message emit failed', err);
                }
            }
        });
    }
    
    const exportBtn = document.getElementById('export-logs-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportChatLogs);
    
    // Image modal
    if (closeModal) {
        closeModal.addEventListener('click', closeImageModal);
    }
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                closeImageModal();
            }
        });
    }
    // Window resize handler
    window.addEventListener('resize', handleWindowResize);

    // Validation queue approve/reject actions
    if (validationQueueEl) {
        validationQueueEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const card = btn.closest('.validation-card');
            if (!card) return;
            const userId = Number(card.getAttribute('data-user-id'));
            const classId = card.getAttribute('data-class-id') || 'default';
            const action = btn.getAttribute('data-action');
            if (action === 'approve') {
                socket.emit('admin_approve', { classId, userId });
            } else if (action === 'reject') {
                socket.emit('admin_reject', { classId, userId });
            }
            // روی موبایل: با کلیک روی پیام، فقط همان پیام دکمه‌ها را نشان دهد/پنهان کند
            if (window.innerWidth <= 899) {
                const packet = e.target.closest('.message-packet');
                if (packet && !e.target.closest('button, a, video, audio, source')) {
                    document.querySelectorAll('.message-packet.show-actions').forEach(p => { if (p !== packet) p.classList.remove('show-actions'); });
                    packet.classList.toggle('show-actions');
                }
            }
        });
    }
    
    // Canned Responses Event Listeners
    if (cannedResponsesBtn) {
        cannedResponsesBtn.addEventListener('click', openCannedResponsesModal);
    }
    if (cannedModalClose) {
        cannedModalClose.addEventListener('click', closeCannedResponsesModal);
    }
    if (cannedResponsesModal) {
        cannedResponsesModal.addEventListener('click', (e) => {
            if (e.target === cannedResponsesModal) {
                closeCannedResponsesModal();
            }
        });
    }
    if (addResponseForm) {
        addResponseForm.addEventListener('submit', addNewResponse);
    }
    
    // Students management listeners
    if (studentsLoadBtn) {
        studentsLoadBtn.addEventListener('click', () => {
            loadStudentsList(studentClassIdInput ? studentClassIdInput.value.trim() : '');
        });
    }
    if (studentSaveBtn) {
        studentSaveBtn.addEventListener('click', saveStudent);
    }
    if (studentClearBtn) {
        studentClearBtn.addEventListener('click', clearStudentForm);
    }
    if (studentsListEl) {
        studentsListEl.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('[data-action="edit-student"]')) {
                const id = target.getAttribute('data-id');
                const name = target.getAttribute('data-name');
                const photo = target.getAttribute('data-photo');
                const classId = target.getAttribute('data-classid');
                fillStudentForm({ id, name, photo, classId });
            } else if (target.matches('[data-action="delete-student"]')) {
                const id = target.getAttribute('data-id');
                if (confirm('حذف این دستیار؟')) deleteStudent(id);
            }
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 899 && isSidebarOpen) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                closeSidebar();
            }
        }
    });
    
    // ========== دکمه شروع سکانس هک ==========
    const hackSequenceBtn = document.getElementById('hack-sequence-btn');
    console.log('🔍 جستجوی دکمه hack-sequence-btn:', hackSequenceBtn);
    
    if (hackSequenceBtn) {
        console.log('✅ دکمه hack-sequence-btn یافت شد');
        hackSequenceBtn.addEventListener('click', () => {
            console.log('🔴 ادمین درخواست شروع سکانس هک کرد');
            
            // بررسی وجود socket
            if (!socket) {
                console.error('❌ Socket اتصال ندارد');
                alert('خطا: اتصال به سرور برقرار نیست');
                return;
            }
            
            // تأیید از ادمین
            if (confirm(`آیا مطمئن هستید که می‌خواهید سکانس هک را برای کاربر "${currentUsername || 'نامشخص'}" شروع کنید؟`)) {
                console.log('✅ تأیید شروع سکانس هک');
                
                if (!currentUserId) {
                    alert('لطفاً ابتدا یک کاربر را انتخاب کنید');
                    return;
                }
                
                // ارسال رویداد شروع سکانس هک مستقیماً
                console.log('🔴 ارسال رویداد start_hack_sequence برای کاربر:', currentUserId);
                socket.emit('start_hack_sequence', {
                    userId: currentUserId,
                    message: 'شروع سکانس سینمایی هک'
                });
                console.log('✅ رویداد سکانس هک ارسال شد');
                
                // تغییر وضعیت دکمه
                hackSequenceBtn.textContent = '⏳ در حال ارسال...';
                hackSequenceBtn.style.background = 'rgba(255, 165, 0, 0.3)';
                hackSequenceBtn.disabled = true;
                
                // بازگردانی دکمه پس از 10 ثانیه
                setTimeout(() => {
                    document.getElementById('hack-sequence-btn').textContent = '🔴 شروع فاز هک';
                    document.getElementById('hack-sequence-btn').style.background = 'rgba(255, 0, 0, 0.2)';
                    document.getElementById('hack-sequence-btn').disabled = false;
                }, 10000);
            } else {
                console.log('❌ سکانس هک لغو شد');
            }
        });
    } else {
        console.error('❌ دکمه hack-sequence-btn یافت نشد');
    }
}

function initializeSidebarState() {
    if (window.innerWidth >= 900) {
        // Desktop: Open by default
        openSidebar();
    } else {
        // Mobile: Closed by default
        closeSidebar();
    }
}

// ========== SIDEBAR FUNCTIONALITY ==========
function toggleSidebar() {
    if (isSidebarOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    document.body.classList.add('sidebar-open');
    document.body.classList.remove('sidebar-closed');
    isSidebarOpen = true;
    console.log('📖 Sidebar opened');
}

function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-closed');
    isSidebarOpen = false;
    console.log('📕 Sidebar closed');
}

function handleWindowResize() {
    if (window.innerWidth >= 900) {
        // Desktop mode
        if (!isSidebarOpen) {
            openSidebar();
        }
    } else {
        // Mobile mode - keep current state but adjust behavior
        // No automatic changes, let user control
    }
}

// ========== USER MANAGEMENT ==========
function requestUsersList() {
    socket.emit('get_users_list');
}

function handleUsersList(usersList) {
    console.log('👥 Received users list:', usersList);
    users = usersList;
    displayUsersList();
}

function displayUsersList() {
    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div class="user-item">
                <div class="user-name">کاربر فعالی وجود ندارد</div>
                <div class="user-status">در انتظار اتصال...</div>
            </div>
        `;
        return;
    }

    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.dataset.userId = user.id;
        
        const isOnline = user.is_online ? '🟢 آنلاین' : '🔴 آفلاین';
        const unreadCount = user.unread_count || 0;
        const userComment = user.comment || 'کاربر عادی';
        const chatStatus = (String(user.chat_enabled) === '1' || user.chat_enabled === 1) ? '🔓 چت فعال' : '🔒 چت غیرفعال';
        
        // ایجاد badge نوتیفیکیشن
        const notificationBadge = unreadCount > 0 
            ? `<div class="notification-badge" data-user-id="${user.id}">${unreadCount}</div>` 
            : `<div class="notification-badge hidden" data-user-id="${user.id}">0</div>`;
        
        userElement.innerHTML = `
            ${notificationBadge}
            <div class="user-name">${user.username}</div>
            <div class="user-status">${isOnline} • ${userComment} • ${chatStatus}</div>
        `;
        
        userElement.addEventListener('click', () => selectUser(user));
        usersList.appendChild(userElement);
    });
}

async function selectUser(user) {
    // Save draft for previous user
    try {
        if (currentUserId) messageDrafts[String(currentUserId)] = messageInput ? messageInput.value : '';
    } catch (_) {}

    // Update current user
    currentUserId = user.id;
    currentUsername = user.username;
    
    // Update UI
    updateSelectedUser();
    updateChatInfo();
    // Restore draft for new user (or clear)
    try {
        if (messageInput) {
            const key = String(currentUserId);
            messageInput.value = (messageDrafts && Object.prototype.hasOwnProperty.call(messageDrafts, key)) ? (messageDrafts[key] || '') : '';
            autoResizeTextarea();
        }
    } catch (_) {}
    
    // Load chat history
    loadChatHistory();
    
    // Mark messages as read for this user
    await markMessagesAsRead(user.id);
    
    console.log('👤 Selected user:', user.username);
}

function updateSelectedUser() {
    // Remove previous selection
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to current user
    const selectedElement = document.querySelector(`[data-user-id="${currentUserId}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
}

function updateChatInfo() {
    if (currentUsername) {
        chatInfo.textContent = `💬 در حال چت با: ${currentUsername}`;
    } else {
        chatInfo.textContent = 'یک کاربر را برای شروع چت انتخاب کنید';
    }
}

function handleUserJoined(userData) {
    console.log('👋 User joined:', userData);
    requestUsersList(); // Refresh the list
    showSystemMessage(`${userData.username} joined the game`);
}

function handleUserLeft(userData) {
    console.log('👋 User left:', userData);
    requestUsersList(); // Refresh the list
    showSystemMessage(`${userData.username} left the game`);
}

// ========== CHAT FUNCTIONALITY ==========
function loadChatHistory() {
    if (!currentUserId) return;
    
    socket.emit('load_chat_history', { userId: currentUserId });
}

function handleChatHistory(messages) {
    console.log('📜 Received chat history:', messages.length, 'messages');
    
    messagesContainer.innerHTML = '';
    
    if (messages && messages.length > 0) {
        messages.forEach(message => {
            displayMessage(message, false); // false = no animation for history
        });
    } else {
        showSystemMessage('No previous messages');
    }
    
    scrollToBottom();
}

function handleNewMessage(messageData) {
    console.log('💬 New message received:', messageData);
    if (messageData.user_id == currentUserId) {
        const exists = messagesContainer && messageData.id && messagesContainer.querySelector(`.message-packet[data-message-id="${messageData.id}"]`);
        if (!exists) {
            displayMessage(messageData, true);
            scrollToBottom();
        }
    }
}

function displayMessage(messageData, withAnimation = true) {
    // ایجاد بسته داده هولوگرافیک
    const packetElement = document.createElement('div');
    packetElement.className = 'message-packet';
    if (typeof messageData.id !== 'undefined') {
        try { packetElement.setAttribute('data-message-id', String(messageData.id)); } catch (_) {}
    }
    
    // تعیین نوع بسته بر اساس فرستنده
    let senderAvatar = '';
    let senderName = '';
    
    if (messageData.sender_type === 'user') {
        packetElement.classList.add('user-message');
        senderAvatar = '<img src="/images/avatars/user.png" alt="کاربر" class="packet-avatar" onclick="openAvatarZoom(\'/images/avatars/user.png\', \'کاربر\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'👤 کاربر\';">';
        senderName = 'کاربر';
    } else if (messageData.sender_type === 'detective') {
        packetElement.classList.add('admin-message');
        senderAvatar = '<img src="/images/avatars/karagah.png" alt="کارآگاه" class="packet-avatar" onclick="openAvatarZoom(\'/images/avatars/karagah.png\', \'کارآگاه\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'🕵️ کارآگاه\';">';
        senderName = 'کارآگاه';
    } else if (messageData.sender_type === 'hacker') {
        packetElement.classList.add('hacker-message');
        senderAvatar = '<img src="/assets/haker.mask.png" alt="هکر" class="packet-avatar" onclick="openAvatarZoom(\'/assets/haker.mask.png\', \'هکر\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'💀 هکر\';">';
        senderName = 'هکر';
    } else {
        packetElement.classList.add('admin-message');
        senderAvatar = '<img src="/images/avatars/karagah.png" alt="ادمین" class="packet-avatar" onclick="openAvatarZoom(\'/images/avatars/karagah.png\', \'ادمین\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'👨‍💼 ادمین\';">';
        senderName = 'ادمین';
    }
    
    if (withAnimation) {
        packetElement.style.opacity = '0';
        packetElement.style.transform = 'translateY(20px) scale(0.95)';
    }
    
    const timestamp = new Date(messageData.timestamp).toLocaleString('fa-IR');
    
    let content = messageData.content || '';
    
    // Handle file messages
    if (messageData.file_url) {
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            content = `<img src="${messageData.file_url}" alt="تصویر" onclick="openImageZoom('${messageData.file_url}')">`;
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            content = `<video controls>
                <source src="${messageData.file_url}" type="${messageData.file_type}">
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
            </video>`;
        } else if (messageData.file_type && messageData.file_type.startsWith('audio/')) {
            content = `<audio controls>
                <source src="${messageData.file_url}" type="${messageData.file_type}">
                مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
            </audio>`;
        } else {
            content = `<a href="${messageData.file_url}" target="_blank" style="color: #00ffff;">📎 ${messageData.content || 'فایل ضمیمه'}</a>`;
        }
    }
    
    packetElement.innerHTML = `
        <button class="delete-message-btn" data-message-id="${messageData.id}" title="حذف پیام">🗑️</button>
        <button class="edit-message-btn" data-message-id="${messageData.id}" title="ویرایش پیام">✏️</button>
        <div class="packet-header">
            <span class="sender-avatar">${senderAvatar}</span>
            <strong>${senderName}</strong>
            <span style="font-size: 0.8em; opacity: 0.7; margin-right: 8px;">#${messageData.id}</span>
        </div>
        <div class="packet-content">${content}</div>
        <div class="packet-footer">
            <span class="message-time">${timestamp}</span>
        </div>
    `;
    
    messagesContainer.appendChild(packetElement);
    
    if (withAnimation) {
        // Trigger animation
        setTimeout(() => {
            packetElement.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            packetElement.style.opacity = '1';
            packetElement.style.transform = 'translateY(0) scale(1)';
        }, 10);
    }
}

function getSenderDisplayName(senderType) {
    const names = {
        'user': '👤 User',
        'admin': '👨‍💼 Admin',
        'detective': '🕵️ Detective',
        'hacker': '💀 Hacker'
    };
    return names[senderType] || senderType;
}

function sendMessage() {
    const content = messageInput.value;
    if (!content.trim()) {
        console.error('❌ Empty message content');
        return;
    }
    
    if (!currentUserId) {
        alert('⚠️ لطفاً ابتدا یک کاربر انتخاب کنید');
        return;
    }
    
    // تعیین خودکار نوع فرستنده بر اساس فاز
    updateSenderTypeByPhase();
    
    const messageData = {
        userId: currentUserId,
        content: content,
        senderType: currentSenderType,
        isScrambled: false
    };
    
    console.log('📤 Sending message:', messageData);
    console.log('📤 Current user:', currentUserId, 'Current sender:', currentSenderType);
    
    if (socket && socket.connected) {
        socket.emit('admin_message', messageData);
        
        // Clear input
        messageInput.value = '';
        try { if (currentUserId) messageDrafts[String(currentUserId)] = ''; } catch (_) {}
        autoResizeTextarea();
        
        // Reload chat history to show the sent message
        setTimeout(() => {
            loadChatHistory();
        }, 300);
        
        // Focus back to input
        messageInput.focus();
    } else {
        console.error('❌ Socket not connected!');
        alert('❌ اتصال برقرار نیست. لطفاً صفحه را رفرش کنید.');
    }
}

function updateSenderTypeByPhase() {
    switch(currentPhase) {
        case 'normal':
            currentSenderType = 'detective';
            break;
        case 'hacker':
            currentSenderType = 'hacker';
            break;
        case 'senior':
            currentSenderType = 'admin';
            break;
        default:
            currentSenderType = 'detective';
    }
    
    // به‌روزرسانی نمایش شخصیت
    updateCharacterDisplay();
}

function updateCharacterDisplay() {
    const characterNames = {
        'detective': 'کارآگاه',
        'hacker': 'هکر',
        'admin': 'کارآگاه ارشد'
    };
    
    if (currentCharacterSpan) {
        currentCharacterSpan.textContent = characterNames[currentSenderType] || 'کارآگاه';
    }
}

function showSystemMessage(message) {
    const packetElement = document.createElement('div');
    packetElement.className = 'message-packet system-message';
    
    const timestamp = new Date().toLocaleString('fa-IR');
    
    packetElement.innerHTML = `
        <div class="packet-header">
            <span class="sender-avatar"><img src="/images/avatars/system.png" alt="سیستم" class="packet-avatar" onerror="this.style.display='none'; this.parentElement.innerHTML='⚡ سیستم';"></span>
            <strong>سیستم</strong>
        </div>
        <div class="packet-content">${message}</div>
        <div class="packet-footer">
            <span class="message-time">${timestamp}</span>
        </div>
    `;
    
    messagesContainer.appendChild(packetElement);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// ========== FILE HANDLING ==========
function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) {
        console.error('❌ No file selected');
        return;
    }
    
    if (!currentUserId) {
        alert('⚠️ لطفاً ابتدا یک کاربر انتخاب کنید');
        fileInput.value = '';
        return;
    }
    
    console.log('📎 Uploading file:', file.name, 'for user:', currentUserId);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', currentUserId);
    formData.append('senderType', currentSenderType);
    
    // Show upload status
    const fileStatus = document.getElementById('file-status');
    fileStatus.textContent = 'Uploading...';
    fileStatus.style.color = '#ffaa00';
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ File uploaded successfully');
            fileStatus.textContent = 'File sent successfully';
            fileStatus.style.color = '#00ff00';
            // Reload chat to show the new file message immediately
            try { if (currentUserId) loadChatHistory(); } catch(_) {}
        } else {
            console.error('❌ File upload failed:', data.error);
            fileStatus.textContent = 'Upload failed';
            fileStatus.style.color = '#ff0000';
        }
        
        // Clear status after 3 seconds
        setTimeout(() => {
            fileStatus.textContent = '';
        }, 3000);
        
        // Clear file input
        fileInput.value = '';
    })
    .catch(error => {
        console.error('❌ File upload error:', error);
        fileStatus.textContent = 'Upload error';
        fileStatus.style.color = '#ff0000';
        
        setTimeout(() => {
            fileStatus.textContent = '';
        }, 3000);
    });
}

// ========== IMAGE MODAL ==========
function openImageModal(mediaSrc) {
    const modal = document.getElementById('image-modal');
    
    if (modal) {
        // Clear previous content
        modal.innerHTML = '';
        
        // Determine if it's video or image
        const isVideo = mediaSrc.includes('.mp4') || mediaSrc.includes('.webm') || mediaSrc.includes('.mov') || mediaSrc.includes('video/');
        
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
        
        // Add zoom functionality with mouse wheel
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
        closeBtn.className = 'close-btn';
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

// ========== PHASE MANAGEMENT ==========
function changePhase() {
    const selectedPhase = phaseSelector.value;
    
    console.log('🔄 Changing phase to:', selectedPhase);
    
    socket.emit('change_phase', { phase: selectedPhase });
}

function handlePhaseChanged(phaseData) {
    console.log('🎯 Phase changed:', phaseData);
    currentPhase = phaseData.phase;
    
    const phaseNames = {
        'normal': 'تحقیق عادی',
        'hacker': 'حمله هکر',
        'senior': 'کارآگاه ارشد'
    };
    
    showSystemMessage(`فاز تغییر کرد به: ${phaseNames[phaseData.phase] || phaseData.phase}`);
    
    // Update phase selector
    if (phaseSelector) {
        phaseSelector.value = phaseData.phase;
    }
    
    // به‌روزرسانی شخصیت بر اساس فاز جدید
    updateSenderTypeByPhase();
}

// ========== QUICK ACTIONS ==========
function broadcastMessage() {
    const message = prompt('پیام عمومی را وارد کنید:');
    if (!message) return;
    
    updateSenderTypeByPhase();
    
    socket.emit('broadcast_message', {
        content: message,
        senderType: currentSenderType
    });
    
    showSystemMessage(`پیام عمومی ارسال شد: ${message}`);
}

function clearChatHistory() {
    if (!currentUserId) return;
    
    if (confirm('آیا مطمئن هستید که می‌خواهید تاریخچه چت این کاربر را پاک کنید؟')) {
        socket.emit('clear_chat_history', { userId: currentUserId });
        messagesContainer.innerHTML = '';
        showSystemMessage('تاریخچه چت پاک شد');
    }
}

function exportChatLogs() {
    if (!currentUserId) return;
    
    // Create a simple text export of current chat
    const messages = messagesContainer.querySelectorAll('.message');
    let exportText = `گزارش چت برای ${currentUsername}\n`;
    exportText += `تاریخ صدور: ${new Date().toLocaleString('fa-IR')}\n`;
    exportText += '='.repeat(50) + '\n\n';
    
    messages.forEach(message => {
        const header = message.querySelector('.message-header')?.textContent || '';
        const content = message.querySelector('.message-content')?.textContent || '';
        const time = message.querySelector('.message-time')?.textContent || '';
        
        exportText += `[${time}] ${header}\n${content}\n\n`;
    });
    
    // Download as text file
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-log-${currentUsername}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSystemMessage('گزارش چت با موفقیت صادر شد');
}

// ========== UTILITY FUNCTIONS ==========
window.openImageModal = openImageModal; // Make it globally accessible for onclick


// ========== PRELOADED FILES SYSTEM ==========
async function loadPreloadedFiles() {
    try {
        const response = await fetch('/api/preloaded-files');
        const data = await response.json();
        
        if (data.success && data.files) {
            displayPreloadedFiles(data.files);
        } else {
            console.error('❌ Failed to load preloaded files');
        }
    } catch (error) {
        console.error('❌ Error loading preloaded files:', error);
        const container = document.getElementById('preloaded-files-container');
        if (container) {
            container.innerHTML = '<div style="color: #ff6666; font-size: 11px; text-align: center;">خطا در بارگذاری</div>';
        }
    }
}

function displayPreloadedFiles(files) {
    const container = document.getElementById('preloaded-files-container');
    
    // اگر container وجود ندارد، خطا ندهیم
    if (!container) {
        console.log('⚠️ preloaded-files-container element not found');
        return;
    }
    
    if (files.length === 0) {
        container.innerHTML = '<div style="color: #aaa; font-size: 11px; text-align: center;">فایلی موجود نیست</div>';
        return;
    }
    
    let html = '';
    files.forEach(file => {
        const icon = getFileIcon(file.file_type);
        html += `
            <button class="preloaded-file-btn" data-file-url="${file.file_url}" data-file-type="${file.file_type}" data-file-name="${file.name}">
                <span class="file-icon">${icon}</span>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-desc">${file.description || ''}</div>
                </div>
            </button>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to preloaded file buttons
    container.querySelectorAll('.preloaded-file-btn').forEach(btn => {
        btn.addEventListener('click', () => sendPreloadedFile(btn));
    });
}

function getFileIcon(fileType) {
    if (!fileType) return '📎';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎬';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('text')) return '📋';
    return '📎';
}

function sendPreloadedFile(button) {
    if (!currentUserId) {
        alert('لطفاً ابتدا یک کاربر انتخاب کنید');
        return;
    }
    
    const fileUrl = normalizeFileUrl(button.dataset.fileUrl);
    const fileType = button.dataset.fileType;
    const fileName = button.dataset.fileName;
    
    // تعیین خودکار نوع فرستنده بر اساس فاز
    updateSenderTypeByPhase();
    
    const messageData = {
        userId: currentUserId,
        content: fileName,
        file_url: fileUrl,
        file_type: fileType,
        senderType: currentSenderType
    };
    
    console.log('📤 Sending preloaded file:', messageData);
    
    // ارسال پیام فایل از طریق Socket.IO
    socket.emit('admin_message', messageData);
    
    // نمایش feedback
    button.style.background = 'rgba(0, 255, 0, 0.3)';
    setTimeout(() => {
        button.style.background = 'rgba(0, 255, 100, 0.1)';
    }, 500);
    // بروز‌رسانی تاریخچه پس از ارسال
    setTimeout(() => {
        try { loadChatHistory(); } catch(_) {}
    }, 350);
}

// کد دکمه هک به setupEventListeners منتقل شد

// ========== RESET HACK STATUS ==========
function resetHackStatus() {
    if (!currentUserId) {
        alert('لطفاً ابتدا یک کاربر انتخاب کنید');
        return;
    }
    
    if (confirm(`آیا مطمئن هستید که می‌خواهید وضعیت هک کاربر "${currentUsername || 'نامشخص'}" را ریست کنید؟`)) {
        console.log('🔄 ریست وضعیت هک برای کاربر:', currentUserId);
        
        const resetBtn = document.getElementById('reset-hack-btn');
        if (resetBtn) {
            resetBtn.textContent = '⏳ در حال ریست...';
            resetBtn.disabled = true;
        }
        
        socket.emit('reset_hack_status', {
            userId: currentUserId
        });
    }
}

// NOTE: hack_status_reset listener is attached inside initializeSocket()

// ========== CANNED RESPONSES FUNCTIONS ==========

// بارگذاری پاسخ‌های آماده از سرور
async function loadCannedResponses() {
    try {
        console.log('📋 Loading canned responses...');
        const response = await fetch('/api/canned-responses');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responses = await response.json();
        console.log(`✅ Loaded ${responses.length} canned responses`);
        
        displayCannedResponses(responses);
    } catch (error) {
        console.error('❌ Error loading canned responses:', error);
    }
}

// نمایش پاسخ‌های آماده در لیست
function displayCannedResponses(responses) {
    if (!responsesList) return;
    
    responsesList.innerHTML = '';
    
    if (responses.length === 0) {
        responsesList.innerHTML = '<div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">هیچ پاسخ آماده‌ای موجود نیست</div>';
        return;
    }
    
    responses.forEach(response => {
        const responseItem = document.createElement('div');
        responseItem.className = 'response-item';
        responseItem.setAttribute('data-content', response.content);
        
        // محدود کردن preview به 100 کاراکتر
        const preview = response.content.length > 100 
            ? response.content.substring(0, 100) + '...' 
            : response.content;
        
        responseItem.innerHTML = `
            <div class="response-item-name">${response.short_name}</div>
            <div class="response-item-preview">${preview}</div>
        `;
        
        // اضافه کردن event listener برای کلیک
        responseItem.addEventListener('click', () => {
            selectCannedResponse(response.content);
        });
        
        responsesList.appendChild(responseItem);
    });
}

// انتخاب یک پاسخ آماده
function selectCannedResponse(content) {
    if (messageInput) {
        messageInput.value = content;
        messageInput.focus();
        
        // Auto-resize textarea
        autoResizeTextarea();
        
        console.log('✅ Canned response selected');
    }
    
    // بستن modal
    closeCannedResponsesModal();
}

// باز کردن modal پاسخ‌های آماده
function openCannedResponsesModal() {
    if (cannedResponsesModal) {
        cannedResponsesModal.style.display = 'block';
        console.log('📋 Canned responses modal opened');
    }
}

// بستن modal پاسخ‌های آماده
function closeCannedResponsesModal() {
    if (cannedResponsesModal) {
        cannedResponsesModal.style.display = 'none';
        console.log('📋 Canned responses modal closed');
    }
}

// ========== STUDENTS MANAGEMENT (GLOBAL) ==========
async function loadStudentsList(classId) {
    try {
        const qp = classId ? `?classId=${encodeURIComponent(classId)}` : '';
        const res = await fetch(`/api/students${qp}`);
        const data = await res.json();
        const students = Array.isArray(data.students) ? data.students : [];
        studentsCache = students;
        renderStudentsList(students);
    } catch (e) {
        console.error('❌ خطا در دریافت لیست دانش‌آموزان:', e);
        if (studentsListEl) studentsListEl.innerHTML = '<div style="color:#f66;">خطا در دریافت لیست</div>';
    }
}

function renderStudentsList(students) {
    if (!studentsListEl) return;
    if (!students || students.length === 0) {
        studentsListEl.innerHTML = '<div style="font-size:12px; opacity:.7;">لیست خالی است</div>';
        return;
    }
    studentsListEl.innerHTML = '';
    students.forEach(s => {
        const card = document.createElement('div');
        card.className = 'student-card';
        const imgSrc = s.photo ? `/assets/students/${s.photo}` : '/assets/students/default.png';
        card.innerHTML = `
            <img class="student-thumb" src="${imgSrc}" alt="${s.name || ''}" onerror="this.src='/assets/students/default.png'" />
            <div class="student-name">${s.name || 'بدون نام'}</div>
            <div class="student-class">کلاس: ${s.classId || '—'}</div>
            <div class="student-actions">
                <button data-action="edit-student" data-id="${s.id}" data-name="${s.name || ''}" data-photo="${s.photo || ''}" data-classid="${s.classId || ''}">✏️ ویرایش</button>
                <button data-action="delete-student" data-id="${s.id}">🗑 حذف</button>
            </div>
        `;
        // کلیک روی کارت فرم را پر کند
        card.addEventListener('click', () => fillStudentForm({ id: s.id, name: s.name, photo: s.photo, classId: s.classId }));
        const img = card.querySelector('.student-thumb');
        if (img) img.addEventListener('click', (ev) => { ev.stopPropagation(); try { openImageZoom(imgSrc); } catch(_) {} });
        studentsListEl.appendChild(card);
    });
}

function fillStudentForm({ id, name, photo, classId }) {
    if (studentIdHidden) studentIdHidden.value = id || '';
    if (studentNameInput) studentNameInput.value = name || '';
    if (studentPhotoInput) studentPhotoInput.value = photo || '';
    if (studentClassIdInput && classId) studentClassIdInput.value = classId;
}

function clearStudentForm() {
    if (studentIdHidden) studentIdHidden.value = '';
    if (studentNameInput) studentNameInput.value = '';
    if (studentPhotoInput) studentPhotoInput.value = '';
    // کلاس را خالی نکن تا فیلتر حفظ شود
}

async function saveStudent() {
    const name = studentNameInput ? studentNameInput.value.trim() : '';
    const photo = studentPhotoInput ? studentPhotoInput.value.trim() : '';
    const classId = studentClassIdInput ? studentClassIdInput.value.trim() : '';
    const id = studentIdHidden ? studentIdHidden.value : '';
    if (!name) {
        alert('نام دانش‌آموز را وارد کنید');
        return;
    }
    try {
        const res = await fetch('/api/admin/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id || undefined, name, photo, classId: classId || null })
        });
        const data = await res.json();
        if (data && data.success) {
            if (data.id && studentIdHidden) studentIdHidden.value = data.id;
            await loadStudentsList(classId);
            alert('✅ ذخیره شد');
        } else {
            alert('❌ خطا در ذخیره');
        }
    } catch (e) {
        console.error('❌ خطا در ذخیره دانش‌آموز:', e);
        alert('❌ خطای شبکه/سرور');
    }
}

async function deleteStudent(id) {
    if (!id) return;
    try {
        const res = await fetch(`/api/admin/students/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data && data.success) {
            await loadStudentsList(studentClassIdInput ? studentClassIdInput.value.trim() : '');
        } else {
            alert('❌ حذف ناموفق');
        }
    } catch (e) {
        console.error('❌ خطا در حذف:', e);
        alert('❌ خطای شبکه/سرور');
    }
}

// افزودن پاسخ جدید
async function addNewResponse(e) {
    e.preventDefault();
    
    const shortName = newResponseName.value.trim();
    const content = newResponseContent.value.trim();
    
    if (!shortName || !content) {
        alert('⚠️ لطفاً تمام فیلدها را پر کنید');
        return;
    }
    
    try {
        console.log('💾 Adding new canned response...');
        
        const response = await fetch('/api/canned-responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                short_name: shortName,
                content: content
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ New canned response added:', result);
        
        // پاک کردن فرم
        newResponseName.value = '';
        newResponseContent.value = '';
        
        // بارگذاری مجدد لیست
        await loadCannedResponses();
        
        alert('✅ پیام جدید با موفقیت اضافه شد');
        
    } catch (error) {
        console.error('❌ Error adding canned response:', error);
        alert('❌ خطا در افزودن پیام جدید');
    }
}

// ========== NOTIFICATION SYSTEM FUNCTIONS ==========

// مدیریت به‌روزرسانی تعداد پیام‌های خوانده نشده
function handleUnreadCountUpdate(data) {
    console.log('🔔 Unread count update received:', data);
    
    const { userId, username, unreadCount } = data;
    
    // پیدا کردن badge مربوط به این کاربر
    const badge = document.querySelector(`.notification-badge[data-user-id="${userId}"]`);
    console.log('🔍 Looking for badge with selector:', `.notification-badge[data-user-id="${userId}"]`);
    console.log('🔍 Badge found:', badge);
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
            console.log('✅ Badge updated: showing', unreadCount);
        } else {
            badge.classList.add('hidden');
            console.log('✅ Badge hidden');
        }
    } else {
        console.error('❌ Badge not found for user:', userId);
        // بیایید تمام badge ها را پیدا کنیم
        const allBadges = document.querySelectorAll('.notification-badge');
        console.log('🔍 All badges found:', allBadges);
        allBadges.forEach(b => {
            console.log('Badge data-user-id:', b.getAttribute('data-user-id'));
        });
    }
    
    // به‌روزرسانی آرایه users
    const userIndex = users.findIndex(user => user.id == userId);
    if (userIndex !== -1) {
        users[userIndex].unread_count = unreadCount;
        console.log('✅ Users array updated for user:', userId);
    } else {
        console.error('❌ User not found in users array:', userId);
    }
}

// علامت‌گذاری پیام‌ها به عنوان خوانده شده
async function markMessagesAsRead(userId) {
    try {
        const response = await fetch('/api/mark-as-read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });
        
        if (response.ok) {
            // پنهان کردن badge برای این کاربر
            const badge = document.querySelector(`.notification-badge[data-user-id="${userId}"]`);
            if (badge) {
                badge.classList.add('hidden');
            }
            
            // به‌روزرسانی آرایه users
            const userIndex = users.findIndex(user => user.id == userId);
            if (userIndex !== -1) {
                users[userIndex].unread_count = 0;
            }
            
            console.log(`✅ Messages marked as read for user ${userId}`);
        }
    } catch (error) {
        console.error('❌ Error marking messages as read:', error);
    }
}

// به‌روزرسانی badge نوتیفیکیشن برای کاربر خاص
function updateNotificationBadge(userId, count) {
    const badge = document.querySelector(`.notification-badge[data-user-id="${userId}"]`);
    
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// زوم تصویر هولوگرافیک
function openImageZoom(imageSrc) {
    const zoomModal = document.createElement('div');
    zoomModal.className = 'image-zoom-modal';
    zoomModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: zoom-out;
        animation: zoomModalFadeIn 0.3s ease;
    `;
    
    const zoomedImage = document.createElement('img');
    zoomedImage.src = imageSrc;
    zoomedImage.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 12px;
        box-shadow: 
            0 0 50px rgba(0, 255, 255, 0.3),
            inset 0 0 30px rgba(0, 255, 255, 0.1);
        border: 2px solid rgba(0, 255, 255, 0.4);
        cursor: zoom-out;
        animation: zoomImageIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // بستن مودال با کلیک
    zoomModal.addEventListener('click', () => {
        zoomModal.style.animation = 'zoomModalFadeOut 0.2s ease';
        zoomedImage.style.animation = 'zoomImageOut 0.2s ease';
        setTimeout(() => {
            document.body.removeChild(zoomModal);
        }, 200);
    });
    
    // بستن با ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            zoomModal.click();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    zoomModal.appendChild(zoomedImage);
    document.body.appendChild(zoomModal);
    
    // اضافه کردن انیمیشن‌های CSS
    if (!document.querySelector('#zoom-animations')) {
        const style = document.createElement('style');
        style.id = 'zoom-animations';
        style.textContent = `
            @keyframes zoomModalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes zoomModalFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes zoomImageIn {
                from { 
                    opacity: 0; 
                    transform: scale(0.8) rotate(2deg); 
                }
                to { 
                    opacity: 1; 
                    transform: scale(1) rotate(0deg); 
                }
            }
            @keyframes zoomImageOut {
                from { 
                    opacity: 1; 
                    transform: scale(1) rotate(0deg); 
                }
                to { 
                    opacity: 0; 
                    transform: scale(0.8) rotate(-2deg); 
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========== VALIDATION QUEUE HELPERS ==========
function addValidationRequest(payload) {
    if (!validationQueueEl || !payload) return;
    try {
        const classId = payload.classId || 'default';
        const user = payload.user || {};
        const userId = Number(user.id);
        const name = user.name || ('کاربر #' + userId);
        let scanUrls = [];
        if (Array.isArray(payload.files) && payload.files.length) {
            scanUrls = payload.files.map(f => f && f.url).filter(Boolean);
        } else if (Array.isArray(payload.scanUrls)) {
            scanUrls = payload.scanUrls.filter(Boolean);
        } else if (Array.isArray(user.scanUrls)) {
            scanUrls = user.scanUrls.filter(Boolean);
        }

        // Remove placeholder if first request
        const placeholder = validationQueueEl.querySelector('p, .empty-queue');
        if (placeholder) { try { placeholder.remove(); } catch(_) {} }

        // Generate one card per image
        scanUrls.forEach((url, idx) => {
            const cardId = `validation-${userId}-${Date.now()}-${idx}`;
            const card = document.createElement('div');
            card.className = 'validation-card';
            card.setAttribute('data-user-id', String(userId));
            card.setAttribute('data-class-id', String(classId));
            card.id = cardId;
            card.style.cssText = 'margin:6px 0; padding:8px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); border-radius:8px;';
            card.innerHTML = [
                '<div style="display:flex; gap:8px; align-items:center;">',
                '  <img src="' + url + '" alt="scan" style="width:64px; height:64px; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,0.2);" onerror="this.style.display=\'none\'">',
                '  <div style="flex:1; text-align:right;">',
                '    <div style="font-weight:bold;">' + name + ' - مدرک ' + (idx + 1) + '</div>',
                '    <div style="font-size:11px; opacity:.75;">کلاس: ' + String(classId) + '</div>',
                '  </div>',
                '  <div style="display:flex; gap:6px;">',
                '    <button onclick="approveImage(\'' + classId + '\', \'' + userId + '\', \'' + url + '\', \'' + cardId + '\')" style="background:rgba(0,255,100,0.15); border:1px solid rgba(0,255,100,0.4); color:#00ff88; padding:6px 8px; border-radius:6px; cursor:pointer;">تایید این عکس</button>',
                '    <button onclick="rejectImage(\'' + cardId + '\')" style="background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.4); color:#ff6666; padding:6px 8px; border-radius:6px; cursor:pointer;">رد این عکس</button>',
                '  </div>',
                '</div>'
            ].join('');
            // Add user-level actions on first image card
            if (idx === 0) {
                const userActions = document.createElement('div');
                userActions.style.cssText = 'margin-top:8px; display:flex; gap:8px;';
                const approveUserBtn = document.createElement('button');
                approveUserBtn.textContent = '✅ تایید کاربر';
                approveUserBtn.style.cssText = 'background:rgba(0,255,100,0.12); border:1px solid rgba(0,255,100,0.4); color:#00ff88; padding:6px 10px; border-radius:6px; cursor:pointer;';
                approveUserBtn.addEventListener('click', () => {
                    try { if (socket && socket.connected) socket.emit('admin_approve_user', { classId, userId }); } catch(_) {}
                    document.querySelectorAll(`.validation-card[data-user-id="${userId}"]`).forEach(el => el.remove());
                    if (!validationQueueEl.querySelector('.validation-card')) {
                        validationQueueEl.innerHTML = '<p>در حال حاضر درخواستی در صف نیست.</p>';
                    }
                });
                const rejectUserBtn = document.createElement('button');
                rejectUserBtn.textContent = '⛔ رد کاربر';
                rejectUserBtn.style.cssText = 'background:rgba(255,0,0,0.12); border:1px solid rgba(255,0,0,0.4); color:#ff6666; padding:6px 10px; border-radius:6px; cursor:pointer;';
                rejectUserBtn.addEventListener('click', () => {
                    try { if (socket && socket.connected) socket.emit('admin_reject_user', { classId, userId }); } catch(_) {}
                    document.querySelectorAll(`.validation-card[data-user-id="${userId}"]`).forEach(el => el.remove());
                    if (!validationQueueEl.querySelector('.validation-card')) {
                        validationQueueEl.innerHTML = '<p>در حال حاضر درخواستی در صف نیست.</p>';
                    }
                });
                userActions.appendChild(approveUserBtn);
                userActions.appendChild(rejectUserBtn);
                card.appendChild(userActions);
            }
            validationQueueEl.appendChild(card);
        });
    } catch (e) {
        console.warn('⚠️ addValidationRequest error:', e);
    }
}

function approveImage(classId, userId, imageUrl, cardId) {
    try {
        if (socket && socket.connected) socket.emit('admin_approve_image', { classId, userId: Number(userId), imageUrl });
    } catch(_) {}
    try {
        const el = document.getElementById(cardId);
        if (el && el.parentElement) el.parentElement.removeChild(el);
        if (!validationQueueEl.querySelector('.validation-card')) {
            validationQueueEl.innerHTML = '<p>در حال حاضر درخواستی در صف نیست.</p>';
        }
    } catch(_) {}
}

function rejectImage(cardId) {
    try {
        const el = document.getElementById(cardId);
        if (el && el.parentElement) el.parentElement.removeChild(el);
        if (!validationQueueEl.querySelector('.validation-card')) {
            validationQueueEl.innerHTML = '<p>در حال حاضر درخواستی در صف نیست.</p>';
        }
    } catch(_) {}
}

function removeValidationRequest(userId) {
    if (!validationQueueEl || typeof userId === 'undefined') return;
    try {
        const card = validationQueueEl.querySelector(`.validation-card[data-user-id="${userId}"]`);
        if (card && card.parentElement) card.parentElement.removeChild(card);
        if (!validationQueueEl.querySelector('.validation-card')) {
            validationQueueEl.innerHTML = '<p>در حال حاضر درخواستی در صف نیست.</p>';
        }
    } catch (e) {
        console.warn('⚠️ removeValidationRequest error:', e);
    }
}

// زوم آواتار پروفایل
function openAvatarZoom(avatarSrc, senderName) {
    const avatarModal = document.createElement('div');
    avatarModal.className = 'avatar-zoom-modal';
    avatarModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(15px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: zoom-out;
        animation: avatarModalFadeIn 0.3s ease;
    `;
    
    const avatarContainer = document.createElement('div');
    avatarContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
    `;
    
    const zoomedAvatar = document.createElement('img');
    zoomedAvatar.src = avatarSrc;
    zoomedAvatar.style.cssText = `
        width: 200px;
        height: 200px;
        border-radius: 50%;
        border: 4px solid rgba(0, 255, 255, 0.6);
        box-shadow: 
            0 0 50px rgba(0, 255, 255, 0.4),
            inset 0 0 30px rgba(0, 255, 255, 0.1);
        object-fit: cover;
        cursor: zoom-out;
        animation: avatarZoomIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    const nameLabel = document.createElement('div');
    nameLabel.textContent = senderName;
    nameLabel.style.cssText = `
        color: #ffffff;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        animation: avatarNameIn 0.5s ease 0.2s both;
    `;
    
    // بستن مودال با کلیک
    avatarModal.addEventListener('click', () => {
        avatarModal.style.animation = 'avatarModalFadeOut 0.2s ease';
        zoomedAvatar.style.animation = 'avatarZoomOut 0.2s ease';
        nameLabel.style.animation = 'avatarNameOut 0.2s ease';
        setTimeout(() => {
            document.body.removeChild(avatarModal);
        }, 200);
    });
    
    // بستن با ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            avatarModal.click();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    avatarContainer.appendChild(zoomedAvatar);
    avatarContainer.appendChild(nameLabel);
    avatarModal.appendChild(avatarContainer);
    document.body.appendChild(avatarModal);
    
    // اضافه کردن انیمیشن‌های CSS
    if (!document.querySelector('#avatar-zoom-animations')) {
        const style = document.createElement('style');
        style.id = 'avatar-zoom-animations';
        style.textContent = `
            @keyframes avatarModalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes avatarModalFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes avatarZoomIn {
                from { 
                    opacity: 0; 
                    transform: scale(0.5) rotate(-10deg); 
                }
                to { 
                    opacity: 1; 
                    transform: scale(1) rotate(0deg); 
                }
            }
            @keyframes avatarZoomOut {
                from { 
                    opacity: 1; 
                    transform: scale(1) rotate(0deg); 
                }
                to { 
                    opacity: 0; 
                    transform: scale(0.5) rotate(10deg); 
                }
            }
            @keyframes avatarNameIn {
                from { 
                    opacity: 0; 
                    transform: translateY(20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
            }
            @keyframes avatarNameOut {
                from { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
                to { 
                    opacity: 0; 
                    transform: translateY(-20px); 
                }
            }
        `;
        document.head.appendChild(style);
    }
}
