import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { MindARThree } from '../vendor/mindar/mindar-image-three.prod.js?v=16';
import { createFood } from './foods.js?v=18';

window.THREE = THREE;
window.__arBooted = true;

const config = JSON.parse(document.getElementById('ar-config').textContent);
const statusEl = document.getElementById('ar-status');
const instructionEl = document.getElementById('ar-instruction');
const nameEl = document.getElementById('ar-name');
const detailEl = document.getElementById('ar-detail');
const startButton = document.getElementById('start-camera');
const frame = document.getElementById('scan-frame');

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const aimPoint = new THREE.Vector3();
const plane = new THREE.Plane();
const planeNormal = new THREE.Vector3();
const planePoint = new THREE.Vector3();

let mindarThree = null;
let anchor = null;
let cssAnchor = null;
let cssBoard = null;
let studio = null;
let tracking = false;
let selected = null;
let selectedDistance = Infinity;
let lastTime = 0;
let started = false;
let grantedStream = null;
let prompting = false;
let trackingLive = false;

boot();

const limitedBrowser = /MicroMessenger|FBAN|FBAV|Instagram|Line\/|; wv\)|GSA\/|GoogleApp/i.test(navigator.userAgent);

window.addEventListener('pointerdown', () => openCameraPermission(true), { capture: true });
startButton.addEventListener('click', (event) => {
    event.preventDefault();
    openCameraPermission(true);
});
openCameraPermission(false);

function openCameraPermission(fromUser) {
    if (started || grantedStream) return;
    if (!fromUser && prompting) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (fromUser) {
            const error = new Error('getUserMedia missing');
            error.name = 'NotSupportedError';
            failCamera(error);
        }
        return;
    }
    prompting = true;
    setStatus('Allow camera', 'warn');
    setCopy('允许打开相机', '系统权限框会自动弹出，请点允许。');
    openRearCamera().then((stream) => {
        if (started || grantedStream) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        grantedStream = stream;
        if (mindarThree && config.targetReady && !config.stale) {
            startTracking();
            return;
        }
        previewCamera(Promise.resolve(stream));
    }).catch((error) => {
        prompting = false;
        if (!fromUser && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
            setStatus('Allow camera', 'warn');
            setCopy('允许打开相机', '点一下屏幕，系统就会弹出相机权限。');
            return;
        }
        failCamera(error);
    });
}

async function openRearCamera() {
    const attempts = [
        { audio: false, video: { facingMode: { exact: 'environment' } } },
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
        { audio: false, video: true }
    ];
    let lastError = null;
    for (const constraints of attempts) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (stream.getVideoTracks()[0]?.getSettings().facingMode !== 'user') {
                return stream;
            }
            stream.getTracks().forEach((track) => track.stop());
        } catch (error) {
            lastError = error;
            if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
                throw error;
            }
        }
    }
    if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const back = devices.find((device) => device.kind === 'videoinput' && /back|rear|environment|后置/i.test(device.label));
        if (back) {
            return navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { deviceId: { exact: back.deviceId } }
            });
        }
    }
    if (lastError) throw lastError;
    return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } }
    });
}

function cameraBlockedMessage(error) {
    const name = error && error.name ? error.name : 'Error';
    if (limitedBrowser || name === 'NotSupportedError') {
        return '这个内置页面不能弹出相机权限。请用 Chrome 打开后再点允许。(' + name + ')';
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
        return '相机正被占用。请关掉扫描器，等一两秒再打开这个页面。(' + name + ')';
    }
    if (name === 'NotAllowedError' || name === 'SecurityError') {
        return '请到 设置 → 应用 → Chrome → 权限 → 相机 → 允许，然后重新打开这个页面。(' + name + ')';
    }
    if (!window.isSecureContext) {
        return '这个地址不能申请相机。请用首页二维码里的 https 链接。(' + name + ')';
    }
    return '相机没有打开。请用 Chrome 重新打开，再点允许相机。(' + name + ')';
}

function failCamera(error) {
    started = false;
    prompting = false;
    if (grantedStream) {
        grantedStream.getTracks().forEach((track) => track.stop());
    }
    grantedStream = null;
    startButton.disabled = false;
    startButton.hidden = false;
    startButton.style.removeProperty('display');
    setStatus((error && error.name) || 'Camera blocked', 'bad');
    setCopy('Camera access is required', cameraBlockedMessage(error));
    console.error(error);
}

