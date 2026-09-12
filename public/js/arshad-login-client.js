// public/js/arshad-login-client.js
// کلاینت احراز هویت ارشد - اسکن، آپلود، و تعامل با Socket.IO

(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // If V2 dossier UI exists, skip legacy scanner/login flows to avoid conflicts
    try { if (document.getElementById('dossier-gallery')) return; } catch(_) {}
    // عناصر DOM
    const videoEl = document.getElementById('camera-feed');
    const canvasEl = document.getElementById('snapshot-canvas');
    const scanBtn = document.getElementById('scan-button');
    const submitBtn = document.getElementById('submit-dossier-button');
    const accessCodeInput = document.getElementById('access-code');
    const statusPanel = document.getElementById('status-panel');
    const statusMessage = document.getElementById('status-message');
    const scannerWindow = document.querySelector('.scanner-window');
    const scanLine = document.getElementById('scan-line');
    const scannerWrapper = document.getElementById('scanner-wrapper');
    const loginFormWrapper = document.getElementById('login-form-wrapper');
    const loginForm = document.getElementById('login-form');
    const scannedImagePreview = document.getElementById('scanned-image-preview');
    const teamGrid = document.getElementById('team-grid');

    // ابزارها
    function getQueryParam(name) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    }
    function show(el) { if (el) el.classList.remove('hidden'); }
    function hide(el) { if (el) el.classList.add('hidden'); }

    // اتصال Socket.IO
    const classId = getQueryParam('classId') || 'default';
    const socket = io();
    let currentUserId = null;
    try { const su = Number(localStorage.getItem('ARSHAD_UID') || 0); if (su) currentUserId = su; } catch(_) {}
    try { window.__arshadSocket = socket; } catch(_) {}
    socket.on('connect', () => {
      try { socket.emit('register_socket', { classId: classId, userId: currentUserId || undefined }); } catch(_) {}
    });
    socket.on('user_identity', ({ userId }) => {
      try {
        if (userId && Number(userId)) {
          currentUserId = Number(userId);
          try { localStorage.setItem('ARSHAD_UID', String(currentUserId)); } catch(_) {}
          socket.emit('register_socket', { classId: classId, userId: currentUserId });
        }
      } catch(_) {}
    });

    // لابی: بازپخش اعضای تاییدشده و تایید جدید
    socket.on('lobby_snapshot', (members) => {
      try {
        if (Array.isArray(members)) {
          members.forEach(m => {
            const url = (m && Array.isArray(m.scanUrls) && m.scanUrls[0]) || (m && m.scanUrl);
            if (url) addTeamMemberCard(url);
          });
        }
      } catch (e) { console.warn('lobby_snapshot handler error:', e); }
    });
    socket.on('member_approved', ({ member }) => {
      try {
        const url = (member && Array.isArray(member.scanUrls) && member.scanUrls[0]) || (member && member.scanUrl);
        if (url) addTeamMemberCard(url);
      } catch(_) {}
    });

    socket.on('validation_pending', ({ message }) => {
      show(statusPanel);
      statusMessage.textContent = message || 'در انتظار تایید...';
    });
    socket.on('validation_result', ({ success, message }) => {
      show(statusPanel);
      statusMessage.textContent = message || (success ? 'تایید شد' : 'رد شد');
      if (submitBtn) submitBtn.disabled = false;
    });
    socket.on('scan_rejected', ({ message }) => {
      show(statusPanel);
      statusMessage.textContent = message || 'درخواست شما رد شد.';
      if (submitBtn) submitBtn.disabled = false;
    });

    // دسترسی نهایی توسط ادمین
    socket.on('access_granted', ({ chatUrl }) => {
      try {
        const target = chatUrl && typeof chatUrl === 'string' ? chatUrl : '/updating';
        window.location.href = target;
      } catch(_) {}
    });

    let isScanning = false;
    let mediaStream = null;
    let scannedImageBlob = null;

    async function waitForVideoReady() {
      if (!videoEl) return;
      try {
        if (videoEl.readyState >= 2 && videoEl.videoWidth && videoEl.videoHeight) return;
        await new Promise((res) => {
          const onMeta = () => { videoEl.removeEventListener('loadedmetadata', onMeta); res(); };
          videoEl.addEventListener('loadedmetadata', onMeta);
        });
      } catch(_) {}
    }
    async function startCamera() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoEl.srcObject = mediaStream;
        await videoEl.play();
        await waitForVideoReady();
      } catch (err) {
        alert('امکان دسترسی به دوربین وجود ندارد.');
        throw err;
      }
    }
    function stopCamera() {
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach(t => { try { t.stop(); } catch(_) {} });
          mediaStream = null;
        }
        videoEl.srcObject = null;
      } catch(_) {}
    }
    function takeSnapshotToBlob() {
      const w = videoEl.videoWidth || 640;
      const h = videoEl.videoHeight || 480;
      canvasEl.width = w;
      canvasEl.height = h;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, w, h);
      return new Promise((resolve) => {
        canvasEl.toBlob((blob) => { resolve(blob); }, 'image/jpeg', 0.9);
      });
    }
    function runCinematicScan(onComplete) {
      if (isScanning) return;
      isScanning = true;
      scanBtn.disabled = true;
      try { if (scanLine) gsap.set(scanLine, { y: -10, opacity: 0.8 }); } catch(_) {}
      const height = (scannerWindow && scannerWindow.clientHeight) ? scannerWindow.clientHeight : (videoEl ? (videoEl.offsetHeight || 240) : 240);
      const tl = gsap.timeline({
        onComplete: () => {
          isScanning = false;
          try { if (scanLine) gsap.to(scanLine, { opacity: 0, duration: 0.3 }); } catch(_) {}
          scanBtn.disabled = false;
          if (onComplete) onComplete();
        }
      });
      tl.to(scanLine, { y: height, duration: 1.5, ease: 'power1.inOut', repeat: 1, yoyo: true })
        .to(videoEl, { filter: 'brightness(1.35) contrast(1.06)', duration: 0.1, repeat: 6, yoyo: true }, "-=1.4");
    }

    // Create cyber 3D overlays once
    function ensureScannerFX() {
      if (!scannerWindow) return;
      try {
        if (!scannerWindow.querySelector('.fx-grid')) {
          const g = document.createElement('div'); g.className = 'fx-grid'; scannerWindow.appendChild(g);
        }
        if (!scannerWindow.querySelector('.fx-glitch')) {
          const gl = document.createElement('div'); gl.className = 'fx-glitch'; scannerWindow.appendChild(gl);
        }
        if (!scannerWindow.querySelector('.fx-scanlines')) {
          const s = document.createElement('div'); s.className = 'fx-scanlines'; scannerWindow.appendChild(s);
        }
        if (!scannerWindow.querySelector('.fx-glow')) {
          const g = document.createElement('div'); g.className = 'fx-glow'; scannerWindow.appendChild(g);
        }
        if (!scannerWindow.querySelector('.fx-vignette')) {
          const v = document.createElement('div'); v.className = 'fx-vignette'; scannerWindow.appendChild(v);
        }
      } catch(_) {}
    }

    // 4s cyber scan for file preview (3D tilt + grid + glow + moving scan line)
    async function runFilePreviewScan(durationMs = 4000) {
      return new Promise((resolve) => {
        try {
          ensureScannerFX();
          const h = (scannerWindow && scannerWindow.clientHeight) ? scannerWindow.clientHeight : 240;
          const cycles = Math.max(1, Math.round(durationMs / 1200)); // ~1.2s per pass
          gsap.set(scannerWindow, { transformPerspective: 800, perspective: 800 });
          if (scanLine) gsap.set(scanLine, { y: -20, opacity: 0.95 });
          // Master timeline ~ durationMs and hard cap to ensure min duration
          let done = false; const safety = setTimeout(() => { if (!done) { done = true; resolve(); } }, Math.max(0, durationMs + 100));
          const tl = gsap.timeline({ onComplete: () => {
            try { if (scanLine) gsap.to(scanLine, { opacity: 0, duration: 0.35 }); } catch(_) {}
            try { gsap.to(scannerWindow, { rotateX: 0, rotateY: 0, duration: 0.35, ease: 'power2.out' }); } catch(_) {}
            if (!done) { done = true; clearTimeout(safety); resolve(); }
          }});
          // 3D tilt oscillation
          tl.to(scannerWindow, { rotateX: 7, rotateY: -6, duration: 0.5, ease: 'sine.inOut' })
            .to(scannerWindow, { rotateX: -5, rotateY: 5, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '<');
          // Grid and glow pulses
          tl.to('.fx-grid', { opacity: 0.22, duration: 0.3, ease: 'power2.inOut' }, '<')
            .to('.fx-glow', { opacity: 0.35, duration: 0.3, ease: 'power2.inOut' }, '<');
          // Repeated scan passes
          for (let i = 0; i < cycles; i++) {
            tl.to(scanLine, { y: h + 30, duration: 1.0, ease: 'power2.inOut' })
              .set(scanLine, { y: -30 })
              .to('.fx-grid', { opacity: 0.12 + 0.06 * (i % 2), duration: 0.25 }, '<-0.85')
              .to('.fx-glow', { opacity: 0.25 + 0.1 * ((i+1) % 2), duration: 0.25 }, '<');
          }
          // Fade overlays out towards the end
          tl.to('.fx-grid', { opacity: 0.08, duration: 0.25 }, '>-0.1')
            .to('.fx-glow', { opacity: 0.0, duration: 0.25 }, '<');
        } catch(_) { resolve(); }
      });
    }
    function addTeamMemberCard(imageUrl) {
      try {
        if (!teamGrid) return;
        const card = document.createElement('div');
        card.className = 'team-member-card';
        card.innerHTML = `<img src="${imageUrl}" alt="member" />`;
        teamGrid.appendChild(card);
        try { gsap.from(card, { duration: 0.45, scale: 0.6, opacity: 0, ease: 'back.out(1.7)' }); } catch(_) {}
      } catch (e) { console.warn('addTeamMemberCard error', e); }
    }

    // کلیک اسکن (تک اسکن)
    if (scanBtn) scanBtn.addEventListener('click', async () => {
      try {
        scanBtn.disabled = true;
        await startCamera();
        runCinematicScan(async () => {
          const blob = await takeSnapshotToBlob();
          stopCamera();
          if (blob) {
            scannedImageBlob = blob;
            const url = URL.createObjectURL(blob);
            if (scannedImagePreview) scannedImagePreview.src = url;
            if (scannerWrapper) scannerWrapper.classList.add('hidden');
            if (loginFormWrapper) loginFormWrapper.classList.remove('hidden');
          }
        });
      } catch (e) {
        console.warn('snapshot failed:', e);
        alert('خطا در گرفتن عکس.');
      } finally {
        try { if (scanBtn) scanBtn.disabled = false; } catch(_) {}
      }
    });

    // ارسال: آپلود تک عکس و سپس ارسال فرآیند اسکن
    if (loginForm) loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const accessCode = (accessCodeInput && accessCodeInput.value || '').trim();
        if (!accessCode || !scannedImageBlob) {
          alert('ابتدا اسکن انجام دهید و کد دسترسی را وارد کنید.');
          return;
        }
        if (submitBtn) submitBtn.disabled = true;
        show(statusPanel);
        statusMessage.textContent = 'در حال بارگذاری تصویر...';
        const fd = new FormData();
        fd.append('scanImage', scannedImageBlob, 'scan.jpg');
        const res = await fetch('/KaragahArshad/upload-scan', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.success || !data.url) {
          alert('آپلود تصویر ناموفق بود');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        statusMessage.textContent = 'ارسال برای تایید اپراتور...';
        socket.emit('process_scan', { classId: classId, access_code: accessCode, imageUrl: data.url });
      } catch (e) {
        console.error('submit dossier failed:', e);
        alert('خطا در ارسال پرونده');
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    // وضعیت انتظار تایید
    socket.on('scan_pending', ({ message }) => {
      try {
        show(statusPanel);
        statusMessage.textContent = message || 'تصویر شما برای تایید ارسال شد...';
      } catch(_) {}
    });

    // دریافت رد شدن یک مدرک از سمت ادمین
    socket.on('document_rejected', ({ documentId }) => {
      try {
        if (!documentId) return;
        const el = document.getElementById(String(documentId));
        if (el) {
          el.classList.add('rejected');
          try { gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.35, ease: 'power2.out' }); } catch(_) {}
        }
      } catch(_) {}
    });

    // پس‌زمینه سینمایی با tsparticles
    try {
      if (window.tsParticles && document.getElementById('tsparticles-bg')) {
        tsParticles.load('tsparticles-bg', {
          background: { color: { value: '#030712' } },
          particles: {
            number: { value: 40 },
            size: { value: 2 },
            move: { enable: true, speed: 0.6 },
            color: { value: ['#10B981', '#38BDF8'] },
            links: { enable: true, color: '#38BDF8', opacity: 0.3 }
          },
          fullScreen: { enable: false },
          detectRetina: true
        });
      }
    } catch(_) {}
  });
})();

