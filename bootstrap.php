<?php
require_once __DIR__ . '/config.php';

const SCHEMA_VERSION = '3';

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_PERSISTENT => true,
    ];
    try {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        $root = new PDO('mysql:host=' . DB_HOST . ';charset=utf8mb4', DB_USER, DB_PASS, $options);
        $root->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, $options);
    }
    if (!schemaIsCurrent($pdo)) initSchema($pdo);
    return $pdo;
}

function schemaIsCurrent(PDO $pdo): bool {
    try {
        $st = $pdo->prepare('SELECT `value` FROM settings WHERE `key`=? LIMIT 1');
        $st->execute(['SCHEMA_VERSION']);
        return (string)$st->fetchColumn() === SCHEMA_VERSION;
    } catch (Throwable $e) {
        return false;
    }
}

function ensureIndex(PDO $pdo, string $table, string $index, string $sql): void {
    $st = $pdo->prepare('SHOW INDEX FROM `' . $table . '` WHERE Key_name=?');
    $st->execute([$index]);
    if (!$st->fetch()) $pdo->exec($sql);
}

function initSchema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS students (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190) NOT NULL UNIQUE, absences INT NOT NULL DEFAULT 0, late_count INT NOT NULL DEFAULT 0, score DECIMAL(10,2) NOT NULL DEFAULT 0, status VARCHAR(100) NOT NULL DEFAULT 'ثبت نام', image TEXT NULL, manual_score DECIMAL(10,2) NOT NULL DEFAULT 0, bio TEXT NULL, phones JSON NULL, parent_phone VARCHAR(100) NULL, dob VARCHAR(50) NULL, school VARCHAR(190) NULL, medical TEXT NULL, parent_note TEXT NULL, late_minutes INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS attendance_sessions (id INT AUTO_INCREMENT PRIMARY KEY, session_date VARCHAR(20) NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS attendance_records (id INT AUTO_INCREMENT PRIMARY KEY, session_id INT NOT NULL, student_id INT NOT NULL, status VARCHAR(20) NOT NULL, late_minutes INT NOT NULL DEFAULT 0, status_text VARCHAR(100) NOT NULL, UNIQUE KEY uniq_att (session_id, student_id), CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE, CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (`key` VARCHAR(100) PRIMARY KEY, `value` TEXT NULL, description TEXT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, note_date VARCHAR(20) NOT NULL, note_text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS plans (id VARCHAR(40) PRIMARY KEY, plan_date VARCHAR(20) NOT NULL, title VARCHAR(255) NOT NULL, priority VARCHAR(20) NOT NULL DEFAULT 'low', modules JSON NULL, sin TEXT NULL, status VARCHAR(50) NOT NULL DEFAULT 'Active', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS essentials (id INT AUTO_INCREMENT PRIMARY KEY, plan_id VARCHAR(40) NOT NULL, item_date VARCHAR(20), title VARCHAR(255), priority VARCHAR(20), item_name VARCHAR(255), uid VARCHAR(50) NOT NULL, done TINYINT(1) NOT NULL DEFAULT 0, item_type VARCHAR(20), INDEX(plan_id), UNIQUE KEY uniq_uid (uid)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS mi_config (id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(190) NOT NULL UNIQUE, scientific_desc TEXT, positive_traits TEXT, negative_traits TEXT) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS mi_logs (id INT AUTO_INCREMENT PRIMARY KEY, log_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, student_id INT NOT NULL, mi_type VARCHAR(190) NOT NULL, behavior TEXT NOT NULL, score INT NOT NULL, INDEX(student_id), CONSTRAINT fk_mi_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS archive_logs (id INT AUTO_INCREMENT PRIMARY KEY, log_date VARCHAR(20) NOT NULL, log_type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, details_json TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS plan_files (id INT AUTO_INCREMENT PRIMARY KEY, plan_id VARCHAR(40) NOT NULL, original_name VARCHAR(255) NOT NULL, stored_path TEXT NOT NULL, mime_type VARCHAR(120) NULL, file_size INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(plan_id)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS telegram_queue (id INT AUTO_INCREMENT PRIMARY KEY, payload JSON NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, last_error TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, sent_at DATETIME NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    ensureIndex($pdo, 'attendance_records', 'idx_att_student_status', 'CREATE INDEX idx_att_student_status ON attendance_records (student_id, status)');
    ensureIndex($pdo, 'attendance_records', 'idx_att_session_status', 'CREATE INDEX idx_att_session_status ON attendance_records (session_id, status)');
    ensureIndex($pdo, 'attendance_sessions', 'idx_att_session_date_id', 'CREATE INDEX idx_att_session_date_id ON attendance_sessions (session_date, id)');
    ensureIndex($pdo, 'plans', 'idx_plans_date_updated', 'CREATE INDEX idx_plans_date_updated ON plans (plan_date, updated_at)');
    ensureIndex($pdo, 'archive_logs', 'idx_archive_date_type', 'CREATE INDEX idx_archive_date_type ON archive_logs (log_date, log_type)');
    ensureIndex($pdo, 'mi_logs', 'idx_mi_student_date', 'CREATE INDEX idx_mi_student_date ON mi_logs (student_id, log_date)');
    ensureIndex($pdo, 'plan_files', 'idx_plan_files_plan_id_id', 'CREATE INDEX idx_plan_files_plan_id_id ON plan_files (plan_id, id)');
    seedDefaults($pdo);
    $ver = $pdo->prepare('INSERT INTO settings (`key`, `value`, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)');
    $ver->execute(['SCHEMA_VERSION', SCHEMA_VERSION, 'نسخه ساختار دیتابیس']);
}

function seedDefaults(PDO $pdo): void {
    $stmt = $pdo->prepare('INSERT IGNORE INTO settings (`key`, `value`, description) VALUES (?, ?, ?)');
    $stmt->execute(['BOT_TOKEN', '', 'توکن ربات تلگرام']);
    $stmt->execute(['ADMIN_CHAT_IDS', '', 'آیدی مدیران تلگرام']);
    $stmt->execute(['TG_NOTIFY_SCORE', '1', 'ارسال اعلان امتیاز']);
    $stmt->execute(['TG_NOTIFY_ATTENDANCE', '0', 'ارسال اعلان حضور و غیاب']);
    $stmt->execute(['TG_NOTIFY_PURCHASE', '1', 'ارسال اعلان خرید']);
    if ((int)$pdo->query('SELECT COUNT(*) FROM mi_config')->fetchColumn() === 0) {
        $rows = [
            ['زبانی-کلامی 🗣️','توانایی درک و تولید زبان.','استفاده از واژگان غنی,بیان شیوا','قطع کردن حرف دیگران'],
            ['منطقی-ریاضی 🔢','تحلیل مسائل و تفکر علمی.','حل معما,استدلال قوی','بی‌نظمی در استدلال'],
            ['تصویری-فضایی 🎨','تجسم فضایی.','نقاشی خوب,تصویرسازی','گم کردن مسیرها'],
            ['بدنی-جنبشی ⚽','استفاده از بدن.','مهارت ورزش,زبان بدن','بی‌قراری'],
            ['موسیقایی 🎵','حساسیت به ریتم.','تشخیص ریتم,زمزمه','بی‌توجهی به صداها'],
            ['میان‌فردی 🤝','درک دیگران.','رهبری گروه,همدلی','پرخاشگری,انزوا'],
            ['درون‌فردی 🧘','شناخت خود.','داشتن هدف,کنترل خشم','عدم شناخت احساس'],
            ['طبیعت‌گرا 🌿','درک طبیعت.','علاقه به حیوانات,مشاهده محیط','آسیب به طبیعت'],
        ];
        $ins = $pdo->prepare('INSERT INTO mi_config (type, scientific_desc, positive_traits, negative_traits) VALUES (?, ?, ?, ?)');
        foreach ($rows as $r) $ins->execute($r);
    }
}

function jsonResponse($data): never { header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function bodyArgs(): array { $raw = file_get_contents('php://input'); $payload = $raw ? json_decode($raw, true) : null; return is_array($payload) ? ($payload['args'] ?? []) : []; }
function toEnglishDigits($s): string { return strtr((string)$s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']); }
function normalizeDateStr($d): string { if (!$d) return ''; $s = toEnglishDigits((string)$d); $p = explode('/', $s); if (count($p) !== 3) return $s; return $p[0] . '/' . str_pad($p[1], 2, '0', STR_PAD_LEFT) . '/' . str_pad($p[2], 2, '0', STR_PAD_LEFT); }
function fixUrl($u): string {
    $u = trim((string)$u);
    if ($u === '') return DEFAULT_IMG;
    if (preg_match('~^(data:image/|assets/|uploads/|/|\./|\../)~', $u)) return $u;
    // The app must work without Google/CDN access; external images are kept in DB but not loaded in the UI.
    if (preg_match('~^https?://~i', $u)) return DEFAULT_IMG;
    return $u;
}
function updateCalculations(PDO $pdo): void {
    $pdo->exec("UPDATE students s
        LEFT JOIN (
            SELECT student_id,
                   SUM(CASE WHEN status='Absent' THEN 1 ELSE 0 END) absences,
                   SUM(CASE WHEN status='Late' THEN 1 ELSE 0 END) late_count,
                   SUM(CASE WHEN status='Late' THEN late_minutes ELSE 0 END) late_minutes,
                   SUM(CASE WHEN status='Absent' THEN -1 WHEN status='Late' THEN 1 WHEN status='Present' THEN 1 WHEN status='Excused' THEN 0.5 ELSE 0 END) activity_score
            FROM attendance_records
            GROUP BY student_id
        ) a ON a.student_id=s.id
        SET s.absences=COALESCE(a.absences,0),
            s.late_count=COALESCE(a.late_count,0),
            s.late_minutes=COALESCE(a.late_minutes,0),
            s.score=s.manual_score+COALESCE(a.activity_score,0)");
}
function settings(PDO $pdo): array { $out = []; foreach ($pdo->query('SELECT `key`, `value` FROM settings') as $r) $out[$r['key']] = $r['value']; return $out; }
function sendTelegramMessage(string $text, ?array $markup = null): void {
    $pdo = db();
    $s = settings($pdo);
    $token = trim($s['BOT_TOKEN'] ?? '');
    $chats = array_filter(array_map('trim', explode(',', $s['ADMIN_CHAT_IDS'] ?? '')));
    if ($token === '' || !$chats) return;
    foreach ($chats as $chat) {
        $payload = ['chat_id'=>$chat, 'text'=>$text, 'parse_mode'=>'HTML', 'disable_web_page_preview'=>true];
        if ($markup) $payload['reply_markup'] = $markup;
        $ok = sendTelegramPayload($token, $payload, $err);
        if (!$ok) queueTelegramPayload($pdo, $payload, $err);
    }
}
function sendTelegramPayload(string $token, array $payload, ?string &$error = null): bool {
    $res = @file_get_contents('https://api.telegram.org/bot' . $token . '/sendMessage', false, stream_context_create(['http'=>['method'=>'POST','header'=>'Content-Type: application/json','content'=>json_encode($payload, JSON_UNESCAPED_UNICODE), 'timeout'=>5]]));
    if ($res === false) { $error = 'ارسال به تلگرام ممکن نشد'; return false; }
    $json = json_decode($res, true);
    if (!is_array($json) || empty($json['ok'])) { $error = $res; return false; }
    return true;
}
function queueTelegramPayload(PDO $pdo, array $payload, string $error = ''): void {
    $st = $pdo->prepare('INSERT INTO telegram_queue (payload, last_error) VALUES (?, ?)');
    $st->execute([json_encode($payload, JSON_UNESCAPED_UNICODE), $error]);
}
function flushTelegramQueue(PDO $pdo): array {
    $s = settings($pdo); $token = trim($s['BOT_TOKEN'] ?? '');
    if ($token === '') return ['success'=>false, 'msg'=>'توکن تلگرام تنظیم نشده است'];
    $rows = $pdo->query("SELECT * FROM telegram_queue WHERE status='pending' ORDER BY id ASC LIMIT 50")->fetchAll();
    $sent = 0; $failed = 0;
    foreach ($rows as $row) {
        $payload = json_decode($row['payload'], true) ?: [];
        $ok = sendTelegramPayload($token, $payload, $err);
        if ($ok) { $sent++; $pdo->prepare("UPDATE telegram_queue SET status='sent', sent_at=NOW(), attempts=attempts+1 WHERE id=?")->execute([$row['id']]); }
        else { $failed++; $pdo->prepare('UPDATE telegram_queue SET attempts=attempts+1, last_error=? WHERE id=?')->execute([$err, $row['id']]); }
    }
    return ['success'=>true, 'msg'=>'صف تلگرام: ' . $sent . ' ارسال شد، ' . $failed . ' باقی ماند.'];
}
function notifySimple(string $title, string $icon, array $lines): void { $text = '<b>' . htmlspecialchars($icon . ' ' . $title, ENT_QUOTES, 'UTF-8') . '</b>' . "\n<b>────────────────</b>\n" . implode("\n", $lines); sendTelegramMessage($text); }
function settingEnabled(PDO $pdo, string $key, bool $default = true): bool {
    $s = settings($pdo);
    return isset($s[$key]) ? in_array((string)$s[$key], ['1','true','on','yes'], true) : $default;
}
