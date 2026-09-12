// ========== HACK SEQUENCE FUNCTION ==========
console.log('🔄 بارگذاری تابع سکانس هک...');

let hackSequenceActive = false;
let currentAudio = null;
let ajirAudio = null; // آژیر مداوم
let ajirObjectUrl = null; // Object URL برای منبع آژیر (برای جلوگیری از خطاهای مسیر نسبی)
let currentPhase = 1; // 1: Normal, 2: Hacked, 3: Terminal

// ========== GLOBAL VARIABLES ==========
let chatSocket;
let messageInput;
let chatMessages;
let fileInput;
let sendButton;
let messageCount = 0;
let lastMessageCount = 0; // برای تشخیص پیام‌های جدید
let autoScroll = true; // اگر کاربر پایین لیست باشد، خودکار اسکرول کنیم
let initialHistoryLoaded = false; // بار اول تاریخچه را تا آخر ببریم
let chatEnabled = true; // توسط سرور قابل تغییر است
let lastHistoryReloadAt = 0; // زمان آخرین بارگذاری تاریخچه (برای کنترل نرخ)
const REFRESH_INTERVAL_MS = 60000; // حداقل فاصله رفرش تاریخچه (ms)

// ========== TYPING SOUND EFFECT ==========
// لطفاً فایل صوتی را در مسیر public/assets/sounds/type.wav قرار دهید
const typeSound = new Audio('/assets/sounds/type.wav');
typeSound.volume = 0.2;

