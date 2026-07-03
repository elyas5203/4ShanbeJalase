<?php
require_once __DIR__ . '/bootstrap.php';

if (!defined('CHARSHANBE_API_NO_ROUTER')) {
try {
    $action = $_GET['action'] ?? '';
    $args = bodyArgs();
    $pdo = db();
    switch ($action) {
        case 'getAppData': jsonResponse(getAppData($pdo));
        case 'getInitialData': jsonResponse(getInitialData($pdo));
        case 'getPlansData': jsonResponse(['plans'=>getPlans($pdo, (int)($args[0] ?? 150), (int)($args[1] ?? 0)), 'limit'=>(int)($args[0] ?? 150), 'offset'=>(int)($args[1] ?? 0)]);
        case 'getNotesData': jsonResponse(['notes'=>getNotesList($pdo, (int)($args[0] ?? 120), (int)($args[1] ?? 0)), 'limit'=>(int)($args[0] ?? 120), 'offset'=>(int)($args[1] ?? 0)]);
        case 'getArchiveData': jsonResponse(getArchiveData($pdo, $args[0] ?? 'grouping', $args[1] ?? '', (int)($args[2] ?? 180))); 
        case 'getClassMIData': jsonResponse(getClassMIData($pdo));
        case 'getFullStudentProfile': jsonResponse(getFullStudentProfile($pdo, $args[0] ?? ''));
        case 'addStudent': jsonResponse(addStudent($pdo, $args[0] ?? ''));
        case 'addManualScore': jsonResponse(addManualScore($pdo, $args[0] ?? '', $args[1] ?? 0));
        case 'submitAttendance': jsonResponse(submitAttendance($pdo, $args[0] ?? []));
        case 'getAttendanceSessions': jsonResponse(getAttendanceSessions($pdo, (int)($args[0] ?? 80), (int)($args[1] ?? 0)));
        case 'getAttendanceSessionDetails': jsonResponse(getAttendanceSessionDetails($pdo, (int)($args[0] ?? 0)));
        case 'deleteAttendanceSession': jsonResponse(deleteAttendanceSession($pdo, (int)($args[0] ?? 0)));
        case 'saveNote': jsonResponse(saveNote($pdo, $args[0] ?? '', $args[1] ?? ''));
        case 'saveSystemSettings': jsonResponse(saveSystemSettings($pdo, $args[0] ?? []));
        case 'updateStudentProfile': jsonResponse(updateStudentProfile($pdo, $args[0] ?? []));
        case 'uploadStudentImage': jsonResponse(uploadStudentImage($pdo));
        case 'savePlan': jsonResponse(savePlan($pdo, $args[0] ?? '', $args[1] ?? '', $args[2] ?? '', $args[3] ?? '', $args[4] ?? '[]'));
        case 'deletePlan': jsonResponse(deletePlan($pdo, $args[0] ?? ''));
        case 'submitMILog': jsonResponse(submitMILog($pdo, $args[0] ?? '', $args[1] ?? '', $args[2] ?? '', $args[3] ?? 0));
        case 'saveManualLog': jsonResponse(saveManualLog($pdo, $args[0] ?? []));
        case 'testTelegramConnection': jsonResponse(testTelegramConnection($pdo));
        case 'setupTelegramWebhook': jsonResponse(setupTelegramWebhook($pdo));
        case 'flushTelegramQueue': jsonResponse(flushTelegramQueue($pdo));
        case 'uploadPlanFile': jsonResponse(uploadPlanFile($pdo));
        case 'deletePlanFile': jsonResponse(deletePlanFile($pdo, $args[0] ?? 0));
        case 'globalSearch': jsonResponse(globalSearch($pdo, $args[0] ?? ''));
        case 'getCalendarData': jsonResponse(getCalendarData($pdo));
        case 'getDashboardAlerts': jsonResponse(getDashboardAlerts($pdo));
        case 'getMonthlyReport': jsonResponse(getMonthlyReport($pdo, $args[0] ?? '', $args[1] ?? ''));
        default: jsonResponse(['success'=>false, 'msg'=>'Action not found']);
    }
} catch (Throwable $e) {
    http_response_code(500);
    jsonResponse(['success'=>false, 'message'=>$e->getMessage(), 'msg'=>'خطای سرور: ' . $e->getMessage()]);
}
}

function getAppData(PDO $pdo): array {
    $students = [];
    $fireCache = recentNoAbsenceMap($pdo, 8);
    foreach ($pdo->query('SELECT * FROM students ORDER BY score DESC, name ASC') as $r) {
        $sid = (int)$r['id'];
        $students[] = ['name'=>$r['name'], 'score'=>(float)$r['score'], 'manualScore'=>(float)$r['manual_score'], 'image'=>fixUrl($r['image'] ?? ''), 'fire'=>($fireCache[$sid] ?? false)];
    }
    $max = $students ? $students[0]['score'] : -1;
    $top = $max > 0 ? implode(' - ', array_map(fn($s) => $s['name'], array_filter($students, fn($s) => $s['score'] == $max))) : '---';
    return ['students'=>$students, 'trend'=>getTrendData($pdo), 'sessionCount'=>getSessionCount($pdo), 'topStudent'=>$top ?: '---', 'notes'=>getNotesList($pdo), 'plans'=>getPlans($pdo), 'settings'=>settings($pdo), 'moduleHistory'=>getCombinedHistory($pdo), 'alerts'=>getDashboardAlerts($pdo, false)];
}

function getInitialData(PDO $pdo): array {
    $students = [];
    $fireCache = recentNoAbsenceMap($pdo, 8);
    foreach ($pdo->query('SELECT * FROM students ORDER BY score DESC, name ASC') as $r) {
        $sid = (int)$r['id'];
        $students[] = ['name'=>$r['name'], 'score'=>(float)$r['score'], 'manualScore'=>(float)$r['manual_score'], 'image'=>fixUrl($r['image'] ?? ''), 'fire'=>($fireCache[$sid] ?? false)];
    }
    $max = $students ? $students[0]['score'] : -1;
    $top = $max > 0 ? implode(' - ', array_map(fn($s) => $s['name'], array_filter($students, fn($s) => $s['score'] == $max))) : '---';
    return [
        'students'=>$students,
        'trend'=>getTrendData($pdo),
        'sessionCount'=>getSessionCount($pdo),
        'topStudent'=>$top ?: '---',
        'settings'=>settings($pdo),
        'alerts'=>getDashboardAlerts($pdo, false),
        'notes'=>null,
        'plans'=>null,
        'moduleHistory'=>null,
        'lazy'=>true
    ];
}

