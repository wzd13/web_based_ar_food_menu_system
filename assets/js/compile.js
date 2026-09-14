import { Compiler } from '../vendor/mindar/mindar-image.prod.js';
import { detectFoodPhotos } from './detect.js';

const config = JSON.parse(document.getElementById('compile-config').textContent);
const types = JSON.parse(document.getElementById('food-types').textContent);
const typeIds = Object.keys(types).filter((id) => id !== 'ignore');

const image = document.getElementById('menu-image');
const stage = document.getElementById('stage');
const markerLayer = document.getElementById('markers');
const list = document.getElementById('marker-list');
const banner = document.getElementById('banner');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');

let markers = [];
let selectedId = null;
let nextId = 1;
let imageWidth = config.imageWidth || 900;
let imageHeight = config.imageHeight || 1600;

image.addEventListener('load', () => {
    imageWidth = image.naturalWidth;
    imageHeight = image.naturalHeight;
    render();
});

if (image.complete && image.naturalWidth) {
    imageWidth = image.naturalWidth;
    imageHeight = image.naturalHeight;
}

loadInitialLayout();
window.addEventListener('resize', render);

document.getElementById('menu-file').addEventListener('change', uploadMenu);
document.getElementById('detect-btn').addEventListener('click', detect);
document.getElementById('save-btn').addEventListener('click', () => saveLayout());
document.getElementById('compile-btn').addEventListener('click', compileTarget);

let pointerStart = null;
stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.marker')) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
stage.addEventListener('pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (moved > 8 || event.target.closest('.marker')) return;
    onStageClick(event);
});

function loadInitialLayout() {
    if (config.layout && Array.isArray(config.layout.dishes)) {
        markers = config.layout.dishes.map(normalizeMarker);
        nextId = markers.length + 1;
        render();
        if (!markers.length) {
            show('No photos found automatically. Click the poster to add dish markers.', 'warn');
        }
    }
}

function normalizeMarker(dish, index) {
    return {
        id: dish.id || `dish-${index + 1}`,
        type: types[dish.type] ? dish.type : 'ignore',
        name: dish.name || types[dish.type] || 'Dish',
        nx: Number(dish.nx) || 0.5,
        ny: Number(dish.ny) || 0.5,
        radius: Number(dish.radius) || 0.12,
        scale: Number(dish.scale) || 0.18,
        z: Number(dish.z) || 0,
        rotation: Number(dish.rotation) || 0
    };
}

function onStageClick(event) {
    if (event.target.closest('.marker')) {
        return;
    }
    const rect = image.getBoundingClientRect();
    const nx = clamp((event.clientX - rect.left) / rect.width, 0.03, 0.97);
    const ny = clamp((event.clientY - rect.top) / rect.height, 0.03, 0.97);
    const used = new Set(markers.map((marker) => marker.type));
    const type = typeIds.find((id) => !used.has(id)) || typeIds[markers.length % typeIds.length];
    const marker = {
        id: `dish-${Date.now().toString(36)}-${nextId++}`,
        type,
        name: types[type],
        nx,
        ny,
        radius: 0.1,
        scale: 0.18,
        z: 0,
        rotation: 0
    };
    markers.push(marker);
    selectedId = marker.id;
    render();
}

function detect() {
    if (!image.naturalWidth) {
        show('Wait for the menu image to finish loading.', 'error');
        return;
    }
    const found = detectFoodPhotos(image);
    if (!found.length) {
        show('No photos found automatically. Click the poster to add dish markers.', 'warn');
        return;
    }
    markers = found.map((region, index) => {
        const type = typeIds[index] || 'ignore';
        return {
            id: `dish-${index + 1}`,
            type,
            name: types[type],
            nx: region.nx,
            ny: region.ny,
            radius: region.radius,
            scale: 0.18,
            z: 0,
            rotation: 0
        };
    });
    selectedId = markers[0]?.id || null;
    render();
    show(`Found ${found.length} likely food photo${found.length === 1 ? '' : 's'}. Check the types, then save and compile.`, 'ok');
}

