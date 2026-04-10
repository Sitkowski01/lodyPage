import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './style.css';

/**
 * PROCEDURALNE GENEROWANIE TEKSTURY WAFLA
 */
function createWaffleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#db9c58';
    ctx.fillRect(0, 0, 1024, 1024);

    for(let i=0; i<15000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(Math.random()*1024, Math.random()*1024, 3, 3);
    }

    const spacing = 64;
    ctx.lineCap = 'round';

    ctx.lineWidth = 12;
    ctx.strokeStyle = '#a66a33';
    for(let i = -1024; i < 2048; i += spacing) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 1024, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i + 1024, 0); ctx.lineTo(i, 1024); ctx.stroke();
    }

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f4c898';
    for(let i = -1024; i < 2048; i += spacing) {
        ctx.beginPath(); ctx.moveTo(i-5, 0); ctx.lineTo(i + 1024 - 5, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i + 1024 + 5, 0); ctx.lineTo(i + 5, 1024); ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 1);
    texture.anisotropy = 16;
    return texture;
}

/**
 * USTAWIENIA SCENY 3D
 */
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 14);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const productGroup = new THREE.Group();
scene.add(productGroup);

// 1. WAFLOWY ROŻEK 3D
const coneHeight = 5;
const coneGeo = new THREE.ConeGeometry(1.4, coneHeight, 64);
coneGeo.rotateX(Math.PI);
coneGeo.translate(0, -coneHeight / 2, 0);

const waffleTex = createWaffleTexture();
const coneMat = new THREE.MeshStandardMaterial({
    map: waffleTex,
    bumpMap: waffleTex,
    bumpScale: 0.08,
    roughness: 0.85,
    metalness: 0.0,
    color: 0xffffff
});

const coneMesh = new THREE.Mesh(coneGeo, coneMat);
coneMesh.castShadow = true;
coneMesh.receiveShadow = true;
productGroup.add(coneMesh);

// 2. REALISTYCZNE LODY WŁOSKIE 3D
const points = [];
const numTurns = 3.8;
const swirlHeight = 4.5;
const baseRadius = 1.25;

for (let i = 0; i <= 250; i++) {
    const t = i / 250;
    const angle = t * Math.PI * 2 * numTurns;
    const y = Math.pow(t, 1.2) * swirlHeight;
    const taper = 1 - Math.pow(t, 2.0);
    const r = baseRadius * taper;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    points.push(new THREE.Vector3(x, y, z));
}

for (let i = 220; i <= 250; i++) {
    const t = (i - 220) / 30;
    points[i].x += t * 0.3;
    points[i].y -= t * 0.15;
    points[i].z += t * 0.1;
}

const curve = new THREE.CatmullRomCurve3(points);
const tubularSegments = 350;
const radialSegments = 48;

const iceCreamGeo = new THREE.TubeGeometry(curve, tubularSegments, 0.45, radialSegments, false);

const posAttr = iceCreamGeo.attributes.position;
const normAttr = iceCreamGeo.attributes.normal;
const vertex = new THREE.Vector3();
const normal = new THREE.Vector3();

for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i);
    normal.fromBufferAttribute(normAttr, i);

    const t = Math.floor(i / (radialSegments + 1)) / tubularSegments;

    let thicknessScale = 1.0;
    if (t > 0.85) {
        thicknessScale = 1.0 - Math.pow((t - 0.85) * (1/0.15), 2);
    }
    if (t < 0.02) thicknessScale *= t / 0.02;
    thicknessScale = Math.max(0.0001, thicknessScale);

    const radialIndex = i % (radialSegments + 1);
    const theta = (radialIndex / radialSegments) * Math.PI * 2;

    const ridgeDepth = 0.12 * thicknessScale;
    const asymmetricNoise = Math.sin(theta * 3) * 0.02;
    const radiusOffset = (Math.sin(theta * 6) * ridgeDepth) + asymmetricNoise;

    vertex.addScaledVector(normal, radiusOffset);
    vertex.addScaledVector(normal, -(0.45 - 0.45 * thicknessScale));

    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
}
iceCreamGeo.computeVertexNormals();

const iceCreamMat = new THREE.MeshPhysicalMaterial({
    color: 0xfffaf0,
    emissive: 0x1f1a14,
    roughness: 0.35,
    metalness: 0.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
    transmission: 0.4,
    thickness: 1.2,
    side: THREE.DoubleSide
});

const iceCreamMesh = new THREE.Mesh(iceCreamGeo, iceCreamMat);
iceCreamGeo.setDrawRange(0, 0);
iceCreamMesh.castShadow = true;
iceCreamMesh.receiveShadow = true;
iceCreamMesh.position.y = -0.3;
productGroup.add(iceCreamMesh);

// 2.5 POSYPKA
const sprinklesGroup = new THREE.Group();
productGroup.add(sprinklesGroup);
const sprinklesArray = [];

const sprinkleMats = [
    new THREE.MeshStandardMaterial({ color: 0x2a1610, roughness: 0.8, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: 0xd5b07c, roughness: 0.2, metalness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 })
];

const sprinkleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 8);
sprinkleGeo.rotateX(Math.PI / 2);

const posArray = iceCreamGeo.attributes.position.array;
const normArray = iceCreamGeo.attributes.normal.array;
const totalVerts = posArray.length / 3;

const numSprinklesToGenerate = 450;
let generatedSprinkles = 0;
let generationAttempts = 0;

while(generatedSprinkles < numSprinklesToGenerate && generationAttempts < 3000) {
    generationAttempts++;

    let randIdx = Math.floor(totalVerts * 0.01 + Math.random() * (totalVerts * 0.98));

    let vx = posArray[randIdx*3];
    let vy = posArray[randIdx*3+1];
    let vz = posArray[randIdx*3+2];
    let nx = normArray[randIdx*3];
    let ny = normArray[randIdx*3+1];
    let nz = normArray[randIdx*3+2];

    if (ny < -0.05) continue;

    let targetPos = new THREE.Vector3(vx, vy, vz).add(new THREE.Vector3(nx, ny, nz).multiplyScalar(0.04));
    targetPos.y -= 0.3;

    let mesh = new THREE.Mesh(sprinkleGeo, sprinkleMats[Math.floor(Math.random() * sprinkleMats.length)]);
    mesh.castShadow = true;

    mesh.lookAt(new THREE.Vector3(nx, ny, nz));
    mesh.rotateX(Math.random() * Math.PI);
    mesh.rotateY(Math.random() * Math.PI);

    mesh.position.set(targetPos.x + (Math.random()-0.5), targetPos.y + 6 + Math.random()*3, targetPos.z + (Math.random()-0.5));
    mesh.scale.set(0, 0, 0);

    let randomScale = 0.6 + Math.random() * 0.6;
    mesh.userData = { targetPos: targetPos, targetScale: randomScale };

    sprinklesGroup.add(mesh);
    sprinklesArray.push(mesh);

    generatedSprinkles++;
}

// 3. DYSZA MASZYNY
const nozzleGroup = new THREE.Group();

const nozzleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.5, 0.8, 32),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.2 })
);
nozzleBody.position.y = 0.4;

const nozzleTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.35, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.15 })
);
nozzleTip.position.y = -0.2;

nozzleGroup.add(nozzleBody, nozzleTip);
scene.add(nozzleGroup);


// OŚWIETLENIE
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const keyLight = new THREE.SpotLight(0xffecd9, 5.5);
keyLight.position.set(6, 8, 5);
keyLight.angle = Math.PI / 5;
keyLight.penumbra = 0.5;
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-5, 0, 3);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xffcc88, 6.0, 20);
rimLight.position.set(0, 4, -6);
scene.add(rimLight);


// PĘTLA ANIMACJI & KAMERA
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;
let isLoaded = false;

let camTarget = { x: 0, lookX: 0, z: 14 };

function animate() {
    requestAnimationFrame(animate);

    targetX = mouseX * 0.8;
    targetY = mouseY * 0.8;

    if (isLoaded) {
        productGroup.rotation.y += 0.002;
        productGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;

        let finalCamX = camTarget.x + (targetX * 0.5);
        let finalCamY = 1.5 + (-targetY * 0.5);

        camera.position.x += (finalCamX - camera.position.x) * 0.05;
        camera.position.y += (finalCamY - camera.position.y) * 0.05;
        camera.position.z += (camTarget.z - camera.position.z) * 0.05;

        camera.lookAt(camTarget.lookX, 1.8, 0);
    } else {
        camera.lookAt(0, 1.5, 0);
    }

    renderer.render(scene, camera);
}
animate();

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// SEKWENCJA ŁADOWANIA
gsap.to('.loader-text', { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.1 });

const totalIndices = iceCreamGeo.index.count;
let loadObj = { progress: 0 };

nozzleGroup.position.copy(curve.getPoint(0));
nozzleGroup.position.y += -0.3 + 0.15;

gsap.to(productGroup.rotation, {
    y: Math.PI * 2.5,
    duration: 2.5,
    ease: "power2.inOut"
});

gsap.to(loadObj, {
    progress: 1,
    duration: 2.5,
    ease: "power2.inOut",
    onUpdate: () => {
        const drawCount = Math.floor(loadObj.progress * totalIndices);
        iceCreamGeo.setDrawRange(0, drawCount - (drawCount % 3));

        const currentPt = curve.getPoint(loadObj.progress);
        nozzleGroup.position.copy(currentPt);
        nozzleGroup.position.y += -0.3 + 0.25;
    },
    onComplete: () => {
        triggerWebsiteTransition();
    }
});

