<?php
declare(strict_types=1);

/**
 * Dev server router for: php -S localhost:8000 router.php
 * Serves this app at / and at /AR_System/, so a missing trailing slash
 * or an extra folder name does not 404 the stylesheet.
 */

$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if ($uri === '' || str_contains($uri, '..')) {
    http_response_code(400);
    echo 'Bad path';
    return true;
}
if (preg_match('#^/(AR_System/)?certs(/|$)#', $uri)) {
    http_response_code(404);
    echo 'Not found';
    return true;
}

$prefix = '/AR_System';
$mapped = $uri;
$underPrefix = $uri === $prefix || str_starts_with($uri, $prefix . '/');
if ($underPrefix) {
    $mapped = substr($uri, strlen($prefix));
    if ($mapped === '' || $mapped === false) {
        $mapped = '/';
    }
}

if (!$underPrefix) {
    $direct = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $mapped);
    if ($mapped !== '/' && is_file($direct)) {
        return false;
    }
    if ($mapped === '/' || $mapped === '/index.php') {
        return false;
    }
}

$relative = $mapped === '/' ? '/index.php' : $mapped;
if (str_ends_with($relative, '/')) {
    $relative .= 'index.php';
}
$local = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $relative);
if (!is_file($local)) {
    http_response_code(404);
    echo 'Not found';
    return true;
}

$scriptName = ($underPrefix ? $prefix : '') . $relative;
if (strtolower(pathinfo($local, PATHINFO_EXTENSION)) === 'php') {
    $_SERVER['SCRIPT_NAME'] = $scriptName;
    $_SERVER['SCRIPT_FILENAME'] = $local;
    $_SERVER['PHP_SELF'] = $scriptName;
    chdir(dirname($local));
    require $local;
    return true;
}

$types = [
    'css' => 'text/css; charset=UTF-8',
    'js' => 'text/javascript; charset=UTF-8',
    'svg' => 'image/svg+xml',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'json' => 'application/json; charset=UTF-8',
    'mind' => 'application/octet-stream',
];
$ext = strtolower(pathinfo($local, PATHINFO_EXTENSION));
header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
header('Content-Length: ' . (string) filesize($local));
readfile($local);
return true;