function bindTypingSound(el) {
    if (!el || el.dataset.typingSoundBound) return;
    el.addEventListener('keydown', (e) => {
        // نادیده گرفتن کلیدهای کنترلی
        const ignored = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (ignored.includes(e.key)) return;
        try {
            typeSound.currentTime = 0;
            const p = typeSound.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {}
    });
    el.dataset.typingSoundBound = '1';
}

// ========== HOLOGRAPHIC PERSONNEL OVERLAY ==========
function initPersonnelOverlay() {
    if (window.__personnelInitDone) return; window.__personnelInitDone = true;
    const openBtn = document.getElementById('open-personnel-btn');
    const overlay = document.getElementById('personnel-overlay');
    const app = document.getElementById('personnel-app');
    const closeBtn = document.getElementById('personnel-close');
    const listEl = document.getElementById('personnel-list');
    const qEl = document.getElementById('personnel-q');
    const shuffleBtn = document.getElementById('personnel-shuffle');
    const nameEl = document.getElementById('personnel-name');
    const roleEl = document.getElementById('personnel-role');
    const thumbEl = document.getElementById('personnel-thumb');
    const mainPhotoEl = document.getElementById('personnel-mainPhoto');
    const scanMaskEl = document.getElementById('personnel-scanMask');
    const galleryStrip = document.getElementById('personnel-galleryStrip');
    const zoomInBtn = document.getElementById('personnel-zoomIn');
    const zoomOutBtn = document.getElementById('personnel-zoomOut');
    const photoWrap = mainPhotoEl ? mainPhotoEl.closest('.photo-wrap') : null;
    if (!openBtn || !overlay || !app || !listEl || !nameEl || !mainPhotoEl || !galleryStrip) return;

    const people = Array.isArray(window.students) ? window.students : [];
    let current = null;
    let zoom = 1, ox = 0, oy = 0, dragging = false, sx = 0, sy = 0;

    // مخفی‌سازی هر گونه نمایش نقش/کلاس برای کاربر
    if (roleEl) { try { roleEl.textContent=''; roleEl.style.display='none'; } catch(_) {} }

    function renderList(items) {
        try { listEl.innerHTML = ''; } catch(_) {}
        (items || []).forEach(p => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                <div class="avatar"><img src="${p.avatar || p.photo || ''}" alt=""></div>
                <div class="meta">
                    <b>${p.name || '—'}</b>
                </div>
                <div class="tag">${p.id || ''}</div>
            `;
            el.addEventListener('click', () => selectPerson(p, true));
            listEl.appendChild(el);
        });
    }

    function openPhotoSwipe(items, index=0) {
        try {
            const pswp = new PhotoSwipe({ dataSource: items, index, bgOpacity: 0.9, wheelToZoom: true,
                paddingFn: () => ({ top:20, bottom:40, left:12, right:12 }) });
            pswp.on('uiRegister', function() {
                pswp.ui.registerElement({ name: 'custom-caption', order: 9, isButton: false, appendTo: 'root',
                    html: '<div style="position:absolute; bottom:12px; left:12px; color:#cfe9ff; font-size:12px;">Zoom: scroll / Pan: drag</div>' });
            });
            pswp.init();
        } catch (e) { console.warn('PhotoSwipe error', e); }
    }

    function selectPerson(p, animate=true) {
        current = p;
        nameEl.textContent = p.name || '—';
        // نقش/کلاس نمایش داده نشود
        if (roleEl) { roleEl.textContent=''; roleEl.style.display='none'; }
        if (thumbEl) thumbEl.src = p.avatar || p.photo || '';
        // Gallery strip
        galleryStrip.innerHTML = '';
        const gal = Array.isArray(p.gallery) ? p.gallery : (p.photo ? [{ src: p.photo, w: 1200, h: 800 }] : []);
        gal.forEach((g,i) => {
            const a = document.createElement('a');
            a.href = g.src; a.dataset.pswpWidth = g.w || 1200; a.dataset.pswpHeight = g.h || 800;
            a.innerHTML = `<img src="${g.src}" alt="">`;
            a.addEventListener('click', (e) => { e.preventDefault(); openPhotoSwipe(gal, i); });
            galleryStrip.appendChild(a);
        });
        // Main photo with scanline reveal
        const nextSrc = p.photo || (gal[0] && gal[0].src) || '';
        if (animate && scanMaskEl) {
            scanMaskEl.style.opacity = 0;
            mainPhotoEl.style.filter = 'contrast(1.05) saturate(1.1) brightness(0.8)';
            mainPhotoEl.style.transform = 'scale(1.04) translate(0px, 10px)';
            mainPhotoEl.src = nextSrc;
            try {
                if (window.gsap) {
                    const tl = gsap.timeline();
                    tl.to(scanMaskEl, {opacity:1, duration:0.2, ease:"power2.out"})
                      .to(mainPhotoEl, {filter:'contrast(1.08) saturate(1.15) brightness(1)', transform:'scale(1) translate(0px, 0px)', duration:0.5, ease:"power3.out"}, "<")
                      .to(scanMaskEl, {opacity:0, duration:0.35, ease:"power2.in"}, "-=0.05");
                } else {
                    setTimeout(() => { scanMaskEl.style.opacity = 1; }, 0);
                    setTimeout(() => { scanMaskEl.style.opacity = 0; mainPhotoEl.style.transform = 'scale(1)'; }, 400);
                }
            } catch(_) {}
        } else {
            mainPhotoEl.src = nextSrc;
        }
        // reset zoom & pan
        zoom = 1; ox = 0; oy = 0; mainPhotoEl.style.transform = 'scale(1)';
    }

    function openOverlay() {
        overlay.style.display = 'block';
        overlay.style.opacity = '0';
        app.style.transform = 'scale(0.96)';
        app.style.opacity = '0';
        try {
            if (window.gsap) {
                gsap.to(overlay, { opacity: 1, duration: 0.2, ease: 'power1.out' });
                gsap.to(app, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
            } else {
                overlay.style.opacity = '1'; app.style.opacity = '1'; app.style.transform = 'scale(1)';
            }
        } catch(_) {}
        // initial paint
        renderList(people);
        if (people && people.length) selectPerson(people[0], false);
    }

    function closeOverlay() {
        try {
            if (window.gsap) {
                gsap.to(app, { opacity: 0, scale: 0.98, duration: 0.25, ease: 'power2.in' });
                gsap.to(overlay, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => { overlay.style.display = 'none'; } });
            } else { overlay.style.display = 'none'; }
        } catch(_) { overlay.style.display = 'none'; }
    }

    // events
    openBtn.addEventListener('click', openOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.style.display === 'block') closeOverlay(); });
    if (qEl) qEl.addEventListener('input', () => {
        const s = qEl.value.trim();
        const filtered = people.filter(p => (String(p.name||'').includes(s) || String(p.id||'').includes(s)));
        renderList(filtered.length ? filtered : people);
    });
    if (shuffleBtn) shuffleBtn.addEventListener('click', () => {
        const shuffled = [...people].sort(() => Math.random()-0.5);
        renderList(shuffled);
    });
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { zoom = Math.min(zoom + 0.15, 2.5); mainPhotoEl.style.transform = `scale(${zoom}) translate(${ox}px, ${oy}px)`; });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { zoom = Math.max(1, zoom - 0.15); if (zoom === 1) { ox = 0; oy = 0; } mainPhotoEl.style.transform = `scale(${zoom}) translate(${ox}px, ${oy}px)`; });
    if (photoWrap) {
        photoWrap.addEventListener('pointerdown', (e) => { if (zoom<=1) return; dragging=true; sx=e.clientX; sy=e.clientY; try { photoWrap.setPointerCapture(e.pointerId); } catch(_){} });
        photoWrap.addEventListener('pointermove', (e) => { if (!dragging || zoom<=1) return; const dx=e.clientX-sx, dy=e.clientY-sy; mainPhotoEl.style.transform = `scale(${zoom}) translate(${ox+dx/zoom}px, ${oy+dy/zoom}px)`; });
        photoWrap.addEventListener('pointerup', (e) => { dragging=false; const m = mainPhotoEl.style.transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/); if (m){ ox = parseFloat(m[1]); oy = parseFloat(m[2]); } });
        photoWrap.addEventListener('wheel', (e) => { e.preventDefault(); const delta = Math.sign(e.deltaY) * -0.12; zoom = Math.max(1, Math.min(2.5, zoom + delta)); mainPhotoEl.style.transform = `scale(${zoom}) translate(${ox}px, ${oy}px)`; }, { passive: false });
    }
}

// Boot overlay after DOM ready
document.addEventListener('DOMContentLoaded', () => { try { initPersonnelOverlay(); } catch(e) { console.warn('personnel init error', e); } });


// ========== STUDENT PROFILES MODAL ==========
async function initStudentProfiles() {
    // Guard: prevent double initialization and duplicate event bindings
    if (window.__studentProfilesInitDone) return;
    window.__studentProfilesInitDone = true;
    const openBtn = document.getElementById('open-students-btn');
    const modal = document.getElementById('studentModal');
    const closeBtn = document.getElementById('student-modal-close');
    const selector = document.getElementById('student-selector');
    const photoEl = document.getElementById('student-photo');
    if (!openBtn || !modal || !selector || !photoEl) return; // عناصر لازم موجود نیست

    const populate = async () => {
        try {
            // پاک‌سازی گزینه‌ها به جز Placeholder اول
            while (selector.options.length > 1) selector.remove(1);
            photoEl.src = '/assets/placeholder.png';
            const qp = typeof window.classId !== 'undefined' && window.classId ? `?classId=${encodeURIComponent(window.classId)}` : '';
            const res = await fetch(`/api/students${qp}`);
            const data = await res.json();
            const students = (data && Array.isArray(data.students)) ? data.students : [];
            students.forEach((s) => {
                const opt = document.createElement('option');
                opt.value = s.photo || '';
                opt.textContent = s.name || 'بدون نام';
                selector.appendChild(opt);
            });
        } catch (e) {
            console.warn('⚠️ خطا در دریافت لیست دانش‌آموزان:', e);
        }
    };

    openBtn.addEventListener('click', async () => {
        await populate();
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    });
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    });
    // کلیک روی بیرون کارت، مودال را می‌بندد
    modal.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    });
    // تغییر عکس با انتخاب کاربر
    selector.addEventListener('change', () => {
        const file = selector.value;
        photoEl.src = file ? `/assets/students/${file}` : '/assets/placeholder.png';
    });
}

// بررسی حالت کاربر هنگام بارگذاری صفحه
async function checkUserPhase() {
    try {
        const userIdFromStorage = localStorage.getItem('userId');
        if (!userIdFromStorage) return;
        
        const response = await fetch(`/api/user-phase/${userIdFromStorage}`);
        const data = await response.json();
        
        if (data && data.phase === 3) {
            console.log('🔄 کاربر در مرحله ترمینال - نمایش مستقیم...');
            if (typeof showHackedTerminalDirect === 'function') {
                showHackedTerminalDirect();
            }
        }
    } catch (e) {
        console.warn('⚠️ خطا در checkUserPhase:', e);
    }
};

// ========== LIVE GPS MAP (Leaflet) ==========
function showLocationErrorBanner() {
    if (document.querySelector('.location-error-banner')) return;
    const errorBanner = document.createElement('div');
    errorBanner.className = 'location-error-banner';
    errorBanner.innerHTML = `
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span>دسترسی به موقعیت مکانی غیرفعال است</span>
            <button onclick="this.closest('.location-error-banner').remove()">×</button>
        </div>
    `;
    document.body.appendChild(errorBanner);
}

// ابزارهای انیمیشن برای GPS
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function animateMarkerTo(marker, fromLatLng, toLatLng, duration = 800) {
    let start;
    function step(ts) {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / duration);
        const e = easeInOutCubic(p);
        const lat = fromLatLng.lat + (toLatLng.lat - fromLatLng.lat) * e;
        const lng = fromLatLng.lng + (toLatLng.lng - fromLatLng.lng) * e;
        try { marker.setLatLng([lat, lng]); } catch (_) {}
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

window.initGPSMap = function initGPSMap() {
    try {
        if (window.__gpsMapInitDone) return;
        // If new GPS module is enabled globally, skip legacy init
        if (window.__useNewGPSModule) {
            console.log('🛰️ New GPS module flag set; skipping legacy initGPSMap.');
            return;
        }
        // If the new independent GPS module is present, skip legacy init to avoid conflicts
        const newModule = document.getElementById('live-gps-map-container');
        if (newModule) {
            console.log('🛰️ New GPS module detected; skipping legacy initGPSMap.');
            return;
        }
        const el = document.getElementById('map-container');
        if (!el) return; // صفحه فعلی نقشه ندارد
        // حالت جدید: نقشه نظارتی سایبری با MapLibre (بدون GPS کاربر، پرواز بین شهرها)
        if (typeof maplibregl !== 'undefined') {
            window.__gpsMapInitDone = true;

            // عنوان هولوگرافیک نقشه
            try {
                const title = document.createElement('div');
                title.className = 'map-title';
                title.innerHTML = '<span class="map-title-dot"></span> نقشه ابتلای لحظه‌ای سندروم';
                el.appendChild(title);
            } catch (_) {}

            // استایل دارک CARTO (OSM raster)
            const darkOSMStyle = {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors © CARTO'
                    }
                },
                layers: [{ id: 'osm-dark', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }]
            };

            const map = new maplibregl.Map({
                container: 'map-container',
                style: darkOSMStyle,
                center: [53.6880, 32.4279], // مرکز ایران
                zoom: 5,
                bearing: 0
            });

            // عنصر نشانگر سونار
            function createSonarMarker() {
                const m = document.createElement('div');
                m.className = 'sonar-marker';
                m.appendChild(Object.assign(document.createElement('div'), { className: 'ring r1' }));
                m.appendChild(Object.assign(document.createElement('div'), { className: 'ring r2' }));
                m.appendChild(Object.assign(document.createElement('div'), { className: 'ring r3' }));
                return m;
            }
            const markerEl = createSonarMarker();
            const marker = new maplibregl.Marker({ element: markerEl, anchor: 'center' });

            // لیست شهرها
            const iranCitiesBase = [
                { name: 'تهران', coords: [51.3890, 35.6892] },
                { name: 'مشهد', coords: [59.6062, 36.2970] },
                { name: 'اصفهان', coords: [51.6776, 32.6546] },
                { name: 'شیراز', coords: [52.5319, 29.5918] },
                { name: 'تبریز', coords: [46.2919, 38.0962] },
                { name: 'اهواز', coords: [48.6692, 31.3183] },
                { name: 'کرج', coords: [50.9916, 35.8355] },
                { name: 'قم', coords: [50.8746, 34.6399] },
                { name: 'کرمانشاه', coords: [47.0650, 34.3142] },
                { name: 'رشت', coords: [49.5832, 37.2808] },
                { name: 'یزد', coords: [54.3678, 31.8974] },
                { name: 'ارومیه', coords: [45.0725, 37.5527] },
                { name: 'کرمان', coords: [57.0788, 30.2839] },
                { name: 'بندرعباس', coords: [56.2808, 27.1865] },
                { name: 'ساری', coords: [53.0601, 36.5633] },
                { name: 'گرگان', coords: [54.4342, 36.8416] },
                { name: 'زاهدان', coords: [60.8726, 29.4963] },
                { name: 'سنندج', coords: [47.0026, 35.3094] },
                { name: 'همدان', coords: [48.5162, 34.7992] },
                { name: 'قزوین', coords: [50.0041, 36.2688] },
                { name: 'بوشهر', coords: [50.8382, 28.9234] },
                { name: 'خرم‌آباد', coords: [48.3558, 33.4878] },
                { name: 'اردبیل', coords: [48.2933, 38.2465] },
                { name: 'ایلام', coords: [46.4227, 33.6374] }
            ];
            let iranCities = iranCitiesBase.slice();

            function nextCity() {
                if (iranCities.length === 0) iranCities = iranCitiesBase.slice();
                const i = Math.floor(Math.random() * iranCities.length);
                return iranCities.splice(i, 1)[0];
            }

            function cinematicFlyTo(city) {
                map.flyTo({
                    center: city.coords,
                    zoom: 12,
                    bearing: 0,
                    duration: 2500,
                    curve: 1.6,
                    speed: 0.8,
                    essential: true
                });
                const handler = () => {
                    map.off('moveend', handler);
                    marker.setLngLat(city.coords).addTo(map);
                };
                map.on('moveend', handler);
            }

            function startInfiniteFlights() {
                cinematicFlyTo(nextCity());
                setInterval(() => { cinematicFlyTo(nextCity()); }, 60000);
            }

            map.on('load', startInfiniteFlights);
            return; // از مسیر جدید استفاده شد
        }
        if (typeof L === 'undefined') { console.warn('Leaflet بارگذاری نشده'); return; }
        window.__gpsMapInitDone = true;

        // ایجاد نقشه با تم تاریک و بهینه‌سازی عملکرد
        const map = L.map('map-container', {
            zoomControl: true,
            attributionControl: false,
            preferCanvas: true,
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true,
            zoomSnap: 0.25,
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 80,
            minZoom: 2,
            maxZoom: 22,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true,
            touchZoom: 'center',
            tap: false
        }).setView([25, 10], 3);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap & CARTO',
            subdomains: 'abcd',
            maxZoom: 22,
            maxNativeZoom: 19,
            detectRetina: false,
            updateWhenIdle: true,
            keepBuffer: 1,
            crossOrigin: true
        }).addTo(map);

        // Move zoom control to avoid collision with overlay controls
        if (map.zoomControl) {
            map.zoomControl.setPosition('bottomleft');
        }

        // آیکون سونار انیمیشنی
        const sonarHTML = `
          <div class="sonar-marker">
            <div class="sonar-core"></div>
            <div class="ring r1"></div>
            <div class="ring r2"></div>
          </div>
        `;
        const sonarIcon = L.divIcon({
            html: sonarHTML,
            className: 'sonar-div-icon',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17]
        });
        let userMarker = null;
        let accuracyCircle = null;
        let useHighAccuracy = true;
        let lastAccuracy = null;
        let currentWatchId = 0;
        let followMode = (localStorage.getItem('mapFollow') !== '0');
        let audioUnlocked = false;

        // Build overlay controls inside the map container (prevents overlap)
        const controls = document.createElement('div');
        controls.className = 'map-controls';
        const badgeEl = document.createElement('div');
        badgeEl.className = 'map-badge';
        badgeEl.innerHTML = '<span class="dot"></span><span class="label">موقعیت شما</span>';
        const followBtn = document.createElement('button');
        followBtn.className = 'map-follow-btn' + (followMode ? ' active' : '');
        followBtn.title = 'دنبال کردن موقعیت';
        followBtn.textContent = 'دنبال';
        // Toggle GPS source button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-gps-source';
        toggleBtn.className = 'map-follow-btn';
        toggleBtn.title = 'تغییر منبع موقعیت‌یابی (GPS دقیق / شبکه)';
        toggleBtn.textContent = 'GPS دقیق';
        function updateToggleLabel(src, acc) {
            if (src === 'IP') { toggleBtn.textContent = 'IP'; return; }
            if (src === 'Network') { toggleBtn.textContent = 'شبکه'; return; }
            if (src === 'GPS') {
                const a = typeof acc === 'number' ? acc : lastAccuracy;
                const good = typeof a === 'number' && a <= 50;
                toggleBtn.textContent = good ? 'GPS دقیق' : 'GPS';
                return;
            }
            toggleBtn.textContent = useHighAccuracy ? 'GPS دقیق' : 'شبکه';
        }
        const accChip = document.createElement('div');
        accChip.className = 'map-chip';
        accChip.textContent = 'دقت -- m';
        controls.appendChild(badgeEl);
        controls.appendChild(followBtn);
        controls.appendChild(toggleBtn);
        controls.appendChild(accChip);
        el.appendChild(controls);

        // Subtle scanline overlay for cyber feel
        const scanline = document.createElement('div');
        scanline.className = 'map-scanline';
        el.appendChild(scanline);

        followBtn.onclick = () => {
            followMode = !followMode;
            followBtn.classList.toggle('active', followMode);
            try { localStorage.setItem('mapFollow', followMode ? '1' : '0'); } catch (_) {}
            if (followMode && userMarker) {
                const latlng = userMarker.getLatLng();
                map.flyTo(latlng, Math.max(map.getZoom(), 16), { duration: 0.6 });
                map.once('moveend', () => map.panBy([0, -80]));
            }
        };
        let firstLock = true;
        let liveFirst = true;

        // Restore last known position for instant paint
        try {
            const lastLat = parseFloat(localStorage.getItem('lastUserLat') || '');
            const lastLng = parseFloat(localStorage.getItem('lastUserLng') || '');
            if (!Number.isNaN(lastLat) && !Number.isNaN(lastLng)) {
                const lastLatLng = L.latLng(lastLat, lastLng);
                userMarker = L.marker(lastLatLng, { icon: sonarIcon }).addTo(map);
                map.setView(lastLatLng, 15, { animate: false });
                map.panBy([0, -80], { animate: false }); // show a bit higher
                // keep firstLock true so live GPS can still do a nice fly
            }
        } catch (_) {}

        const placeOrMove = (latlng, isLive = false, acc = 15) => {
            if (!userMarker) {
                userMarker = L.marker(latlng, { icon: sonarIcon }).addTo(map);
            } else {
                const from = userMarker.getLatLng();
                try { animateMarkerTo(userMarker, from, latlng, isLive ? 900 : 600); } catch { userMarker.setLatLng(latlng); }
            }
            if (!accuracyCircle) {
                accuracyCircle = L.circle(latlng, {
                    radius: Math.max(5, Math.min(acc, 200)),
                    color: '#00ffa3',
                    weight: 1,
                    opacity: 0.6,
                    fillColor: '#00ffa3',
                    fillOpacity: 0.12
                }).addTo(map);
            } else {
                accuracyCircle.setLatLng(latlng);
                accuracyCircle.setRadius(Math.max(5, Math.min(acc, 200)));
            }
            // Ripple cinematic effect per update
            try {
                const ripple = L.circle(latlng, {
                    radius: 5,
                    color: '#00ffa3',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.15
                }).addTo(map);
                const t0 = Date.now();
                const dur = 900;
                const iv = setInterval(() => {
                    const t = (Date.now() - t0) / dur;
                    if (t >= 1) { clearInterval(iv); map.removeLayer(ripple); return; }
                    ripple.setRadius(5 + 55 * t);
                    ripple.setStyle({ opacity: 0.8 * (1 - t), fillOpacity: 0.15 * (1 - t) });
                }, 30);
            } catch {}
            if (accChip) {
                const now = new Date();
                accChip.textContent = `دقت ${Math.round(acc)}m`;
                accChip.title = `آخرین بروزرسانی: ${now.toLocaleTimeString('fa-IR')}`;
            }
            if (firstLock) {
                map.flyTo(latlng, 16, { duration: 0.9 });
                map.once('moveend', () => map.panBy([0, -80]));
                firstLock = false;
            } else if (followMode && (isLive || liveFirst)) {
                const targetZoom = Math.max(16, map.getZoom());
                map.flyTo(latlng, targetZoom, { duration: 0.8 });
                map.once('moveend', () => map.panBy([0, -80]));
                liveFirst = false;
            }
            try {
                localStorage.setItem('lastUserLat', String(latlng.lat));
                localStorage.setItem('lastUserLng', String(latlng.lng));
            } catch (_) {}
        };
        
        // Handle fresh GPS fix events forced by requestFreshGPSFix()
        try {
            window.addEventListener('gps_fix_refresh', (e) => {
                const d = (e && e.detail) || {};
                if (typeof d.lat === 'number' && typeof d.lng === 'number') {
                    const ll = L.latLng(d.lat, d.lng);
                    placeOrMove(ll, true, typeof d.acc === 'number' ? d.acc : 15);
                }
            });
        } catch {}

        // Watch management
        function stopWatch() {
            try { if (currentWatchId) { navigator.geolocation.clearWatch(currentWatchId); currentWatchId = 0; } } catch(_) {}
        }
        
        // Helper: IP-based approximate geolocation fallback
        async function tryIpGeoFallback() {
            let data = null;
            try {
                const res = await fetch('/api/ip-geo');
                if (res.ok) {
                    data = await res.json();
                }
            } catch {}
            if (!(data && typeof data.lat === 'number' && typeof data.lng === 'number')) {
                const fetchTimeout = (url, ms) => new Promise((resolve, reject) => {
                    const c = new AbortController();
                    const t = setTimeout(() => { try { c.abort(); } catch {} reject(new Error('timeout')); }, ms);
                    fetch(url, { signal: c.signal }).then(r => { clearTimeout(t); if (!r.ok) return reject(new Error('http ' + r.status)); r.json().then(resolve).catch(reject); }).catch(e => { clearTimeout(t); reject(e); });
                });
                const attempts = [
                    fetchTimeout('https://ipapi.co/json/', 2500).then(j => {
                        const lat = Number(j && j.latitude), lng = Number(j && j.longitude);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, accuracy: 20000, country_code: j.country_code || null, vpnLikely: false };
                        throw new Error('ipapi invalid');
                    }),
                    fetchTimeout('https://get.geojs.io/v1/ip/geo.json', 2500).then(j => {
                        const lat = Number(j && j.latitude), lng = Number(j && j.longitude);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, accuracy: 30000, country_code: j.country_code || null, vpnLikely: false };
                        throw new Error('geojs invalid');
                    }),
                    fetchTimeout('http://ip-api.com/json/?fields=status,message,lat,lon,countryCode', 2500).then(j => {
                        if (j && j.status === 'success' && Number.isFinite(j.lat) && Number.isFinite(j.lon)) return { lat: j.lat, lng: j.lon, accuracy: 25000, country_code: j.countryCode || null, vpnLikely: false };
                        throw new Error('ip-api invalid');
                    })
                ];
                try {
                    data = await Promise.any(attempts);
                } catch {}
            }
            if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
                const approx = L.latLng(data.lat, data.lng);
                placeOrMove(approx, false, data.accuracy || 20000);
                if (accChip) accChip.textContent = 'حدودی بر اساس IP';
                try { window.__locSource = 'IP'; window.dispatchEvent(new CustomEvent('locsource', { detail: 'IP' })); } catch {}
                return true;
            }
            return false;
        }

        if ('geolocation' in navigator) {
            // ابتدا سریع‌ترین موقعیت کش‌شده را بگیر تا زودتر زوم شود (timeout کوتاه)
            navigator.geolocation.getCurrentPosition((pos) => {
                const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                placeOrMove(latlng, false, pos.coords.accuracy || 15);
                lastAccuracy = pos.coords.accuracy || null;
                updateToggleLabel('GPS', lastAccuracy);
                // اگر دقت اولیه پایین باشد، یک فیکس تازه و دقیق درخواست کن
                const a0 = Number(pos.coords.accuracy);
                if (!Number.isFinite(a0) || a0 > 50) { try { requestFreshGPSFix(); } catch {} }
                try { if (!window.__locSource) { window.__locSource = 'GPS'; window.dispatchEvent(new CustomEvent('locsource', { detail: 'GPS دقیق' })); } } catch {}
            }, (err) => {
                console.warn('⚠️ getCurrentPosition error:', err);
                // اگر خطا داشت، IP fallback
                tryIpGeoFallback();
            }, { enableHighAccuracy: useHighAccuracy, timeout: 1500, maximumAge: 15000 });

            // آغاز پایش زنده با حالت فعلی
            startWatch();
            // دکمه تغییر منبع
            toggleBtn.onclick = () => {
                useHighAccuracy = !useHighAccuracy;
                updateToggleLabel(useHighAccuracy ? 'GPS' : 'Network', lastAccuracy);
                startWatch();
                const srcLabel = useHighAccuracy ? 'GPS دقیق' : 'IP/Network';
                try { window.__locSource = useHighAccuracy ? 'GPS' : 'Network'; window.dispatchEvent(new CustomEvent('locsource', { detail: srcLabel })); } catch {}
            };
        } else {
            showLocationErrorBanner();
            // اجرای fallback مبتنی بر IP برای دستگاه‌های فاقد GPS
            tryIpGeoFallback();
        }
    } catch (e) {
        console.warn('⚠️ خطا در initGPSMap:', e);
    }
};

// تلاش برای گرفتن یک فیکس تازه و دقیق پس از نمایش سریع اولیه
function requestFreshGPSFix() {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const acc = pos.coords.accuracy || 15;
        // به‌روزرسانی با فیکس تازه (احتمالاً دقیق‌تر)
        try { window.__locSource = 'GPS'; window.dispatchEvent(new CustomEvent('locsource', { detail: 'GPS دقیق' })); } catch {}
        const el = document.getElementById('userMap');
        if (!el) return;
        // چون placeOrMove داخل initGPSMap تعریف شده، برای سازگاری فقط یک ایونت عمومی بفرستیم
        try { window.dispatchEvent(new CustomEvent('gps_fix_refresh', { detail: { lat: latlng.lat, lng: latlng.lng, acc } })); } catch {}
    }, (err) => {
        console.warn('⚠️ fresh GPS fix failed:', err);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

function beginHackSequence() {
    console.log('🔴 شروع سکانس هک...');
    
    if (hackSequenceActive) {
        console.log('⚠️ سکانس در حال اجرا است');
        return;
    }
    
    hackSequenceActive = true;
    
    // نمایش overlay
    const overlay = document.getElementById('hackSequenceOverlay');
    if (overlay) {
        console.log('✅ overlay یافت شد - نمایش...');
        overlay.classList.add('show');
        overlay.style.display = 'block';
        
        tryAutoUnlockAudio().then(() => {
            executeHackSequence();
        }).catch(() => {
            enableAudioWithUserClick().then(() => { executeHackSequence(); });
        });
    } else {
        console.error('❌ overlay یافت نشد!');
    }
}
async function tryAutoUnlockAudio() {
    try {
        if (audioUnlocked) return;
        const testAudio = new Audio('/media/khande2');
        testAudio.volume = 0.01;
        testAudio.currentTime = 0;
        await testAudio.play();
        testAudio.pause();
        audioUnlocked = true;
    } catch (e) { throw e; }
}
// فعال‌سازی صدا با کلیک کاربر
async function enableAudioWithUserClick() {
    return new Promise((resolve) => {
        console.log('🖱️ نیاز به تعامل کاربر برای فعال‌سازی صدا...');
        
        // ایجاد دکمه شروع
        const startButton = document.createElement('button');
        startButton.textContent = '▶️ شروع سکانس';
        startButton.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10001;
            padding: 20px 40px;
            background: linear-gradient(45deg, #ff0000, #cc0000);
            color: white;
            border: 2px solid #ffffff;
            border-radius: 15px;
            font-size: 30px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
            animation: pulse 2s infinite;
        `;
        
        // اضافه کردن انیمیشن pulse
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.05); }
                100% { transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        startButton.onclick = async () => {
            console.log('✅ کاربر روی دکمه شروع کلیک کرد');
            
            // تست پخش یک صدای کوتاه برای فعال‌سازی
            try {
                const testAudio = new Audio('/media/khande2');
                testAudio.volume = 0.01; // خیلی آرام
                testAudio.currentTime = 0;
                await testAudio.play();
                testAudio.pause();
                console.log('🎵 AudioContext فعال شد');
            } catch (error) {
                console.log('⚠️ تست صدا ناموفق ولی ادامه می‌دهیم:', error.message);
            }
            
            // حذف دکمه و ادامه سکانس
            document.body.removeChild(startButton);
            document.head.removeChild(style);
            resolve();
        };
        
        document.body.appendChild(startButton);
        
        // فوکوس روی دکمه برای امکان فشردن Enter
        startButton.focus();
        
        // امکان فشردن Enter یا Space
        document.addEventListener('keydown', function enterHandler(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startButton.click();
                document.removeEventListener('keydown', enterHandler);
            }
        });
        function autoStartOnce(){ try { startButton.click(); } catch(_) {} }
        document.addEventListener('pointerdown', autoStartOnce, { once: true });
        document.addEventListener('touchstart', autoStartOnce, { once: true, passive: true });
    });
}