async function boot() {
    if (!window.isSecureContext) {
        setStatus('Please use HTTPS', 'bad');
        setCopy('Please use HTTPS', config.httpsUrl
            ? 'Camera access is required. On a phone, open ' + config.httpsUrl + ' and accept the certificate warning.'
            : 'Camera access is required on a secure page. localhost on this computer is allowed; a phone needs HTTPS.');
        startButton.disabled = true;
        return;
    }
    if (!config.targetReady || config.stale) {
        if (!grantedStream) {
            setStatus(config.stale ? 'Menu changed' : 'Allow camera', 'warn');
            setCopy('允许打开相机', '系统权限框会自动弹出。如果没有，点一下屏幕。');
        }
        startButton.disabled = false;
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('Camera unavailable', 'bad');
        setCopy('Camera access is required', 'This browser cannot open a camera.');
        startButton.disabled = true;
        return;
    }

    setStatus('Loading models', 'warn');
    try {
        const layout = await fetch(config.layoutUrl, { cache: 'no-store' }).then((response) => {
            if (!response.ok) throw new Error('The dish layout could not be loaded.');
            return response.json();
        });
        setupScene(layout);
        startButton.disabled = false;
        if (grantedStream) {
            startTracking();
            return;
        }
        setStatus('Allow camera', 'warn');
        setCopy('允许打开相机', '系统权限框会自动弹出。如果没有，点一下屏幕。');
    } catch (error) {
        setStatus('Not ready', 'bad');
        setCopy('The scanner could not start', error.message);
        startButton.disabled = true;
    }
}

function setupScene(layout) {
    const container = document.getElementById('ar-container');
    mindarThree = new MindARThree({
        container,
        imageTargetSrc: config.targetUrl,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        filterMinCF: 0,
        filterBeta: 0.5,
        warmupTolerance: 1,
        missTolerance: 15,
        maxTrack: 1
    });
    const { renderer, scene } = mindarThree;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.zIndex = '2';
    const cssLayer = mindarThree.cssRenderer.domElement;
    cssLayer.style.zIndex = '8';
    cssLayer.style.pointerEvents = 'none';
    cssLayer.style.display = 'block';

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(0.4, 0.9, 1);
    scene.add(key);

    studio = createStudio();
    try {
        cssBoard = makeCssBoard();
        cssAnchor = mindarThree.addCSSAnchor(0);
        cssAnchor.group.add(cssBoard);
    } catch (error) {
        console.error(error);
        cssBoard = null;
        cssAnchor = null;
    }

    anchor = mindarThree.addAnchor(0);
    anchor.onTargetFound = () => {
        tracking = true;
        showNearestDish();
        hideStart();
    };
    anchor.onTargetLost = () => {
        tracking = false;
        clearSelection();
        setStatus('Scanning', 'ok');
        setCopy('对准食物菜单', '把海报放在画面里，对着一张菜的照片就会出现 3D 模型。');
    };

    const aspect = (layout.imageHeight || 1) / (layout.imageWidth || 1);
    (layout.dishes || []).forEach((dish) => {
        if (!dish || dish.type === 'ignore') return;
        anchor.group.add(wrapDish(dish, aspect));
    });
}

function wrapDish(dish, aspect) {
    const root = new THREE.Group();
    const arX = Number.isFinite(Number(dish.arX)) ? Number(dish.arX) : Number(dish.nx) - 0.5;
    const arY = Number.isFinite(Number(dish.arY))
        ? Number(dish.arY)
        : (0.5 - Number(dish.ny)) * aspect;
    root.position.set(arX, arY, 0.12);
    root.scale.setScalar(Math.max(Number(dish.scale) || 0.5, 0.45));
    root.visible = false;

    const stand = new THREE.Group();
    stand.rotation.x = Math.PI / 2;
    const spin = new THREE.Group();
    const food = createFood(THREE, dish.type);
    food.traverse((obj) => {
        obj.frustumCulled = false;
    });
    spin.add(food);
    stand.add(spin);
    root.add(stand);

    root.userData.spin = spin;
    root.userData.dish = dish;
    root.userData.arX = arX;
    root.userData.arY = arY;
    root.userData.radius = Number(dish.radius) || 0.16;
    return root;
}