function render() {
    markerLayer.innerHTML = '';
    const displayWidth = image.clientWidth || 1;
    markers.forEach((marker, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'marker' + (marker.type === 'ignore' ? ' is-ignore' : '') + (marker.id === selectedId ? ' is-selected' : '');
        button.style.left = `${marker.nx * 100}%`;
        button.style.top = `${marker.ny * 100}%`;
        button.textContent = String(index + 1);
        button.title = marker.name;
        button.addEventListener('pointerdown', (event) => startDrag(event, marker, button));
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            selectedId = marker.id;
            render();
        });
        markerLayer.appendChild(button);

        const ring = document.createElement('div');
        ring.className = 'marker-ring' + (marker.id === selectedId ? ' is-selected' : '');
        ring.style.left = `${marker.nx * 100}%`;
        ring.style.top = `${marker.ny * 100}%`;
        const diameter = marker.radius * 2 * displayWidth;
        ring.style.width = `${diameter}px`;
        ring.style.height = `${diameter}px`;
        markerLayer.appendChild(ring);
    });
    renderList();
}

function startDrag(event, marker, button) {
    event.preventDefault();
    event.stopPropagation();
    selectedId = marker.id;
    button.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
        const rect = image.getBoundingClientRect();
        marker.nx = clamp((moveEvent.clientX - rect.left) / rect.width, 0.02, 0.98);
        marker.ny = clamp((moveEvent.clientY - rect.top) / rect.height, 0.02, 0.98);
        button.style.left = `${marker.nx * 100}%`;
        button.style.top = `${marker.ny * 100}%`;
        const ring = button.nextElementSibling;
        if (ring) {
            ring.style.left = button.style.left;
            ring.style.top = button.style.top;
        }
    };
    const end = () => {
        button.removeEventListener('pointermove', move);
        button.removeEventListener('pointerup', end);
        render();
    };
    button.addEventListener('pointermove', move);
    button.addEventListener('pointerup', end);
}

function renderList() {
    if (!markers.length) {
        list.innerHTML = '<p class="empty-note">No photos found automatically. Click the poster to add dish markers.</p>';
        return;
    }
    list.innerHTML = '';
    markers.forEach((marker, index) => {
        const card = document.createElement('article');
        card.className = 'marker-card';
        card.innerHTML = `
            <header>
                <strong>Photo ${index + 1}</strong>
                <button type="button" class="btn danger remove">Remove</button>
            </header>
            <label>Food type</label>
            <select class="type"></select>
            <label>Name shown in AR</label>
            <input class="name" maxlength="40" value="">
            <label>Aim radius <span class="radius-value"></span></label>
            <input class="radius" type="range" min="0.04" max="0.28" step="0.005">
            <label>3D scale <span class="scale-value"></span></label>
            <input class="scale" type="range" min="0.08" max="0.6" step="0.01">
        `;
        const select = card.querySelector('.type');
        Object.entries(types).forEach(([id, label]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = label;
            option.selected = id === marker.type;
            select.appendChild(option);
        });
        card.querySelector('.name').value = marker.name;
        card.querySelector('.radius').value = marker.radius;
        card.querySelector('.scale').value = marker.scale;
        card.querySelector('.radius-value').textContent = marker.radius.toFixed(2);
        card.querySelector('.scale-value').textContent = marker.scale.toFixed(2);
        card.querySelector('.remove').addEventListener('click', () => {
            markers = markers.filter((item) => item.id !== marker.id);
            if (selectedId === marker.id) selectedId = markers[0]?.id || null;
            render();
        });
        select.addEventListener('change', () => {
            const previous = types[marker.type];
            marker.type = select.value;
            if (!marker.name || marker.name === previous || marker.name === 'Ignore') {
                marker.name = types[marker.type];
            }
            render();
        });
        card.querySelector('.name').addEventListener('input', (event) => {
            marker.name = event.target.value;
        });
        card.querySelector('.radius').addEventListener('input', (event) => {
            marker.radius = Number(event.target.value);
            card.querySelector('.radius-value').textContent = marker.radius.toFixed(2);
            renderRingsOnly();
        });
        card.querySelector('.scale').addEventListener('input', (event) => {
            marker.scale = Number(event.target.value);
            card.querySelector('.scale-value').textContent = marker.scale.toFixed(2);
        });
        card.addEventListener('pointerenter', () => {
            selectedId = marker.id;
            markerLayer.querySelectorAll('.marker').forEach((node, nodeIndex) => {
                node.classList.toggle('is-selected', markers[nodeIndex]?.id === marker.id);
            });
        });
        list.appendChild(card);
    });
}