function triggerWebsiteTransition() {
    const tl = gsap.timeline({
        onComplete: initScrollAnimations
    });

    tl.to(nozzleGroup.position, {
        y: 12,
        duration: 0.8,
        ease: "power3.in"
    }, "+=0.1");

    sprinklesArray.forEach((s) => {
        let sc = s.userData.targetScale;
        tl.to(s.scale, { x: sc, y: sc, z: sc, duration: 0.2 }, "-=1.3");
        tl.to(s.position, {
            x: s.userData.targetPos.x,
            y: s.userData.targetPos.y,
            z: s.userData.targetPos.z,
            duration: 0.8 + Math.random() * 0.6,
            ease: "bounce.out"
        }, "-=1.4");
    });

    tl.to('.loader-text', {
        opacity: 0,
        y: -10,
        duration: 0.5
    }, "-=1.5");

    tl.set('#loader-ui', { display: "none" });

    tl.call(() => {
        isLoaded = true;
        document.getElementById('main-site').style.pointerEvents = 'auto';
    }, null, "-=0.5");

    const isDesktop = window.innerWidth > 900;

    tl.to('#webgl-canvas', {
        x: isDesktop ? 100 : 0,
        opacity: isDesktop ? 1 : 0,
        duration: 1.5,
        ease: "power3.inOut",
        onComplete: () => {
            if (!isDesktop) {
                document.querySelector('#webgl-canvas').style.display = 'none';
            }
        }
    }, "-=0.6");

    tl.to(camTarget, {
        x: isDesktop ? -12.5 : 0,
        lookX: isDesktop ? -4.0 : 0,
        z: isDesktop ? 11.0 : 15,
        duration: 1.5,
        ease: "power3.inOut"
    }, "-=1.5");

    gsap.fromTo('header', { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 2.5 });
    gsap.fromTo('.hero-content', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0, ease: "power3.out", delay: 2.3 });
}

// --- ANIMACJE ZAWARTOŚCI STRONY (GSAP ScrollTrigger) ---
function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    const mainScroller = "#main-site";
    ScrollTrigger.defaults({ scroller: mainScroller });

    const mainSite = document.getElementById('main-site');
    const header = document.getElementById('navbar');
    mainSite.addEventListener('scroll', () => {
        if(mainSite.scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    gsap.utils.toArray('.gsap-reveal').forEach((el) => {
        gsap.fromTo(el,
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.7, ease: "power3.out",
                scrollTrigger: {
                    trigger: el,
                    scroller: mainScroller,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 500);

    // Karuzela opinii
    const carouselGrid = document.querySelector('.opinie-grid');
    const carouselCards = document.querySelectorAll('.opinie-card');
    const carouselDots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    let carouselPage = 0;

    function getPerPage() { return window.innerWidth <= 900 ? 1 : 3; }

    function getTotalPages() { return Math.ceil(carouselCards.length / getPerPage()); }

    const CARD_GAP = 20; // px — matches 1.25rem

    function getPageOffset(page) {
        const pp = getPerPage();
        const outerW = carouselGrid.parentElement.offsetWidth;
        // width of one page worth of cards + their gaps
        const cardW = (outerW - CARD_GAP * (pp - 1)) / pp;
        // page n starts after n*pp cards and n*pp gaps (the gap before each new page)
        return page * (pp * cardW + pp * CARD_GAP);
    }

    function setupCarousel() {
        const pp = getPerPage();
        const outerW = carouselGrid.parentElement.offsetWidth;
        const cardW = (outerW - CARD_GAP * (pp - 1)) / pp;

        carouselGrid.style.width = '';
        carouselCards.forEach(card => {
            card.style.flex = `0 0 ${cardW}px`;
        });

        carouselPage = Math.min(carouselPage, getTotalPages() - 1);
        carouselGrid.style.transition = 'none';
        carouselGrid.style.transform = `translateX(-${getPageOffset(carouselPage)}px)`;
        requestAnimationFrame(() => { carouselGrid.style.transition = ''; });
        carouselDots.forEach((d, i) => d.classList.toggle('dot-active', i === carouselPage));
    }

    function goToPage(page) {
        const total = getTotalPages();
        carouselPage = (page + total) % total;
        carouselGrid.style.transform = `translateX(-${getPageOffset(carouselPage)}px)`;
        carouselDots.forEach((d, i) => d.classList.toggle('dot-active', i === carouselPage));
    }

    setupCarousel();
    window.addEventListener('resize', setupCarousel);

    if (prevBtn) prevBtn.addEventListener('click', () => goToPage(carouselPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToPage(carouselPage + 1));
    carouselDots.forEach((dot, i) => dot.addEventListener('click', () => goToPage(i)));

    // Na mobile ustaw padding hero równy dokładnej wysokości headera
    if (window.innerWidth <= 900) {
        const heroSection = document.querySelector('.hero-section');
        heroSection.style.paddingTop = (header.offsetHeight + 12) + 'px';
    }

    // Logo — powrót do góry
    document.querySelector('.logo').addEventListener('click', () => {
        mainSite.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Płynne przewijanie dla linków nawigacji i przycisku hero
    document.querySelectorAll('a[href^="#"], button[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const headerHeight = header.offsetHeight;
            mainSite.scrollTo({ top: target.offsetTop - headerHeight, behavior: 'smooth' });
        });
    });
}

