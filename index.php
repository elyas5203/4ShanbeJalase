<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>مدیریت هوشمند کلاس</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">


<script>
// Tiny local chart renderer used instead of Chart.js CDN. It supports the line/bar charts used by this app.
class Chart {
  static register() {}
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config || {};
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.tooltip = {getActiveElements: () => []};
    this.chartArea = {top: 0, bottom: 0};
    this.activeIndex = null;
    this._resizeHandler = () => this.draw();
    this._moveHandler = (event) => this._handlePointer(event);
    this._leaveHandler = () => { this.activeIndex = null; this._hideTip(); this.draw(); };
    window.addEventListener('resize', this._resizeHandler);
    if (this.canvas) {
      this.canvas.addEventListener('pointermove', this._moveHandler);
      this.canvas.addEventListener('pointerdown', this._moveHandler);
      this.canvas.addEventListener('pointerleave', this._leaveHandler);
    }
    this.draw();
  }
  destroy() {
    window.removeEventListener('resize', this._resizeHandler);
    if (this.canvas) {
      this.canvas.removeEventListener('pointermove', this._moveHandler);
      this.canvas.removeEventListener('pointerdown', this._moveHandler);
      this.canvas.removeEventListener('pointerleave', this._leaveHandler);
    }
    this._hideTip();
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  _resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    const w = Math.max(260, rect.width || 320);
    const h = Math.max(160, rect.height || 220);
    this.canvas.width = Math.floor(w * ratio);
    this.canvas.height = Math.floor(h * ratio);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return {w, h};
  }
  draw() {
    if (!this.canvas || !this.ctx) return;
    const {w, h} = this._resize();
    const cfg = this.config;
    const type = cfg.type || 'line';
    const labels = (cfg.data && cfg.data.labels) || [];
    const ds = ((cfg.data && cfg.data.datasets) || [])[0] || {data: []};
    const data = (ds.data || []).map(v => Number(v) || 0);
    const horizontal = cfg.options && cfg.options.indexAxis === 'y';
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.direction = 'rtl';
    this.ctx.font = '12px Tahoma, sans-serif';
    if (!labels.length) { this._empty(w, h); return; }
    if (type === 'bar') horizontal ? this._barHorizontal(labels, data, ds, w, h) : this._barVertical(labels, data, ds, w, h);
    else this._line(labels, data, ds, w, h, cfg);
  }
  _fmt(v) { return (typeof window.toPersianNum === 'function') ? window.toPersianNum(v) : String(v).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
  _empty(w, h) { this.ctx.fillStyle = '#94a3b8'; this.ctx.textAlign = 'center'; this.ctx.fillText('داده‌ای برای نمایش نیست', w/2, h/2); }
  _grid(x, y, w, h) { const c=this.ctx; c.strokeStyle='#e2e8f0'; c.lineWidth=1; for(let i=0;i<=4;i++){ const yy=y+h-(h*i/4); c.beginPath(); c.moveTo(x,yy); c.lineTo(x+w,yy); c.stroke(); } }
  _line(labels, data, ds, w, h, cfg) {
    const c=this.ctx, pad={l:38,r:18,t:18,b:44}, x=pad.l, y=pad.t, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
    const optMax = cfg.options && cfg.options.scales && cfg.options.scales.y && cfg.options.scales.y.max;
    const max = optMax || Math.max(5, ...data);
    this._grid(x,y,cw,ch);
    const pts = data.map((v,i)=>({x:x+(labels.length===1?cw/2:(cw*i/(labels.length-1))), y:y+ch-(Math.max(0,v)/max)*ch, v}));
    this._points = pts; this._plot = {x, y, w: cw, h: ch};
    c.strokeStyle = ds.borderColor || '#4f46e5'; c.lineWidth = 3; c.beginPath(); pts.forEach((p,i)=> i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)); c.stroke();
    c.fillStyle = ds.borderColor || '#4f46e5'; pts.forEach(p=>{ c.beginPath(); c.arc(p.x,p.y,4,0,Math.PI*2); c.fill(); });
    c.fillStyle = '#64748b'; c.textAlign = 'center'; labels.forEach((lb,i)=>{ c.fillText(this._fmt(lb), pts[i].x, h-18); });
    c.textAlign='right'; c.fillText(this._fmt(max), x-6, y+4); c.fillText(this._fmt(0), x-6, y+ch+4);
    this._drawActive();
  }
  _barVertical(labels, data, ds, w, h) {
    const c=this.ctx, pad={l:32,r:16,t:20,b:58}, x=pad.l, y=pad.t, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
    const max=Math.max(5,...data); this._grid(x,y,cw,ch); const gap=8, bw=Math.max(14,(cw/labels.length)-gap);
    labels.forEach((lb,i)=>{ const bh=(Math.max(0,data[i])/max)*ch, bx=x+i*(cw/labels.length)+(cw/labels.length-bw)/2, by=y+ch-bh; c.fillStyle=ds.backgroundColor||'#4f46e5'; this._roundRect(bx,by,bw,bh,6); c.fill(); c.fillStyle='#334155'; c.textAlign='center'; c.fillText(this._fmt(data[i]), bx+bw/2, by-5); c.save(); c.translate(bx+bw/2,h-18); c.rotate(-0.55); c.fillStyle='#64748b'; c.fillText(this._fmt(String(lb).replace(/ .*/,'')),0,0); c.restore(); });
  }
  _barHorizontal(labels, data, ds, w, h) {
    const c=this.ctx, pad={l:26,r:120,t:16,b:20}, x=pad.l, y=pad.t, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
    const max=Math.max(5,...data); const row=ch/labels.length;
    labels.forEach((lb,i)=>{ const by=y+i*row+row*0.22, bh=Math.max(12,row*0.52), bw=(Math.max(0,data[i])/max)*cw; c.fillStyle='#eef2ff'; this._roundRect(x,by,cw,bh,7); c.fill(); c.fillStyle=ds.backgroundColor||'#4f46e5'; this._roundRect(x,by,bw,bh,7); c.fill(); c.fillStyle='#334155'; c.textAlign='right'; c.fillText(this._fmt(lb), w-10, by+bh*0.75); c.textAlign='left'; c.fillText(this._fmt(data[i]), x+bw+5, by+bh*0.75); });
  }
  _handlePointer(event) {
    if (!this._points || !this._points.length) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let nearest = 0;
    let dist = Infinity;
    this._points.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < dist) { dist = d; nearest = i; } });
    this.activeIndex = nearest;
    this.draw();
    this._showTip(nearest, event.clientX - rect.left, event.clientY - rect.top);
  }
  _activeLines(index) {
    const cfg = this.config || {}, labels = (cfg.data && cfg.data.labels) || [], ds = ((cfg.data && cfg.data.datasets) || [])[0] || {};
    const value = (ds.data || [])[index] ?? 0;
    const cb = cfg.options && cfg.options.plugins && cfg.options.plugins.tooltip && cfg.options.plugins.tooltip.callbacks && cfg.options.plugins.tooltip.callbacks.label;
    let lines = [];
    if (typeof cb === 'function') {
      const out = cb({raw: value, dataIndex: index, label: labels[index]});
      lines = Array.isArray(out) ? out : [out];
    } else {
      lines = [`${ds.label || 'مقدار'}: ${this._fmt(value)}`];
    }
    return [`جلسه: ${this._fmt(labels[index] || '')}`].concat(lines.map(x => this._fmt(x)));
  }
  _drawActive() {
    if (this.activeIndex === null || !this._points || !this._points[this.activeIndex] || !this._plot) return;
    const c = this.ctx, p = this._points[this.activeIndex], plot = this._plot;
    c.save();
    c.beginPath(); c.moveTo(p.x, plot.y); c.lineTo(p.x, plot.y + plot.h); c.lineWidth = 2; c.strokeStyle = 'rgba(20,33,61,.55)'; c.setLineDash([5,5]); c.stroke();
    c.setLineDash([]); c.fillStyle = '#fff8e8'; c.strokeStyle = '#c89b3c'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 6, 0, Math.PI*2); c.fill(); c.stroke();
    c.restore();
  }
  _showTip(index, x, y) {
    if (!this.canvas) return;
    if (!this.tip) { this.tip = document.createElement('div'); this.tip.className = 'chart-tip chart-tip-fixed'; document.body.appendChild(this.tip); }
    this.tip.innerHTML = this._activeLines(index).map((line, i) => i ? `<div class="${i === 1 ? 'tip-metric' : ''}">${line}</div>` : `<b>${line}</b>`).join('');
    const rect = this.canvas.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
    const vh = window.innerHeight || document.documentElement.clientHeight || 640;
    const tipW = Math.min(320, Math.max(236, vw - 18));
    this.tip.style.width = tipW + 'px';
    this.tip.style.display = 'block';
    const tipH = this.tip.offsetHeight || 160;
    let left = rect.left + x + 16;
    if (left + tipW + 10 > vw) left = rect.left + x - tipW - 16;
    left = Math.max(9, Math.min(vw - tipW - 9, left));
    let top = rect.top + y - 18;
    if (top + tipH + 10 > vh) top = vh - tipH - 10;
    top = Math.max(9, top);
    this.tip.style.left = left + 'px';
    this.tip.style.top = top + 'px';
  }
  _hideTip() { if (this.tip) this.tip.style.display = 'none'; }
  _roundRect(x,y,w,h,r){ const c=this.ctx; if (w < 0) w = 0; r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
}
</script>

  <style>

    /* Local-only fallbacks: no CDN/font/icon dependency. */
    .fas, .fa { font-style: normal; line-height: 1; display: inline-block; min-width: 1em; text-align: center; }
    .fa-chart-line::before { content: "📈"; } .fa-toolbox::before { content: "🧰"; } .fa-user-graduate::before { content: "👤"; }
    .fa-book-reader::before { content: "📚"; } .fa-history::before { content: "🕘"; } .fa-check-double::before { content: "✅"; }
    .fa-star-half-alt::before { content: "⭐"; } .fa-pen-nib::before { content: "✍"; } .fa-user-cog::before, .fa-cog::before { content: "⚙"; }
    .fa-moon::before { content: "🌙"; } .fa-stopwatch::before { content: "⏱"; } .fa-users-cog::before { content: "👥"; }
    .fa-pen-fancy::before { content: "📝"; } .fa-trash::before { content: "🗑"; } .fa-edit::before { content: "✏"; }
    .fa-check-circle::before, .fa-check::before { content: "✓"; } .fa-times::before { content: "×"; } .fa-chevron-down::before { content: "⌄"; }
    .fa-info-circle::before { content: "ℹ"; } .fa-exclamation-circle::before, .fa-exclamation-triangle::before { content: "⚠"; }
    .fa-question-circle::before { content: "؟"; } .fa-search::before { content: "🔎"; } .fa-arrow-right::before { content: "→"; }


    html, body { height: 100%; margin: 0; padding: 0; overflow-x: hidden; overflow-y: auto !important; -webkit-overflow-scrolling: touch; }
    body { font-family: 'Vazirmatn', sans-serif; background: var(--bg); color: var(--text); padding-bottom: 90px; -moz-font-feature-settings: "ss01"; -webkit-font-feature-settings: "ss01"; font-feature-settings: "ss01"; }

    input, select, textarea { width: 100%; padding: 13px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: inherit; box-sizing: border-box; font-size: 16px; margin-bottom: 12px; }
    textarea { resize: none; overflow-y: auto; min-height: 55px; max-height: 160px; line-height: 1.5; }

    .btn { width: 100%; padding: 15px; border: none; border-radius: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; color: white; transition: 0.3s; }
    .btn-blue { background: var(--primary); } .btn-green { background: var(--success); } .btn-red { background: var(--danger); } .btn-purple { background: #8b5cf6; }
    .btn-outline { background: transparent; border: 2px solid var(--primary); color: var(--primary); }
    .btn-outline:hover { background: var(--primary); color: white; }
    .btn:active { transform: scale(0.97); }

    /* Lightbox */
    #lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.94); z-index: 5000; display: none; justify-content: center; align-items: center; cursor: zoom-out; animation: fadeIn 0.3s; }
    #lightbox img { max-width: 95%; max-height: 88vh; border-radius: 12px; box-shadow: 0 0 50px rgba(0,0,0,0.7); }
    #lightbox .close-lb { position: absolute; top: 25px; right: 25px; color: white; font-size: 2.5rem; }

    /* Modals */
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2000; display: none; align-items: center; justify-content: center; padding: 15px; backdrop-filter: blur(5px); }
    .modal-box { background: var(--card-bg); width: 100%; max-width: 520px; max-height: 92vh; border-radius: 28px; overflow-y: auto !important; padding: 24px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); }

    #confirm-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 7000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }

    .confirm-box {
      background: var(--card-bg);
      width: 90%;
      max-width: 400px;
      max-height: 86vh;
      overflow-y: auto;
      padding: 30px 25px;
      border-radius: 32px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 1px solid var(--border);
      position: relative;
    }
    .confirm-close { position:absolute; top:12px; left:12px; width:34px; height:34px; border:0; border-radius:50%; background:#f1f5f9; color:#64748b; cursor:pointer; font-size:1.35rem; line-height:1; }
    #confirm-msg { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
    @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes zoomIn { from { transform: scale(0); } to { transform: scale(1); } }

    /* Toast Notifications */
    .toast-container { position: fixed; top: 25px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; width: 90%; max-width: 400px; }
    .toast { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); color: var(--text); padding: 14px 24px; border-radius: 18px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; animation: toastIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28), toastOut 0.5s 2.5s forwards; border-right: 6px solid var(--primary); font-size: 0.98rem; pointer-events: auto; font-weight: 600; }
    .toast.success { border-right-color: var(--success); }
    .toast.error { border-right-color: var(--danger); }
    @keyframes toastIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes toastOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-20px); opacity: 0; } }

    .header { background: linear-gradient(135deg, var(--primary), #818cf8); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 800; height: 65px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); }
    .menu-btn { font-size: 1.9rem; cursor: pointer; }

    .container { padding: 18px; max-width: 600px; margin: 0 auto; box-sizing: border-box; overflow-y: visible !important; }
    .card { background: var(--card-bg); border-radius: 22px; padding: 18px; margin-bottom: 18px; box-shadow: 0 5px 15px rgba(0,0,0,0.06); }

    .sidebar { position: fixed; top: 0; right: 0; width: 290px; height: 100%; background: var(--card-bg); z-index: 1500; transform: translateX(100%); transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: -10px 0 30px rgba(0,0,0,0.15); padding: 20px; display: flex; flex-direction: column; overflow-y: auto; }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1400; display: none; backdrop-filter: blur(2px); }
    .sidebar-overlay.open { display: block; }

    .menu-item { padding: 16px; border-radius: 14px; margin-bottom: 6px; cursor: pointer; display: flex; align-items: center; gap: 12px; color: var(--text); transition: 0.2s; }
    .menu-item:hover { background: var(--bg); }
    .menu-item.active { background: #e0f2fe; color: var(--primary); font-weight: bold; }

    /* Bottom Navigation Bar */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 70px;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 900;
      box-shadow: 0 -5px 20px rgba(0,0,0,0.05);
      padding-bottom: env(safe-area-inset-bottom);
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 0.75rem;
      cursor: pointer;
      transition: 0.3s;
      width: 100%;
      height: 100%;
    }

    .nav-item i { font-size: 1.4rem; margin-bottom: 4px; transition: 0.3s; }
    .nav-item.active { color: var(--primary); font-weight: bold; }
    .nav-item.active i { transform: translateY(-2px); }

    .profile-avatar { width: 115px; height: 115px; border-radius: 50%; object-fit: cover; border: 5px solid var(--border); margin: 0 auto 15px; display: block; cursor: pointer; transition: 0.3s; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
    .profile-avatar:hover { transform: scale(1.05); border-color: var(--primary); }

    .tabs { display: flex; background: var(--bg); padding: 6px; border-radius: 14px; margin-bottom: 18px; overflow-x: auto; }
    .tab { flex: 1; text-align: center; padding: 12px; border-radius: 10px; cursor: pointer; color: #64748b; font-size: 0.95rem; transition: 0.3s; white-space: nowrap; }
    .tab.active { background: var(--card-bg); color: var(--primary); font-weight: bold; box-shadow: 0 3px 10px rgba(0,0,0,0.05); }
    .tab-content { display: none; } .tab-content.active { display: block; animation: fadeIn 0.4s; }

    .dash-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--border); cursor: pointer; position: relative; overflow: hidden; }
    .avatar-sm { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; pointer-events: none; }
    .score-badge { background: #e0f2fe; color: var(--primary); padding: 4px 12px; border-radius: 12px; font-size: 0.9rem; font-weight: bold; }

    .plan-card { background: var(--card-bg); border-radius: 18px; margin-bottom: 14px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.04); transition: border-color 0.3s; }
    .plan-card.highlight { border: 2px solid var(--primary); animation: pulse 1s; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); } 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); } }

    /* تم‌بندی رنگی فعالیت‌ها */
    .plan-card.game { background-color: #f0fdf4; border-color: #bbf7d0; } /* سبز */
    .plan-card.story { background-color: #fefce8; border-color: #fef08a; } /* زرد */
    .plan-card.hazrat { background-color: #f0f9ff; border-color: #bae6fd; } /* آبی */

    .plan-header { padding: 18px; display: flex; justify-content: space-between; cursor: pointer; transition: 0.2s; }
    .plan-header:hover { background: rgba(0,0,0,0.02); }
    .plan-body { display: none; padding: 18px; border-top: 1px solid var(--border); background: rgba(255,255,255,0.5); }
    .plan-card.open .plan-body { display: block; animation: slideIn 0.3s; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .mat-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 10px; margin: 4px; font-size: 0.88rem; font-weight: 500; }
    .mat-chip.have { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .mat-chip.buy { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    .note-item { border-bottom: 1px solid var(--border); padding: 12px 0; }
    .note-head { font-weight: bold; display: flex; justify-content: space-between; cursor: pointer; background: var(--bg); padding: 12px; border-radius: 12px; }
    .note-body { display: none; padding: 14px; white-space: pre-wrap; font-size: 0.98rem; line-height: 1.7; }
    .note-item.open .note-body { display: block; }

    /* Skeleton Loading */
    #skeleton-screen { position: fixed; inset: 0; background: var(--bg); z-index: 9998; padding: 70px 20px 20px; overflow-y: auto; display: none; }
    .sk-card { background: #fff; border-radius: 20px; height: 120px; margin-bottom: 15px; position: relative; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
    .sk-card::after { content: ""; position: absolute; top: 0; right: 0; bottom: 0; left: 0; transform: translateX(-100%); background-image: linear-gradient(90deg, rgba(255, 255, 255, 0) 0, rgba(0, 0, 0, 0.05) 20%, rgba(0, 0, 0, 0.05) 60%, rgba(255, 255, 255, 0)); animation: shimmer 2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }

    #overlay { display: none; }

    .fab { position: fixed; bottom: 85px; left: 25px; width: 60px; height: 60px; background: var(--primary); color: white; border-radius: 50%; display: none; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 10px 25px rgba(79,70,229,0.45); z-index: 900; transition: 0.3s; }
    .fab:active { transform: scale(0.92); }

    .view { display: none; } .view.active { display: block; animation: fadeIn 0.4s; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

    .chip-ui { padding: 8px 16px; border-radius: 22px; font-size: 0.9rem; cursor: pointer; border: 1px solid var(--border); background: var(--card-bg); color: var(--text); display: inline-block; margin: 5px; transition: 0.3s; }
    .chip-ui:hover { background: var(--primary); color: white; }

    .archive-item { background: var(--bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; border-right: 4px solid var(--primary); }
    .archive-meta { font-size: 0.8rem; opacity: 0.7; margin-top: 5px; display: flex; justify-content: space-between; }

    .acc-card { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; overflow: hidden; transition: 0.2s; }

    .acc-card.game { border-right: 4px solid #10b981; background: #f0fdf4; }
    .acc-card.story { border-right: 4px solid #eab308; background: #fefce8; }
    .acc-card.hazrat { border-right: 4px solid #3b82f6; background: #f0f9ff; }

    .acc-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: transparent; font-weight: bold; }
    .acc-header:hover { background: rgba(0,0,0,0.02); }
    .acc-body { display: none; padding: 15px; border-top: 1px solid var(--border); font-size: 0.95rem; line-height: 1.6; color: #475569; }
    .acc-card.open { border-color: var(--primary); background: #fdfdfd; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .acc-card.open .acc-header { color: var(--primary); }
    .acc-card.open .acc-body { display: block; animation: slideIn 0.2s; }

    .tool-btn { background: var(--bg); border: 2px solid var(--border); border-radius: 20px; padding: 20px; text-align: center; cursor: pointer; transition: 0.3s; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .tool-btn i { font-size: 2.5rem; color: var(--primary); }
    .tool-btn:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }

    .modern-timer { font-size: 5rem; font-weight: 800; color: var(--primary); letter-spacing: 2px; text-shadow: 0 2px 10px rgba(79,70,229,0.2); margin: 20px 0; font-family: 'Courier New', Courier, monospace; }
    .timer-input-group { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; }
    .timer-input-group input { width: 70px; text-align: center; font-size: 1.2rem; font-weight: bold; }

    .student-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px; max-height: 350px; overflow-y: auto; padding: 5px; }
    .student-select-card { background: var(--bg); border: 2px solid var(--border); border-radius: 12px; padding: 10px; text-align: center; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .student-select-card.selected { border-color: var(--success); background: #f0fdf4; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(16,185,129,0.2); }
    .student-select-card img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    .student-select-card span { font-size: 0.85rem; font-weight: bold; }
    .student-select-card i { display: none; color: var(--success); font-size: 1.2rem; margin-top: -5px; }
    .student-select-card.selected i { display: block; animation: zoomIn 0.2s; }

    .added-group-card { background: #fff; border: 1px solid var(--border); padding: 12px; border-radius: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-right: 4px solid var(--primary); }

    .report-card-modal { background: #fff; padding: 0; overflow: hidden; }
    .report-header { background: var(--primary); color: white; padding: 20px; text-align: center; }
    .report-body { padding: 20px; overflow-y: auto; max-height: 70vh; }
    .report-section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
    .report-stat-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.95rem; }


    /* Classic premium theme layer */
    body { background: radial-gradient(circle at 20% 0%, #fff7dc 0, transparent 28%), linear-gradient(145deg, #efe4c8 0%, #d7c49a 100%); }
    .header { background: linear-gradient(135deg, #14213d, #22345c 55%, #8f6b24); border-bottom: 1px solid rgba(255,232,167,.45); }
    .card, .modal-box, .sidebar { border: 1px solid rgba(143,107,36,.28); box-shadow: 0 18px 45px rgba(20,33,61,.12); }
    .card { background: linear-gradient(180deg, rgba(255,252,242,.96), rgba(255,248,232,.94)); }
    .btn-blue, .fab { background: linear-gradient(135deg, #14213d, #31507f); }
    .btn-green { background: linear-gradient(135deg, #1f7a4d, #2fb36f); }
    .btn-red { background: linear-gradient(135deg, #8f1d2c, #d64045); }
    .score-badge { background: #f7e7b1; color: #14213d; border: 1px solid #d0a94f; }
    .classic-link { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 14px; border-radius:14px; background:#fff8e8; border:1px solid #c9aa6b; color:#14213d; text-decoration:none; font-weight:800; }
    .alert-card { padding:12px; border-radius:16px; margin:8px 0; border-right:5px solid #d0a94f; background:#fff8e8; }
    .alert-card.danger { border-right-color:#d64045; background:#fff1f2; }
    .alert-card.warn { border-right-color:#d0a94f; background:#fffbeb; }
    .search-result { padding:12px; border-bottom:1px dashed #c9aa6b; cursor:pointer; }
    .calendar-item { display:flex; justify-content:space-between; gap:10px; padding:12px; margin:8px 0; border-radius:16px; background:#fff8e8; border:1px solid #ead7a3; }
    .file-chip { display:inline-flex; align-items:center; gap:6px; margin:4px; padding:7px 10px; background:#eef2ff; color:#14213d; border:1px solid #b8c4ff; border-radius:12px; text-decoration:none; font-size:.86rem; }


    /* UX refresh: faster actions, calmer cards, mobile-first spacing */
    :root { --ink:#14213d; --gold:#c89b3c; --paper:#fff8e8; --paper2:#fffdf6; --muted:#6b7280; }
    body { padding-bottom: 96px; }
    .container { max-width: 980px; padding: 14px; }
    .header { height: 58px; padding: 10px 14px; border-radius: 0 0 24px 24px; }
    .header h1 { letter-spacing: -0.2px; }
    .card { border-radius: 24px; padding: 16px; margin-bottom: 14px; }
    .view.active { animation: fadeIn .24s ease-out; }
    .section-title { margin: 0 0 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .hero-card { background: linear-gradient(135deg, #14213d 0%, #213862 60%, #9b7228 100%) !important; color:#fff; overflow:hidden; position:relative; }
    .hero-card:before { content:""; position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.11); left:-60px; top:-70px; }
    .hero-grid { display:grid; grid-template-columns:1.2fr .8fr; gap:14px; position:relative; z-index:1; }
    .hero-stat { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.22); border-radius:18px; padding:12px; text-align:center; }
    .hero-stat b { display:block; font-size:1.35rem; margin-top:4px; }
    .quick-actions { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
    .action-tile { border:0; border-radius:20px; padding:14px 8px; background:linear-gradient(180deg,#fffdf6,#f5e6bd); color:#14213d; box-shadow:0 10px 24px rgba(20,33,61,.10); font-weight:900; cursor:pointer; min-height:74px; }
    .action-tile span { display:block; font-size:1.4rem; margin-bottom:4px; }
    .panel-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .student-row, .dash-item { background:rgba(255,255,255,.55); border:1px solid rgba(201,170,107,.28); border-radius:16px; padding:12px; margin-bottom:8px; border-bottom:0; }
    .dash-item:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(20,33,61,.08); }
    .bottom-nav { height:76px; border-radius:26px 26px 0 0; width:calc(100% - 18px); left:9px; bottom:0; border:1px solid rgba(201,170,107,.4); }
    .nav-item { border-radius:18px; margin:6px 2px; }
    .nav-item.active { background:#f7e7b1; color:#14213d; }
    .sidebar { border-radius:28px 0 0 28px; width:310px; }
    .menu-item { font-weight:800; }
    .menu-item.active, .menu-item:hover { background:#f7e7b1; color:#14213d; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .compact-row { display:flex; gap:10px; align-items:center; }
    .compact-row > input { margin:0; }
    .plan-card { border-radius:22px; }
    .plan-header { align-items:center; }
    .modal-box { border-radius:26px; }


    .jalali-wheel-modal { position: fixed; inset: 0; z-index: 8500; display: grid; place-items: end center; padding: 16px; }
    .jalali-wheel-modal[hidden] { display: none; }
    .jalali-wheel-backdrop { position: absolute; inset: 0; background: rgba(13,22,35,.58); opacity: 0; backdrop-filter: blur(8px); transition: .22s ease; }
    .jalali-wheel-sheet { position: relative; width: min(100%, 520px); overflow: hidden; padding: 22px; border: 1px solid rgba(255,255,255,.58); border-radius: 30px; background: radial-gradient(circle at 18% 0%, rgba(255,225,145,.44), transparent 32%), linear-gradient(145deg, rgba(255,255,255,.98), rgba(249,244,231,.98)); box-shadow: 0 28px 72px rgba(10,18,30,.34); transform: translateY(28px) scale(.98); opacity: 0; transition: .24s ease; }
    .jalali-wheel-modal.is-visible .jalali-wheel-backdrop, .jalali-wheel-modal.is-visible .jalali-wheel-sheet { transform: translateY(0) scale(1); opacity: 1; }
    .jalali-wheel-close { position: absolute; top: 14px; left: 14px; width: 38px; height: 38px; border: 0; border-radius: 999px; background: rgba(23,32,51,.08); color: var(--ink); font-size: 24px; line-height: 1; }
    .jalali-wheel-kicker { display:inline-flex; margin-bottom:8px; padding:6px 12px; border-radius:999px; background:rgba(200,155,60,.13); color:#7a5316; font-size:12px; font-weight:900; }
    .jalali-wheel-preview { display:block; margin-bottom:18px; color:var(--ink); font-size:clamp(26px,8vw,38px); letter-spacing:1px; text-align:center; }
    .jalali-wheel-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:18px; direction:ltr; }
    .jalali-wheel-col { display:grid; gap:8px; padding:10px; border:1px solid rgba(23,32,51,.1); border-radius:24px; background:linear-gradient(180deg,#fffaf0,#fff); text-align:center; }
    .jalali-wheel-col button { width:100%; min-height:44px; border:0; border-radius:16px; background:#172033; color:#fff; font-size:22px; font-weight:900; }
    .jalali-wheel-col div { display:grid; min-height:74px; place-items:center; border-radius:20px; background:linear-gradient(135deg,#ffe6a0,#fff6da); color:#172033; font-size:clamp(24px,7vw,34px); font-weight:950; box-shadow:inset 0 0 0 1px rgba(122,83,22,.13); }
    .jalali-wheel-col span { color:var(--muted); font-size:12px; font-weight:900; }
    .jalali-wheel-apply { width:100%; min-height:54px; }
    input, textarea { caret-color: var(--gold); }


    .chart-tip { position:absolute; z-index:20; display:none; min-width:170px; max-width:230px; padding:10px 12px; border-radius:16px; background:rgba(20,33,61,.94); color:#fff8e8; box-shadow:0 18px 40px rgba(20,33,61,.28); font-size:.82rem; line-height:1.8; pointer-events:none; direction:rtl; border:1px solid rgba(255,230,160,.35); }
    .chart-tip b { display:block; color:#ffe6a0; margin-bottom:4px; }
    .lux-dashboard .card, .card { backdrop-filter: blur(10px); }
    .metric-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:12px; }
    .metric-pill { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.22); border-radius:16px; padding:10px; text-align:center; }
    .metric-pill small { display:block; opacity:.78; }
    .metric-pill b { font-size:1.2rem; }
    .profile-avatar { outline: 4px solid rgba(200,155,60,.2); outline-offset: 4px; }
    .tabs { position:sticky; top:64px; z-index:40; box-shadow:0 14px 30px rgba(20,33,61,.08); }
    .tab.active { background:linear-gradient(135deg,#14213d,#31507f); color:#fff8e8; }
    .plan-card { background:linear-gradient(135deg,rgba(255,253,246,.98),rgba(255,248,232,.94)); border:1px solid rgba(200,155,60,.35); }
    .plan-header b { font-size:1.05rem; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#c89b3c; box-shadow:0 0 0 4px rgba(200,155,60,.16); }
    .empty-chart { text-align:center; color:#64748b; padding:28px 10px; border:1px dashed rgba(100,116,139,.35); border-radius:18px; }

    @media (max-width: 700px) {
      .container { max-width: 100%; }
      .hero-grid, .panel-grid, .form-grid { grid-template-columns:1fr; }
      .quick-actions { grid-template-columns:repeat(2,1fr); }
      .bottom-nav span { font-size:.7rem; }
      .tool-btn { padding:16px 10px; }
    }


    /* Final visual system: warmer, deeper, and balanced after removing the plan metric. */
    :root {
      --primary:#16345f; --accent:#c98124; --accent2:#0f766e; --cream:#fff7df; --cream2:#f7e7bd;
      --glass:rgba(255,255,255,.72); --shadow:0 24px 70px rgba(22,35,63,.16); --ring:rgba(201,129,36,.28);
    }
    body {
      background:
        radial-gradient(circle at 9% 8%, rgba(255,211,112,.52), transparent 24rem),
        radial-gradient(circle at 89% 18%, rgba(15,118,110,.18), transparent 22rem),
        linear-gradient(135deg, #f7ead0 0%, #e2cca0 45%, #f9f2df 100%);
      color:#172033;
    }
    body:before { content:""; position:fixed; inset:0; pointer-events:none; opacity:.28; background-image:linear-gradient(rgba(20,33,61,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,33,61,.05) 1px, transparent 1px); background-size:34px 34px; }
    .header { background:linear-gradient(135deg,#0e1b33,#183c68 52%,#b87723); box-shadow:0 18px 45px rgba(14,27,51,.22); }
    .container { max-width:1080px; }
    .card, .modal-box, .sidebar { background:linear-gradient(180deg,rgba(255,253,246,.86),rgba(255,247,223,.78)); border:1px solid rgba(255,255,255,.72); box-shadow:var(--shadow); backdrop-filter:blur(18px); }
    .card { border-radius:30px; }
    .hero-card { min-height:210px; padding:24px; background:radial-gradient(circle at 14% 18%, rgba(255,226,148,.28), transparent 18rem), linear-gradient(135deg,#0e1b33 0%,#173b67 55%,#b87723 100%) !important; box-shadow:0 30px 80px rgba(14,27,51,.28); }
    .hero-card:after { content:""; position:absolute; inset:auto -70px -95px auto; width:260px; height:260px; border-radius:50%; background:rgba(255,255,255,.1); box-shadow:-70px -70px 0 rgba(255,255,255,.045); }
    .hero-grid { grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); align-items:stretch; }
    .hero-card h2 { font-size:clamp(1.7rem,3vw,2.45rem) !important; letter-spacing:-.8px; }
    .quick-actions { gap:12px; }
    .action-tile { min-height:90px; border:1px solid rgba(255,255,255,.75); background:linear-gradient(180deg,#fffdf4,#f1d796); box-shadow:0 18px 34px rgba(9,20,38,.18); transition:.22s ease; }
    .action-tile:hover { transform:translateY(-4px) rotate(-.4deg); box-shadow:0 24px 44px rgba(9,20,38,.24); }
    .hero-stat { height:calc(100% - 78px); min-height:104px; display:grid; align-content:center; background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.08)); box-shadow:inset 0 1px 0 rgba(255,255,255,.25); }
    .hero-stat b { font-size:clamp(1rem,2.1vw,1.55rem); line-height:1.8; }
    .metric-strip { grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
    .metric-pill { min-height:58px; display:grid; place-items:center; background:rgba(255,255,255,.16); border-color:rgba(255,255,255,.32); box-shadow:inset 0 1px 0 rgba(255,255,255,.25); }
    .metric-pill b { font-size:1.35rem; color:#ffe8a9; }
    .section-title { font-size:1.15rem; color:#10213d; }
    .alert-card, .calendar-item, .student-row, .dash-item, .acc-card, .plan-card { border-radius:22px; box-shadow:0 14px 35px rgba(20,33,61,.08); }
    .plan-card { overflow:hidden; border-color:rgba(201,129,36,.32); }
    .plan-header { background:linear-gradient(90deg,rgba(255,255,255,.45),transparent); }
    .btn, .action-tile, .nav-item, .menu-item, .chip-ui { transition:transform .2s ease, box-shadow .2s ease, background .2s ease; }
    .btn:hover, .chip-ui:hover { transform:translateY(-2px); }
    input, select, textarea { background:rgba(255,255,255,.74); border-color:rgba(167,124,55,.3); box-shadow:inset 0 1px 0 rgba(255,255,255,.6); }
    .bottom-nav { background:rgba(255,251,239,.9); backdrop-filter:blur(20px); box-shadow:0 -18px 45px rgba(20,33,61,.13); }
    .nav-item.active { background:linear-gradient(135deg,#173b67,#b87723); color:#fff7df; box-shadow:0 12px 25px rgba(22,52,95,.22); }
    .toast { background:rgba(255,250,236,.95); border:1px solid rgba(255,255,255,.72); }
    #skeleton-screen { background:linear-gradient(135deg,#f7ead0,#f9f2df); }
    .sk-card { background:rgba(255,253,246,.74); border:1px solid rgba(255,255,255,.7); box-shadow:var(--shadow); }
    @media (max-width: 760px) {
      .hero-card { padding:20px; min-height:0; }
      .hero-grid { grid-template-columns:1fr; }
      .quick-actions { grid-template-columns:repeat(2,1fr); }
      .hero-stat { height:auto; }
      .metric-strip { grid-template-columns:repeat(3,1fr); }
      .metric-pill { padding:8px 6px; }
      .metric-pill b { font-size:1.15rem; }
    }



    /* Safe premium UI refresh: CSS-only, no behavior changes. */
    :root {
      --primary:#12335f;
      --accent:#c47b26;
      --accent2:#0f766e;
      --success: #10b981;
      --danger:#c63d4c;
      --bg:#f5ead3;
      --card-bg:rgba(255,250,238,.84);
      --text:#111827;
      --border:rgba(135,93,31,.18);
      --premium-shadow:0 18px 54px rgba(17,24,39,.14);
      --premium-shadow-strong:0 28px 76px rgba(17,24,39,.20);
      --radius-xl:30px;
      --radius-lg:22px;
    }

    html { scroll-behavior:smooth; background:#f5ead3; }
    body {
      background:
        radial-gradient(circle at 8% 4%, rgba(255,214,112,.50), transparent 22rem),
        radial-gradient(circle at 94% 12%, rgba(15,118,110,.18), transparent 24rem),
        radial-gradient(circle at 45% 100%, rgba(196,123,38,.13), transparent 28rem),
        linear-gradient(135deg,#fbefd4 0%,#e7cfa2 46%,#fff8e6 100%) !important;
      color:var(--text);
      text-rendering:optimizeLegibility;
      -webkit-font-smoothing:antialiased;
      padding-bottom:calc(104px + env(safe-area-inset-bottom));
    }
    body::before {
      content:"";
      position:fixed;
      inset:0;
      pointer-events:none;
      z-index:-1;
      opacity:.24;
      background-image:
        linear-gradient(rgba(18,51,95,.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(18,51,95,.07) 1px, transparent 1px);
      background-size:38px 38px;
      mask-image:linear-gradient(#000 0%, transparent 90%);
    }

    .header {
      height:64px;
      margin:10px auto 0;
      width:min(calc(100% - 22px),1080px);
      border-radius:28px;
      background:linear-gradient(135deg,#0d1b33 0%,#123b68 54%,#bd7422 100%) !important;
      border:1px solid rgba(255,255,255,.26);
      box-shadow:0 18px 46px rgba(13,27,51,.24);
      backdrop-filter:blur(18px);
    }
    .header h1 { font-weight:950; letter-spacing:-.4px; font-size:clamp(1.05rem,2.8vw,1.34rem) !important; }
    #header-date {
      padding:7px 10px;
      border-radius:999px;
      background:rgba(255,255,255,.13);
      border:1px solid rgba(255,255,255,.18);
    }
    .menu-btn {
      width:42px;
      height:42px;
      display:grid;
      place-items:center;
      border-radius:16px;
      background:rgba(255,255,255,.13);
      border:1px solid rgba(255,255,255,.18);
      transition:transform .18s ease, background .18s ease;
    }
    .menu-btn:active { transform:scale(.94); }

    .container { max-width:1080px; padding:18px clamp(12px,3vw,24px); }
    .card, .modal-box, .confirm-box, .sidebar {
      background:linear-gradient(145deg,rgba(255,253,246,.88),rgba(255,244,218,.80)) !important;
      border:1px solid rgba(255,255,255,.72) !important;
      box-shadow:var(--premium-shadow);
      backdrop-filter:blur(16px) saturate(1.05);
    }
    .card {
      border-radius:var(--radius-xl);
      padding:clamp(16px,2.2vw,23px);
      margin-bottom:16px;
    }

    .hero-card {
      min-height:225px;
      border-radius:36px;
      background:
        radial-gradient(circle at 13% 18%, rgba(255,226,148,.32), transparent 18rem),
        radial-gradient(circle at 78% 12%, rgba(15,118,110,.20), transparent 16rem),
        linear-gradient(135deg,#0d1b33 0%,#173c67 56%,#bd7422 100%) !important;
      box-shadow:var(--premium-shadow-strong);
      border:1px solid rgba(255,255,255,.24) !important;
    }
    .hero-card::before { background:rgba(255,255,255,.10); }
    .hero-card h2 { color:#fff8e6; font-size:clamp(1.65rem,4vw,2.55rem) !important; letter-spacing:-.8px; line-height:1.28; }
    .hero-card small { color:rgba(255,248,230,.78); font-weight:900; }
    .hero-grid { align-items:stretch; }
    .hero-stat, .metric-pill {
      background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.075)) !important;
      border:1px solid rgba(255,255,255,.27);
      border-radius:24px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.22);
      backdrop-filter:blur(12px);
    }
    .metric-pill b { color:#ffe8aa; }

    .quick-actions { gap:12px; }
    .action-tile, .tool-btn, .classic-link, .chip-ui {
      border:1px solid rgba(255,255,255,.76) !important;
      background:linear-gradient(160deg,#fffdf3 0%,#f1d89d 100%) !important;
      color:#13213a !important;
      box-shadow:0 14px 30px rgba(17,24,39,.13);
      transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .action-tile { min-height:90px; border-radius:24px; }
    .action-tile:hover, .tool-btn:hover, .chip-ui:hover, .classic-link:hover {
      transform:translateY(-3px);
      box-shadow:0 20px 42px rgba(17,24,39,.18);
      border-color:rgba(196,123,38,.36) !important;
    }
    .action-tile:active, .btn:active, .nav-item:active, .menu-item:active { transform:scale(.97); }

    .btn {
      min-height:48px;
      border-radius:18px;
      font-weight:950;
      letter-spacing:-.12px;
      box-shadow:0 12px 28px rgba(17,24,39,.14);
    }
    .btn-blue, .fab { background:linear-gradient(135deg,#10213d,#126073) !important; }
    .btn-green { background:linear-gradient(135deg,#0f766e,#22b678) !important; }
    .btn-red { background:linear-gradient(135deg,#8d2434,#d34750) !important; }
    .btn-purple { background:linear-gradient(135deg,#6d3bb3,#12335f) !important; }
    .btn-outline {
      background:rgba(255,255,255,.30) !important;
      border:1px solid rgba(18,51,95,.30) !important;
      color:#12335f !important;
      box-shadow:none;
    }

    input, select, textarea {
      border-radius:18px;
      background:rgba(255,255,255,.74) !important;
      border:1px solid rgba(130,88,27,.24) !important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.65);
      transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;
    }
    input:focus, select:focus, textarea:focus {
      border-color:rgba(196,123,38,.62) !important;
      box-shadow:0 0 0 4px rgba(196,123,38,.18), inset 0 1px 0 rgba(255,255,255,.85) !important;
      transform:translateY(-1px);
      outline:none;
    }

    .section-title, .card > h3 {
      color:#10213d;
      letter-spacing:-.35px;
      font-weight:950;
    }
    .section-title::after {
      content:"";
      flex:1;
      height:1px;
      min-width:40px;
      background:linear-gradient(90deg,rgba(196,123,38,.42),transparent);
    }
    .dash-item, .student-row, .archive-item, .calendar-item, .note-head, .acc-card, .plan-card, .added-group-card, .search-result {
      background:rgba(255,255,255,.50) !important;
      border:1px solid rgba(255,255,255,.70) !important;
      border-right:4px solid rgba(196,123,38,.72) !important;
      border-radius:22px;
      box-shadow:0 12px 30px rgba(17,24,39,.075);
      transition:transform .18s ease, box-shadow .18s ease;
    }
    .dash-item:hover, .student-row:hover, .archive-item:hover, .calendar-item:hover, .plan-card:hover, .search-result:hover {
      transform:translateY(-2px);
      box-shadow:0 18px 40px rgba(17,24,39,.12);
    }
    .score-badge {
      background:linear-gradient(135deg,#ffe6a7,#fff9ea) !important;
      color:#10213d !important;
      border:1px solid rgba(196,123,38,.42);
      box-shadow:0 8px 18px rgba(17,24,39,.08);
    }
    .profile-avatar {
      border-color:rgba(255,255,255,.86);
      outline:4px solid rgba(196,123,38,.22);
      outline-offset:4px;
      box-shadow:0 16px 34px rgba(17,24,39,.16);
    }

    .tabs {
      gap:6px;
      padding:7px;
      border:1px solid rgba(255,255,255,.70);
      background:rgba(255,251,239,.70) !important;
      backdrop-filter:blur(16px);
    }
    .tab { border-radius:15px; font-weight:900; }
    .tab.active { background:linear-gradient(135deg,#10213d,#0f766e) !important; color:#fff8e6 !important; }

    .sidebar {
      width:min(340px,86vw);
      padding:24px;
      border-radius:32px 0 0 32px;
    }
    .sidebar h2 { color:#10213d !important; font-weight:950; }
    .menu-item {
      border-radius:18px;
      border:1px solid transparent;
      font-weight:900;
    }
    .menu-item:hover, .menu-item.active {
      background:linear-gradient(135deg,rgba(255,230,167,.95),rgba(255,249,234,.72)) !important;
      color:#10213d !important;
      border-color:rgba(196,123,38,.30);
    }

    .bottom-nav {
      width:min(calc(100% - 18px),760px);
      right:50%;
      left:auto;
      transform:translateX(50%);
      bottom:8px;
      height:76px;
      border-radius:28px;
      background:rgba(255,251,239,.82) !important;
      border:1px solid rgba(255,255,255,.72);
      box-shadow:0 -16px 44px rgba(17,24,39,.14);
      backdrop-filter:blur(22px);
    }
    .nav-item {
      height:calc(100% - 10px);
      margin:5px 3px;
      border-radius:21px;
      font-weight:900;
    }
    .nav-item.active {
      background:linear-gradient(135deg,#10213d,#bd7422) !important;
      color:#fff8e6 !important;
      transform:translateY(-4px);
      box-shadow:0 12px 25px rgba(17,24,39,.18);
    }

    .modal { background:rgba(8,13,24,.54); backdrop-filter:blur(12px); }
    .modal-box, .confirm-box { border-radius:30px; }
    .toast {
      border-radius:22px;
      background:rgba(255,251,239,.94) !important;
      border:1px solid rgba(255,255,255,.75);
      box-shadow:0 18px 48px rgba(17,24,39,.16);
    }
    .fab {
      bottom:98px;
      left:22px;
      border:1px solid rgba(255,255,255,.42);
      box-shadow:0 20px 42px rgba(17,24,39,.22);
    }

    @media (min-width: 900px) {
      .hero-grid { grid-template-columns:minmax(0,1.12fr) minmax(290px,.88fr); }
      .panel-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
    @media (max-width: 760px) {
      body { padding-bottom:calc(112px + env(safe-area-inset-bottom)); }
      .header {
        position:sticky;
        top:8px;
        height:58px;
        border-radius:24px;
        z-index:950;
      }
      #header-date { max-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .container { padding:14px 10px 112px; }
      .card { border-radius:27px; margin-bottom:12px; }
      .hero-card { min-height:0; padding:18px; }
      .hero-grid, .panel-grid, .form-grid { grid-template-columns:1fr; }
      .hero-card h2 { font-size:1.52rem !important; max-width:none; }
      .quick-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .action-tile { min-height:80px; }
      .metric-strip { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
      .metric-pill { padding:8px 5px; min-height:56px; }
      .metric-pill small { font-size:.68rem; }
      .metric-pill b { font-size:1.08rem; }
      .bottom-nav { width:calc(100% - 14px); bottom:7px; height:72px; }
      .bottom-nav span { font-size:.66rem; }
      .nav-item i { font-size:1.22rem; }
      .modal { align-items:flex-end; padding:10px; }
      .modal-box, .confirm-box { max-height:88dvh; border-radius:30px 30px 24px 24px; padding:20px; }
      .student-select-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .modern-timer { font-size:clamp(3.2rem,18vw,5rem); }
      input, select, textarea { font-size:16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; }
    }


    @media print {
      body { background: white !important; padding: 0 !important; margin: 0 !important; }
      .header, .bottom-nav, .sidebar, .sidebar-overlay, .fab, .container, .modal, #confirm-modal, #lightbox, #prompt-modal { display: none !important; }
      #report-modal { display: block !important; position: static !important; background: white !important; padding: 0 !important; margin: 0 !important; visibility: visible !important; }
      .modal-box.report-card-modal { box-shadow: none !important; width: 100% !important; max-width: none !important; height: auto !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; }
      .report-body { max-height: none !important; overflow: visible !important; padding: 30px !important; }
      #report-modal .btn { display: none !important; }
      .report-header { padding: 30px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }


    /* Careful polish layer: scoped CSS only, no layout rewrites. */
    *, *::before, *::after { box-sizing: border-box; }
    img, canvas, video { max-width: 100%; }
    .view, .card, .modal-box, .confirm-box { min-width: 0; }

    .card {
      position: relative;
      isolation: isolate;
      overflow: hidden;
    }
    .card::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(255,255,255,.42), transparent 34%, rgba(196,123,38,.08));
      opacity: .55;
      z-index: -1;
    }
    .section-title {
      gap: 10px;
      line-height: 1.45;
    }
    .section-title::before {
      content: "";
      width: 10px;
      height: 28px;
      border-radius: 99px;
      background: linear-gradient(180deg, #c47b26, #12335f);
      box-shadow: 0 8px 18px rgba(196,123,38,.22);
      flex: 0 0 auto;
    }

    .hero-card {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.30) !important;
    }
    .hero-card::after {
      content: "";
      position: absolute;
      width: 260px;
      height: 260px;
      left: -90px;
      bottom: -125px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255,255,255,.17), transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .hero-card > * { position: relative; z-index: 1; }
    .action-tile span {
      width: 42px;
      height: 42px;
      display: grid !important;
      place-items: center;
      margin: 0 auto 6px !important;
      border-radius: 16px;
      background: rgba(255,255,255,.58);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.82), 0 10px 20px rgba(17,24,39,.10);
    }

    .dash-item {
      gap: 12px;
      min-width: 0;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .dash-item > * { min-width: 0; }
    .dash-item b, .dash-item span { overflow-wrap: anywhere; }
    .dash-item:hover {
      border-color: rgba(196,123,38,.42) !important;
    }
    .avatar-sm {
      flex: 0 0 auto;
      border: 2px solid rgba(255,255,255,.88);
      box-shadow: 0 8px 18px rgba(17,24,39,.12);
    }
    .score-badge {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    #view-att .compact-row {
      align-items: stretch;
    }
    #view-att .compact-row input {
      min-height: 50px;
    }
    #view-att .compact-row .btn {
      min-height: 50px;
    }
    #att-list {
      padding: 10px !important;
    }
    #att-list .dash-item {
      border-right-width: 5px !important;
      background: linear-gradient(135deg, rgba(255,255,255,.70), rgba(255,246,222,.45)) !important;
    }
    #att-list select {
      min-height: 44px;
      border-radius: 16px !important;
      text-align: center;
      font-weight: 950 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
    }

    label {
      display: inline-flex;
      margin: 8px 2px 7px;
      color: #21385d;
      font-weight: 900;
    }
    input::placeholder, textarea::placeholder {
      color: rgba(71,85,105,.66);
    }
    .modal-box input, .modal-box textarea, .modal-box select,
    .card input, .card textarea, .card select {
      max-width: 100%;
    }
    .mod-box-full {
      border-color: rgba(255,255,255,.72) !important;
      background: linear-gradient(135deg, rgba(255,255,255,.62), rgba(255,246,222,.48)) !important;
      box-shadow: 0 12px 28px rgba(17,24,39,.08);
    }

    .bottom-nav {
      overflow: hidden;
    }
    .nav-item {
      min-width: 0;
    }
    .nav-item span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .report-card-modal {
      max-width: 820px;
      background: linear-gradient(180deg, #fffaf0, #fff) !important;
      color: #111827;
    }
    .report-card-modal .report-header {
      background: linear-gradient(135deg, #0d1b33, #123b68 62%, #bd7422) !important;
      padding: 26px !important;
      position: relative;
      overflow: hidden;
    }
    .report-card-modal .report-header::after {
      content: "";
      position: absolute;
      left: -70px;
      bottom: -105px;
      width: 210px;
      height: 210px;
      border-radius: 999px;
      background: rgba(255,255,255,.13);
    }
    .report-card-modal .report-header h2 {
      position: relative;
      z-index: 1;
      font-size: clamp(1.45rem, 4vw, 1.9rem);
      letter-spacing: -.6px;
    }
    .report-card-modal #report-date {
      position: relative;
      z-index: 1;
    }
    .report-card-modal .report-body {
      background: linear-gradient(180deg, #fffaf0, #fff);
    }
    .report-card-modal .report-section {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #f0dfbd !important;
      border-radius: 20px;
      padding: 14px;
      margin-bottom: 14px;
      background: #fffdfa;
    }
    .report-card-modal .report-section h4 {
      border-bottom: 0 !important;
      color: #10213d !important;
      padding-bottom: 0 !important;
      margin: 0 0 12px !important;
    }
    .report-card-modal .report-stat-row {
      border-radius: 14px;
      padding: 10px 12px;
      margin-bottom: 7px;
      background: #fff8e8;
      border: 1px solid #f0dfbd;
    }
    .report-card-modal .report-section div[style*="dashed"] {
      border-color: #c9a86d !important;
      border-radius: 16px !important;
      background: #fff8e8 !important;
      line-height: 1.9;
    }

    @media (max-width: 760px) {
      .container { padding-left: 10px; padding-right: 10px; }
      .header { width: calc(100% - 16px); margin-top: 8px; }
      .quick-actions { gap: 9px; }
      .action-tile { min-height: 78px; padding-inline: 6px; }
      .dash-item {
        align-items: center;
        gap: 10px;
        padding: 11px;
      }
      #att-list .dash-item {
        flex-wrap: wrap;
      }
      #att-list .dash-item > div {
        flex: 1 1 180px;
      }
      #att-list select {
        flex: 1 1 120px;
        width: auto !important;
      }
      .modal-box, .confirm-box {
        width: min(100%, 560px);
      }
      .report-card-modal .report-body {
        padding: 16px !important;
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .view.active > .card,
      .plan-card,
      .dash-item {
        animation: carefulFade .28s ease both;
      }
      .view.active > .card:nth-child(2) { animation-delay: .03s; }
      .view.active > .card:nth-child(3) { animation-delay: .06s; }
      .view.active > .card:nth-child(4) { animation-delay: .09s; }
      @keyframes carefulFade {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
    }

    @media print {
      @page { size: A4; margin: 12mm; }
      html, body { background: #fff !important; color: #111827 !important; }
      body::before, body::after { display: none !important; }
      .header, .bottom-nav, .sidebar, .sidebar-overlay, .fab, .container, #confirm-modal, #lightbox, #prompt-modal, #report-modal .btn { display: none !important; }
      .modal { display: none !important; }
      #report-modal {
        display: block !important;
        position: static !important;
        inset: auto !important;
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
        visibility: visible !important;
        backdrop-filter: none !important;
      }
      .modal-box.report-card-modal {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        max-height: none !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #fff !important;
      }
      .report-card-modal .report-header {
        padding: 16mm 12mm 9mm !important;
        border-radius: 0 0 10mm 10mm !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-card-modal .report-body {
        max-height: none !important;
        overflow: visible !important;
        padding: 9mm 0 0 !important;
        background: #fff !important;
      }
      .report-card-modal .report-section,
      .report-card-modal .report-stat-row {
        box-shadow: none !important;
        break-inside: avoid;
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-card-modal img { max-width: 100% !important; }
    }



    /* Stage 2 micro-polish: tiny details only, no structural changes. */
    .fire-mark {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      margin-right: 4px;
      border-radius: 999px;
      background: radial-gradient(circle at 35% 25%, #fff3bf, #f59e0b 48%, #b45309 100%);
      box-shadow: 0 8px 18px rgba(245,158,11,.28), inset 0 1px 0 rgba(255,255,255,.55);
      font-size: 15px;
      vertical-align: middle;
    }
    .score-badge {
      position: relative;
      overflow: hidden;
    }
    .score-badge::after {
      content: "";
      position: absolute;
      inset: -30% auto -30% -45%;
      width: 35%;
      transform: rotate(18deg);
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
      opacity: .75;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .score-badge::after { animation: badgeSheen 3.8s ease-in-out infinite; }
      .fire-mark { animation: fireBreath 2.6s ease-in-out infinite; }
      @keyframes badgeSheen { 0%, 58% { left: -45%; } 78%, 100% { left: 120%; } }
      @keyframes fireBreath { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-1px) scale(1.06); } }
    }
    #dash-list .dash-item {
      background-image: linear-gradient(135deg, rgba(255,255,255,.66), rgba(255,246,222,.42)) !important;
    }
    #dash-list .dash-item:active,
    #profiles-list .dash-item:active,
    #score-list .dash-item:active {
      transform: scale(.985);
    }
    .chart-tip {
      backdrop-filter: blur(14px);
      border-color: rgba(255,230,160,.42);
    }
    .empty-chart {
      background: rgba(255,255,255,.38);
    }
    @media (max-width: 760px) {
      .fire-mark { width: 24px; height: 24px; font-size: 14px; }
      #dash-list .dash-item .score-badge { margin-right: auto; }
    }



    /* Smart attendance chart tooltip polish. */
    .chart-tip {
      background:
        radial-gradient(circle at 14% 0%, rgba(255,226,148,.18), transparent 48%),
        linear-gradient(145deg, rgba(12,24,48,.96), rgba(18,59,104,.95)) !important;
      color: #fff8e6 !important;
      border: 1px solid rgba(255,230,160,.34) !important;
      border-radius: 22px !important;
      padding: 12px 13px !important;
      box-shadow: 0 24px 58px rgba(12,24,48,.34) !important;
      backdrop-filter: blur(18px);
      font-size: .82rem !important;
    }
    .chart-tip b {
      color: #ffe8aa !important;
      font-size: .92rem;
      padding-bottom: 7px;
      margin-bottom: 7px !important;
      border-bottom: 1px solid rgba(255,255,255,.14);
    }
    .chart-tip div {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 3px 0;
      color: rgba(255,248,230,.88);
    }
    .chart-tip .tip-metric {
      display: block;
      margin: 2px 0 6px;
      padding: 8px 10px;
      border-radius: 15px;
      background: rgba(255,255,255,.11);
      color: #fff !important;
      font-weight: 950;
      text-align: center;
    }



    /* Targeted fixes: chart tooltip visibility and one-page report print. */
    .chart-tip-fixed {
      position: fixed !important;
      z-index: 2147483000 !important;
      max-width: calc(100vw - 18px) !important;
      max-height: calc(100vh - 18px) !important;
      overflow: auto !important;
      pointer-events: none !important;
    }
    #mainChartBox, #spGrowthChartBox, #class-mi-section div[style*="position: relative"] {
      overflow: visible !important;
    }
    .report-compact-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 20px;
      background: linear-gradient(135deg, #fff, #fff4d8);
      border: 1px solid #f0dfbd;
    }
    .report-compact-head img {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      object-fit: cover;
      border: 3px solid #fff;
      box-shadow: 0 10px 22px rgba(17,24,39,.12);
    }
    .report-compact-head small { color: #8a5a17; font-weight: 900; }
    .report-compact-head h3 { margin: 3px 0 8px; color: #10213d; }
    .report-compact-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .report-compact-stats h4 { grid-column: 1 / -1; }
    .report-compact-stats .report-stat-row {
      display: grid;
      gap: 4px;
      text-align: center;
      margin: 0 !important;
    }
    .report-parent-note div {
      min-height: 54px;
      max-height: 120px;
      overflow: hidden;
      white-space: pre-wrap;
      line-height: 1.75;
      background: #fff8e8;
      border: 1px dashed #c9a86d;
      border-radius: 16px;
      padding: 10px 12px;
    }
    .report-events { font-size: .88rem; }
    @media print {
      .report-card-modal .report-header { padding: 10mm 10mm 6mm !important; }
      .report-card-modal .report-header h2 { font-size: 18pt !important; margin: 0 !important; }
      .report-card-modal .report-body { padding: 6mm 0 0 !important; font-size: 9.5pt !important; }
      .report-compact-head { padding: 7mm !important; margin-bottom: 5mm !important; break-inside: avoid; page-break-inside: avoid; }
      .report-compact-head img { width: 22mm !important; height: 22mm !important; border-radius: 7mm !important; }
      .report-compact-head h3 { font-size: 15pt !important; margin: 1mm 0 2mm !important; }
      .report-card-modal .report-section { padding: 4mm !important; margin-bottom: 4mm !important; border-radius: 5mm !important; break-inside: avoid; page-break-inside: avoid; }
      .report-card-modal .report-section h4 { font-size: 10.5pt !important; margin-bottom: 2.5mm !important; }
      .report-compact-stats { grid-template-columns: repeat(4, 1fr) !important; gap: 2.5mm !important; }
      .report-card-modal .report-stat-row { padding: 2.5mm !important; font-size: 9pt !important; }
      .report-parent-note div { min-height: 18mm !important; max-height: 30mm !important; overflow: hidden !important; line-height: 1.55 !important; }
      .report-card-modal .report-section:nth-of-type(n+5) { display: none !important; }
    }



    /* Premium motion and usability pass: safe CSS-only enhancements. */
    :root {
      --motion-spring: cubic-bezier(.2,.85,.2,1);
      --motion-soft: cubic-bezier(.22,.61,.36,1);
    }
    body {
      background-size: auto, auto, auto, 140% 140% !important;
    }
    @media (prefers-reduced-motion: no-preference) {
      body { animation: ambientBackdrop 18s ease-in-out infinite alternate; }
      @keyframes ambientBackdrop {
        from { background-position: 0 0, 100% 0, 50% 100%, 0% 50%; }
        to { background-position: 18px -12px, calc(100% - 20px) 18px, 48% 96%, 100% 50%; }
      }
    }

    .btn, .action-tile, .tool-btn, .chip-ui, .nav-item, .menu-item, .dash-item, .plan-card, .acc-card {
      will-change: transform;
    }
    .btn, .action-tile, .tool-btn, .chip-ui {
      position: relative;
      overflow: hidden;
    }
    .btn::before, .action-tile::before, .tool-btn::before, .chip-ui::before {
      content: "";
      position: absolute;
      inset: -60% auto -60% -45%;
      width: 42%;
      transform: rotate(22deg);
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.52), transparent);
      opacity: 0;
      pointer-events: none;
    }
    @media (hover:hover) and (prefers-reduced-motion: no-preference) {
      .btn:hover::before, .action-tile:hover::before, .tool-btn:hover::before, .chip-ui:hover::before {
        animation: luxurySweep .72s var(--motion-soft);
        opacity: 1;
      }
      @keyframes luxurySweep { from { left: -45%; } to { left: 120%; } }
      .btn:hover, .tool-btn:hover, .chip-ui:hover { transform: translateY(-2px); }
      .action-tile:hover { transform: translateY(-4px) rotate(-.35deg); }
      .dash-item:hover, .plan-card:hover, .acc-card:hover { transform: translateY(-2px); }
    }

    .view.active > .card,
    .view.active .plan-card,
    .view.active .dash-item,
    .view.active .tool-btn,
    .view.active .note-item,
    .view.active .acc-card {
      transform-origin: center top;
    }
    @media (prefers-reduced-motion: no-preference) {
      .view.active > .card { animation: pageCardIn .38s var(--motion-spring) both; }
      .view.active > .card:nth-child(2) { animation-delay: .035s; }
      .view.active > .card:nth-child(3) { animation-delay: .07s; }
      .view.active > .card:nth-child(4) { animation-delay: .105s; }
      .view.active .dash-item, .view.active .plan-card, .view.active .tool-btn, .view.active .acc-card { animation: itemIn .28s var(--motion-spring) both; }
      @keyframes pageCardIn { from { opacity: 0; transform: translateY(14px) scale(.985); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
      @keyframes itemIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    }

    .modal { animation: modalBackdropIn .18s ease both; }
    .modal-box, .confirm-box {
      transform-origin: center bottom;
    }
    @media (prefers-reduced-motion: no-preference) {
      .modal[style*="flex"] .modal-box,
      .modal[style*="block"] .modal-box,
      .modal[style*="flex"] .confirm-box,
      .modal[style*="block"] .confirm-box {
        animation: premiumSheetIn .28s var(--motion-spring) both;
      }
      @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes premiumSheetIn { from { opacity: 0; transform: translateY(22px) scale(.985); } to { opacity: 1; transform: none; } }
    }

    .bottom-nav {
      overflow: visible !important;
    }
    .nav-item.active {
      position: relative;
    }
    .nav-item.active::after {
      content: "";
      position: absolute;
      inset: auto 28% -7px;
      height: 4px;
      border-radius: 99px;
      background: linear-gradient(90deg, transparent, #c47b26, transparent);
      box-shadow: 0 0 18px rgba(196,123,38,.46);
    }

    .report-card-modal {
      display: flex;
      flex-direction: column;
      max-height: min(92vh, 860px) !important;
      overflow: hidden !important;
    }
    .report-card-modal .report-header {
      flex: 0 0 auto;
    }
    .report-card-modal .report-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto !important;
      overscroll-behavior: contain;
      padding-bottom: 14px !important;
    }
    .report-actions {
      position: sticky;
      bottom: 0;
      z-index: 5;
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      border-top: 1px solid rgba(201,170,107,.35);
      background: linear-gradient(180deg, rgba(255,250,236,.86), rgba(255,250,236,.98));
      backdrop-filter: blur(18px);
      box-shadow: 0 -14px 34px rgba(17,24,39,.10);
    }
    .report-actions .btn {
      margin: 0 !important;
      min-height: 48px;
      width: 100%;
    }
    .report-card-modal .report-body::-webkit-scrollbar,
    .modal-box::-webkit-scrollbar,
    .sidebar::-webkit-scrollbar {
      width: 9px;
    }
    .report-card-modal .report-body::-webkit-scrollbar-thumb,
    .modal-box::-webkit-scrollbar-thumb,
    .sidebar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(18,51,95,.40), rgba(196,123,38,.48));
      border-radius: 999px;
      border: 2px solid rgba(255,250,236,.86);
    }
    .report-card-modal .report-body::-webkit-scrollbar-track,
    .modal-box::-webkit-scrollbar-track,
    .sidebar::-webkit-scrollbar-track {
      background: rgba(255,255,255,.28);
    }
    @media (max-width: 760px) {
      .report-card-modal { max-height: 91dvh !important; }
      .report-actions { grid-template-columns: 1fr; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); }
      .report-actions .btn { min-height: 46px; }
    }
    @media print {
      .report-card-modal { display: block !important; max-height: none !important; overflow: visible !important; }
      .report-card-modal .report-body { overflow: visible !important; padding-bottom: 0 !important; }
      .report-actions { display: none !important; }
    }



    /* Dashboard premium pass: scoped to dashboard only. */
    #view-dash {
      position: relative;
    }
    #view-dash::before {
      content: "";
      position: fixed;
      inset: 76px auto auto 50%;
      width: min(900px, 88vw);
      height: 260px;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: -1;
      border-radius: 999px;
      background: radial-gradient(closest-side, rgba(196,123,38,.20), transparent 74%);
      filter: blur(10px);
    }
    #view-dash .hero-card {
      border-radius: 38px;
      min-height: 230px;
      background:
        radial-gradient(circle at 14% 16%, rgba(255,231,164,.34), transparent 18rem),
        radial-gradient(circle at 86% 10%, rgba(15,118,110,.24), transparent 18rem),
        linear-gradient(135deg, #091528 0%, #123a67 52%, #c47b26 100%) !important;
      box-shadow: 0 34px 90px rgba(9,21,40,.30);
      border: 1px solid rgba(255,255,255,.26) !important;
    }
    #view-dash .hero-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(120deg, rgba(255,255,255,.16), transparent 34%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.055) 0 1px, transparent 1px 12px);
      opacity: .85;
    }
    #view-dash .hero-card::after {
      width: 320px;
      height: 320px;
      left: -115px;
      bottom: -155px;
      background: radial-gradient(circle, rgba(255,255,255,.18), transparent 68%);
      box-shadow: -92px -70px 0 rgba(255,255,255,.045), 88px -118px 0 rgba(15,118,110,.13);
    }
    #view-dash .hero-grid {
      gap: 18px;
    }
    #view-dash .hero-card h2 {
      font-size: clamp(1.85rem, 4.3vw, 2.8rem) !important;
      line-height: 1.18;
      text-shadow: 0 14px 34px rgba(0,0,0,.24);
    }
    #view-dash .hero-card small {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.18);
    }
    #view-dash .quick-actions {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 11px;
    }
    #view-dash .action-tile {
      min-height: 96px;
      border-radius: 26px;
      background: linear-gradient(160deg, rgba(255,253,244,.95), rgba(244,216,157,.92)) !important;
      border: 1px solid rgba(255,255,255,.82) !important;
      box-shadow: 0 20px 42px rgba(9,21,40,.18);
      font-size: .94rem;
    }
    #view-dash .action-tile span {
      width: 46px;
      height: 46px;
      border-radius: 18px;
      font-size: 1.35rem;
    }
    #view-dash .hero-stat {
      min-height: 118px;
      display: grid;
      align-content: center;
      text-align: center;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(255,255,255,.20), rgba(255,255,255,.07)) !important;
    }
    #view-dash .hero-stat b {
      font-size: clamp(1.25rem, 3vw, 1.8rem);
      line-height: 1.65;
      color: #fff7d6;
    }
    #view-dash .metric-strip {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    #view-dash .metric-pill {
      min-height: 68px;
      border-radius: 22px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, rgba(255,255,255,.17), rgba(255,255,255,.075)) !important;
    }
    #view-dash .metric-pill b {
      font-size: 1.42rem;
      color: #ffe8aa;
    }

    #view-dash > .card:not(.hero-card) {
      border-radius: 32px;
      border-color: rgba(255,255,255,.78) !important;
      box-shadow: 0 22px 62px rgba(17,24,39,.12);
    }
    #view-dash .card h3.section-title {
      margin-bottom: 14px;
    }
    #view-dash #alerts-list {
      display: grid;
      gap: 10px;
    }
    #view-dash .alert-card {
      margin: 0;
      border-radius: 22px;
      background: linear-gradient(135deg, #fff9e8, #fff) !important;
      border: 1px solid rgba(255,255,255,.78);
      box-shadow: 0 14px 34px rgba(17,24,39,.09);
    }
    #view-dash .alert-card.danger {
      background: linear-gradient(135deg, #fff1f2, #fff) !important;
    }
    #view-dash .alert-card.warn {
      background: linear-gradient(135deg, #fffbeb, #fff) !important;
    }

    #mainChartBox {
      border-radius: 24px;
      padding: 10px;
      background:
        linear-gradient(180deg, rgba(255,255,255,.58), rgba(255,248,232,.34)),
        repeating-linear-gradient(90deg, rgba(18,51,95,.045) 0 1px, transparent 1px 44px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.66);
    }
    #mainChart {
      border-radius: 18px;
    }

    #view-dash #dash-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
      gap: 10px;
    }
    #view-dash #dash-list .dash-item {
      margin: 0;
      border-radius: 24px;
      border-right-width: 5px !important;
      padding: 12px;
      background:
        radial-gradient(circle at 8% 0%, rgba(255,230,160,.30), transparent 46%),
        linear-gradient(135deg, rgba(255,255,255,.70), rgba(255,247,226,.50)) !important;
      box-shadow: 0 16px 38px rgba(17,24,39,.095);
    }
    #view-dash #dash-list .dash-item > div {
      min-width: 0;
    }
    #view-dash #dash-list .dash-item b {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      max-width: 100%;
      vertical-align: middle;
    }
    #view-dash #dash-list .score-badge {
      box-shadow: 0 12px 24px rgba(196,123,38,.13);
    }
    @media (prefers-reduced-motion: no-preference) {
      #view-dash .hero-card { animation: heroLift .58s var(--motion-spring, cubic-bezier(.2,.85,.2,1)) both; }
      #view-dash .action-tile { animation: tilePop .42s var(--motion-spring, cubic-bezier(.2,.85,.2,1)) both; }
      #view-dash .action-tile:nth-child(2) { animation-delay: .04s; }
      #view-dash .action-tile:nth-child(3) { animation-delay: .08s; }
      #view-dash .action-tile:nth-child(4) { animation-delay: .12s; }
      #view-dash #dash-list .dash-item { animation: dashItemIn .32s ease both; }
      @keyframes heroLift { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
      @keyframes tilePop { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
      @keyframes dashItemIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    }
    @media (max-width: 760px) {
      #view-dash .hero-card { border-radius: 30px; padding: 18px; }
      #view-dash .quick-actions { grid-template-columns: repeat(2, minmax(0,1fr)); }
      #view-dash .action-tile { min-height: 86px; }
      #view-dash .metric-strip { gap: 8px; }
      #view-dash .metric-pill { min-height: 58px; padding: 7px 4px; }
      #view-dash .metric-pill small { font-size: .67rem; }
      #view-dash .metric-pill b { font-size: 1.14rem; }
      #view-dash #dash-list { grid-template-columns: 1fr; }
      #mainChartBox { padding: 6px; }
    }


    /* Elite 2026 redesign layer: visual-only overrides, no business logic touched. */
    :root {
      --elite-ink: #091221;
      --elite-navy: #0a1b33;
      --elite-blue: #0e4c81;
      --elite-teal: #087f78;
      --elite-gold: #d99b2b;
      --elite-cream: #f1f5f9;
      --elite-paper: rgba(255, 250, 235, .78);
      --elite-glass: rgba(255, 255, 255, .58);
      --elite-line: rgba(255, 255, 255, .62);
      --elite-shadow: 0 28px 80px rgba(9, 18, 33, .18);
      --elite-shadow-soft: 0 16px 44px rgba(9, 18, 33, .11);
      --elite-radius: 30px;
      --elite-spring: cubic-bezier(.17,.84,.28,1);
      --primary: var(--elite-blue);
      --success: #0d9f72;
      --danger: #c93445;
      --bg: #f7e7c7;
      --text: var(--elite-ink);
      --border: rgba(12, 30, 55, .12);
    }

    html { scroll-behavior: smooth; }
    body {
      isolation: isolate;
      min-height: 100%;
      background:
        radial-gradient(circle at var(--spot-x, 18%) var(--spot-y, 8%), rgba(255, 222, 144, .68), transparent 19rem),
        radial-gradient(circle at 92% 5%, rgba(8, 127, 120, .20), transparent 26rem),
        radial-gradient(circle at 15% 95%, rgba(14, 76, 129, .16), transparent 25rem),
        linear-gradient(132deg, #fff7df 0%, #ead09d 42%, #f8e9c9 70%, #fffaf0 100%) !important;
      background-attachment: fixed;
    }
    body::before {
      opacity: .34 !important;
      background-image:
        linear-gradient(rgba(9,18,33,.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(9,18,33,.055) 1px, transparent 1px),
        radial-gradient(circle at center, rgba(217,155,43,.12) 0 1px, transparent 1.5px) !important;
      background-size: 42px 42px, 42px 42px, 18px 18px !important;
      mask-image: linear-gradient(#000 0 74%, transparent 100%) !important;
    }
    body::after {
      content: "";
      position: fixed;
      inset: auto -12vw -22vw auto;
      width: 48vw;
      height: 48vw;
      min-width: 390px;
      min-height: 390px;
      pointer-events: none;
      z-index: -1;
      border-radius: 48% 52% 41% 59%;
      background: radial-gradient(circle, rgba(8,127,120,.18), rgba(217,155,43,.10) 44%, transparent 69%);
      filter: blur(8px);
    }

    .header {
      top: 12px;
      height: 68px !important;
      width: min(calc(100% - 28px), 1120px) !important;
      border-radius: 34px !important;
      padding: 10px 14px !important;
      background:
        linear-gradient(120deg, rgba(255,255,255,.16), transparent 36%),
        linear-gradient(135deg, rgba(7,18,35,.94), rgba(12,55,94,.92) 52%, rgba(217,155,43,.86)) !important;
      border: 1px solid rgba(255,255,255,.30) !important;
      box-shadow: 0 24px 70px rgba(9,18,33,.25), inset 0 1px 0 rgba(255,255,255,.16) !important;
      backdrop-filter: blur(22px) saturate(1.15);
    }
    .header h1,
    #page-title {
      font-size: clamp(1.12rem, 2.6vw, 1.48rem) !important;
      font-weight: 1000 !important;
      letter-spacing: -.65px !important;
      text-shadow: 0 10px 30px rgba(0,0,0,.24);
    }
    .menu-btn, #header-date {
      background: rgba(255,255,255,.14) !important;
      border: 1px solid rgba(255,255,255,.20) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
    }
    #header-date { color: #fff6dd; }

    .container {
      max-width: 1120px !important;
      padding: 24px clamp(12px, 3vw, 28px) 118px !important;
    }
    .view.active { animation: none; }
    .card, .modal-box, .confirm-box, .sidebar {
      background:
        linear-gradient(145deg, rgba(255,255,255,.74), rgba(255,243,212,.60)),
        radial-gradient(circle at 0 0, rgba(255,255,255,.56), transparent 46%) !important;
      border: 1px solid var(--elite-line) !important;
      box-shadow: var(--elite-shadow-soft) !important;
      backdrop-filter: blur(18px) saturate(1.18);
    }
    .card {
      border-radius: var(--elite-radius) !important;
      padding: clamp(17px, 2.2vw, 25px) !important;
      margin-bottom: 18px !important;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent);
      pointer-events: none;
    }

    .hero-card,
    #view-dash .hero-card {
      min-height: 250px !important;
      border-radius: 42px !important;
      overflow: hidden;
      background:
        radial-gradient(circle at 12% 18%, rgba(255,231,170,.40), transparent 18rem),
        radial-gradient(circle at 88% 8%, rgba(8,127,120,.30), transparent 20rem),
        linear-gradient(135deg, #071223 0%, #0d3760 48%, #bd7623 100%) !important;
      box-shadow: 0 42px 110px rgba(7,18,35,.34) !important;
    }
    .hero-card::before,
    #view-dash .hero-card::before {
      background:
        linear-gradient(115deg, rgba(255,255,255,.18), transparent 32%),
        repeating-linear-gradient(135deg, rgba(255,255,255,.065) 0 1px, transparent 1px 13px) !important;
    }
    .hero-card h2,
    #view-dash .hero-card h2 {
      max-width: 11ch;
      font-size: clamp(2rem, 5vw, 3.45rem) !important;
      line-height: 1.04 !important;
      letter-spacing: -1.35px !important;
      color: #fff8df !important;
    }
    .hero-grid { gap: clamp(16px, 3vw, 28px) !important; }
    .quick-actions, #view-dash .quick-actions { gap: 13px !important; }

    .action-tile, .tool-btn, .classic-link, .chip-ui {
      background:
        linear-gradient(155deg, rgba(255,255,255,.92), rgba(255,229,168,.80)),
        radial-gradient(circle at 20% 0, rgba(255,255,255,.9), transparent 50%) !important;
      border: 1px solid rgba(255,255,255,.82) !important;
      border-radius: 26px !important;
      color: var(--elite-ink) !important;
      box-shadow: 0 18px 42px rgba(9,18,33,.14), inset 0 1px 0 rgba(255,255,255,.7) !important;
    }
    .action-tile span,
    .tool-btn i {
      filter: drop-shadow(0 8px 16px rgba(9,18,33,.16));
    }

    .section-title, .card > h3, .modal-box h3, .sidebar h2 {
      color: var(--elite-navy) !important;
      font-weight: 1000 !important;
      letter-spacing: -.55px !important;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title::after {
      height: 2px !important;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(217,155,43,.58), rgba(8,127,120,.18), transparent) !important;
    }

    .dash-item, .student-row, .archive-item, .calendar-item, .note-head, .acc-card, .plan-card, .added-group-card, .search-result, .alert-card {
      background:
        linear-gradient(145deg, rgba(255,255,255,.72), rgba(255,247,226,.56)) !important;
      border: 1px solid rgba(255,255,255,.74) !important;
      border-right: 5px solid rgba(217,155,43,.82) !important;
      border-radius: 25px !important;
      box-shadow: 0 16px 38px rgba(9,18,33,.085) !important;
    }
    .dash-item:hover, .student-row:hover, .archive-item:hover, .calendar-item:hover, .plan-card:hover, .search-result:hover, .acc-card:hover {
      transform: translateY(-3px) scale(1.005);
      box-shadow: 0 24px 56px rgba(9,18,33,.13) !important;
    }

    .btn {
      border-radius: 20px !important;
      min-height: 50px;
      font-weight: 1000 !important;
      box-shadow: 0 16px 34px rgba(9,18,33,.15), inset 0 1px 0 rgba(255,255,255,.18) !important;
    }
    .btn-blue, .fab { background: linear-gradient(135deg, #0a1b33, #0e6c82) !important; }
    .btn-green { background: linear-gradient(135deg, #087f78, #12ad73) !important; }
    .btn-red { background: linear-gradient(135deg, #861f35, #dd4854) !important; }
    .btn-purple { background: linear-gradient(135deg, #5d3aa0, #0e4c81) !important; }
    .btn-outline {
      background: rgba(255,255,255,.42) !important;
      color: var(--elite-navy) !important;
      border: 1px solid rgba(14,76,129,.32) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.62) !important;
    }

    input, select, textarea {
      border-radius: 21px !important;
      background: rgba(255,255,255,.72) !important;
      border: 1px solid rgba(12,30,55,.15) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.78), 0 10px 22px rgba(9,18,33,.045) !important;
    }
    input:focus, select:focus, textarea:focus {
      border-color: rgba(8,127,120,.55) !important;
      box-shadow: 0 0 0 5px rgba(8,127,120,.14), inset 0 1px 0 rgba(255,255,255,.88) !important;
      transform: translateY(-1px);
    }

    .tabs {
      border-radius: 24px !important;
      padding: 8px !important;
      background: rgba(255,255,255,.44) !important;
      border: 1px solid rgba(255,255,255,.70) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.54);
    }
    .tab { border-radius: 18px !important; }
    .tab.active {
      background: linear-gradient(135deg, #0a1b33, #087f78) !important;
      color: #fff6dd !important;
      box-shadow: 0 14px 28px rgba(9,18,33,.15);
    }

    .sidebar {
      width: min(360px, 88vw) !important;
      padding: 24px !important;
      border-radius: 36px 0 0 36px !important;
    }
    .sidebar-overlay { background: rgba(5,10,20,.54) !important; backdrop-filter: blur(10px) !important; }
    .menu-item {
      border-radius: 20px !important;
      min-height: 26px;
      font-weight: 950 !important;
    }
    .menu-item:hover, .menu-item.active {
      background: linear-gradient(135deg, rgba(255,232,176,.96), rgba(255,255,255,.60)) !important;
      color: var(--elite-navy) !important;
      border-color: rgba(217,155,43,.34) !important;
      transform: translateX(-2px);
    }

    .bottom-nav {
      width: min(calc(100% - 22px), 780px) !important;
      height: 80px !important;
      bottom: 10px !important;
      border-radius: 32px !important;
      padding: 5px !important;
      background: rgba(255,250,235,.76) !important;
      border: 1px solid rgba(255,255,255,.76) !important;
      box-shadow: 0 -20px 58px rgba(9,18,33,.17), inset 0 1px 0 rgba(255,255,255,.72) !important;
      backdrop-filter: blur(24px) saturate(1.2);
    }
    .nav-item {
      border-radius: 24px !important;
      font-weight: 950 !important;
      color: rgba(9,18,33,.72) !important;
    }
    .nav-item.active {
      background:
        radial-gradient(circle at 24% 0, rgba(255,255,255,.20), transparent 48%),
        linear-gradient(135deg, #0a1b33, #0e4c81 58%, #d99b2b) !important;
      color: #fff8df !important;
      transform: translateY(-5px) !important;
      box-shadow: 0 18px 34px rgba(9,18,33,.22) !important;
    }

    .modal { background: rgba(5,10,20,.58) !important; backdrop-filter: blur(16px) !important; }
    .modal-box, .confirm-box { border-radius: 34px !important; }
    .toast {
      background: rgba(255,250,235,.92) !important;
      border: 1px solid rgba(255,255,255,.78) !important;
      border-radius: 24px !important;
      box-shadow: 0 22px 60px rgba(9,18,33,.18) !important;
    }
    .profile-avatar {
      outline: 5px solid rgba(217,155,43,.20) !important;
      outline-offset: 5px;
      box-shadow: 0 22px 46px rgba(9,18,33,.18) !important;
    }
    .score-badge {
      background: linear-gradient(135deg, #ffdf94, #fff9e8) !important;
      color: var(--elite-navy) !important;
      border: 1px solid rgba(217,155,43,.42) !important;
    }
    #mainChartBox, .chart-card {
      border-radius: 28px !important;
      background:
        linear-gradient(180deg, rgba(255,255,255,.60), rgba(255,244,218,.40)),
        repeating-linear-gradient(90deg, rgba(14,76,129,.04) 0 1px, transparent 1px 42px) !important;
    }

    @media (prefers-reduced-motion: no-preference) {
      body::after { animation: eliteOrb 16s ease-in-out infinite alternate; }
      @keyframes eliteOrb { to { transform: translate(-7vw, -4vw) rotate(16deg); border-radius: 57% 43% 52% 48%; } }
      .view.active > .card { animation: eliteCardIn .48s var(--elite-spring) both; }
      .view.active > .card:nth-child(2) { animation-delay: .045s; }
      .view.active > .card:nth-child(3) { animation-delay: .09s; }
      .view.active > .card:nth-child(4) { animation-delay: .135s; }
      @keyframes eliteCardIn {
        from { opacity: 0; transform: translateY(22px) scale(.982); filter: blur(7px); }
        to { opacity: 1; transform: none; filter: none; }
      }
      .header { animation: eliteHeaderIn .55s var(--elite-spring) both; }
      @keyframes eliteHeaderIn { from { opacity:0; transform: translateY(-14px) scale(.985); } to { opacity:1; transform: none; } }
      .bottom-nav { animation: eliteNavIn .58s var(--elite-spring) .1s both; }
      @keyframes eliteNavIn { from { opacity:0; transform: translateX(50%) translateY(22px) scale(.97); } to { opacity:1; transform: translateX(50%) translateY(0) scale(1); } }
    }

    @media (min-width: 920px) {
      .panel-grid, .form-grid { gap: 16px !important; }
      #view-dash #dash-list { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; }
    }
    @media (max-width: 760px) {
      .header {
        top: 8px !important;
        width: calc(100% - 16px) !important;
        height: 60px !important;
        border-radius: 26px !important;
      }
      .container { padding: 16px 10px 112px !important; }
      .card { border-radius: 28px !important; }
      .hero-card, #view-dash .hero-card { min-height: 0 !important; border-radius: 32px !important; }
      .hero-card h2, #view-dash .hero-card h2 { max-width: none; font-size: 1.72rem !important; line-height: 1.18 !important; }
      .quick-actions, #view-dash .quick-actions { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .bottom-nav { width: calc(100% - 14px) !important; height: 74px !important; bottom: 7px !important; border-radius: 28px !important; }
      .nav-item { margin: 4px 2px !important; }
      .nav-item span { font-size: .66rem !important; }
      .modal { align-items: flex-end !important; }
    }

    body.dark-mode {
      --bg: #08111f;
      --text: #f1f5f9;
      --border: rgba(255,255,255,.12);
      background:
        radial-gradient(circle at var(--spot-x, 18%) var(--spot-y, 8%), rgba(217,155,43,.23), transparent 19rem),
        radial-gradient(circle at 92% 5%, rgba(8,127,120,.18), transparent 24rem),
        linear-gradient(132deg, #050914 0%, #0b1930 54%, #21180e 100%) !important;
    }
    body.dark-mode .card, body.dark-mode .modal-box, body.dark-mode .confirm-box, body.dark-mode .sidebar {
      background: linear-gradient(145deg, rgba(14,27,51,.82), rgba(25,25,27,.70)) !important;
      border-color: rgba(255,255,255,.13) !important;
      color: #f1f5f9 !important;
    }
    body.dark-mode .dash-item, body.dark-mode .student-row, body.dark-mode .archive-item, body.dark-mode .calendar-item, body.dark-mode .note-head, body.dark-mode .acc-card, body.dark-mode .plan-card, body.dark-mode .search-result, body.dark-mode .alert-card {
      background: linear-gradient(145deg, rgba(22,36,62,.72), rgba(31,31,31,.54)) !important;
      border-color: rgba(255,255,255,.12) !important;
    }
    body.dark-mode .section-title, body.dark-mode .card > h3, body.dark-mode .modal-box h3, body.dark-mode .sidebar h2 { color: #ffffff !important; }
    body.dark-mode input, body.dark-mode select, body.dark-mode textarea {
      background: rgba(7,14,26,.72) !important;
      color: #fff9ea !important;
      border-color: rgba(255,255,255,.14) !important;
    }
    body.dark-mode label { color: #f1f5f9 !important; }
    body.dark-mode .plan-body, body.dark-mode .acc-body, body.dark-mode .note-body { color: #f1f5f9 !important; background: rgba(255,255,255,0.05) !important; }
    body.dark-mode .dash-item b, body.dark-mode .dash-item span, body.dark-mode .student-row b { color: #f1f5f9 !important; }
    body.dark-mode .attendance-session-head b { color: #ffffff !important; }

    @media print {
      body { background: #fff !important; }
      .card, .modal-box, .confirm-box { box-shadow: none !important; backdrop-filter: none !important; }
    }



    .profile-list-item {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .profile-list-item::after {
      content: "›";
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: rgba(255,255,255,.54);
      color: rgba(9,18,33,.55);
      font-size: 1.2rem;
      transform: rotate(180deg);
    }
    .profile-list-item .score-badge { margin-right: auto; }
    @media (max-width: 760px) {
      .profile-list-item { min-height: 64px; }
      .profile-list-item::after { display: none; }
    }

    /* Mobile luxury pass: app-like ergonomics for mostly phone users. */
    :root {
      --tap-min: 48px;
      --mobile-pad: clamp(10px, 3.4vw, 14px);
    }
    * { -webkit-tap-highlight-color: transparent; }
    button, .btn, .nav-item, .menu-item, .dash-item, .student-row, .action-tile, .tool-btn, .tab, .chip-ui {
      touch-action: manipulation;
    }
    .btn, .nav-item, .menu-item, .tab, .chip-ui, input, select, textarea {
      min-height: var(--tap-min);
    }
    .btn:focus-visible, .nav-item:focus-visible, .menu-item:focus-visible, .tab:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
      outline: 3px solid rgba(8,127,120,.32);
      outline-offset: 3px;
    }

    @media (max-width: 760px) {
      body {
        padding-bottom: calc(104px + env(safe-area-inset-bottom)) !important;
        background-size: auto, auto, auto, 190% 190% !important;
      }
      body::before { background-size: 30px 30px, 30px 30px, 15px 15px !important; opacity: .22 !important; }
      body::after { min-width: 310px; min-height: 310px; width: 78vw; height: 78vw; opacity: .72; }

      .header {
        display: grid !important;
        grid-template-columns: 46px minmax(0, 1fr) auto;
        gap: 8px;
        padding: 7px 9px !important;
        height: 58px !important;
        box-shadow: 0 16px 46px rgba(9,18,33,.22), inset 0 1px 0 rgba(255,255,255,.18) !important;
      }
      .menu-btn {
        width: 42px !important;
        height: 42px !important;
        border-radius: 17px !important;
        font-size: 1.55rem !important;
      }
      #page-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
        font-size: 1.05rem !important;
      }
      #header-date {
        max-width: 82px !important;
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 8px !important;
        font-size: .72rem !important;
      }

      .container {
        padding: 14px var(--mobile-pad) calc(112px + env(safe-area-inset-bottom)) !important;
      }
      .card {
        padding: 15px !important;
        margin-bottom: 12px !important;
        border-radius: 26px !important;
        box-shadow: 0 14px 38px rgba(9,18,33,.105) !important;
      }
      .section-title, .card > h3 {
        font-size: 1.02rem !important;
        line-height: 1.55 !important;
        margin-top: 0 !important;
      }
      .section-title::before { width: 8px !important; height: 23px !important; }
      .section-title::after { min-width: 28px !important; }

      .hero-card, #view-dash .hero-card {
        padding: 16px !important;
        border-radius: 31px !important;
        box-shadow: 0 26px 76px rgba(7,18,35,.28) !important;
      }
      .hero-grid, #view-dash .hero-grid { gap: 14px !important; }
      .hero-card h2, #view-dash .hero-card h2 {
        margin: 7px 0 14px !important;
        font-size: clamp(1.62rem, 8.3vw, 2.15rem) !important;
        letter-spacing: -.85px !important;
      }
      .quick-actions, #view-dash .quick-actions {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 8px !important;
      }
      .action-tile, #view-dash .action-tile {
        min-height: 76px !important;
        padding: 9px 4px !important;
        border-radius: 21px !important;
        font-size: .73rem !important;
        line-height: 1.25 !important;
      }
      .action-tile span, #view-dash .action-tile span {
        width: 36px !important;
        height: 36px !important;
        border-radius: 14px !important;
        font-size: 1.12rem !important;
        margin-bottom: 5px !important;
      }
      .hero-stat, .metric-pill {
        border-radius: 20px !important;
        min-height: 54px !important;
      }
      .metric-strip, #view-dash .metric-strip { gap: 7px !important; }
      .hero-stat b { font-size: 1.12rem !important; }
      .metric-pill b { font-size: 1.06rem !important; }

      #view-tools .card > div[style*="grid-template-columns"],
      #view-tools .card > div[style*="grid"] {
        gap: 10px !important;
      }
      .tool-btn {
        min-height: 112px;
        padding: 14px 8px !important;
        border-radius: 24px !important;
        justify-content: center;
      }
      .tool-btn i { font-size: 2.1rem !important; }

      .dash-item, .student-row, .archive-item, .calendar-item, .search-result, .plan-card, .acc-card, .note-head, .alert-card {
        border-radius: 22px !important;
        padding: 12px !important;
        margin-bottom: 9px !important;
      }
      #dash-list, #profiles-list, #score-list, #att-list, #plans-list, #archive-list, #calendar-list, #notes-list, #global-search-results, #quick-search-results {
        gap: 9px !important;
      }
      .dash-item {
        min-height: 58px;
      }
      .avatar-sm {
        width: 42px !important;
        height: 42px !important;
      }
      .score-badge {
        border-radius: 999px !important;
        padding: 7px 10px !important;
        font-size: .82rem !important;
      }

      #att-list {
        padding: 8px !important;
        background: rgba(255,255,255,.48) !important;
      }
      #att-list .dash-item {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 112px;
        align-items: center;
        gap: 10px;
      }
      #att-list .dash-item > div { min-width: 0; }
      #att-list .dash-item b {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #att-list select {
        width: 112px !important;
        min-height: 48px !important;
        padding: 8px 10px !important;
        font-size: .92rem !important;
      }
      #view-att .compact-row {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px !important;
      }
      #view-att .compact-row .btn { padding-inline: 12px !important; }

      input, select, textarea {
        min-height: 50px;
        padding: 12px 13px !important;
        border-radius: 19px !important;
        font-size: 16px !important;
      }
      textarea { min-height: 82px; }
      label { font-size: .88rem !important; margin-top: 11px !important; }
      .btn { min-height: 50px; padding: 12px 14px !important; font-size: .94rem !important; }

      .tabs {
        position: sticky;
        top: 74px;
        z-index: 50;
        overflow-x: auto;
        scrollbar-width: none;
        justify-content: flex-start !important;
        padding: 7px !important;
      }
      .tabs::-webkit-scrollbar { display: none; }
      .tab {
        flex: 0 0 auto !important;
        min-width: max-content;
        padding: 10px 14px !important;
      }

      .modal {
        padding: 8px !important;
        align-items: flex-end !important;
      }
      .modal-box, .confirm-box {
        width: 100% !important;
        max-width: none !important;
        max-height: min(88dvh, 720px) !important;
        border-radius: 30px 30px 22px 22px !important;
        padding: 18px 15px calc(18px + env(safe-area-inset-bottom)) !important;
        overscroll-behavior: contain;
      }
      .modal-box::before, .confirm-box::before {
        content: "";
        display: block;
        width: 44px;
        height: 5px;
        margin: 0 auto 12px;
        border-radius: 999px;
        background: rgba(9,18,33,.18);
      }
      .modal-box h3, .confirm-box h3 { text-align: center; }
      .modal-box > div[style*="display:flex"], .confirm-box > div[style*="display:flex"] {
        gap: 8px !important;
      }
      .chip-ui {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        margin: 4px 3px !important;
        padding: 9px 11px !important;
        border-radius: 999px !important;
        font-size: .86rem !important;
      }
      .mod-box-full {
        padding: 13px !important;
        border-radius: 23px !important;
      }
      .mat-chip, .file-chip {
        min-height: 34px;
        display: inline-flex !important;
        align-items: center;
        border-radius: 999px !important;
      }

      .sidebar {
        width: min(330px, 86vw) !important;
        padding: 18px !important;
        border-radius: 30px 0 0 30px !important;
      }
      .menu-item {
        min-height: 48px;
        padding: 12px 14px !important;
      }

      .bottom-nav {
        height: 70px !important;
        width: calc(100% - 16px) !important;
        bottom: calc(6px + env(safe-area-inset-bottom) * .35) !important;
        border-radius: 27px !important;
        padding: 4px !important;
      }
      .nav-item {
        height: calc(100% - 4px) !important;
        margin: 2px !important;
        border-radius: 22px !important;
        gap: 2px !important;
      }
      .nav-item i {
        font-size: 1.12rem !important;
        margin-bottom: 1px !important;
      }
      .nav-item span {
        font-size: .61rem !important;
        line-height: 1.05 !important;
      }
      .nav-item.active {
        transform: translateY(-4px) !important;
      }
      .nav-item.active i { transform: translateY(-1px) scale(1.05) !important; }

      .fab {
        left: 16px !important;
        bottom: calc(88px + env(safe-area-inset-bottom)) !important;
        width: 58px !important;
        height: 58px !important;
        border-radius: 22px !important;
        box-shadow: 0 20px 44px rgba(8,127,120,.32) !important;
      }

      .profile-avatar {
        width: 104px !important;
        height: 104px !important;
      }
      #sp-summary-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
      }
      .report-card-modal {
        border-radius: 28px 28px 18px 18px !important;
      }
      .report-actions {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 380px) {
      .quick-actions, #view-dash .quick-actions { gap: 6px !important; }
      .action-tile, #view-dash .action-tile { font-size: .68rem !important; min-height: 70px !important; }
      .action-tile span, #view-dash .action-tile span { width: 32px !important; height: 32px !important; }
      .nav-item span { font-size: .56rem !important; }
      #att-list .dash-item { grid-template-columns: minmax(0, 1fr) 104px; }
      #att-list select { width: 104px !important; }
      #header-date { display: none !important; }
      .header { grid-template-columns: 46px minmax(0, 1fr) 46px; }
      .header::after { content: ""; }
    }



    .page-hero-lite {
      background:
        radial-gradient(circle at 12% 0%, rgba(217,155,43,.16), transparent 44%),
        linear-gradient(145deg, rgba(255,255,255,.76), rgba(255,244,214,.58)) !important;
    }
    .page-hint {
      margin: -4px 0 16px;
      color: rgba(9,18,33,.58);
      font-weight: 850;
      line-height: 1.8;
    }
    .search-shell #global-search-input {
      padding-right: 42px !important;
      background-position: right 14px center;
    }
    @media (max-width: 760px) {
      .page-hint { font-size: .82rem; margin-bottom: 12px; }
    }

    /* Page-by-page luxury polish: mobile-first section identities. */
    .view { position: relative; }
    .view::before {
      content: "";
      position: fixed;
      inset: 84px auto auto 50%;
      width: min(720px, 86vw);
      height: 210px;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: -1;
      border-radius: 999px;
      filter: blur(16px);
      opacity: .62;
      background: radial-gradient(closest-side, rgba(217,155,43,.18), transparent 74%);
    }
    #view-att::before { background: radial-gradient(closest-side, rgba(13,159,114,.18), transparent 74%); }
    #view-profiles::before, #view-single-profile::before { background: radial-gradient(closest-side, rgba(14,76,129,.19), transparent 74%); }
    #view-plans::before { background: radial-gradient(closest-side, rgba(217,155,43,.22), transparent 74%); }
    #view-tools::before { background: radial-gradient(closest-side, rgba(8,127,120,.17), transparent 74%); }
    #view-archive::before, #view-calendar::before { background: radial-gradient(closest-side, rgba(117,77,27,.17), transparent 74%); }
    #view-search::before { background: radial-gradient(closest-side, rgba(9,18,33,.13), transparent 74%); }
    #view-notes::before { background: radial-gradient(closest-side, rgba(194,121,35,.18), transparent 74%); }
    #view-settings::before { background: radial-gradient(closest-side, rgba(91,65,125,.14), transparent 74%); }
    #view-score::before { background: radial-gradient(closest-side, rgba(245,158,11,.20), transparent 74%); }

    #view-dash .hero-card { transform-style: preserve-3d; }
    #view-dash .hero-card small:first-child::before { content: "●"; color: #42e6ad; font-size: .72rem; }
    #view-dash .hero-stat::after {
      content: "برترین عملکرد";
      display: inline-flex;
      justify-self: center;
      margin-top: 8px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,.13);
      color: rgba(255,248,223,.78);
      font-size: .72rem;
      font-weight: 900;
    }
    #view-dash .metric-pill {
      position: relative;
      overflow: hidden;
    }
    #view-dash .metric-pill::before {
      content: "";
      position: absolute;
      inset: auto 10px 8px 10px;
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255,232,170,.20), rgba(255,232,170,.72), rgba(255,232,170,.20));
    }
    #view-dash #alerts-list:empty::before, #view-dash #dash-list:empty::before {
      content: "در حال آماده‌سازی اطلاعات...";
      display: block;
      text-align: center;
      padding: 26px 10px;
      color: rgba(9,18,33,.48);
      font-weight: 900;
    }

    #view-att .section-title {
      background: linear-gradient(135deg, rgba(13,159,114,.10), transparent);
      padding: 6px 8px;
      border-radius: 20px;
    }
    #view-att #att-date {
      background-image: linear-gradient(135deg, rgba(255,255,255,.86), rgba(231,255,245,.58)) !important;
      border-color: rgba(13,159,114,.30) !important;
      color: #064e3b !important;
    }
    #view-att #att-list .dash-item {
      position: relative;
      overflow: hidden;
    }
    #view-att #att-list .dash-item::before {
      content: "";
      position: absolute;
      inset: 10px auto 10px 8px;
      width: 4px;
      border-radius: 99px;
      background: linear-gradient(180deg, #12ad73, #087f78);
      opacity: .72;
    }
    #view-att #att-list select option[value="Present"] { color: #047857; }
    #view-att #att-list select option[value="Absent"] { color: #be123c; }
    #view-att #att-list select option[value="Late"] { color: #b45309; }
    #view-att #att-list select option[value="Excused"] { color: #0369a1; }

    #view-profiles > .card:first-child {
      background:
        radial-gradient(circle at 12% 0%, rgba(14,76,129,.12), transparent 46%),
        linear-gradient(145deg, rgba(255,255,255,.76), rgba(255,245,218,.58)) !important;
    }
    #profiles-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    #view-single-profile > .card:first-of-type {
      overflow: visible;
      text-align: center;
      background:
        radial-gradient(circle at 50% -18%, rgba(14,76,129,.20), transparent 42%),
        linear-gradient(145deg, rgba(255,255,255,.78), rgba(255,243,212,.60)) !important;
    }
    #view-single-profile > .card:first-of-type::after {
      content: "";
      position: absolute;
      inset: 12px 12px auto;
      height: 72px;
      border-radius: 24px;
      z-index: -1;
      background: linear-gradient(135deg, rgba(10,27,51,.12), rgba(217,155,43,.13));
    }
    #sp-name { letter-spacing: -.45px; }
    #view-single-profile .phone-item {
      border-radius: 20px;
      padding: 8px;
      background: rgba(255,255,255,.40);
      border: 1px solid rgba(255,255,255,.58);
      margin-bottom: 8px;
    }
    #sp-mi-accordion .card {
      border-right: 5px solid rgba(14,76,129,.55) !important;
    }

    #view-plans > .card:first-child {
      padding: 14px 16px !important;
      background:
        radial-gradient(circle at 8% 0%, rgba(217,155,43,.18), transparent 48%),
        linear-gradient(145deg, rgba(255,255,255,.74), rgba(255,244,214,.64)) !important;
    }
    #view-plans .section-title {
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    #plans-list {
      display: grid;
      gap: 12px;
    }
    .plan-card {
      position: relative;
      overflow: hidden;
    }
    .plan-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 5px;
      background: linear-gradient(90deg, #d99b2b, #087f78, #0e4c81);
      opacity: .86;
    }
    .plan-card.game::before { background: linear-gradient(90deg, #f59e0b, #ef4444); }
    .plan-card.story::before { background: linear-gradient(90deg, #0e4c81, #60a5fa); }
    .plan-card.hazrat::before { background: linear-gradient(90deg, #087f78, #12ad73); }
    .plan-header b { font-size: 1.05rem; }
    .plan-header > span {
      border-radius: 999px;
      background: rgba(255,255,255,.50);
      padding: 6px 10px;
      font-weight: 900;
    }
    .plan-body {
      background: linear-gradient(180deg, rgba(255,255,255,.38), rgba(255,247,226,.32)) !important;
      border-radius: 0 0 22px 22px;
    }

    #view-tools .card {
      background:
        radial-gradient(circle at 20% 0%, rgba(8,127,120,.13), transparent 42%),
        linear-gradient(145deg, rgba(255,255,255,.74), rgba(255,244,214,.58)) !important;
    }
    #view-tools .card > div[style*="grid"] {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
      gap: 12px !important;
    }
    #view-tools .tool-btn {
      position: relative;
      min-height: 136px;
      overflow: hidden;
    }
    #view-tools .tool-btn::after {
      content: "";
      position: absolute;
      inset: auto -28px -38px auto;
      width: 110px;
      height: 110px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(8,127,120,.13), transparent 68%);
    }

    #view-archive .card, #view-calendar .card, #view-search .card, #view-notes .card, #view-settings .card, #view-score .card {
      overflow: visible;
    }
    #archive-search, #global-search-input {
      background-image: linear-gradient(135deg, rgba(255,255,255,.86), rgba(255,246,226,.58)) !important;
      border-color: rgba(14,76,129,.24) !important;
    }
    #archive-list, #calendar-list, #global-search-results, #quick-search-results, #notes-history, #score-list {
      display: grid;
      gap: 10px;
    }
    .archive-item, .calendar-item, .search-result, .note-item, #score-list .dash-item {
      animation: none;
    }
    .calendar-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .calendar-item strong {
      min-width: max-content;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,.54);
      color: var(--elite-navy);
    }
    .search-result b::before { content: "⌕ "; color: var(--elite-gold); }
    .note-item {
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 16px 38px rgba(9,18,33,.085);
    }
    .note-head {
      margin: 0 !important;
      border-radius: 24px !important;
      cursor: pointer;
    }
    .note-body {
      background: rgba(255,255,255,.45) !important;
      border: 1px solid rgba(255,255,255,.62);
      border-top: 0;
      border-radius: 0 0 24px 24px;
    }
    #note-text {
      min-height: 138px;
      line-height: 1.9;
      background-image: linear-gradient(transparent 31px, rgba(217,155,43,.08) 32px) !important;
      background-size: 100% 32px !important;
    }
    #view-settings input[type="checkbox"] {
      accent-color: #087f78;
      min-height: auto;
    }
    #view-settings label:has(input[type="checkbox"]) {
      min-height: 48px;
      padding: 8px 10px;
      border-radius: 18px;
      background: rgba(255,255,255,.42);
      border: 1px solid rgba(255,255,255,.58);
    }
    #score-list .dash-item {
      border-right-color: rgba(245,158,11,.82) !important;
    }
    #score-list .dash-item::before {
      content: "⭐";
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: rgba(255,232,170,.70);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.70);
    }

    @media (prefers-reduced-motion: no-preference) {
      .view.active::before { animation: viewAura 5.5s ease-in-out infinite alternate; }
      @keyframes viewAura { to { transform: translateX(-50%) translateY(12px) scale(1.04); opacity: .78; } }
      .plan-card.open .plan-body, .note-item.open .note-body, .acc-card.open .acc-body { animation: luxuryReveal .28s var(--elite-spring) both; }
      @keyframes luxuryReveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    }

    @media (max-width: 760px) {
      .view::before { top: 70px; height: 170px; opacity: .50; }
      #view-dash .hero-stat::after { display: none; }
      #view-dash > .card:not(.hero-card) { border-radius: 25px !important; }
      #view-dash #dash-list .dash-item { min-height: 62px; }
      #view-att .section-title { padding: 4px; }
      #profiles-list { grid-template-columns: 1fr; gap: 8px; }
      #view-single-profile > .card:first-of-type { padding-top: 22px !important; }
      #view-plans .section-title .btn { width: auto !important; min-height: 42px; padding: 9px 13px !important; }
      .plan-header { padding: 15px 13px !important; }
      .plan-header b { font-size: .98rem; }
      .plan-header > span { font-size: .72rem !important; padding: 5px 8px; }
      .plan-body { padding: 14px !important; }
      #view-tools .card > div[style*="grid"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 8px !important; }
      #view-tools .tool-btn { min-height: 96px; font-size: .72rem; }
      #view-tools .tool-btn i { font-size: 1.85rem !important; }
      #view-archive .tabs { flex-wrap: nowrap !important; }
      #archive-list { max-height: none !important; overflow-y: visible !important; }
      .calendar-item { align-items: flex-start; }
      .calendar-item strong { font-size: .78rem; }
      #view-notes .card > div[style*="justify-content:space-between"] {
        display: grid !important;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      #view-notes .card > div[style*="justify-content:space-between"] input { width: 100% !important; }
      #view-settings .card > div[style*="grid-template-columns:1fr 1fr"] { grid-template-columns: 1fr !important; }
      #score-list .dash-item { display: grid !important; grid-template-columns: auto minmax(0,1fr) auto; gap: 10px; align-items: center; }
    }

    @media (max-width: 380px) {
      #view-tools .card > div[style*="grid"] { grid-template-columns: 1fr 1fr !important; }
      .plan-header { gap: 8px; }
    }


    /* Dashboard hero readability fix: clearer top student and metric numbers. */
    #view-dash .hero-card {
      color: #fff8df;
    }
    #view-dash .hero-card .hero-grid > div:last-child {
      min-width: 0;
      display: grid;
      gap: 12px;
      align-content: stretch;
    }
    #view-dash .hero-stat {
      min-width: 0;
      padding: clamp(13px, 2vw, 18px) !important;
      background:
        linear-gradient(135deg, rgba(255,255,255,.24), rgba(255,255,255,.09)) !important;
      border: 1px solid rgba(255,255,255,.30) !important;
    }
    #view-dash .hero-stat small {
      width: max-content;
      margin: 0 auto 8px;
      color: rgba(255,248,223,.86) !important;
    }
    #view-dash .hero-stat b#top-student {
      display: -webkit-box !important;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #fff6d6 !important;
      font-size: clamp(1.02rem, 2.5vw, 1.42rem) !important;
      font-weight: 1000 !important;
      line-height: 1.75 !important;
      letter-spacing: -.35px;
      text-align: center;
      text-shadow: 0 10px 26px rgba(0,0,0,.36);
      overflow-wrap: anywhere;
    }
    #view-dash .metric-strip {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 10px !important;
      min-width: 0;
    }
    #view-dash .metric-pill {
      min-width: 0;
      padding: 11px 8px 13px !important;
      background:
        linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.10)) !important;
      border: 1px solid rgba(255,255,255,.30) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 12px 28px rgba(0,0,0,.10);
    }
    #view-dash .metric-pill small {
      display: block;
      margin-bottom: 5px;
      color: rgba(255,248,223,.82) !important;
      font-size: .74rem !important;
      font-weight: 950 !important;
      line-height: 1.2;
      white-space: nowrap;
    }
    #view-dash .metric-pill b {
      display: block;
      color: #ffe49a !important;
      font-size: clamp(1.35rem, 4.8vw, 2.05rem) !important;
      font-weight: 1000 !important;
      line-height: 1 !important;
      letter-spacing: -.8px;
      text-shadow: 0 10px 24px rgba(0,0,0,.30);
      font-variant-numeric: tabular-nums;
    }
    #view-dash .metric-pill::before {
      height: 4px !important;
      bottom: 6px !important;
      opacity: .95;
    }
    @media (max-width: 760px) {
      #view-dash .hero-grid { gap: 12px !important; }
      #view-dash .hero-stat { min-height: auto !important; }
      #view-dash .hero-stat b#top-student {
        -webkit-line-clamp: 2;
        font-size: 1rem !important;
        line-height: 1.65 !important;
      }
      #view-dash .metric-strip { gap: 7px !important; }
      #view-dash .metric-pill {
        min-height: 64px !important;
        padding: 9px 5px 11px !important;
        border-radius: 19px !important;
      }
      #view-dash .metric-pill small { font-size: .66rem !important; }
      #view-dash .metric-pill b { font-size: 1.42rem !important; }
    }
    @media (max-width: 380px) {
      #view-dash .metric-pill b { font-size: 1.26rem !important; }
      #view-dash .metric-pill small { font-size: .62rem !important; }
    }


    .attendance-history-card .section-title { justify-content: space-between; flex-wrap: wrap; }
    #attendance-history-list { display: grid; gap: 10px; }
    .attendance-session-card { border-radius: 24px; overflow: hidden; background: rgba(255,255,255,.48); border: 1px solid rgba(255,255,255,.68); box-shadow: 0 14px 34px rgba(9,18,33,.08); }
    .attendance-session-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px; cursor:pointer; }
    .attendance-session-head b { display:block; color:var(--elite-navy, #10213d); font-weight:1000; }
    .attendance-session-head small { display:block; opacity:.62; margin-top:4px; font-weight:850; }
    .attendance-mini-stats { display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; }
    .attendance-mini-stats span { min-width:30px; height:30px; display:grid; place-items:center; border-radius:12px; color:#fff; font-weight:1000; font-size:.82rem; }
    .attendance-mini-stats .ok { background:#0d9f72; } .attendance-mini-stats .warn { background:#d99b2b; } .attendance-mini-stats .danger { background:#c93445; } .attendance-mini-stats .info { background:#0e4c81; }
    .attendance-session-body { display:none; padding:0 12px 12px; }
    .attendance-session-card.open .attendance-session-body { display:grid; gap:8px; }
    .attendance-detail-actions { display:flex; justify-content:flex-end; padding-top:4px; }
    .attendance-detail-actions .btn { width:auto; min-height:42px; padding:9px 13px !important; }
    .attendance-detail-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border-radius:18px; background:rgba(255,255,255,.62); border-right:4px solid #0d9f72; }
    .attendance-detail-row.warn { border-right-color:#d99b2b; } .attendance-detail-row.danger { border-right-color:#c93445; } .attendance-detail-row.info { border-right-color:#0e4c81; }
    .attendance-detail-row > div { display:flex; align-items:center; gap:10px; min-width:0; }
    .attendance-detail-row img { width:34px; height:34px; border-radius:50%; object-fit:cover; }
    .attendance-detail-row b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .attendance-detail-row span { flex:0 0 auto; font-weight:1000; font-size:.86rem; }
    @media (max-width: 760px) {
      .attendance-session-head { align-items:flex-start; flex-direction:column; }
      .attendance-mini-stats { justify-content:flex-start; }
      .attendance-detail-row { align-items:flex-start; flex-direction:column; }
    }


    .clickable-calendar-item { cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
    .clickable-calendar-item:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(9,18,33,.12) !important; }
    .highlight { animation: calendarTargetPulse 2.1s ease both; }
    @keyframes calendarTargetPulse {
      0%, 100% { box-shadow: 0 16px 38px rgba(9,18,33,.09); }
      20%, 65% { box-shadow: 0 0 0 5px rgba(217,155,43,.22), 0 24px 58px rgba(9,18,33,.16); transform: translateY(-2px); }
    }

  </style>
</head>
<body>
<script>if(localStorage.getItem('charshanbeDarkMode')==='1')document.body.classList.add('dark-mode');</script>

  <div id="confirm-modal" class="modal" style="z-index: 7000;">
    <div class="confirm-box">
      <button class="confirm-close" onclick="closeConfirm()" aria-label="بستن">×</button>
      <div id="confirm-icon" style="font-size: 3rem; margin-bottom: 15px; color: var(--primary);"><i class="fas fa-question-circle"></i></div>
      <h3 id="confirm-msg" style="margin: 0; font-size: 1.2rem;"></h3>
      <div style="display:flex; gap:10px; margin-top:25px;" id="confirm-buttons">
        <button class="btn btn-green" id="confirm-yes" style="border-radius: 12px; padding: 12px;">بله، تایید</button>
        <button class="btn btn-red" id="confirm-no" onclick="closeConfirm()" style="border-radius: 12px; padding: 12px; background: #94a3b8;">خیر، بازگشت</button>
      </div>
    </div>
  </div>

  <div id="prompt-modal" class="modal" style="z-index: 8000;">
    <div class="confirm-box">
      <div style="font-size: 3rem; margin-bottom: 15px; color: var(--primary);"><i class="fas fa-edit"></i></div>
      <h3 id="prompt-msg" style="margin: 0; font-size: 1.2rem;"></h3>
      <input type="text" id="prompt-input" style="margin-top: 20px; text-align: center; font-size: 1.2rem; font-weight: bold; border-color: var(--primary);">
      <div style="display:flex; gap:10px; margin-top:15px;">
        <button class="btn btn-green" id="prompt-yes" style="border-radius: 12px; padding: 12px;">تایید</button>
        <button class="btn btn-red" id="prompt-no" style="border-radius: 12px; padding: 12px; background: #94a3b8;">انصراف</button>
      </div>
    </div>
  </div>

  <div id="toast-container" class="toast-container"></div>

  <div id="lightbox" onclick="this.style.display='none'"><span class="close-lb">✕</span><img id="lightbox-img" src=""></div>

  <div id="skeleton-screen">
      <div class="sk-card"></div>
      <div class="sk-card"></div>
      <div class="sk-card"></div>
      <div class="sk-card"></div>
  </div>

  <div class="header">
    <div class="menu-btn" onclick="toggleSidebar()" role="button" tabindex="0" aria-label="باز کردن منو">☰</div>
    <h1 style="margin:0; font-size:1.2rem;" id="page-title">داشبورد</h1>
    <div style="font-size:0.9rem; font-weight:bold; opacity:0.9;" id="header-date">...</div>
  </div>

  <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
  <div class="sidebar">
    <h2 style="text-align:center; color:var(--primary); margin-top:10px;">مدیریت کلاس</h2>
    <hr style="width:100%; opacity:0.1; margin:15px 0;">
    <div class="menu-item active" onclick="nav('dash')"><i class="fas fa-chart-line"></i> داشبورد</div>
    <div class="menu-item" onclick="nav('tools')"><i class="fas fa-toolbox"></i> جعبه ابزار کلاس</div>
    <div class="menu-item" onclick="nav('profiles')"><i class="fas fa-user-graduate"></i> پروفایل‌ها</div>
    <div class="menu-item" onclick="nav('plans')"><i class="fas fa-book-reader"></i> طرح درس</div>
    <div class="menu-item" onclick="nav('archive')"><i class="fas fa-history"></i> آرشیو فعالیت‌ها</div>
    <div class="menu-item" onclick="nav('calendar')"><i class="fas fa-history"></i> تقویم جلسات</div>
    <div class="menu-item" onclick="nav('search')"><i class="fas fa-search"></i> جستجوی سراسری</div>
    <div class="menu-item" onclick="nav('att')"><i class="fas fa-check-double"></i> حضور و غیاب</div>
    <div class="menu-item" onclick="nav('score')"><i class="fas fa-star-half-alt"></i> امتیازدهی</div>
    <div class="menu-item" onclick="nav('notes')"><i class="fas fa-pen-nib"></i> یادداشت‌ها</div>
    <div class="menu-item" onclick="nav('settings')"><i class="fas fa-user-cog"></i> تنظیمات</div>
    <div class="menu-item" onclick="toggleDark()" style="margin-top:auto;"><i class="fas fa-moon"></i> حالت شب</div>
  </div>

  <div class="container">

    <!-- DASHBOARD -->
    <div id="view-dash" class="view active">
      <div class="card hero-card">
        <div class="hero-grid">
          <div>
            <small>امروز</small>
            <h2 style="margin:6px 0 12px; font-size:1.5rem;">کنترل سریع جلسه</h2>
            <div class="quick-actions">
              <button class="action-tile" onclick="nav('att')"><span>✅</span>حضور</button>
              <button class="action-tile" onclick="openPlanModal()"><span>📚</span>طرح</button>
              <button class="action-tile" onclick="nav('profiles')"><span>👥</span>متربی</button>
              <button class="action-tile" onclick="nav('notes')"><span>✍</span>یادداشت</button>
            </div>
          </div>
          <div>
            <div class="hero-stat"><small>متربی برتر</small><b id="top-student">...</b></div>
            <div class="metric-strip"><div class="metric-pill"><small>متربی</small><b id="dash-count">۰</b></div><div class="metric-pill"><small>جلسه</small><b id="dash-session-count">۰</b></div><div class="metric-pill"><small>هشدار</small><b id="dash-alert-count">۰</b></div></div>
          </div>
        </div>
      </div>
      <div class="card"><h3 class="section-title">🚨 هشدارها</h3><div id="alerts-list"></div></div>
      <div class="card">
        <h3 class="section-title">📈 روند حضور</h3>
        <div style="overflow-x:auto; padding-bottom:6px;">
          <div id="mainChartBox" style="position: relative; height: 240px; width: 100%; min-width: 100%;">
            <canvas id="mainChart"></canvas>
          </div>
        </div>
      </div>
      <div id="class-mi-section" class="card" style="display:none;">
        <h3 class="section-title">🧠 میانگین هوش کلاس</h3>
        <div style="position: relative; height: 320px; width: 100%;">
          <canvas id="classMIChart"></canvas>
        </div>
      </div>
      <div class="card"><h3 class="section-title">👥 متربی‌ها</h3><div id="dash-list"></div></div>
    </div>

    <!-- TOOLS -->
    <div id="view-tools" class="view">
        <div class="card">
            <h3 class="section-title">🧰 ابزارها</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div class="tool-btn" onclick="openTimer()">
                    <i class="fas fa-stopwatch"></i>
                    <span>تایمر / کرنومتر</span>
                </div>
                <div class="tool-btn" onclick="openManualGrouping()">
                    <i class="fas fa-users-cog"></i>
                    <span>ثبت گروه‌بندی دستی</span>
                </div>
                <div class="tool-btn" onclick="openFreeActivity()">
                    <i class="fas fa-pen-fancy"></i>
                    <span>ثبت فعالیت آزاد</span>
                </div>
            </div>
        </div>
    </div>

    <!-- PROFILES LIST -->
    <div id="view-profiles" class="view">
      <div class="card">
        <h3>👥 مدیریت متربیان</h3>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
          <input type="text" id="new-name" placeholder="نام متربی جدید..." style="margin:0;">
          <button class="btn btn-blue" style="width:60px; margin:0;" onclick="addStudent()">+</button>
        </div>
        <div id="profiles-list"></div>
      </div>
    </div>

    <!-- SINGLE PROFILE -->
    <div id="view-single-profile" class="view">
      <button onclick="nav('profiles')" class="btn btn-outline" style="margin-bottom:15px; width:auto; padding: 10px 20px;">
        <i class="fas fa-arrow-right" style="margin-left:8px;"></i> بازگشت به لیست
      </button>

      <div class="card" style="text-align:center;">
        <img src="" id="sp-img" class="profile-avatar" onclick="openLightbox(this.src)" title="کلیک برای بزرگ‌نمایی">
        <h2 id="sp-name" style="margin:12px 0 6px;"></h2>
        <div id="sp-score" class="score-badge">0 امتیاز</div>
        <button class="btn btn-blue" style="margin-top:15px; font-size:0.9rem;" onclick="openReportCard()">📄 صدور کارنامه عملکرد</button><button class="btn btn-outline" style="margin-top:10px; font-size:0.9rem;" onclick="openMonthlyReport()">🗓 گزارش ماهانه</button>
      </div>
      <div class="tabs">
        <div class="tab active" onclick="switchTab('info')">ℹ️ مشخصات</div>
        <div class="tab" onclick="switchTab('mi')">🧠 هوش</div>
        <div class="tab" onclick="switchTab('stats')">📊 آمار</div>
      </div>
      <div id="tab-info" class="tab-content active">
        <div class="card">
          <label>عکس پروفایل:</label>
          <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px;">
            <input type="file" id="sp-image-file" accept="image/jpeg,image/png,image/webp,image/gif" style="margin:0; flex:1;">
            <button class="btn btn-blue" style="width:auto; white-space:nowrap; padding:12px 16px;" onclick="uploadProfileImage()">آپلود</button>
          </div>
          <input type="hidden" id="sp-input-img">
          <label>بیوگرافی:</label><textarea id="sp-bio" oninput="autoGrow(this)"></textarea>
          <label>یادداشت والدین:</label><textarea id="sp-parent-note" oninput="autoGrow(this)" placeholder="یادداشت کارنامه..."></textarea>
          <label>شماره‌های تماس:</label>
          <div id="phones-container"></div>
          <button class="btn btn-outline" style="padding:8px; font-size:0.85rem; margin-bottom:15px; width:auto;" onclick="addPhoneField()">➕ افزودن شماره تماس</button>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <input type="text" id="sp-dob" placeholder="تاریخ تولد">
            <input type="text" id="sp-school" placeholder="مدرسه">
          </div>
          <label>ملاحظات پزشکی / خاص:</label><input type="text" id="sp-medical">
          <button class="btn btn-green" onclick="saveProfile()" style="margin-top:15px;">💾 ذخیره پروفایل</button>
          <hr style="opacity:0.1; margin:20px 0;">
          <button class="btn btn-red" onclick="askDeleteStudent()" style="background:linear-gradient(135deg,#861f35,#c93445) !important; opacity:0.9;">🗑️ حذف کامل این متربی</button>
        </div>
      </div>
      <div id="tab-mi" class="tab-content">
        <div class="card">
          <div style="position: relative; height: 400px; width: 100%;">
            <canvas id="sp-mi-chart"></canvas>
          </div>
        </div>
        <div id="sp-mi-accordion"></div>
      </div>
      <div id="tab-stats" class="tab-content">
        <div class="card" id="sp-summary-stats" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;"></div>
        <div class="card"><h3>⏳ تاریخچه فعالیت‌ها</h3><div id="sp-mi-history" style="max-height:350px; overflow-y:auto;"></div></div>
        <div class="card">
          <h3 class="section-title">📈 روند رشد</h3>
          <div id="sp-growth-empty" class="empty-chart" style="display:none;">داده کافی برای نمودار رشد نیست.</div>
          <div style="overflow-x:auto; padding-bottom:6px;">
            <div id="spGrowthChartBox" style="position: relative; height: 260px; min-width: 100%;">
              <canvas id="sp-growth-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ATTENDANCE -->
    <div id="view-att" class="view">
      <div class="card">
        <h3 class="section-title">✅ حضور و غیاب <button class="btn btn-green" onclick="submitData()" style="width:auto; padding:10px 16px; border-radius:16px;">ثبت</button></h3>
        <div class="compact-row"><input type="text" id="att-date" class="to-persian" style="text-align:center; font-weight:bold; font-size:1.15rem;"><button class="btn btn-outline" onclick="markAllPresent()" style="width:auto; padding:10px 14px; white-space:nowrap;">همه حاضر</button></div>
      </div>
      <div class="card" style="padding:12px;"><input type="text" placeholder="🔍 جستجو..." onkeyup="filterAtt(this.value)" style="margin:0;"></div>
      <div class="card" id="att-list"></div>
      <div class="card attendance-history-card">
        <h3 class="section-title">🗂 سوابق حضور و غیاب <button class="btn btn-outline" onclick="loadAttendanceHistory(false)" style="width:auto; padding:9px 13px; border-radius:14px;">بروزرسانی</button></h3>
        <div id="attendance-history-list"><p style="opacity:.65;text-align:center;">برای دیدن سوابق، صفحه حضور و غیاب را باز کن.</p></div>
      </div>
    </div>

    <!-- PLANS -->
    <div id="view-plans" class="view">
      <div class="card"><h3 class="section-title">📚 طرح درس <button class="btn btn-blue" onclick="openPlanModal()" style="width:auto; padding:10px 16px; border-radius:16px;">➕ جدید</button></h3></div>
      <div id="plans-list"></div>
    </div>

    <!-- ARCHIVE -->
    <div id="view-archive" class="view">
      <div class="card">
        <h3>📂 آرشیو فعالیت‌های انجام شده</h3>
        <!-- Search Bar -->
        <input type="text" id="archive-search" placeholder="🔍 جستجوی هوشمند در آرشیو..." onkeyup="filterArchive(this.value)" style="margin-bottom:15px; border-color:var(--primary);">

        <div class="tabs" style="margin-top:10px; flex-wrap:wrap;">
          <div class="tab active" onclick="renderArchive('grouping', this)">👥 گروه‌بندی</div>
          <div class="tab" onclick="renderArchive('game', this)">🎲 بازی</div>
          <div class="tab" onclick="renderArchive('story', this)">📖 داستان</div>
          <div class="tab" onclick="renderArchive('yade_hazrat', this)">🕌 یاد حضرت</div>
          <div class="tab" onclick="renderArchive('free_activity', this)">📝 آزاد</div>
          <div class="tab" onclick="renderArchive('other', this)">🔹 سایر</div>
        </div>
        <div id="archive-list" style="max-height:60vh; overflow-y:auto;"></div>
      </div>
    </div>

    <!-- CALENDAR -->
    <div id="view-calendar" class="view">
      <div class="card page-hero-lite"><h3 class="section-title">📅 تقویم جلسات</h3><p class="page-hint">نمای سریع جلسه‌ها و برنامه‌های ثبت‌شده</p><div id="calendar-list"></div></div>
    </div>

    <!-- SEARCH -->
    <div id="view-search" class="view">
      <div class="card page-hero-lite search-shell"><h3 class="section-title">🔎 جستجوی سراسری</h3><p class="page-hint">نام متربی، طرح درس، یادداشت یا آرشیو را سریع پیدا کن</p><input type="text" id="global-search-input" placeholder="جستجو در متربی‌ها، طرح درس، یادداشت و آرشیو..." onkeyup="runGlobalSearch(this.value)"><div id="global-search-results"></div></div>
    </div>

    <!-- NOTES -->
    <div id="view-notes" class="view">
      <div class="card">
        <label>تاریخ یادداشت:</label><input type="text" id="note-date" class="to-persian" style="text-align:center;">
        <textarea id="note-text" placeholder="متن یادداشت یا صورتجلسه امروز..." oninput="autoGrow(this)"></textarea>
        <button class="btn btn-blue" onclick="saveNote()">💾 ذخیره یادداشت جلسه</button>
      </div>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3 style="margin:0;">📒 سوابق یادداشت‌ها</h3>
          <input type="text" placeholder="🔍 جستجو..." style="width:130px; margin:0;" onkeyup="filterNotes(this.value)">
        </div>
        <div id="notes-history"></div>
      </div>
    </div>

    <!-- SETTINGS -->
    <div id="view-settings" class="view">
      <div class="card">
        <h3 class="section-title">⚙️ تنظیمات</h3>
        <label>توکن ربات تلگرام:</label><input type="text" id="st-token">
        <label>آیدی عددی مدیران (با کاما):</label><input type="text" id="st-admin" placeholder="مثلاً: 12345,67890">
        <div style="display:grid; grid-template-columns:1fr; gap:8px; margin:10px 0;">
          <label style="display:flex; gap:10px; align-items:center;"><input type="checkbox" id="st-tg-score" style="width:auto; margin:0;"> اعلان تلگرام برای امتیازها</label>
          <label style="display:flex; gap:10px; align-items:center;"><input type="checkbox" id="st-tg-att" style="width:auto; margin:0;"> اعلان تلگرام برای حضور و غیاب</label>
          <label style="display:flex; gap:10px; align-items:center;"><input type="checkbox" id="st-tg-buy" style="width:auto; margin:0;"> اعلان تلگرام برای خریدها</label>
        </div>
        <button class="btn btn-blue" onclick="saveSettings()" style="margin-top:15px;">💾 ذخیره تنظیمات</button>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
          <button class="btn btn-outline" onclick="testTelegram()" style="border-color:#8b5cf6; color:#8b5cf6;">🔔 تست بات</button>
          <button class="btn btn-outline" onclick="setupWebhook()" style="border-color:#10b981; color:#10b981;">🔗 فعالسازی دکمه‌ها</button>
          <button class="btn btn-outline" onclick="flushTelegram()" style="border-color:#d0a94f; color:#8f6b24;">📨 ارسال صف تلگرام</button>
          <a class="classic-link" href="backup.php?type=json">⬇ بکاپ JSON</a>
          <a class="classic-link" href="backup.php?type=sql">⬇ بکاپ SQL</a>
          <a class="classic-link" href="import.php">⬆ ورود CSV شیت</a>
        </div>
      </div>
    </div>

    <!-- SCORES -->
    <div id="view-score" class="view"><div class="card page-hero-lite"><h3 class="section-title">⭐ ثبت امتیاز تشویقی/انضباطی</h3><p class="page-hint">روی هر متربی بزن و امتیاز دستی را ثبت کن</p><div id="score-list"></div></div></div>
  </div>

  <!-- BOTTOM NAVIGATION -->
  <div class="bottom-nav">
    <div class="nav-item active" id="bn-dash" onclick="nav('dash')"><i class="fas fa-chart-line"></i><span>داشبورد</span></div>
    <div class="nav-item" id="bn-att" onclick="nav('att')"><i class="fas fa-check-double"></i><span>حضور</span></div>
    <div class="nav-item" id="bn-plans" onclick="nav('plans')"><i class="fas fa-book-reader"></i><span>طرح</span></div>
    <div class="nav-item" id="bn-profiles" onclick="nav('profiles')"><i class="fas fa-user-graduate"></i><span>کلاس</span></div>
    <div class="nav-item" id="bn-tools" onclick="nav('tools')"><i class="fas fa-toolbox"></i><span>ابزار</span></div>
  </div>

  <!-- MODAL: PLAN -->
  <div class="modal" id="plan-modal">
    <div class="modal-box">
      <h3 style="margin-top:0;">📝 مدیریت طرح درس</h3>
      <input type="hidden" id="p-id">
      <label>تاریخ اجرای طرح:</label><input type="text" id="p-date" class="to-persian" style="text-align:center;">
      <label>عنوان اصلی طرح:</label><input type="text" id="p-title" placeholder="عنوان جلسه">
      <label>⏰ سین و زمان‌بندی برنامه:</label>
      <textarea id="p-sin" placeholder="۱۸:۰۰ شروع برنامه..." oninput="autoGrow(this)"></textarea>

      <div style="margin:15px 0;">
        <label>افزودن بخش جدید:</label><br>
        <span class="chip-ui" onclick="addModule('game')">🎲 بازی</span>
        <span class="chip-ui" onclick="addModule('story')">📖 داستان</span>
        <span class="chip-ui" onclick="addModule('yade_hazrat')">🕌 یاد حضرت</span>
        <span class="chip-ui" onclick="addModule('trip')">🚌 اردو</span>
        <span class="chip-ui" onclick="addModule('other')">📝 سایر</span>
      </div>

      <div id="modules-container"></div>

      <div style="display:flex; gap:12px; margin-top:25px;">
        <button class="btn btn-blue" onclick="savePlan()">💾 ذخیره نهایی</button>
        <button class="btn btn-red" onclick="document.getElementById('plan-modal').style.display='none'">❌ انصراف</button>
      </div>
    </div>
  </div>

  <!-- MODAL: TIMER -->
  <div class="modal" id="timer-modal">
      <div class="modal-box" style="text-align:center;">
          <h3 style="margin-top:0;">⏱️ تایمر کلاس</h3>
          <div class="modern-timer" id="timer-display">00:00</div>

          <div class="timer-input-group">
              <input type="text" inputmode="numeric" id="t-min" placeholder="دقیقه">
              <input type="text" inputmode="numeric" id="t-sec" placeholder="ثانیه">
              <button class="btn btn-purple" style="width:auto;" onclick="setCustomTimer()">تنظیم دستی</button>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:15px;">
              <button class="btn btn-green" onclick="startTimer()">شروع ▶</button>
              <button class="btn btn-red" onclick="stopTimer()">توقف ⏸</button>
              <button class="btn btn-blue" onclick="resetTimer()">بازنشانی 🔄</button>
          </div>
          <button class="btn btn-red" onclick="document.getElementById('timer-modal').style.display='none'" style="margin-top:20px;">بستن</button>
      </div>
  </div>

  <!-- MODAL: MANUAL GROUPING -->
  <div class="modal" id="manual-grouping-modal">
      <div class="modal-box">
          <h3 style="margin-top:0;">👥 ثبت گروه‌بندی</h3>
          <label>مدل گروه‌بندی (عنوان کلی):</label>
          <input type="text" id="g-model" placeholder="مثلاً: مسابقه علمی">
          <label>تاریخ:</label><input type="text" id="g-date" class="to-persian" style="text-align:center;">

          <hr style="opacity:0.2; margin:15px 0;">

          <label>نام گروه جدید:</label>
          <div style="display:flex; gap:5px; margin-bottom:10px;">
              <input type="text" id="g-current-name" placeholder="مثلاً: گروه شهید همت" style="margin:0;">
              <button class="btn btn-green" style="width:auto; white-space:nowrap;" onclick="addGroupToList()">ثبت این گروه</button>
          </div>

          <p style="font-size:0.85rem; color:#666; margin-bottom:8px;">اعضای گروه را انتخاب کنید:</p>
          <div class="student-select-grid" id="g-students-list"></div>

          <div id="added-groups-container" style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
              <small style="color:#666; display:block; margin-bottom:5px;">گروه‌های ساخته شده:</small>
          </div>

          <div style="display:flex; gap:10px; margin-top:15px;">
              <button class="btn btn-blue" onclick="saveFinalGrouping()">💾 ذخیره نهایی همه گروه‌ها</button>
              <button class="btn btn-red" onclick="document.getElementById('manual-grouping-modal').style.display='none'">بستن</button>
          </div>
      </div>
  </div>

  <!-- MODAL: FREE ACTIVITY -->
  <div class="modal" id="free-activity-modal">
      <div class="modal-box">
          <h3 style="margin-top:0;">📝 ثبت فعالیت آزاد</h3>
          <p style="font-size:0.9rem; color:#666;">برای ثبت کارهایی که در طرح درس نبودند.</p>
          <label>تاریخ:</label><input type="text" id="fa-date" class="to-persian" style="text-align:center;">
          <label>عنوان فعالیت:</label><input type="text" id="fa-title" placeholder="مثلاً: فوتبال در حیاط">
          <label>توضیحات:</label><textarea id="fa-desc" placeholder="توضیحات مختصر..."></textarea>
          <button class="btn btn-green" onclick="saveFreeActivityLog()">💾 ذخیره در آرشیو</button>
          <button class="btn btn-red" onclick="document.getElementById('free-activity-modal').style.display='none'" style="margin-top:10px;">بستن</button>
      </div>
  </div>

  <!-- MODAL: REPORT CARD -->
  <div class="modal" id="report-modal">
      <div class="modal-box report-card-modal">
          <div class="report-header">
              <h2 style="margin:0;">کارنامه عملکرد</h2>
              <div id="report-date" style="font-size:0.9rem; opacity:0.9; margin-top:5px;"></div>
          </div>
          <div class="report-body" id="report-content"></div>
          <div class="report-actions">
              <button class="btn btn-blue" onclick="window.print()">🖨️ پرینت / ذخیره PDF</button>
              <button class="btn btn-red" onclick="document.getElementById('report-modal').style.display='none'">بستن</button>
          </div>
      </div>
  </div>


<script>
window.app = { run: new Proxy({}, {
  get(_target, prop) {
    if (prop === 'withSuccessHandler') return function(cb) { const runner = makeRunner(); runner._success = cb; return runner.proxy; };
    if (prop === 'withFailureHandler') return function(cb) { const runner = makeRunner(); runner._failure = cb; return runner.proxy; };
    return (...args) => callApi(prop, args, null, null);
  }
}) };
function makeRunner() {
  const state = { _success: null, _failure: null, proxy: null };
  state.proxy = new Proxy(state, { get(obj, prop) {
    if (prop === 'withSuccessHandler') return cb => { obj._success = cb; return obj.proxy; };
    if (prop === 'withFailureHandler') return cb => { obj._failure = cb; return obj.proxy; };
    return (...args) => callApi(prop, args, obj._success, obj._failure);
  }});
  return state;
}
function callApi(action, args, success, failure) {
  return fetch('api.php?action=' + encodeURIComponent(action), {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({args: args || []})
  }).then(async res => {
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { throw new Error(text || 'پاسخ نامعتبر از سرور'); }
    if (!res.ok || data.message) throw new Error(data.message || data.msg || 'خطای سرور');
    if (success) success(data);
    return data;
  }).catch(err => { if (failure) failure(err); else { console.error(err); if (window.showAlert) showAlert(err.message, 'error'); } });
}
</script>

<script>
  let DB={}, TEMP={}, chartInst=null, miChart=null, growthChart=null, classMIChart=null, currentStudent=null;
  const lazyLoads = {};
  const attendanceHistoryState = { offset: 0, limit: 80, done: false, loading: false };
  const PAGE_SIZE = { plans: 150, notes: 120 };
  const lazyOffsets = { plans: 0, notes: 0 };
  const lazyDone = { plans: false, notes: false };
  let timerInterval=null, timerSec=0;
  let confirmCallback = null;
  let promptCallback = null;
  let tempGroups = [];

  const verticalHoverLine = {
    id: 'verticalHoverLine',
    afterDraw(chart) {
      if (!chart.tooltip || !chart.tooltip.getActiveElements().length) return;
      const ctx = chart.ctx;
      const active = chart.tooltip.getActiveElements()[0];
      const x = active.element.x;
      const topY = chart.chartArea.top;
      const bottomY = chart.chartArea.bottom;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(79,70,229,0.45)';
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.restore();
    }
  };
  if (typeof Chart !== 'undefined') Chart.register(verticalHoverLine);


  // --- سیستم هوشمند اعلان و پیام ---
  function showToast(msg, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
      toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
  }

  function showAlert(msg, type = "info") {
      const iconMap = { 'info': 'fa-info-circle', 'error': 'fa-exclamation-triangle', 'success': 'fa-check-circle' };
      document.getElementById('confirm-icon').innerHTML = `<i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>`;
      document.getElementById('confirm-msg').innerText = msg;
      document.getElementById('confirm-no').style.display = 'none';
      document.getElementById('confirm-yes').innerText = 'متوجه شدم';
      document.getElementById('confirm-yes').className = 'btn btn-blue';
      const modal = document.getElementById('confirm-modal');
      modal.style.display = 'flex';
      confirmCallback = () => {
          document.getElementById('confirm-no').style.display = 'block';
          document.getElementById('confirm-yes').innerText = 'بله، تایید';
          document.getElementById('confirm-yes').className = 'btn btn-green';
      };
  }

  // --- سیستم مودال تایید ---
  function showConfirm(msg, callback) {
      document.getElementById('confirm-icon').innerHTML = `<i class="fas fa-question-circle"></i>`;
      document.getElementById('confirm-msg').innerText = msg;
      document.getElementById('confirm-no').style.display = 'block';
      document.getElementById('confirm-yes').innerText = 'بله، تایید';
      document.getElementById('confirm-yes').className = 'btn btn-green';
      const modal = document.getElementById('confirm-modal');
      modal.style.display = 'flex';
      confirmCallback = callback;
  }

  document.getElementById('confirm-yes').onclick = function() {
      document.getElementById('confirm-modal').style.display = 'none';
      if(confirmCallback) confirmCallback();
  };

  function closeConfirm() {
      document.getElementById('confirm-modal').style.display = 'none';
  }

  function showPrompt(msg, defaultValue, callback) {
      document.getElementById('prompt-msg').innerText = msg;
      const inp = document.getElementById('prompt-input');
      inp.value = toPersianNum(defaultValue || "");
      const modal = document.getElementById('prompt-modal');
      modal.style.display = 'flex';
      inp.focus();
      promptCallback = callback;
  }

  document.getElementById('prompt-yes').onclick = function() {
      const val = document.getElementById('prompt-input').value;
      document.getElementById('prompt-modal').style.display = 'none';
      if(promptCallback) promptCallback(val);
  };

  document.getElementById('prompt-no').onclick = function() {
      document.getElementById('prompt-modal').style.display = 'none';
      if(promptCallback) promptCallback(null);
  };

  // --- توابع کمکی برای دکمه‌ها ---
  function askDeletePlan(id, event) {
      if(event) event.stopPropagation();
      showConfirm('آیا مطمئن هستید که می‌خواهید این طرح درس را حذف کنید؟', function() {
          delPlan(id);
      });
  }

  function editPlanClick(id, event) {
      if(event) event.stopPropagation();
      editPlan(id);
  }

  function showLoading(){ document.getElementById('skeleton-screen').style.display='block'; }
  function hideLoading(){ document.getElementById('skeleton-screen').style.display='none'; }
  function toggleSidebar(){ document.querySelector('.sidebar').classList.toggle('open'); document.querySelector('.sidebar-overlay').classList.toggle('open'); }

  function nav(v){
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    document.getElementById('view-'+v).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    const btn = document.getElementById('bn-'+v);
    if(btn) btn.classList.add('active');

    if(document.querySelector('.sidebar.open')) toggleSidebar();

    const titles={'dash':'داشبورد','tools':'جعبه ابزار','profiles':'پروفایل‌ها','plans':'طرح درس','att':'حضور و غیاب','score':'امتیازدهی','notes':'یادداشت','settings':'تنظیمات', 'archive': 'آرشیو فعالیت‌ها', 'calendar':'تقویم جلسات', 'search':'جستجوی سراسری', 'single-profile': 'پروفایل متربی'};
    document.getElementById('page-title').innerText=titles[v] || 'مدیریت کلاس';
    renderView(v);
    if(v==='calendar') renderCalendar();
    window.scrollTo(0,0);
  }

  function switchTab(t){
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    document.getElementById('tab-'+t).classList.add('active');
  }

  function toPersianNum(n) {
      const f = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
      return String(n).replace(/[0-9]/g, w => f[+w]);
  }
  window.toPersianNum = toPersianNum;
  function toEnglishNum(n) {
      return String(n || '').replace(/[۰-۹]/g, c => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(c)]).replace(/[٠-٩]/g, c => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(c)]);
  }
  function persianizeInputValue(el) {
      if(!el || ['file','hidden','checkbox','radio','password'].includes(el.type)) return;
      const old = el.value;
      const val = toPersianNum(old);
      if(old !== val) {
        const pos = el.selectionStart;
        el.value = val;
        try { el.setSelectionRange(pos, pos); } catch(e) {}
      }
  }
  var jalaliWheelState = { input: null, year: 1405, month: 1, day: 1, modal: null };
  function initPersianInputs(){
    document.querySelectorAll('input, textarea').forEach(el => { persianizeInputValue(el); });
    if (!window.__persianInputBound) {
      document.addEventListener('input', e => { if(e.target && (e.target.matches('input') || e.target.matches('textarea'))) persianizeInputValue(e.target); });
      window.__persianInputBound = true;
    }
  }
  function pad2(num){ return String(num).padStart(2, '0'); }
  function isJalaliLeap(year){ return [1,5,9,13,17,22,26,30].indexOf(year % 33) !== -1; }
  function daysInJalaliMonth(year, month){ if(month <= 6) return 31; if(month <= 11) return 30; return isJalaliLeap(year) ? 30 : 29; }
  function gregorianToJalali(gy, gm, gd){
    var gdm=[31,28,31,30,31,30,31,31,30,31,30,31], jdm=[31,31,31,31,31,31,30,30,30,30,30,29];
    var gy2=gy-1600, gm2=gm-1, gd2=gd-1;
    var gdn=365*gy2+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400);
    for(var i=0;i<gm2;++i) gdn+=gdm[i];
    if(gm2>1 && ((gy%4===0 && gy%100!==0)||(gy%400===0))) gdn++;
    gdn+=gd2; var jdn=gdn-79, jnp=Math.floor(jdn/12053); jdn%=12053;
    var jy=979+33*jnp+4*Math.floor(jdn/1461); jdn%=1461;
    if(jdn>=366){ jy+=Math.floor((jdn-1)/365); jdn=(jdn-1)%365; }
    var jm; for(jm=0; jm<11 && jdn>=jdm[jm]; ++jm) jdn-=jdm[jm];
    return [jy, jm+1, jdn+1];
  }
  function readInputDate(input){
    var value = toEnglishNum(input.value || '').replace(/-/g, '/');
    var match = value.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if(match) return [parseInt(match[1],10), parseInt(match[2],10), parseInt(match[3],10)];
    var today = new Date(); return gregorianToJalali(today.getFullYear(), today.getMonth()+1, today.getDate());
  }
  function ensureJalaliWheel(){
    if(jalaliWheelState.modal) return jalaliWheelState.modal;
    var modal = document.createElement('div'); modal.className='jalali-wheel-modal'; modal.hidden=true;
    modal.innerHTML = '<div class="jalali-wheel-backdrop" data-jalali-close></div><div class="jalali-wheel-sheet" role="dialog" aria-modal="true" aria-label="انتخاب تاریخ شمسی"><button type="button" class="jalali-wheel-close" data-jalali-close aria-label="بستن">×</button><span class="jalali-wheel-kicker">تاریخ شمسی</span><strong class="jalali-wheel-preview" data-jalali-preview></strong><div class="jalali-wheel-grid"><div class="jalali-wheel-col"><button type="button" data-jalali-part="year" data-jalali-delta="1">+</button><div data-jalali-value="year"></div><button type="button" data-jalali-part="year" data-jalali-delta="-1">-</button><span>سال</span></div><div class="jalali-wheel-col"><button type="button" data-jalali-part="month" data-jalali-delta="1">+</button><div data-jalali-value="month"></div><button type="button" data-jalali-part="month" data-jalali-delta="-1">-</button><span>ماه</span></div><div class="jalali-wheel-col"><button type="button" data-jalali-part="day" data-jalali-delta="1">+</button><div data-jalali-value="day"></div><button type="button" data-jalali-part="day" data-jalali-delta="-1">-</button><span>روز</span></div></div><button type="button" class="btn btn-blue jalali-wheel-apply" data-jalali-apply>تایید تاریخ</button></div>';
    modal.addEventListener('click', function(event){
      var closeButton = event.target.closest('[data-jalali-close]');
      var applyButton = event.target.closest('[data-jalali-apply]');
      var spinButton = event.target.closest('[data-jalali-part]');
      if(closeButton){ closeJalaliWheel(); return; }
      if(applyButton && jalaliWheelState.input){
        jalaliWheelState.input.value = toPersianNum(jalaliWheelState.year + '/' + pad2(jalaliWheelState.month) + '/' + pad2(jalaliWheelState.day));
        jalaliWheelState.input.dispatchEvent(new Event('input', {bubbles:true}));
        jalaliWheelState.input.dispatchEvent(new Event('change', {bubbles:true}));
        closeJalaliWheel(); return;
      }
      if(spinButton){
        var part=spinButton.getAttribute('data-jalali-part'); var delta=parseInt(spinButton.getAttribute('data-jalali-delta')||'0',10);
        if(part==='year') jalaliWheelState.year=Math.max(1300,Math.min(1500,jalaliWheelState.year+delta));
        else if(part==='month'){ jalaliWheelState.month+=delta; if(jalaliWheelState.month>12){jalaliWheelState.month=1; jalaliWheelState.year=Math.min(1500,jalaliWheelState.year+1);} else if(jalaliWheelState.month<1){jalaliWheelState.month=12; jalaliWheelState.year=Math.max(1300,jalaliWheelState.year-1);} }
        else if(part==='day'){ jalaliWheelState.day+=delta; if(jalaliWheelState.day>daysInJalaliMonth(jalaliWheelState.year,jalaliWheelState.month)) jalaliWheelState.day=1; else if(jalaliWheelState.day<1) jalaliWheelState.day=daysInJalaliMonth(jalaliWheelState.year,jalaliWheelState.month); }
        renderJalaliWheel();
      }
    });
    document.body.appendChild(modal); jalaliWheelState.modal=modal; return modal;
  }
  function renderJalaliWheel(){
    var modal=ensureJalaliWheel(); jalaliWheelState.day=Math.min(jalaliWheelState.day, daysInJalaliMonth(jalaliWheelState.year, jalaliWheelState.month));
    modal.querySelector('[data-jalali-value="year"]').textContent=toPersianNum(jalaliWheelState.year);
    modal.querySelector('[data-jalali-value="month"]').textContent=toPersianNum(pad2(jalaliWheelState.month));
    modal.querySelector('[data-jalali-value="day"]').textContent=toPersianNum(pad2(jalaliWheelState.day));
    modal.querySelector('[data-jalali-preview]').textContent=toPersianNum(jalaliWheelState.year + '/' + pad2(jalaliWheelState.month) + '/' + pad2(jalaliWheelState.day));
  }
  function openDatePickerFor(input){
    var parts=readInputDate(input); jalaliWheelState.input=input; jalaliWheelState.year=Math.max(1300,Math.min(1500,parts[0])); jalaliWheelState.month=Math.max(1,Math.min(12,parts[1])); jalaliWheelState.day=Math.max(1,Math.min(31,parts[2]));
    var modal=ensureJalaliWheel(); renderJalaliWheel(); modal.hidden=false; requestAnimationFrame(function(){ modal.classList.add('is-visible'); });
  }
  function closeJalaliWheel(){ var modal=ensureJalaliWheel(); modal.classList.remove('is-visible'); setTimeout(function(){ modal.hidden=true; }, 220); }
  function attachDatePickers(){
    document.querySelectorAll('.to-persian').forEach(input => {
      input.setAttribute('readonly','readonly'); input.setAttribute('autocomplete','off'); input.style.cursor='pointer';
      input.onclick = () => openDatePickerFor(input);
      input.onkeydown = (event) => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDatePickerFor(input); } };
    });
  }

  function openLightbox(src){
    if(!src || src.includes('default-avatar.svg')) return;
    document.getElementById('lightbox-img').src = src.replace("=s400", "=s2000");
    document.getElementById('lightbox').style.display = 'flex';
  }

  function autoGrow(el) { el.style.height='auto'; el.style.height=(el.scrollHeight)+'px'; }

  window.addEventListener('load', () => {
    try {
      const t=new Date().toLocaleDateString('fa-IR');
      document.querySelectorAll('.to-persian').forEach(i=>i.value=toPersianNum(t));
      initPersianInputs();
      attachDatePickers();

      // Keyboard accessibility for non-native buttons
      document.querySelectorAll('.menu-item, .nav-item, .tool-btn, .menu-btn, .tab').forEach(el => {
        if (!el.getAttribute('role')) el.setAttribute('role', 'button');
        if (el.tabIndex < 0) el.tabIndex = 0;
      });

      if (!window.__keyboardBound) {
        document.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute('role') === 'button') {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
              e.preventDefault();
              e.target.click();
            }
          }
        });
        window.__keyboardBound = true;
      }
      if(document.getElementById('header-date')) document.getElementById('header-date').innerText = t;
      try { localStorage.removeItem('charshanbeAppData'); } catch(e) {}
      fetchData();
    } catch(e) { console.error(e); }
  });

  function activeViewName(){
    const active = document.querySelector('.view.active');
    return active && active.id ? active.id.replace('view-','') : 'dash';
  }
  function loadLazyData(key, action, apply, done){
    if (DB[key]) { if(done) done(); return; }
    if (lazyLoads[key]) return;
    lazyLoads[key] = true;
    const target = key === 'plans' ? 'plans-list' : (key === 'notes' ? 'notes-history' : 'archive-list');
    const box = document.getElementById(target);
    if (box) box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">در حال دریافت اطلاعات...</p>';
    app.run.withSuccessHandler(r=>{
      lazyLoads[key] = false;
      apply(r || {});
      if(done) done();
    }).withFailureHandler(e=>{
      lazyLoads[key] = false;
      if (box) box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">دریافت اطلاعات انجام نشد.</p>';
      showAlert('خطا در دریافت اطلاعات: ' + e.message, 'error');
    })[action]();
  }
  function ensurePlansData(done){
    if (DB.plans) { if(done) done(); return; }
    loadPlansPage(false, done);
  }
  function ensureNotesData(done){
    if (DB.notes) { if(done) done(); return; }
    loadNotesPage(false, done);
  }
  function loadPlansPage(append = true, done){
    if (lazyLoads.plans || (append && lazyDone.plans)) return;
    lazyLoads.plans = true;
    const offset = append ? lazyOffsets.plans : 0;
    const box = document.getElementById('plans-list');
    if (!append && box) box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">در حال دریافت طرح درس‌ها...</p>';
    app.run.withSuccessHandler(r=>{
      lazyLoads.plans = false;
      const rows = r.plans || [];
      DB.plans = append && DB.plans ? DB.plans.concat(rows) : rows;
      lazyOffsets.plans = offset + rows.length;
      lazyDone.plans = rows.length < PAGE_SIZE.plans;
      renderPlans();
      if(done) done();
    }).withFailureHandler(e=>{ lazyLoads.plans = false; showAlert('خطا در دریافت طرح درس‌ها: ' + e.message, 'error'); }).getPlansData(PAGE_SIZE.plans, offset);
  }
  function loadNotesPage(append = true, done){
    if (lazyLoads.notes || (append && lazyDone.notes)) return;
    lazyLoads.notes = true;
    const offset = append ? lazyOffsets.notes : 0;
    const box = document.getElementById('notes-history');
    if (!append && box) box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">در حال دریافت یادداشت‌ها...</p>';
    app.run.withSuccessHandler(r=>{
      lazyLoads.notes = false;
      const rows = r.notes || [];
      DB.notes = append && DB.notes ? DB.notes.concat(rows) : rows;
      lazyOffsets.notes = offset + rows.length;
      lazyDone.notes = rows.length < PAGE_SIZE.notes;
      renderNotes();
      if(done) done();
    }).withFailureHandler(e=>{ lazyLoads.notes = false; showAlert('خطا در دریافت یادداشت‌ها: ' + e.message, 'error'); }).getNotesData(PAGE_SIZE.notes, offset);
  }
  function ensureArchiveData(done){ loadArchiveData(currentArchiveType || 'grouping', '', done); }
  function loadArchiveData(type, query, done){
    currentArchiveType = type || currentArchiveType || 'grouping';
    const list = document.getElementById('archive-list');
    if (list) list.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">در حال دریافت آرشیو...</p>';
    app.run.withSuccessHandler(r=>{
      DB.moduleHistory = r.moduleHistory || [];
      if(done) done(); else renderArchive(currentArchiveType);
    }).withFailureHandler(e=>{
      if (list) list.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">دریافت آرشیو انجام نشد.</p>';
      showAlert('خطا در دریافت آرشیو: ' + e.message, 'error');
    }).getArchiveData(currentArchiveType, query || '', 180);
  }

  function renderView(v){
      if(!DB || !DB.students) return;
      // Re-apply accessibility traits for dynamically rendered views
      document.querySelectorAll('.menu-item, .nav-item, .tool-btn, .menu-btn, .tab').forEach(el => {
        if (!el.getAttribute('role')) el.setAttribute('role', 'button');
        if (el.tabIndex < 0) el.tabIndex = 0;
      });
      try {
        if(v === 'dash') { renderDash(); renderAlerts(); }
        else if(v === 'profiles') renderProfiles();
        else if(v === 'att') { renderAtt(); loadAttendanceHistory(false); }
        else if(v === 'plans') ensurePlansData(renderPlans);
        else if(v === 'notes') ensureNotesData(renderNotes);
        else if(v === 'settings') renderSettings();
        else if(v === 'score') renderScoreList();
        else if(v === 'archive') ensureArchiveData(() => renderArchive(currentArchiveType || 'grouping'));
      } catch(e) { console.error(e); }
  }

  function renderAll(){
      ['dash','profiles','att','settings','score'].forEach(renderView);
  }

  function fetchData(){
    showLoading();
    app.run.withSuccessHandler(d=>{
      DB=d;
      renderView(activeViewName());
      if(activeViewName() !== 'dash') renderView('dash');
      hideLoading();
      const later = window.requestIdleCallback || (fn => setTimeout(fn, 120));
      later(() => {
        if (activeViewName() === 'dash') app.run.withSuccessHandler(mi=>{ renderClassMI(mi); }).getClassMIData();
      });
    }).withFailureHandler(e => {
        hideLoading();
        showAlert('خطا در دریافت اطلاعات از سرور محلی.\n' + e.message, 'error');
    }).getInitialData();
  }

  function renderDash(){
    if(!DB.students) return;
    document.getElementById('top-student').innerText = DB.topStudent;
    const dashCount = document.getElementById('dash-count'); if (dashCount) dashCount.innerText = toPersianNum((DB.students || []).length);
    const dashSessionCount = document.getElementById('dash-session-count'); if (dashSessionCount) dashSessionCount.innerText = toPersianNum(DB.sessionCount ?? (DB.trend.labels || []).length);
    const dashAlertCount = document.getElementById('dash-alert-count'); if (dashAlertCount) dashAlertCount.innerText = toPersianNum(getVisibleAlerts().length);
    const mainChartBox = document.getElementById('mainChartBox');
    if (mainChartBox) { const chartWidth = Math.max(320, (DB.trend.labels || []).length * 56); mainChartBox.style.width = chartWidth + 'px'; mainChartBox.style.minWidth = '100%'; }
    if(typeof Chart !== 'undefined') {
        if(chartInst) chartInst.destroy();
        chartInst = new Chart(document.getElementById('mainChart'), {
          type:'line',
          data:{labels:DB.trend.labels, datasets:[{label:'شاخص حضور هوشمند %', data:DB.trend.data, borderColor:'#0f766e', tension:0.35, fill:true, backgroundColor:'rgba(15,118,110,0.10)'}]},
          options:{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins:{
              legend:{display:false},
              verticalHoverLine: {},
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    let d = (DB.trend.details && DB.trend.details[ctx.dataIndex]) || {};
                    let b = d.lateBuckets || {};
                    let lateBreakdown = `تاخیرها: ۰-۵د ${b['0_5'] || 0} | ۶-۱۰د ${b['6_10'] || 0} | ۱۱-۱۵د ${b['11_15'] || 0} | ۱۶+د ${(b['16_20'] || 0) + (b['21_30'] || 0) + (b['31_plus'] || 0)}`;
                    return [`شاخص هوشمند: ${ctx.raw}%`, `حاضر کامل: ${d.p || 0} نفر`, `تاخیر: ${d.l || 0} نفر / ${d.lateMinutes || 0} دقیقه`, lateBreakdown, `غیبت: ${d.a || 0} | موجه: ${d.e || 0}`, `درصد خام حضور: ${d.rawPresentPercent ?? ctx.raw}%`];
                  }
                }
              }
            },
            scales:{y:{beginAtZero:true, max:100}}
          }
        });
    }
    let h = "";
    DB.students.forEach(s=>{
      h += `<div class="dash-item" onclick="openProfile('${s.name}')">
        <div style="display:flex; align-items:center; gap:12px;"><img src="${s.image}" class="avatar-sm" onerror="this.src='assets/default-avatar.svg'"><b>${s.name} ${s.fire?'<span class="fire-mark" title="۸ جلسه آخر بدون غیبت موجه یا غیرموجه" aria-label="۸ جلسه آخر بدون غیبت موجه یا غیرموجه">🔥</span>':''}</b></div>
        <span class="score-badge">${toPersianNum(s.score)}</span>
      </div>`;
    });
    document.getElementById('dash-list').innerHTML = h;
  }

  function renderProfiles(){
    let h="";
    if (DB.students && DB.students.length > 0) {
      DB.students.forEach(s=> h+=`<div class="dash-item profile-list-item" onclick="openProfile('${s.name}')"><div style="display:flex; align-items:center; gap:12px; min-width:0;"><img src="${s.image}" class="avatar-sm" onerror="this.src='assets/default-avatar.svg'"><span style="font-weight:950; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</span></div><span class="score-badge">${toPersianNum(s.score || 0)}</span></div>`);
    } else {
      h = "<p style='text-align:center;color:#888;'>هنوز متربی ثبت نشده است.</p>";
    }
    document.getElementById('profiles-list').innerHTML=h;
  }

  function renderAtt(){
    let h = "";
    if (DB.students) {
      DB.students.forEach(s=>{
        if(!TEMP[s.name]) TEMP[s.name]={s:'Present', m:0};
        let st = TEMP[s.name].s;
        let bg = st=='Present'?'#dcfce7':(st=='Absent'?'#fee2e2':(st=='Late'?'#fef3c7':'#e0f2fe'));
        h += `<div class="dash-item" style="cursor:default;">
          <div style="display:flex; align-items:center; gap:12px;"><img src="${s.image}" class="avatar-sm" onerror="this.src='assets/default-avatar.svg'"><b>${s.name}</b></div>
          <select style="width:110px; background:${bg}; margin:0; font-weight:bold; border-radius:10px;" onchange="chSt('${s.name}', this)">
            <option value="Present" ${st=='Present'?'selected':''}>حاضر</option>
            <option value="Absent" ${st=='Absent'?'selected':''}>غیبت</option>
            <option value="Late" ${st=='Late'?'selected':''}>تاخیر</option>
            <option value="Excused" ${st=='Excused'?'selected':''}>موجه</option>
          </select>
        </div>`;
      });
    }
    document.getElementById('att-list').innerHTML = h;
  }

  function renderPlans(){
    let h = "";
    if (DB.plans && DB.plans.length > 0) {
      DB.plans.forEach(p=>{
        let mods = []; try { mods = JSON.parse(p.modules||"[]"); } catch(e) {}
        let mHtml = p.sin?`<div style="white-space:pre-wrap; background:#f1f5f9; padding:12px; border-radius:12px; font-size:0.9rem; margin-bottom:15px; line-height:1.6; border-right:5px solid #cbd5e1;">${p.sin}</div>`:"";
        let mainType = "other";
        mods.forEach(m=>{
          let its = ""; (m.items||[]).forEach(it=>{ its+=`<span class="mat-chip ${it.type}">${it.type=='buy'?'🛒':'✅'} ${it.name}</span>`; });
          if (m.type === 'game') mainType = 'game';
          else if (m.type === 'story') mainType = 'story';
          else if (m.type === 'yade_hazrat') mainType = 'hazrat';
          let typeName = m.type === 'yade_hazrat' ? 'یاد حضرت' : (m.type === 'game' ? 'بازی' : (m.type === 'story' ? 'داستان' : (m.type === 'trip' ? 'اردو' : 'سایر')));
          mHtml += `<div style="margin-top:12px; border-right:4px solid var(--primary); padding-right:12px;"><b>${typeName}:</b> ${m.name}<br><div style="display:flex; flex-wrap:wrap; margin-top:5px;">${its}</div></div>`;
        });
        const files = p.files || [];
        const filesHtml = `<div style="margin-top:16px; padding-top:12px; border-top:1px dashed var(--border);"><b>📎 فایل‌های طرح درس:</b><div style="margin-top:8px;">${files.length ? files.map(f=>`<a class="file-chip" href="${f.path}" target="_blank">📄 ${f.name}</a><button onclick="deletePlanFile(${f.id}, event)" style="border:0;background:transparent;color:#d64045;cursor:pointer;">×</button>`).join('') : '<small style="opacity:.65;">فایلی ثبت نشده است.</small>'}</div><div style="display:flex; gap:8px; margin-top:10px;"><input type="file" id="plan-file-${p.id}" multiple style="margin:0;"><button class="btn btn-outline" style="width:auto; padding:10px 14px;" onclick="uploadPlanFile('${p.id}', event)">آپلود فایل‌ها</button></div></div>`;
        mHtml += filesHtml;
        h += `<div class="plan-card ${mainType}" id="plan-${p.id}"><div class="plan-header" onclick="this.parentElement.classList.toggle('open')"><div><b>${p.title}</b><br><small style="opacity:0.7;">📅 جلسه: ${toPersianNum(p.date)}</small></div><span style="font-size:.85rem; opacity:.75;">باز کردن</span></div><div class="plan-body">${mHtml}<div style="margin-top:20px; display:flex; gap:15px; border-top:1px solid var(--border); padding-top:12px;"><button onclick="editPlanClick('${p.id}', event)" style="color:var(--primary); background:none; border:none; cursor:pointer; font-weight:bold; font-size:16px; padding:10px;"><i class="fas fa-edit"></i> ویرایش</button><button onclick="askDeletePlan('${p.id}', event)" style="color:#ef4444; background:none; border:none; cursor:pointer; font-weight:bold; font-size:16px; padding:10px;"><i class="fas fa-trash"></i> حذف</button></div></div></div>`;
      });
    } else {
        h = "<p style='text-align:center; color:#888; padding:20px;'>هنوز طرح درسی ثبت نشده است.</p>";
    }
    if (DB.plans && DB.plans.length > 0 && !lazyDone.plans) h += `<button class="btn btn-outline" style="margin:8px auto 18px; max-width:260px;" onclick="loadPlansPage(true)">نمایش بیشتر طرح درس‌ها</button>`;
    document.getElementById('plans-list').innerHTML = h;
  }

  function renderNotes(){
    let h="";
    if(DB.notes) DB.notes.forEach(n=> h+=`<div class="note-item"><div class="note-head" onclick="this.parentElement.classList.toggle('open')"><span>📅 ${toPersianNum(n.date)}</span><span>🔽</span></div><div class="note-body">${n.text}</div></div>`);
    if(DB.notes && DB.notes.length > 0 && !lazyDone.notes) h += `<button class="btn btn-outline" style="margin:8px auto 18px; max-width:260px;" onclick="loadNotesPage(true)">نمایش بیشتر یادداشت‌ها</button>`;
    document.getElementById('notes-history').innerHTML=h;
  }
  function renderScoreList(){ let h=""; if(DB.students) DB.students.forEach(s=> h+=`<div class="dash-item" onclick="manualScore('${s.name}')"><span>${s.name}</span><span class="score-badge">دستی: ${toPersianNum(s.manualScore)}</span></div>`); document.getElementById('score-list').innerHTML=h; }
  function renderSettings(){ if(DB.settings){ document.getElementById('st-token').value=DB.settings.BOT_TOKEN||''; document.getElementById('st-admin').value=DB.settings.ADMIN_CHAT_IDS||''; document.getElementById('st-tg-score').checked=(DB.settings.TG_NOTIFY_SCORE||'1')==='1'; document.getElementById('st-tg-att').checked=(DB.settings.TG_NOTIFY_ATTENDANCE||'0')==='1'; document.getElementById('st-tg-buy').checked=(DB.settings.TG_NOTIFY_PURCHASE||'1')==='1'; } }

  function renderClassMI(mi) {
    if(!mi.labels || mi.labels.length === 0) return;
    document.getElementById('class-mi-section').style.display = 'block';
    if(classMIChart) classMIChart.destroy();
    classMIChart = new Chart(document.getElementById('classMIChart'), {
      type: 'bar',
      data: { labels: mi.labels, datasets: [{ label: 'میانگین کلاس', data: mi.averages, backgroundColor: 'rgba(129, 140, 248, 0.8)', borderRadius: 8, borderWidth: 1, borderColor: '#4f46e5' }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { display: false } }, y: { ticks: { font: { size: 10 } } } } }
    });
  }

  function openProfile(n){
    showLoading(); currentStudent = n;
    app.run.withSuccessHandler(d=>{
      hideLoading();
      if(!d.success) return showAlert(d.msg, 'error');
      const i = d.info;
      document.getElementById('sp-img').src=i.displayImage || 'assets/default-avatar.svg';
      document.getElementById('sp-name').innerText = i.name || "";
      document.getElementById('sp-score').innerText=toPersianNum(i.score)+" امتیاز";
      document.getElementById('sp-input-img').value=i.image;
      document.getElementById('sp-bio').value=i.bio || "";
      document.getElementById('sp-parent-note').value=i.parentNote || "";
      const cont = document.getElementById('phones-container'); cont.innerHTML = "";
      let ps = []; try { ps = JSON.parse(i.phone || "[]"); } catch(e) { if(i.phone) ps.push({label:"تلفن", number:i.phone}); }
      if(ps.length === 0) addPhoneField(); else ps.forEach(p => addPhoneField(p.label, p.number));
      document.getElementById('sp-dob').value=i.dob || "";
      document.getElementById('sp-school').value=i.school || "";
      document.getElementById('sp-medical').value=i.medical || "";
      document.querySelectorAll('#view-single-profile input, #view-single-profile textarea').forEach(persianizeInputValue);
      renderMIChart(d.mi.chart); renderMIAccordion(d.mi.config, n, d.mi.traitStates); renderFullHistory(d.fullHistory); renderGrowthChart(d.stats.growth); renderSummaryStats(d.stats.stats);
      nav('single-profile');
    }).withFailureHandler(e => { hideLoading(); showAlert("خطا در بارگذاری پروفایل: " + e.message, 'error'); }).getFullStudentProfile(n);
  }

  function addPhoneField(l="", n="") {
    const div = document.createElement('div'); div.className="phone-item"; div.style.display="flex"; div.style.gap="10px"; div.style.marginBottom="10px";
    div.innerHTML = `<input type="text" placeholder="عنوان" value="${l}" style="flex:1; margin:0;"><input type="text" placeholder="شماره" value="${n}" style="flex:1.5; margin:0;"><button class="btn btn-red" style="width:40px; padding:0; border-radius:12px;" onclick="this.parentElement.remove()">✕</button>`;
    document.getElementById('phones-container').appendChild(div); div.querySelectorAll('input').forEach(persianizeInputValue);
  }

  function chSt(n, e){
    let v=e.value;
    if(v=='Late'){
      showPrompt("چند دقیقه تاخیر؟", "15", (m) => {
        if(!m){ e.value='Present'; v='Present'; }
        TEMP[n]={s:v, m:m||0};
        e.style.backgroundColor=v=='Present'?'#dcfce7':(v=='Absent'?'#fee2e2':(v=='Late'?'#fef3c7':'#e0f2fe'));
      });
    } else {
      TEMP[n]={s:v, m:0};
      e.style.backgroundColor=v=='Present'?'#dcfce7':(v=='Absent'?'#fee2e2':(v=='Late'?'#fef3c7':'#e0f2fe'));
    }
  }

  function manualScore(n){
    showPrompt(`امتیاز برای ${n}:`, "1", (p) => {
      if(p) app.run.withSuccessHandler(fetchData).addManualScore(n,p);
    });
  }

  function markAllPresent(){ (DB.students||[]).forEach(s=>TEMP[s.name]={s:'Present',m:0}); renderAtt(); }
  function submitData(){ if(!DB.students || DB.students.length===0) return showAlert("دانش‌آموزی ثبت نشده است."); showLoading(); const recs=DB.students.map(s=>({name:s.name, status:TEMP[s.name].s, min:TEMP[s.name].m})); app.run.withSuccessHandler(r=>{ attendanceHistoryState.offset=0; attendanceHistoryState.done=false; hideLoading(); showToast(r.msg); fetchData(); }).submitAttendance({date:document.getElementById('att-date').value, records:recs}); }
  function saveNote(){ const d=document.getElementById('note-date').value; const t=document.getElementById('note-text').value; if(!t)return; showLoading(); app.run.withSuccessHandler(r=>{DB.notes=null; lazyOffsets.notes=0; lazyDone.notes=false; showToast(r.msg); document.getElementById('note-text').value=""; fetchData();}).saveNote(d,t); }
  function filterNotes(t){ document.querySelectorAll('.note-item').forEach(i=> i.style.display=i.innerText.includes(t)?'block':'none'); }
  function filterAtt(t){ document.querySelectorAll('#att-list .dash-item').forEach(i=> i.style.display=i.innerText.includes(t)?'flex':'none'); }
  function saveSettings(){ const d={ BOT_TOKEN: document.getElementById('st-token').value, ADMIN_CHAT_IDS: document.getElementById('st-admin').value, TG_NOTIFY_SCORE: document.getElementById('st-tg-score').checked?'1':'0', TG_NOTIFY_ATTENDANCE: document.getElementById('st-tg-att').checked?'1':'0', TG_NOTIFY_PURCHASE: document.getElementById('st-tg-buy').checked?'1':'0' }; showLoading(); app.run.withSuccessHandler(r=>{hideLoading(); showToast(r.msg); fetchData();}).saveSystemSettings(d); }
  function testTelegram(){ showLoading(); app.run.withSuccessHandler(r=>{ hideLoading(); showToast(r.msg); }).testTelegramConnection(); }
  function setupWebhook(){ showLoading(); app.run.withSuccessHandler(r=>{ hideLoading(); showToast(r); }).setupTelegramWebhook(); }
  function addItemToMod(btn, id, ty){ let inp = btn.parentElement.querySelector('input'); let val = inp.value.trim(); if(!val) return; let ic = ty=='buy'?'🛒':'✅'; document.getElementById('tags-'+id).insertAdjacentHTML('beforeend', `<span class="mat-chip ${ty}" data-type="${ty}"><span>${ic} ${val}</span><span style="cursor:pointer; margin-right:6px;" onclick="this.parentElement.remove()">×</span></span>`); inp.value=""; }
  function delPlan(id){ app.run.withSuccessHandler(()=>{ DB.plans=null; lazyOffsets.plans=0; lazyDone.plans=false; DB.moduleHistory=null; fetchData(); }).deletePlan(id); }
  function uploadProfileImage(){
    const fileInput = document.getElementById('sp-image-file');
    if(!currentStudent) return showAlert('اول یک متربی را باز کنید.', 'error');
    if(!fileInput.files || !fileInput.files[0]) return showAlert('لطفا یک عکس انتخاب کنید.');
    const form = new FormData();
    form.append('studentName', currentStudent);
    form.append('image', fileInput.files[0]);
    showLoading();
    fetch('api.php?action=uploadStudentImage', {method:'POST', body: form})
      .then(async res => {
        const text = await res.text();
        let data; try { data = JSON.parse(text); } catch(e) { throw new Error(text || 'پاسخ نامعتبر از سرور'); }
        if(!res.ok || !data.success) throw new Error(data.msg || data.message || 'آپلود انجام نشد');
        return data;
      })
      .then(data => {
        hideLoading();
        document.getElementById('sp-input-img').value = data.path;
        document.getElementById('sp-img').src = data.displayImage || data.path;
        fileInput.value = '';
        showToast(data.msg || 'عکس آپلود شد');
        fetchData();
      })
      .catch(err => { hideLoading(); showAlert(err.message, 'error'); });
  }

  function askDeleteStudent() {
    if(!currentStudent) return;
    showConfirm(`آیا از حذف کامل "${currentStudent}" اطمینان دارید؟\nاین عمل غیرقابل بازگشت است و تمامی سوابق حضور، امتیازات و یادداشت‌های مربوطه برای همیشه پاک خواهد شد.`, () => {
      showLoading();
      app.run.withSuccessHandler(r => {
        hideLoading();
        showToast(r.msg);
        nav('profiles');
        fetchData();
      }).withFailureHandler(e => {
        hideLoading();
        showAlert(e.message, 'error');
      }).deleteStudent(currentStudent);
    });
  }

  function saveProfile(){
    let ps = []; document.querySelectorAll('.phone-item').forEach(p => { let inps = p.querySelectorAll('input'); if(inps[1].value) ps.push({label: inps[0].value, number: inps[1].value}); });
    showLoading(); const d={originalName:currentStudent, image:document.getElementById('sp-input-img').value, bio:document.getElementById('sp-bio').value, parentNote:document.getElementById('sp-parent-note').value, phone:JSON.stringify(ps), dob:document.getElementById('sp-dob').value, school:document.getElementById('sp-school').value, medical:document.getElementById('sp-medical').value}; app.run.withSuccessHandler(r=>{ hideLoading(); showToast(r.msg); fetchData(); }).updateStudentProfile(d);
  }
  function addStudent(){ let n=document.getElementById('new-name').value; if(n) app.run.withSuccessHandler(fetchData).addStudent(n); }
  function toggleDark(){
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('charshanbeDarkMode', isDark ? '1' : '0');
    toggleSidebar();
  }
  function openPlanModal(){ document.getElementById('p-id').value=""; document.getElementById('modules-container').innerHTML=""; document.getElementById('plan-modal').style.display='flex'; }

  function editPlan(id){
    const p = DB.plans.find(x => x.id == id);
    if(!p) return showAlert("خطا: طرح درس پیدا نشد.", 'error');
    document.getElementById('p-id').value=p.id;
    document.getElementById('p-date').value=toPersianNum(p.date);
    document.getElementById('p-title').value=p.title;
    document.getElementById('p-sin').value=p.sin||"";
    document.getElementById('modules-container').innerHTML="";
    let ms = []; try { ms = JSON.parse(p.modules||"[]"); } catch(e) {}
    ms.forEach(m=> {
      let type = m.type;
      if(type === 'بازی') type = 'game'; else if(type === 'داستان') type = 'story'; else if(type === 'اردو') type = 'trip'; else if(type === 'یاد حضرت') type = 'yade_hazrat'; else type = 'other';
      addModule(type, m.name, m.items||[], m.desc);
    });
    document.getElementById('plan-modal').style.display='flex';
  }

  function addModule(type, name="", items=[], desc=""){
    const c = document.getElementById('modules-container');
    const d = document.createElement('div'); d.className="mod-box-full"; d.style.border="1px solid var(--border)"; d.style.padding="15px"; d.style.borderRadius="15px"; d.style.margin="10px 0"; d.style.background="var(--bg)";
    let faMap = {'game':'بازی','story':'داستان','trip':'اردو','other':'سایر', 'yade_hazrat': 'یاد حضرت'};
    let label = faMap[type] || 'سایر'; let id = Date.now()+Math.random();
    d.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:10px;"><small style="color:var(--primary); font-weight:bold;">بخش ${label}</small><span style="cursor:pointer; color:#ef4444; font-size:1.2rem;" onclick="this.parentElement.parentElement.remove()">✕</span></div>
      <input type="hidden" class="m-type" value="${type}">
      <input class="m-name" placeholder="عنوان این ماژول" value="${name}">
      <div style="display:flex; gap:8px;"><input class="m-new-mat" placeholder="نام وسیله لازم..." style="margin:0;"><button class="btn btn-green" style="width:45px; padding:0;" onclick="addItemToMod(this,'${id}','have')">✅</button><button class="btn btn-red" style="width:45px; padding:0;" onclick="addItemToMod(this,'${id}','buy')">🛒</button></div>
      <div class="m-tags-container" id="tags-${id}" style="display:flex; flex-wrap:wrap; margin-top:8px;">${items.map(it=>`<span class="mat-chip ${it.type}" data-type="${it.type}"><span>${it.type=='buy'?'🛒':'✅'} ${it.name}</span><span style="cursor:pointer; margin-right:6px;" onclick="this.parentElement.remove()">×</span></span>`).join('')}</div>
      <textarea class="m-desc" placeholder="توضیحات و نکات تکمیلی این بخش..." oninput="autoGrow(this)" style="margin-top:10px;">${desc}</textarea>`;
    c.appendChild(d);
  }

  function savePlan() {
    const idVal=document.getElementById('p-id').value; const dVal=document.getElementById('p-date').value; const tVal=document.getElementById('p-title').value; const sVal=document.getElementById('p-sin').value;
    if(!tVal) return showAlert("عنوان طرح درس اجباری است.");
    let mods = [];
    document.querySelectorAll('#modules-container > .mod-box-full').forEach(el=>{
      let its = []; el.querySelectorAll('.mat-chip').forEach(c=> its.push({name: c.querySelector('span').innerText.substring(2).trim(), type: c.classList.contains('buy') ? 'buy' : 'have'}));
      mods.push({type: el.querySelector('.m-type').value, name: el.querySelector('.m-name').value, desc: el.querySelector('.m-desc').value, items: its});
    });
    showLoading(); app.run.withSuccessHandler(r=>{ DB.plans=null; lazyOffsets.plans=0; lazyDone.plans=false; DB.moduleHistory=null; showToast(r.msg); document.getElementById('plan-modal').style.display='none'; fetchData(); }).savePlan(idVal,dVal,tVal,sVal,JSON.stringify(mods));
  }

  function renderMIChart(d){
    if(typeof Chart === 'undefined') return;
    const ctx = document.getElementById('sp-mi-chart');
    if(miChart) miChart.destroy();
    miChart = new Chart(ctx, {
      type:'bar',
      data:{labels:d.labels, datasets:[{label:'امتیاز هوش', data:d.data, backgroundColor:'#4f46e5', borderRadius: 5}]},
      options:{ indexAxis: 'y', maintainAspectRatio: false, responsive: true, plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{display:false}}, y:{ticks:{autoSkip:false, font:{size:11}}} } }
    });
  }

  function renderMIAccordion(conf, name, traitStates){
    let h="";
    conf.forEach(c=>{
      let traitHtml = "";
      const allTraits = (c.pos || []).concat(c.neg || []);
      allTraits.forEach(t => {
        if(!t) return;
        let currentState = traitStates[c.type + "_" + t] || 0;
        let traitTitle = t; let traitDesc = "";
        if(t.includes(" (")) { const parts = t.split(" ("); traitTitle = parts[0]; traitDesc = parts[1].replace(")", ""); }
        traitHtml += `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border);"><div style="flex:1; padding-left:10px;"><div style="font-size:0.95rem; font-weight:600;">${traitTitle}</div>${traitDesc ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${traitDesc}</div>` : ""}</div><div style="display:flex; gap:10px;"><button class="btn ${currentState === 1 ? 'btn-green' : 'btn-outline'}" style="width:42px; height:42px; padding:0; border-radius:12px; border-color:#10b981; color:${currentState === 1 ? 'white' : '#10b981'}; background:${currentState === 1 ? '#10b981' : 'transparent'}" onclick="logMI('${name}','${c.type}','${t}', ${currentState === 1 ? 0 : 1})"><i class="fas fa-check"></i></button><button class="btn ${currentState === -1 ? 'btn-red' : 'btn-outline'}" style="width:42px; height:42px; padding:0; border-radius:12px; border-color:#ef4444; color:${currentState === -1 ? 'white' : '#ef4444'}; background:${currentState === -1 ? '#ef4444' : 'transparent'}" onclick="logMI('${name}','${c.type}','${t}', ${currentState === -1 ? 0 : -1})"><i class="fas fa-times"></i></button></div></div>`;
      });
      h += `<div class="card" style="padding:15px; margin-bottom:12px; border:1px solid var(--border);"><div style="font-weight:bold; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-size:1.1rem;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display=='block'?'none':'block'"><span>${c.type}</span> <i class="fas fa-chevron-down" style="font-size:0.9rem; opacity:0.5;"></i></div><div style="display:none; padding-top:15px;"><div style="background:#f1f5f9; padding:12px; border-radius:12px; font-size:0.85rem; color:#475569; margin-bottom:15px; line-height:1.6; border-right:4px solid var(--primary);">${c.desc}</div>${traitHtml}</div></div>`;
    });
    document.getElementById('sp-mi-accordion').innerHTML = h;
  }

  function logMI(n,t,b,s){ showLoading(); app.run.withSuccessHandler(()=>{ hideLoading(); showToast("بروزرسانی شد"); openProfile(n); }).submitMILog(n,t,b,s); }

  function renderFullHistory(h){
    if(!h || h.length === 0) { document.getElementById('sp-mi-history').innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;"><i class="fas fa-history" style="font-size:2rem; display:block; margin-bottom:10px; opacity:0.3;"></i>هنوز فعالیتی ثبت نشده است.</div>`; return; }
    document.getElementById('sp-mi-history').innerHTML = h.map(x=>{
      let badge = x.score ? `<b style="color:${x.score>0?'#10b981':'#ef4444'};">${x.score>0?'+':''}${toPersianNum(x.score)}</b>` : "";
      return `<div style="font-size:0.88rem; border-bottom:1px solid var(--border); padding:12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;"><span style="font-size:1.2rem;">${x.icon}</span><div><small style="opacity:0.6;">${toPersianNum(x.date)} - ${x.title}</small><br><b style="color:var(--text);">${x.desc}</b></div></div>${badge}</div>`;
    }).join('');
  }

  function renderSummaryStats(s) {
    const h = `
      <div style="text-align:center; padding:10px; background:#f0fdf4; border-radius:12px; border:1px solid #bbf7d0;">
        <small style="color:#15803d; display:block;">حضور به‌موقع</small>
        <b style="font-size:1.2rem;">${toPersianNum(s.p)}</b>
      </div>
      <div style="text-align:center; padding:10px; background:#fffbeb; border-radius:12px; border:1px solid #fef3c7;">
        <small style="color:#b45309; display:block;">حضور با تاخیر</small>
        <b style="font-size:1.2rem;">${toPersianNum(s.l)} <small>(${toPersianNum(s.lm)} د)</small></b>
      </div>
      <div style="text-align:center; padding:10px; background:#fef2f2; border-radius:12px; border:1px solid #fecaca;">
        <small style="color:#b91c1c; display:block;">غیبت</small>
        <b style="font-size:1.2rem;">${toPersianNum(s.a)}</b>
      </div>
      <div style="text-align:center; padding:10px; background:#f0f9ff; border-radius:12px; border:1px solid #bae6fd;">
        <small style="color:#0369a1; display:block;">غیبت موجه</small>
        <b style="font-size:1.2rem;">${toPersianNum(s.e)}</b>
      </div>
    `;
    document.getElementById('sp-summary-stats').innerHTML = h;
  }
  function renderGrowthChart(g){
    const empty = document.getElementById('sp-growth-empty');
    const box = document.getElementById('spGrowthChartBox');
    const labels = (g && g.labels) || [];
    if(empty) empty.style.display = labels.length ? 'none' : 'block';
    if(box) box.style.display = labels.length ? 'block' : 'none';
    if(!labels.length || typeof Chart === 'undefined') return;
    if(box) box.style.width = Math.max(320, labels.length * 58) + 'px';
    if(growthChart) growthChart.destroy();
    growthChart = new Chart(document.getElementById('sp-growth-chart'), {
      type:'line',
      data:{labels:g.labels, datasets:[{label:'امتیاز', data:g.data, borderColor:'#10b981', tension:0.4, fill:true, backgroundColor:'rgba(16,185,129,0.1)'}]},
      options:{responsive: true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:(ctx)=>`امتیاز: ${ctx.raw}`}}}}
    });
  }

  function openReportCard() {
    if(!currentStudent) return;
    showLoading();
    app.run.withSuccessHandler(d=>{
      hideLoading();
      if(!d.success) return showAlert("خطا در دریافت اطلاعات", 'error');
      const info = d.info; const stats = d.stats; const today = new Date().toLocaleDateString('fa-IR');
      const parentNote = String(info.parentNote || info.parent_note || '').trim() || 'توضیحات خاصی ثبت نشده است.';
      document.getElementById('report-date').innerText = `تاریخ صدور: ${toPersianNum(today)}`;
      let h = `<div class="report-compact-head"><img src="${info.displayImage || 'assets/default-avatar.svg'}" onerror="this.src='assets/default-avatar.svg'"><div><small>کارنامه عملکرد</small><h3>${info.name}</h3><span class="score-badge">امتیاز کل: ${toPersianNum(stats.scores.total)}</span></div></div><div class="report-section report-compact-stats"><h4>📊 وضعیت حضور و غیاب</h4><div class="report-stat-row"><span>✅ حضور به‌موقع</span><b>${toPersianNum(stats.stats.p)}</b></div><div class="report-stat-row"><span>⏰ تاخیر</span><b>${toPersianNum(stats.stats.l)} / ${toPersianNum(stats.stats.lm)}د</b></div><div class="report-stat-row"><span>❌ غیبت</span><b>${toPersianNum(stats.stats.a)}</b></div><div class="report-stat-row"><span>🏳️ موجه</span><b>${toPersianNum(stats.stats.e)}</b></div></div><div class="report-section report-compact-mi"><h4>🧠 پروفایل هوش برتر</h4>${generateSimpleBarChart(d.mi.chart)}</div><div class="report-section report-parent-note"><h4>📝 یادداشت مربی برای والدین</h4><div>${parentNote}</div></div>`;
      document.getElementById('report-content').innerHTML = h;
      document.getElementById('report-modal').style.display = 'block';
    }).getFullStudentProfile(currentStudent);
  }

  function generateSimpleBarChart(chartData) {
    if(!chartData || !chartData.labels) return "";
    let html = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">';
    let dataMap = chartData.labels.map((l, i) => ({label: l, value: chartData.data[i]}));
    dataMap.sort((a,b) => b.value - a.value);
    dataMap.forEach(item => {
      let pct = Math.min(100, (item.value / 10) * 100);
      html += `<div style="display:flex; align-items:center; font-size:0.85rem;"><span style="width:100px;">${item.label}</span><div style="flex:1; background:#eee; height:10px; border-radius:5px; overflow:hidden;"><div style="width:${pct}%; background:var(--primary); height:100%;"></div></div><span style="width:30px; text-align:left; margin-right:5px;">${toPersianNum(item.value)}</span></div>`;
    });
    html += '</div>'; return html;
  }

  function openTimer() { document.getElementById('timer-modal').style.display='flex'; }
  function setCustomTimer() { const m = parseInt(toEnglishNum(document.getElementById('t-min').value)) || 0; const s = parseInt(toEnglishNum(document.getElementById('t-sec').value)) || 0; if(m===0 && s===0) return showAlert("لطفا زمان را وارد کنید"); timerSec = (m*60) + s; updateTimerDisplay(); }
  function startTimer() { if(timerInterval) clearInterval(timerInterval); timerInterval = setInterval(()=>{ if(timerSec>0) { timerSec--; updateTimerDisplay(); } else { stopTimer(); showAlert("⏰ زمان تمام شد!"); } }, 1000); }
  function stopTimer() { clearInterval(timerInterval); }
  function resetTimer() { stopTimer(); timerSec=0; updateTimerDisplay(); }
  function updateTimerDisplay() { const m = Math.floor(timerSec/60); const s = timerSec%60; document.getElementById('timer-display').innerText = `${toPersianNum(m.toString().padStart(2,'0'))}:${toPersianNum(s.toString().padStart(2,'0'))}`; }

  function openManualGrouping() { if(!DB.students || DB.students.length===0) return showAlert("هنوز دانش‌آموزی ندارید!", 'error'); document.getElementById('g-date').value = toPersianNum(new Date().toLocaleDateString('fa-IR')); document.getElementById('g-model').value = ""; document.getElementById('g-current-name').value = ""; tempGroups = []; renderGroupStudentGrid(); renderAddedGroups(); document.getElementById('manual-grouping-modal').style.display='flex'; }
  function renderGroupStudentGrid() { let h = ""; DB.students.forEach(s => { h += `<div class="student-select-card" onclick="toggleStudentSelection(this, '${s.name}')"><img src="${s.image}" onerror="this.src='assets/default-avatar.svg'"><span>${s.name}</span><i class="fas fa-check-circle"></i></div>`; }); document.getElementById('g-students-list').innerHTML = h; }
  function toggleStudentSelection(el, name) { el.classList.toggle('selected'); }
  function addGroupToList() { const gName = document.getElementById('g-current-name').value; let members = []; document.querySelectorAll('.student-select-card.selected').forEach(el => { members.push(el.querySelector('span').innerText); }); if(!gName) return showAlert("لطفا نام گروه را وارد کنید"); if(members.length === 0) return showAlert("حداقل یک نفر را انتخاب کنید"); tempGroups.push({name: gName, members: members}); document.getElementById('g-current-name').value = ""; document.querySelectorAll('.student-select-card.selected').forEach(el => el.classList.remove('selected')); renderAddedGroups(); showToast("گروه اضافه شد"); }
  function renderAddedGroups() { let h = ""; tempGroups.forEach((g, index) => { h += `<div class="added-group-card"><div><b>${g.name}:</b> <span style="font-size:0.9rem; color:#666;">${g.members.join('، ')}</span></div><span style="color:red; cursor:pointer;" onclick="removeTempGroup(${index})"><i class="fas fa-trash"></i></span></div>`; }); document.getElementById('added-groups-container').innerHTML = h || '<small style="color:#999;">هنوز گروهی اضافه نشده است.</small>'; }
  function removeTempGroup(index) { tempGroups.splice(index, 1); renderAddedGroups(); }
  function saveFinalGrouping() { const d = document.getElementById('g-date').value; const model = document.getElementById('g-model').value; if(!model) return showAlert("لطفا عنوان مدل گروه‌بندی را وارد کنید"); if(tempGroups.length === 0) return showAlert("هیچ گروهی ایجاد نشده است!"); const details = JSON.stringify({ isMultiGroup: true, groups: tempGroups }); showLoading(); app.run.withSuccessHandler(r=>{ DB.moduleHistory=null; hideLoading(); showToast(r.msg); document.getElementById('manual-grouping-modal').style.display='none'; fetchData(); }).saveManualLog({date: d, type: 'grouping', title: model, details: details}); }
  function openFreeActivity() { document.getElementById('fa-date').value = toPersianNum(new Date().toLocaleDateString('fa-IR')); document.getElementById('free-activity-modal').style.display='flex'; }
  function saveFreeActivityLog() { const d = document.getElementById('fa-date').value; const t = document.getElementById('fa-title').value; const desc = document.getElementById('fa-desc').value; if(!t) return showAlert("عنوان الزامی است"); showLoading(); app.run.withSuccessHandler(r=>{ DB.moduleHistory=null; hideLoading(); showToast(r.msg); document.getElementById('free-activity-modal').style.display='none'; document.getElementById('fa-title').value = ""; document.getElementById('fa-desc').value = ""; fetchData(); }).saveManualLog({date: d, type: 'free_activity', title: t, details: desc}); }
  function statusLabel(status, lateMinutes){
    if(status === 'Absent') return 'غیبت';
    if(status === 'Late') return 'تاخیر' + (lateMinutes ? ' (' + toPersianNum(lateMinutes) + 'د)' : '');
    if(status === 'Excused') return 'موجه';
    return 'حاضر';
  }
  function statusClass(status){
    if(status === 'Absent') return 'danger';
    if(status === 'Late') return 'warn';
    if(status === 'Excused') return 'info';
    return 'ok';
  }
  function loadAttendanceHistory(append = false){
    const box = document.getElementById('attendance-history-list');
    if(!box || attendanceHistoryState.loading) return;
    if(!append){ attendanceHistoryState.offset = 0; attendanceHistoryState.done = false; box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">در حال دریافت سوابق...</p>'; }
    if(append && attendanceHistoryState.done) return;
    attendanceHistoryState.loading = true;
    app.run.withSuccessHandler(r=>{
      attendanceHistoryState.loading = false;
      const rows = r.sessions || [];
      attendanceHistoryState.offset += rows.length;
      attendanceHistoryState.done = rows.length < attendanceHistoryState.limit;
      renderAttendanceHistory(rows, append);
    }).withFailureHandler(e=>{
      attendanceHistoryState.loading = false;
      box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">دریافت سوابق انجام نشد.</p>';
      showAlert('خطا در دریافت سوابق حضور و غیاب: ' + e.message, 'error');
    }).getAttendanceSessions(attendanceHistoryState.limit, attendanceHistoryState.offset);
  }
  function renderAttendanceHistory(rows, append){
    const box = document.getElementById('attendance-history-list'); if(!box) return;
    let current = append ? box.querySelectorAll('.attendance-session-card').length : 0;
    let h = append ? box.innerHTML.replace(/<button[\s\S]*?loadAttendanceHistory\(true\)[\s\S]*?<\/button>/, '') : '';
    if(!rows.length && !current){ box.innerHTML = '<p style="opacity:.65;text-align:center;padding:18px;">هنوز حضور و غیابی ثبت نشده است.</p>'; return; }
    rows.forEach(s=>{
      h += `<div class="attendance-session-card" id="att-session-${s.id}">
        <div class="attendance-session-head" onclick="toggleAttendanceSession(${s.id})">
          <div><b>جلسه ${toPersianNum(s.date)}</b><small>${toPersianNum(s.total)} نفر ثبت شده</small></div>
          <div class="attendance-mini-stats"><span class="ok">${toPersianNum(s.present)}</span><span class="warn">${toPersianNum(s.late)}</span><span class="danger">${toPersianNum(s.absent)}</span><span class="info">${toPersianNum(s.excused)}</span></div>
        </div>
        <div class="attendance-session-body" id="att-session-body-${s.id}"></div>
      </div>`;
    });
    if(!attendanceHistoryState.done) h += `<button class="btn btn-outline" style="margin:10px auto 0; max-width:260px;" onclick="loadAttendanceHistory(true)">نمایش بیشتر سوابق</button>`;
    box.innerHTML = h;
  }
  function toggleAttendanceSession(id){
    const card = document.getElementById('att-session-' + id);
    const body = document.getElementById('att-session-body-' + id);
    if(!card || !body) return;
    if(card.classList.contains('open')) { card.classList.remove('open'); return; }
    card.classList.add('open');
    if(body.dataset.loaded === '1') return;
    body.innerHTML = '<p style="opacity:.65;text-align:center;">در حال دریافت ریز حضور...</p>';
    app.run.withSuccessHandler(r=>{
      if(!r.success) { body.innerHTML = `<p style="opacity:.65;text-align:center;">${r.msg || 'جلسه پیدا نشد'}</p>`; return; }
      body.dataset.loaded = '1';
      let h = `<div class="attendance-detail-actions"><button class="btn btn-red" onclick="askDeleteAttendanceSession(${id}, event)">حذف این تاریخ</button></div>`;
      h += (r.records || []).map(x=>`<div class="attendance-detail-row ${statusClass(x.status)}"><div><img src="${x.image}" onerror="this.src='assets/default-avatar.svg'"><b>${x.name}</b></div><span>${statusLabel(x.status, x.lateMinutes)}</span></div>`).join('') || '<p style="opacity:.65;text-align:center;">رکوردی برای این جلسه ثبت نشده است.</p>';
      body.innerHTML = h;
    }).withFailureHandler(e=>{ body.innerHTML = '<p style="opacity:.65;text-align:center;">خطا در دریافت ریز حضور.</p>'; showAlert(e.message, 'error'); }).getAttendanceSessionDetails(id);
  }
  function askDeleteAttendanceSession(id, event){
    if(event) event.stopPropagation();
    showConfirm('این تاریخ حضور و غیاب کامل حذف شود؟ این کار رکورد همه متربی‌ها در این جلسه را پاک می‌کند.', ()=>{
      showLoading();
      app.run.withSuccessHandler(r=>{ hideLoading(); attendanceHistoryState.offset=0; attendanceHistoryState.done=false; showToast(r.msg || 'حذف شد'); fetchData(); if(activeViewName()==='att') loadAttendanceHistory(false); }).withFailureHandler(e=>{ hideLoading(); showAlert(e.message, 'error'); }).deleteAttendanceSession(id);
    });
  }

  let currentArchiveType = 'grouping';
  let archiveSearchTimer = null;
  function filterArchive(query) {
    clearTimeout(archiveSearchTimer);
    archiveSearchTimer = setTimeout(() => loadArchiveData(currentArchiveType || 'grouping', query || ''), 250);
  }
  function renderArchive(type, tabElement) {
    if(tabElement) { document.querySelectorAll('#view-archive .tab').forEach(t => t.classList.remove('active')); tabElement.classList.add('active'); }
    if (type && type !== currentArchiveType) { currentArchiveType = type; document.getElementById('archive-search').value = ""; return loadArchiveData(type, ''); }
    currentArchiveType = type || currentArchiveType || 'grouping';
    const list = document.getElementById('archive-list'); let h = "";
    const filtered = DB.moduleHistory || [];
    if (filtered.length === 0) { h = `<div style="text-align:center; padding:20px; color:#94a3b8;">هنوز موردی در این دسته ثبت نشده است.</div>`; }
    else { filtered.forEach(item => h += buildArchiveItemHTML(item)); }
    list.innerHTML = h;
  }
  function buildArchiveItemHTML(item) { let headerText = item.title; let bodyContent = ""; let extraBtn = ""; if (item.source === 'plan' && item.planId) { extraBtn = `<br><button class="btn btn-blue" style="font-size:0.8rem; padding:5px 10px; margin-top:10px; width:auto; display:inline-block;" onclick="goToPlan('${item.planId}')">📜 مشاهده طرح درس</button>`; } if (item.type === 'grouping') { let detailsObj = {}; try { detailsObj = JSON.parse(item.details); } catch(e){} if(detailsObj.isMultiGroup) { let groupsHtml = ""; (detailsObj.groups || []).forEach(g => { groupsHtml += `<div style="margin-bottom:8px; border-bottom:1px dashed #eee; padding-bottom:5px;"><span style="font-weight:bold; color:var(--primary);">${g.name}:</span> ${g.members.join('، ')}</div>`; }); bodyContent = groupsHtml; } else { const membersStr = (detailsObj.members || []).join(' - '); const grpName = detailsObj.groupName || ""; if(grpName) headerText += ` <span style="opacity:0.7">(${grpName})</span>`; bodyContent = `<b>اعضا:</b> ${membersStr}`; } } else { const sourceBadge = item.source==='plan' ? '<span style="color:var(--primary);">📚 طرح درس</span>' : '<span style="color:#10b981;">📝 آزاد</span>'; bodyContent = `${item.details || 'بدون توضیحات'}<br><br><small>${sourceBadge}</small>`; } return `<div class="acc-card"><div class="acc-header" onclick="this.parentElement.classList.toggle('open')"><div>${headerText}</div><div style="font-size:0.8rem; white-space:nowrap;">${toPersianNum(item.date)} 🔽</div></div><div class="acc-body">${bodyContent}${extraBtn}</div></div>`; }
  function hiddenAlertIds(){
    try { return JSON.parse(localStorage.getItem('charshanbeHiddenAlerts') || '[]'); } catch(e) { return []; }
  }
  function getVisibleAlerts(){
    const hidden = new Set(hiddenAlertIds());
    return (DB.alerts || []).filter(a => !hidden.has(a.id || `${a.title}:${a.text}`));
  }
  function dismissAlert(id){
    const hidden = new Set(hiddenAlertIds());
    hidden.add(id);
    localStorage.setItem('charshanbeHiddenAlerts', JSON.stringify([...hidden]));
    renderAlerts();
    const dashAlertCount = document.getElementById('dash-alert-count'); if (dashAlertCount) dashAlertCount.innerText = toPersianNum(getVisibleAlerts().length);
  }
  function renderAlerts(){
    const box=document.getElementById('alerts-list'); if(!box) return;
    const alerts=getVisibleAlerts();
    box.innerHTML = alerts.length ? alerts.map(a=>`<div class="alert-card ${a.level}" style="position:relative; padding-left:46px;"><button onclick="dismissAlert('${a.id || `${a.title}:${a.text}`}')" title="دیگر نمایش نده" aria-label="بستن هشدار" style="position:absolute; left:12px; top:12px; width:28px; height:28px; border:0; border-radius:50%; background:#f1f5f9; color:#64748b; cursor:pointer; font-size:1.1rem;">×</button><b>${a.title}</b><br><span>${a.text}</span></div>`).join('') : '<p style="opacity:.65;text-align:center;">فعلاً هشدار مهمی ثبت نشده است.</p>';
  }
  function runGlobalSearch(q){
    const out=document.getElementById('global-search-results'); if(!out) return;
    if(!q || q.trim().length<2){ out.innerHTML=''; return; }
    app.run.withSuccessHandler(r=>{ out.innerHTML = (r.items||[]).length ? r.items.map(i=>`<div class="search-result"><b>${i.type}: ${i.title}</b><br><small>${i.text||''}</small></div>`).join('') : '<p style="opacity:.65;">چیزی پیدا نشد.</p>'; }).globalSearch(q);
  }
  function quickSearch(q){
    const out=document.getElementById('quick-search-results'); if(!out) return;
    if(!q || q.trim().length<2){ out.innerHTML=''; return; }
    app.run.withSuccessHandler(r=>{ out.innerHTML=(r.items||[]).slice(0,5).map(i=>`<div class="search-result"><b>${i.type}: ${i.title}</b><br><small>${i.text||''}</small></div>`).join('') || '<p style="opacity:.65;">چیزی پیدا نشد.</p>'; }).globalSearch(q);
  }
  function renderCalendar(){
    const out=document.getElementById('calendar-list'); if(!out) return;
    out.innerHTML='<p style="opacity:.65;">در حال دریافت...</p>';
    app.run.withSuccessHandler(r=>{ out.innerHTML=(r.events||[]).length ? r.events.map(e=>`<div class="calendar-item clickable-calendar-item" onclick="openCalendarEvent('${e.type}', '${e.id || ''}')"><div><b>${e.type==='plan'?'📚 طرح درس':'✅ حضور و غیاب'}</b><br>${e.title}</div><strong>${toPersianNum(e.date)}</strong></div>`).join('') : '<p style="opacity:.65;">هنوز جلسه‌ای ثبت نشده است.</p>'; }).getCalendarData();
  }
  async function uploadPlanFile(planId, event){
    if(event) event.stopPropagation();
    const input=document.getElementById('plan-file-'+planId); if(!input || !input.files || !input.files.length) return showAlert('اول فایل‌ها را انتخاب کنید.');
    const selectedFiles = Array.from(input.files);
    const chunkSize = 20;
    const uploaded = [];
    showLoading();
    try {
      for(let i=0; i<selectedFiles.length; i+=chunkSize){
        const form=new FormData();
        form.append('planId', planId);
        selectedFiles.slice(i, i + chunkSize).forEach(file => form.append('files[]', file));
        const res = await fetch('api.php?action=uploadPlanFile',{method:'POST',body:form});
        const d = await parseApiJsonResponse(res);
        if(!d.success) throw new Error(d.msg||'آپلود نشد');
        uploaded.push(...(d.files || (d.file ? [d.file] : [])));
      }
      appendPlanFiles(planId, uploaded);
      input.value = '';
      hideLoading();
      showToast(`✅ ${toPersianNum(uploaded.length)} فایل طرح درس آپلود شد`);
    } catch(e) { hideLoading(); showAlert(cleanServerError(e.message),'error'); }
  }
  async function parseApiJsonResponse(res){
    const text = await res.text();
    const jsonStart = text.indexOf('{');
    const jsonText = jsonStart >= 0 ? text.slice(jsonStart) : text;
    try { return JSON.parse(jsonText); } catch(e) { throw new Error(text); }
  }
  function cleanServerError(msg){
    return String(msg || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim() || 'خطای نامشخص در سرور';
  }
  function appendPlanFiles(planId, files){
    const plan = (DB.plans || []).find(p => String(p.id) === String(planId));
    if(plan && files.length){
      plan.files = [...files, ...(plan.files || [])];
      renderPlans();
    }
  }
  function deletePlanFile(id, event){ if(event) event.stopPropagation(); showConfirm('این فایل حذف شود؟',()=> app.run.withSuccessHandler(r=>{DB.plans=null; lazyOffsets.plans=0; lazyDone.plans=false; showToast(r.msg); fetchData();}).deletePlanFile(id)); }
  function flushTelegram(){ showLoading(); app.run.withSuccessHandler(r=>{hideLoading(); showToast(r.msg);}).flushTelegramQueue(); }
  function openMonthlyReport(){
    if(!currentStudent) return;
    showPrompt('ماه گزارش را وارد کن (مثلاً 1405/01):', new Date().toLocaleDateString('fa-IR').slice(0,7), (m)=>{ if(!m) return; showLoading(); app.run.withSuccessHandler(d=>{ hideLoading(); if(!d.success) return showAlert('گزارش پیدا نشد','error'); renderReportModal(d, 'گزارش ماهانه ' + toPersianNum(d.month)); }).getMonthlyReport(currentStudent,m); });
  }
  function renderReportModal(d, title){
    const info=d.info, stats=d.stats; document.getElementById('report-date').innerText=title;
    const parentNote = String(info.parentNote || info.parent_note || '').trim() || 'توضیحات خاصی ثبت نشده است.';
    let h=`<div class="report-compact-head"><img src="${info.displayImage || 'assets/default-avatar.svg'}" onerror="this.src='assets/default-avatar.svg'"><div><small>${title}</small><h3>${info.name}</h3><span class="score-badge">امتیاز کل: ${toPersianNum(stats.scores.total)}</span></div></div><div class="report-section report-compact-stats"><h4>📊 وضعیت حضور</h4><div class="report-stat-row"><span>حاضر</span><b>${toPersianNum(stats.stats.p)}</b></div><div class="report-stat-row"><span>تاخیر</span><b>${toPersianNum(stats.stats.l)}</b></div><div class="report-stat-row"><span>غیبت</span><b>${toPersianNum(stats.stats.a)}</b></div><div class="report-stat-row"><span>موجه</span><b>${toPersianNum(stats.stats.e)}</b></div></div><div class="report-section report-compact-mi"><h4>🧠 هوش‌ها</h4>${generateSimpleBarChart(d.mi.chart)}</div><div class="report-section report-parent-note"><h4>📝 یادداشت مربی برای والدین</h4><div>${parentNote}</div></div><div class="report-section report-events"><h4>⏳ رویدادهای این بازه</h4>${(d.fullHistory||[]).slice(0,6).map(x=>`<div style="border-bottom:1px solid #eee;padding:6px 0"><b>${toPersianNum(x.date)} - ${x.title}</b><br>${x.desc}</div>`).join('') || 'موردی ثبت نشده است.'}</div>`;
    document.getElementById('report-content').innerHTML=h; document.getElementById('report-modal').style.display='block';
  }

  function openCalendarEvent(type, id) {
    if(type === 'plan') return goToPlan(id);
    if(type === 'attendance') return goToAttendanceSession(id);
  }
  function goToAttendanceSession(sessionId) {
    nav('att');
    setTimeout(() => {
      loadAttendanceHistory(false);
      setTimeout(() => openAttendanceSessionFromCalendar(sessionId), 650);
    }, 120);
  }
  function openAttendanceSessionFromCalendar(sessionId) {
    const el = document.getElementById('att-session-' + sessionId);
    if(el) {
      el.scrollIntoView({behavior:'smooth', block:'center'});
      if(!el.classList.contains('open')) toggleAttendanceSession(sessionId);
      el.classList.add('highlight');
      setTimeout(() => el.classList.remove('highlight'), 2200);
      return;
    }
    if(!attendanceHistoryState.done) {
      loadAttendanceHistory(true);
      setTimeout(() => openAttendanceSessionFromCalendar(sessionId), 650);
    } else {
      showAlert('این حضور و غیاب در لیست فعلی پیدا نشد.', 'error');
    }
  }

  function goToPlan(planId) { nav('plans'); setTimeout(() => { const el = document.getElementById('plan-' + planId); if(el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.classList.add('open'); el.classList.add('highlight'); setTimeout(() => el.classList.remove('highlight'), 2000); } else { showAlert("طرح درس مورد نظر یافت نشد.", 'error'); } }, 600); }
if ('serviceWorker' in navigator) { window.addEventListener('load', ()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
</script>

<script>
// Elite redesign enhancement: pointer spotlight only changes CSS variables, app logic remains untouched.
(() => {
  const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reducedMotion) return;
  let raf = 0;
  window.addEventListener('pointermove', (event) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      document.documentElement.style.setProperty('--spot-x', `${Math.round((event.clientX / window.innerWidth) * 100)}%`);
      document.documentElement.style.setProperty('--spot-y', `${Math.round((event.clientY / window.innerHeight) * 100)}%`);
    });
  }, { passive: true });
})();
</script>

</body>
</html>