async function executeHackSequence() {
    console.log('⏰ اجرای سکانس با زمان‌بندی دقیق...');
    
    try {
        // مرحله 1: سکوت مطلق (0-2 ثانیه)
        await sleep(2000);
        
        // مرحله 2: آژیر + اسکلت (2-32 ثانیه)
        console.log('🚨 شروع آژیر مداوم و نمایش خطر...');
        startContinuousAjir(1.0); // 100% volume (حداکثر مجاز)
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
        
        // مرحله 5: فقط 2 متن اول (12-26 ثانیه) - آژیر ادامه دارد
        await sleep(14000); // صبر تا ثانیه 26 (26-12=14)
        
        // مرحله 6: شروع پیام ترسناک (26 ثانیه)
        console.log('😈 نمایش پیام ترسناک...');
        const scaryPromise = showScaryMessage();
        
        await sleep(1000); // صبر 1 ثانیه (26+1=27)
        
        // مرحله 7: شروع fade آژیر (27 ثانیه)
        console.log('🔉 شروع fade آژیر...');
        if (ajirAudio) {
            startFadeOut(ajirAudio, 1.0, 0.1, 3000); // fade آژیر در 3 ثانیه
        }
        
        await sleep(1000); // صبر 1 ثانیه (27+1=28)
        
        // مرحله 8: شروع خنده همزمان با آژیر (28 ثانیه)
        console.log('🎭 شروع خنده همزمان با آژیر...');
        const laughAudio = new Audio('/media/khande');
        try { laughAudio.preload = 'auto'; } catch(_) {}
        laughAudio.volume = 1.0; // 100% volume (حداکثر مجاز)
        const laughPromise = new Promise((resolve) => {
            // پایان خنده
            laughAudio.addEventListener('ended', resolve, { once: true });
            // fallback حداکثر 10 ثانیه
            setTimeout(resolve, 10000);
        });
        laughAudio.play();
        
        await sleep(2000); // صبر 2 ثانیه (28+2=30)
        
        // مرحله 8: fade out صفحه خطر (30-33 ثانیه)
        console.log('🌅 fade out صفحه خطر...');
        await fadeDangerStage();
        
        // صبر تا پیام ترسناک تموم شه
        await scaryPromise;
        
        // مرحله 9: شروع ترمینال از ثانیه 7 خنده (28+7=35 ثانیه)
        await sleep(0); // بدون صبر اضافی چون الان ثانیه 34 هستیم
        console.log('💻 شروع ترمینال همزمان با خنده...');
        
        // کاهش volume آژیر به 50% برای ترمینال
        changeAjirVolume(0.5);
        currentPhase = 3;
        updateUserPhase(3); // ذخیره در دیتابیس
        
        const terminalPromise = showTerminalStage();
        
        // صبر تا خنده تموم شه
        await laughPromise;
        console.log('✅ خنده اول تمام شد');
        
        // صبر تا ترمینال تموم شه
        await terminalPromise;
        console.log('✅ ترمینال تمام شد');
        
        // مرحله 10: پخش خنده دوم در انتها (15 ثانیه)
        console.log('🎭 پخش خنده نهایی...');
        await playAudioWithFadeOut('/media/khande2', 0.8, 15000, 2000); // 15 ثانیه با fade
        console.log('✅ خنده نهایی تمام شد');
        
    } catch (error) {
        console.error('❌ خطا در اجرای سکانس:', error);
    }
}