function getSessionCount(PDO $pdo): int {
    return (int)$pdo->query('SELECT COUNT(*) FROM attendance_sessions')->fetchColumn();
}

function getStudentByName(PDO $pdo, string $name): ?array {
    $st = $pdo->prepare('SELECT * FROM students WHERE name=?');
    $st->execute([$name]);
    $r = $st->fetch();
    return $r ?: null;
}

function getFullStudentProfile(PDO $pdo, string $studentName): array {
    $r = getStudentByName($pdo, $studentName);
    if (!$r) return ['success'=>false, 'msg'=>'دانش‌آموز یافت نشد'];
    $phones = $r['phones'] ?: '';
    if ($phones === '' && !empty($r['parent_phone'])) $phones = json_encode([['label'=>'والدین', 'number'=>$r['parent_phone']]], JSON_UNESCAPED_UNICODE);
    $info = ['name'=>$r['name'], 'score'=>(float)$r['score'], 'image'=>$r['image'] ?? '', 'displayImage'=>fixUrl($r['image'] ?? ''), 'bio'=>$r['bio'] ?? '', 'phone'=>$phones ?: '[]', 'parentPhone'=>$r['parent_phone'] ?? '', 'dob'=>$r['dob'] ?? '', 'school'=>$r['school'] ?? '', 'medical'=>$r['medical'] ?? '', 'parentNote'=>$r['parent_note'] ?? ''];
    return ['success'=>true, 'info'=>$info, 'mi'=>getStudentMIProfile($pdo, $studentName), 'stats'=>getStudentDetails($pdo, $studentName), 'fullHistory'=>getComprehensiveStudentHistory($pdo, $studentName)];
}

function getTrendData(PDO $pdo, int $limit = 0): array {
    $sessionSource = 'attendance_sessions';
    if ($limit > 0) {
        $sessionSource = '(SELECT * FROM attendance_sessions ORDER BY session_date DESC, id DESC LIMIT ' . max(1, $limit) . ')';
    }
    $sql = "SELECT s.id, s.session_date,
                   SUM(r.status='Present') p,
                   SUM(r.status='Absent') a,
                   SUM(r.status='Late') l,
                   SUM(r.status='Excused') e,
                   SUM(CASE WHEN r.status='Late' THEN r.late_minutes ELSE 0 END) late_minutes,
                   SUM(CASE WHEN r.status='Late' AND r.late_minutes BETWEEN 0 AND 5 THEN 1 ELSE 0 END) late_0_5,
                   SUM(CASE WHEN r.status='Late' AND r.late_minutes BETWEEN 6 AND 10 THEN 1 ELSE 0 END) late_6_10,
                   SUM(CASE WHEN r.status='Late' AND r.late_minutes BETWEEN 11 AND 15 THEN 1 ELSE 0 END) late_11_15,
                   SUM(CASE WHEN r.status='Late' AND r.late_minutes BETWEEN 16 AND 20 THEN 1 ELSE 0 END) late_16_20,
                   SUM(CASE WHEN r.status='Late' AND r.late_minutes BETWEEN 21 AND 30 THEN 1 ELSE 0 END) late_21_30,
                   SUM(CASE WHEN r.status='Late' AND r.late_minutes > 30 THEN 1 ELSE 0 END) late_31_plus,
                   SUM(CASE
                       WHEN r.status='Present' THEN 1
                       WHEN r.status='Late' THEN
                         CASE
                           WHEN r.late_minutes <= 5 THEN 0.95
                           WHEN r.late_minutes <= 10 THEN 0.85
                           WHEN r.late_minutes <= 15 THEN 0.70
                           WHEN r.late_minutes <= 20 THEN 0.55
                           WHEN r.late_minutes <= 30 THEN 0.40
                           ELSE 0.25
                         END
                       WHEN r.status='Excused' THEN 0.50
                       ELSE 0
                   END) weighted_score,
                   COUNT(r.id) total
            FROM {$sessionSource} s
            LEFT JOIN attendance_records r ON r.session_id=s.id
            GROUP BY s.id, s.session_date
            ORDER BY s.session_date ASC, s.id ASC";
    $labels = []; $data = []; $details = [];
    foreach ($pdo->query($sql) as $r) {
        $p = (int)$r['p']; $a = (int)$r['a']; $l = (int)$r['l']; $e = (int)$r['e']; $total = (int)$r['total'];
        $weighted = (float)($r['weighted_score'] ?? 0);
        $lateMinutes = (int)($r['late_minutes'] ?? 0);
        $labels[] = normalizeDateStr($r['session_date']);
        $data[] = $total ? (int)round(($weighted / $total) * 100) : 0;
        $details[] = [
            'p'=>$p, 'a'=>$a, 'l'=>$l, 'e'=>$e, 'total'=>$total,
            'lateMinutes'=>$lateMinutes,
            'rawPresentPercent'=>$total ? (int)round(($p / $total) * 100) : 0,
            'smartPercent'=>$total ? (int)round(($weighted / $total) * 100) : 0,
            'lateBuckets'=>[
                '0_5'=>(int)$r['late_0_5'], '6_10'=>(int)$r['late_6_10'], '11_15'=>(int)$r['late_11_15'],
                '16_20'=>(int)$r['late_16_20'], '21_30'=>(int)$r['late_21_30'], '31_plus'=>(int)$r['late_31_plus']
            ]
        ];
    }
    return ['labels'=>$labels, 'data'=>$data, 'details'=>$details, 'formula'=>'Present=100%, Late: 0-5=95%, 6-10=85%, 11-15=70%, 16-20=55%, 21-30=40%, 31+=25%, Excused=50%, Absent=0%'];
}

