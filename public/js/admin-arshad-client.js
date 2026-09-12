// public/js/admin-arshad-client.js
(function(){
  if (typeof document === 'undefined') return;
  const socket = io({ query: { isAdmin: true } });

  const root = document.querySelector('.arshad-admin');
  const usersList = document.getElementById('users-list');
  const usersCount = document.getElementById('users-count');
  const messagesEl = document.getElementById('messages');
  const chatInfo = document.getElementById('chat-info');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('message-input');
  const fileInput = document.getElementById('file-input');
  const fileStatus = document.getElementById('file-status');
  const toggleUsersBtn = document.getElementById('toggle-users');
  const closeUsersBtn = document.querySelector('.users-close');
  const templatesModal = document.getElementById('templates-modal');
  const templatesOpenBtn = document.getElementById('templates-open');
  const templatesCloseBtn = document.getElementById('templates-close');

  let currentUserId = null;
  const seenIds = new Set();
  const unreads = new Map(); // userId -> count
  const drafts = new Map();  // userId -> draft text

  function sanitize(s){ return (s || '').replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c])); }
  function scrollBottom(){ try { messagesEl.scrollTop = messagesEl.scrollHeight; } catch(_) {} }

  function updateUnreadBadge(uid, cnt){
    try {
      uid = Number(uid);
      cnt = Number(cnt) > 0 ? Number(cnt) : 0;
      unreads.set(uid, cnt);
      const el = Array.from(usersList.children).find(e => Number(e.dataset.id) === uid);
      if (!el) return;
      const meta = el.querySelector('.meta');
      if (!meta) return;
      let badge = meta.querySelector('.unread');
      if (cnt > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'unread';
          meta.appendChild(badge);
        }
        badge.textContent = String(cnt);
      } else if (badge && badge.parentElement) {
        badge.parentElement.removeChild(badge);
      }
    } catch(_) {}
  }

  function renderUsers(list){
    usersList.innerHTML = '';
    (list || []).forEach(u => {
      const item = document.createElement('div');
      const online = Number(u.is_online) === 1;
      item.className = 'user-item' + (online ? ' online' : '');
      item.dataset.id = u.id;
      const cntRaw = (u && (u.unread_count !== undefined)) ? u.unread_count : 0;
      const cnt = Number(cntRaw) > 0 ? Number(cntRaw) : 0;
      unreads.set(Number(u.id), cnt);
      const badge = cnt > 0 ? `<span class="unread">${cnt}</span>` : '';
      item.innerHTML = `
        <div class="name">${sanitize(u.username || ('#'+u.id))}</div>
        <div class="meta"><span class="status-dot ${online ? 'online' : 'offline'}"></span><span>${online ? 'آنلاین' : 'آفلاین'}</span>${badge}</div>`;
      item.addEventListener('click', () => { selectUser(u.id, u.username); });
      usersList.appendChild(item);
    });

  // Update drafts when typing
  if (input) {
    input.addEventListener('input', () => {
      if (!currentUserId) return;
      drafts.set(Number(currentUserId), input.value || '');
    });
  }
    try { usersCount.textContent = String((list || []).length); } catch(_) {}
  }

  function renderMessage(m){
    if (!m) return;
    const st = (m.sender_type || '').toLowerCase();
    if (st !== 'user' && st !== 'senior') return;
    const msgUserId = (m.user_id != null) ? m.user_id : m.userId;
    if (parseInt(msgUserId, 10) !== parseInt(currentUserId, 10)) return;
    const isUser = st === 'user';
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (isUser ? 'user' : 'senior');
    if (m.id != null) {
      try { wrap.setAttribute('data-message-id', String(m.id)); } catch(_) {}
    }
    let bodyHtml = '';
    if (m.file_url) {
      const ft = (m.file_type || '').toLowerCase();
      if (ft.startsWith('image/')) bodyHtml = `<img src="${m.file_url}" alt="تصویر">`;
      else if (ft.startsWith('video/')) bodyHtml = `<video controls><source src="${m.file_url}" type="${m.file_type || 'video/mp4'}"></video>`;
      else if (ft.startsWith('audio/')) bodyHtml = `<audio controls><source src="${m.file_url}" type="${m.file_type || 'audio/mpeg'}"></audio>`;
      else bodyHtml = `<a href="${m.file_url}" target="_blank" rel="noopener">📎 فایل ضمیمه</a>`;
    } else {
      const txt = sanitize(m.content || '');
      bodyHtml = `<div class="msg-text">${txt}</div>`;
    }
    const ts = new Date(m.timestamp || Date.now()).toLocaleString('fa-IR');
    const mid = m.id != null ? String(m.id) : '';
    const actions = mid ? `<div class="msg-actions"><button class="senior-delete-btn" data-message-id="${mid}">🗑️</button>${m.file_url ? '' : `<button class="senior-edit-btn" data-message-id="${mid}">✏️</button>`}</div>` : '';
    wrap.innerHTML = `${actions}<div class="msg-body">${bodyHtml}<div class="meta">${ts}</div></div>`;
    messagesEl.appendChild(wrap);
  }

  function renderHistory(arr){
    (arr || []).forEach(m => {
      if (!m || m.id == null) return;
      if (seenIds.has(m.id)) return;
      renderMessage(m);
      seenIds.add(m.id);
    });
    scrollBottom();
  }

  function selectUser(userId, username){
    // ذخیره پیش‌نویس کاربر قبلی
    if (currentUserId && input) {
      drafts.set(Number(currentUserId), input.value || '');
    }
    currentUserId = userId;
    Array.from(usersList.children).forEach(el => el.classList.toggle('active', String(el.dataset.id) === String(userId)));
    chatInfo.textContent = `گفت‌وگو با ${username || ('کاربر #' + userId)}`;
    try { messagesEl.innerHTML = ''; seenIds.clear(); } catch(_) {}
    if (input) {
      const draft = drafts.get(Number(userId)) || '';
      input.value = draft;
    }
    try { socket.emit('senior_get_history', { userId }); } catch(_) {}
    // روی موبایل: بعد از انتخاب کاربر، منوی کاربران بسته شود
    if (root && root.classList.contains('users-open')) {
      root.classList.remove('users-open');
    }
    // پیام‌های خوانده نشده این کاربر را صفر کن
    try {
      fetch('/api/mark-as-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }).catch(() => {});
    } catch(_) {}
  }

  socket.on('connect', () => {
    try { socket.emit('get_users_list'); } catch(_) {}
  });

  socket.on('users_list', (list) => { renderUsers(Array.isArray(list) ? list : []); });
  socket.on('users_list_updated', (list) => { renderUsers(Array.isArray(list) ? list : []); });
  socket.on('user_joined', () => { try { socket.emit('get_users_list'); } catch(_) {} });
  socket.on('user_left', () => { try { socket.emit('get_users_list'); } catch(_) {} });
  socket.on('unread_count_update', (data) => {
    try {
      if (!data) return;
      const uid = Number(data.userId);
      const raw = (data.unread_count !== undefined) ? data.unread_count : data.unreadCount;
      updateUnreadBadge(uid, raw);
    } catch(_) {}
  });
  socket.on('senior_history', (items) => { if (currentUserId) renderHistory(Array.isArray(items) ? items : []); });
  socket.on('senior_new_message', (m) => {
    try {
      if (!currentUserId) return;
      if (!m || m.id == null) return;
      if (parseInt(m.user_id, 10) !== parseInt(currentUserId, 10)) return;
      if (seenIds.has(m.id)) return;
      renderMessage(m);
      seenIds.add(m.id);
      scrollBottom();
    } catch(_) {}
  });

  socket.on('senior_message_deleted', (payload) => {
    try {
      const id = payload && payload.messageId;
      if (!id) return;
      const el = document.querySelector(`.msg[data-message-id="${id}"]`);
      if (el && el.parentElement) el.parentElement.removeChild(el);
    } catch(_) {}
  });

  socket.on('senior_message_edited', (payload) => {
    try {
      const id = payload && payload.messageId;
      if (!id) return;
      const wrap = document.querySelector(`.msg[data-message-id="${id}"]`);
      if (!wrap) return;
      const txtEl = wrap.querySelector('.msg-text');
      if (txtEl) txtEl.textContent = payload.content || '';
    } catch(_) {}
  });

  // Send text
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const txt = (input.value || '').trim();
    if (!txt || !currentUserId) return;
    try { socket.emit('senior_admin_message', { userId: currentUserId, content: txt }); } catch(_) {}
    if (input) {
      input.value = '';
      drafts.set(Number(currentUserId), '');
    }
  });

  // Upload file
  fileInput.addEventListener('change', () => {
    if (!currentUserId) { alert('یک کاربر انتخاب کنید'); fileInput.value=''; return; }
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('userId', currentUserId);
    fileStatus.textContent = 'در حال ارسال فایل...'; fileStatus.style.color = '#d4af37';
    fetch('/upload-senior', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(j => {
        if (j && j.success) { fileStatus.textContent = 'فایل ارسال شد'; fileStatus.style.color = '#50c878'; }
        else { fileStatus.textContent = 'خطا در ارسال فایل'; fileStatus.style.color = '#ff6b6b'; }
      })
      .catch(() => { fileStatus.textContent = 'خطا در ارسال فایل'; fileStatus.style.color = '#ff6b6b'; })
      .finally(() => { setTimeout(() => { fileStatus.textContent = ''; }, 2000); fileInput.value=''; });
  });

  // Quick video / audio buttons for senior admin
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-video-btn');
    if (!btn) return;
    if (!currentUserId) { alert('یک کاربر انتخاب کنید'); return; }
    const fileUrl = btn.getAttribute('data-file-url');
    if (!fileUrl) return;
    const label = btn.getAttribute('data-file-name') || btn.textContent.replace('📹', '').trim();
    const fileType = btn.getAttribute('data-file-type') || 'video/mp4';
    try {
      socket.emit('senior_admin_message', {
        userId: currentUserId,
        content: label,
        fileUrl: fileUrl,
        fileType
      });
    } catch(_) {}
  });

  // Message edit/delete buttons for senior admin
  if (messagesEl) {
    messagesEl.addEventListener('click', (e) => {
      const del = e.target.closest('.senior-delete-btn');
      const edt = e.target.closest('.senior-edit-btn');
      if (!del && !edt) return;
      const idAttr = (del || edt).getAttribute('data-message-id');
      const messageId = Number(idAttr);
      if (!messageId) return;
      if (del) {
        if (!confirm('آیا از حذف این پیام مطمئن هستید؟')) return;
        try { socket.emit('senior_admin_delete_message', { messageId }); } catch(_) {}
        return;
      }
      if (edt) {
        let currentText = '';
        try {
          const wrap = e.target.closest('.msg') || document.querySelector(`.msg[data-message-id="${messageId}"]`);
          const txtEl = wrap && wrap.querySelector('.msg-text');
          if (txtEl) currentText = txtEl.textContent || '';
        } catch(_) {}
        const next = prompt('متن جدید پیام را وارد کنید:', (currentText || '').trim());
        if (!next || !next.trim()) return;
        try { socket.emit('senior_admin_edit_message', { messageId, content: next.trim() }); } catch(_) {}
      }
    });
  }

  // Templates modal: open small button, show popup, insert prepared message
  if (templatesModal && templatesOpenBtn) {
    function openTemplates(){
      templatesModal.classList.add('open');
    }
    function closeTemplates(){
      templatesModal.classList.remove('open');
    }

    templatesOpenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openTemplates();
    });

    if (templatesCloseBtn) {
      templatesCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeTemplates();
      });
    }

    // Close when clicking outside dialog
    templatesModal.addEventListener('click', (e) => {
      if (e.target === templatesModal) closeTemplates();
    });

    // Handle template selection
    const list = templatesModal.querySelector('.templates-list') || templatesModal;
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.template-btn');
      if (!btn) return;
      const txt = btn.getAttribute('data-text') || btn.textContent || '';
      if (!input) return;
      input.value = txt;
      if (currentUserId) drafts.set(Number(currentUserId), txt);
      try { input.focus(); } catch(_) {}
      closeTemplates();
    });
  }

  // Mobile: hamburger toggle for users list
  if (toggleUsersBtn && root) {
    toggleUsersBtn.addEventListener('click', () => {
      root.classList.toggle('users-open');
    });
  }
  if (closeUsersBtn && root) {
    closeUsersBtn.addEventListener('click', () => {
      root.classList.remove('users-open');
    });
  }
})();
