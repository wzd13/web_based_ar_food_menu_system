<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/chrome.php';

$status = system_status();
$phoneUrl = phone_scan_url();

render_header(APP_TITLE, 'home');
?>
<div class="wrap">
    <section class="hero">
        <div>
            <p class="kicker"><?= h(APP_NAME) ?></p>
            <h1>Hold the menu up.<br><em>A dish comes to life.</em></h1>
            <p class="lede">A private-table AR menu. Open it on a phone, aim at a food photo, and only that dish rises as a slowly turning 3D model.</p>
            <div class="actions">
                <a class="btn" href="menu.php">Display Menu</a>
                <a class="btn secondary" href="ar.php">Scan in AR</a>
                <a class="btn ghost-light" href="compile.php">Prepare Tracking</a>
            </div>
            <div class="status-row">
                <span class="pill <?= $status['menu'] ? 'ok' : 'bad' ?>"><?= $status['menu'] ? 'Menu ready' : 'Menu missing' ?></span>
                <span class="pill <?= $status['dishCount'] ? 'ok' : 'warn' ?>"><?= (int) $status['dishCount'] ?> dishes</span>
                <span class="pill <?= $status['target'] && !$status['stale'] ? 'ok' : 'warn' ?>">
                    <?= $status['target'] && !$status['stale'] ? 'Tracking live' : ($status['stale'] ? 'Needs recompile' : 'Not compiled') ?>
                </span>
            </div>
        </div>
        <figure class="preview-card">
            <span class="frame-label">Tonight’s poster</span>
            <?php if ($status['menu']): ?>
                <img src="<?= h($status['menuUrl']) ?>" alt="Preview of the current food menu poster">
            <?php else: ?>
                <p>The menu image has not been created yet. Open Prepare AR Tracking after enabling PHP GD.</p>
            <?php endif; ?>
            <figcaption>Display or print this exact picture, then scan it.</figcaption>
        </figure>
    </section>

    <section class="steps" aria-label="How it works">
        <article class="step">
            <span>01</span>
            <h3>Open on your phone</h3>
            <p>Scan the card, then continue in Safari or Chrome. No app to install.</p>
        </article>
        <article class="step">
            <span>02</span>
            <h3>Allow the camera</h3>
            <p>The scanner stays in the browser. Grant the camera when the page asks.</p>
        </article>
        <article class="step">
            <span>03</span>
            <h3>Hold the menu still</h3>
            <p>Use this same poster, on a screen or on paper, until the lock appears.</p>
        </article>
        <article class="step">
            <span>04</span>
            <h3>Aim at one dish</h3>
            <p>Move closer to a food photo. Its 3D model rises; the others stay hidden.</p>
        </article>
    </section>

    <section class="lower">
        <article class="panel">
            <p class="kicker">Service</p>
            <h2>How the table works</h2>
            <p class="note">Phone → camera → menu → one dish → 3D.</p>
            <ul>
                <li>Display Menu shows the poster the camera is trained to recognize.</li>
                <li>Prepare AR Tracking lets you upload a poster, mark each photo, and compile tracking.</li>
                <li>Scan Menu in AR shows only the dish the camera is aimed at.</li>
                <li>On this computer use <code>localhost</code>. After upload to cPanel, phones use this site’s https address.</li>
                <li>On the server: PHP 8.0+, GD on, SSL on, and <code>assets/images</code> plus <code>assets/targets</code> writable.</li>
            </ul>
            <?php if ($phoneUrl): ?>
                <p class="note">Open the scanner in Safari or Chrome, not WeChat. <a href="<?= h($phoneUrl) ?>"><?= h($phoneUrl) ?></a></p>
            <?php else: ?>
                <p class="note">No phone address yet. On this computer, connect to Wi-Fi and reload. On cPanel, open the site with https, then reload.</p>
            <?php endif; ?>
        </article>
        <article class="qr-card">
            <p class="kicker">Reservation of the lens</p>
            <h2>Open the scanner</h2>
            <p class="note">Scan with the phone camera, then open in Safari or Chrome.</p>
            <div class="qr-plate">
                <canvas id="qr-code" width="196" height="196" aria-label="QR code for the AR scanner"></canvas>
            </div>
            <p id="qr-url" class="qr-url"><?= $phoneUrl ? h($phoneUrl) : '' ?></p>
            <p id="qr-warning" class="note warn" <?= $phoneUrl ? 'hidden' : '' ?>>No phone address yet. Use Wi-Fi on this computer, or open the live https site after uploading to cPanel.</p>
        </article>
    </section>
</div>
<script type="application/json" id="home-config"><?= json_encode([
    'phoneUrl' => $phoneUrl,
], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_THROW_ON_ERROR) ?></script>
<script type="module" src="<?= h(web_url('assets/js/home.js')) ?>"></script>
<?php
render_footer();
