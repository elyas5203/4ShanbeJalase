<?php
require_once __DIR__ . '/bootstrap.php';
$update = json_decode(file_get_contents('php://input'), true) ?: [];
$pdo = db();
$s = settings($pdo);
$token = trim($s['BOT_TOKEN'] ?? '');
if ($token && isset($update['callback_query'])) {
    $cb = $update['callback_query'];
    @file_get_contents('https://api.telegram.org/bot' . $token . '/answerCallbackQuery', false, stream_context_create(['http'=>['method'=>'POST','header'=>'Content-Type: application/json','content'=>json_encode(['callback_query_id'=>$cb['id'], 'text'=>'بررسی شد.'], JSON_UNESCAPED_UNICODE)]]));
    if (substr(($cb['data'] ?? ''), 0, 5) === 'DONE_') {
        $uid = substr($cb['data'], 5);
        $pdo->prepare('UPDATE essentials SET done=1 WHERE uid=?')->execute([$uid]);
    }
}
echo 'ok';
