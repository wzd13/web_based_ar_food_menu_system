<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

require_local_post();

if (!storage_writable()) {
    json_error('The targets folder is not writable.', 500);
}

if (!isset($_FILES['target'])) {
    json_error('No compiled target was received.');
}

$file = $_FILES['target'];
$error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($error !== UPLOAD_ERR_OK) {
    json_error(upload_error_message($error));
}
if (!is_uploaded_file($file['tmp_name'])) {
    json_error('The compiled target could not be verified.');
}

$size = (int) ($file['size'] ?? 0);
if ($size < 64) {
    json_error('The compiled target looks empty. Compile the menu again.');
}
if ($size > MAX_TARGET_BYTES) {
    json_error('The compiled target is too large.');
}

$destination = project_path(TARGET_REL);
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    json_error('The compiled target could not be saved.', 500);
}

json_response([
    'ok' => true,
    'message' => 'Tracking target compiled. You can scan the menu now.',
    'url' => TARGET_REL . '?v=' . filemtime($destination),
    'bytes' => $size,
]);