// ========== V2: Multi-document Dossier UI (non-breaking enhancement) ==========
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // If the new UI is not present, skip
    const scanBtn = document.getElementById('scan-camera-btn');
    const uploadInput = document.getElementById('upload-file-input');
    const gallery = document.getElementById('dossier-gallery') || document.getElementById('scans-gallery');
    const submitBtn = document.getElementById('submit-dossier-btn') || document.getElementById('submit-dossier-button');
    const accessInput = document.getElementById('access-code');
    const statusMessage = document.getElementById('status-message');
    const videoEl = document.getElementById('camera-feed');
    const canvasEl = document.getElementById('snapshot-canvas');
    const scanLine = document.getElementById('scan-line');
    const scannerWindow = document.querySelector('.scanner-window');
    if (!scanBtn || !gallery) return;

    const socket = (typeof window !== 'undefined' && window.__arshadSocket) ? window.__arshadSocket : io();
    let currentUserId = null; try { const su = Number(localStorage.getItem('ARSHAD_UID') || 0); if (su) currentUserId = su; } catch(_) {}
    // Register basic lobby mapping and handle access redirect (fix redirect issue in V2)
    try {
      socket.on('connect', () => { try { socket.emit('register_socket', { classId: 'default', userId: currentUserId || undefined }); } catch(_) {} });
      socket.on('access_granted', ({ chatUrl }) => {
        try {
          const target = (chatUrl && typeof chatUrl === 'string') ? chatUrl : '/updating';
          try { document.body.style.transition = 'opacity .6s ease'; document.body.style.opacity = '0'; } catch(_) {}
          setTimeout(() => { window.location.href = target; }, 650);
        } catch(_) {}
      });
      socket.on('user_identity', ({ userId }) => {
        try {
          if (userId && Number(userId)) {
            currentUserId = Number(userId);
            try { localStorage.setItem('ARSHAD_UID', String(currentUserId)); } catch(_) {}
            socket.emit('register_socket', { classId: 'default', userId: currentUserId });
          }
        } catch(_) {}
      });
    } catch(_) {}

    let mediaStream = null;
    let dossierFiles = []; // { id, blob }

    // ===== SFX (WebAudio short beeps) =====
    let sfxEnabled = true;
    const sfxToggleBtn = document.getElementById('scan-sfx-toggle');
    if (sfxToggleBtn) sfxToggleBtn.addEventListener('click', () => {
      sfxEnabled = !sfxEnabled;
      try { sfxToggleBtn.textContent = 'SFX: ' + (sfxEnabled ? 'روشن' : 'خاموش'); } catch(_) {}
    });
    let audioCtx = null;
    function ensureAudioCtx() { try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) {} }
    function playTick(freqStart = 1200, freqEnd = 900, durationMs = 80) {
      if (!sfxEnabled) return;
      try {
        ensureAudioCtx(); if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.linearRampToValueAtTime(freqEnd, now + durationMs/1000);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs/1000);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now); osc.stop(now + durationMs/1000 + 0.02);
      } catch(_) {}
    }

    async function ensureCamera() {
      try {
        if (mediaStream) return;
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          await videoEl.play().catch(()=>{});
        }
      } catch (e) {
        console.warn('camera access failed', e);
      }
    }

    function takeSnapshotToBlob() {
      if (!videoEl || !canvasEl) return Promise.resolve(null);
      const w = videoEl.videoWidth || 640;
      const h = videoEl.videoHeight || 360;
      canvasEl.width = w;
      canvasEl.height = h;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, w, h);
      return new Promise((resolve) => canvasEl.toBlob((b)=>resolve(b), 'image/jpeg', 0.9));
    }

    function runCinematicScan(onComplete) {
      try {
        if (!scanLine) return onComplete && onComplete();
        const height = videoEl ? (videoEl.offsetHeight || 240) : 240;
        gsap.timeline({ onComplete })
          .set(scanLine, { y: -10, opacity: 0.8 })
          .to(scanLine, { y: height, duration: 1.2, ease: 'power1.inOut', repeat: 1, yoyo: true })
          .to(scanLine, { opacity: 0, duration: 0.25 });
      } catch(_) { if (onComplete) onComplete(); }
    }

    function stopCamera() {
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach(t => { try { t.stop(); } catch(_) {} });
          mediaStream = null;
        }
        if (videoEl) videoEl.srcObject = null;
      } catch(_) {}
    }

    function ensureScannerFX() {
      if (!scannerWindow) return;
      try {
        if (!scannerWindow.querySelector('.fx-grid')) {
          const g = document.createElement('div'); g.className = 'fx-grid'; scannerWindow.appendChild(g);
        }
        if (!scannerWindow.querySelector('.fx-scanlines')) {
          const s = document.createElement('div'); s.className = 'fx-scanlines'; scannerWindow.appendChild(s);
        }
        if (!scannerWindow.querySelector('.fx-glow')) {
          const g = document.createElement('div'); g.className = 'fx-glow'; scannerWindow.appendChild(g);
        }
        if (!scannerWindow.querySelector('.fx-glitch')) {
          const gl = document.createElement('div'); gl.className = 'fx-glitch'; scannerWindow.appendChild(gl);
        }
        if (!scannerWindow.querySelector('.fx-vignette')) {
          const v = document.createElement('div'); v.className = 'fx-vignette'; scannerWindow.appendChild(v);
        }
      } catch(_) {}
    }

    // ===== Three.js cinematic scanner (shader-based) =====
    let threeCtxV2 = null;
    function ensureThreeScannerV2() {
      if (!scannerWindow || typeof THREE === 'undefined') return null;
      if (threeCtxV2 && threeCtxV2.renderer) return threeCtxV2;
      const width = scannerWindow.clientWidth || 640;
      const height = scannerWindow.clientHeight || 400;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.domElement.className = 'three-scan';
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.zIndex = '5';
      renderer.domElement.style.pointerEvents = 'none';
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);
      const uniforms = {
        uTex: { value: null },
        uTime: { value: 0 },
        uBeam: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTexResolution: { value: new THREE.Vector2(1, 1) }
      };
      const vertexShader = `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `;
      const fragmentShader = `
        precision highp float;
        uniform sampler2D uTex; uniform float uTime; uniform float uBeam; uniform vec2 uResolution; uniform vec2 uTexResolution; varying vec2 vUv;
        vec2 containUv(vec2 uv, vec2 res, vec2 tex) { float r = res.x / res.y; float tr = tex.x / tex.y; vec2 s = (tr > r) ? vec2(r/tr, 1.0) : vec2(1.0, tr/r); return (uv - 0.5) * s + 0.5; }
        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec2 uv = vUv; vec2 uvImg = containUv(uv, uResolution, uTexResolution);
          float d = abs(uvImg.y - uBeam);
          float beamLine = 1.0 - smoothstep(0.0, 0.02, d);
          float shiftBase = 0.003 + 0.002 * sin(uvImg.y * 150.0 + uTime * 8.0);
          float block = step(0.96, fract(sin(uvImg.y * 50.0 + uTime * 3.0) * 43758.5453));
          float glitch = block * 0.02; float influence = 1.0 - smoothstep(0.03, 0.22, d); float shift = (shiftBase + glitch) * influence; vec2 off = vec2(shift, 0.0);
          vec4 cR = texture2D(uTex, uvImg + off); vec4 cG = texture2D(uTex, uvImg); vec4 cB = texture2D(uTex, uvImg - off); vec3 col = vec3(cR.r, cG.g, cB.b);
          float lines = sin(uvImg.y * uResolution.y * 1.5); col *= 1.0 - 0.04 * lines; // scanlines
          vec3 glow = vec3(0.2, 0.7, 0.9) * pow(beamLine, 1.5) * 1.2; col += glow; // cyan beam glow
          float n = rand(uvImg * 400.0 + uTime); col += (n - 0.5) * 0.02; // noise
          vec2 p = uv - 0.5; float vig = smoothstep(0.9, 0.2, dot(p,p)); col *= mix(1.0, 0.94, vig); // vignette
          gl_FragColor = vec4(col, 1.0);
        }
      `;
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
      const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
      // Postprocessing (Bloom + Film)
      let composer = null;
      try {
        const post = (typeof window !== 'undefined') ? window.THREE_POST : null;
        if (post && post.EffectComposer && post.RenderPass && post.UnrealBloomPass && post.FilmPass) {
          composer = new post.EffectComposer(renderer);
          const rp = new post.RenderPass(scene, camera);
          const bloom = new post.UnrealBloomPass(new THREE.Vector2(width, height), 1.05, 0.6, 0.18);
          const film = new post.FilmPass(0.3, 0.5, 648, false);
          composer.addPass(rp);
          composer.addPass(bloom);
          composer.addPass(film);
        }
      } catch(_) {}
      scannerWindow.appendChild(renderer.domElement);
      threeCtxV2 = { renderer, scene, camera, geometry, material, mesh, uniforms, composer, animId: 0 };
      return threeCtxV2;
    }
    function disposeThreeScannerV2() {
      if (!threeCtxV2) return;
      try { if (threeCtxV2.animId) cancelAnimationFrame(threeCtxV2.animId); } catch(_) {}
      try { if (threeCtxV2.mesh) threeCtxV2.scene.remove(threeCtxV2.mesh); } catch(_) {}
      try { threeCtxV2.geometry.dispose(); } catch(_) {}
      try { threeCtxV2.material.dispose(); } catch(_) {}
      try { if (threeCtxV2.uniforms && threeCtxV2.uniforms.uTex && threeCtxV2.uniforms.uTex.value) threeCtxV2.uniforms.uTex.value.dispose(); } catch(_) {}
      try { if (threeCtxV2.renderer) threeCtxV2.renderer.dispose(); } catch(_) {}
      try { if (threeCtxV2.renderer && threeCtxV2.renderer.domElement && threeCtxV2.renderer.domElement.parentNode) threeCtxV2.renderer.domElement.parentNode.removeChild(threeCtxV2.renderer.domElement); } catch(_) {}
      threeCtxV2 = null;
    }
    async function runThreeScanV2(url, durationMs = 7000) {
      return new Promise((resolve) => {
        if (typeof THREE === 'undefined') { runFilePreviewScan(durationMs).then(resolve).catch(resolve); return; }
        const ctx = ensureThreeScannerV2(); if (!ctx) { runFilePreviewScan(durationMs).then(resolve).catch(resolve); return; }
        const loader = new THREE.TextureLoader();
        loader.load(url, (tex) => {
          try {
            tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; ctx.uniforms.uTex.value = tex;
            const iw = (tex.image && tex.image.width) ? tex.image.width : 1920; const ih = (tex.image && tex.image.height) ? tex.image.height : 1080;
            ctx.uniforms.uTexResolution.value.set(iw, ih);
            const w = scannerWindow.clientWidth || 640; const h = scannerWindow.clientHeight || 400;
            ctx.uniforms.uResolution.value.set(w, h); ctx.renderer.setSize(w, h); try { if (ctx.composer) ctx.composer.setSize(w, h); } catch(_) {}
            const start = performance.now(); let lastStep = -1;
            const animate = (now) => {
              const t = (now - start); ctx.uniforms.uTime.value = t * 0.001;
              const p = Math.min(1.0, Math.max(0.0, t / durationMs));
              ctx.uniforms.uBeam.value = -0.1 + 1.2 * p;
              // SFX ticks synced to beam progress (~each second)
              try { const step = Math.floor(p * 6.5); if (step > lastStep) { lastStep = step; playTick(); } } catch(_) {}
              if (ctx.composer) ctx.composer.render(); else ctx.renderer.render(ctx.scene, ctx.camera);
              if (t < durationMs) ctx.animId = requestAnimationFrame(animate); else { resolve(); }
            };
            ctx.animId = requestAnimationFrame(animate);
          } catch(_) { resolve(); }
        }, () => {}, () => { resolve(); });
      }).finally(() => { disposeThreeScannerV2(); });
    }

    async function runFilePreviewScan(durationMs = 4000) {
      return new Promise((resolve) => {
        try {
          ensureScannerFX();
          // keep scan-line at top-most stacking order
          if (scannerWindow && scanLine) {
            try {
              scanLine.style.zIndex = '2147483647';
              scanLine.style.pointerEvents = 'none';
              scanLine.style.position = 'absolute';
              scannerWindow.appendChild(scanLine);
            } catch(_) {}
          }
          const h = (scannerWindow && scannerWindow.clientHeight) ? scannerWindow.clientHeight : 240;
          const cycles = Math.max(1, Math.round(durationMs / 1200));
          gsap.set(scannerWindow, { transformPerspective: 800, perspective: 800 });
          if (scanLine) gsap.set(scanLine, { y: -20, opacity: 0.95 });
          const start = Date.now();
          const tl = gsap.timeline({ onComplete: () => {
            try { if (scanLine) gsap.to(scanLine, { opacity: 0, duration: 0.35 }); } catch(_) {}
            try { gsap.to(scannerWindow, { rotateX: 0, rotateY: 0, duration: 0.35, ease: 'power2.out' }); } catch(_) {}
            try { gsap.to(scannerWindow, { filter: 'none', duration: 0.2 }); } catch(_) {}
            const elapsed = Date.now() - start; const remain = Math.max(0, durationMs - elapsed);
            setTimeout(resolve, remain);
          }});
          // 3D tilt
          tl.to(scannerWindow, { rotateX: 7, rotateY: -6, duration: 0.5, ease: 'sine.inOut' })
            .to(scannerWindow, { rotateX: -5, rotateY: 5, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '<');
          // overlay pulses
          tl.to('.fx-grid', { opacity: 0.22, duration: 0.3, ease: 'power2.inOut' }, '<')
            .to('.fx-glow', { opacity: 0.35, duration: 0.3, ease: 'power2.inOut' }, '<')
            .to('.fx-glitch', { opacity: 0.22, duration: 0.2, yoyo: true, repeat: cycles }, '<')
            .to(scannerWindow, { filter: 'saturate(1.15) contrast(1.06) hue-rotate(8deg)', duration: 0.25, yoyo: true, repeat: cycles }, '<');
          // scan passes
          for (let i = 0; i < cycles; i++) {
            tl.to(scanLine, { y: h + 30, duration: 1.0, ease: 'power2.inOut' })
              .set(scanLine, { y: -30 })
              .to('.fx-grid', { opacity: 0.12 + 0.06 * (i % 2), duration: 0.25 }, '<-0.85')
              .to('.fx-glow', { opacity: 0.25 + 0.1 * ((i+1) % 2), duration: 0.25 }, '<');
          }
          // fade out overlays
          tl.to('.fx-grid', { opacity: 0.08, duration: 0.25 }, '>-0.1')
            .to('.fx-glow', { opacity: 0.0, duration: 0.25 }, '<')
            .to('.fx-glitch', { opacity: 0.0, duration: 0.2 }, '<');
        } catch(_) { resolve(); }
      });
    }

    function refreshLightbox() {
      try {
        if (typeof GLightbox === 'undefined') return;
        if (window.__dossierLb && typeof window.__dossierLb.destroy === 'function') {
          window.__dossierLb.destroy();
        }
        window.__dossierLb = GLightbox({
          selector: '.glightbox',
          touchNavigation: true,
          loop: true,
          openEffect: 'fade',
          closeEffect: 'fade',
          width: '95vw',
          height: 'auto',
          zoomable: true
        });
      } catch(_) {}
    }

    function animateThumbScan(wrap) {
      try {
        const line = wrap.querySelector('.scan-overlay .scan-line');
        if (!line) return;
        const h = wrap.clientHeight || 100;
        gsap.set(line, { y: -20, opacity: 0.9 });
        gsap.to(line, { y: h + 20, duration: 1.1, ease: 'power1.inOut', onComplete: () => gsap.to(line, { opacity: 0, duration: 0.25 }) });
      } catch(_) {}
    }

    function addFileToDossier(blob, withScanOverlay) {
      if (!blob) return;
      const docId = 'doc-' + Date.now();
      dossierFiles.push({ id: docId, blob });
      const url = URL.createObjectURL(blob);
      const wrap = document.createElement('div');
      wrap.className = 'scan-thumbnail';
      wrap.id = docId;
      wrap.innerHTML = `
        <a href="${url}" class="glightbox" data-type="image" data-gallery="dossier"><img src="${url}" alt="scan"></a>
        <div class="scan-overlay"><div class="scan-line" style="position:absolute; left:0; right:0; height:14px; background:linear-gradient(180deg, rgba(56,189,248,0) 0%, rgba(56,189,248,0.7) 50%, rgba(56,189,248,0) 100%); box-shadow:0 0 16px rgba(56,189,248,0.6);"></div></div>
        <span class="status-badge pending">در انتظار</span>
        <button class="delete-btn" title="حذف">×</button>`;
      gallery.appendChild(wrap);
      refreshLightbox();
      // set exact dimensions for GLightbox to avoid small viewbox
      const anchor = wrap.querySelector('a.glightbox');
      const imgEl = wrap.querySelector('img');
      if (imgEl && anchor) {
        imgEl.addEventListener('load', () => {
          try {
            anchor.setAttribute('data-width', String(imgEl.naturalWidth || 1920));
            anchor.setAttribute('data-height', String(imgEl.naturalHeight || 1080));
            refreshLightbox();
          } catch(_) {}
        }, { once: true });
      }
      if (withScanOverlay) animateThumbScan(wrap);
      const del = wrap.querySelector('.delete-btn');
      if (del) del.addEventListener('click', () => {
        dossierFiles = dossierFiles.filter(f => f.id !== docId);
        wrap.remove();
      });
    }

    if (scanBtn) scanBtn.addEventListener('click', async () => {
      try {
        await ensureCamera();
        runCinematicScan(async () => {
          const blob = await takeSnapshotToBlob();
          addFileToDossier(blob);
        });
      } catch (e) { console.warn('scan failed', e); }
    });

    async function previewInScanner(file) {
      return new Promise((resolve) => {
        try {
          stopCamera();
          const url = URL.createObjectURL(file);
          let img = scannerWindow.querySelector('img.scanner-preview');
          if (!img) {
            img = document.createElement('img');
            img.className = 'scanner-preview';
            scannerWindow.appendChild(img);
          }
          img.style.display = 'none';
          img.src = url;
          img.onload = async () => {
            try {
              if (scanLine && scannerWindow) {
                scanLine.style.zIndex = '2147483647';
                scanLine.style.pointerEvents = 'none';
                scanLine.style.position = 'absolute';
                scannerWindow.appendChild(scanLine);
              }
              await runThreeScanV2(url, 7000);
            } catch(_) {}
            try { scannerWindow.removeChild(img); } catch(_) {}
            resolve();
          };
          img.onerror = () => { try { scannerWindow.removeChild(img); } catch(_) {}; resolve(); };
        } catch(_) { resolve(); }
      });
    }

    if (uploadInput) uploadInput.addEventListener('change', async (e) => {
      const files = (e.target && e.target.files) ? Array.from(e.target.files) : [];
      for (const f of files) {
        await previewInScanner(f);
        addFileToDossier(f, false);
      }
      try { e.target.value = ''; } catch(_) {}
    });

    if (submitBtn) submitBtn.addEventListener('click', async () => {
      try {
        const code = (accessInput && accessInput.value || '').trim();
        if (!code || dossierFiles.length === 0) { alert('پرونده خالی است یا کد دسترسی وارد نشده'); return; }
        submitBtn.disabled = true;
        if (statusMessage) statusMessage.textContent = 'در حال آپلود مدارک...';
        const fd = new FormData();
        dossierFiles.forEach(it => fd.append('scanImages', it.blob));
        const res = await fetch('/KaragahArshad/upload-dossier', { method: 'POST', body: fd });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data || !Array.isArray(data.urls)) { alert('آپلود پرونده ناموفق بود'); submitBtn.disabled = false; return; }
        if (statusMessage) statusMessage.textContent = 'ارسال پرونده برای اپراتور...';
        const files = data.urls.map((u, i) => ({ id: dossierFiles[i] ? dossierFiles[i].id : ('doc-'+i), url: u }));
        socket.emit('submit_dossier', { access_code: code, files });
      } catch (e) {
        console.error('submit dossier error', e);
        alert('خطا در ارسال پرونده');
        submitBtn.disabled = false;
      }
    });

    socket.on('dossier_result', ({ success, message }) => {
      if (statusMessage) statusMessage.textContent = message || (success ? 'ارسال شد. منتظر تایید اپراتور باشید.' : 'ناموفق');
      if (submitBtn) submitBtn.disabled = false;
      // گالری و شناسه‌ها را نگه می‌داریم تا وضعیت هر تصویر توسط ادمین به‌روزرسانی شود
      // فقط کد دسترسی را برای ارسال‌های بعدی خالی می‌کنیم
      if (success) { try { if (accessInput) accessInput.value = ''; } catch(_) {} }
    });
    // Fallback: legacy reject event
    socket.on('document_rejected', ({ documentId }) => {
      try {
        if (!documentId) return;
        const el = document.getElementById(String(documentId));
        if (el) {
          el.classList.add('rejected');
          try { gsap.fromTo(el, { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); } catch(_) {}
        }
      } catch(_) {}
    });
    socket.on('document_state_updated', ({ userId, documentId, newState }) => {
      try { if (currentUserId && Number(userId) && Number(userId) !== Number(currentUserId)) return; } catch(_) {}
      const el = document.getElementById(String(documentId));
      if (!el) return;
      el.classList.remove('approved', 'rejected');
      const badge = el.querySelector('.status-badge');
      if (newState === 'approved') {
        el.classList.add('approved');
        if (badge) { badge.textContent = 'تایید شد'; badge.classList.remove('pending','rejected'); badge.classList.add('approved'); }
      } else if (newState === 'rejected') {
        el.classList.add('rejected');
        if (badge) { badge.textContent = 'رد شد'; badge.classList.remove('pending','approved'); badge.classList.add('rejected'); }
      }
    });
  });
})();
