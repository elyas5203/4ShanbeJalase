<?php
define('CHARSHANBE_API_NO_ROUTER', true);
require __DIR__ . '/api.php';

$pdo = db();
$dataDir = __DIR__ . '/data';

function findCsv(string $dir, string $needle): ?string {
    foreach (glob($dir . '/*.csv') ?: [] as $file) {
        if (mb_strpos(basename($file), $needle) !== false) return $file;
    }
    return null;
}
function csvFileRows(string $file): array {
    $rows = []; $fh = fopen($file, 'r'); if (!$fh) return [];
    $header = null;
    while (($r = fgetcsv($fh, 0, ',')) !== false) {
        if ($r === [null] || count(array_filter($r, fn($v)=>trim((string)$v)!=='')) === 0) continue;
        $r = array_map(fn($v)=>trim((string)$v), $r);
        if ($header === null) { $header = $r; if (isset($header[0])) $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]); continue; }
        $rows[] = array_combine($header, array_pad($r, count($header), '')) ?: [];
    }
    fclose($fh); return $rows;
}
function v(array $r, array $keys, $default='') { foreach ($keys as $k) if (array_key_exists($k,$r) && $r[$k] !== '') return $r[$k]; return $default; }
function toMysqlDateTime(string $value): string {
    $ts = strtotime($value);
    return $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
}
function boolish($value): int { return in_array(strtolower((string)$value), ['1','true','yes','done'], true) ? 1 : 0; }

