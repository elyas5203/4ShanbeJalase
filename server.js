/**
 * KARAGAH V2 - MAIN SERVER
 * Complete Express server with Socket.IO for detective game
 * Supports admin panel with collapsible sidebar and user chat system
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
// node-fetch v3 is ESM-only; use dynamic import wrapper
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

// Database connection
const db = require('./db');
const arshadRoutes = require('./routes/arshadRoutes');

// Initialize Express app
const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Basic session (for future extensibility)
app.use(session({
    secret: 'karagahv2-secret',
    resave: false,
    saveUninitialized: true
}));
// Block direct access to public/assets/media to discourage downloads; serve via secure routes instead
app.use('/assets/media', (req, res) => res.status(403).send('Forbidden'));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure required tables exist (idempotent)
async function ensureSchema() {
    try {
        // students table with free-text class_id (can be class code or username)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                photo_filename VARCHAR(255) NULL,
                class_id VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Ensured students table exists');
        // users.chat_enabled column (allow/disallow user chat by admin)
        try {
            const [cols] = await db.execute("SHOW COLUMNS FROM users LIKE 'chat_enabled'");
            if (!Array.isArray(cols) || cols.length === 0) {
                await db.execute('ALTER TABLE users ADD COLUMN chat_enabled TINYINT(1) NOT NULL DEFAULT 1');
                console.log('✅ Added users.chat_enabled column');
            } else {
                console.log('✅ users.chat_enabled already exists');
            }
        } catch (e) {
            console.warn('⚠️ ensureSchema(users.chat_enabled) failed:', e.message || e);
        }
        // users.hack_status column (persist hacked state)
        try {
            const [hcols] = await db.execute("SHOW COLUMNS FROM users LIKE 'hack_status'");
            if (!Array.isArray(hcols) || hcols.length === 0) {
                await db.execute('ALTER TABLE users ADD COLUMN hack_status VARCHAR(50) NULL');
                console.log('✅ Added users.hack_status column');
            } else {
                console.log('✅ users.hack_status already exists');
            }
        } catch (e) {
            console.warn('⚠️ ensureSchema(users.hack_status) failed:', e.message || e);
        }

        // users.access_code column (login by code only)
        try {
            const [acols] = await db.execute("SHOW COLUMNS FROM users LIKE 'access_code'");
            if (!Array.isArray(acols) || acols.length === 0) {
                await db.execute('ALTER TABLE users ADD COLUMN access_code VARCHAR(64) UNIQUE NULL');
                console.log('✅ Added users.access_code column');
            } else {
                console.log('✅ users.access_code already exists');
            }
        } catch (e) {
            console.warn('⚠️ ensureSchema(users.access_code) failed:', e.message || e);
        }
    } catch (e) {
        console.warn('⚠️ ensureSchema(students) failed:', e.message || e);
    }
}

ensureSchema();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload endpoint for senior detective chat (independent)
const seniorUpload = multer({ dest: uploadsDir });
app.post('/upload-senior', seniorUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }
        await ensureSeniorMessagesTable();
        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype || null;
        const [result] = await db.execute(
            'INSERT INTO senior_messages (user_id, sender_type, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
            [userId, 'senior', '', fileUrl, fileType]
        );
        const messageData = {
            id: result.insertId,
            user_id: parseInt(userId),
            sender_type: 'senior',
            content: '',
            file_url: fileUrl,
            file_type: fileType,
            timestamp: new Date().toISOString()
        };
        // Notify senior admins and target user
        io.to('senior_admins').emit('senior_new_message', messageData);
        const sid = userSockets[String(userId)] || userSocketsMap.get(Number(userId));
        if (sid) io.to(sid).emit('senior_new_message', messageData);
        console.log(`📎 Senior file uploaded: ${req.file.originalname} for user ${userId}`);
        return res.json({ success: true, message: 'ok', id: result.insertId });
    } catch (error) {
        console.error('❌ Senior file upload error:', error);
        return res.status(500).json({ success: false, error: 'Upload error' });
    }
});

// Also ensure public/uploads exists for new single-upload API
const publicUploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
    try { fs.mkdirSync(publicUploadsDir, { recursive: true }); } catch (_) {}
}

// Dossier storage to public/uploads (for new multi-upload API)
const dossierStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, publicUploadsDir),
    filename: (req, file, cb) => {
        const name = (file && file.originalname) ? path.extname(file.originalname) : '.jpg';
        cb(null, `scan-${Date.now()}-${Math.round(Math.random()*1e9)}${name}`);
    }
});
const dossierUpload = multer({ storage: dossierStorage });

// Admin validation lightweight page (key protected like main admin)
app.get('/gostantaniye/validation', async (req, res) => {
    try {
        const key = (req.query && req.query.key) || req.headers['x-admin-key'];
        if (key !== '110') {
            return res.render('admin-login');
        }
        return res.render('admin/validation');
    } catch (e) {
        console.error('❌ Admin validation page error:', e);
        return res.status(500).send('Server error');
    }
});

// Temporary updating page
app.get('/updating', (req, res) => {
    try { return res.render('updating'); } catch (_) { return res.send('<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a1a;color:#7ce3ff;font-family:sans-serif;">در حال به‌روزرسانی</div>'); }
});

// صفحه انیمیشن انتقال امن بین احراز هویت و ترمینال ارشد
app.get('/KaragahArshad/transfer/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (!Number.isFinite(userId)) return res.status(400).send('Invalid user');
        let username = null;
        try {
            const [rows] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);
            if (rows && rows.length) username = rows[0].username || null;
        } catch (_) {}
        return res.render('arshad/transfer', { userId, username });
    } catch (e) {
        console.error('❌ /KaragahArshad/transfer error:', e);
        return res.status(500).send('Server error');
    }
});

// Senior Detective (Arshad) user terminal
app.get('/terminal-arshad/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (!Number.isFinite(userId)) return res.status(400).send('Invalid user');
        let username = null;
        try {
            const [rows] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);
            if (rows && rows.length) username = rows[0].username || null;
        } catch (_) {}
        return res.render('arshad/terminal-arshad', { userId, username });
    } catch (e) {
        console.error('❌ /terminal-arshad error:', e);
        return res.status(500).send('Server error');
    }
});

// Senior Detective (Arshad) admin panel (key protected)
app.get('/gostantaniye-arshad', async (req, res) => {
    try {
        const key = (req.query && req.query.key) || req.headers['x-admin-key'];
        if (key !== '110') {
            return res.render('admin-login');
        }
        return res.render('admin/arshad');
    } catch (e) {
        console.error('❌ Admin arshad page error:', e);
        return res.status(500).send('Server error');
    }
});

// ========== IP GEOLOCATION FALLBACK ==========
// Approximate user location using IP when device has no GPS.
// Returns { lat, lng, city, country, accuracy }
app.get('/api/ip-geo', async (req, res) => {
    try {
        function normalizeIp(raw) {
            if (!raw) return '';
            let ip = String(raw).trim();
            if (ip.startsWith('::ffff:')) ip = ip.substring(7);
            if (ip === '::1') ip = '127.0.0.1';
            return ip;
        }
        function isPrivate(ip) {
            if (!ip) return true;
            if (ip === '127.0.0.1') return true;
            if (ip.startsWith('10.')) return true;
            if (ip.startsWith('192.168.')) return true;
            const parts = ip.split('.');
            if (parts.length === 4) {
                const p0 = parseInt(parts[0], 10), p1 = parseInt(parts[1], 10);
                if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
            }
            if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 unique local
            if (ip.startsWith('fe80')) return true; // IPv6 link-local
            return false;
        }
        function pickClientIp(req) {
            const candidates = [];
            const fwd = req.headers['x-forwarded-for'];
            if (fwd) {
                const arr = Array.isArray(fwd) ? fwd : String(fwd).split(',');
                for (const a of arr) candidates.push(normalizeIp(a));
            }
            candidates.push(normalizeIp(req.headers['x-real-ip']));
            candidates.push(normalizeIp(req.headers['cf-connecting-ip']));
            candidates.push(normalizeIp(req.headers['true-client-ip']));
            candidates.push(normalizeIp(req.ip));
            candidates.push(normalizeIp(req.socket && req.socket.remoteAddress));
            for (const c of candidates) {
                if (c && !isPrivate(c)) return c;
            }
            // last resort, return first non-empty even if private (providers may still handle it)
            for (const c of candidates) if (c) return c;
            return '';
        }

        const ip = pickClientIp(req);

        async function fetchJson(url, timeoutMs = 2500) {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const r = await fetch(url, { signal: controller.signal });
                if (!r.ok) throw new Error('http ' + r.status);
                return await r.json();
            } finally {
                clearTimeout(t);
            }
        }

        // Try multiple providers in parallel; return first valid result
        const providers = [
            {
                name: 'ipwhois',
                url: `https://ipwho.is/${encodeURIComponent(ip)}?security=1`,
                map: (j) => {
                    const lat = Number(j.latitude);
                    const lng = Number(j.longitude);
                    const sec = (j && j.security) ? j.security : {};
                    const vpnLikely = Boolean(sec && (sec.vpn || sec.proxy || sec.tor || sec.hosting));
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                    return { lat, lng, city: j.city || null, country: j.country || null, country_code: j.country_code || null, accuracy: 20000, vpnLikely };
                }
            },
            {
                name: 'ipapi',
                url: `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
                map: (j) => {
                    const lat = Number(j.latitude);
                    const lng = Number(j.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                    return { lat, lng, city: j.city || null, country: j.country_name || null, country_code: j.country_code || null, accuracy: 20000, vpnLikely: false };
                }
            },
            {
                name: 'ip-api-http',
                url: `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,lat,lon,countryCode`,
                map: (j) => {
                    if (j && j.status === 'success' && Number.isFinite(j.lat) && Number.isFinite(j.lon)) {
                        return { lat: j.lat, lng: j.lon, city: null, country: null, country_code: j.countryCode || null, accuracy: 25000, vpnLikely: false };
                    }
                    return null;
                }
            },
            {
                name: 'geojs',
                url: `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`,
                map: (j) => {
                    const lat = Number(j.latitude);
                    const lng = Number(j.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
                    return { lat, lng, city: j.city || null, country: j.country || null, country_code: j.country_code || null, accuracy: 30000, vpnLikely: false };
                }
            }
        ];

        const attempts = providers.map(async (p) => {
            try {
                const data = await fetchJson(p.url, 2500);
                const mapped = p.map(data);
                if (mapped) return mapped;
                throw new Error(p.name + ' invalid');
            } catch (e) {
                return Promise.reject(new Error(p.name + ': ' + (e.message || e)));
            }
        });

        let result = null;
        try {
            result = await Promise.any(attempts);
        } catch (allErr) {
            // Gather reasons for debugging
            const reasons = [];
            for (const a of attempts) {
                try { await a; } catch (e) { reasons.push(e.message || String(e)); }
            }
            console.warn('⚠️ ip-geo all providers failed:', reasons.join(' | '));
            return res.status(502).json({ error: 'ip_geo_unavailable' });
        }

        return res.json(result);
    } catch (e) {
        console.warn('⚠️ /api/ip-geo failed:', e.message || e);
        return res.status(500).json({ error: 'ip_geo_failed' });
    }
});

// Alias endpoint compatible with proposed API (returns urls)

// Range-enabled streaming for ready-made videos under public/move
app.get('/video/move/:name', (req, res) => {
    try {
        const raw = String(req.params.name || '');
        const safeName = path.basename(raw); // prevent path traversal
        const filePath = path.join(__dirname, 'public', 'move', safeName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).end();
        }

        const stat = fs.statSync(filePath);
        const range = req.headers.range;
        const mime = 'video/mp4';

        // Streaming-friendly headers
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Connection', 'keep-alive');

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            if (isNaN(start) || isNaN(end) || start >= stat.size || end >= stat.size) {
                res.setHeader('Content-Range', `bytes */${stat.size}`);
                return res.status(416).end();
            }
            const chunkSize = (end - start) + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Content-Length', chunkSize);
            const stream = fs.createReadStream(filePath, { start, end });
            stream.on('error', (e) => { try { res.destroy(e); } catch(_) {} });
            stream.pipe(res);
        } else {
            res.setHeader('Content-Length', stat.size);
            const stream = fs.createReadStream(filePath);
            stream.on('error', (e) => { try { res.destroy(e); } catch(_) {} });
            stream.pipe(res);
        }
    } catch (e) {
        console.error('❌ move video stream error:', e);
        res.status(500).end();
    }
});

// Admin: delete all canned responses
app.delete('/api/canned-responses', async (req, res) => {
    try {
        await db.execute('DELETE FROM canned_responses');
        res.json({ success: true, message: 'تمام پیام‌های آماده حذف شدند' });
    } catch (error) {
        console.error('❌ Error clearing canned responses:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Default canned responses seed
const defaultCannedResponses = [
  { short_name: 'شروع ماموریت سندروم', content: `سلام 