function showDangerStage() {
    const dangerStage = document.getElementById('dangerStage');
    if (dangerStage) {
        dangerStage.classList.add('show');
        console.log('✅ مرحله خطر نمایش داده شد');
    } else {
        console.warn('⚠️ عنصر dangerStage یافت نشد');
    }
}

function showDangerText(textId) {
    const textElement = document.getElementById(textId);
    if (textElement) {
        // فونت سایز و فاصله بین دو متن
        textElement.style.cssText = `
            font-size: 1.8rem !important;
            font-weight: bold !important;
            text-shadow: 0 0 10px #ff0000 !important;
        `;
        
        if (textId === 'dangerText1') {
            textElement.style.cssText += `
                margin-bottom: 50px !important;
            `;
        } else if (textId === 'dangerText2') {
            textElement.style.cssText += `
                margin-top: 50px !important;
            `;
        }
        
        textElement.classList.add('show');
        console.log(`✅ متن خطر ${textId} نمایش داده شد`);
    } else {
        console.warn(`⚠️ عنصر ${textId} یافت نشد`);
    }
}

async function fadeDangerStage() {
    return new Promise((resolve) => {
        const dangerStage = document.getElementById('dangerStage');
        
        if (dangerStage) {
            console.log('✅ شروع fade out صفحه خطر...');
            
            // اضافه کردن کلاس fade-out برای انیمیشن
            dangerStage.style.transition = 'opacity 3s ease-out';
            dangerStage.style.opacity = '0';
            
            setTimeout(() => {
                dangerStage.classList.remove('show');
                dangerStage.style.opacity = '1'; // بازگردانی برای استفاده بعدی
                console.log('✅ fade out صفحه خطر تمام شد');
                resolve();
            }, 3000);
        } else {
            console.warn('⚠️ عنصر dangerStage یافت نشد');
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
            console.log('✅ مرحله پیام ترسناک شروع شد');
            
            // اضافه کردن پس‌زمینه مشکی برای متن
            scaryText.style.cssText = `
                background: rgba(0, 0, 0, 0.8);
                padding: 20px 30px;
                border-radius: 10px;
                border: 2px solid #ff0000;
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                margin: 20px;
                display: inline-block;
            `;
            
            const message = "کنترل سیستم شما الان در دست منه";
            await typeText(scaryText, message, 100);
            
            setTimeout(() => {
                scaryStage.classList.remove('show');
                console.log('✅ مرحله پیام ترسناک تمام شد');
                resolve();
            }, 2000); // 2 ثانیه بیشتر نمایش
        } else {
            console.warn('⚠️ عناصر پیام ترسناک یافت نشدند');
            resolve();
        }
    });
}

