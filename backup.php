<?php
require_once __DIR__ . '/bootstrap.php';
$pdo = db();
$type = $_GET['type'] ?? 'json';
$tables = ['students','attendance_sessions','attendance_records','settings','notes','plans','essentials','mi_config','mi_logs','archive_logs','plan_files','telegram_queue'];
if ($type === 'sql') {
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="charshanbe_backup_' . date('Ymd_His') . '.sql"');
    echo "SET NAMES utf8mb4;\n";
    foreach ($tables as $table) {
        echo "\n-- $table\n";
        foreach ($pdo->query("SELECT * FROM `$table`") as $row) {
            $cols = array_keys($row);
            $vals = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote((string)$v), array_values($row));
            echo "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(',', $vals) . ");\n";
        }
    }
    exit;
}
$out = [];
foreach ($tables as $table) $out[$table] = $pdo->query("SELECT * FROM `$table`")->fetchAll();
header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="charshanbe_backup_' . date('Ymd_His') . '.json"');
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