function recentNoAbsenceMap(PDO $pdo, int $sessionLimit = 8): array {
    $out = [];
    $students = array_map('intval', $pdo->query('SELECT id FROM students')->fetchAll(PDO::FETCH_COLUMN));
    foreach ($students as $sid) $out[$sid] = false;
    if (!$students) return $out;

    $sessionLimit = max(1, $sessionLimit);
    $sessionIds = $pdo->query('SELECT id FROM attendance_sessions ORDER BY session_date DESC, id DESC LIMIT ' . $sessionLimit)->fetchAll(PDO::FETCH_COLUMN);
    $sessionIds = array_map('intval', $sessionIds);
    if (count($sessionIds) < $sessionLimit) return $out;

    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
    $st = $pdo->prepare("SELECT student_id, status FROM attendance_records WHERE session_id IN ($placeholders)");
    $st->execute($sessionIds);
    $seen = [];
    foreach ($st as $row) {
        $sid = (int)$row['student_id'];
        if (!isset($seen[$sid])) $seen[$sid] = ['count'=>0, 'bad'=>false];
        $seen[$sid]['count']++;
        if (in_array($row['status'], ['Absent', 'Excused'], true)) $seen[$sid]['bad'] = true;
    }
    foreach ($students as $sid) {
        $out[$sid] = isset($seen[$sid]) && $seen[$sid]['count'] >= $sessionLimit && !$seen[$sid]['bad'];
    }
    return $out;
}

function getNotesList(PDO $pdo, int $limit = 0, int $offset = 0): array {
    $sql = 'SELECT note_date date, note_text text FROM notes ORDER BY id DESC';
    if ($limit > 0) $sql .= ' LIMIT ' . max(1, min(500, $limit)) . ' OFFSET ' . max(0, $offset);
    return $pdo->query($sql)->fetchAll();
}

function getPlans(PDO $pdo, int $limit = 0, int $offset = 0): array {
    $sql = 'SELECT plan_date date, title, priority, modules, sin, id, status FROM plans ORDER BY plan_date DESC, updated_at DESC';
    if ($limit > 0) $sql .= ' LIMIT ' . max(1, min(500, $limit)) . ' OFFSET ' . max(0, $offset);
    $rows = $pdo->query($sql)->fetchAll();
    $filesByPlan = [];
    foreach ($pdo->query('SELECT plan_id, id, original_name name, stored_path path, mime_type mime, file_size size, created_at FROM plan_files ORDER BY plan_id, id DESC') as $file) {
        $filesByPlan[$file['plan_id']][] = ['id'=>$file['id'], 'name'=>$file['name'], 'path'=>$file['path'], 'mime'=>$file['mime'], 'size'=>$file['size'], 'created_at'=>$file['created_at']];
    }
    foreach ($rows as &$r) { $r['date'] = normalizeDateStr($r['date']); $r['files'] = $filesByPlan[$r['id']] ?? []; }
    return $rows;
}
function getPlanFiles(PDO $pdo, string $planId): array {
    $st = $pdo->prepare('SELECT id, original_name name, stored_path path, mime_type mime, file_size size, created_at FROM plan_files WHERE plan_id=? ORDER BY id DESC');
    $st->execute([$planId]);
    return $st->fetchAll();
}

function getCombinedHistory(PDO $pdo): array {
    $history = [];
    foreach ($pdo->query('SELECT * FROM plans') as $p) {
        $mods = json_decode($p['modules'] ?: '[]', true) ?: [];
        foreach ($mods as $m) if (!empty($m['name'])) $history[] = ['date'=>normalizeDateStr($p['plan_date']), 'source'=>'plan', 'planTitle'=>$p['title'], 'planId'=>$p['id'], 'type'=>$m['type'] ?? 'other', 'title'=>$m['name'], 'details'=>$m['desc'] ?? ''];
    }
    foreach ($pdo->query('SELECT * FROM archive_logs') as $a) $history[] = ['date'=>normalizeDateStr($a['log_date']), 'source'=>'manual', 'planTitle'=>'فعالیت ثبت شده دستی', 'type'=>$a['log_type'], 'title'=>$a['title'], 'details'=>$a['details_json']];
    usort($history, fn($a,$b) => strcmp($b['date'], $a['date']));
    return $history;
}

function saveManualLog(PDO $pdo, array $data): array {
    $st = $pdo->prepare('INSERT INTO archive_logs (log_date, log_type, title, details_json) VALUES (?, ?, ?, ?)');
    $st->execute([$data['date'] ?? '', $data['type'] ?? 'other', $data['title'] ?? '', $data['details'] ?? '']);
    return ['success'=>true, 'msg'=>'✅ ثبت شد.'];
}

function saveSystemSettings(PDO $pdo, array $f): array {
    $st = $pdo->prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)');
    foreach ($f as $k => $v) $st->execute([$k, $v]);
    return ['success'=>true, 'msg'=>'✅ تنظیمات ذخیره شد.'];
}

function addStudent(PDO $pdo, string $name): array {
    $name = trim($name);
    if ($name === '') return ['success'=>false, 'msg'=>'نام را وارد کنید'];
    $st = $pdo->prepare('INSERT IGNORE INTO students (name) VALUES (?)');
    $st->execute([$name]);
    return ['success'=>true];
}

function addManualScore(PDO $pdo, string $name, $points): array {
    $r = getStudentByName($pdo, $name); if (!$r) return ['success'=>false];
    $points = (float)toEnglishDigits($points);
    $pdo->prepare('UPDATE students SET manual_score=manual_score+? WHERE id=?')->execute([$points, $r['id']]);
    updateCalculations($pdo);
    if (settingEnabled($pdo, 'TG_NOTIFY_SCORE', true)) notifySimple('ثبت امتیاز دستی', '⭐', ['متربی: ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8'), 'تغییر امتیاز: ' . ($points > 0 ? '+' : '') . $points]);
    return ['success'=>true, 'msg'=>'✅ امتیاز ثبت شد'];
}

