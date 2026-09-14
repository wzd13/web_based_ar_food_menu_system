/**
 * Stylized low-poly food models.
 * Each function returns a Three.js Group that sits on y = 0 and
 * is meant to be viewed from above after the AR page tips it upright.
 */

function material(THREE, color, roughness = 0.58, metalness = 0.04, extra = {}) {
    return new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: extra.transparent === true,
        opacity: extra.opacity == null ? 1 : extra.opacity
    });
}

function add(THREE, group, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
}

function plate(THREE, radius = 0.52) {
    const group = new THREE.Group();
    add(THREE, group, new THREE.CylinderGeometry(radius, radius * 0.96, 0.04, 28), material(THREE, 0xf7f1ea, 0.42, 0.02), 0, 0.02, 0);
    const rim = add(THREE, group, new THREE.TorusGeometry(radius * 0.9, 0.018, 8, 28), material(THREE, 0xe4d3c4, 0.4, 0.05), 0, 0.04, 0);
    rim.rotation.x = Math.PI / 2;
    return group;
}

export function createBurger(THREE) {
    const group = new THREE.Group();
    group.add(plate(THREE, 0.5));
    const bun = material(THREE, 0xe2a85c, 0.72);
    const bunTop = material(THREE, 0xefc07a, 0.7);
    add(THREE, group, new THREE.CylinderGeometry(0.34, 0.36, 0.1, 24), bun, 0, 0.1, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.33, 0.33, 0.07, 24), material(THREE, 0x6b3a28, 0.8), 0, 0.18, 0);
    const cheese = add(THREE, group, new THREE.BoxGeometry(0.5, 0.025, 0.46), material(THREE, 0xf0c14a, 0.45), 0.02, 0.225, 0);
    cheese.rotation.y = 0.2;
    add(THREE, group, new THREE.TorusGeometry(0.24, 0.035, 8, 18), material(THREE, 0x6faf4a, 0.75), 0, 0.26, 0).rotation.x = Math.PI / 2;
    add(THREE, group, new THREE.CylinderGeometry(0.28, 0.28, 0.035, 24), material(THREE, 0xd6453d, 0.5), 0, 0.29, 0);
    const crown = add(THREE, group, new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), bunTop, 0, 0.3, 0);
    crown.scale.y = 0.72;
    const seed = material(THREE, 0xfff6df, 0.4);
    [[-0.12, 0.48, 0.04], [0.02, 0.52, 0.08], [0.14, 0.46, -0.06], [-0.04, 0.5, -0.12], [0.1, 0.47, 0.12]].forEach(([x, y, z]) => {
        add(THREE, group, new THREE.SphereGeometry(0.028, 8, 8), seed, x, y, z);
    });
    return group;
}

export function createPizza(THREE) {
    const group = new THREE.Group();
    add(THREE, group, new THREE.CylinderGeometry(0.46, 0.46, 0.05, 32), material(THREE, 0xc9843e, 0.75), 0, 0.04, 0);
    const rim = add(THREE, group, new THREE.TorusGeometry(0.42, 0.045, 8, 32), material(THREE, 0xd7a15a, 0.7), 0, 0.06, 0);
    rim.rotation.x = Math.PI / 2;
    add(THREE, group, new THREE.CylinderGeometry(0.36, 0.36, 0.03, 32), material(THREE, 0xf2d36b, 0.55), 0, 0.075, 0);
    const pepper = material(THREE, 0xc13b32, 0.45);
    [[0.12, 0.05], [-0.14, 0.08], [0.02, -0.16], [-0.08, -0.12], [0.16, -0.08], [-0.18, -0.02]].forEach(([x, z]) => {
        add(THREE, group, new THREE.CylinderGeometry(0.055, 0.055, 0.018, 14), pepper, x, 0.1, z);
    });
    const olive = material(THREE, 0x2c241c, 0.4);
    [[-0.1, 0.14], [0.14, 0.12], [0.02, 0.04]].forEach(([x, z]) => {
        const ring = add(THREE, group, new THREE.TorusGeometry(0.028, 0.01, 6, 10), olive, x, 0.105, z);
        ring.rotation.x = Math.PI / 2;
    });
    [[0.08, -0.02], [-0.16, -0.12]].forEach(([x, z]) => {
        const leaf = add(THREE, group, new THREE.SphereGeometry(0.03, 8, 6), material(THREE, 0x3f8f45, 0.6), x, 0.11, z);
        leaf.scale.set(1.4, 0.25, 0.7);
    });
    return group;
}