async function showTerminalStage() {
    const terminalStage = document.getElementById('terminalStage');
    const terminalContent = document.getElementById('terminalContent');
    
    if (terminalStage && terminalContent) {
        terminalStage.classList.add('show');
        console.log('✅ مرحله ترمینال شروع شد');
        
        // شروع آژیر با volume کم (بدون قطع اگر در حال اجراست)
        if (ajirAudio) {
            changeAjirVolume(0.5);
        } else {
            startContinuousAjir(0.5);
        }

        // پیام‌های قبل از ویدیو
        const preVideoMessages = [
            "سیستم شما توسط من و نیرو هام هک شده.",
            "",
            "از الان به بعد کنترل سیستم شما در دستان منه",
            "",
            "حالا یک چیز جالب براتون دارم....."
        ];
        
        for (const message of preVideoMessages) {
            await typeText(terminalContent, message + '\n', 50);
            await sleep(800);
        }
        
        // قطع آژیر با fade قبل از ویدیو
        fadeOutAjir(1000);
        
        await showVideo();
        
        // شروع مجدد آژیر بعد از ویدیو
        startContinuousAjir(0.5);
        
        await sleep(1000);
        
        // پیام‌های بعد از ویدیو
        const postVideoMessages = [
            "",
            "فکر نمیکردم شما فسقلی ها بتونین تا اینجا پیش برین",
            "",
            "از الان به بعد دیگه کاراگاهی وجود نداره که بهتون کمک کنه یا ازتون کمک بخواد.",
            "",
            "تنها شدین، من و تیمم نمیزاریم تلاشامون رو نابود کنین، بزودی این بیماری توی کل جهان پخش میشه و دیگه اثری از از اون اتفاق نمیمونه"
        ];
        
        for (const message of postVideoMessages) {
            await typeText(terminalContent, message + '\n', 60);
            await sleep(1000);
        }
        
        console.log('✅ مرحله ترمینال تمام شد');
    } else {
        console.warn('⚠️ عناصر ترمینال یافت نشدند');
    }
}

async function showVideo() {
    return new Promise((resolve) => {
        const videoContainer = document.getElementById('videoContainer');
        const video = document.getElementById('hackVideo');
        
        if (videoContainer && video) {
            console.log('🎬 شروع پخش ویدیو...');
            // اگر والد روی خودش transform دارد، position:fixed نسبی می‌شود؛
            // بنابراین موقتاً کانتینر را به body منتقل می‌کنیم تا واقعاً کل ویوپرورت را بپوشاند
            const originalParent = videoContainer.parentElement;
            const placeholder = document.createElement('div');
            try { originalParent.replaceChild(placeholder, videoContainer); } catch (_) {}
            try { document.body.appendChild(videoContainer); } catch (_) {}

            // کانتینر تمام‌صفحه واقعی روی کل ویوپورت
            videoContainer.style.cssText = 'position:fixed; inset:0; z-index:2147483647; display:block; background:black; overflow:hidden;';
            document.body.classList.add('video-playing');
            
            // خود ویدیو در مرکز با پر کردن کامل (cover) و بدون نوار سیاه
            video.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); min-width:100%; min-height:100%; width:auto; height:auto; object-fit:cover; background:black;';
            
            video.onended = () => {
                console.log('✅ ویدیو تمام شد - کوچیک کردن...');
                // خروج از fullscreen و بازگرداندن UI
                try { if (document.fullscreenElement) document.exitFullscreen(); } catch(_) {}
                video.pause();
                video.currentTime = 0;
                videoContainer.style.display = 'none';
                // برگرداندن به جای قبلی تا DOM به حالت اول برگردد
                try { document.body.removeChild(videoContainer); } catch(_) {}
                try { if (originalParent && placeholder.parentElement === originalParent) originalParent.replaceChild(videoContainer, placeholder); else if (placeholder.parentElement) placeholder.parentElement.replaceChild(videoContainer, placeholder); } catch(_) {}
                document.body.classList.remove('video-playing');
                resolve();
            };
            
            video.onerror = () => {
                console.warn('⚠️ خطا در پخش ویدیو');
                // خطاهای سطح پلیر را لاگ کن ولی کانتینر را مخفی نکن تا کاربر بتواند دستی Play بزند
                ensureTapToPlayOverlay(videoContainer, video);
            };
            
            // شروع پخش ویدیو
            video.play().then(() => {
                console.log('🎬 ویدیو در حالت fullscreen شروع شد');
                
                // تلاش برای fullscreen واقعی (اختیاری)
                try {
                    if (!document.fullscreenElement) {
                        if (video.requestFullscreen) video.requestFullscreen({ navigationUI: 'hide' });
                        else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
                        else if (video.mozRequestFullScreen) video.mozRequestFullScreen();
                        else if (video.msRequestFullscreen) video.msRequestFullscreen();
                    }
                } catch (_) {}
                
            }).catch((error) => {
                console.warn('⚠️ خطا در شروع پخش ویدیو:', error);
                // معمولاً NotAllowedError به خاطر سیاست autoplay بدون تعامل کاربر است.
                // در این حالت کانتینر را نگه می‌داریم و دکمه «برای پخش کلیک کنید» نشان می‌دهیم.
                ensureTapToPlayOverlay(videoContainer, video);
                
                // وقتی کاربر Play زد، ویدیو ادامه پیدا می‌کند و در onended resolve خواهد شد.
                const onUserPlay = () => {
                    console.log('▶️ پخش با تعامل کاربر شروع شد');
                    removeTapToPlayOverlay(videoContainer);
                    video.removeEventListener('play', onUserPlay);
                };
                video.addEventListener('play', onUserPlay);
            });
        } else {
            console.warn('⚠️ عناصر ویدیو یافت نشدند');
            resolve();
        }
    });
}

// ایجاد یک لایه ساده برای درخواست تعامل کاربر جهت پخش ویدیو
function ensureTapToPlayOverlay(container, video) {
    if (!container) return;
    let overlay = container.querySelector('.tap-to-play');
    if (overlay) return; // قبلاً ایجاد شده
    overlay = document.createElement('div');
    overlay.className = 'tap-to-play';
    overlay.style.cssText = 'position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); color:#fff; font-family:\'IRANSans, Vazirmatn, sans-serif\'; font-size:20px; z-index:2147483648; text-align:center; cursor:pointer;';
    overlay.innerHTML = '<div style="padding:16px 24px; border:1px solid rgba(255,255,255,.3); border-radius:12px; background:rgba(20,20,20,.6); box-shadow:0 0 20px rgba(0,0,0,.5);">برای پخش ویدیو کلیک کنید</div>';
    overlay.addEventListener('click', () => {
        try { video.muted = false; } catch (_) {}
        try { video.play(); } catch (_) {}
    });
    container.appendChild(overlay);
}

function removeTapToPlayOverlay(container) {
    if (!container) return;
    const overlay = container.querySelector('.tap-to-play');
    if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
}