function makeCssBoard() {
    const holder = document.createElement('div');
    holder.style.width = '360px';
    holder.style.height = '360px';
    holder.style.pointerEvents = 'none';
    holder.style.background = 'transparent';
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    canvas.style.width = '360px';
    canvas.style.height = '360px';
    canvas.style.pointerEvents = 'none';
    holder.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        premultipliedAlpha: false
    });
    renderer.setSize(360, 360, false);
    renderer.setClearColor(0x000000, 0);
    const object = new CSS3DObject(holder);
    object.element.style.pointerEvents = 'none';
    object.position.set(0, 0, 80);
    object.userData.renderer = renderer;
    return object;
}

function createStudio() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0.7, 1.2, 2.15);
    camera.lookAt(0, 0.28, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 4, 3);
    scene.add(key);
    const spin = new THREE.Group();
    scene.add(spin);
    const rt = new THREE.WebGLRenderTarget(256, 256);
    return {
        scene,
        camera,
        spin,
        rt,
        pixels: new Uint8Array(256 * 256 * 4),
        imageData: null,
        type: null
    };
}

function installCameraFallback() {
    const devices = navigator.mediaDevices;
    if (!devices || devices.__arFallback) return;
    const native = devices.getUserMedia.bind(devices);
    devices.getUserMedia = async (constraints) => {
        try {
            return await native(constraints);
        } catch (error) {
            if (!constraints || constraints.video == null || constraints.video === true) throw error;
            return native({ audio: false, video: { facingMode: { ideal: 'environment' } } });
        }
    };
    devices.__arFallback = true;
}

function prepareVideo(video, fill) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.style.position = 'absolute';
    video.style.zIndex = '0';
    video.style.opacity = '1';
    video.style.objectFit = 'cover';
    video.style.transform = 'none';
    if (fill) {
        video.style.inset = '0';
        video.style.width = '100%';
        video.style.height = '100%';
    }
}

async function revealCamera(video) {
    if (!video) throw new Error('The camera preview did not start.');
    prepareVideo(video, false);
    const idle = document.getElementById('ar-idle');
    if (idle) idle.hidden = true;
    if (frame) frame.hidden = false;
    try {
        await video.play();
    } catch (error) {
        throw new Error('The camera preview could not play. Allow the camera, then tap start again.');
    }
}

async function previewCamera(permission) {
    if (started) return;
    started = true;
    startButton.disabled = true;
    setStatus('Allow the camera', 'warn');
    setCopy('Allow the camera', 'A phone prompt should appear now. Tap Allow.');
    try {
        const stream = await permission;
        const container = document.getElementById('ar-container');
        const video = document.createElement('video');
        container.appendChild(video);
        video.className = 'is-preview';
        prepareVideo(video, true);
        video.srcObject = stream;
        await revealCamera(video);
        if (trackingLive) return;
        if (mindarThree && config.targetReady && !config.stale) {
            startTracking();
            return;
        }
        setStatus('Camera on', 'ok');
        setCopy('Prepare AR tracking first', 'This preview is working. Compile the menu on the Prepare page, then open the scanner again to see a 3D dish.');
        hideStart();
    } catch (error) {
        started = false;
        startButton.disabled = false;
        failCamera(error);
    }
}

function startTracking() {
    if (trackingLive || !mindarThree || !grantedStream || !config.targetReady || config.stale) return;
    trackingLive = true;
    document.querySelectorAll('#ar-container video.is-preview').forEach((node) => node.remove());
    started = false;
    begin(Promise.resolve(grantedStream));
}

async function begin(permission) {
    if (started) return;
    started = true;
    startButton.disabled = true;
    setStatus('Allow the camera', 'warn');
    setCopy('Allow the camera', 'A phone prompt should appear now. Tap Allow.');
    try {
        const warmup = await permission;
        warmup.getTracks().forEach((track) => track.stop());
        installCameraFallback();
        await mindarThree.start();
        await revealCamera(mindarThree.video);
        mindarThree.resize();
        setStatus('Scanning', 'ok');
        setCopy('对准食物菜单', '把海报放在画面里，对着一张菜的照片就会出现 3D 模型。');
        hideStart();
        mindarThree.renderer.setAnimationLoop(tick);
    } catch (error) {
        started = false;
        startButton.disabled = false;
        failCamera(error);
    }
}