function renderRingsOnly() {
    const displayWidth = image.clientWidth || 1;
    markerLayer.querySelectorAll('.marker-ring').forEach((ring, index) => {
        const marker = markers[index];
        if (!marker) return;
        const diameter = marker.radius * 2 * displayWidth;
        ring.style.width = `${diameter}px`;
        ring.style.height = `${diameter}px`;
    });
}

async function uploadMenu(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
        show('The image is larger than 8 MB.', 'error');
        return;
    }
    const body = new FormData();
    body.append('menu', file);
    show('Uploading and converting the menu to JPG…');
    try {
        const result = await postForm('api/upload.php', body);
        image.src = result.url;
        markers = [];
        selectedId = null;
        imageWidth = result.width;
        imageHeight = result.height;
        render();
        show(result.message, 'ok');
    } catch (error) {
        show(error.message, 'error');
    }
}

async function saveLayout(quiet = false) {
    const payload = {
        version: 1,
        imageWidth,
        imageHeight,
        dishes: markers
    };
    const result = await postJson('api/save-layout.php', payload);
    if (!quiet) show(result.message, 'ok');
    return result.layout;
}

async function compileTarget() {
    const active = markers.filter((marker) => marker.type !== 'ignore');
    if (!active.length) {
        show('Add at least one dish marker before compiling. Ignored photos are not shown in AR.', 'error');
        return;
    }
    const button = document.getElementById('compile-btn');
    button.disabled = true;
    setProgress(2, 'Saving the dish layout…');
    try {
        await saveLayout(true);
        setProgress(6, 'Compiling the tracking image. This can take a minute — keep this tab open.');
        const compiler = new Compiler();
        await compiler.compileImageTargets([image], (progress) => {
            const percent = progress <= 1 ? progress * 100 : progress;
            setProgress(Math.max(6, Math.min(92, percent)), `Compiling tracking features… ${Math.round(percent)}%`);
        });
        const exported = await compiler.exportData();
        const bytes = exported instanceof ArrayBuffer ? new Uint8Array(exported) : exported;
        const body = new FormData();
        body.append('target', new Blob([bytes], { type: 'application/octet-stream' }), 'menu.mind');
        setProgress(94, 'Saving the tracking file…');
        const result = await postForm('api/save-target.php', body);
        setProgress(100, result.message);
        show(result.message + ' Open the scanner and point it at this same poster.', 'ok');
        document.getElementById('open-ar').hidden = false;
    } catch (error) {
        show(error.message || 'Tracking could not be compiled.', 'error');
        setProgress(0, '');
    } finally {
        button.disabled = false;
    }
}

function setProgress(percent, label) {
    progressBar.style.width = `${percent}%`;
    progressLabel.textContent = label;
}

function show(message, kind = 'warn') {
    banner.hidden = false;
    banner.className = 'banner ' + (kind === 'error' ? 'error' : kind === 'ok' ? 'ok' : '');
    banner.textContent = message;
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'ARMenu'
        },
        body: JSON.stringify(payload)
    });
    return readResponse(response);
}

async function postForm(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-Requested-With': 'ARMenu' },
        body
    });
    return readResponse(response);
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'The server could not complete that action.');
    }
    return data;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