async function typeText(element, text, speed = 50) {
    return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                const char = text.charAt(i);
                if (char === '\n') {
                    element.innerHTML += '<br>';
                } else {
                    element.innerHTML += char;
                }
                i++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

// تابع پخش صدا با fade out
async function playAudioWithFadeOut(src, volume = 1.0, totalDuration = 0, fadeDuration = 2000) {
    return new Promise((resolve) => {
        try {
            stopCurrentAudio();
            
            console.log(`🔊 پخش صدا با fade out: ${src}`);
            
            currentAudio = new Audio(src);
            currentAudio.volume = volume;
            
            currentAudio.play().then(() => {
                console.log(`🎵 پخش موفق: ${src}`);
                
                // اگر totalDuration مشخص شده، fade را در زمان مناسب شروع کن
                if (totalDuration > 0) {
                    const fadeStartTime = totalDuration - fadeDuration;
                    console.log(`⏰ fade out در ${fadeStartTime}ms شروع می‌شود`);
                    
                    setTimeout(() => {
                        startFadeOut(currentAudio, volume, 0.2, fadeDuration);
                    }, fadeStartTime);
                    
                    // resolve بعد از تمام شدن کل صدا
                    setTimeout(() => {
                        resolve();
                    }, totalDuration);
                } else {
                    // برای صداهایی که طول مشخص ندارند، منتظر تمام شدن باش
                    currentAudio.onended = () => {
                        console.log(`✅ پخش تمام شد: ${src}`);
                        resolve();
                    };
                    
                    // fade در آخرین قسمت
                    currentAudio.ontimeupdate = () => {
                        const remaining = currentAudio.duration - currentAudio.currentTime;
                        if (remaining <= fadeDuration / 1000 && remaining > 0) {
                            startFadeOut(currentAudio, volume, 0.2, remaining * 1000);
                            currentAudio.ontimeupdate = null; // فقط یک بار اجرا شود
                        }
                    };
                }
                
            }).catch((error) => {
                console.warn(`⚠️ خطا در پخش: ${error.message}`);
                
                // تلاش با مسیر بدون /
                const altSrc = src.replace('/assets/', 'assets/');
                console.log(`🔄 تلاش با مسیر جایگزین: ${altSrc}`);
                
                const altAudio = new Audio(altSrc);
                altAudio.volume = volume;
                altAudio.play().then(() => {
                    console.log(`🎵 پخش موفق با مسیر جایگزین: ${altSrc}`);
                    currentAudio = altAudio;
                    
                    // همان منطق fade out برای مسیر جایگزین
                    if (totalDuration > 0) {
                        const fadeStartTime = totalDuration - fadeDuration;
                        setTimeout(() => {
                            startFadeOut(currentAudio, volume, 0.2, fadeDuration);
                        }, fadeStartTime);
                        setTimeout(() => resolve(), totalDuration);
                    } else {
                        currentAudio.onended = () => resolve();
                        currentAudio.ontimeupdate = () => {
                            const remaining = currentAudio.duration - currentAudio.currentTime;
                            if (remaining <= fadeDuration / 1000 && remaining > 0) {
                                startFadeOut(currentAudio, volume, 0.2, remaining * 1000);
                                currentAudio.ontimeupdate = null;
                            }
                        };
                    }
                    
                }).catch((altError) => {
                    console.error(`❌ هر دو مسیر ناموفق: ${altError.message}`);
                    resolve();
                });
            });
            
        } catch (error) {
            console.error('❌ خطای کلی در پخش صدا:', error);
            resolve();
        }
    });
}

// تابع fade out برای صدا
function startFadeOut(audio, startVolume, endVolume, duration) {
    console.log(`🔉 شروع fade out از ${startVolume} به ${endVolume} در ${duration}ms`);
    
    const startTime = Date.now();
    const volumeRange = startVolume - endVolume;
    
    const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            audio.volume = endVolume;
            clearInterval(fadeInterval);
            console.log(`✅ fade out تمام شد - volume: ${endVolume}`);
        } else {
            const currentVolume = startVolume - (volumeRange * progress);
            audio.volume = Math.max(currentVolume, endVolume);
        }
    }, 50); // هر 50ms به‌روزرسانی
}

// تابع پخش صدای مداوم (بدون قطع کردن)
async function playAudioContinuous(src, volume = 1.0) {
    return new Promise((resolve) => {
        try {
            console.log(`🔊 پخش صدای مداوم: ${src}`);
            
            currentAudio = new Audio(src);
            currentAudio.volume = volume;
            
            currentAudio.play().then(() => {
                console.log(`🎵 پخش مداوم شروع شد: ${src}`);
                resolve();
            }).catch((error) => {
                console.warn(`⚠️ خطا در پخش: ${error.message}`);
                
                // تلاش با مسیر بدون /
                const altSrc = src.replace('/assets/', 'assets/');
                console.log(`🔄 تلاش با مسیر جایگزین: ${altSrc}`);
                
                const altAudio = new Audio(altSrc);
                altAudio.volume = volume;
                altAudio.play().then(() => {
                    console.log(`🎵 پخش مداوم با مسیر جایگزین: ${altSrc}`);
                    currentAudio = altAudio;
                    resolve();
                }).catch((altError) => {
                    console.error(`❌ هر دو مسیر ناموفق: ${altError.message}`);
                    resolve();
                });
            });
            
        } catch (error) {
            console.error('❌ خطای کلی در پخش صدا:', error);
            resolve();
        }
    });
}

// تابع ساده‌شده برای پخش صدا (بعد از تعامل کاربر)
async function playAudioWithUserInteraction(src, volume = 1.0) {
    return playAudioWithFadeOut(src, volume, 0, 0); // بدون fade
}

// تابع createTempPlayButton حذف شد - دیگر نیاز نیست

// تابع قدیمی برای سازگاری
function playAudio(src, volume = 1.0) {
    playAudioWithUserInteraction(src, volume);
}

function stopCurrentAudio() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            console.log('⏹️ صدا متوقف شد');
        } catch (error) {
            console.warn('⚠️ خطا در توقف صدا:', error);
        }
        currentAudio = null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== AJIR MANAGEMENT FUNCTIONS ==========

// شروع آژیر مداوم (با preload مطمئن)
function startContinuousAjir(volume = 0.8) {
    try {
        // اگر در حال پخش است، فقط ولوم را تنظیم کن (idempotent)
        if (ajirAudio && !ajirAudio.ended) {
            ajirAudio.volume = Math.min(volume, 1.0);
            if (ajirAudio.paused) {
                ajirAudio.play().catch(() => {});
            }
            return;
        }

        console.log(`🔊 شروع آژیر مداوم با volume: ${volume}`);
        const absSrc = '/media/ajir';

        // آزادسازی آدرس قدیمی در صورت وجود
        try { if (ajirObjectUrl) { URL.revokeObjectURL(ajirObjectUrl); ajirObjectUrl = null; } } catch (_) {}

        // ابتدا با fetch بارگذاری می‌کنیم تا از خطاهای مسیر نسبی/مجازات cache جلوگیری شود
        fetch(absSrc, { cache: 'no-store' })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('audio') && !ct.includes('mpeg')) {
                    console.warn('⚠️ content-type غیر معمول برای آژیر:', ct);
                }
                return res.blob();
            })
            .then((blob) => {
                ajirObjectUrl = URL.createObjectURL(blob);
                const audio = new Audio(ajirObjectUrl);
                audio.loop = true;
                audio.volume = Math.min(volume, 1.0);
                return audio.play().then(() => {
                    ajirAudio = audio;
                    console.log('🎵 آژیر با blob شروع شد');
                });
            })
            .catch((err) => {
                console.warn('⚠️ fetch آژیر ناموفق، تلاش مستقیم:', err.message || err);
                const audio = new Audio(absSrc);
                audio.loop = true;
                audio.volume = Math.min(volume, 1.0);
                audio.play().then(() => {
                    ajirAudio = audio;
                    console.log('🎵 آژیر با مسیر مطلق شروع شد');
                }).catch(() => {
                    const altAudio = new Audio('/media/ajir');
                    altAudio.loop = true;
                    altAudio.volume = Math.min(volume, 1.0);
                    altAudio.play().then(() => {
                        ajirAudio = altAudio;
                        console.log('🎵 آژیر با مسیر نسبی شروع شد');
                    }).catch(() => {
                        console.error('❌ پخش آژیر ناموفق (همه مسیرها)');
                    });
                });
            });
    } catch (error) {
        console.error('❌ خطا در شروع آژیر:', error);
    }
}

// تغییر volume آژیر
function changeAjirVolume(newVolume) {
    if (ajirAudio) {
        console.log(`🔉 تغییر volume آژیر به: ${newVolume}`);
        ajirAudio.volume = Math.min(newVolume, 1.0);
    }
}

// fade out آژیر
function fadeOutAjir(duration = 1000) {
    if (!ajirAudio) return;
    
    console.log(`🔉 fade out آژیر در ${duration}ms`);
    const startVolume = ajirAudio.volume;
    const startTime = Date.now();
    
    const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            ajirAudio.pause();
            ajirAudio = null;
            try { if (ajirObjectUrl) { URL.revokeObjectURL(ajirObjectUrl); ajirObjectUrl = null; } } catch (_) {}
            clearInterval(fadeInterval);
            console.log('✅ آژیر fade out تمام شد');
        } else {
            const currentVolume = startVolume * (1 - progress);
            ajirAudio.volume = Math.max(currentVolume, 0);
        }
    }, 50);
}

// ========== USER PHASE MANAGEMENT ==========

// به‌روزرسانی حالت کاربر در دیتابیس
async function updateUserPhase(phase) {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        
        await fetch('/api/update-phase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, phase })
        });
        
        console.log(`✅ حالت کاربر به ${phase} تغییر کرد`);
    } catch (error) {
        console.warn('⚠️ خطا در به‌روزرسانی حالت:', error);
    }
}

// نمایش مستقیم ترمینال هکر (برای کاربران بازگشته)
function showHackedTerminalDirect() {
    console.log('🔄 نمایش مستقیم ترمینال هکر...');
    
    // مخفی کردن عناصر عادی
    const chatContainer = document.querySelector('.chat-container');
    const missionPanel = document.querySelector('.mission-panel');
    
    if (chatContainer) chatContainer.style.display = 'none';
    if (missionPanel) missionPanel.style.display = 'none';
    
    // نمایش ترمینال
    const terminalStage = document.getElementById('terminalStage');
    if (terminalStage) {
        terminalStage.classList.add('show');
        terminalStage.style.display = 'block';
        
        // شروع آژیر با volume کم
        startContinuousAjir(0.5);
        
        // نمایش پیام‌های ترمینال
        const terminalContent = document.getElementById('terminalContent');
        if (terminalContent) {
            terminalContent.innerHTML = `
                <div style="color: #00ff00; font-family: 'Courier New', monospace; font-size: 18px;">
                    سیستم شما توسط من و نیرو هام هک شده.<br><br>
                    از الان به بعد کنترل سیستم شما در دستان منه<br><br>
                    فکر نمیکردم شما فسقلی ها بتونین تا اینجا پیش برین<br><br>
                    از الان به بعد دیگه کاراگاهی وجود نداره که بهتون کمک کنه یا ازتون کمک بخواد.<br><br>
                    تنها شدین، من و تیمم نمیزاریم تلاشامون رو نابود کنین، بزودی این بیماری توی کل جهان پخش میشه و دیگه اثری از از اون اتفاق نمیمونه
                </div>
            `;
        }
    }
}

// Make hack sequence function global
window.beginHackSequence = beginHackSequence;
window.checkUserPhase = checkUserPhase;
window.initStudentProfiles = initStudentProfiles;

