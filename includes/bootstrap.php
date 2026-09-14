<?php
declare(strict_types=1);

/**
 * Shared setup for the AR Food Menu.
 * The menu image, dish layout, and compiled tracking file live on disk
 * so the app can run on XAMPP without a framework or a database.
 */

const APP_NAME = 'The Copper Fork';
const APP_TITLE = 'AR Food Menu';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_TARGET_BYTES = 20 * 1024 * 1024;
const MENU_REL = 'assets/images/menu.jpg';
const LAYOUT_REL = 'assets/targets/layout.json';
const TARGET_REL = 'assets/targets/menu.mind';

if (PHP_VERSION_ID < 80000) {
    http_response_code(500);
    exit('This app needs PHP 8.0 or newer. In cPanel open MultiPHP Manager and choose PHP 8.1 or 8.2.');
}

$configFile = __DIR__ . '/config.php';
if (is_file($configFile)) {
    require_once $configFile;
}

function project_root(): string
{
    return dirname(__DIR__);
}

function project_path(string $relative): string
{
    return project_root() . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative);
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

/**
 * Web path of this app, always with a trailing slash.
 * Uses the real script location, so assets still load when the
 * address has no trailing slash or the app lives in a subfolder.
 */
function app_base(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    $dir = str_replace('\\', '/', dirname($script));
    if (str_ends_with($dir, '/api')) {
        $dir = substr($dir, 0, -4);
    }
    if ($dir === '/' || $dir === '.' || $dir === '') {
        return '/';
    }
    return rtrim($dir, '/') . '/';
}

function web_url(string $relative): string
{
    return app_base() . ltrim(str_replace('\\', '/', $relative), '/');
}

const PHONE_HTTPS_PORT = 8443;

/** IPv4 address a phone on the same Wi-Fi can open. */
function lan_ipv4(): ?string
{
    $found = [];
    if (function_exists('net_get_interfaces')) {
        foreach (net_get_interfaces() as $info) {
            foreach ($info['unicast'] ?? [] as $addr) {
                $ip = $addr['address'] ?? '';
                if (!is_string($ip) || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                    continue;
                }
                if (str_starts_with($ip, '127.') || str_starts_with($ip, '169.254.')) {
                    continue;
                }
                $found[] = $ip;
            }
        }
    }
    if ($found === []) {
        $name = gethostbyname(gethostname());
        if (is_string($name) && filter_var($name, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && !str_starts_with($name, '127.')) {
            $found[] = $name;
        }
    }
    foreach (['192.168.', '10.', '172.'] as $prefix) {
        foreach ($found as $ip) {
            if (str_starts_with($ip, $prefix)) {
                return $ip;
            }
        }
    }
    return $found[0] ?? null;
}

function phone_https_origin(): ?string
{
    $ip = lan_ipv4();
    if ($ip === null) {
        return null;
    }
    return 'https://' . $ip . ':' . PHONE_HTTPS_PORT;
}

function trusted_phone_origin(): ?string
{
    $file = project_path('certs/phone-url.txt');
    if (!is_file($file)) {
        return null;
    }
    $url = trim((string) file_get_contents($file));
    if (!preg_match('#^https://[A-Za-z0-9.-]+$#', $url)) {
        return null;
    }
    return $url;
}

function request_host_header(): string
{
    $forwarded = trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''));
    $host = $forwarded !== '' ? explode(',', $forwarded)[0] : (string) ($_SERVER['HTTP_HOST'] ?? '');
    return strtolower(trim($host));
}

function configured_public_origin(): ?string
{
    $base = configured_public_base();
    if ($base === null) {
        return null;
    }
    $parts = parse_url($base);
    $host = strtolower((string) ($parts['host'] ?? ''));
    if ($host === '') {
        return null;
    }
    $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
    return 'https://' . $host . $port;
}

function configured_public_base(): ?string
{
    if (!defined('PUBLIC_ORIGIN')) {
        return null;
    }
    $origin = rtrim(trim((string) PUBLIC_ORIGIN), '/');
    if (!preg_match('#^https://[A-Za-z0-9.-]+(?::\d+)?(?:/[\w.-]+)*$#', $origin)) {
        return null;
    }
    return $origin;
}

function is_public_domain_host(?string $host = null): bool
{
    $name = $host ?? request_host_name();
    if ($name === '' || request_is_local_host()) {
        return false;
    }
    if (filter_var($name, FILTER_VALIDATE_IP)) {
        return false;
    }
    return str_contains($name, '.');
}

function public_site_origin(): ?string
{
    $configured = configured_public_origin();
    if ($configured !== null) {
        return $configured;
    }
    if (is_public_domain_host()) {
        return 'https://' . request_host_header();
    }
    return null;
}