export function createPasta(THREE) {
    const group = new THREE.Group();
    const bowl = material(THREE, 0xf4efe6, 0.4);
    add(THREE, group, new THREE.CylinderGeometry(0.4, 0.28, 0.22, 28), bowl, 0, 0.12, 0);
    const lip = add(THREE, group, new THREE.TorusGeometry(0.38, 0.03, 8, 28), material(THREE, 0xe7d8c8, 0.35), 0, 0.22, 0);
    lip.rotation.x = Math.PI / 2;
    add(THREE, group, new THREE.CylinderGeometry(0.32, 0.26, 0.08, 24), material(THREE, 0xc4473a, 0.55), 0, 0.2, 0);
    const noodle = material(THREE, 0xf6e2b0, 0.55);
    for (let i = 0; i < 6; i++) {
        const loop = add(THREE, group, new THREE.TorusGeometry(0.1 + (i % 3) * 0.03, 0.018, 6, 16), noodle, Math.cos(i) * 0.08, 0.26 + (i % 2) * 0.02, Math.sin(i) * 0.08);
        loop.rotation.set(0.6 + i * 0.3, i, 0.4);
    }
    add(THREE, group, new THREE.SphereGeometry(0.06, 12, 10), material(THREE, 0x8c3e24, 0.5), -0.08, 0.28, 0.04);
    add(THREE, group, new THREE.SphereGeometry(0.045, 10, 8), material(THREE, 0x3f8f45, 0.6), 0.1, 0.3, -0.04);
    return group;
}

export function createFriedChicken(THREE) {
    const group = new THREE.Group();
    group.add(plate(THREE, 0.52));
    const crust = material(THREE, 0xd4893a, 0.78);
    const dark = material(THREE, 0x8c4a22, 0.8);
    const piece = (x, y, z, sx, sy, sz) => {
        const mesh = add(THREE, group, new THREE.SphereGeometry(0.14, 14, 12), crust, x, y, z);
        mesh.scale.set(sx, sy, sz);
        return mesh;
    };
    piece(-0.12, 0.18, 0.04, 1.3, 0.9, 1);
    piece(0.14, 0.16, -0.08, 1, 1.1, 0.9);
    piece(0.02, 0.2, 0.16, 0.8, 0.7, 1.1);
    const bone = add(THREE, group, new THREE.CylinderGeometry(0.02, 0.025, 0.22, 8), material(THREE, 0xf3e7d8, 0.4), -0.28, 0.16, 0.02);
    bone.rotation.z = 0.8;
    add(THREE, group, new THREE.SphereGeometry(0.08, 10, 8), dark, 0.22, 0.14, 0.12);
    return group;
}