// ========== CHAT SYSTEM FUNCTIONS ==========
function updateChatUI(enabled) {
    chatEnabled = !!enabled;
    if (messageInput) {
        messageInput.disabled = !enabled;
        messageInput.placeholder = enabled ? 'پیام خود را اینجا بنویسید...' : 'سیستم چت برای شما غیرفعال است';
    }
    if (sendButton) {
        sendButton.disabled = !enabled;
    }
    if (fileInput) {
        fileInput.disabled = !enabled;
    }
}

// مقداردهی عناصر DOM
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
    
    // مدیریت auto-scroll: اگر کاربر اسکرول را بالا برد، دیگر به اجبار پایین نرویم
    chatMessages.addEventListener('scroll', () => {
        const nearBottom = (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight) < 50;
        autoScroll = nearBottom;
    });
    
    return true;
}

// راه‌اندازی Socket.IO
function initializeSocket() {
    if (typeof io === 'undefined') {
        console.error('❌ Socket.IO بارگذاری نشده');
        return;
    }
    
    chatSocket = io();
    
    chatSocket.on('connect', () => {
        console.log('🔗 اتصال به سرور برقرار شد');
        console.log('🆔 Socket ID:', chatSocket.id);
        console.log('👤 User ID:', window.userId);
        
        // پیوستن به اتاق کاربر
        chatSocket.emit('join_room', { userId: window.userId, username: window.username });
        
        // درخواست تاریخچه چت
        setTimeout(() => {
            console.log('📚 درخواست تاریخچه چت...');
            chatSocket.emit('get_chat_history', { userId: window.userId });
        }, 1000);
        
        // درخواست پیشرفت فعلی ماموریت
        setTimeout(() => {
            console.log('📊 درخواست پیشرفت ماموریت...');
            chatSocket.emit('get_mission_progress', { userId: window.userId });
        }, 1200);
    });
    
    chatSocket.on('disconnect', () => {
        console.log('🔌 اتصال قطع شد');
        addSystemMessage('اتصال قطع شد');
    });
    // حذف شد: قبلاً history را بی‌درنگ reload می‌کرد و باعث کندی می‌شد
    
    // Auto-refresh history: با محدودسازی نرخ و فقط وقتی تب فعال است و کاربر پایین لیست است
    setInterval(() => {
        if (!chatSocket || !chatSocket.connected || !window.userId) return;
        if (document.visibilityState && document.visibilityState !== 'visible') return; // فقط وقتی تب فعال است
        const now = Date.now();
        if (now - lastHistoryReloadAt < REFRESH_INTERVAL_MS) return; // محدودسازی نرخ
        if (!autoScroll && initialHistoryLoaded) return; // وقتی کاربر در حال خواندن پیام‌های قدیمی است مزاحم نشو
        chatSocket.emit('get_chat_history', { userId: window.userId });
    }, 5000);
    
    chatSocket.on('chat_history', (messages) => {
        console.log('📚 تاریخچه چت بارگذاری شد:', messages.length, 'پیام');
        
        // بررسی تغییر در تعداد پیام‌ها
        if (messages.length !== lastMessageCount) {
            console.log(`🔄 تغییر در پیام‌ها: ${lastMessageCount} → ${messages.length}`);
            lastMessageCount = messages.length;
        }
        
        // پاک کردن پیام‌های قبلی
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // نمایش پیام‌ها
        messages.forEach(message => {
            displayMessage(message, false); // بدون انیمیشن برای تاریخچه
        });
        
        // اسکرول: بار اول حتماً به آخر برو، بعد از آن فقط اگر کاربر پایین است
        if (!initialHistoryLoaded) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            initialHistoryLoaded = true;
        } else if (autoScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        // ثبت زمان آخرین رفرش
        lastHistoryReloadAt = Date.now();
    });
    
    // Listener برای به‌روزرسانی پیشرفت ماموریت
    chatSocket.on('update_mission_progress', (progressData) => {
        console.log('🎯 به‌روزرسانی پیشرفت ماموریت دریافت شد:', progressData);
        console.log('📊 Progress data:', progressData);
        updateMissionProgress(progressData.progress, progressData.previousProgress);
    });
    
    // Listener برای دریافت پیشرفت فعلی ماموریت
    chatSocket.on('current_mission_progress', (progressData) => {
        console.log('📊 پیشرفت فعلی ماموریت دریافت شد:', progressData);
        updateMissionProgress(progressData.progress, 0, false); // بدون پیام سیستم
    });

    // Chat permission live updates
    chatSocket.on('chat_permission_changed', (data) => {
        console.log('🔐 chat_permission_changed:', data);
        updateChatUI(!!data.enabled);
        if (!data.enabled) {
            addSystemMessage('🔒 چت توسط ادمین برای شما غیرفعال شد');
        } else {
            addSystemMessage('🔓 چت توسط ادمین برای شما فعال شد');
        }
    });
    chatSocket.on('chat_blocked', (data) => {
        console.log('⛔ chat_blocked:', data);
        updateChatUI(false);
        alert('❌ سیستم چت برای شما غیرفعال است');
    });

    // duplicate chat_history handler حذف شد
    // پیام جدید
    chatSocket.on('new_message', (messageData) => {
        try {
            if (!messageData) return;
            displayMessage(messageData, true);
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (e) { console.warn('⚠️ new_message render error:', e); }
    });
    // پیام رمزنگاری‌شده
    chatSocket.on('scrambled_message', (messageData) => {
        try {
            if (!messageData) return;
            displayMessage(messageData, true);
        } catch (e) { console.warn('⚠️ scrambled_message render error:', e); }
    });
    chatSocket.on('message_deleted', (payload) => {
        try {
            const id = payload && payload.messageId;
            if (!id) return;
            const el = document.querySelector(`.message-packet[data-message-id="${id}"]`);
            if (el && el.parentElement) el.parentElement.removeChild(el);
        } catch (e) { console.warn('⚠️ message_deleted handler error:', e); }
    });
    chatSocket.on('message_edited', (payload) => {
        try {
            const id = payload && payload.messageId;
            if (!id) return;
            const el = document.querySelector(`.message-packet[data-message-id="${id}"] .packet-content`);
            if (el) el.innerHTML = payload.content || '';
        } catch (e) { console.warn('⚠️ message_edited handler error:', e); }
    });
    chatSocket.on('chat_permission_changed', (data) => {
        try {
            if (!data || typeof data.enabled === 'undefined') return;
            updateChatUI(!!data.enabled);
            console.log('🔐 chat permission changed →', data.enabled);
        } catch (e) { console.warn('⚠️ chat_permission_changed handler error:', e); }
    });
    // شروع سکانس هک از طرف ادمین
    chatSocket.on('start_hack_sequence', (payload) => {
        console.log('🚨 start_hack_sequence received:', payload);
        if (typeof window.beginHackSequence === 'function') {
            window.beginHackSequence();
        }
    });
}

// تابع به‌روزرسانی نوار پیشرفت ماموریت
function updateMissionProgress(newProgress, previousProgress = 0, showSystemMessage = true) {
    console.log(`📊 به‌روزرسانی پیشرفت: ${previousProgress}% → ${newProgress}%`);
    
    // پیدا کردن المان‌های نوار پیشرفت
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (progressBar) {
        // به‌روزرسانی عرض نوار پیشرفت با انیمیشن
        progressBar.style.width = newProgress + '%';
        console.log(`✅ نوار پیشرفت به ${newProgress}% تنظیم شد`);
    } else {
        console.warn('⚠️ المان progress-bar پیدا نشد');
    }
    
    if (progressText) {
        // به‌روزرسانی متن درصد
        progressText.textContent = newProgress + '%';
    }
    
    if (progressPercentage) {
        // به‌روزرسانی درصد در جای دیگر
        progressPercentage.textContent = newProgress + '%';
    }
    
    // نمایش پیام موفقیت فقط اگر درخواست شده باشد
    if (showSystemMessage && newProgress > previousProgress) {
        addSystemMessage(`🎯 پیشرفت ماموریت: ${newProgress}%`);
        
        // اگر به 90% رسید، پیام ویژه نمایش بده
        if (newProgress >= 90) {
            setTimeout(() => {
                addSystemMessage('🎉 ماموریت تقریباً کامل شد! آماده باش برای مرحله نهایی...');
            }, 1000);
        }
    }
}

// نمایش پیام به سبک بسته داده هولوگرافیک
function displayMessage(messageData, animate = true) {
    if (!chatMessages) return;
    
    // ایجاد بسته داده اصلی
    const packetDiv = document.createElement('div');
    packetDiv.className = 'message-packet';
    if (typeof messageData.id !== 'undefined') {
        try { packetDiv.setAttribute('data-message-id', String(messageData.id)); } catch (_) {}
    }
    
    // تعیین نوع بسته و کلاس‌های مناسب
    let senderAvatar = '';
    let senderName = '';
    
    if (messageData.sender_type === 'user') {
        packetDiv.classList.add('user-message');
        senderAvatar = '<img src="/images/avatars/user.png" alt="کاربر" class="packet-avatar" onclick="openAvatarZoom(\'/images/avatars/user.png\', \'شما\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'👤 شما\';">';
        senderName = 'شما';
    } else if (messageData.sender_type === 'detective') {
        packetDiv.classList.add('admin-message');
        senderAvatar = '<img src="/images/avatars/karagah.png" alt="کارآگاه" class="packet-avatar" onclick="openAvatarZoom(\'/images/avatars/karagah.png\', \'کارآگاه\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'🕵️ کارآگاه\';">';
        senderName = 'کارآگاه';
    } else if (messageData.sender_type === 'hacker') {
        packetDiv.classList.add('hacker-message');
        senderAvatar = '<img src="/assets/haker.mask.png" alt="هکر" class="packet-avatar" onclick="openAvatarZoom(\'/assets/haker.mask.png\', \'هکر\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'💀 هکر\';">';
        senderName = 'هکر';
    } else {
        packetDiv.classList.add('admin-message');
        senderAvatar = '<img src="/images/avatars/karagah.png" alt="ادمین" class="packet-avatar" onclick="openAvatarZoom(\'/images/avatars/karagah.png\', \'ادمین\')" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'👨‍💼 ادمین\';">';
        senderName = 'ادمین';
    }
    
    // زمان پیام
    const timestamp = new Date(messageData.timestamp).toLocaleString('fa-IR');
    
    // هدر بسته
    const headerDiv = document.createElement('div');
    headerDiv.className = 'packet-header';
    headerDiv.innerHTML = `
        <span class="sender-avatar">${senderAvatar}</span>
        <strong>${senderName}</strong>
    `;
    
    // محتوای بسته
    const contentDiv = document.createElement('div');
    contentDiv.className = 'packet-content';
    
    let content = messageData.content || '';
    
    // اگر content قبلاً شامل ویدیو/تصویر است، فایل اضافی اضافه نمی‌کنیم
    const hasVideoInContent = content.includes('<video') || content.includes('<source');
    const hasImageInContent = content.includes('<img');
    
    // بررسی فایل فقط اگر در content موجود نباشد
    if (messageData.file_url && !hasVideoInContent && !hasImageInContent) {
        if (messageData.file_type && messageData.file_type.startsWith('image/')) {
            content += `<img loading="lazy" src="${messageData.file_url}" alt="تصویر" onclick="openImageZoom('${messageData.file_url}')">`;
        } else if (messageData.file_type && messageData.file_type.startsWith('video/')) {
            content += `<video controls preload="metadata" playsinline>
                <source src="${messageData.file_url}" type="${messageData.file_type}">
                مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
            </video>`;
        } else if (messageData.file_type && messageData.file_type.startsWith('audio/')) {
            content += `<audio controls preload="metadata">
                <source src="${messageData.file_url}" type="${messageData.file_type}">
                مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
            </audio>`;
        } else {
            content += `<br><a href="${messageData.file_url}" target="_blank" style="color: #00ffff;">📎 فایل ضمیمه</a>`;
        }
    }
    
    contentDiv.innerHTML = content;
    
    // فوتر بسته
    const footerDiv = document.createElement('div');
    footerDiv.className = 'packet-footer';
    footerDiv.innerHTML = `<span class="message-time">${timestamp}</span>`;
    
    // ترکیب عناصر
    packetDiv.appendChild(headerDiv);
    packetDiv.appendChild(contentDiv);
    packetDiv.appendChild(footerDiv);
    
    // انیمیشن ورود
    if (animate) {
        packetDiv.style.opacity = '0';
        packetDiv.style.transform = 'translateY(20px) scale(0.95)';
    }
    
    chatMessages.appendChild(packetDiv);
    
    if (animate) {
        setTimeout(() => {
            packetDiv.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            packetDiv.style.opacity = '1';
            packetDiv.style.transform = 'translateY(0) scale(1)';
        }, 50);
    }
    
    // اسکرول به پایین فقط در شرایط لازم
    if (animate || autoScroll || !initialHistoryLoaded) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// ارسال پیام
function sendMessage() {
    if (!messageInput || !chatSocket) return;
    if (!chatEnabled) { alert('❌ سیستم چت برای شما غیرفعال است'); return; }
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    console.log('📤 ارسال پیام:', content);
    
    const messageData = {
        userId: window.userId,
        content: content,
        senderType: 'user'
    };
    
    // ارسال پیام
    chatSocket.emit('send_message', messageData);
    messageInput.value = '';
    
    // بعد از ارسال، history را reload می‌کنیم تا پیام کاربر نمایش داده شود
    setTimeout(() => {
        chatSocket.emit('get_chat_history', { userId: window.userId });
    }, 1000);
    
    // درخواست پیشرفت فعلی ماموریت
    setTimeout(() => {
        chatSocket.emit('get_mission_progress', { userId: window.userId });
    }, 1200);
}

// پیام سیستم به سبک بسته داده
function addSystemMessage(message) {
    if (!chatMessages) return;
    
    const packetDiv = document.createElement('div');
    packetDiv.className = 'message-packet system-message';
    
    const timestamp = new Date().toLocaleString('fa-IR');
    
    packetDiv.innerHTML = `
        <div class="packet-header">
            <span class="sender-avatar"><img src="/images/avatars/system.png" alt="سیستم" class="packet-avatar" onerror="this.style.display='none'; this.parentElement.innerHTML='⚡ سیستم';"></span>
            <strong>سیستم</strong>
        </div>
        <div class="packet-content">${message}</div>
        <div class="packet-footer">
            <span class="message-time">${timestamp}</span>
        </div>
    `;
    
    chatMessages.appendChild(packetDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

// باز کردن مودال رسانه (تصویر یا ویدیو)
function openMediaModal(mediaSrc, mediaType) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    let mediaElement;
    
    if (mediaType && mediaType.startsWith('video/')) {
        mediaElement = document.createElement('video');
        mediaElement.controls = true;
        mediaElement.autoplay = false;
        mediaElement.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 10px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        `;
        
        const source = document.createElement('source');
        source.src = mediaSrc;
        source.type = mediaType;
        mediaElement.appendChild(source);
        
        // جلوگیری از بسته شدن مودال هنگام کلیک روی ویدیو
        mediaElement.onclick = (e) => {
            e.stopPropagation();
        };
    } else {
        mediaElement = document.createElement('img');
        mediaElement.src = mediaSrc;
        mediaElement.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 10px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        `;
    }
    
    modal.appendChild(mediaElement);
    document.body.appendChild(modal);
    
    modal.onclick = () => {
        document.body.removeChild(modal);
    };
}

// تابع قدیمی برای سازگاری
function openImageModal(imageSrc) {
    openMediaModal(imageSrc, 'image/jpeg');
}

// باز کردن مودال آواتار
function openAvatarModal(avatarSrc, title) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = avatarSrc;
    img.style.cssText = `
        max-width: 300px;
        max-height: 300px;
        border-radius: 50%;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        margin-bottom: 20px;
    `;
    
    const titleDiv = document.createElement('div');
    titleDiv.textContent = title;
    titleDiv.style.cssText = `
        color: #00ffff;
        font-size: 24px;
        font-family: inherit;
        text-align: center;
    `;
    
    modal.appendChild(img);
    modal.appendChild(titleDiv);
    document.body.appendChild(modal);
    
    modal.onclick = () => {
        document.body.removeChild(modal);
    };
}

// راه‌اندازی event listeners
function setupEventListeners() {
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    const msgInputEl = document.getElementById('messageInput');
    if (msgInputEl) {
        msgInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        // Bind typing sound (با جلوگیری از دوباره‌بندی)
        bindTypingSound(msgInputEl);
    }
    
    // اگر input فایل از قبل inline onchange دارد، دوباره‌بندی نکنیم
    if (fileInput && !fileInput.getAttribute('onchange')) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

// مدیریت آپلود فایل
function handleFileUpload(event) {
    if (!chatEnabled) { alert('❌ سیستم چت برای شما غیرفعال است'); return; }
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📎 فایل انتخاب شد:', file.name);
    
    // بررسی اندازه فایل (حداکثر 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('❌ فایل خیلی بزرگ است (حداکثر 10MB)');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', window.userId);
    formData.append('senderType', 'user');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ فایل آپلود شد:', data.fileUrl);
            
            // ارسال پیام با فایل
            const messageData = {
                userId: window.userId,
                content: `فایل ارسال شد: ${file.name}`,
                senderType: 'user',
                fileUrl: data.fileUrl,
                fileType: file.type
            };
            
            chatSocket.emit('send_message', messageData);
        } else {
            alert('❌ خطا در آپلود فایل: ' + data.error);
        }
    })
    .catch(error => {
        console.error('❌ خطا در آپلود فایل:', error);
        alert('❌ خطا در آپلود فایل');
    });
    
    // پاک کردن انتخاب فایل
    event.target.value = '';
}

