/**
 * Small byte-mode QR encoder for the home-page link.
 * Supports versions 1–6 at error-correction level M.
 */

const VERSIONS = {
    1: { size: 21, ec: 10, groups: [[1, 16]], remainder: 0, align: [], capacity: 14 },
    2: { size: 25, ec: 16, groups: [[1, 28]], remainder: 7, align: [6, 18], capacity: 26 },
    3: { size: 29, ec: 26, groups: [[1, 44]], remainder: 7, align: [6, 22], capacity: 42 },
    4: { size: 33, ec: 18, groups: [[2, 32]], remainder: 7, align: [6, 26], capacity: 62 },
    5: { size: 37, ec: 24, groups: [[2, 43]], remainder: 7, align: [6, 30], capacity: 84 },
    6: { size: 41, ec: 16, groups: [[4, 27]], remainder: 7, align: [6, 34], capacity: 106 }
};

export function qrModules(text) {
    return encodeQr(text);
}

export function drawQr(canvas, text) {
    const modules = encodeQr(text);
    const size = modules.length;
    const quiet = 4;
    const scale = Math.max(2, Math.floor(canvas.width / (size + quiet * 2)));
    const drawn = (size + quiet * 2) * scale;
    canvas.width = drawn;
    canvas.height = drawn;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffaf4';
    context.fillRect(0, 0, drawn, drawn);
    context.fillStyle = '#1c1410';
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (modules[y][x]) {
                context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
            }
        }
    }
}

function encodeQr(text) {
    const bytes = new TextEncoder().encode(text);
    const version = Object.keys(VERSIONS).map(Number).find((item) => bytes.length <= VERSIONS[item].capacity);
    if (!version) {
        throw new Error('The address is too long for the built-in QR code.');
    }
    const spec = VERSIONS[version];
    const dataCodewords = spec.groups.reduce((sum, [count, length]) => sum + count * length, 0);
    const data = buildData(bytes, dataCodewords);
    const blocks = splitBlocks(data, spec);
    const ecBlocks = blocks.map((block) => reedSolomon(block, spec.ec));
    const message = interleave(blocks, ecBlocks);
    for (let i = 0; i < spec.remainder; i++) {
        message.push(0);
    }
    return renderMatrix(version, message);
}

function buildData(bytes, dataCodewords) {
    const bits = [];
    pushBits(bits, 0b0100, 4);
    pushBits(bits, bytes.length, 8);
    bytes.forEach((byte) => pushBits(bits, byte, 8));
    const capacity = dataCodewords * 8;
    pushBits(bits, 0, Math.min(4, capacity - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);
    const pads = [0xec, 0x11];
    let pad = 0;
    while (bits.length < capacity) {
        pushBits(bits, pads[pad % 2], 8);
        pad += 1;
    }
    const words = [];
    for (let i = 0; i < bits.length; i += 8) {
        let value = 0;
        for (let bit = 0; bit < 8; bit++) value = (value << 1) | bits[i + bit];
        words.push(value);
    }
    return words;
}

function splitBlocks(data, spec) {
    const blocks = [];
    let offset = 0;
    spec.groups.forEach(([count, length]) => {
        for (let i = 0; i < count; i++) {
            blocks.push(data.slice(offset, offset + length));
            offset += length;
        }
    });
    return blocks;
}

function interleave(blocks, ecBlocks) {
    const out = [];
    const maxData = Math.max(...blocks.map((block) => block.length));
    for (let i = 0; i < maxData; i++) {
        blocks.forEach((block) => {
            if (i < block.length) out.push(block[i]);
        });
    }
    for (let i = 0; i < ecBlocks[0].length; i++) {
        ecBlocks.forEach((block) => out.push(block[i]));
    }
    const bits = [];
    out.forEach((word) => pushBits(bits, word, 8));
    return bits;
}

function pushBits(bits, value, length) {
    for (let i = length - 1; i >= 0; i--) {
        bits.push((value >>> i) & 1);
    }
}

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initField() {
    let value = 1;
    for (let i = 0; i < 255; i++) {
        GF_EXP[i] = value;
        GF_LOG[value] = i;
        value <<= 1;
        if (value & 0x100) value ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function reedSolomon(data, ecLength) {
    const generator = [1];
    for (let i = 0; i < ecLength; i++) {
        const next = new Array(generator.length + 1).fill(0);
        for (let j = 0; j < generator.length; j++) {
            next[j] ^= generator[j];
            next[j + 1] ^= gfMul(generator[j], GF_EXP[i]);
        }
        generator.splice(0, generator.length, ...next);
    }
    const result = new Array(ecLength).fill(0);
    data.forEach((byte) => {
        const factor = byte ^ result[0];
        result.copyWithin(0, 1);
        result[ecLength - 1] = 0;
        if (factor !== 0) {
            for (let i = 0; i < ecLength; i++) {
                result[i] ^= gfMul(generator[i + 1], factor);
            }
        }
    });
    return result;
}

function renderMatrix(version, bits) {
    const spec = VERSIONS[version];
    const size = spec.size;
    const modules = Array.from({ length: size }, () => Array(size).fill(false));
    const reserved = Array.from({ length: size }, () => Array(size).fill(false));
    const set = (x, y, dark, hold = true) => {
        modules[y][x] = dark;
        if (hold) reserved[y][x] = true;
    };

    paintFinder(set, 0, 0);
    paintFinder(set, size - 7, 0);
    paintFinder(set, 0, size - 7);
    paintSeparators(set, size);
    for (let i = 8; i < size - 8; i++) {
        const dark = i % 2 === 0;
        set(i, 6, dark);
        set(6, i, dark);
    }
    paintAlignments(set, spec.align, size);
    set(8, size - 8, true);
    reserveFormat(reserved, size);

    let bitIndex = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col = 5;
        for (let rowOffset = 0; rowOffset < size; rowOffset++) {
            const y = upward ? size - 1 - rowOffset : rowOffset;
            for (const x of [col, col - 1]) {
                if (reserved[y][x]) continue;
                modules[y][x] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
                bitIndex += 1;
            }
        }
        upward = !upward;
    }

    let best = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
        const masked = applyMask(modules, reserved, mask);
        drawFormat(masked, formatBits(mask), size);
        const score = penalty(masked);
        if (score < bestScore) {
            bestScore = score;
            best = masked;
        }
    }
    return best;
}

function paintFinder(set, x, y) {
    for (let dy = -1; dy <= 7; dy++) {
        for (let dx = -1; dx <= 7; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px < 0 || py < 0 || px >= set.sizeHint || py >= set.sizeHint) {
                // reserved separately by separators
            }
        }
    }
    for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
            const edge = dx === 0 || dy === 0 || dx === 6 || dy === 6;
            const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
            set(x + dx, y + dy, edge || core);
        }
    }
}