export function createSalad(THREE) {
    const group = new THREE.Group();
    add(THREE, group, new THREE.CylinderGeometry(0.4, 0.3, 0.16, 24), material(THREE, 0xf7f1ea, 0.4), 0, 0.1, 0);
    const leaf = material(THREE, 0x5d9a62, 0.7);
    const pale = material(THREE, 0xd7e7a8, 0.65);
    const spots = [[-0.12, 0, 0.8], [0.1, 0.4, 1], [0.02, 1.2, 0.7], [-0.08, 2.1, 0.9], [0.14, 2.6, 0.75], [-0.16, 3.4, 0.6]];
    spots.forEach(([x, rot, scale], index) => {
        const mesh = add(THREE, group, new THREE.SphereGeometry(0.1, 10, 8), index % 2 ? pale : leaf, x, 0.22, Math.sin(rot) * 0.12);
        mesh.scale.set(1.4 * scale, 0.35, 0.9);
        mesh.rotation.y = rot;
    });
    add(THREE, group, new THREE.SphereGeometry(0.045, 8, 8), material(THREE, 0xd6453d, 0.45), 0.08, 0.24, 0.06);
    add(THREE, group, new THREE.BoxGeometry(0.05, 0.03, 0.05), material(THREE, 0xc9843e, 0.8), -0.06, 0.23, -0.08);
    return group;
}

export function createSkewers(THREE) {
    const group = new THREE.Group();
    group.add(plate(THREE, 0.5));
    const stick = material(THREE, 0xc4a15a, 0.7);
    const meat = material(THREE, 0xb5523a, 0.6);
    const veg = material(THREE, 0x6fa84a, 0.6);
    const onion = material(THREE, 0xf3e7d8, 0.5);
    [-0.08, 0.1].forEach((z, index) => {
        const rod = add(THREE, group, new THREE.CylinderGeometry(0.012, 0.012, 0.72, 8), stick, 0, 0.16, z);
        rod.rotation.z = Math.PI / 2;
        rod.rotation.y = index === 0 ? 0.15 : -0.2;
        [-0.22, -0.08, 0.08, 0.22].forEach((x, n) => {
            const color = n % 3 === 0 ? veg : n % 3 === 1 ? onion : meat;
            add(THREE, group, n % 2 ? new THREE.BoxGeometry(0.08, 0.08, 0.08) : new THREE.SphereGeometry(0.05, 10, 8), color, x, 0.18, z);
        });
    });
    return group;
}

export function createJuice(THREE) {
    const group = new THREE.Group();
    add(THREE, group, new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), material(THREE, 0xf7f1ea, 0.4), 0, 0.015, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.17, 0.14, 0.58, 22), material(THREE, 0xe8f4ff, 0.1, 0.05, { transparent: true, opacity: 0.45 }), 0, 0.32, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.145, 0.125, 0.36, 22), material(THREE, 0xf26a2e, 0.35), 0, 0.26, 0);
    const rim = add(THREE, group, new THREE.TorusGeometry(0.165, 0.016, 8, 22), material(THREE, 0xf4fbff, 0.2), 0, 0.6, 0);
    rim.rotation.x = Math.PI / 2;
    const straw = add(THREE, group, new THREE.CylinderGeometry(0.014, 0.014, 0.62, 8), material(THREE, 0xf0c14a, 0.4), 0.05, 0.52, 0);
    straw.rotation.z = 0.22;
    const slice = add(THREE, group, new THREE.CylinderGeometry(0.09, 0.09, 0.025, 16), material(THREE, 0xffb347, 0.4), 0.16, 0.58, 0.02);
    slice.rotation.x = 1.15;
    slice.rotation.z = 0.4;
    add(THREE, group, new THREE.SphereGeometry(0.035, 8, 8), material(THREE, 0xffe08a, 0.4), 0.2, 0.58, 0.02);
    return group;
}

export function createWrap(THREE) {
    const group = new THREE.Group();
    group.add(plate(THREE, 0.48));
    const tortilla = material(THREE, 0xe6c48a, 0.72);
    const body = add(THREE, group, new THREE.CylinderGeometry(0.13, 0.13, 0.62, 20), tortilla, 0, 0.18, 0);
    body.rotation.z = Math.PI / 2;
    add(THREE, group, new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12), material(THREE, 0x5e9a55, 0.6), 0.32, 0.18, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), material(THREE, 0xd6453d, 0.5), 0.33, 0.18, 0.04);
    add(THREE, group, new THREE.BoxGeometry(0.08, 0.03, 0.16), material(THREE, 0xf3e7d8, 0.5), 0.05, 0.28, 0);
    return group;
}

