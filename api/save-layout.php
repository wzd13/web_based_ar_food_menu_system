<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

require_local_post();

if (!storage_writable()) {
    json_error('The targets folder is not writable.', 500);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    json_error('The layout was empty.');
}
if (strlen($raw) > 200000) {
    json_error('The layout is too large.');
}

try {
    $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException) {
    json_error('The layout is not valid JSON.');
}

if (!is_array($input)) {
    json_error('The layout must be a JSON object.');
}

$width = (int) ($input['imageWidth'] ?? 0);
$height = (int) ($input['imageHeight'] ?? 0);
if ($width < 32 || $height < 32 || $width > 8000 || $height > 8000) {
    json_error('The menu size in the layout is not valid.');
}

$dishes = $input['dishes'] ?? [];
if (!is_array($dishes)) {
    json_error('Dishes must be a list.');
}
if (count($dishes) > 40) {
    json_error('Use 40 dish markers or fewer.');
}

try {
    write_layout([
        'imageWidth' => $width,
        'imageHeight' => $height,
        'dishes' => $dishes,
    ]);
} catch (RuntimeException $exception) {
    json_error($exception->getMessage(), 500);
}

$layout = read_layout();
json_response([
    'ok' => true,
    'message' => 'Dish layout saved.',
    'layout' => $layout,
]);