خوشحالم که جمع شما به عنوان همکاران من برای ماموریت سندروم انتخاب شدید. احتمالا به این خاطر که شما کمتر در معرض سندروم قرار داشتین این اتفاق افتاده ... 
ما راه سختی رو پیشرو داریم. شما باید با تمام حواستون من رو کمک کنید ... به تنهایی از پس این پرونده بر نمیام. 
پس خیلی سریع خودتون رو با وسایل کارآگاه که داخل کیف هستش، تجهیز کنید...دستکش ها رو دستتون کنید ... آ دی کارتا رو بندازین گردنتون ... 
یکسری وسایل اضافه هم کارگاه ارشد براتون گذاشته تا توی حل پرونده راحت تر باشین` },
  { short_name: 'راهنمایی مامور ارشد', content: `راستی مامور ارشد ما، با استفاده از رمز هایی سعی میکنه ما رو راهنمایی کند. حتما به محتویات داخل پرونده توجه ویژه داشته باشین. شاید جواب خیلی از معماها از داخل این سرنخ ها پیدا بشه 
خب دیگه وقت نداریم باید سریع شروع کنیم من همین چند دقیقه پیش وارد شهر مشهد شدم...` },
  { short_name: 'معما 1: جهت حرکت تا مقصد', content: `چه ها من به این راننده مشکوک شدم. 
لطفا کمکم کنید. 
من از طریق جی پی اس مسیر حرکتم روی نقشه رو براتون می فرستم. جهت حرکت دقیق من رو تا رسیدن به مقصد یادداشت کنید و بهم بگین... 
این اسم رمزه تا من بتونم مامور مخفی رو تو پارک پیدا کنم.` },
  { short_name: 'معما 2: آبمیوه 2 دلاری و مختصات کنار بلندترین قله', content: `بچه ها باید دنبال مکانی در شهر باشم که بتونم یک آبمیو 2 دلاری سفارش بدم... فکر می کنم این هم یک رمز بود تا شخص بیگانه ای ازش باخبر نشه... 
به کمک نقشه لطفاً بهم بگید به چه مختصاتی باید برم تا بتونم مکانی را کنار بلندترین قله دنیا پیدا کنم...
شاید برای این کار لازم باشه به اون کیف مراجعه کنین و از وسایل توش استفاده کنین` },
  { short_name: 'معما 3: انتخاب از منوی سفارش', content: `بچه ها اینجا یه منو سفارش جلو منه... نمیدونم کدوم رو باید سفارش بدم؟
 اون مامور مخفی تو پارک بهم گفت یه آبمیو 2 دلاری سفارش بدم تا سر نخ بعدیو بدست بیارم... لطفا کمکم کنید...` },
  { short_name: 'معما 4: مختصات زیر لیوان', content: `زیر لیوان یک مختصات نوشته بود. کمکم کنید تا مکان بعدی که باید برم رو پیدا کنم. دقیقا اون مکان چیه ؟` },
  { short_name: 'معما 5: سرقت از موزه', content: `چندتا عکس توی ساعتای مختلف از دوربین مداربسته براتون ارسال کردم.
 میتونین منو کمک کنین که چه چیزی از موزه دزیده شده ؟` },
  { short_name: 'معما 6: مسیر به آزمایشگاه و کدها', content: `آفرین به دستیاران حرفه‌ای من،به درستی تونستین به ما کمک کنین... 
خب حالا باید خون هایی که مسئول موزه بهم داده رو ببرم آزمایشگاه تا بتونم هویتش رو بررسی کنیم... 
اما خیلی از مسیرهای شهر به خاطر این دزدی بسته شده... فقط یک مسیر هست که از موزه به آزمایشگاه میرسه .. لطفا اون مسیر رو تو نقشه مشخص کنید و عدد هایی که تو این مسیر بدست میارین با ذره بین بخونین و به ترتیب برام بفرستین... این کد ها بعدا ممکنه لازممون بشه ، پس حتما یادتون بمونه.` },
  { short_name: 'گزارش: مکث آزمایش و خلاصه گردنبند', content: `آفرین به شما...
دارین عالی عمل میکنین
راستی...
ممکنه فرایند آزمایش یک هفته طول بکشه و مجبور باشم جواب اونو هفته دیگه بهتون بدم.

برای اینکه یه قدم نزدیک تر بشین به حل پرونده، پیشنهاد میکنم داستان گردنبند رو خوب یاد بگیرین و خلاصشو توی گزارشاتون بنویسین` },
  { short_name: 'گزارش: تحویل نمونه‌ها به دکتر', content: `خب بچه ها توی هفته ای که گذشت من رفتم پیش دکتر آزمایشگاه و خون هایی که مسئول موزه از صحنه جرم پیدا کرده بود رو بهش دادم تا اونا رو مورد بررسی قرار بده` },
  { short_name: 'ارسال: صحبت‌های دکتر', content: `الان براتون صحبت هایی که دکتر گفته رو میفرستم` },
  { short_name: 'معما 7: زیر میکروسکوپ و لغت‌نامه سلول‌ها', content: `فیلمی که دکتر نمونه هارو زیر میکروسکوپ بررسی میکنه رو هم برای من فرستاد،براتون ارسال میکنم .
دقت کنین باید بفهمیم زیر میکروسکوپ چه خبره.   
بیاین باهم دکتر رو کمک کنیم.
از لغت نامهٔ‌ی سلول‌ها کمک بگیرین` },
  { short_name: 'سوال: ارتباط انار با پروژه', content: `ممنوم ازتون بچه ها. اما انار چه ربطی می تونه به پروژه ما داشته باشه..؟
 الان انار حدود۱۲  ساله که تو اکثر شهر ها و شهر ما ناپدید شده ؟؟` },
  { short_name: 'وظیفه: داستان انار حضرت زهرا', content: `آفرین به شما همینه ... سندروم می خواسته یکی دیگه از نشونه های حضرت زهرا رو پاک کنه 
 باید هرچه سریعتر داستان انار حضرت زهرا رو یاد بگیرین و خلاصه ای از اون رو داخل برگه های گزارشتون بنویسین.` },
  { short_name: 'معما 8: مرکز پست و کد مسیر ۴ رقمی', content: `راستی قبل از تعریف داستان انار... به من خبر دادن که توی اداره پست آتش سوزی رخ داده، باید خیلی سریع برم اونجا. 
حواستون باشه که چندتا مرکز پست داریم... من به مرکز پستی میرم که فقط با مقدار دقیق موجودی من‌کارتم که ۲۵ هزارتومنه میشه رفت، برای اینکه بدونین دقیق کجا میرم  کد ۴ رقمی مسیری که با این موجودی میرم رو برام بفرستین...` },
  { short_name: 'وظیفه: حدیث کسا', content: `ٓفرین به شما ... حدیث کسا ... خودشه ... سومین نشونه