function submitAttendance(PDO $pdo, array $data): array {
    $date = normalizeDateStr($data['date'] ?? '');
    $lists = ['p'=>[], 'a'=>[], 'l'=>[], 'e'=>[]];
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO attendance_sessions (session_date) VALUES (?) ON DUPLICATE KEY UPDATE session_date=VALUES(session_date)')->execute([$date]);
        $sid = (int)$pdo->query('SELECT id FROM attendance_sessions WHERE session_date=' . $pdo->quote($date))->fetchColumn();
        $up = $pdo->prepare('INSERT INTO attendance_records (session_id, student_id, status, late_minutes, status_text) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), late_minutes=VALUES(late_minutes), status_text=VALUES(status_text)');
        foreach (($data['records'] ?? []) as $rec) {
            $student = getStudentByName($pdo, $rec['name'] ?? ''); if (!$student) continue;
            $status = $rec['status'] ?? 'Present'; $mins = (int)preg_replace('/[^0-9]/', '', toEnglishDigits($rec['min'] ?? '0'));
            if ($status === 'Absent') { $txt = 'غیبت'; $lists['a'][] = $student['name']; }
            elseif ($status === 'Late') { $txt = 'تاخیر (' . $mins . ' دقیقه)'; $lists['l'][] = $student['name'] . ' (' . $mins . 'د)'; }
            elseif ($status === 'Excused') { $txt = 'موجه'; $lists['e'][] = $student['name']; }
            else { $status = 'Present'; $txt = 'حاضر'; $lists['p'][] = $student['name']; }
            $up->execute([$sid, $student['id'], $status, $mins, $txt]);
        }
        updateCalculations($pdo);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    if (settingEnabled($pdo, 'TG_NOTIFY_ATTENDANCE', false)) {
        $lines = ['تاریخ: ' . htmlspecialchars($date, ENT_QUOTES, 'UTF-8'), 'حاضر: ' . count($lists['p']), 'تاخیر: ' . count($lists['l']), 'غیبت: ' . count($lists['a']), 'موجه: ' . count($lists['e'])];
        notifySimple('ثبت حضور و غیاب', '📋', $lines);
    }
    return ['success'=>true, 'msg'=>'✅ حضور و غیاب ثبت شد.'];
}


function getAttendanceSessions(PDO $pdo, int $limit = 80, int $offset = 0): array {
    $limit = max(20, min(300, $limit));
    $offset = max(0, $offset);
    $sql = "SELECT s.id, s.session_date,
                   COUNT(r.id) total,
                   SUM(r.status='Present') present_count,
                   SUM(r.status='Late') late_count,
                   SUM(r.status='Absent') absent_count,
                   SUM(r.status='Excused') excused_count
            FROM attendance_sessions s
            LEFT JOIN attendance_records r ON r.session_id=s.id
            GROUP BY s.id, s.session_date
            ORDER BY s.session_date DESC, s.id DESC
            LIMIT $limit OFFSET $offset";
    $rows = [];
    foreach ($pdo->query($sql) as $r) {
        $rows[] = [
            'id'=>(int)$r['id'],
            'date'=>normalizeDateStr($r['session_date']),
            'total'=>(int)$r['total'],
            'present'=>(int)$r['present_count'],
            'late'=>(int)$r['late_count'],
            'absent'=>(int)$r['absent_count'],
            'excused'=>(int)$r['excused_count'],
        ];
    }
    return ['sessions'=>$rows, 'limit'=>$limit, 'offset'=>$offset];
}

