<?php
declare(strict_types=1);

/**
 * Paints the default tracking poster with PHP GD.
 * Each dish is a saturated square so the editor can find it,
 * and the labels add the edges MindAR needs for image tracking.
 */

function ensure_default_menu(): void
{
    if (menu_exists()) {
        return;
    }
    if (!function_exists('imagecreatetruecolor')) {
        return;
    }
    try {
        generate_default_menu();
    } catch (Throwable) {
        // The pages still load so the operator can upload a poster manually.
    }
}

function generate_default_menu(): void
{
    $metrics = poster_metrics();
    $width = $metrics['width'];
    $height = $metrics['height'];
    $image = imagecreatetruecolor($width, $height);
    if ($image === false) {
        throw new RuntimeException('Could not create the menu image.');
    }

    $paper = alloc($image, 0xF4EFE6);
    $ink = alloc($image, 0x1C1410);
    $copper = alloc($image, 0xB85C38);
    $copperDeep = alloc($image, 0x8C3E24);
    $header = alloc($image, 0x241910);
    $muted = alloc($image, 0x6E5C50);
    imagefilledrectangle($image, 0, 0, $width, $height, $paper);
    draw_paper_texture($image, $width, $height);
    imagefilledrectangle($image, 0, 0, $width, 140, $header);
    imagefilledrectangle($image, 0, 140, $width, 148, $copper);

    $font = find_font(false);
    $fontBold = find_font(true);

    draw_text($image, $fontBold, 34, 70, 62, 'The Copper Fork', alloc($image, 0xF8F1E8));
    draw_text($image, $font, 15, 70, 96, 'Web AR menu  ·  aim at a dish', alloc($image, 0xE4C7B4));
    draw_text($image, $font, 12, 70, 128, 'Hold steady. Move closer to switch the 3D model.', alloc($image, 0xCDB49F));
    draw_stamp($image, $width - 90, 70);

    $dishes = catalog();
    $layoutDishes = [];
    foreach ($dishes as $index => $dish) {
        $col = $index % $metrics['cols'];
        $row = intdiv($index, $metrics['cols']);
        $x = $metrics['originX'] + $col * ($metrics['photo'] + $metrics['gapX']);
        $y = $metrics['header'] + $row * $metrics['rowStride'];
        draw_photo($image, $dish, $x, $y, $metrics['photo'], $fontBold, $font, $index);
        draw_text($image, $fontBold, 13, $x, $y + $metrics['photo'] + 22, $dish['name'], $ink);
        $price = '$' . $dish['price'];
        $priceWidth = text_width($fontBold, 13, $price);
        draw_text($image, $fontBold, 13, $x + $metrics['photo'] - $priceWidth, $y + $metrics['photo'] + 22, $price, $copperDeep);

        $layoutDishes[] = [
            'id' => 'dish-' . ($index + 1),
            'type' => $dish['type'],
            'name' => $dish['name'],
            'nx' => ($x + $metrics['photo'] / 2) / $width,
            'ny' => ($y + $metrics['photo'] / 2) / $height,
            'z' => 0,
            'rotation' => 0,
            'radius' => (($metrics['photo'] / 2) / $width) * 1.35,
            'scale' => 0.42,
        ];
    }

    imagefilledrectangle($image, 70, $height - 72, $width - 70, $height - 70, $copper);
    draw_text($image, $font, 16, 70, $height - 28, 'Printed tracking image  ·  use this exact poster in the scanner', $muted);
    draw_text($image, $font, 16, $width - 220, $height - 28, 'CF-AR-015', $copperDeep);

    $menuPath = project_path(MENU_REL);
    if (!imagejpeg($image, $menuPath, 90)) {
        imagedestroy($image);
        throw new RuntimeException('Could not save the default menu image.');
    }
    imagedestroy($image);

    write_layout([
        'imageWidth' => $width,
        'imageHeight' => $height,
        'dishes' => $layoutDishes,
    ]);
}

function alloc(GdImage $image, int $hex): int
{
    return imagecolorallocate($image, ($hex >> 16) & 255, ($hex >> 8) & 255, $hex & 255);
}