$report = [];
try {
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach (['telegram_queue','plan_files','archive_logs','mi_logs','mi_config','essentials','plans','notes','settings','attendance_records','attendance_sessions','students'] as $table) {
        $pdo->exec("TRUNCATE TABLE `$table`");
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    seedDefaults($pdo);

    if ($file = findCsv($dataDir, 'تنظیمات_هوش')) {
        $pdo->exec('TRUNCATE TABLE mi_config');
        $st = $pdo->prepare('INSERT INTO mi_config (type, scientific_desc, positive_traits, negative_traits) VALUES (?, ?, ?, ?)');
        $n = 0;
        foreach (csvFileRows($file) as $r) {
            $type = v($r, ['نوع_هوش']); if ($type === '') continue;
            $st->execute([$type, v($r, ['توضیحات_علمی']), v($r, ['رفتارهای_مثبت (+)']), v($r, ['رفتارهای_منفی (-)'])]);
            $n++;
        }
        $report['mi_config'] = $n;
    }

    if ($file = findCsv($dataDir, 'تنظیمات.csv')) {
        $st = $pdo->prepare('INSERT INTO settings (`key`, `value`, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), description=VALUES(description)');
        $n = 0;
        foreach (csvFileRows($file) as $r) {
            $key = v($r, ['کلید']); if ($key === '') continue;
            $st->execute([$key, v($r, ['مقدار']), v($r, ['توضیحات'])]); $n++;
        }
        foreach ([['TG_NOTIFY_SCORE','1','اعلان امتیاز'],['TG_NOTIFY_ATTENDANCE','0','اعلان حضور'],['TG_NOTIFY_PURCHASE','1','اعلان خرید']] as $row) $st->execute($row);
        $report['settings'] = $n;
    }

    if ($file = findCsv($dataDir, 'افراد')) {
        $st = $pdo->prepare('INSERT INTO students (name, absences, late_count, score, status, image, manual_score, bio, phones, parent_phone, dob, school, medical, parent_note, late_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $n = 0;
        foreach (csvFileRows($file) as $r) {
            $name = v($r, ['نام']); if ($name === '') continue;
            $phones = v($r, ['تلفن_متربی']);
            if ($phones === '') {
                $arr = [];
                if (v($r, ['تلفن_والدین']) !== '') $arr[] = ['label'=>'والدین', 'number'=>v($r, ['تلفن_والدین'])];
                $phones = json_encode($arr, JSON_UNESCAPED_UNICODE);
            }
            json_decode($phones); if (json_last_error() !== JSON_ERROR_NONE) $phones = '[]';
            $st->execute([$name, (int)toEnglishDigits(v($r,['غیبت'],0)), (int)toEnglishDigits(v($r,['تاخیر'],0)), (float)toEnglishDigits(v($r,['امتیاز'],0)), v($r,['وضعیت'],'ثبت نام'), v($r,['عکس']), (float)toEnglishDigits(v($r,['امتیاز_دستی'],0)), v($r,['بیوگرافی']), $phones, v($r,['تلفن_والدین']), normalizeDateStr(v($r,['تولد'])), v($r,['مدرسه']), v($r,['پزشکی']), v($r,['یادداشت_والدین']), (int)toEnglishDigits(v($r,['مجموع_دقایق_تاخیر'],0))]);
            $n++;
        }
        $report['students'] = $n;
    }

    if ($file = findCsv($dataDir, 'حضور و غیاب')) {
        $n = 0;
        foreach (csvFileRows($file) as $r) {
            $name = v($r, ['نام']); if ($name === '') continue;
            $student = getStudentByName($pdo, $name); if (!$student) { addStudent($pdo, $name); $student = getStudentByName($pdo, $name); }
            foreach ($r as $date => $text) {
                if ($date === 'نام' || trim($text) === '') continue;
                $date = normalizeDateStr($date);
                $pdo->prepare('INSERT INTO attendance_sessions (session_date) VALUES (?) ON DUPLICATE KEY UPDATE session_date=VALUES(session_date)')->execute([$date]);
                $sid = (int)$pdo->query('SELECT id FROM attendance_sessions WHERE session_date=' . $pdo->quote($date))->fetchColumn();
                $status = 'Present'; $mins = 0;
                if (str_contains($text, 'موجه')) $status = 'Excused';
                elseif (str_contains($text, 'غیبت')) $status = 'Absent';
                elseif (str_contains($text, 'تاخیر')) { $status = 'Late'; preg_match('/(\d+)/', toEnglishDigits($text), $m); $mins = (int)($m[1] ?? 0); }
                $pdo->prepare('INSERT INTO attendance_records (session_id, student_id, status, late_minutes, status_text) VALUES (?, ?, ?, ?, ?)')->execute([$sid, $student['id'], $status, $mins, $text]);
                $n++;
            }
        }
        $report['attendance_cells'] = $n;
    }

    if ($file = findCsv($dataDir, 'یادداشت_جلسات')) {
        $st = $pdo->prepare('INSERT INTO notes (note_date, note_text) VALUES (?, ?)'); $n=0;
        foreach (csvFileRows($file) as $r) { if (v($r,['یادداشت']) === '') continue; $st->execute([normalizeDateStr(v($r,['تاریخ'])), v($r,['یادداشت'])]); $n++; }
        $report['notes'] = $n;
    }

    if ($file = findCsv($dataDir, 'طرح_درس_کامل')) {
        $st = $pdo->prepare('INSERT INTO plans (id, plan_date, title, priority, modules, sin, status) VALUES (?, ?, ?, ?, ?, ?, ?)'); $n=0;
        foreach (csvFileRows($file) as $r) {
            $id = v($r, ['ID'], (string)round(microtime(true)*1000).$n);
            $modules = v($r, ['ماژول‌ها']); json_decode($modules); if (json_last_error() !== JSON_ERROR_NONE) $modules='[]';
            $st->execute([$id, normalizeDateStr(v($r,['تاریخ'])), v($r,['عنوان']), v($r,['اولویت'],'low'), $modules, v($r,['سین']), v($r,['وضعیت'],'Active')]); $n++;
        }
        $report['plans'] = $n;
    }

    if ($file = findCsv($dataDir, 'ملزومات')) {
        $st = $pdo->prepare('INSERT INTO essentials (plan_id, item_date, title, priority, item_name, uid, done, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'); $n=0;
        foreach (csvFileRows($file) as $r) { $pid=v($r,['ID_طرح']); if($pid==='') continue; $st->execute([$pid, normalizeDateStr(v($r,['تاریخ'])), v($r,['عنوان']), v($r,['اولویت'],'low'), v($r,['نام_وسیله']), v($r,['ID_یکتا'], (string)random_int(10000,999999)), boolish(v($r,['وضعیت'],0)), v($r,['نوع'],'have')]); $n++; }
        $report['essentials'] = $n;
    }

    if ($file = findCsv($dataDir, 'لاگ_هوش')) {
        $st = $pdo->prepare('INSERT INTO mi_logs (log_date, student_id, mi_type, behavior, score) VALUES (?, ?, ?, ?, ?)'); $n=0; $skipped=0;
        foreach (csvFileRows($file) as $r) {
            $studentName = v($r,['نام_متربی']);
            $student = getStudentByName($pdo, $studentName); if (!$student && $studentName !== '') { addStudent($pdo, $studentName); $student = getStudentByName($pdo, $studentName); }
            if (!$student) { $skipped++; continue; }
            $type = v($r, ['نوع_هوش']);
            $exists = $pdo->prepare('SELECT COUNT(*) FROM mi_config WHERE type=?'); $exists->execute([$type]);
            if ((int)$exists->fetchColumn() === 0) { $skipped++; continue; }
            $st->execute([toMysqlDateTime(v($r,['تاریخ'])), $student['id'], $type, v($r,['رفتار_مشاهده_شده']), (int)toEnglishDigits(v($r,['امتیاز'],0))]); $n++;
        }
        $report['mi_logs'] = $n; $report['mi_logs_skipped'] = $skipped;
    }

    if ($file = findCsv($dataDir, 'سوابق_فعالیت')) {
        $st = $pdo->prepare('INSERT INTO archive_logs (log_date, log_type, title, details_json) VALUES (?, ?, ?, ?)'); $n=0;
        foreach (csvFileRows($file) as $r) { $st->execute([normalizeDateStr(v($r,['تاریخ'])), v($r,['نوع'],'other'), v($r,['عنوان']), v($r,['جزئیات_JSON'])]); $n++; }
        $report['archive'] = $n;
    }

    updateCalculations($pdo);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if (PHP_SAPI === 'cli') { fwrite(STDERR, $e->getMessage() . PHP_EOL); exit(1); }
    http_response_code(500); echo htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'); exit;
}

if (PHP_SAPI === 'cli') { echo json_encode($report, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), PHP_EOL; exit; }
?>
<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Import Done</title><style>body{font-family:Tahoma;background:#efe4c8;padding:24px}.box{max-width:720px;margin:auto;background:#fff8e8;border-radius:24px;padding:24px;border:1px solid #c9aa6b}pre{direction:ltr;background:#14213d;color:#fff;padding:16px;border-radius:16px;overflow:auto}a{display:inline-block;margin-top:12px;background:#14213d;color:#fff;padding:12px 18px;border-radius:14px;text-decoration:none}</style></head><body><div class="box"><h1>ورود اطلاعات انجام شد</h1><pre><?= htmlspecialchars(json_encode($report, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), ENT_QUOTES, 'UTF-8') ?></pre><a href="index.php">بازگشت</a></div></body></html>
