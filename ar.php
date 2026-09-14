<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
header('Cache-Control: no-store');
header('Permissions-Policy: camera=(self)');

$status = system_status();
if (!camera_host_allowed()) {
    $target = phone_scan_url();
    if ($target) {
        header('Location: ' . $target, true, 302);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0c0908">
    <title>Scan menu · <?= h(APP_NAME) ?></title>
    <base href="<?= h(app_base()) ?>">
    <link rel="icon" href="<?= h(web_url('assets/images/logo.svg')) ?>" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= h(web_url('assets/css/app.css')) ?>?v=20">
    <script type="importmap">
    {
        "imports": {
            "three": "<?= h(web_url('assets/vendor/three/three.module.js')) ?>",
            "three/addons/": "<?= h(web_url('assets/vendor/three/addons/')) ?>"
        }
    }
    </script>
</head>
<body class="ar-body">
    <div class="ar-root" id="ar-root">
        <div id="ar-container"></div>
        <div class="ar-ui">
            <div class="ar-top">
                <a class="ar-back" href="index.php">Menu</a>
                <span class="ar-status warn" id="ar-status">Loading</span>
            </div>
            <p class="ar-idle" id="ar-idle">正在弹出相机权限，请点允许。</p>
            <div class="scan-frame" id="scan-frame" hidden></div>
            <div class="ar-bottom">
                <div class="ar-copy" id="ar-instruction">
                    <strong id="ar-name">Tap to start camera</strong>
                    <p id="ar-detail">Point at the food menu after the camera starts.</p>
                </div>
                <button class="btn ar-start" id="start-camera" type="button">点一下，弹出相机权限</button>
            </div>
        </div>
    </div>
    <p id="boot-error" class="boot-error" hidden>The AR library did not load. Check that assets/vendor is present, then reload.</p>
    <script type="application/json" id="ar-config"><?= json_encode([
        'targetUrl' => $status['targetUrl'],
        'layoutUrl' => $status['layoutUrl'] ?: LAYOUT_REL,
        'targetReady' => $status['target'],
        'stale' => $status['stale'],
        'menuReady' => $status['menu'],
        'httpsUrl' => phone_scan_url(),
    ], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_THROW_ON_ERROR) ?></script>
    <script type="module" src="<?= h(web_url('assets/js/ar.js')) ?>?v=18"></script>
    <script>
        setTimeout(function () {
            if (!window.__arBooted) {
                document.getElementById('boot-error').hidden = false;
            }
        }, 12000);
    </script>
</body>
</html>