function find_font(bool $bold): ?string
{
    $candidates = $bold
        ? [
            'C:/Windows/Fonts/georgiab.ttf',
            'C:/Windows/Fonts/segoeuib.ttf',
            'C:/Windows/Fonts/arialbd.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
        ]
        : [
            'C:/Windows/Fonts/georgia.ttf',
            'C:/Windows/Fonts/segoeui.ttf',
            'C:/Windows/Fonts/arial.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
        ];
    foreach ($candidates as $path) {
        if (is_file($path)) {
            return $path;
        }
    }
    return null;
}

function draw_text(GdImage $image, ?string $font, int $size, int $x, int $y, string $text, int $color): void
{
    if ($font !== null && function_exists('imagettftext')) {
        imagettftext($image, $size, 0, $x, $y, $color, $font, $text);
        return;
    }
    imagestring($image, 3, $x, $y - 12, $text, $color);
}

function text_width(?string $font, int $size, string $text): int
{
    if ($font !== null && function_exists('imagettfbbox')) {
        $box = imagettfbbox($size, 0, $font, $text);
        if (is_array($box)) {
            return (int) abs($box[2] - $box[0]);
        }
    }
    return strlen($text) * 7;
}

function draw_stamp(GdImage $image, int $cx, int $cy): void
{
    $ring = alloc($image, 0xE7C2AE);
    $fill = alloc($image, 0xB85C38);
    imagefilledellipse($image, $cx, $cy, 78, 78, $fill);
    imageellipse($image, $cx, $cy, 64, 64, $ring);
    $font = find_font(true);
    draw_text($image, $font, 16, $cx - 14, $cy + 6, 'CF', $ring);
}

function draw_paper_texture(GdImage $image, int $width, int $height): void
{
    $ink = alloc($image, 0xC9B7A6);
    for ($y = 160; $y < $height - 40; $y += 22) {
        for ($x = 18; $x < $width - 18; $x += 22) {
            $on = (($x * 13 + $y * 7) % 5) === 0;
            if ($on) {
                imagefilledellipse($image, $x, $y, 3, 3, $ink);
            }
        }
    }
}

function draw_photo(GdImage $image, array $dish, int $x, int $y, int $size, ?string $bold, ?string $regular, int $index = 0): void
{
    $palette = photo_palette($dish['type']);
    $bg = alloc($image, $palette['bg']);
    $ink = alloc($image, $palette['ink']);
    $light = alloc($image, $palette['light']);
    $accent = alloc($image, $palette['accent']);
    imagefilledrectangle($image, $x, $y, $x + $size - 1, $y + $size - 1, $bg);
    imagerectangle($image, $x + 6, $y + 6, $x + $size - 7, $y + $size - 7, $ink);

    $cx = $x + intdiv($size, 2);
    $cy = $y + intdiv($size, 2) - 6;
    match ($dish['type']) {
        'burger' => draw_icon_burger($image, $cx, $cy, $light, $ink, $accent),
        'pizza' => draw_icon_pizza($image, $cx, $cy, $light, $ink, $accent),
        'pasta' => draw_icon_pasta($image, $cx, $cy, $light, $ink, $accent),
        'fried-chicken' => draw_icon_chicken($image, $cx, $cy, $light, $ink, $accent),
        'salad' => draw_icon_salad($image, $cx, $cy, $light, $ink, $accent),
        'skewers' => draw_icon_skewers($image, $cx, $cy, $light, $ink, $accent),
        'juice' => draw_icon_juice($image, $cx, $cy, $light, $ink, $accent),
        'wrap' => draw_icon_wrap($image, $cx, $cy, $light, $ink, $accent),
        'kebab' => draw_icon_kebab($image, $cx, $cy, $light, $ink, $accent),
        'roast' => draw_icon_roast($image, $cx, $cy, $light, $ink, $accent),
        'coffee' => draw_icon_coffee($image, $cx, $cy, $light, $ink, $accent),
        'smoothie' => draw_icon_smoothie($image, $cx, $cy, $light, $ink, $accent),
        'iced-coffee' => draw_icon_iced($image, $cx, $cy, $light, $ink, $accent),
        'fried-platter' => draw_icon_platter($image, $cx, $cy, $light, $ink, $accent),
        default => imagefilledellipse($image, $cx, $cy, 90, 90, $light),
    };

    $label = strtoupper($dish['name']);
    $labelWidth = text_width($bold, 16, $label);
    draw_text($image, $bold, 16, $x + intdiv($size - $labelWidth, 2), $y + $size - 22, $label, $ink);
    draw_tracking_marks($image, $x, $y, $size, $index);
}