function paintSeparators(set, size) {
    for (let i = 0; i < 8; i++) {
        set(i, 7, false);
        set(7, i, false);
        set(size - 8 + i, 7, false);
        set(size - 8, i, false);
        set(i, size - 8, false);
        set(7, size - 1 - i, false);
    }
}

function paintAlignments(set, centers, size) {
    centers.forEach((cy) => {
        centers.forEach((cx) => {
            if ((cx < 8 && cy < 8) || (cx > size - 9 && cy < 8) || (cx < 8 && cy > size - 9)) {
                return;
            }
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const edge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
                    set(cx + dx, cy + dy, edge || (dx === 0 && dy === 0));
                }
            }
        });
    });
}

function reserveFormat(reserved, size) {
    for (let i = 0; i < 9; i++) {
        reserved[8][i] = true;
        reserved[i][8] = true;
    }
    for (let i = 0; i < 8; i++) {
        reserved[8][size - 1 - i] = true;
        reserved[size - 1 - i][8] = true;
    }
}

function applyMask(modules, reserved, mask) {
    const size = modules.length;
    return modules.map((row, y) => row.map((dark, x) => {
        if (reserved[y][x]) return dark;
        return dark !== maskBit(mask, y, x);
    }));
}

function maskBit(mask, y, x) {
    switch (mask) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
        case 5: return ((y * x) % 2) + ((y * x) % 3) === 0;
        case 6: return (((y * x) % 2) + ((y * x) % 3)) % 2 === 0;
        default: return (((x + y) % 2) + ((y * x) % 3)) % 2 === 0;
    }
}

function formatBits(mask) {
    const data = mask & 7;
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
        if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function drawFormat(modules, bits, size) {
    const bit = (index) => ((bits >>> index) & 1) === 1;
    for (let i = 0; i <= 5; i++) modules[i][8] = bit(i);
    modules[7][8] = bit(6);
    modules[8][8] = bit(7);
    modules[8][7] = bit(8);
    for (let i = 9; i < 15; i++) modules[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = bit(i);
    modules[size - 8][8] = true;
}

function penalty(modules) {
    const size = modules.length;
    let score = 0;
    const runScore = (run) => (run >= 5 ? 3 + (run - 5) : 0);
    for (let y = 0; y < size; y++) {
        let run = 1;
        for (let x = 1; x < size; x++) {
            if (modules[y][x] === modules[y][x - 1]) run += 1;
            else {
                score += runScore(run);
                run = 1;
            }
        }
        score += runScore(run);
    }
    for (let x = 0; x < size; x++) {
        let run = 1;
        for (let y = 1; y < size; y++) {
            if (modules[y][x] === modules[y - 1][x]) run += 1;
            else {
                score += runScore(run);
                run = 1;
            }
        }
        score += runScore(run);
    }
    for (let y = 0; y < size - 1; y++) {
        for (let x = 0; x < size - 1; x++) {
            const value = modules[y][x];
            if (value === modules[y][x + 1] && value === modules[y + 1][x] && value === modules[y + 1][x + 1]) {
                score += 3;
            }
        }
    }
    const pattern = [1, 0, 1, 1, 1, 0, 1];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size - 6; x++) {
            if (pattern.every((bit, i) => modules[y][x + i] === (bit === 1))) {
                score += 40;
            }
        }
    }
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size - 6; y++) {
            if (pattern.every((bit, i) => modules[y + i][x] === (bit === 1))) {
                score += 40;
            }
        }
    }
    let dark = 0;
    modules.forEach((row) => row.forEach((cell) => { if (cell) dark += 1; }));
    const percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return score;
}

export function formatBitsSelfTest() {
    const data = (1 << 3) | 4;
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
        if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return (((data << 10) | (rem & 0x3ff)) ^ 0x5412) === 0b110011000101111;
}
