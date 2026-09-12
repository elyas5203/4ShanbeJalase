// Independent Live GPS Module (Leaflet) - Scoped and Non-intrusive
// Auto-starts geolocation after DOMContentLoaded, no button press needed
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('live-gps-map-container');
    const mapDiv = document.getElementById('leaflet-map-element');
    if (!container || !mapDiv) return;
    window.__useNewGPSModule = true;

    let map, marker, accuracyCircle;
    let watchId = null;
    let autoCenter = true;
    let recenterTimer = null;
    let lastKnown = null;
    let haveFix = false;
    let curLat = null, curLon = null;
    let lastAcc = Infinity;
    let ensureTimer = null;

    // 1) Initialize map immediately (no wait for GPS)
    const cached = loadLast();
    // Iran-wide view as default to avoid misleading Tehran center
    const DEFAULT_LAT = 32.4279, DEFAULT_LON = 53.6880; // Iran center-ish
    const initLat = cached ? cached.lat : DEFAULT_LAT;
    const initLon = cached ? cached.lon : DEFAULT_LON;
    const initAcc = cached ? 60 : 3000; // large acc indicates wide view
    initializeMap(initLat, initLon, initAcc, !cached);

    // Start continuous high-accuracy tracking
    startTracking();

    function startTracking() {
      if (!navigator.geolocation) return;
      const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
      try { watchId = navigator.geolocation.watchPosition(onUpdate, onError, options); } catch(_) {}
    }

    function stopTracking() {
      if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch(_) {} watchId = null; }
      try { clearTimeout(recenterTimer); } catch(_) {}
      autoCenter = true;
    }

    function onUpdate(position) {
      const { latitude, longitude, accuracy } = position.coords;
      lastKnown = { lat: latitude, lon: longitude };
      if (!map) initializeMap(latitude, longitude, accuracy, false);
      const acc = Number.isFinite(accuracy) ? accuracy : 99999;
      const ACC_GOOD = 150;        // precise enough
      const ACC_MAX_ACCEPT = 1200; // usable
      const MAX_JUMP_FOR_POOR = 30; // km
      const deltaKm = (haveFix && curLat!=null && curLon!=null) ? haversineKm(curLat, curLon, latitude, longitude) : 0;
      const isGood = acc <= ACC_GOOD;
      const accept = isGood || (!haveFix) || (acc <= ACC_MAX_ACCEPT && deltaKm <= MAX_JUMP_FOR_POOR);

      if (!accept) { requestFreshGPSFix(); return; }

      curLat = latitude; curLon = longitude; haveFix = true;
      lastAcc = acc;
      try { marker.setLatLng([latitude, longitude]); } catch(_) {}
      try { accuracyCircle.setLatLng([latitude, longitude]).setRadius(acc); } catch(_) {}
      if (isGood) {
        try { marker.setOpacity(1); } catch(_) {}
        if (autoCenter) { try { map.setView([latitude, longitude], Math.max(map.getZoom() || 16, 16)); } catch(_) {} }
        try { window.__locSource = 'GPS'; window.dispatchEvent(new CustomEvent('locsource', { detail: 'GPS دقیق' })); } catch(_) {}
      } else {
        try { marker.setOpacity(0.4); } catch(_) {}
        // Avoid snapping to wrong city; show as Network
        try { window.__locSource = 'IP/Network'; window.dispatchEvent(new CustomEvent('locsource', { detail: 'IP/Network' })); } catch(_) {}
        requestFreshGPSFix();
      }
      if (acc <= ACC_MAX_ACCEPT) saveLast(latitude, longitude, acc);

      if (!ensureTimer) {
        ensureTimer = setInterval(function(){ if (lastAcc <= ACC_GOOD) { clearInterval(ensureTimer); ensureTimer = null; } else { requestFreshGPSFix(); } }, 8000);
      }
    }

    function onError(_) {}

    function initializeMap(lat, lon, acc, wide) {
      try { mapDiv.style.display = 'block'; } catch(_) {}
      if (typeof L === 'undefined') return;
      map = L.map(mapDiv, {
        attributionControl: false,
        zoomControl: false,
        preferCanvas: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        scrollWheelZoom: true,
        touchZoom: 'center',
        tap: false,
        worldCopyJump: true
      }).setView([lat, lon], wide ? 5 : 14); // start wide if not cached

      // Tile providers with fallback order (persist last good index)
      const TILES = [
        { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', opts: { attribution: '&copy; OpenStreetMap & CARTO', subdomains: 'abcd' } },
        { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',                 opts: { attribution: '&copy; OpenStreetMap contributors' } },
        { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',          opts: { attribution: '&copy; OpenStreetMap France HOT', subdomains: 'abc' } }
      ];

      let startIdx = 0;
      try { const v = parseInt(localStorage.getItem('gps:tilesIdx')||''); if (!Number.isNaN(v)) startIdx = Math.min(Math.max(v,0), TILES.length-1); } catch(_) {}

      applyTiles(startIdx);

      function applyTiles(idx){
        const p = TILES[idx]; if (!p) return; // give up
        let loaded = false;
        const tl = L.tileLayer(p.url, Object.assign({
          maxZoom: 19,
          maxNativeZoom: 19,
          detectRetina: false,
          updateWhenIdle: true,
          keepBuffer: 1,
          crossOrigin: true,
          tileSize: 256,
          noWrap: true
        }, p.opts));

        const onOk = () => { loaded = true; try { localStorage.setItem('gps:tilesIdx', String(idx)); } catch(_) {} cleanup(); };
        const onErr = () => {};
        function cleanup(){ tl.off('load', onOk); tl.off('tileerror', onErr); try { clearTimeout(tmo); } catch(_) {} }

        tl.once('load', onOk);
        tl.on('tileerror', onErr);

        // If first tiles didn't load quickly, fall back to next provider
        const tmo = setTimeout(() => {
          if (!loaded) { try { map.removeLayer(tl); } catch(_) {} applyTiles(idx+1); }
        }, 1000);

        tl.addTo(map);
      }
      const sonarHTML = '<div class="sonar-marker"><div class="sonar-core"></div><div class="ring"></div><div class="ring r2"></div></div>';
      const sonarIcon = L.divIcon({ className: 'sonar-div-icon', html: sonarHTML, iconSize: [34,34], iconAnchor: [17,17] });
      marker = L.marker([lat, lon], { icon: sonarIcon, keyboard: false, interactive: false, opacity: 0.4 }).addTo(map);
      accuracyCircle = L.circle([lat, lon], { radius: acc, color: '#00ffa3', fillColor: '#00ffa3', fillOpacity: 0.12, weight: 1 }).addTo(map);
      map.on('dragstart zoomstart', function() { autoCenter = false; try { clearTimeout(recenterTimer); } catch(_) {} });
      map.on('dragend zoomend', function() { try { clearTimeout(recenterTimer); } catch(_) {} recenterTimer = setTimeout(function(){ autoCenter = true; if (lastKnown) { try { map.flyTo([lastKnown.lat, lastKnown.lon], Math.max(map.getZoom() || 17, 17)); } catch(_) {} } }, 5000); });
      try { setTimeout(function(){ map.invalidateSize(); }, 0); } catch(_) {}
    }

    // Force a fresh, high-accuracy single fix if current accuracy is poor
    function requestFreshGPSFix(){
      try {
        navigator.geolocation.getCurrentPosition(function(pos){
          try { onUpdate(pos); } catch(_) {}
        }, function(){}, { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 });
      } catch(_) {}
    }

    function haversineKm(aLat, aLon, bLat, bLon){
      const R=6371; const dLat=(bLat-aLat)*Math.PI/180; const dLon=(bLon-aLon)*Math.PI/180;
      const s1=Math.sin(dLat/2), s2=Math.sin(dLon/2);
      const x = s1*s1 + Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*s2*s2;
      return 2*R*Math.asin(Math.min(1, Math.sqrt(x)));
    }

    window.addEventListener('beforeunload', stopTracking);

    function loadLast(){
      try {
        const raw = localStorage.getItem('gps:last');
        if (!raw) return null;
        const j = JSON.parse(raw);
        if (!j || typeof j.lat!== 'number' || typeof j.lon !== 'number') return null;
        const TTL = 1000 * 60 * 60 * 6; // 6h
        const accOk = typeof j.acc === 'number' ? j.acc <= 1000 : false;
        const fresh = typeof j.t === 'number' ? (Date.now() - j.t) < TTL : false;
        return (accOk && fresh) ? j : null;
      } catch(_) { return null; }
    }
    function saveLast(lat, lon, acc){ try { localStorage.setItem('gps:last', JSON.stringify({ lat, lon, acc: Number(acc)||null, t: Date.now() })); } catch(_) {} }
  });
})();