function phone_scan_url(): ?string
{
    $configured = configured_public_base();
    if ($configured !== null) {
        return $configured . '/ar.php';
    }
    $public = public_site_origin();
    if ($public !== null) {
        return $public . web_url('ar.php');
    }
    if (request_is_https() && !request_is_local_host()) {
        return 'https://' . request_host_header() . web_url('ar.php');
    }
    $trusted = trusted_phone_origin();
    if ($trusted !== null) {
        return $trusted . web_url('ar.php');
    }
    $origin = phone_https_origin();
    return $origin === null ? null : $origin . web_url('ar.php');
}

function camera_host_allowed(): bool
{
    if (request_is_local_host()) {
        return true;
    }
    if (request_is_https()) {
        return true;
    }
    return false;
}

function request_host_name(): string
{
    $host = request_host_header();
    if (str_starts_with($host, '[')) {
        $end = strpos($host, ']');
        return $end === false ? $host : substr($host, 1, $end - 1);
    }
    $trimmed = preg_replace('/:\d+$/', '', $host);
    return is_string($trimmed) ? $trimmed : $host;
}

function request_is_local_host(): bool
{
    return in_array(request_host_name(), ['localhost', '127.0.0.1', '::1'], true);
}

function request_is_https(): bool
{
    $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
    if ($https !== '' && $https !== 'off') {
        return true;
    }
    return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

/** Food types shared with assets/js/foods.js. "ignore" is an editor-only marker. */
function food_types(): array
{
    return [
        'ignore' => 'Ignore',
        'burger' => 'Burger',
        'pizza' => 'Pizza',
        'pasta' => 'Pasta',
        'fried-chicken' => 'Fried Chicken',
        'salad' => 'Salad',
        'skewers' => 'Skewers',
        'juice' => 'Juice',
        'wrap' => 'Wrap',
        'kebab' => 'Kebab',
        'roast' => 'Roast',
        'coffee' => 'Coffee',
        'smoothie' => 'Smoothie',
        'iced-coffee' => 'Iced Coffee',
        'fried-platter' => 'Fried Platter',
    ];
}

function catalog(): array
{
    return [
        ['type' => 'burger', 'name' => 'Classic Burger', 'price' => '14'],
        ['type' => 'pizza', 'name' => 'Margherita Pizza', 'price' => '16'],
        ['type' => 'pasta', 'name' => 'Tomato Pasta', 'price' => '15'],
        ['type' => 'fried-chicken', 'name' => 'Fried Chicken', 'price' => '13'],
        ['type' => 'salad', 'name' => 'Garden Salad', 'price' => '11'],
        ['type' => 'skewers', 'name' => 'Veggie Skewers', 'price' => '12'],
        ['type' => 'juice', 'name' => 'Citrus Juice', 'price' => '6'],
        ['type' => 'wrap', 'name' => 'Garden Wrap', 'price' => '12'],
        ['type' => 'kebab', 'name' => 'House Kebab', 'price' => '15'],
        ['type' => 'roast', 'name' => 'Sunday Roast', 'price' => '18'],
        ['type' => 'coffee', 'name' => 'Filter Coffee', 'price' => '4'],
        ['type' => 'smoothie', 'name' => 'Berry Smoothie', 'price' => '7'],
        ['type' => 'iced-coffee', 'name' => 'Iced Coffee', 'price' => '5'],
        ['type' => 'fried-platter', 'name' => 'Fried Platter', 'price' => '17'],
    ];
}

/**
 * Poster geometry. The same numbers are used to paint the default menu
 * and to place the first dish markers, so they stay aligned.
 */
function poster_metrics(): array
{
    $width = 1200;
    $photo = 360;
    $gapX = 28;
    $cols = 3;
    $originX = (int) (($width - ($photo * $cols + $gapX * ($cols - 1))) / 2);

    return [
        'width' => $width,
        'height' => 2480,
        'cols' => $cols,
        'photo' => $photo,
        'label' => 42,
        'gapX' => $gapX,
        'gapY' => 18,
        'header' => 170,
        'originX' => $originX,
        'rowStride' => 360 + 42 + 18,
    ];
}

function ensure_storage(): void
{
    foreach (['assets/images', 'assets/targets'] as $dir) {
        $path = project_path($dir);
        if (!is_dir($path) && !mkdir($path, 0755, true) && !is_dir($path)) {
            throw new RuntimeException('Could not create ' . $dir);
        }
    }
}

function storage_writable(): bool
{
    return is_writable(project_path('assets/images')) && is_writable(project_path('assets/targets'));
}

function menu_exists(): bool
{
    return is_file(project_path(MENU_REL));
}

function target_exists(): bool
{
    return is_file(project_path(TARGET_REL));
}

function target_is_stale(): bool
{
    $menu = project_path(MENU_REL);
    $target = project_path(TARGET_REL);
    if (!is_file($menu) || !is_file($target)) {
        return false;
    }
    return filemtime($menu) > filemtime($target) + 2;
}

function read_layout(): ?array
{
    $path = project_path(LAYOUT_REL);
    if (!is_file($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return null;
    }
    return is_array($data) ? $data : null;
}

function active_dish_count(?array $layout = null): int
{
    $layout ??= read_layout();
    if (!$layout || !isset($layout['dishes']) || !is_array($layout['dishes'])) {
        return 0;
    }
    $count = 0;
    foreach ($layout['dishes'] as $dish) {
        if (is_array($dish) && ($dish['type'] ?? 'ignore') !== 'ignore') {
            $count++;
        }
    }
    return $count;
}

function system_status(): array
{
    $layout = read_layout();
    return [
        'menu' => menu_exists(),
        'layout' => $layout !== null,
        'target' => target_exists(),
        'stale' => target_is_stale(),
        'dishCount' => active_dish_count($layout),
        'writable' => storage_writable(),
        'menuUrl' => web_url(MENU_REL) . (menu_exists() ? '?v=' . filemtime(project_path(MENU_REL)) : ''),
        'targetUrl' => web_url(TARGET_REL) . (target_exists() ? '?v=' . filemtime(project_path(TARGET_REL)) : ''),
        'layoutUrl' => web_url(LAYOUT_REL) . (is_file(project_path(LAYOUT_REL)) ? '?v=' . filemtime(project_path(LAYOUT_REL)) : ''),
    ];
}

function clamp_number(float $value, float $min, float $max): float
{
    return max($min, min($max, $value));
}

/**
 * Rebuild AR coordinates from the normalized photo positions.
 * MindAR places the tracked image in the anchor's XY plane:
 * width is 1, height is imageHeight / imageWidth, and +Y is up.
 */
function apply_ar_positions(array $layout): array
{
    $width = max(1, (int) ($layout['imageWidth'] ?? 1));
    $height = max(1, (int) ($layout['imageHeight'] ?? 1));
    $aspect = $height / $width;
    $types = food_types();
    $dishes = [];
    $index = 1;

    foreach ($layout['dishes'] ?? [] as $dish) {
        if (!is_array($dish)) {
            continue;
        }
        $type = (string) ($dish['type'] ?? 'ignore');
        if (!isset($types[$type])) {
            $type = 'ignore';
        }
        $nx = clamp_number((float) ($dish['nx'] ?? 0.5), 0.0, 1.0);
        $ny = clamp_number((float) ($dish['ny'] ?? 0.5), 0.0, 1.0);
        $name = trim((string) ($dish['name'] ?? ''));
        if ($name === '') {
            $name = $types[$type];
        }
        $name = mb_substr($name, 0, 40);
        $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($dish['id'] ?? '')) ?? '';
        if ($id === '') {
            $id = 'dish-' . $index;
        }
        $arX = round($nx - 0.5, 4);
        $arY = round((0.5 - $ny) * $aspect, 4);

        $dishes[] = [
            'id' => $id,
            'type' => $type,
            'name' => $name,
            'nx' => round($nx, 4),
            'ny' => round($ny, 4),
            'arX' => $arX,
            'arY' => $arY,
            'z' => round(clamp_number((float) ($dish['z'] ?? 0), -0.2, 0.4), 4),
            'rotation' => round((float) ($dish['rotation'] ?? 0), 4),
            'radius' => round(clamp_number((float) ($dish['radius'] ?? 0.12), 0.03, 0.35), 4),
            'scale' => round(clamp_number((float) ($dish['scale'] ?? 0.18), 0.05, 0.6), 4),
        ];
        $index++;
        if ($index > 41) {
            break;
        }
    }

    return [
        'version' => 1,
        'imageWidth' => $width,
        'imageHeight' => $height,
        'image' => MENU_REL,
        'target' => TARGET_REL,
        'updatedAt' => gmdate('c'),
        'dishes' => $dishes,
    ];
}

function write_layout(array $layout): void
{
    $normalized = apply_ar_positions($layout);
    $json = json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $path = project_path(LAYOUT_REL);
    if (file_put_contents($path, $json . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Could not save the dish layout.');
    }
}

function empty_layout(int $width, int $height): array
{
    return apply_ar_positions([
        'imageWidth' => $width,
        'imageHeight' => $height,
        'dishes' => [],
    ]);
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function json_error(string $message, int $status = 400): never
{
    json_response(['ok' => false, 'error' => $message], $status);
}

function require_local_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        json_error('Use POST for this action.', 405);
    }
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'ARMenu') {
        json_error('Invalid request.', 400);
    }
}

function upload_error_message(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The image is larger than the server allows. Raise upload_max_filesize and post_max_size above 8M (php.ini, or cPanel MultiPHP INI Editor).',
        UPLOAD_ERR_PARTIAL => 'The upload was interrupted. Please try again.',
        UPLOAD_ERR_NO_FILE => 'Choose an image before uploading.',
        UPLOAD_ERR_NO_TMP_DIR => 'PHP has no temporary folder for uploads.',
        UPLOAD_ERR_CANT_WRITE => 'PHP could not write the uploaded file.',
        UPLOAD_ERR_EXTENSION => 'A PHP extension blocked the upload.',
        default => 'The upload failed.',
    };
}

require_once __DIR__ . '/poster.php';
ensure_storage();
ensure_default_menu();