// بررسی حالت کاربر هنگام بارگذاری صفحه
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 بررسی حالت کاربر و راه‌اندازی چت...');
    
    console.log('👤 اطلاعات کاربر:', { userId: window.userId, username: window.username });
    
    // راه‌اندازی عناصر DOM
    if (initializeElements()) {
        // راه‌اندازی Socket.IO
        initializeSocket();
        
        // راه‌اندازی event listeners
        setupEventListeners();

        // Persist userId locally and load initial user config
        try { localStorage.setItem('userId', String(window.userId)); } catch (e) {}
        fetch(`/api/user-config/${window.userId}`)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(cfg => {
                window.userConfig = cfg;
                updateChatUI(!!cfg.chatEnabled);
                if (cfg.hackStatus === 'hacked') {
                    // نمایش مستقیم ترمینال هک
                    showHackedTerminalDirect();
                }
            })
            .catch(err => console.warn('⚠️ خطا در دریافت تنظیمات کاربر:', err));

        console.log('✅ سیستم چت راه‌اندازی شد');
    }
});

function updateChatUI(enabled) {
    // Unified UI toggle (duplicate-safe)
    chatEnabled = !!enabled;
    if (typeof messageInput !== 'undefined' && messageInput) {
        messageInput.disabled = !enabled;
        messageInput.placeholder = enabled ? 'پیام خود را اینجا بنویسید...' : 'سیستم چت برای شما غیرفعال است';
    }
    if (typeof sendButton !== 'undefined' && sendButton) {
        sendButton.disabled = !enabled;
    }
    if (typeof fileInput !== 'undefined' && fileInput) {
        fileInput.disabled = !enabled;
    }
}
