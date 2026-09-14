/**
 * Finds likely food-photo squares on a menu poster.
 * This is simple pixel grouping, not an AI detector. The operator
 * can drag, ignore, or add markers if the guess is wrong.
 */

export function detectFoodPhotos(image) {
    const maxWidth = 360;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const mask = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const lightness = (red + green + blue) / 3;
        if (saturation > 0.22 && lightness > 45 && lightness < 225) {
            mask[i] = 1;
        }
    }

    const visited = new Uint8Array(width * height);
    const regions = [];
    const minArea = width * height * 0.008;
    const maxArea = width * height * 0.16;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const start = y * width + x;
            if (!mask[start] || visited[start]) {
                continue;
            }
            const stack = [start];
            visited[start] = 1;
            let area = 0;
            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;
            while (stack.length) {
                const index = stack.pop();
                const px = index % width;
                const py = (index / width) | 0;
                area += 1;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
                if (px > 0 && mask[index - 1] && !visited[index - 1]) {
                    visited[index - 1] = 1;
                    stack.push(index - 1);
                }
                if (px < width - 1 && mask[index + 1] && !visited[index + 1]) {
                    visited[index + 1] = 1;
                    stack.push(index + 1);
                }
                if (py > 0 && mask[index - width] && !visited[index - width]) {
                    visited[index - width] = 1;
                    stack.push(index - width);
                }
                if (py < height - 1 && mask[index + width] && !visited[index + width]) {
                    visited[index + width] = 1;
                    stack.push(index + width);
                }
            }

            const boxWidth = maxX - minX + 1;
            const boxHeight = maxY - minY + 1;
            const aspect = boxWidth / boxHeight;
            const fill = area / (boxWidth * boxHeight);
            const centerY = (minY + maxY) / 2 / height;
            if (area < minArea || area > maxArea) continue;
            if (aspect < 0.62 || aspect > 1.55) continue;
            if (fill < 0.45) continue;
            if (centerY < 0.1 || centerY > 0.94) continue;
            regions.push({ minX, minY, maxX, maxY, area });
        }
    }

    regions.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
    const kept = [];
    regions.forEach((region) => {
        const overlap = kept.some((other) => iou(region, other) > 0.35);
        if (!overlap) {
            kept.push(region);
        }
    });

    return kept.map((region) => {
        const centerX = ((region.minX + region.maxX) / 2) / width;
        const centerY = ((region.minY + region.maxY) / 2) / height;
        const radius = (Math.max(region.maxX - region.minX, region.maxY - region.minY) / 2) / width;
        return {
            nx: round(centerX),
            ny: round(centerY),
            radius: round(Math.min(0.28, Math.max(0.05, radius)))
        };
    });
}

function iou(a, b) {
    const left = Math.max(a.minX, b.minX);
    const top = Math.max(a.minY, b.minY);
    const right = Math.min(a.maxX, b.maxX);
    const bottom = Math.min(a.maxY, b.maxY);
    const overlap = Math.max(0, right - left) * Math.max(0, bottom - top);
    const areaA = (a.maxX - a.minX) * (a.maxY - a.minY);
    const areaB = (b.maxX - b.minX) * (b.maxY - b.minY);
    return overlap / (areaA + areaB - overlap || 1);
}

function round(value) {
    return Math.round(value * 10000) / 10000;
}