function draw_tracking_marks(GdImage $image, int $x, int $y, int $size, int $index): void
{
    $dark = alloc($image, 0x1C1410);
    $light = alloc($image, 0xFFF8F0);
    $cell = 14;
    for ($i = 0; $i < 8; $i++) {
        $bit = (($index + 1) * 17 + $i * 13) % 2 === 0;
        $color = $bit ? $dark : $light;
        imagefilledrectangle($image, $x + 10 + $i * $cell, $y + 10, $x + 22 + $i * $cell, $y + 24, $color);
        imagefilledrectangle($image, $x + 10 + $i * $cell, $y + $size - 24, $x + 22 + $i * $cell, $y + $size - 10, $bit ? $light : $dark);
    }
}

function photo_palette(string $type): array
{
    return match ($type) {
        'burger' => ['bg' => 0xC47A45, 'ink' => 0x3A2214, 'light' => 0xF0C48A, 'accent' => 0xC4473A],
        'pizza' => ['bg' => 0xD3544A, 'ink' => 0x3E1614, 'light' => 0xF6D78A, 'accent' => 0xF3E7D8],
        'pasta' => ['bg' => 0xE0B15A, 'ink' => 0x3E2A12, 'light' => 0xF6E2B0, 'accent' => 0xC4473A],
        'fried-chicken' => ['bg' => 0xD4893A, 'ink' => 0x3A220E, 'light' => 0xF2C27A, 'accent' => 0x8C4A22],
        'salad' => ['bg' => 0x5D9A62, 'ink' => 0x17351C, 'light' => 0xD7E7A8, 'accent' => 0xE15B4C],
        'skewers' => ['bg' => 0xB5523A, 'ink' => 0x3A1610, 'light' => 0xF0C9A0, 'accent' => 0x6FA84A],
        'juice' => ['bg' => 0xE09A2B, 'ink' => 0x3E2808, 'light' => 0xFFE08A, 'accent' => 0xF26A2E],
        'wrap' => ['bg' => 0xC4A15A, 'ink' => 0x3A2A12, 'light' => 0xF3E0B4, 'accent' => 0x5E9A55],
        'kebab' => ['bg' => 0xA85A3C, 'ink' => 0x3A1C10, 'light' => 0xE7B48A, 'accent' => 0xD4483A],
        'roast' => ['bg' => 0x8C4A32, 'ink' => 0x2C1610, 'light' => 0xD7A27A, 'accent' => 0x6B8F45],
        'coffee' => ['bg' => 0x6B4636, 'ink' => 0x1C100C, 'light' => 0xE7D3C0, 'accent' => 0x3A241C],
        'smoothie' => ['bg' => 0xD46A8A, 'ink' => 0x3E1424, 'light' => 0xF7C3D4, 'accent' => 0xF4F0EA],
        'iced-coffee' => ['bg' => 0x8D6A4A, 'ink' => 0x2A1A10, 'light' => 0xE8D2B8, 'accent' => 0x5C3A28],
        'fried-platter' => ['bg' => 0xC47A32, 'ink' => 0x3A220C, 'light' => 0xF6D7A2, 'accent' => 0xE8C56A],
        default => ['bg' => 0xC47A45, 'ink' => 0x3A2214, 'light' => 0xF0C48A, 'accent' => 0xC4473A],
    };
}

