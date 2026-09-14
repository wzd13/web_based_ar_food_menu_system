<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/chrome.php';

$status = system_status();
render_header('Display Menu', 'menu');
?>
<div class="wrap menu-page">
    <div class="work-head">
        <div>
            <p class="kicker">Tracking image</p>
            <h1>Display menu</h1>
            <p class="lede">Show this poster on a screen or print it. The scanner recognizes this exact picture, then lifts a 3D model from the photo you aim at.</p>
        </div>
        <div class="actions">
            <a class="btn" href="ar.php">Scan in AR</a>
            <a class="btn secondary" href="compile.php">Prepare Tracking</a>
        </div>
    </div>
    <div class="menu-frame">
        <?php if ($status['menu']): ?>
            <img src="<?= h($status['menuUrl']) ?>" alt="Full restaurant menu used for AR tracking">
        <?php else: ?>
            <p class="note">The menu image is missing. Enable PHP GD, then reload or upload a poster on the Prepare page.</p>
        <?php endif; ?>
    </div>
</div>
<?php
render_footer();