export function createKebab(THREE) {
    const group = new THREE.Group();
    add(THREE, group, new THREE.CylinderGeometry(0.28, 0.3, 0.04, 20), material(THREE, 0xe6c48a, 0.7), 0, 0.04, 0);
    const meat = material(THREE, 0xa85a3c, 0.62);
    [0.12, 0.24, 0.36, 0.46].forEach((y, index) => {
        const chunk = add(THREE, group, new THREE.SphereGeometry(0.12 - index * 0.012, 12, 10), meat, 0, y, 0);
        chunk.scale.set(1, 0.7, 1);
    });
    add(THREE, group, new THREE.CylinderGeometry(0.01, 0.01, 0.62, 6), material(THREE, 0xd7c4a4, 0.5), 0, 0.34, 0);
    add(THREE, group, new THREE.TorusGeometry(0.07, 0.02, 6, 12), material(THREE, 0xf3e7d8, 0.5), 0, 0.12, 0.16).rotation.x = Math.PI / 2;
    add(THREE, group, new THREE.SphereGeometry(0.04, 8, 8), material(THREE, 0xd4483a, 0.45), 0.12, 0.08, 0.1);
    return group;
}

export function createRoast(THREE) {
    const group = new THREE.Group();
    group.add(plate(THREE, 0.54));
    const roast = add(THREE, group, new THREE.SphereGeometry(0.24, 18, 14), material(THREE, 0x8c4a32, 0.7), 0, 0.2, 0);
    roast.scale.set(1.35, 0.75, 0.9);
    const mark = material(THREE, 0x4a2618, 0.8);
    [-0.08, 0.02, 0.12].forEach((x) => {
        add(THREE, group, new THREE.BoxGeometry(0.012, 0.02, 0.28), mark, x, 0.32, 0);
    });
    add(THREE, group, new THREE.SphereGeometry(0.06, 10, 8), material(THREE, 0xc9843e, 0.7), -0.22, 0.12, 0.12);
    add(THREE, group, new THREE.SphereGeometry(0.05, 10, 8), material(THREE, 0x6b8f45, 0.65), 0.24, 0.12, -0.08);
    add(THREE, group, new THREE.BoxGeometry(0.04, 0.015, 0.16), material(THREE, 0x3f6b52, 0.7), 0.08, 0.36, 0.04).rotation.y = 0.4;
    return group;
}

export function createCoffee(THREE) {
    const group = new THREE.Group();
    add(THREE, group, new THREE.CylinderGeometry(0.28, 0.28, 0.025, 24), material(THREE, 0xf7f1ea, 0.4), 0, 0.02, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.16, 0.14, 0.22, 22), material(THREE, 0xf4efe6, 0.4), 0, 0.15, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20), material(THREE, 0x4a2c22, 0.4), 0, 0.25, 0);
    const handle = add(THREE, group, new THREE.TorusGeometry(0.07, 0.016, 8, 16, Math.PI), material(THREE, 0xe7d3c0, 0.4), 0.16, 0.16, 0);
    handle.rotation.z = -Math.PI / 2;
    return group;
}

export function createSmoothie(THREE) {
    const group = new THREE.Group();
    const glass = material(THREE, 0xffffff, 0.08, 0.04, { transparent: true, opacity: 0.25 });
    add(THREE, group, new THREE.CylinderGeometry(0.15, 0.11, 0.58, 20), glass, 0, 0.32, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.125, 0.095, 0.36, 20), material(THREE, 0xd46a8a, 0.35, 0.02, { transparent: true, opacity: 0.9 }), 0, 0.26, 0);
    add(THREE, group, new THREE.SphereGeometry(0.08, 12, 10), material(THREE, 0xfff6f2, 0.7), 0, 0.56, 0);
    add(THREE, group, new THREE.SphereGeometry(0.03, 8, 8), material(THREE, 0x8c2f4a, 0.45), 0.05, 0.62, 0.02);
    const straw = add(THREE, group, new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), material(THREE, 0xf7c3d4, 0.4), 0.04, 0.62, 0);
    straw.rotation.z = -0.3;
    return group;
}

