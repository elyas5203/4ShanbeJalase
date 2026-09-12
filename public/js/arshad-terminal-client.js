    // لایت‌باکس ساده برای نمایش بزرگ تصویر/ویدیو و لینک دانلود
    function attachMediaHandlers(scope){
      try {
        const lb = document.getElementById('chatLightbox');
        if (!lb) return;
        const img = lb.querySelector('#lightboxImage');
        const vid = lb.querySelector('#lightboxVideo');
        const close = lb.querySelector('#closeChatLightbox');
        function open(type, src){
          if (!lb) return;
          try {
            img.style.display = 'none'; vid.style.display = 'none';
            if (type === 'image') { img.src = src; img.style.display = 'block'; }
            else if (type === 'video') { vid.src = src; vid.style.display = 'block'; }
            lb.style.display = 'flex';
          } catch(_) {}
        }
        function closeLb(){ try { if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load && vid.load(); } } catch(_) {} lb.style.display = 'none'; }
        if (close) close.addEventListener('click', closeLb);
        lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.style.display !== 'none') closeLb(); });
        // image click
        const im = scope.querySelector('.media-image'); if (im) im.addEventListener('click', () => open('image', im.src));
        const vv = scope.querySelector('.media-video'); if (vv) vv.addEventListener('click', () => open('video', vv.currentSrc || vv.querySelector('source')?.src || vv.src));
      } catch(_) {}
    }