از حضرت زهرا که سندروم میخواسته اون رو نابود کنه ... 
باید همین الان داستان کامل حدیث کسا رو توسط مدرستون یاد بگیرید.
وقتی داستان و شنیدین بهم بگین` },
  { short_name: 'اخطار: دشواری ارتباط', content: `بچه ها تو این هفته تا تونستم با شما ارتباط برقرار کنم خیلی سختی کشیدم، نمدونم اما فک میکنم چند نفر هستن که نمی خوان راز این بیماری و راه درمانش پیدا بشه` },
  { short_name: 'گزارش: خروج از سوپرمارکت', content: `همین الان که براتون پیام میفرستم از توی یک مغازه سوپر مارکت دارم خارج میشم` },
  { short_name: 'هشدار: احساس تعقیب', content: `احساس میکنم که دارن منو تعقیب میکنن` },
  { short_name: 'توصیه امنیتی: اعتماد نکنید', content: `اگه اتفاقی برای من افتاد حواستون باشه به هیچ کس اعتماد نکنین، هرسرنخی که پیدا کردیم رو پیش خودتون نگهدارین تا یه جوری باهاتون ارتباط بگیرم` },
  { short_name: 'روحیه: موفق می‌شویم', content: `من مطمئنم که موفق میشیم` },
  { short_name: 'حرکت: تعقیب افراد مشکوک', content: `من دیگه باید برم به دو نفر خیلی مشکوکم، امیدوارم اتفاقی برام نیافته و پیروز از این مرحله بیرون بیایم.` }
];

// Admin: reset canned responses to default list defined above
app.post('/api/admin/canned-responses/reset-to-default', async (req, res) => {
    const conn = db; // using existing pool
    try {
        await conn.execute('DELETE FROM canned_responses');
        for (const item of defaultCannedResponses) {
            await conn.execute(
                'INSERT INTO canned_responses (short_name, content) VALUES (?, ?)',
                [item.short_name, item.content]
            );
        }
        res.json({ success: true, count: defaultCannedResponses.length });
    } catch (error) {
        console.error('❌ Error resetting canned responses:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Lightweight ping endpoint for latency measurement
app.get('/api/ping', (req, res) => {
    res.json({ ok: true, t: Date.now() });
});

// ========== SECURE AUDIO STREAMING (no direct download prompt) ==========
// Serve hack sounds through controlled endpoints without exposing file paths
// Note: Users can technically still capture audio, but this avoids attachment downloads and hides direct URLs.
const HACK_SOUNDS = {
    'ajir': path.join(__dirname, 'public', 'assets', 'media', 'ajir.mp3'),
    'khande': path.join(__dirname, 'public', 'assets', 'media', 'khande.mp3'),
    'khande2': path.join(__dirname, 'public', 'assets', 'media', 'khande2.mp3'),
    // فایل ویس کارآگاه ارشد (کاربر باید voice.mp3 را در همین مسیر قرار دهد)
    'voice': path.join(__dirname, 'public', 'assets', 'media', 'voice.mp3')
};

// Secure hack videos mapping (served inline, range-enabled)
const HACK_VIDEOS = {
    'hack': path.join(__dirname, 'public', 'assets', 'media', 'gerogangiri.MP4')
};

// Secure inline video streaming (prevents attachment download prompt and hides real path)
app.get('/hvideo/:name', (req, res) => {
    try {
        const key = (req.params.name || '').toLowerCase();
        const filePath = HACK_VIDEOS[key];
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).end();
        }

        const stat = fs.statSync(filePath);
        const range = req.headers.range;
        const mime = 'video/mp4';

        // Headers to keep it inline and avoid caching
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Accept-Ranges', 'bytes');

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            if (isNaN(start) || isNaN(end) || start >= stat.size || end >= stat.size) {
                res.setHeader('Content-Range', `bytes */${stat.size}`);
                return res.status(416).end();
            }
            const chunkSize = (end - start) + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Content-Length', chunkSize);
            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            res.setHeader('Content-Length', stat.size);
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
    } catch (e) {
        console.error('❌ hvideo stream error:', e);
        res.status(500).end();
    }
});

app.get('/media/:name', (req, res) => {
    try {
        const key = (req.params.name || '').toLowerCase();
        const filePath = HACK_SOUNDS[key];
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).end();
        }

        const stat = fs.statSync(filePath);
        const range = req.headers.range;
        const mime = 'audio/mpeg';

        // Common headers to avoid download UI and caching
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Accept-Ranges', 'bytes');

        if (range) {
            // Partial content for fast start / scrubbing
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            if (start >= stat.size || end >= stat.size) {
                res.setHeader('Content-Range', `bytes */${stat.size}`);
                return res.status(416).end();
            }
            const chunkSize = (end - start) + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
            res.setHeader('Content-Length', chunkSize);
            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            res.setHeader('Content-Length', stat.size);
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
    } catch (e) {
        console.error('❌ media stream error:', e);
        res.status(500).end();
    }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// ========== USER CONFIG API ==========
// Return client-facing configuration for a user (e.g., chat permission, hack status)
app.get('/api/user-config/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute('SELECT chat_enabled, hack_status FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
        res.json({ chatEnabled: Number(rows[0].chat_enabled) === 1, hackStatus: rows[0].hack_status || null });
    } catch (e) {
        console.error('❌ /api/user-config error:', e);
        res.status(500).json({ error: 'database error' });
    }
});

// ========== ADMIN CHAT PERMISSION API ==========
// Toggle chat permission for a user
app.post('/api/admin/chat-toggle', async (req, res) => {
    try {
        const { userId, enabled } = req.body || {};
        if (!userId || typeof enabled === 'undefined') {
            return res.status(400).json({ success: false, error: 'Missing userId or enabled' });
        }
        await db.execute('UPDATE users SET chat_enabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
        // Notify the user live if connected
        io.to(`user_${userId}`).emit('chat_permission_changed', { enabled: !!enabled });
        // Notify all admins to update UI
        io.to('admins').emit('chat_permission_update', { userId: Number(userId), enabled: !!enabled });
        res.json({ success: true });
    } catch (e) {
        console.error('❌ /api/admin/chat-toggle error:', e);
        res.status(500).json({ success: false, error: 'database error' });
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB limit برای ویدیو
    }
});

// Serve uploaded files (serve public/uploads first, then legacy uploads/)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/uploads', express.static('uploads'));

// Secure download proxy to force Content-Disposition for /uploads/*
app.get('/download', (req, res) => {
    try {
        const url = (req.query && req.query.url) ? String(req.query.url) : '';
        if (!url || !url.startsWith('/uploads/')) {
            return res.status(400).send('Invalid download url');
        }
        // Try public/uploads first, then legacy uploads/
        const rel = url.replace(/^\/+/, '');
        const p1 = path.join(__dirname, 'public', rel.replace(/^uploads\//, 'uploads/'));
        const p2 = path.join(__dirname, rel);
        const filePath = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
        if (!filePath) return res.status(404).send('File not found');
        let name = (req.query && req.query.name) ? String(req.query.name) : path.basename(filePath);
        // Very small sanitization for name
        name = name.replace(/[^\w\-.\u0600-\u06FF\s]/g, '');
        return res.download(filePath, name);
    } catch (e) {
        console.error('❌ download error:', e);
        return res.status(500).send('Server error');
    }
});

// ========== IDENTITY SCAN UPLOAD (uploads) ==========
// Use existing /uploads static (maps to project 'uploads' dir)
const identityUploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(identityUploadDir)) {
    try { fs.mkdirSync(identityUploadDir, { recursive: true }); } catch (_) {}
}
const scanStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, identityUploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'scan-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const scanUpload = multer({ storage: scanStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
const scanMultiUpload = multer({ storage: scanStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Upload endpoint for Arshad identity scan
app.post('/KaragahArshad/upload-identity', scanUpload.single('scanImage'), (req, res) => {
    try {
        if (!req || !req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        // Served via express.static('public') as /uploads/<filename>
        return res.json({ success: true, url: `/uploads/${req.file.filename}` });
    } catch (e) {
        console.error('❌ Identity upload failed:', e);
        return res.status(500).json({ error: 'upload_failed' });
    }
});

// Alias endpoint for single scan upload used by client
app.post('/KaragahArshad/upload-scan', scanUpload.single('scanImage'), (req, res) => {
    try {
        if (!req || !req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        return res.json({ success: true, url: `/uploads/${req.file.filename}` });
    } catch (e) {
        console.error('❌ upload-scan failed:', e);
        return res.status(500).json({ error: 'upload_failed' });
    }
});

// Multi-upload for dossier (up to 5 images)
app.post('/KaragahArshad/upload-multiple', scanMultiUpload.array('scanImages', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }
        const urls = req.files.map(f => `/uploads/${f.filename}`);
        return res.json({ success: true, urls });
    } catch (e) {
        console.error('❌ Multi upload failed:', e);
        return res.status(500).json({ error: 'multi_upload_failed' });
    }
});

// Alias endpoint for dossier upload (same handler as upload-multiple)
app.post('/KaragahArshad/upload-dossier', dossierUpload.array('scanImages'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files.' });
        }
        const urls = req.files.map(f => `/uploads/${f.filename}`);
        return res.json({ urls });
    } catch (e) {
        console.error('❌ upload-dossier failed:', e);
        return res.status(500).json({ error: 'upload_dossier_failed' });
    }
});

// ========== ROUTES ==========

// Landing page
app.get('/', (req, res) => {
    res.render('index');
});

// Login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login (code-based). Admin password = "110"
app.post('/login', async (req, res) => {
    const code = (req.body && (req.body.code || req.body.username)) ? String(req.body.code || req.body.username).trim() : '';
    if (!code) {
        return res.render('login', { error: 'کد دسترسی الزامی است' });
    }

    try {
        // Admin shared password -> open admin panel
        if (code === '110') {
            return res.redirect('/gostantaniye?key=110');
        }

        // Only allow users pre-created by admin (with access_code)
        const [rows] = await db.execute('SELECT id, username FROM users WHERE access_code = ?', [code]);
        if (!rows || rows.length === 0) {
            return res.render('login', { error: '⚠️ دسترسی غیر مجاز' });
        }

        const userId = rows[0].id;
        console.log(`🔐 Code login ok for userId=${userId}, username=${rows[0].username}`);
        return res.redirect(`/terminal/${userId}`);
    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Terminal route
app.get('/terminal/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Get user info
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.redirect('/');
        }
        
        const user = users[0];
        
        // Load student records for personnel overlay (scoped to class if available)
        let studentsPayload = [];
        try {
            let classId = (user && user.class_id) ? String(user.class_id).trim() : null;
            let rowsStudents = [];
            if (classId) {
                [rowsStudents] = await db.execute('SELECT id, name, photo_filename AS photo, class_id FROM students WHERE class_id = ? ORDER BY name', [classId]);
            } else {
                // Safe fallback: if class_id is empty, try username as class key (only this user's namespace)
                const fallbackKey = (user && user.username) ? String(user.username).trim() : null;
                if (fallbackKey) {
                    const [rowsByUser] = await db.execute('SELECT id, name, photo_filename AS photo, class_id FROM students WHERE class_id = ? ORDER BY name', [fallbackKey]);
                    if (rowsByUser && rowsByUser.length) {
                        rowsStudents = rowsByUser;
                        classId = fallbackKey;
                    } else {
                        // Try userId as last-resort namespace (string)
                        const idKey = String(user.id);
                        const [rowsById] = await db.execute('SELECT id, name, photo_filename AS photo, class_id FROM students WHERE class_id = ? ORDER BY name', [idKey]);
                        if (rowsById && rowsById.length) {
                            rowsStudents = rowsById;
                            classId = idKey;
                        } else {
                            console.warn('⚠️ No class_id and no students for username/id fallback; returning empty');
                            rowsStudents = [];
                        }
                    }
                } else {
                    // Try userId only if username missing
                    const idKey = (user && user.id) ? String(user.id) : null;
                    if (idKey) {
                        const [rowsById] = await db.execute('SELECT id, name, photo_filename AS photo, class_id FROM students WHERE class_id = ? ORDER BY name', [idKey]);
                        rowsStudents = rowsById || [];
                        classId = idKey;
                    } else {
                        console.warn('⚠️ No class_id and no username/id; returning empty');
                        rowsStudents = [];
                    }
                }
            }
            studentsPayload = rowsStudents.map(r => ({
                id: r.id,
                name: r.name,
                role: r.class_id || '—',
                avatar: r.photo ? `/assets/students/${r.photo}` : '/assets/students/default.png',
                photo: r.photo ? `/assets/students/${r.photo}` : '/assets/students/default.png',
                gallery: r.photo ? [{ src: `/assets/students/${r.photo}`, w: 1200, h: 800 }] : [],
                fields: {
                    'شناسه': String(r.id),
                    'کلاس': r.class_id || '—',
                    'وضعیت': 'Active'
                }
            }));
        } catch (e) {
            console.warn('⚠️ could not load students for personnel overlay:', e.message || e);
            studentsPayload = [];
        }

        // بررسی وضعیت هک شدن کاربر
        if (user.hack_status === 'hacked') {
            console.log('🔴 کاربر هک شده تشخیص داده شد:', user.username);
            // نمایش صفحه ترمینال هکر
            return res.render('game', {
                user: user,
                userId: userId,
                username: user.username,
                gameState: { current_phase: 'hacked' },
                isHacked: true,
                students: studentsPayload
            });
        }
        
        // Get or create game state
        let [gameStates] = await db.execute('SELECT * FROM game_states WHERE user_id = ?', [userId]);
        if (gameStates.length === 0) {
            await db.execute('INSERT INTO game_states (user_id) VALUES (?)', [userId]);
            [gameStates] = await db.execute('SELECT * FROM game_states WHERE user_id = ?', [userId]);
        }
        
        const gameState = gameStates[0];
        
        res.render('game', {
            user: user,
            userId: userId,
            username: user.username,
            gameState: gameState,
            isHacked: false,
            students: studentsPayload
        });
    } catch (error) {
        console.error('❌ Error loading game:', error);
        res.redirect('/');
    }
});

// Hack sequence route
app.get('/hack-sequence', (req, res) => {
    res.render('hack');
});

// Hack trigger route (when user clicks on trap)
app.get('/hack-trigger/:trapId', (req, res) => {
    const trapId = req.params.trapId;
    console.log('🎣 User clicked on hack trap:', trapId);
    
    // Check if trap exists
    if (global.hackTraps && global.hackTraps[trapId]) {
        const trapInfo = global.hackTraps[trapId];
        console.log('✅ Valid trap triggered by user:', trapInfo.targetUsername);
        
        // Render hack sequence page with trap info
        res.render('hack', { 
            trapId: trapId,
            trapInfo: trapInfo,
            message: 'شما به تله هکری افتادید!'
        });
        
        // Clean up trap after use
        delete global.hackTraps[trapId];
    } else {
        console.log('❌ Invalid or expired trap:', trapId);
        res.status(404).send('لینک منقضی شده یا نامعتبر است');
    }
});

// Redirect old game route to new terminal route
app.get('/game/:userId', (req, res) => {
    res.redirect(`/terminal/${req.params.userId}`);
});

// Holographic game route (for testing)
app.get('/game_holographic/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Get user info
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.redirect('/');
        }
        
        const user = users[0];
        
        // Get or create game state
        let [gameStates] = await db.execute('SELECT * FROM game_states WHERE user_id = ?', [userId]);
        if (gameStates.length === 0) {
            await db.execute('INSERT INTO game_states (user_id) VALUES (?)', [userId]);
            [gameStates] = await db.execute('SELECT * FROM game_states WHERE user_id = ?', [userId]);
        }
        
        const gameState = gameStates[0];
        
        res.render('game_holographic', {
            user: user,
            userId: userId,
            username: user.username,
            gameState: gameState
        });
    } catch (error) {
        console.error('❌ Error loading holographic game:', error);
        res.redirect('/');
    }
});

// Debug game page
app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'debug_game.html'));
});

// Get preloaded files for admin
app.get('/api/preloaded-files', async (req, res) => {
    try {
        const [files] = await db.execute(
            'SELECT * FROM preuploaded_files WHERE is_active = TRUE ORDER BY category, name'
        );
        res.json({ success: true, files: files });
    } catch (error) {
        console.error('❌ Error fetching preloaded files:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Provide students list for the student profiles widget (optional classId filter)
app.get('/api/students', async (req, res) => {
    try {
        const { classId } = req.query;
        if (!classId) {
            // برای امنیت، بدون کلاس هیچ داده‌ای برگردانده نشود
            return res.json({ success: true, students: [] });
        }
        const [rows] = await db.execute(
            'SELECT id, name, photo_filename AS photo, class_id FROM students WHERE class_id = ? ORDER BY name',
            [classId]
        );
        const students = rows.map(r => ({ id: r.id, name: r.name, photo: r.photo, classId: r.class_id }));
        res.json({ success: true, students });
    } catch (error) {
        // اگر جدول وجود ندارد یا خطا داد، آرایه خالی برگردان
        console.warn('⚠️ /api/students fallback (empty list):', error.message || error);
        res.json({ success: true, students: [] });
    }
});

// ========== Admin: Students CRUD ==========
// Create or update student
app.post('/api/admin/students', async (req, res) => {
    try {
        const { id, name, photo, classId } = req.body || {};
        if (!name) return res.status(400).json({ success: false, error: 'name is required' });
        const photoFile = photo || null; // nullable
        const class_id = classId || null; // nullable

        if (id) {
            await db.execute(
                'UPDATE students SET name = ?, photo_filename = ?, class_id = ? WHERE id = ?',
                [name, photoFile, class_id, id]
            );
            return res.json({ success: true, id });
        } else {
            const [result] = await db.execute(
                'INSERT INTO students (name, photo_filename, class_id) VALUES (?, ?, ?)',
                [name, photoFile, class_id]
            );
            return res.json({ success: true, id: result.insertId });
        }
    } catch (error) {
        console.error('❌ /api/admin/students error:', error);
        return res.status(500).json({ success: false, error: 'database error' });
    }
});

// Delete student
app.delete('/api/admin/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM students WHERE id = ?', [id]);
        return res.json({ success: true });
    } catch (error) {
        console.error('❌ DELETE /api/admin/students/:id error:', error);
        return res.status(500).json({ success: false, error: 'database error' });
    }
});

// Admin panel (hidden path)
// GET: if no key, show password form; if key=110, render admin
app.get('/gostantaniye', async (req, res) => {
    try {
        const key = (req.query && req.query.key) || req.headers['x-admin-key'];
        if (key !== '110') {
            return res.render('admin-login');
        }
        const [users] = await db.execute(
            'SELECT id, username, created_at, is_online, unread_count FROM users ORDER BY created_at DESC'
        );
        return res.render('admin', { users });
    } catch (error) {
        console.error('❌ Admin page error:', error);
        return res.status(500).send('Database error');
    }
});

// POST: validate admin password and redirect to key-protected view
app.post('/gostantaniye', async (req, res) => {
    try {
        const pwd = (req.body && req.body.password) ? String(req.body.password).trim() : '';
        if (pwd === '110') {
            return res.redirect('/gostantaniye?key=110');
        }
        return res.status(403).render('admin-login', { error: '⚠️ دسترسی غیر مجاز' });
    } catch (e) {
        console.error('❌ Admin login error:', e);
        return res.status(500).render('admin-login', { error: '⚠️ دسترسی غیر مجاز' });
    }
});

// Decoy routes (do not redirect old paths). Show harmless page.
app.get(['/admin', '/administrator', '/dashboard', '/control', '/panel'], (req, res) => {
    res.render('decoy');
});

// File upload endpoint (main chat)
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { userId, senderType } = req.body;
        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype;
        
        // Save file message to database
        const [result] = await db.execute(
            'INSERT INTO messages (user_id, sender_type, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
            [userId, senderType || 'user', '', fileUrl, fileType]
        );
        
        const messageData = {
            id: result.insertId,
            user_id: parseInt(userId),
            sender_type: senderType || 'user',
            content: '',
            file_url: fileUrl,
            file_type: fileType,
            timestamp: new Date().toISOString()
        };
        
        // Broadcast to user room and admin room
        console.log('📡 ارسال پیام فایل به اتاق‌ها:', {
            userRoom: `user_${userId}`,
            messageData: messageData
        });
        io.to(`user_${userId}`).emit('new_message', messageData);
        io.to('admins').emit('new_message', messageData);
        
        console.log(`📎 File uploaded: ${req.file.originalname} by user ${userId}`);
        
        // If this is a mission video (moveX.mp4), update mission progress
        try {
            const match = req.file.originalname.match(/move(\d{1,2})\.mp4/i);
            if (match) {
                const detectedMove = `move${parseInt(match[1], 10)}`;
                console.log('🎯 Mission video detected from upload:', detectedMove, 'for user:', userId);
                
                const [rows] = await db.execute(
                    'SELECT completed_stages FROM game_states WHERE user_id = ?',
                    [userId]
                );
                
                let completed = [];
                if (rows.length > 0 && rows[0].completed_stages) {
                    try { completed = JSON.parse(rows[0].completed_stages) || []; } catch { completed = []; }
                }
                if (!Array.isArray(completed)) completed = [];
                
                const prevCount = completed.length;
                if (!completed.includes(detectedMove)) {
                    completed.push(detectedMove);
                }
                const newCount = completed.length;
                const previousProgress = Math.min(prevCount * 8, 90);
                const newProgress = Math.min(newCount * 8, 90);
                
                if (rows.length > 0) {
                    await db.execute(
                        'UPDATE game_states SET completed_stages = ? WHERE user_id = ?',
                        [JSON.stringify(completed), userId]
                    );
                } else {
                    await db.execute(
                        'INSERT INTO game_states (user_id, completed_stages) VALUES (?, ?)',
                        [userId, JSON.stringify(completed)]
                    );
                }
                
                io.to(`user_${userId}`).emit('update_mission_progress', {
                    progress: newProgress,
                    previousProgress
                });
                console.log(`✅ Mission progress from upload: ${previousProgress}% → ${newProgress}% (user ${userId})`);
            }
        } catch (uploadProgressErr) {
            console.error('❌ Error updating mission progress from upload:', uploadProgressErr);
        }
        
        res.json({ 
            success: true, 
            fileUrl: fileUrl,
            messageId: result.insertId
        });
        
    } catch (error) {
        console.error('❌ File upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ========== SOCKET.IO HANDLING ==========

// Global variables for socket management
let connectedUsers = new Map(); // userId -> socket
let adminSockets = new Set();
const lobbies = {}; // classId -> { members: { [userId]: { state, data } } }
const userSockets = {}; // userId -> socket.id
// New dossier system (parallel to legacy lobby to allow safe migration)
let pendingDossiers = {}; // dossierId -> { dossierId, userId, username, files: [{id,url,state}] }
const userToDossierId = new Map(); // userId -> dossierId (group all submissions per user)
const userSocketsMap = new Map(); // Map<userId, socketId>

// Helper function to find user socket
function findUserSocket(userId) {
    return connectedUsers.get(userId.toString());
}

// Verify user by access_code against DB (classId ignored for compatibility if not present)
async function verifyUserByAccessCode(access_code, classId) {
    try {
        if (!access_code || String(access_code).trim() === '') return null;
        const [rows] = await db.execute('SELECT id, username FROM users WHERE access_code = ?', [String(access_code).trim()]);
        if (!rows || rows.length === 0) return null;
        const user = rows[0];
        // If you later add a class_id column, you can enforce class matching here.
        return { id: user.id, username: user.username };
    } catch (e) {
        console.warn('⚠️ verifyUserByAccessCode failed:', e.message || e);
        return null;
    }
}

// Ensure independent table for senior detective chat
let seniorTableInit = false;
async function ensureSeniorMessagesTable() {
    if (seniorTableInit) return;
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS senior_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                sender_type ENUM('user','senior') NOT NULL,
                content TEXT NOT NULL,
                file_url VARCHAR(500) NULL,
                file_type VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_senior_user_created (user_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        seniorTableInit = true;
    } catch (e) {
        console.error('❌ init senior_messages failed:', e);
    }
}

io.on('connection', (socket) => {
    console.log('🔗 New connection:', socket.id);
    // Role declaration (optional API compatibility)
    socket.on('declare_role', ({ role, userId }) => {
        try {
            if (role === 'admin') {
                socket.join('admins');
            } else if (role === 'senior_admin') {
                socket.join('senior_admins');
            } else if (role === 'user' && userId) {
                userSockets[String(userId)] = socket.id;
            }
        } catch (_) {}
    });

    // ===== Senior Detective Chat (independent, shared for user/admin) =====
    socket.on('senior_get_history', async (data) => {
        try {
            const uid = data && data.userId;
            if (!uid) return;
            await ensureSeniorMessagesTable();
            const [rows] = await db.execute(
                'SELECT id, user_id, sender_type, content, file_url, file_type, created_at AS timestamp FROM senior_messages WHERE user_id = ? ORDER BY created_at ASC',
                [uid]
            );
            socket.emit('senior_history', rows);
        } catch (error) {
            console.error('❌ Error loading senior chat history:', error);
            socket.emit('senior_history', []);
        }
    });

    socket.on('senior_user_message', async (messageData) => {
        try {
            const uid = messageData && messageData.userId;
            const content = (messageData && messageData.content) || '';
            if (!uid || !content) return;
            await ensureSeniorMessagesTable();
            const fileUrl = messageData.fileUrl || null;
            const fileType = messageData.fileType || null;
            const [result] = await db.execute(
                'INSERT INTO senior_messages (user_id, sender_type, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
                [uid, 'user', content, fileUrl, fileType]
            );
            const fullMessageData = {
                id: result.insertId,
                user_id: parseInt(uid),
                sender_type: 'user',
                content,
                file_url: fileUrl,
                file_type: fileType,
                timestamp: new Date().toISOString()
            };
            // Increase unread_count for this user and notify admins (main + senior)
            try {
                await db.execute('UPDATE users SET unread_count = COALESCE(unread_count,0) + 1 WHERE id = ?', [uid]);
                const [rows] = await db.execute('SELECT unread_count FROM users WHERE id = ?', [uid]);
                const unreadCount = (rows && rows[0] && rows[0].unread_count != null) ? Number(rows[0].unread_count) : 0;
                const payload = {
                    userId: Number(uid),
                    unreadCount,
                    unread_count: unreadCount
                };
                io.to('admins').emit('unread_count_update', payload);
                io.to('senior_admins').emit('unread_count_update', payload);
            } catch (e) {
                console.warn('⚠️ senior_user_message unread_count_update failed:', e.message || e);
            }
            // Notify senior admins and target user
            io.to('senior_admins').emit('senior_new_message', fullMessageData);
            const sid = userSockets[String(uid)] || userSocketsMap.get(Number(uid));
            if (sid) io.to(sid).emit('senior_new_message', fullMessageData);
        } catch (error) {
            console.error('❌ Error sending senior user message:', error);
        }
    });

    socket.on('senior_admin_message', async (messageData) => {
        try {
            const uid = messageData && messageData.userId;
            const content = (messageData && messageData.content) || '';
            if (!uid || !content) return;
            await ensureSeniorMessagesTable();
            const fileUrl = messageData.fileUrl || null;
            const fileType = messageData.fileType || null;
            const [result] = await db.execute(
                'INSERT INTO senior_messages (user_id, sender_type, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
                [uid, 'senior', content, fileUrl, fileType]
            );
            const fullMessageData = {
                id: result.insertId,
                user_id: parseInt(uid),
                sender_type: 'senior',
                content,
                file_url: fileUrl,
                file_type: fileType,
                timestamp: new Date().toISOString()
            };
            // برای همه ادمین‌های ارشد و کاربر هدف
            io.to('senior_admins').emit('senior_new_message', fullMessageData);
            const sid = userSockets[String(uid)] || userSocketsMap.get(Number(uid));
            if (sid) io.to(sid).emit('senior_new_message', fullMessageData);
        } catch (error) {
            console.error('❌ Error sending senior admin message:', error);
        }
    });

    socket.on('senior_admin_delete_message', async (data) => {
        try {
            const rawId = data && data.messageId;
            const messageId = Number.parseInt(rawId, 10);
            if (!Number.isFinite(messageId)) return;
            let uid = null;
            try {
                const [rows] = await db.execute('SELECT user_id FROM senior_messages WHERE id = ?', [messageId]);
                if (rows && rows.length) uid = rows[0].user_id;
            } catch (_) {}
            await db.execute('DELETE FROM senior_messages WHERE id = ?', [messageId]);
            io.to('senior_admins').emit('senior_message_deleted', { messageId });
            if (uid != null) {
                const sid = userSockets[String(uid)] || userSocketsMap.get(Number(uid));
                if (sid) io.to(sid).emit('senior_message_deleted', { messageId });
            }
        } catch (e) {
            console.error('❌ senior_admin_delete_message failed:', e);
        }
    });

    socket.on('senior_admin_edit_message', async (data) => {
        try {
            const rawId = data && data.messageId;
            const messageId = Number.parseInt(rawId, 10);
            const content = data && typeof data.content === 'string' ? data.content : null;
            if (!Number.isFinite(messageId) || content === null) return;
            let uid = null;
            try {
                const [rows] = await db.execute('SELECT user_id FROM senior_messages WHERE id = ?', [messageId]);
                if (rows && rows.length) uid = rows[0].user_id;
            } catch (_) {}
            await db.execute('UPDATE senior_messages SET content = ? WHERE id = ?', [content, messageId]);
            io.to('senior_admins').emit('senior_message_edited', { messageId, content });
            if (uid != null) {
                const sid = userSockets[String(uid)] || userSocketsMap.get(Number(uid));
                if (sid) io.to(sid).emit('senior_message_edited', { messageId, content });
            }
        } catch (e) {
            console.error('❌ senior_admin_edit_message failed:', e);
        }
    });
    // New minimal mappings for dossier system
    socket.on('register_user_socket', ({ userId }) => {
        try { if (userId) userSocketsMap.set(Number(userId), socket.id); } catch(_) {}
    });
    socket.on('admin_register', () => {
        try {
            socket.join('admins');
            socket.emit('initial_dossiers', Object.values(pendingDossiers));
        } catch(_) {}
    });
    
    // ========== LOBBY & VALIDATION EVENTS ==========
    socket.on('register_socket', ({ userId, classId }) => {
        try {
            if (userId) {
                userSockets[String(userId)] = socket.id;
                try { userSocketsMap.set(Number(userId), socket.id); } catch(_) {}
            }
            if (classId) {
                const roomName = `lobby_${classId}`;
                socket.join(roomName);
                if (lobbies[classId] && lobbies[classId].members) {
                    const snapshot = Object.values(lobbies[classId].members)
                        .filter(m => m.state === 'Approved')
                        .map(m => m.data);
                    socket.emit('lobby_snapshot', snapshot);
                }
            }
        } catch (e) { console.warn('register_socket error:', e.message || e); }
    });

    socket.on('request_validation', async ({ classId, access_code, imageUrl }) => {
        try {
            const user = await verifyUserByAccessCode(access_code, classId);
            if (!user) {
                return socket.emit('validation_result', { success: false, message: 'کد دسترسی نامعتبر است.' });
            }
            // Ensure lobby structure
            if (!lobbies[classId]) lobbies[classId] = { members: {} };
            // Track mapping
            userSockets[String(user.id)] = socket.id;
            try { socket.join(`lobby_${classId}`); } catch {}
            lobbies[classId].members[user.id] = {
                state: 'PendingValidation',
                data: { id: user.id, name: user.username, scanUrls: imageUrl ? [imageUrl] : [] }
            };
            // Build files objects for admin UI (doc-<index>)
            const files = (imageUrl ? [imageUrl] : []).map((u, i) => ({ id: `doc-${i}`, url: u }));
            lobbies[classId].members[user.id].docFiles = files;
            socket.emit('validation_pending', { message: 'هویت شما برای اپراتور ارسال شد. منتظر تایید...', userId: user.id });
            io.to('admins').emit('new_validation_request', { classId, user: lobbies[classId].members[user.id].data, scanUrls: lobbies[classId].members[user.id].data.scanUrls, files });
            // NEW: برای هر کاربر فقط آخرین سری مدارک در صف تایید نگهداری می‌شود
            try {
                const numericUserId = Number(user.id);
                const existingId = userToDossierId.get(numericUserId);
                if (existingId && pendingDossiers[existingId]) {
                    delete pendingDossiers[existingId];
                    io.to('admins').emit('dossier_removed', { dossierId: existingId });
                }

                const dossierId = `dossier-${user.id}-${Date.now()}`;
                pendingDossiers[dossierId] = {
                    dossierId,
                    userId: numericUserId,
                    username: user.username,
                    files: files.map(f => ({ id: f.id, url: f.url, state: 'pending' }))
                };
                userToDossierId.set(numericUserId, dossierId);
                io.to('admins').emit('new_dossier', pendingDossiers[dossierId]);
            } catch (_) {}
        } catch (e) {
            console.error('request_validation error:', e);
            socket.emit('validation_result', { success: false, message: 'خطای سرور در درخواست تایید.' });
        }
    });

    // NEW: process single scan (single-image flow)
    socket.on('process_scan', async ({ classId, access_code, imageUrl }) => {
        try {
            if (!classId || !access_code || !imageUrl) return;
            const user = await verifyUserByAccessCode(access_code, classId);
            if (!user) return socket.emit('scan_rejected', { message: 'کد دسترسی نامعتبر.' });
            if (!lobbies[classId]) lobbies[classId] = { members: {} };
            userSockets[String(user.id)] = socket.id;
            try { socket.join(`lobby_${classId}`); } catch {}
            const data = {
                id: user.id,
                name: user.username,
                avatarUrl: user.photo_filename,
                scanUrl: imageUrl,
                scanUrls: [imageUrl]
            };
            lobbies[classId].members[user.id] = { state: 'PendingValidation', data };
            socket.emit('scan_pending', { message: 'تصویر شما برای تایید ارسال شد. لطفاً منتظر بمانید...' });
            const files = [{ id: 'doc-0', url: imageUrl }];
            io.to('admins').emit('new_validation_request', { classId, user: data, scanUrls: data.scanUrls, files });
            // NEW: برای هر کاربر فقط آخرین سری مدارک در صف تایید نگهداری می‌شود
            try {
                const numericUserId = Number(user.id);
                const existingId = userToDossierId.get(numericUserId);
                if (existingId && pendingDossiers[existingId]) {
                    delete pendingDossiers[existingId];
                    io.to('admins').emit('dossier_removed', { dossierId: existingId });
                }

                const dossierId = `dossier-${user.id}-${Date.now()}`;
                pendingDossiers[dossierId] = {
                    dossierId,
                    userId: numericUserId,
                    username: user.username,
                    files: files.map(f => ({ id: f.id, url: f.url, state: 'pending' }))
                };
                userToDossierId.set(numericUserId, dossierId);
                io.to('admins').emit('new_dossier', pendingDossiers[dossierId]);
            } catch (_) {}
        } catch (e) {
            console.warn('process_scan error:', e.message || e);
        }
    });

    // Approve/Reject document by documentId (API compatibility)
    socket.on('admin_approve_document', async ({ classId, userId, documentId }) => {
        try {
            if (!classId || !userId || !documentId) return;
            const entry = lobbies[classId] && lobbies[classId].members ? lobbies[classId].members[userId] : null;
            if (!entry || !Array.isArray(entry.docFiles)) return;
            const f = entry.docFiles.find(x => x.id === documentId);
            if (!f) return;
            // Apply same logic as admin_approve_image
            if (!lobbies[classId]) lobbies[classId] = { members: {} };
            let memberInfo = lobbies[classId].members[userId];
            if (!memberInfo) {
                let username = 'Agent ' + String(userId);
                try {
                    const [rows] = await db.execute('SELECT username FROM users WHERE id = ? LIMIT 1', [userId]);
                    if (rows && rows[0] && rows[0].username) username = rows[0].username;
                } catch (_) {}
                memberInfo = lobbies[classId].members[userId] = {
                    state: 'Approved',
                    data: { id: Number(userId), name: username, scanUrls: [f.url] }
                };
            } else {
                memberInfo.state = 'Approved';
                memberInfo.data = memberInfo.data || { id: Number(userId), name: 'Agent ' + String(userId), scanUrls: [] };
                memberInfo.data.scanUrls = [f.url];
            }
            // Notify the target user
            const sid = userSockets[String(userId)];
            if (sid) {
                const uSock = io.sockets.sockets.get(sid);
                if (uSock) {
                    uSock.emit('validation_result', { success: true, message: 'یکی از تصاویر شما تایید شد.' });
                    io.to(sid).emit('document_approved', { documentId });
                }
            }
            // Broadcast to lobby
            io.to(`lobby_${classId}`).emit('member_approved', { member: lobbies[classId].members[userId].data });
        } catch (e) { console.warn('admin_approve_document error:', e.message || e); }
    });
    socket.on('admin_reject_document', ({ classId, userId, documentId }) => {
        try {
            const sid = userSockets[String(userId)];
            if (sid) io.to(sid).emit('document_rejected', { documentId });
        } catch (e) { console.warn('admin_reject_document error:', e.message || e); }
    });
    socket.on('admin_grant_access', ({ userId, classId, chatUrl }) => {
        try {
            // اگر URL سفارشی داده شده باشد، همان استفاده می‌شود، در غیر این صورت به صفحه انتقال ارشد هدایت می‌کنیم
            const defaultUrl = `/KaragahArshad/transfer/${userId}`;
            const targetUrl = (typeof chatUrl === 'string' && chatUrl.trim()) ? chatUrl : defaultUrl;
            // Legacy userSockets map
            const sid = userSockets[String(userId)];
            if (sid) io.to(sid).emit('access_granted', { userId, chatUrl: targetUrl });
            // New map for dossier system
            const mapped = userSocketsMap.get(Number(userId));
            if (mapped) io.to(mapped).emit('access_granted', { userId, chatUrl: targetUrl });
            // Fallback finder
            const uSock = findUserSocket(userId);
            if (uSock) io.to(uSock.id).emit('access_granted', { userId, chatUrl: targetUrl });
            // Optional: update lobby state and broadcast
            if (classId && lobbies[classId] && lobbies[classId].members && lobbies[classId].members[userId]) {
                try {
                    lobbies[classId].members[userId].state = 'Granted';
                    io.to(`lobby_${classId}`).emit('member_granted', { member: lobbies[classId].members[userId].data });
                } catch(_) {}
            }
            // Fallback broadcast to lobby (client will validate userId before redirect)
            try { io.to(`lobby_${classId || 'default'}`).emit('access_granted', { userId, chatUrl: targetUrl }); } catch(_) {}
            io.to('admins').emit('request_processed', { userId });
        } catch (e) { console.warn('admin_grant_access error:', e.message || e); }
    });

    // NEW: Admin approves/rejects entire user (not per-image)
    socket.on('admin_approve_user', ({ classId, userId }) => {
        try {
            if (!classId || !userId) return;
            const entry = lobbies[classId] && lobbies[classId].members ? lobbies[classId].members[userId] : null;
            if (!entry) return;
            entry.state = 'Approved';
            const sid = userSockets[String(userId)];
            if (sid) io.to(sid).emit('validation_result', { success: true, message: 'هویت شما تایید شد.' });
            io.to(`lobby_${classId}`).emit('member_approved', { member: entry.data });
            io.to('admins').emit('request_processed', { userId });
        } catch (e) { console.warn('admin_approve_user error:', e.message || e); }
    });

    socket.on('admin_reject_user', ({ classId, userId, reason }) => {
        try {
            if (!classId || !userId) return;
            const entry = lobbies[classId] && lobbies[classId].members ? lobbies[classId].members[userId] : null;
            if (!entry) return;
            entry.state = 'Rejected';
            const sid = userSockets[String(userId)];
            if (sid) {
                io.to(sid).emit('validation_result', { success: false, message: reason || 'هویت شما رد شد. لطفاً دوباره تلاش کنید.' });
                io.to(sid).emit('scan_rejected', { message: reason || 'درخواست شما رد شد.' });
            }
            io.to('admins').emit('request_processed', { userId });
        } catch (e) { console.warn('admin_reject_user error:', e.message || e); }
    });

    socket.on('submit_dossier', async ({ access_code, files }) => {
        try {
            const user = await verifyUserByAccessCode(access_code);
            if (!user) {
                return socket.emit('dossier_result', { success: false, message: 'کد دسترسی نامعتبر' });
            }
            userSocketsMap.set(Number(user.id), socket.id);
            const normalized = Array.isArray(files) ? files : [];
            const fileObjs = normalized.map((f, idx) => {
                const url = (f && typeof f === 'object') ? (f.url || '') : String(f || '');
                const id = (f && typeof f === 'object' && f.id) ? String(f.id) : `doc-${Date.now()}-${idx}`;
                return { id, url, state: 'pending' };
            }).filter(x => x.url);
            // همیشه فقط آخرین سری مدارک کاربر در صف باقی می‌ماند
            const numericUserId = Number(user.id);
            const existingId = userToDossierId.get(numericUserId);
            if (existingId && pendingDossiers[existingId]) {
                delete pendingDossiers[existingId];
                io.to('admins').emit('dossier_removed', { dossierId: existingId });
            }

            const dossierId = `dossier-${user.id}-${Date.now()}`;
            const newDossier = {
                dossierId,
                userId: numericUserId,
                username: user.username,
                files: fileObjs
            };
            pendingDossiers[dossierId] = newDossier;
            userToDossierId.set(numericUserId, dossierId);
            io.to('admins').emit('new_dossier', newDossier);
            // ارسال userId به کلاینت جهت فیلتر کردن رویدادهای بعدی
            socket.emit('user_identity', { userId: numericUserId });
            socket.emit('dossier_result', { success: true, message: 'پرونده برای بررسی ارسال شد.' });
        } catch (e) {
            console.error('submit_dossier (new) error:', e);
            socket.emit('dossier_result', { success: false, message: 'خطای سرور' });
        }
    });

    socket.on('admin_update_document_state', ({ dossierId, documentId, newState }) => {
        try {
            const dossier = pendingDossiers[dossierId];
            if (!dossier) return;
            const idx = dossier.files.findIndex(f => String(f.id) === String(documentId));
            if (idx === -1) return;
            const target = dossier.files[idx];
            const finalState = newState === 'approved' ? 'approved' : 'rejected';
            target.state = finalState;
            // notify target user
            const uSockId = userSocketsMap.get(Number(dossier.userId));
            if (uSockId) io.to(uSockId).emit('document_state_updated', { userId: dossier.userId, documentId: target.id, newState: finalState, url: target.url });
            // فالبک: انتشار برای لابی پیش‌فرض تا در صورت عدم نگاشت سوکت، کلاینت‌ها شنود کنند و با userId فیلتر کنند
            try { io.to('lobby_default').emit('document_state_updated', { userId: dossier.userId, documentId: target.id, newState: finalState, url: target.url }); } catch(_) {}
            // compute remaining pending in this dossier (do not remove item; keep history)
            const remaining = dossier.files.filter(f => f.state !== 'approved' && f.state !== 'rejected').length;
            io.to('admins').emit('dossier_updated', { dossierId, documentId: target.id, newState: finalState, remaining });
            if (remaining === 0) {
                dossier.completed = true;
                io.to('admins').emit('dossier_completed', { dossierId });
            }
        } catch(_) {}
    });

    socket.on('admin_approve', ({ classId, userId }) => {
        try {
            const memberInfo = lobbies[classId] && lobbies[classId].members ? lobbies[classId].members[userId] : null;
            if (!memberInfo) return;
            memberInfo.state = 'Approved';
            const sid = userSockets[String(userId)];
            const uSock = sid ? io.sockets.sockets.get(sid) : findUserSocket(userId);
            if (uSock) {
                uSock.emit('validation_result', { success: true, message: 'هویت شما تایید شد.' });
            }
            io.to(`lobby_${classId}`).emit('member_approved', { member: memberInfo.data });
            io.to('admins').emit('request_processed', { userId });
        } catch (e) { console.warn('admin_approve error:', e.message || e); }
    });

    socket.on('admin_reject', ({ classId, userId }) => {
        try {
            const memberInfo = lobbies[classId] && lobbies[classId].members ? lobbies[classId].members[userId] : null;
            if (!memberInfo) return;
            memberInfo.state = 'Rejected';
            const sid = userSockets[String(userId)];
            const uSock = sid ? io.sockets.sockets.get(sid) : findUserSocket(userId);
            if (uSock) {
                uSock.emit('validation_result', { success: false, message: 'هویت شما رد شد. لطفاً دوباره تلاش کنید.' });
            }
            io.to('admins').emit('request_processed', { userId });
        } catch (e) { console.warn('admin_reject error:', e.message || e); }
    });

    // Approve a single image from a dossier (per-image approval)
    socket.on('admin_approve_image', async ({ classId, userId, imageUrl }) => {
        try {
            if (!classId || !userId || !imageUrl) return;
            if (!lobbies[classId]) lobbies[classId] = { members: {} };
            // Ensure member entry with username
            let memberInfo = lobbies[classId].members[userId];
            if (!memberInfo) {
                let username = 'Agent ' + String(userId);
                try {
                    const [rows] = await db.execute('SELECT username FROM users WHERE id = ? LIMIT 1', [userId]);
                    if (rows && rows[0] && rows[0].username) username = rows[0].username;
                } catch (_) {}
                memberInfo = lobbies[classId].members[userId] = {
                    state: 'Approved',
                    data: { id: Number(userId), name: username, scanUrls: [imageUrl] }
                };
            } else {
                memberInfo.state = 'Approved';
                memberInfo.data = memberInfo.data || { id: Number(userId), name: 'Agent ' + String(userId), scanUrls: [] };
                memberInfo.data.scanUrls = [imageUrl];
            }
            // Notify the target user (optional)
            const sid = userSockets[String(userId)];
            if (sid) {
                const uSock = io.sockets.sockets.get(sid);
                if (uSock) uSock.emit('validation_result', { success: true, message: 'یکی از تصاویر شما تایید شد.' });
            }
            // Broadcast to lobby with the approved image
            io.to(`lobby_${classId}`).emit('member_approved', { member: lobbies[classId].members[userId].data });
        } catch (e) {
            console.warn('admin_approve_image error:', e.message || e);
        }
    });
    
    // Handle admin connections
    if (socket.handshake.query.isAdmin === 'true') {
        socket.join('admins');
        socket.join('senior_admins'); // ارشد هم روی همین سوکت است
        console.log('👨‍💼 Admin connected:', socket.id);
        
        // Send users list to admin
        socket.on('get_users_list', async () => {
            try {
                const [users] = await db.execute(
                    'SELECT id, username, comment, created_at, is_online, chat_enabled, unread_count FROM users ORDER BY created_at DESC'
                );
                socket.emit('users_list', users);
            } catch (error) {
                console.error('❌ Error fetching users:', error);
            }
        });
        
        // Load chat history for selected user
        socket.on('load_chat_history', async (data) => {
            try {
                console.log('📚 Loading chat history for user:', data.userId);
                const [messages] = await db.execute(
                    'SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp ASC',
                    [data.userId]
                );
                console.log('📋 Found messages:', messages.length);
                socket.emit('chat_history', messages);
            } catch (error) {
                console.error('❌ Error loading chat history:', error);
                socket.emit('chat_history', []);
            }
        });

        // Handle admin messages
        socket.on('admin_message', async (messageData) => {
            try {
                const fileUrlNorm = (messageData.fileUrl || messageData.file_url) || null;
                const fileTypeNorm = (messageData.fileType || messageData.file_type) || null;
                const [result] = await db.execute(
                    'INSERT INTO messages (user_id, sender_type, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
                    [messageData.userId, messageData.senderType, messageData.content, fileUrlNorm, fileTypeNorm]
                );
                
                const fullMessageData = {
                    id: result.insertId,
                    user_id: parseInt(messageData.userId),
                    sender_type: messageData.senderType,
                    content: messageData.content,
                    file_url: fileUrlNorm,
                    file_type: fileTypeNorm,
                    timestamp: new Date().toISOString(),
                    is_scrambled: messageData.isScrambled || false
                };
                
                // بررسی پیام فعال‌سازی هک
                if (messageData.content && messageData.content.includes('data-is-hack-trigger="true"')) {
                    console.log('🎭 پیام فعال‌سازی هک شناسایی شد برای کاربر:', messageData.userId);
                    
                    // تغییر وضعیت کاربر به "hacked"
                    await db.execute(
                        'UPDATE users SET hack_status = ? WHERE id = ?',
                        ['hacked', messageData.userId]
                    );
                    
                    console.log('✅ وضعیت کاربر به "hacked" تغییر یافت');
                }
                
                // بررسی ویدیوهای ماموریت و به‌روزرسانی پیشرفت (بر اساس completed_stages)
                const extractMoveFromText = (text) => {
                    if (!text) return null;
                    const m = text.match(/move(\d{1,2})\.mp4/i);
                    return m ? `move${parseInt(m[1], 10)}` : null;
                };

                const moveFromUrl = extractMoveFromText(messageData.fileUrl || '');
                const moveFromContent = extractMoveFromText(messageData.content || '');
                const detectedMove = moveFromUrl || moveFromContent; // اولویت با fileUrl

                console.log('🔍 بررسی ویدیوی ماموریت:');
                console.log('   - fileUrl:', messageData.fileUrl);
                console.log('   - content:', messageData.content ? messageData.content.substring(0, 100) + '...' : 'null');
                console.log('   - detectedMove:', detectedMove);
                
                if (detectedMove) {
                    console.log('🎯 ویدیوی ماموریت شناسایی شد برای کاربر:', messageData.userId, 'move:', detectedMove);
                    
                    try {
                        // خواندن وضعیت فعلی مراحل تکمیل شده
                        const [rows] = await db.execute(
                            'SELECT completed_stages FROM game_states WHERE user_id = ?',
                            [messageData.userId]
                        );
                        
                        let completed = [];
                        if (rows.length > 0 && rows[0].completed_stages) {
                            try { completed = JSON.parse(rows[0].completed_stages) || []; } catch { completed = []; }
                        }
                        if (!Array.isArray(completed)) completed = [];
                        
                        const prevCount = completed.length;
                        if (!completed.includes(detectedMove)) {
                            completed.push(detectedMove);
                        }
                        
                        const newCount = completed.length;
                        const previousProgress = Math.min(prevCount * 8, 90);
                        const newProgress = Math.min(newCount * 8, 90);
                        
                        // ذخیره مراحل تکمیل شده
                        if (rows.length > 0) {
                            await db.execute(
                                'UPDATE game_states SET completed_stages = ? WHERE user_id = ?',
                                [JSON.stringify(completed), messageData.userId]
                            );
                        } else {
                            await db.execute(
                                'INSERT INTO game_states (user_id, completed_stages) VALUES (?, ?)',
                                [messageData.userId, JSON.stringify(completed)]
                            );
                        }
                        
                        // ارسال رویداد به‌روزرسانی پیشرفت به کاربر
                        io.to(`user_${messageData.userId}`).emit('update_mission_progress', {
                            progress: newProgress,
                            previousProgress
                        });
                        console.log(`✅ پیشرفت ماموریت کاربر ${messageData.userId}: ${previousProgress}% → ${newProgress}% (Stages: ${newCount})`);
                    } catch (progressError) {
                        console.error('❌ خطا در به‌روزرسانی پیشرفت ماموریت:', progressError);
                    }
                }
                
                // Send scrambled or normal message
                if (messageData.isScrambled) {
                    io.to(`user_${messageData.userId}`).emit('scrambled_message', fullMessageData);
                    console.log(`🔐 Scrambled message sent to user ${messageData.userId}`);
                } else {
                    io.to(`user_${messageData.userId}`).emit('new_message', fullMessageData);
                    console.log(`💬 Admin message sent to user ${messageData.userId}`);
                }
                
                // ادمین‌ها پیام را از طریق chat history می‌بینند، نه real-time
                
            } catch (error) {
                console.error('❌ Error sending admin message:', error);
            }
        });

        // Handle scrambled message requests
        socket.on('send_scrambled_message', async (messageData) => {
            try {
                const [result] = await db.execute(
                    'INSERT INTO messages (user_id, sender_type, content) VALUES (?, ?, ?)',
                    [messageData.userId, messageData.senderType, messageData.content]
                );
                
                const fullMessageData = {
                    id: result.insertId,
                    user_id: parseInt(messageData.userId),
                    sender_type: messageData.senderType,
                    content: messageData.content,
                    timestamp: new Date().toISOString(),
                    is_scrambled: true
                };
                
                // Send scrambled message to user
                io.to(`user_${messageData.userId}`).emit('scrambled_message', fullMessageData);
                io.to('admins').emit('new_message', fullMessageData);
                
                console.log(`🔐 Scrambled message sent to user ${messageData.userId}: ${messageData.content}`);
                
            } catch (error) {
                console.error('❌ Error sending scrambled message:', error);
            }
        });
        
        // Handle get mission progress requests (compute from completed_stages)
        socket.on('get_mission_progress', async (data) => {
            try {
                console.log('📊 درخواست پیشرفت ماموریت برای کاربر:', data.userId);
                
                const [rows] = await db.execute(
                    'SELECT completed_stages FROM game_states WHERE user_id = ?',
                    [data.userId]
                );
                
                let count = 0;
                if (rows.length > 0 && rows[0].completed_stages) {
                    try {
                        const arr = JSON.parse(rows[0].completed_stages) || [];
                        count = Array.isArray(arr) ? arr.length : 0;
                    } catch {
                        count = 0;
                    }
                }
                const currentProgress = Math.min(count * 8, 90);
                console.log(`📊 پیشرفت فعلی کاربر ${data.userId}: ${currentProgress}% (Stages: ${count})`);
                
                // ارسال پیشرفت فعلی به کاربر
                socket.emit('current_mission_progress', { progress: currentProgress });
                
            } catch (error) {
                console.error('❌ خطا در دریافت پیشرفت ماموریت:', error);
                socket.emit('current_mission_progress', { progress: 0 });
            }
        });
        
        // Handle phase changes
        socket.on('change_phase', async (phaseData) => {
            try {
                // Update all users' game states
                await db.execute(
                    'UPDATE game_states SET current_phase = ?',
                    [phaseData.phase]
                );
                
                // Broadcast phase change to all users
                io.emit('phase_changed', phaseData);
                
                console.log(`🎯 Phase changed to: ${phaseData.phase}`);
                
            } catch (error) {
                console.error('❌ Error changing phase:', error);
            }
        });
        
        // Handle broadcast messages
        socket.on('broadcast_message', async (messageData) => {
            try {
                // Get all users
                const [users] = await db.execute('SELECT id FROM users');
                
                // Send message to each user
                for (const user of users) {
                    const [result] = await db.execute(
                        'INSERT INTO messages (user_id, sender_type, content) VALUES (?, ?, ?)',
                        [user.id, messageData.senderType, messageData.content]
                    );
                    
                    const fullMessageData = {
                        id: result.insertId,
                        user_id: user.id,
                        sender_type: messageData.senderType,
                        content: messageData.content,
                        timestamp: new Date().toISOString()
                    };
                    
                    io.to(`user_${user.id}`).emit('new_message', fullMessageData);
                }
                
                console.log(`📢 Broadcast message sent to all users`);
                
            } catch (error) {
                console.error('❌ Error broadcasting message:', error);
            }
        });
        
        // Handle clear chat history
        socket.on('clear_chat_history', async (data) => {
            try {
                await db.execute(
                    'DELETE FROM messages WHERE user_id = ?',
                    [data.userId]
                );
                
                console.log(`🗑️ Chat history cleared for user ${data.userId}`);
                
            } catch (error) {
                console.error('❌ Error clearing chat history:', error);
            }
        });
        
        socket.on('admin_delete_message', async (data) => {
            try {
                const messageId = data && Number.parseInt(data.messageId, 10);
                if (!Number.isFinite(messageId)) {
                    console.warn('⚠️ Invalid messageId for delete:', data);
                    return;
                }
                await db.execute('DELETE FROM messages WHERE id = ?', [messageId]);
                console.log(`🗑️ Message deleted by admin: id=${messageId}`);
                io.emit('message_deleted', { messageId });
            } catch (error) {
                console.error('❌ Error deleting message:', error);
            }
        });

        socket.on('admin_edit_message', async (data) => {
            try {
                const messageId = data && Number.parseInt(data.messageId, 10);
                const content = data && typeof data.content === 'string' ? data.content : null;
                if (!Number.isFinite(messageId) || content === null) return;
                await db.execute('UPDATE messages SET content = ? WHERE id = ?', [content, messageId]);
                io.emit('message_edited', { messageId, content });
            } catch (error) {
                console.error('❌ Error editing message:', error);
            }
        });
        
        // Handle reset hack status
        socket.on('reset_hack_status', async (data) => {
            try {
                await db.execute(
                    'UPDATE users SET hack_status = NULL WHERE id = ?',
                    [data.userId]
                );
                
                console.log(' Reset hack status for user:', data.userId);
                
                // Notify the user
                io.to(`user_${data.userId}`).emit('hack_status_reset');
                
                // Notify all admins
                io.to('admins').emit('hack_status_updated', {
                    userId: data.userId,
                    status: null
                });
                
            } catch (error) {
                console.error(' Error resetting hack status:', error);
            }
        });

        // Handle add new user
        socket.on('add_new_user', async (data) => {
            try {
                const { username, comment, accessCode } = data;
                
                // بررسی وجود کاربر با همین نام
                const [existingUser] = await db.execute(
                    'SELECT id FROM users WHERE username = ?',
                    [username]
                );
                
                if (existingUser.length > 0) {
                    socket.emit('user_added_response', {
                        success: false,
                        message: 'کاربری با این نام قبلاً وجود دارد'
                    });
                    return;
                }
                // بررسی یکتایی access_code
                if (!accessCode || String(accessCode).trim() === '') {
                    socket.emit('user_added_response', { success: false, message: 'کد دسترسی الزامی است' });
                    return;
                }
                const [exCode] = await db.execute('SELECT id FROM users WHERE access_code = ?', [String(accessCode).trim()]);
                if (Array.isArray(exCode) && exCode.length > 0) {
                    socket.emit('user_added_response', { success: false, message: 'این کد قبلاً استفاده شده است' });
                    return;
                }
                
                // افزودن کاربر جدید
                const [result] = await db.execute(
                    'INSERT INTO users (username, comment, access_code, created_at, is_online) VALUES (?, ?, ?, NOW(), 0)',
                    [username, comment, String(accessCode).trim()]
                );
                
                const newUserId = result.insertId;
                
                // ایجاد game_state برای کاربر جدید (سازگار با schema فعلی)
                await db.execute(
                    'INSERT INTO game_states (user_id, current_phase, completed_stages) VALUES (?, ?, ?)',
                    [newUserId, 1, '[]']
                );
                
                console.log('✅ New user added:', username, 'with comment:', comment);
                
                // پاسخ موفقیت‌آمیز
                socket.emit('user_added_response', {
                    success: true,
                    username: username,
                    userId: newUserId
                });
                
                // به‌روزرسانی لیست کاربران برای تمام ادمین‌ها
                const [users] = await db.execute(
                    'SELECT id, username, comment, created_at, is_online, chat_enabled, unread_count FROM users ORDER BY created_at DESC'
                );
                io.to('admins').emit('users_list_updated', users);
                
            } catch (error) {
                console.error('❌ Error adding new user:', error);
                socket.emit('user_added_response', {
                    success: false,
                    message: 'خطا در افزودن کاربر به دیتابیس'
                });
            }
        });

        // Handle hack sequence initiation
        socket.on('start_hack_sequence', async (data) => {
            try {
                console.log('🔴 Admin initiated hack sequence for user:', data.userId);
                
                // Find the target user's socket
                const targetSocket = findUserSocket(data.userId);
                
                if (targetSocket) {
                    // Persist hack status for the user so it survives refresh
                    try {
                        await db.execute('UPDATE users SET hack_status = ? WHERE id = ?', ['hacked', data.userId]);
                        io.to('admins').emit('hack_status_updated', { userId: data.userId, status: 'hacked' });
                    } catch (perr) {
                        console.warn('⚠️ Could not persist hack_status on start_hack_sequence:', perr.message || perr);
                    }
                    // Send hack sequence event to the specific user
                    targetSocket.emit('start_hack_sequence', {
                        message: data.message || 'شروع سکانس هک',
                        timestamp: new Date()
                    });
                    
                    console.log('✅ Hack sequence event sent to user:', data.userId);
                    socket.emit('hack_sequence_initiated', { 
                        success: true, 
                        message: 'سکانس هک با موفقیت شروع شد' 
                    });
                } else {
                    console.log('❌ Target user not found or offline:', data.userId);
                    socket.emit('hack_sequence_initiated', { 
                        success: false, 
                        message: 'کاربر آنلاین نیست' 
                    });
                }
            } catch (error) {
                console.error('❌ Error starting hack sequence:', error);
                socket.emit('hack_sequence_initiated', { 
                    success: false, 
                    message: 'خطا در شروع سکانس هک' 
                });
            }
        });
        
    } else {
        // Handle regular user connections
        const userId = socket.handshake.query.userId;
        const username = socket.handshake.query.username;
        
        if (userId) {
            socket.join(`user_${userId}`);
            console.log(`👤 User connected: ${username} (${userId})`);
            
            // Store user socket in map
            connectedUsers.set(userId.toString(), socket);
            
            // Update user online status
            db.execute('UPDATE users SET is_online = 1 WHERE id = ?', [userId])
                .catch(err => console.error('Error updating online status:', err));
            
            // Send chat history to user
            socket.emit('join_room', { userId: userId });
            
            // Load and send chat history
            db.execute('SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp ASC', [userId])
                .then(([messages]) => {
                    socket.emit('chat_history', messages);
                })
                .catch(err => console.error('Error loading chat history:', err));
            
            // Notify admins of user join
            io.to('admins').emit('user_joined', { 
                userId: userId, 
                username: username 
            });
        }
        
        // Handle hack trap from admin
        socket.on('send_hack_trap', async (data) => {
            console.log('🕷️ Admin sent hack trap:', data);
            console.log('🎯 Target user:', data.targetUserId, data.targetUsername);
            console.log('🎭 Trap message:', data.trapMessage);
            
            try {
                // Generate unique trap ID
                const trapId = 'trap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                // Save trap message to database as admin message
                const [result] = await db.execute(
                    'INSERT INTO messages (user_id, sender_type, content, file_url) VALUES (?, ?, ?, ?)',
                    [data.targetUserId, 'admin', data.trapMessage, `/hack-trigger/${trapId}`]
                );
                
                // Find target user socket
                const targetSocket = Array.from(io.sockets.sockets.values())
                    .find(s => s.userId === data.targetUserId);
                
                if (targetSocket) {
                    // Send trap message to specific user
                    targetSocket.emit('new_message', {
                        id: result.insertId,
                        user_id: data.targetUserId,
                        sender_type: 'admin',
                        content: data.trapMessage,
                        file_url: `/hack-trigger/${trapId}`,
                        file_type: 'hack-trap',
                        created_at: new Date(),
                        username: 'سیستم'
                    });
                    
                    console.log('📡 Hack trap sent to user:', data.targetUsername);
                    
                    // Store trap info for later use
                    global.hackTraps = global.hackTraps || {};
                    global.hackTraps[trapId] = {
                        targetUserId: data.targetUserId,
                        targetUsername: data.targetUsername,
                        adminId: data.adminId,
                        timestamp: data.timestamp,
                        trapMessage: data.trapMessage
                    };
                    
                    // Notify admin of success
                    socket.emit('hack_sequence_initiated', {
                        success: true,
                        targetUser: data.targetUsername,
                        message: `تله هکری برای ${data.targetUsername} ارسال شد`
                    });
                } else {
                    console.log('❌ Target user not found or not connected');
                    
                    // Notify admin of failure
                    socket.emit('hack_sequence_initiated', {
                        success: false,
                        targetUser: data.targetUsername,
                        message: `کاربر ${data.targetUsername} آنلاین نیست`
                    });
                }
            } catch (error) {
                console.error('❌ Error sending hack trap:', error);
                socket.emit('hack_sequence_initiated', {
                    success: false,
                    targetUser: data.targetUsername,
                    message: 'خطا در ارسال تله هکری'
                });
            }
        });

        // Handle user joining room
        socket.on('join_room', async (data) => {
            try {
                console.log('🏠 User joining room:', data.userId, data.username);
                
                // Join user-specific room
                socket.join(`user_${data.userId}`);
                // Register socket to allow admin direct targeting
                try {
                    socket.userId = data.userId;
                    connectedUsers.set(String(data.userId), socket);
                } catch {}
                
                // Update user online status
                await db.execute(
                    'UPDATE users SET is_online = 1 WHERE id = ?',
                    [data.userId]
                );
                
                console.log(`✅ User ${data.userId} joined room user_${data.userId}`);
                
            } catch (error) {
                console.error('❌ Error joining room:', error);
            }
        });

        // Handle get chat history for users (legacy/main chat)
        socket.on('get_chat_history', async (data) => {
            try {
                console.log('📚 User requesting chat history:', data.userId);
                const [messages] = await db.execute(
                    'SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp ASC',
                    [data.userId]
                );
                
                console.log(`📋 Found ${messages.length} messages for user ${data.userId}`);
                socket.emit('chat_history', messages);
                
            } catch (error) {
                console.error('❌ Error loading user chat history:', error);
                socket.emit('chat_history', []);
            }
        });

        // Handle send message for users (normal chat)
        socket.on('send_message', async (messageData) => {
            try {
                // Gate user-originated messages if chat is disabled for this user
                if (messageData && (messageData.senderType === 'user' || messageData.senderType === 'user_senior')) {
                    try {
                        const [perm] = await db.execute('SELECT chat_enabled FROM users WHERE id = ?', [messageData.userId]);
                        if (perm.length && Number(perm[0].chat_enabled) !== 1) {
                            socket.emit('chat_blocked', { reason: 'chat_disabled' });
                            return;
                        }
                    } catch (permErr) {
                        console.warn('⚠️ chat permission check failed:', permErr.message || permErr);
                    }
                }
                const [result] = await db.execute(
                    'INSERT INTO messages (user_id, sender_type, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)',
                    [messageData.userId, messageData.senderType, messageData.content, messageData.fileUrl || null, messageData.fileType || null]
                );
                
                const fullMessageData = {
                    id: result.insertId,
                    user_id: parseInt(messageData.userId),
                    sender_type: messageData.senderType,
                    content: messageData.content,
                    file_url: messageData.fileUrl || null,
                    file_type: messageData.fileType || null,
                    timestamp: new Date().toISOString()
                };
                
                // افزایش تعداد پیام‌های خوانده نشده برای این کاربر (فقط وقتی فرستنده کاربر است)
                if (messageData.senderType === 'user' || messageData.senderType === 'user_senior') {
                    await db.execute(
                        'UPDATE users SET unread_count = unread_count + 1 WHERE id = ?',
                        [messageData.userId]
                    );
                }
                
                // Send only to admins, not back to user (user will see via history)
                io.to('admins').emit('new_message', fullMessageData);
                
                // ارسال به‌روزرسانی تعداد پیام‌های خوانده نشده به ادمین‌ها
                if (messageData.senderType === 'user' || messageData.senderType === 'user_senior') {
                    const [userResult] = await db.execute(
                        'SELECT id, username, unread_count FROM users WHERE id = ?',
                        [messageData.userId]
                    );
                    if (userResult.length > 0) {
                        const updateData = {
                            userId: parseInt(messageData.userId),
                            username: userResult[0].username,
                            unreadCount: userResult[0].unread_count
                        };
                        console.log('🔔 Sending unread_count_update to admins:', updateData);
                        io.to('admins').emit('unread_count_update', updateData);
                    } else {
                        console.error('❌ User not found for unread count update:', messageData.userId);
                    }
                }
                
                console.log(`💬 Message from user ${messageData.userId}: ${messageData.content}`);
                
            } catch (error) {
                console.error('❌ Error sending message:', error);
            }
        });

        // Allow users to request their mission progress (compute from completed_stages)
        socket.on('get_mission_progress', async (data) => {
            try {
                const uid = data && data.userId ? data.userId : userId;
                console.log('📊 User requested mission progress:', uid);
                const [rows] = await db.execute(
                    'SELECT completed_stages FROM game_states WHERE user_id = ?',
                    [uid]
                );
                let count = 0;
                if (rows.length > 0 && rows[0].completed_stages) {
                    try {
                        const arr = JSON.parse(rows[0].completed_stages) || [];
                        count = Array.isArray(arr) ? arr.length : 0;
                    } catch { count = 0; }
                }
                const currentProgress = Math.min(count * 8, 90);
                socket.emit('current_mission_progress', { progress: currentProgress });
            } catch (e) {
                console.error('❌ Error returning mission progress to user:', e);
                socket.emit('current_mission_progress', { progress: 0 });
            }
        });

        // Handle user messages (legacy support)
        socket.on('user_message', async (messageData) => {
            try {
                // Gate user messages if chat is disabled
                try {
                    const [perm] = await db.execute('SELECT chat_enabled FROM users WHERE id = ?', [messageData.userId]);
                    if (perm.length && Number(perm[0].chat_enabled) !== 1) {
                        socket.emit('chat_blocked', { reason: 'chat_disabled' });
                        return;
                    }
                } catch (permErr) {
                    console.warn('⚠️ chat permission check (legacy) failed:', permErr.message || permErr);
                }
                const [result] = await db.execute(
                    'INSERT INTO messages (user_id, sender_type, content) VALUES (?, ?, ?)',
                    [messageData.userId, 'user', messageData.content]
                );
                
                const fullMessageData = {
                    id: result.insertId,
                    user_id: parseInt(messageData.userId),
                    sender_type: 'user',
                    content: messageData.content,
                    timestamp: new Date().toISOString()
                };
                
                // Send only to admins (user already sees their own message)
                io.to('admins').emit('new_message', fullMessageData);
                
                console.log(`💬 User message from ${messageData.userId}: ${messageData.content}`);
                
            } catch (error) {
                console.error('❌ Error sending user message:', error);
            }
        });
    }
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        
        // Update user offline status if it's a user connection
        const userIdFromHandshake = socket.handshake.query.userId;
        const effectiveUserId = userIdFromHandshake || socket.userId;
        if (effectiveUserId) {
            // Remove from connected users map
            connectedUsers.delete(String(effectiveUserId));
            
            db.execute('UPDATE users SET is_online = 0 WHERE id = ?', [effectiveUserId])
                .catch(err => console.error('Error updating offline status:', err));
            
            // Notify admins of user disconnect
            io.to('admins').emit('user_left', { userId: effectiveUserId });
        }
        
        // Remove from admin sockets if it's an admin
        if (socket.handshake.query.isAdmin === 'true') {
            adminSockets.delete(socket);
        }
    });
});

// ========== PHASE MANAGEMENT API ==========

// Get user phase
app.get('/api/user-phase/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [rows] = await db.execute(
            'SELECT current_phase FROM game_states WHERE user_id = ?',
            [userId]
        );
        
        if (rows.length > 0) {
            res.json({ phase: rows[0].current_phase });
        } else {
            res.json({ phase: 1 }); // Default phase
        }
    } catch (error) {
        console.error('❌ Error getting user phase:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update user phase
app.post('/api/update-phase', async (req, res) => {
    try {
        const { userId, phase } = req.body;
        
        if (!userId || !phase) {
            return res.status(400).json({ error: 'Missing userId or phase' });
        }
        
        // Check if game_state exists
        const [existing] = await db.execute(
            'SELECT id FROM game_states WHERE user_id = ?',
            [userId]
        );
        
        if (existing.length > 0) {
            // Update existing
            await db.execute(
                'UPDATE game_states SET current_phase = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [phase, userId]
            );
        } else {
            // Create new
            await db.execute(
                'INSERT INTO game_states (user_id, current_phase) VALUES (?, ?)',
                [userId, phase]
            );
        }
        
        console.log(`✅ User ${userId} phase updated to ${phase}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating user phase:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== CANNED RESPONSES API ==========