export function createIcedCoffee(THREE) {
    const group = new THREE.Group();
    const glass = material(THREE, 0xffffff, 0.08, 0.04, { transparent: true, opacity: 0.26 });
    add(THREE, group, new THREE.CylinderGeometry(0.16, 0.14, 0.56, 20), glass, 0, 0.3, 0);
    add(THREE, group, new THREE.CylinderGeometry(0.135, 0.12, 0.32, 20), material(THREE, 0x6b4636, 0.4, 0.02, { transparent: true, opacity: 0.9 }), 0, 0.24, 0);
    const ice = material(THREE, 0xf4fbff, 0.15, 0.05, { transparent: true, opacity: 0.75 });
    [[-0.04, 0.4, 0.02], [0.05, 0.44, -0.03]].forEach(([x, y, z], index) => {
        const cube = add(THREE, group, new THREE.BoxGeometry(0.07, 0.06, 0.07), ice, x, y, z);
        cube.rotation.y = index * 0.6;
    });
    const swirl = add(THREE, group, new THREE.TorusGeometry(0.05, 0.012, 6, 12), material(THREE, 0xf3e7d8, 0.45), 0, 0.4, 0);
    swirl.rotation.x = Math.PI / 2;
    const straw = add(THREE, group, new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8), material(THREE, 0xc4a15a, 0.4), -0.03, 0.46, 0);
    straw.rotation.z = 0.2;
    return group;
}

export function createFriedPlatter(THREE) {
    const group = new THREE.Group();
    const platter = plate(THREE, 0.56);
    platter.scale.set(1.15, 1, 0.85);
    group.add(platter);
    const fry = material(THREE, 0xf0c14a, 0.65);
    for (let i = 0; i < 10; i++) {
        const stick = add(
            THREE,
            group,
            new THREE.BoxGeometry(0.035, 0.16, 0.035),
            fry,
            -0.12 + (i % 5) * 0.06,
            0.16 + (i % 3) * 0.02,
            -0.06 + Math.floor(i / 5) * 0.08
        );
        stick.rotation.z = (i - 5) * 0.08;
    }
    add(THREE, group, new THREE.SphereGeometry(0.07, 10, 8), material(THREE, 0xd4893a, 0.75), 0.2, 0.12, 0.08);
    add(THREE, group, new THREE.SphereGeometry(0.06, 10, 8), material(THREE, 0xc47a32, 0.75), 0.26, 0.11, -0.04);
    const ring = add(THREE, group, new THREE.TorusGeometry(0.06, 0.016, 6, 14), material(THREE, 0xe8c56a, 0.6), -0.22, 0.1, 0.08);
    ring.rotation.x = Math.PI / 2.4;
    add(THREE, group, new THREE.CylinderGeometry(0.05, 0.045, 0.05, 12), material(THREE, 0xc4473a, 0.45), 0.18, 0.1, -0.16);
    return group;
}

export const FOOD_MODELS = {
    burger: createBurger,
    pizza: createPizza,
    pasta: createPasta,
    'fried-chicken': createFriedChicken,
    salad: createSalad,
    skewers: createSkewers,
    juice: createJuice,
    wrap: createWrap,
    kebab: createKebab,
    roast: createRoast,
    coffee: createCoffee,
    smoothie: createSmoothie,
    'iced-coffee': createIcedCoffee,
    'fried-platter': createFriedPlatter
};

export function createFood(THREE, type) {
    const factory = FOOD_MODELS[type];
    if (!factory) {
        const fallback = new THREE.Group();
        fallback.add(plate(THREE, 0.4));
        return fallback;
    }
    return factory(THREE);
}
