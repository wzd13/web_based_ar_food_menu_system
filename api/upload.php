<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

require_local_post();

if (!storage_writable()) {
    json_error('The images folder is not writable. Allow PHP to write to assets/images and assets/targets.', 500);
}

if (!function_exists('imagecreatetruecolor') || !function_exists('imagejpeg')) {
    json_error('PHP GD is not available, so the menu cannot be converted to JPG. Enable the gd extension and restart Apache.', 500);
}

if (!isset($_FILES['menu'])) {
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > MAX_UPLOAD_BYTES) {
        json_error('The image is larger than 8 MB.');
    }
    json_error('No image was received. If the file is large, raise post_max_size in php.ini and restart Apache.');
}

$file = $_FILES['menu'];
$error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($error !== UPLOAD_ERR_OK) {
    json_error(upload_error_message($error));
}

if (!is_uploaded_file($file['tmp_name'])) {
    json_error('The upload could not be verified.');
}

$size = (int) ($file['size'] ?? 0);
if ($size < 1) {
    json_error('The uploaded file is empty.');
}
if ($size > MAX_UPLOAD_BYTES) {
    json_error('The image is larger than 8 MB. Export a smaller JPG or PNG.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: '';
$allowed = [
    'image/jpeg' => 'imagecreatefromjpeg',
    'image/png' => 'imagecreatefrompng',
    'image/gif' => 'imagecreatefromgif',
    'image/webp' => 'imagecreatefromwebp',
];
if (!isset($allowed[$mime])) {
    json_error('Use a JPG, JPEG, PNG, GIF, or WEBP image.');
}

$loader = $allowed[$mime];
if (!function_exists($loader)) {
    json_error('This PHP build cannot read that image type. Save the menu as JPG or PNG.');
}

$info = @getimagesize($file['tmp_name']);
if ($info === false) {
    json_error('The file is not a valid image.');
}

$source = @$loader($file['tmp_name']);
if (!$source instanceof GdImage) {
    json_error('The image could not be read. If it is a WEBP, GIF, or PNG, convert it to JPG and try again.');
}

try {
    $source = apply_exif_orientation($source, $file['tmp_name'], $mime);
    $jpg = flatten_to_jpeg_canvas($source);
    imagedestroy($source);
    $jpg = resize_longest_side($jpg, 1600);
} catch (Throwable) {
    json_error('The image could not be converted to JPG. Save it as a JPG and try again.', 500);
}
$width = imagesx($jpg);
$height = imagesy($jpg);
$path = project_path(MENU_REL);

if (!imagejpeg($jpg, $path, 88)) {
    imagedestroy($jpg);
    json_error('The menu image could not be saved.', 500);
}
imagedestroy($jpg);

$target = project_path(TARGET_REL);
if (is_file($target)) {
    unlink($target);
}

$layout = empty_layout($width, $height);
write_layout($layout);

json_response([
    'ok' => true,
    'message' => 'Menu saved as JPG. Previous dish markers were cleared. Detect photos or click the poster to add them, then compile tracking.',
    'width' => $width,
    'height' => $height,
    'url' => MENU_REL . '?v=' . filemtime($path),
    'layout' => $layout,
]);

function apply_exif_orientation(GdImage $image, string $path, string $mime): GdImage
{
    if ($mime !== 'image/jpeg' || !function_exists('exif_read_data')) {
        return $image;
    }
    $exif = @exif_read_data($path);
    $orientation = (int) ($exif['Orientation'] ?? 1);
    $rotated = match ($orientation) {
        3 => imagerotate($image, 180, 0),
        6 => imagerotate($image, -90, 0),
        8 => imagerotate($image, 90, 0),
        default => $image,
    };
    if ($rotated instanceof GdImage && $rotated !== $image) {
        imagedestroy($image);
        return $rotated;
    }
    return $image;
}

function flatten_to_jpeg_canvas(GdImage $source): GdImage
{
    $width = imagesx($source);
    $height = imagesy($source);
    $canvas = imagecreatetruecolor($width, $height);
    if ($canvas === false) {
        throw new RuntimeException('Could not create a JPG canvas.');
    }
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefilledrectangle($canvas, 0, 0, $width, $height, $white);
    imagecopy($canvas, $source, 0, 0, 0, 0, $width, $height);
    return $canvas;
}

function resize_longest_side(GdImage $image, int $maxSide): GdImage
{
    $width = imagesx($image);
    $height = imagesy($image);
    $longest = max($width, $height);
    if ($longest <= $maxSide) {
        return $image;
    }
    $scale = $maxSide / $longest;
    $newWidth = max(1, (int) round($width * $scale));
    $newHeight = max(1, (int) round($height * $scale));
    $resized = imagecreatetruecolor($newWidth, $newHeight);
    if ($resized === false) {
        return $image;
    }
    imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    imagedestroy($image);
    return $resized;
}
