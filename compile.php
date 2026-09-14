<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/chrome.php';

$status = system_status();
$layout = read_layout() ?? empty_layout(900, 1600);
render_header('Prepare AR Tracking', 'prepare');
?>
<div class="wrap workspace">
    <div class="work-head">
        <div>
            <p class="kicker">Atelier</p>
            <h1>Prepare AR tracking</h1>
            <p class="lede">Upload the menu, mark each food photo, save the layout, then compile the tracking file the phone will recognize.</p>
        </div>
        <a class="btn" id="open-ar" href="ar.php" <?= $status['target'] ? '' : 'hidden' ?>>Open scanner</a>
    </div>

    <?php if (!$status['writable']): ?>
        <p class="banner error">PHP cannot write to assets/images or assets/targets. Make those folders writable.</p>
    <?php endif; ?>
    <?php if (!function_exists('imagecreatetruecolor')): ?>
        <p class="banner error">PHP GD is not loaded. On XAMPP enable extension=gd in php.ini. On cPanel open Select PHP Version, turn on gd, then reload. JPG conversion will fail until then.</p>
    <?php endif; ?>

    <div class="toolbar">
        <label class="btn file-btn">Upload new menu
            <input id="menu-file" type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp">
        </label>
        <button class="btn secondary" id="detect-btn" type="button">Detect food photos</button>
        <button class="btn secondary" id="save-btn" type="button">Save layout</button>
        <button class="btn" id="compile-btn" type="button">Compile tracking target</button>
    </div>
    <p id="banner" class="banner" hidden></p>
    <p id="progress-label" class="note"></p>
    <div class="progress" aria-hidden="true"><span id="progress-bar"></span></div>

    <div class="compiler">
        <div class="stage-card">
            <div class="stage" id="stage">
                <?php if ($status['menu']): ?>
                    <img id="menu-image" src="<?= h($status['menuUrl']) ?>" alt="Menu poster used to place dish markers" draggable="false">
                <?php else: ?>
                    <img id="menu-image" alt="Menu poster" hidden>
                    <p class="note">Upload a JPG, PNG, GIF, or WEBP poster up to 8 MB. It is saved as assets/images/menu.jpg.</p>
                <?php endif; ?>
                <div class="markers" id="markers"></div>
            </div>
        </div>
        <aside class="marker-panel">
            <h2>Food photos</h2>
            <p class="note">Click the poster to add a marker. Drag a number to move it. Mark a wrong detection as Ignore. The dashed circle is the aim area used by the scanner.</p>
            <div id="marker-list"></div>
        </aside>
    </div>
</div>
<script type="application/json" id="food-types"><?= json_encode(food_types(), JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_THROW_ON_ERROR) ?></script>
<script type="application/json" id="compile-config"><?= json_encode([
    'imageWidth' => (int) ($layout['imageWidth'] ?? 900),
    'imageHeight' => (int) ($layout['imageHeight'] ?? 1600),
    'layout' => $layout,
], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_THROW_ON_ERROR) ?></script>
<script type="module" src="<?= h(web_url('assets/js/compile.js')) ?>"></script>
<?php
render_footer();