function draw_icon_burger(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 28, 118, 28, $light);
    imagefilledrectangle($im, $cx - 48, $cy + 4, $cx + 48, $cy + 18, $ink);
    imagefilledrectangle($im, $cx - 52, $cy - 8, $cx + 52, $cy + 4, alloc_shift($im, $accent, 40));
    imagefilledellipse($im, $cx, $cy - 22, 108, 52, $light);
    imagefilledellipse($im, $cx - 22, $cy - 28, 8, 8, $ink);
    imagefilledellipse($im, $cx + 8, $cy - 32, 8, 8, $ink);
    imagefilledellipse($im, $cx + 28, $cy - 24, 8, 8, $ink);
}

function draw_icon_pizza(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 6, 128, 128, $ink);
    imagefilledellipse($im, $cx, $cy + 6, 104, 104, $light);
    foreach ([[-28, -8], [8, -22], [26, 10], [-8, 24], [18, 28]] as [$dx, $dy]) {
        imagefilledellipse($im, $cx + $dx, $cy + $dy, 18, 18, $ink);
    }
    imagefilledellipse($im, $cx - 16, $cy + 8, 10, 10, $accent);
    imagefilledellipse($im, $cx + 12, $cy + 18, 10, 10, $accent);
}

function draw_icon_pasta(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 22, 124, 52, $ink);
    imagefilledellipse($im, $cx, $cy + 16, 100, 36, $accent);
    imagefilledellipse($im, $cx - 18, $cy + 8, 36, 16, $light);
    imagefilledellipse($im, $cx + 8, $cy + 4, 42, 16, $light);
    imagefilledellipse($im, $cx + 22, $cy + 14, 28, 14, $light);
    imagefilledellipse($im, $cx - 4, $cy - 4, 18, 12, $ink);
}

function draw_icon_chicken(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx - 24, $cy + 6, 62, 48, $light);
    imagefilledellipse($im, $cx + 22, $cy - 4, 54, 42, $accent);
    imagefilledellipse($im, $cx + 8, $cy + 28, 48, 34, $ink);
    imagefilledrectangle($im, $cx - 58, $cy + 8, $cx - 34, $cy + 16, $light);
    imagefilledellipse($im, $cx + 40, $cy + 22, 22, 22, $light);
}

function draw_icon_salad(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 22, 118, 42, $ink);
    imagefilledellipse($im, $cx - 22, $cy - 4, 48, 32, $light);
    imagefilledellipse($im, $cx + 18, $cy - 10, 42, 28, $light);
    imagefilledellipse($im, $cx + 4, $cy + 8, 36, 24, $ink);
    imagefilledellipse($im, $cx - 8, $cy + 2, 16, 16, $accent);
    imagefilledellipse($im, $cx + 24, $cy + 6, 14, 14, $accent);
}

function draw_icon_skewers(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagesetthickness($im, 3);
    imageline($im, $cx - 62, $cy + 36, $cx + 58, $cy - 36, $ink);
    imageline($im, $cx - 48, $cy + 48, $cx + 70, $cy - 18, $ink);
    imagesetthickness($im, 1);
    imagefilledellipse($im, $cx - 28, $cy + 16, 22, 22, $accent);
    imagefilledrectangle($im, $cx - 8, $cy - 2, $cx + 12, $cy + 16, $light);
    imagefilledellipse($im, $cx + 24, $cy - 14, 20, 20, $accent);
    imagefilledrectangle($im, $cx + 8, $cy + 16, $cx + 26, $cy + 32, $light);
}

function draw_icon_juice(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledrectangle($im, $cx - 28, $cy - 46, $cx + 28, $cy + 48, $light);
    imagefilledrectangle($im, $cx - 22, $cy - 10, $cx + 22, $cy + 42, $accent);
    imagefilledellipse($im, $cx + 36, $cy - 8, 28, 28, $ink);
    imagesetthickness($im, 3);
    imageline($im, $cx + 8, $cy - 54, $cx + 22, $cy + 20, $ink);
    imagesetthickness($im, 1);
}

function draw_icon_wrap(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx - 8, $cy + 8, 118, 56, $light);
    imagefilledellipse($im, $cx + 28, $cy + 8, 48, 40, $ink);
    imagefilledrectangle($im, $cx + 10, $cy - 6, $cx + 42, $cy + 4, $accent);
    imagefilledrectangle($im, $cx + 14, $cy + 8, $cx + 40, $cy + 18, $light);
    imagefilledellipse($im, $cx - 24, $cy + 6, 28, 16, $accent);
}

