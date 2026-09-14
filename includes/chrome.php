<?php
declare(strict_types=1);

function render_header(string $title, string $active = ''): void
{
    $full = $title === '' ? APP_NAME . ' · ' . APP_TITLE : $title . ' · ' . APP_NAME;
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#140e0b">
    <title><?= h($full) ?></title>
    <base href="<?= h(app_base()) ?>">
    <link rel="icon" href="<?= h(web_url('assets/images/logo.svg')) ?>" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= h(web_url('assets/css/app.css')) ?>?v=20">
</head>
<body>
    <a class="skip" href="#main">Skip to content</a>
    <header class="site-header">
        <a class="brand" href="index.php">
            <img src="<?= h(web_url('assets/images/logo.svg')) ?>" alt="" width="44" height="44">
            <span>
                <strong><?= h(APP_NAME) ?></strong>
                <em><?= h(APP_TITLE) ?></em>
            </span>
        </a>
        <nav class="site-nav" aria-label="Primary">
            <?php
            $links = [
                'home' => ['index.php', 'Home'],
                'menu' => ['menu.php', 'Menu'],
                'scan' => ['ar.php', 'Scan'],
                'prepare' => ['compile.php', 'Prepare'],
            ];
            foreach ($links as $key => [$href, $label]) {
                $class = $key === $active ? ' class="is-active"' : '';
                echo '<a href="' . h($href) . '"' . $class . '>' . h($label) . '</a>';
            }
            ?>
        </nav>
    </header>
    <main id="main">
    <?php
}

function render_footer(): void
{
    ?>
    </main>
    <footer class="site-footer">
        <span class="footer-mark"><?= h(APP_NAME) ?></span>
        <p>Point a phone at the menu. A dish becomes a 3D model.</p>
    </footer>
</body>
</html>
    <?php
}