// Get all canned responses
app.get('/api/canned-responses', async (req, res) => {
    try {
        const [responses] = await db.execute(
            'SELECT id, short_name, content FROM canned_responses ORDER BY id ASC'
        );
        
        console.log(`📋 Retrieved ${responses.length} canned responses`);
        res.json(responses);
    } catch (error) {
        console.error('❌ Error getting canned responses:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Add new canned response
app.post('/api/canned-responses', async (req, res) => {
    try {
        const { short_name, content } = req.body;
        
        if (!short_name || !content) {
            return res.status(400).json({ error: 'Missing short_name or content' });
        }
        
        // Insert new response
        const [result] = await db.execute(
            'INSERT INTO canned_responses (short_name, content) VALUES (?, ?)',
            [short_name.trim(), content.trim()]
        );
        
        console.log(`✅ New canned response added: "${short_name}" (ID: ${result.insertId})`);
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'پیام جدید با موفقیت اضافه شد'
        });
    } catch (error) {
        console.error('❌ Error adding canned response:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Mark messages as read for a specific user
app.post('/api/mark-as-read', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }
        
        // Reset unread count for this user
        await db.execute(
            'UPDATE users SET unread_count = 0, last_admin_read = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );
        
        console.log(`✅ Marked messages as read for user ${userId}`);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error marking messages as read:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
app.use('/KaragahArshad', arshadRoutes);

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).send('Internal server error');
});

// ========== SERVER STARTUP ==========

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log('🚀 Karagah V2 Server started successfully!');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Access the game at: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin panel at: http://localhost:${PORT}/gostantaniye`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = app;