function draw_icon_kebab(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 36, 96, 28, $light);
    imagefilledellipse($im, $cx, $cy + 10, 42, 36, $accent);
    imagefilledellipse($im, $cx, $cy - 16, 36, 32, $ink);
    imagefilledellipse($im, $cx, $cy - 40, 28, 26, $accent);
    imagesetthickness($im, 3);
    imageline($im, $cx, $cy - 62, $cx, $cy + 40, $light);
    imagesetthickness($im, 1);
}

function draw_icon_roast(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 8, 120, 72, $ink);
    imagefilledellipse($im, $cx - 8, $cy + 2, 88, 48, $light);
    imagesetthickness($im, 2);
    imageline($im, $cx - 28, $cy - 4, $cx + 18, $cy + 8, $ink);
    imageline($im, $cx - 18, $cy + 12, $cx + 24, $cy - 2, $ink);
    imagesetthickness($im, 1);
    imagefilledellipse($im, $cx + 38, $cy + 18, 22, 16, $accent);
    imagefilledellipse($im, $cx - 40, $cy + 16, 18, 14, $accent);
}

function draw_icon_coffee(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx - 4, $cy + 42, 108, 22, $light);
    imagefilledrectangle($im, $cx - 32, $cy - 28, $cx + 28, $cy + 36, $light);
    imagefilledellipse($im, $cx - 2, $cy - 28, 60, 22, $accent);
    imagearc($im, $cx + 36, $cy + 4, 36, 40, 280, 80, $ink);
    imagearc($im, $cx + 36, $cy + 4, 28, 28, 280, 80, $ink);
}

function draw_icon_smoothie(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    $glass = [$cx - 26, $cy + 46, $cx + 26, $cy + 46, $cx + 18, $cy - 36, $cx - 18, $cy - 36];
    imagefilledpolygon($im, $glass, $light);
    imagefilledellipse($im, $cx, $cy - 42, 36, 22, $accent);
    imagefilledellipse($im, $cx + 10, $cy - 48, 14, 14, $ink);
    imagesetthickness($im, 3);
    imageline($im, $cx + 6, $cy - 58, $cx + 18, $cy + 10, $ink);
    imagesetthickness($im, 1);
}

function draw_icon_iced(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledrectangle($im, $cx - 26, $cy - 42, $cx + 26, $cy + 48, $light);
    imagefilledrectangle($im, $cx - 20, $cy - 8, $cx + 20, $cy + 42, $accent);
    imagefilledrectangle($im, $cx - 12, $cy - 24, $cx + 2, $cy - 8, $light);
    imagefilledrectangle($im, $cx + 4, $cy - 6, $cx + 16, $cy + 10, $light);
    imagesetthickness($im, 3);
    imageline($im, $cx - 4, $cy - 56, $cx + 10, $cy + 16, $ink);
    imagesetthickness($im, 1);
}

function draw_icon_platter(GdImage $im, int $cx, int $cy, int $light, int $ink, int $accent): void
{
    imagefilledellipse($im, $cx, $cy + 10, 140, 72, $light);
    imagefilledellipse($im, $cx, $cy + 10, 118, 50, $ink);
    imagefilledrectangle($im, $cx - 28, $cy - 8, $cx - 18, $cy + 28, $accent);
    imagefilledrectangle($im, $cx - 10, $cy - 16, $cx, $cy + 24, $accent);
    imagefilledrectangle($im, $cx + 6, $cy - 6, $cx + 16, $cy + 26, $accent);
    imageellipse($im, $cx + 32, $cy + 8, 26, 18, $light);
    imageellipse($im, $cx - 40, $cy + 16, 22, 16, $light);
}

function alloc_shift(GdImage $image, int $color, int $amount): int
{
    $rgb = imagecolorsforindex($image, $color);
    $mix = static fn (int $channel): int => max(0, min(255, $channel + $amount));
    return imagecolorallocate($image, $mix($rgb['red']), $mix($rgb['green']), $mix($rgb['blue']));
}
