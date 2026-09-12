// public/js/admin-validation-client.js
(function(){
  document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    // Declare admin role to join 'admins' room
    socket.on('connect', () => {
      try {
        socket.emit('declare_role', { role: 'admin' });
        socket.emit('admin_register');
      } catch(_) {}
    });

    // DOM
    const tabsContainer = document.getElementById('class-tabs'); // legacy (not used)
    const dossierContainer = document.getElementById('dossier-container');
    let lightbox = null; try {
      lightbox = GLightbox({
        selector: '.glightbox-admin', touchNavigation: true, loop: true,
        openEffect: 'fade', closeEffect: 'fade', width: '95vw', height: 'auto', zoomable: true
      });
    } catch(_) {}

    // State: dossierId -> { dossierId, userId, username, files:[{id,url,state}] }
    const dossiers = {};

    function refreshLightbox() {
      try { if (lightbox && lightbox.reload) lightbox.reload(); } catch(_) {}
    }

    function renderAll() {
      dossierContainer.innerHTML = '';
      Object.values(dossiers).forEach(ds => {
        const section = document.createElement('section');
        section.className = 'dossier';
        section.id = `dossier-card-${ds.dossierId}`;
        const stats = calcStats(ds.files || []);
        section.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <strong>پرونده ${ds.username || ('#' + ds.userId)}</strong>
            <span style="opacity:.7; font-size:12px;">${ds.dossierId}</span>
          </div>
          <div class="dossier-stats" data-dossier="${ds.dossierId}">
            <span class="chip pending">در انتظار: <b>${stats.pending}</b></span>
            <span class="chip approved">تایید: <b>${stats.approved}</b></span>
            <span class="chip rejected">رد: <b>${stats.rejected}</b></span>
          </div>
          <div class="documents-grid"></div>
          <div style="margin-top:8px; display:flex; gap:.5rem;">
            <button class="grant-access">هدایت به گفت‌وگو</button>
            <button class="open-main-admin">رفتن به پنل اصلی چت</button>
          </div>
        `;
        const grid = section.querySelector('.documents-grid');
        (ds.files || []).forEach(doc => {
          const card = document.createElement('div');
          card.className = 'document-card';
          card.id = `doc-${String(doc.id)}`;
          card.innerHTML = `
            <a href="${doc.url}" class="glightbox-admin" data-type="image" data-gallery="${ds.dossierId}">
              <img src="${doc.url}" alt="Document" />
            </a>
            <div style="display:flex; gap:.5rem; margin-top:.5rem;">
              <button class="approve">تایید</button>
              <button class="reject">رد</button>
            </div>`;
          card.querySelector('.approve').addEventListener('click', () => {
            try { socket.emit('admin_update_document_state', { dossierId: ds.dossierId, documentId: doc.id, newState: 'approved' }); } catch(_) {}
          });
          card.querySelector('.reject').addEventListener('click', () => {
            try { socket.emit('admin_update_document_state', { dossierId: ds.dossierId, documentId: doc.id, newState: 'rejected' }); } catch(_) {}
          });
          // apply initial state
          if (doc.state === 'approved') {
            card.classList.add('approved');
            card.querySelector('.approve').disabled = true;
            card.querySelector('.reject').disabled = true;
            const tag = document.createElement('div'); tag.className = 'doc-status approved'; tag.textContent = 'تایید شد'; card.appendChild(tag);
          } else if (doc.state === 'rejected') {
            card.classList.add('rejected');
            card.querySelector('.approve').disabled = true;
            card.querySelector('.reject').disabled = true;
            const tag = document.createElement('div'); tag.className = 'doc-status rejected'; tag.textContent = 'رد شد'; card.appendChild(tag);
          }
          grid.appendChild(card);
        });
        const grantBtn = section.querySelector('.grant-access');
        if (grantBtn) grantBtn.addEventListener('click', () => {
          try {
            // کاربر ابتدا به صفحه انتقال سایبری، سپس از آنجا به ترمینال ارشد هدایت می‌شود
            socket.emit('admin_grant_access', { userId: ds.userId, classId: 'default', chatUrl: `/KaragahArshad/transfer/${ds.userId}` });
            grantBtn.disabled = true;
            grantBtn.textContent = 'هدایت شد';
          } catch(_) {}
        });
        const openAdminBtn = section.querySelector('.open-main-admin');
        if (openAdminBtn) openAdminBtn.addEventListener('click', () => {
          try { window.location.href = '/gostantaniye-arshad?key=110'; } catch(_) {}
        });
        dossierContainer.appendChild(section);
      });
      refreshLightbox();
    }

    function upsertDossier(ds) {
      if (!ds || !ds.dossierId) return;
      dossiers[ds.dossierId] = ds;
      renderAll();
    }

    function calcStats(files) {
      const s = { pending: 0, approved: 0, rejected: 0 };
      (files || []).forEach(f => {
        if (f.state === 'approved') s.approved++;
        else if (f.state === 'rejected') s.rejected++;
        else s.pending++;
      });
      return s;
    }

    function updateStatsUI(dossierId) {
      try {
        const ds = dossiers[dossierId]; if (!ds) return;
        const s = calcStats(ds.files || []);
        const bar = document.querySelector(`.dossier-stats[data-dossier="${dossierId}"]`);
        if (!bar) return;
        const chips = bar.querySelectorAll('.chip');
        chips.forEach(ch => {
          if (ch.classList.contains('pending')) ch.querySelector('b').textContent = String(s.pending);
          if (ch.classList.contains('approved')) ch.querySelector('b').textContent = String(s.approved);
          if (ch.classList.contains('rejected')) ch.querySelector('b').textContent = String(s.rejected);
        });
      } catch(_) {}
    }

    function removeDocFromUI(dossierId, documentId) {
      const section = document.getElementById(`dossier-card-${dossierId}`);
      if (!section) return;
      const el = section.querySelector(`#doc-${CSS.escape(String(documentId))}`);
      if (el && el.parentElement) el.parentElement.removeChild(el);
      refreshLightbox();
    }

    // New dossier events
    socket.on('initial_dossiers', (items) => {
      try {
        if (!Array.isArray(items)) return;
        items.forEach(ds => { if (ds && ds.dossierId) dossiers[ds.dossierId] = ds; });
        renderAll();
      } catch(_) {}
    });
    socket.on('new_dossier', (ds) => {
      try { upsertDossier(ds); } catch(_) {}
    });
    socket.on('dossier_appended', ({ dossierId, files }) => {
      try {
        if (!dossierId || !Array.isArray(files)) return;
        const ds = dossiers[dossierId];
        if (!ds) return;
        ds.files = ds.files.concat(files);
        renderAll();
      } catch(_) {}
    });
    socket.on('dossier_updated', ({ dossierId, documentId, newState, remaining }) => {
      try {
        // Update local state: mark state (do not remove)
        const ds = dossiers[dossierId];
        if (ds && Array.isArray(ds.files)) {
          const it = ds.files.find(f => String(f.id) === String(documentId));
          if (it) it.state = newState;
        }
        // Update UI: toggle classes and disable buttons
        const section = document.getElementById(`dossier-card-${dossierId}`);
        const card = section ? section.querySelector(`#doc-${CSS.escape(String(documentId))}`) : null;
        if (card) {
          card.classList.remove('approved','rejected');
          if (newState === 'approved') card.classList.add('approved');
          if (newState === 'rejected') card.classList.add('rejected');
          const ap = card.querySelector('.approve'); const rj = card.querySelector('.reject');
          if (ap) ap.disabled = true; if (rj) rj.disabled = true;
          // add status tag if missing
          if (!card.querySelector('.doc-status')) {
            const tag = document.createElement('div'); tag.className = `doc-status ${newState}`; tag.textContent = (newState==='approved') ? 'تایید شد' : 'رد شد'; card.appendChild(tag);
          }
          updateStatsUI(dossierId);
        }
      } catch(_) {}
    });
    socket.on('dossier_completed', ({ dossierId }) => {
      try {
        const sec = document.getElementById(`dossier-card-${dossierId}`);
        if (sec) sec.dataset.completed = 'true';
      } catch(_) {}
    });
    socket.on('dossier_removed', ({ dossierId }) => {
      try {
        delete dossiers[dossierId];
        const sec = document.getElementById(`dossier-card-${dossierId}`);
        if (sec && sec.parentElement) sec.parentElement.removeChild(sec);
      } catch(_) {}
    });
    // Legacy helper event to remove all dossiers by userId (after grant access)
    socket.on('request_processed', ({ userId }) => {
      try {
        // در نسخه ارشد، کارت را نگه می‌داریم؛ فقط دکمه هدایت را غیرفعال می‌کنیم
        Object.values(dossiers).forEach(ds => {
          if (Number(ds.userId) === Number(userId)) {
            const sec = document.getElementById(`dossier-card-${ds.dossierId}`);
            if (!sec) return;
            const btn = sec.querySelector('.grant-access');
            if (btn) { btn.disabled = true; btn.textContent = 'هدایت شد'; }
          }
        });
      } catch(_) {}
    });
  });
})();