// public/js/arshad-terminal-client.js
// نسخه جدید سازگار با UI سایبری و چت واقعی ارشد
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const userId = window.ARSHAD_USER_ID;
    const username = window.ARSHAD_USERNAME || null;
    const socket = io({ query: { userId, username } });

    // المان‌های چت در UI جدید
    const chatDisplay = document.getElementById('chatDisplay');
    const messagesEl = document.getElementById('messages') || chatDisplay;
    const input = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    function baseScrollEl(){ return chatDisplay || messagesEl; }
    function scrollBottom(){
      try {
        const el = baseScrollEl();
        if (el) el.scrollTop = el.scrollHeight;
      } catch(_) {}
    }
    function sanitize(s){
      return (s || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    }

    const seenIds = new Set();

    function markDetectiveFound(){
      try {
        const h = document.getElementById('detectiveStatusHeader');
        if (h) { h.textContent = 'پیدا شد'; h.style.color = '#4ade80'; }
        const p = document.getElementById('detectiveStatusPanel');
        if (p) { p.textContent = 'پیدا شد'; p.style.color = '#4ade80'; }
      } catch(_) {}
    }

    // رندر پیام‌ها در استایل جدید (.message.user-message / .message.detective-message)
    function renderMessage(m){
      if (!m) return;
      const st = (m.sender_type || '').toLowerCase();
      if (st !== 'user' && st !== 'senior') return; // فقط کانال ارشد
      const msgUserId = (m.user_id != null) ? m.user_id : m.userId;
      if (parseInt(msgUserId, 10) !== parseInt(userId, 10)) return;

      const isUser = st === 'user';
      const wrap = document.createElement('div');
      wrap.className = 'message ' + (isUser ? 'user-message' : 'detective-message');
      if (m.id != null) {
        try { wrap.setAttribute('data-message-id', String(m.id)); } catch(_) {}
      }

      const senderName = isUser ? 'شما' : 'کاراگاه ارشد';
      const ts = new Date(m.timestamp || Date.now());
      const timeStr = ts.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let contentHtml = '';
      if (m.file_url) {
        const ft = (m.file_type || '').toLowerCase();
        if (ft.startsWith('image/')) {
          contentHtml = `<div class="media-card" data-src="${m.file_url}" data-type="image">
            <img class="media-image" src="${m.file_url}" alt="تصویر">
          </div>`;
        } else if (ft.startsWith('video/')) {
          contentHtml = `<div class="media-card" data-src="${m.file_url}" data-type="video">
            <video class="media-video" controls preload="metadata"><source src="${m.file_url}" type="${m.file_type || 'video/mp4'}"></video>
          </div>`;
        } else if (ft.startsWith('audio/')) {
          wrap.classList.add('audio-msg');
          contentHtml = `<div class="media-card" data-src="${m.file_url}" data-type="audio">
            <audio class="media-audio" controls preload="metadata"><source src="${m.file_url}" type="${m.file_type || 'audio/mpeg'}"></audio>
          </div>`;
        } else {
          contentHtml = `<div class="media-card"><a href="${m.file_url}" target="_blank" rel="noopener">📎 فایل</a></div>`;
        }
      } else {
        let txt = sanitize(m.content || '');
        // نمایش خط‌های جدید
        txt = txt.replace(/\r?\n/g, '<br>');
        contentHtml = `<p class="msg-text">${txt}</p>`;
      }

      wrap.innerHTML = `
        <div class="message-header">
          <div class="message-sender">${senderName}</div>
          <div class="message-time">${timeStr}</div>
        </div>
        <div class="message-content">${contentHtml}</div>
      `;
      messagesEl.appendChild(wrap);
      attachMediaHandlers(wrap);
    }

    function renderHistory(arr){
      let rescued = false;
      (arr || []).forEach(m => {
        if (!m || m.id == null) return;
        if (seenIds.has(m.id)) return;
        renderMessage(m);
        seenIds.add(m.id);
        try {
          if (!rescued && m.file_url && typeof m.file_url === 'string' && m.file_url.indexOf('move12.mp4') !== -1) {
            rescued = true;
          }
        } catch(_) {}
      });
      if (rescued) markDetectiveFound();
      scrollBottom();
    }

    function requestHistory(){
      try { socket.emit('senior_get_history', { userId }); } catch(_) {}
    }

    // اتصال به سرور و دریافت تاریخچه
    socket.on('connect', () => {
      try {
        socket.emit('declare_role', { role: 'user', userId });
        socket.emit('register_user_socket', { userId });
      } catch(_) {}
      setTimeout(requestHistory, 200);
    });

    socket.on('senior_history', (items) => {
      try { renderHistory(Array.isArray(items) ? items : []); } catch(_) {}
    });

    socket.on('senior_new_message', (m) => {
      try {
        if (!m || m.id == null) return;
        if (seenIds.has(m.id)) return;
        renderMessage(m);
        seenIds.add(m.id);
        try {
          if (m.file_url && typeof m.file_url === 'string' && m.file_url.indexOf('move12.mp4') !== -1) {
            markDetectiveFound();
          }
        } catch(_) {}
        scrollBottom();
      } catch(_) {}
    });

    socket.on('senior_message_deleted', (payload) => {
      try {
        const id = payload && payload.messageId;
        if (!id) return;
        const el = document.querySelector(`.message[data-message-id="${id}"]`);
        if (el && el.parentElement) el.parentElement.removeChild(el);
      } catch(_) {}
    });

    socket.on('senior_message_edited', (payload) => {
      try {
        const id = payload && payload.messageId;
        if (!id) return;
        const wrap = document.querySelector(`.message[data-message-id="${id}"]`);
        if (!wrap) return;
        const txtEl = wrap.querySelector('.msg-text') || wrap.querySelector('.message-content p');
        if (!txtEl) return;
        const safe = sanitize(payload.content || '');
        txtEl.innerHTML = safe.replace(/\r?\n/g, '<br>');
      } catch(_) {}
    });

    // ارسال پیام کاربر از طریق دکمه/اینتر
    function sendUserMessage(){
      if (!input) return;
      const txt = (input.value || '').trim();
      if (!txt) return;
      input.value = '';
      try {
        socket.emit('senior_user_message', { userId, content: txt });
      } catch(_) {}
    }

    if (sendButton) {
      sendButton.addEventListener('click', function(e){
        e.preventDefault();
        sendUserMessage();
      });
    }
    if (input) {
      // Enter = ارسال، Shift+Enter = خط جدید
      input.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendUserMessage();
        }
      });
    }

    // --- منطق پنل‌های ابزار و مدال تصویر (بدون شبیه‌سازی چت) ---
    try {
      const evidencePanel   = document.getElementById('evidencePanel');
      const symbolsPanel    = document.getElementById('symbolsPanel');
      const timelinePanel   = document.getElementById('timelinePanel');
      const medicalPanel    = document.getElementById('medicalPanel');
      const codesPanel      = document.getElementById('codesPanel');
      const locationsPanel  = document.getElementById('locationsPanel');

      const evidenceTool   = document.getElementById('evidenceTool');
      const symbolsTool    = document.getElementById('symbolsTool');
      const timelineTool   = document.getElementById('timelineTool');
      const medicalTool    = document.getElementById('medicalTool');
      const codesTool      = document.getElementById('codesTool');
      const locationsTool  = document.getElementById('locationsTool');

      const imageModal = document.getElementById('imageModal');
      const modalImage = document.getElementById('modalImage');
      const closeModal = document.getElementById('closeModal');

      function clearActiveTools(){
        try {
          document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active-tool'));
        } catch(_) {}
      }

      function showPanel(btn, panel){
        if (!panel || !btn) return;
        clearActiveTools();
        btn.classList.add('active-tool');
        panel.style.display = 'flex';
      }

      if (evidenceTool && evidencePanel) {
        evidenceTool.addEventListener('click', () => showPanel(evidenceTool, evidencePanel));
        const closeBtn = document.getElementById('closeEvidencePanel');
        if (closeBtn) closeBtn.addEventListener('click', () => {
          evidencePanel.style.display = 'none';
          evidenceTool.classList.remove('active-tool');
        });
      }

      if (symbolsTool && symbolsPanel) {
        symbolsTool.addEventListener('click', () => showPanel(symbolsTool, symbolsPanel));
        const closeBtn = document.getElementById('closeSymbolsPanel');
        if (closeBtn) closeBtn.addEventListener('click', () => {
          symbolsPanel.style.display = 'none';
          symbolsTool.classList.remove('active-tool');
        });
      }

      if (timelineTool && timelinePanel) {
        timelineTool.addEventListener('click', () => showPanel(timelineTool, timelinePanel));
        const closeBtn = document.getElementById('closeTimelinePanel');
        if (closeBtn) closeBtn.addEventListener('click', () => {
          timelinePanel.style.display = 'none';
          timelineTool.classList.remove('active-tool');
        });
      }

      if (medicalTool && medicalPanel) {
        medicalTool.addEventListener('click', () => showPanel(medicalTool, medicalPanel));
        const closeBtn = document.getElementById('closeMedicalPanel');
        if (closeBtn) closeBtn.addEventListener('click', () => {
          medicalPanel.style.display = 'none';
          medicalTool.classList.remove('active-tool');
        });
      }

      if (codesTool && codesPanel) {
        codesTool.addEventListener('click', () => showPanel(codesTool, codesPanel));
        const closeBtn = document.getElementById('closeCodesPanel');
        if (closeBtn) closeBtn.addEventListener('click', () => {
          codesPanel.style.display = 'none';
          codesTool.classList.remove('active-tool');
        });
      }

      if (locationsTool && locationsPanel) {
        locationsTool.addEventListener('click', () => showPanel(locationsTool, locationsPanel));
        const closeBtn = document.getElementById('closeLocationsPanel');
        if (closeBtn) closeBtn.addEventListener('click', () => {
          locationsPanel.style.display = 'none';
          locationsTool.classList.remove('active-tool');
        });
      }

      // گالری مدارک تصویری و مدال
      try {
        document.querySelectorAll('.evidence-item').forEach(item => {
          item.addEventListener('click', function(){
            if (!imageModal || !modalImage) return;
            const imageSrc = this.getAttribute('data-image');
            modalImage.src = imageSrc || '';
            imageModal.style.display = 'flex';
          });
        });
      } catch(_) {}

      if (closeModal && imageModal) {
        closeModal.addEventListener('click', function(){
          imageModal.style.display = 'none';
        });
      }

      if (imageModal) {
        imageModal.addEventListener('click', function(e){
          if (e.target === imageModal) {
            imageModal.style.display = 'none';
          }
        });
      }
    } catch(_) {}
  });
})();