function hideStart() {
    startButton.hidden = true;
    startButton.style.setProperty('display', 'none', 'important');
}

function tick(time) {
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0.016;
    lastTime = time;
    try {
        if (tracking) {
            updateAim();
            if (!selected) showNearestDish();
        }
        if (selected?.userData.spin) {
            selected.userData.spin.rotation.y += dt * 0.85;
        }
        paintModels(dt);
        mindarThree.renderer.setClearColor(0x000000, 0);
        mindarThree.renderer.render(mindarThree.scene, mindarThree.camera);
        if (cssBoard) {
            mindarThree.cssRenderer.render(mindarThree.cssScene, mindarThree.camera);
        }
    } catch (error) {
        console.error(error);
    }
}

function paintModels(dt) {
    if (!tracking || !selected || !cssBoard || !studio) {
        if (cssBoard) cssBoard.element.style.visibility = 'hidden';
        if (frame) frame.hidden = true;
        return;
    }
    if (frame) frame.hidden = true;
    const type = selected.userData.dish.type;
    if (studio.type !== type) {
        studio.type = type;
        while (studio.spin.children.length) studio.spin.remove(studio.spin.children[0]);
        const food = createFood(THREE, type);
        food.traverse((obj) => {
            obj.frustumCulled = false;
        });
        studio.spin.add(food);
    }
    studio.spin.rotation.y += dt * 0.9;
    cssBoard.position.set(selected.userData.arX * 1000, selected.userData.arY * 1000, 140);
    cssBoard.element.style.visibility = 'visible';
    cssBoard.userData.renderer.render(studio.scene, studio.camera);
}

function updateAim() {
    if (!anchor) return;
    anchor.group.updateMatrixWorld(true);
    raycaster.setFromCamera(screenCenter, mindarThree.camera);
    planeNormal.set(0, 0, 1).transformDirection(anchor.group.matrixWorld);
    planePoint.set(0, 0, 0).applyMatrix4(anchor.group.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const hit = raycaster.ray.intersectPlane(plane, aimPoint);
    if (!hit) {
        if (!selected) showNearestDish();
        return;
    }
    const local = anchor.group.worldToLocal(aimPoint.clone());
    let best = null;
    let bestDistance = Infinity;
    anchor.group.children.forEach((child) => {
        if (!child.userData.dish) return;
        const distance = Math.hypot(local.x - child.userData.arX, local.y - child.userData.arY);
        if (distance < bestDistance) {
            best = child;
            bestDistance = distance;
        }
    });
    if (best) showDish(best, bestDistance);
}

function showNearestDish() {
    if (!anchor) return false;
    let best = null;
    let bestDistance = Infinity;
    anchor.group.children.forEach((child) => {
        if (!child.userData.dish) return;
        const distance = Math.hypot(child.userData.arX, child.userData.arY);
        if (distance < bestDistance) {
            best = child;
            bestDistance = distance;
        }
    });
    if (!best) return false;
    showDish(best, bestDistance);
    return true;
}

function showDish(node, distance) {
    if (selected && selected !== node) selected.visible = false;
    selected = node;
    selectedDistance = distance;
    node.visible = true;
    const dish = node.userData.dish;
    setStatus('Menu found', 'ok');
    setCopy(dish.name, '3D 模型已经从这道菜上弹出来。');
    hideStart();
}

function clearSelection() {
    if (selected) selected.visible = false;
    selected = null;
    selectedDistance = Infinity;
    if (cssBoard) cssBoard.element.style.visibility = 'hidden';
    if (frame) frame.hidden = false;
}

function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'ar-status ' + (kind || '');
}

function setCopy(title, detail) {
    nameEl.textContent = title;
    detailEl.textContent = detail;
    instructionEl.hidden = false;
}

frame?.setAttribute('aria-hidden', 'true');