function getAttendanceSessionDetails(PDO $pdo, int $sessionId): array {
    if ($sessionId <= 0) return ['success'=>false, 'msg'=>'شناسه جلسه نامعتبر است'];
    $st = $pdo->prepare('SELECT id, session_date FROM attendance_sessions WHERE id=?');
    $st->execute([$sessionId]);
    $session = $st->fetch();
    if (!$session) return ['success'=>false, 'msg'=>'جلسه پیدا نشد'];
    $st = $pdo->prepare('SELECT st.name, st.image, r.status, r.late_minutes, r.status_text
        FROM attendance_records r
        JOIN students st ON st.id=r.student_id
        WHERE r.session_id=?
        ORDER BY st.name ASC');
    $st->execute([$sessionId]);
    $records = [];
    foreach ($st as $r) {
        $records[] = [
            'name'=>$r['name'],
            'image'=>fixUrl($r['image'] ?? ''),
            'status'=>$r['status'],
            'lateMinutes'=>(int)$r['late_minutes'],
            'text'=>$r['status_text'],
        ];
    }
    return ['success'=>true, 'session'=>['id'=>(int)$session['id'], 'date'=>normalizeDateStr($session['session_date'])], 'records'=>$records];
}

function deleteAttendanceSession(PDO $pdo, int $sessionId): array {
    if ($sessionId <= 0) return ['success'=>false, 'msg'=>'شناسه جلسه نامعتبر است'];
    $st = $pdo->prepare('SELECT session_date FROM attendance_sessions WHERE id=?');
    $st->execute([$sessionId]);
    $date = $st->fetchColumn();
    if (!$date) return ['success'=>false, 'msg'=>'جلسه پیدا نشد'];
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM attendance_records WHERE session_id=?')->execute([$sessionId]);
        $pdo->prepare('DELETE FROM attendance_sessions WHERE id=?')->execute([$sessionId]);
        updateCalculations($pdo);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    return ['success'=>true, 'msg'=>'جلسه حضور و غیاب ' . normalizeDateStr($date) . ' حذف شد'];
}

function saveNote(PDO $pdo, string $d, string $t): array {
    $pdo->prepare('INSERT INTO notes (note_date, note_text) VALUES (?, ?)')->execute([$d, $t]);
    return ['success'=>true, 'msg'=>'یادداشت ذخیره شد'];
}

function updateStudentProfile(PDO $pdo, array $data): array {
    $r = getStudentByName($pdo, $data['originalName'] ?? ''); if (!$r) return ['success'=>false];
    $phones = $data['phone'] ?? '[]';
    json_decode($phones); if (json_last_error() !== JSON_ERROR_NONE) $phones = '[]';
    $pdo->prepare('UPDATE students SET image=?, bio=?, phones=?, dob=?, school=?, medical=?, parent_note=? WHERE id=?')->execute([$data['image'] ?? '', $data['bio'] ?? '', $phones, $data['dob'] ?? '', $data['school'] ?? '', $data['medical'] ?? '', $data['parentNote'] ?? '', $r['id']]);
    return ['success'=>true, 'msg'=>'✅ بروزرسانی شد'];
}

function uploadStudentImage(PDO $pdo): array {
    $studentName = trim((string)($_POST['studentName'] ?? ''));
    $student = getStudentByName($pdo, $studentName);
    if (!$student) return ['success'=>false, 'msg'=>'متربی یافت نشد'];
    if (empty($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) return ['success'=>false, 'msg'=>'فایلی انتخاب نشده است'];
    if ((int)$_FILES['image']['size'] > 5 * 1024 * 1024) return ['success'=>false, 'msg'=>'حجم عکس نباید بیشتر از ۵ مگابایت باشد'];

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($_FILES['image']['tmp_name']);
    $extMap = ['image/jpeg'=>'jpg', 'image/png'=>'png', 'image/webp'=>'webp', 'image/gif'=>'gif'];
    if (!isset($extMap[$mime])) return ['success'=>false, 'msg'=>'فقط فایل‌های jpg، png، webp یا gif مجاز هستند'];

    $dir = __DIR__ . '/uploads/students';
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) return ['success'=>false, 'msg'=>'پوشه آپلود ساخته نشد'];
    $filename = 'student_' . (int)$student['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extMap[$mime];
    $dest = $dir . '/' . $filename;
    if (!move_uploaded_file($_FILES['image']['tmp_name'], $dest)) return ['success'=>false, 'msg'=>'ذخیره عکس انجام نشد'];

    $path = 'uploads/students/' . $filename;
    $old = (string)($student['image'] ?? '');
    $pdo->prepare('UPDATE students SET image=? WHERE id=?')->execute([$path, $student['id']]);
    if (preg_match('~^uploads/students/~', $old)) {
        $oldPath = __DIR__ . '/' . $old;
        if (is_file($oldPath)) @unlink($oldPath);
    }
    return ['success'=>true, 'msg'=>'✅ عکس پروفایل آپلود شد', 'path'=>$path, 'displayImage'=>$path];
}


function deleteStoredUpload(string $storedPath): void {
    $storedPath = str_replace('\\', '/', trim($storedPath));
    if ($storedPath === '' || str_contains($storedPath, '..') || !preg_match('~^uploads/~', $storedPath)) return;
    $fullPath = __DIR__ . '/' . $storedPath;
    if (is_file($fullPath)) @unlink($fullPath);
}

function savePlan(PDO $pdo, string $id, string $date, string $title, string $sin, string $modules): array {
    $date = normalizeDateStr($date);
    $id = (!$id || $id === 'undefined') ? (string)round(microtime(true) * 1000) : $id;
    json_decode($modules); if (json_last_error() !== JSON_ERROR_NONE) $modules = '[]';
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO plans (id, plan_date, title, priority, modules, sin, status) VALUES (?, ?, ?, "low", ?, ?, "Active") ON DUPLICATE KEY UPDATE plan_date=VALUES(plan_date), title=VALUES(title), modules=VALUES(modules), sin=VALUES(sin)')->execute([$id, $date, $title, $modules, $sin]);
        $pdo->prepare('DELETE FROM essentials WHERE plan_id=?')->execute([$id]);
        $ins = $pdo->prepare('INSERT INTO essentials (plan_id, item_date, title, priority, item_name, uid, done, item_type) VALUES (?, ?, ?, "low", ?, ?, 0, ?)');
        foreach ((json_decode($modules, true) ?: []) as $m) {
            foreach (($m['items'] ?? []) as $it) {
                $ins->execute([$id, $date, $title, $it['name'] ?? '', (string)random_int(10000, 9999999), $it['type'] ?? 'have']);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    return ['success'=>true, 'msg'=>'✅ طرح درس با موفقیت ذخیره شد.'];
}

function deletePlan(PDO $pdo, string $id): array {
    $files = [];
    $st = $pdo->prepare('SELECT stored_path FROM plan_files WHERE plan_id=?');
    $st->execute([$id]);
    foreach ($st as $row) $files[] = (string)$row['stored_path'];
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM essentials WHERE plan_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM plan_files WHERE plan_id=?')->execute([$id]);
        $pdo->prepare('DELETE FROM plans WHERE id=?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    foreach ($files as $path) deleteStoredUpload($path);
    $dir = __DIR__ . '/uploads/plans/' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $id);
    if (is_dir($dir)) @rmdir($dir);
    return ['success'=>true, 'msg'=>'🗑 طرح درس حذف شد'];
}

function getStudentDetails(PDO $pdo, string $name): array {
    $srow = getStudentByName($pdo, $name);
    if (!$srow) return ['history'=>[], 'stats'=>['p'=>0,'a'=>0,'l'=>0,'e'=>0,'lm'=>0], 'scores'=>['system'=>0,'manual'=>0,'total'=>0], 'growth'=>['labels'=>[], 'data'=>[]]];
    $rows = $pdo->prepare('SELECT s.session_date, r.* FROM attendance_records r JOIN attendance_sessions s ON s.id=r.session_id WHERE r.student_id=? ORDER BY s.session_date ASC');
    $rows->execute([$srow['id']]);
    $histAsc = $rows->fetchAll();
    $stats = ['p'=>0,'a'=>0,'l'=>0,'e'=>0,'lm'=>0]; $gl=[]; $gd=[]; $sys=0;
    foreach ($histAsc as $r) {
        if ($r['status'] === 'Present') { $sys++; $stats['p']++; }
        elseif ($r['status'] === 'Absent') { $sys--; $stats['a']++; }
        elseif ($r['status'] === 'Late') { $sys++; $stats['l']++; $stats['lm'] += (int)$r['late_minutes']; }
        elseif ($r['status'] === 'Excused') { $stats['e']++; }
        $gl[] = normalizeDateStr($r['session_date']); $gd[] = $sys + (float)$srow['manual_score'];
    }
    $history = array_reverse(array_map(fn($r) => ['date'=>normalizeDateStr($r['session_date']), 'status'=>$r['status_text']], $histAsc));
    return ['history'=>$history, 'stats'=>$stats, 'scores'=>['system'=>$sys, 'manual'=>(float)$srow['manual_score'], 'total'=>$sys + (float)$srow['manual_score']], 'growth'=>['labels'=>$gl, 'data'=>$gd]];
}

function miConfig(PDO $pdo): array {
    $out = [];
    foreach ($pdo->query('SELECT * FROM mi_config ORDER BY id') as $r) $out[] = ['type'=>$r['type'], 'desc'=>$r['scientific_desc'], 'pos'=>$r['positive_traits'] ? array_map('trim', explode(',', $r['positive_traits'])) : [], 'neg'=>$r['negative_traits'] ? array_map('trim', explode(',', $r['negative_traits'])) : []];
    return $out;
}

function getStudentMIProfile(PDO $pdo, string $name): array {
    $s = getStudentByName($pdo, $name); if (!$s) return ['config'=>[], 'chart'=>['labels'=>[], 'data'=>[]], 'history'=>[], 'traitStates'=>[]];
    $conf = miConfig($pdo); $traitStates = []; $history = [];
    $st = $pdo->prepare('SELECT * FROM mi_logs WHERE student_id=? ORDER BY log_date ASC, id ASC'); $st->execute([$s['id']]);
    foreach ($st as $r) { $traitStates[$r['mi_type'] . '_' . $r['behavior']] = (int)$r['score']; $history[] = ['date'=>date('Y/m/d', strtotime($r['log_date'])), 'type'=>$r['mi_type'], 'behavior'=>$r['behavior'], 'score'=>(int)$r['score']]; }
    $labels=[]; $data=[];
    foreach ($conf as $c) { $score=0; foreach (array_merge($c['pos'], $c['neg']) as $t) $score += $traitStates[$c['type'].'_'.$t] ?? 0; $labels[]=$c['type']; $data[]=max(0, $score); }
    return ['config'=>$conf, 'chart'=>['labels'=>$labels, 'data'=>$data], 'history'=>array_slice(array_reverse($history), 0, 20), 'traitStates'=>$traitStates];
}

function submitMILog(PDO $pdo, string $sn, string $it, string $bh, $sc): array {
    $s = getStudentByName($pdo, $sn); if (!$s) return ['success'=>false];
    $pdo->prepare('INSERT INTO mi_logs (student_id, mi_type, behavior, score) VALUES (?, ?, ?, ?)')->execute([$s['id'], $it, $bh, (int)$sc]);
    return ['success'=>true, 'msg'=>'✅ ثبت شد'];
}

function getComprehensiveStudentHistory(PDO $pdo, string $studentName): array {
    $combined = [];
    foreach (getStudentMIProfile($pdo, $studentName)['history'] as $h) $combined[] = ['date'=>normalizeDateStr($h['date']), 'type'=>'mi', 'title'=>$h['type'], 'desc'=>$h['behavior'] . ' (' . ($h['score'] === 1 ? '✅ مثبت' : ($h['score'] === -1 ? '❌ منفی' : '⚪ خنثی')) . ')', 'score'=>$h['score'], 'icon'=>'🧠'];
    $details = getStudentDetails($pdo, $studentName);
    foreach ($details['history'] as $h) { $icon = (strpos($h['status'], 'حاضر') !== false) ? '✅' : ((strpos($h['status'], 'غیبت') !== false) ? '❌' : ((strpos($h['status'], 'تاخیر') !== false) ? '⏰' : '📅')); $combined[] = ['date'=>normalizeDateStr($h['date']), 'type'=>'att', 'title'=>'حضور و غیاب', 'desc'=>$h['status'], 'icon'=>$icon]; }
    $attDates = array_map(fn($h)=>normalizeDateStr($h['date']), $details['history']);
    foreach (getCombinedHistory($pdo) as $act) if (in_array(normalizeDateStr($act['date']), $attDates, true)) $combined[] = ['date'=>normalizeDateStr($act['date']), 'type'=>'activity', 'title'=>$act['title'], 'desc'=>$act['type']==='grouping' ? 'شرکت در گروه‌بندی' : ($act['details'] ?: 'شرکت در فعالیت کلاسی'), 'icon'=>'🎯'];
    usort($combined, fn($a,$b)=>strcmp($b['date'], $a['date']));
    return $combined;
}

function getClassMIData(PDO $pdo): array {
    $students = $pdo->query('SELECT name FROM students')->fetchAll(PDO::FETCH_COLUMN);
    $count = max(1, count($students)); $conf = miConfig($pdo); $totals = [];
    foreach ($conf as $c) $totals[$c['type']] = 0;
    foreach ($students as $name) { $profile = getStudentMIProfile($pdo, $name); foreach ($profile['chart']['labels'] as $i=>$label) $totals[$label] += $profile['chart']['data'][$i] ?? 0; }
    return ['labels'=>array_keys($totals), 'averages'=>array_map(fn($v)=>round($v/$count, 2), array_values($totals))];
}


function uploadPlanFile(PDO $pdo): array {
    $planId = trim((string)($_POST['planId'] ?? ''));
    if ($planId === '') return ['success'=>false, 'msg'=>'شناسه طرح درس نامعتبر است'];
    $st = $pdo->prepare('SELECT id FROM plans WHERE id=?'); $st->execute([$planId]);
    if (!$st->fetch()) return ['success'=>false, 'msg'=>'طرح درس پیدا نشد'];

    $uploads = normalizeUploadedFiles($_FILES['files'] ?? ($_FILES['file'] ?? null));
    if (!$uploads) return ['success'=>false, 'msg'=>'فایلی انتخاب نشده است'];

    $allowed = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif','application/pdf'=>'pdf','audio/mpeg'=>'mp3','audio/wav'=>'wav','audio/ogg'=>'ogg','video/mp4'=>'mp4'];
    $dir = __DIR__ . '/uploads/plans/' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $planId);
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) return ['success'=>false, 'msg'=>'پوشه فایل ساخته نشد'];

    $saved = [];
    foreach ($uploads as $file) {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) return ['success'=>false, 'msg'=>'آپلود یکی از فایل‌ها کامل انجام نشد'];
        if ((int)$file['size'] > 25 * 1024 * 1024) return ['success'=>false, 'msg'=>'حجم هر فایل نباید بیشتر از ۲۵ مگابایت باشد'];

        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: 'application/octet-stream';
        if (!isset($allowed[$mime])) return ['success'=>false, 'msg'=>'نوع فایل مجاز نیست. فقط تصویر، PDF، صوت و ویدئوی MP4 قابل آپلود است'];
        $original = basename((string)$file['name']);
        $safeExt = $allowed[$mime];
        $filename = time() . '_' . bin2hex(random_bytes(4)) . '.' . $safeExt;
        $dest = $dir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) return ['success'=>false, 'msg'=>'ذخیره یکی از فایل‌ها انجام نشد'];
        $path = 'uploads/plans/' . basename($dir) . '/' . $filename;
        $pdo->prepare('INSERT INTO plan_files (plan_id, original_name, stored_path, mime_type, file_size) VALUES (?, ?, ?, ?, ?)')->execute([$planId, $original, $path, $mime, (int)$file['size']]);
        $saved[] = ['id'=>(int)$pdo->lastInsertId(), 'name'=>$original, 'path'=>$path, 'mime'=>$mime, 'size'=>(int)$file['size']];
    }

    if (!$saved) return ['success'=>false, 'msg'=>'فایلی انتخاب نشده است'];
    $count = count($saved);
    return ['success'=>true, 'msg'=>'✅ ' . $count . ' فایل طرح درس آپلود شد', 'files'=>$saved, 'file'=>$saved[0]];
}
function normalizeUploadedFiles($files): array {
    if (!$files) return [];
    if (is_array($files['name'] ?? null)) {
        $items = [];
        foreach ($files['name'] as $i => $name) {
            $items[] = [
                'name' => $name,
                'type' => $files['type'][$i] ?? '',
                'tmp_name' => $files['tmp_name'][$i] ?? '',
                'error' => $files['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                'size' => $files['size'][$i] ?? 0,
            ];
        }
        return $items;
    }
    return [$files];
}
function deletePlanFile(PDO $pdo, $id): array {
    $st = $pdo->prepare('SELECT * FROM plan_files WHERE id=?'); $st->execute([(int)$id]); $f = $st->fetch();
    if (!$f) return ['success'=>false, 'msg'=>'فایل یافت نشد'];
    $path = __DIR__ . '/' . $f['stored_path']; if (is_file($path)) @unlink($path);
    $pdo->prepare('DELETE FROM plan_files WHERE id=?')->execute([(int)$id]);
    return ['success'=>true, 'msg'=>'فایل حذف شد'];
}
function getDashboardAlerts(PDO $pdo, bool $refresh = true): array {
    if ($refresh) updateCalculations($pdo);
    $alerts = [];
    $latestMonth = (string)$pdo->query('SELECT SUBSTRING(session_date, 1, 7) FROM attendance_sessions ORDER BY session_date DESC, id DESC LIMIT 1')->fetchColumn();

    $monthlyAbsences = [];
    if ($latestMonth !== '') {
        $st = $pdo->prepare('SELECT r.student_id, COUNT(*) c FROM attendance_records r JOIN attendance_sessions s ON s.id=r.session_id WHERE r.status="Absent" AND s.session_date LIKE ? GROUP BY r.student_id');
        $st->execute([$latestMonth . '/%']);
        foreach ($st as $r) $monthlyAbsences[(int)$r['student_id']] = (int)$r['c'];
    }

    $recent = [];
    $sessionIds = array_map('intval', $pdo->query('SELECT id FROM attendance_sessions ORDER BY session_date DESC, id DESC LIMIT 2')->fetchAll(PDO::FETCH_COLUMN));
    if ($sessionIds) {
        $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
        $st = $pdo->prepare("SELECT student_id, status FROM attendance_records WHERE session_id IN ($placeholders) ORDER BY student_id ASC, session_id DESC");
        $st->execute($sessionIds);
        foreach ($st as $r) $recent[(int)$r['student_id']][] = $r['status'];
    }

    foreach ($pdo->query('SELECT id, name, score FROM students ORDER BY name') as $student) {
        $id = (int)$student['id'];
        $lastTwo = $recent[$id] ?? [];
        if (count($lastTwo) >= 2 && $lastTwo[0] === 'Late' && $lastTwo[1] === 'Late') {
            $alerts[] = ['id'=>'late_consecutive:' . $id . ':' . $latestMonth, 'level'=>'warn', 'title'=>'تاخیر پشت سر هم', 'text'=>$student['name'] . ' در دو جلسه آخر پشت سر هم تاخیر داشته است.'];
        }
        if (count($lastTwo) >= 2 && $lastTwo[0] === 'Absent' && $lastTwo[1] === 'Absent') {
            $alerts[] = ['id'=>'absent_consecutive:' . $id . ':' . $latestMonth, 'level'=>'danger', 'title'=>'غیبت پشت سر هم', 'text'=>$student['name'] . ' در دو جلسه آخر پشت سر هم غیبت داشته است.'];
        }
        $monthAbs = $monthlyAbsences[$id] ?? 0;
        if ($monthAbs >= 2) {
            $alerts[] = ['id'=>'absent_month:' . $id . ':' . $latestMonth, 'level'=>'danger', 'title'=>'غیبت ماهانه', 'text'=>$student['name'] . ' در ماه ' . $latestMonth . ' تعداد ' . $monthAbs . ' غیبت دارد.'];
        }
        if ((float)$student['score'] < 0) {
            $alerts[] = ['id'=>'negative_score:' . $id, 'level'=>'danger', 'title'=>'امتیاز منفی', 'text'=>$student['name'] . ' امتیاز کل منفی دارد.'];
        }
    }
    return $alerts;
}

function getArchiveData(PDO $pdo, string $type = 'grouping', string $query = '', int $limit = 180): array {
    $limit = max(20, min(500, $limit));
    $query = trim($query);
    $items = [];
    $manualSql = 'SELECT * FROM archive_logs';
    $where = [];
    $params = [];
    if ($type !== '' && $type !== 'all') { $where[] = 'log_type=?'; $params[] = $type; }
    if ($query !== '') { $where[] = '(title LIKE ? OR details_json LIKE ? OR log_date LIKE ?)'; $like = '%' . $query . '%'; array_push($params, $like, $like, $like); }
    if ($where) $manualSql .= ' WHERE ' . implode(' AND ', $where);
    $manualSql .= ' ORDER BY log_date DESC, id DESC LIMIT ' . $limit;
    $st = $pdo->prepare($manualSql); $st->execute($params);
    foreach ($st as $a) $items[] = ['date'=>normalizeDateStr($a['log_date']), 'source'=>'manual', 'planTitle'=>'فعالیت ثبت شده دستی', 'type'=>$a['log_type'], 'title'=>$a['title'], 'details'=>$a['details_json'] ?: ''];

    if ($query === '' || count($items) < $limit) {
        $planLimit = min(500, $limit * 3);
        $plans = $pdo->query('SELECT id, plan_date, title, modules FROM plans ORDER BY plan_date DESC, updated_at DESC LIMIT ' . $planLimit)->fetchAll();
        foreach ($plans as $p) {
            $mods = json_decode($p['modules'] ?: '[]', true) ?: [];
            foreach ($mods as $m) {
                $mType = $m['type'] ?? 'other';
                $mTitle = $m['name'] ?? '';
                $mDesc = $m['desc'] ?? '';
                if ($type !== '' && $type !== 'all' && $mType !== $type) continue;
                if ($query !== '' && mb_stripos(($mTitle . ' ' . $mDesc . ' ' . $p['title'] . ' ' . $p['plan_date']), $query) === false) continue;
                if ($mTitle !== '') $items[] = ['date'=>normalizeDateStr($p['plan_date']), 'source'=>'plan', 'planTitle'=>$p['title'], 'planId'=>$p['id'], 'type'=>$mType, 'title'=>$mTitle, 'details'=>$mDesc];
                if (count($items) >= $limit) break 2;
            }
        }
    }
    usort($items, fn($a,$b) => strcmp($b['date'], $a['date']));
    return ['moduleHistory'=>array_slice($items, 0, $limit), 'limited'=>true];
}

function getCalendarData(PDO $pdo): array {
    $events = [];
    foreach ($pdo->query('SELECT id, plan_date, title FROM plans ORDER BY plan_date DESC, id DESC') as $p) $events[] = ['date'=>normalizeDateStr($p['plan_date']), 'type'=>'plan', 'title'=>$p['title'], 'id'=>$p['id']];
    foreach ($pdo->query('SELECT id, session_date FROM attendance_sessions ORDER BY session_date DESC, id DESC') as $a) $events[] = ['date'=>normalizeDateStr($a['session_date']), 'type'=>'attendance', 'title'=>'حضور و غیاب', 'id'=>(int)$a['id']];
    usort($events, fn($a,$b)=>strcmp($b['date'],$a['date']));
    return ['events'=>$events];
}
function globalSearch(PDO $pdo, string $q): array {
    $q = trim($q); if ($q === '') return ['items'=>[]];
    $like = '%' . $q . '%'; $items = [];
    $st=$pdo->prepare('SELECT name, bio, school FROM students WHERE name LIKE ? OR bio LIKE ? OR school LIKE ? LIMIT 25'); $st->execute([$like,$like,$like]);
    foreach($st as $r) $items[]=['type'=>'متربی','title'=>$r['name'],'text'=>trim(($r['school'] ?? '') . ' ' . ($r['bio'] ?? ''))];
    $st=$pdo->prepare('SELECT title, plan_date, sin FROM plans WHERE title LIKE ? OR sin LIKE ? OR modules LIKE ? LIMIT 25'); $st->execute([$like,$like,$like]);
    foreach($st as $r) $items[]=['type'=>'طرح درس','title'=>$r['title'],'text'=>normalizeDateStr($r['plan_date'])];
    $st=$pdo->prepare('SELECT note_date, note_text FROM notes WHERE note_text LIKE ? LIMIT 25'); $st->execute([$like]);
    foreach($st as $r) $items[]=['type'=>'یادداشت','title'=>normalizeDateStr($r['note_date']),'text'=>(function_exists('mb_substr') ? mb_substr($r['note_text'],0,160) : substr($r['note_text'],0,160))];
    $st=$pdo->prepare('SELECT log_date, log_type, title, details_json FROM archive_logs WHERE title LIKE ? OR details_json LIKE ? LIMIT 25'); $st->execute([$like,$like]);
    foreach($st as $r) $items[]=['type'=>'آرشیو','title'=>$r['title'],'text'=>normalizeDateStr($r['log_date']) . ' - ' . $r['log_type']];
    return ['items'=>$items];
}
function getMonthlyReport(PDO $pdo, string $name, string $month): array {
    $full = getFullStudentProfile($pdo, $name); if (empty($full['success'])) return $full;
    $prefix = normalizeDateStr($month); if (strlen($prefix) >= 7) $prefix = substr($prefix, 0, 7);
    $full['stats']['history'] = array_values(array_filter($full['stats']['history'], fn($h)=>str_starts_with(normalizeDateStr($h['date']), $prefix)));
    $full['fullHistory'] = array_values(array_filter($full['fullHistory'], fn($h)=>str_starts_with(normalizeDateStr($h['date']), $prefix)));
    $full['month'] = $prefix;
    return $full;
}
function testTelegramConnection(PDO $pdo): array {
    sendTelegramMessage('<b>🔔 تست اتصال ربات</b>' . "\n" . 'اگر این پیام را می‌بینید، تنظیمات درست است.');
    return ['success'=>true, 'msg'=>'پیام تست ارسال شد (اگر توکن و چت‌آیدی درست باشد).'];
}

function setupTelegramWebhook(PDO $pdo): string {
    $s = settings($pdo); $token = trim($s['BOT_TOKEN'] ?? '');
    if ($token === '') return 'خطا: توکن نیست.';
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $url = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') . '/webhook.php';
    $res = @file_get_contents('https://api.telegram.org/bot' . $token . '/setWebhook?url=' . urlencode($url));
    return 'نتیجه: ' . ($res ?: 'ارسال درخواست ممکن نشد');
}
