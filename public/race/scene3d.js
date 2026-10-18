// 3D-сцена «Гонки Наций» (Three.js): ночной стадион, трасса, машины в ливреях флагов, свечение (bloom).
// Камера ортографическая сбоку-сверху: все 6 дорожек одной высоты и совпадают с разметкой HUD (game.js).
// Если в public/race/assets/kenney/ лежит race.glb из Kenney Car Kit (CC0) — используется эта модель.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const R = window.Race;
const W = 1080, H = 1920;
const PX = 44;                       // пикселей экрана на метр
const THETA = 30 * Math.PI / 180;    // наклон камеры: сбоку-сверху, чтобы была видна ливрея на борту
const SIN = Math.sin(THETA), COS = Math.cos(THETA);
const CAR_LEN = 4.8, CAR_W = 2.0;
const START_SX = 222, FINISH_SX = 905;
const startX = (START_SX - W / 2) / PX, finishX = (FINISH_SX - W / 2) / PX;
const zOfScreen = sy => (sy - H / 2) / (SIN * PX);   // земля (y=0) ↔ экран
const LIFT = .62 * COS / SIN;                        // машина визуально по центру дорожки
const laneZ = i => zOfScreen(R.laneMid(i)) + LIFT;
const LANE_W = R.LANE_H / (SIN * PX);
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- рендер ----------
const canvas = document.getElementById('scene3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .5;

const camera = new THREE.OrthographicCamera(-W / 2 / PX, W / 2 / PX, H / 2 / PX, -H / 2 / PX, .1, 600);
const camBase = new THREE.Vector3(0, 200 * SIN, 200 * COS);
camera.position.copy(camBase);
camera.lookAt(0, 0, 0);
const camRight = new THREE.Vector3(1, 0, 0), camUp = new THREE.Vector3(0, COS, -SIN);

// Свечение: фары, стопы, прожекторы, табло
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .55, .35, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8;
  return t;
}
const radial = (inner, outer) => canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, w, w); });

scene.background = canvasTex(64, 1024, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#03040a'); gr.addColorStop(.25, '#0a0e26'); gr.addColorStop(.5, '#121a3e'); gr.addColorStop(1, '#05060e');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

// ---------- свет: ночь, прожекторы ----------
scene.add(new THREE.HemisphereLight('#5a6cc0', '#0a0806', .25));
const key = new THREE.DirectionalLight('#fff1dc', 2.4);
key.position.set(-12, 30, 20);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -24, right: 24, top: 26, bottom: -26, near: 1, far: 90 });
key.shadow.bias = -.0004; key.shadow.normalBias = .02;
scene.add(key);
const rim = new THREE.DirectionalLight('#7a9cff', .6);
rim.position.set(20, 10, -25);
scene.add(rim);

// ---------- трасса ----------
const zTop = laneZ(0) - LANE_W / 2 - LIFT, zBot = laneZ(5) + LANE_W / 2 - LIFT;
const trackMid = (zTop + zBot) / 2, trackW = zBot - zTop;

const asphalt = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#15171c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40000; i++) { const v = rnd(10, 62); g.fillStyle = `rgba(${v},${v},${v + 5},${rnd(.2, .55)})`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 2.4), rnd(1, 2.4)); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(0,0,0,${rnd(.06, .16)})`; g.lineWidth = rnd(1, 4); g.beginPath(); g.moveTo(rnd(0, w), rnd(0, h)); g.lineTo(rnd(0, w), rnd(0, h)); g.stroke(); }
}, { repeat: [7, 3] });
const asphaltRough = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = rnd(90, 200); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 4), rnd(1, 4)); } }, { repeat: [7, 3], srgb: false });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: '#0a0d12', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.03; ground.receiveShadow = true; scene.add(ground);
// трава между бордюром и стеной (полосы стрижки)
const grass = canvasTex(256, 256, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#14361e' : '#184026'; g.fillRect(x, 0, 32, h); } for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${rnd(.05, .2)})`; g.fillRect(rnd(0, w), rnd(0, h), 1, 2); } }, { repeat: [24, 1] });
for (const z of [zTop - 1.35, zBot + 1.4]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(100, 1.5), new THREE.MeshStandardMaterial({ map: grass, roughness: .95 }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, -.01, z); m.receiveShadow = true; scene.add(m);
}
const track = new THREE.Mesh(new THREE.PlaneGeometry(100, trackW + .2), new THREE.MeshStandardMaterial({ map: asphalt, roughnessMap: asphaltRough, roughness: .72, metalness: .05, envMapIntensity: .8 }));
track.rotation.x = -Math.PI / 2; track.position.set(0, 0, trackMid); track.receiveShadow = true; scene.add(track);

// пятна света прожекторов на асфальте
{
  const pool = radial('rgba(255,236,200,.35)', 'rgba(255,236,200,0)');
  for (const [x, dz] of [[-10, -.2], [-3, .3], [4, -.25], [11, .2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, trackW * 1.25), new THREE.MeshBasicMaterial({ map: pool, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .3 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .012, trackMid + dz * trackW / 2); scene.add(m);
  }
}
// следы шин
{
  const skid = canvasTex(512, 64, (g, w) => { for (let i = 0; i < 2; i++) { const y = 14 + i * 32; const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.2, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y, w, 8); } });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(4, 8), .9), new THREE.MeshBasicMaterial({ map: skid, transparent: true, depthWrite: false, opacity: .55 }));
    m.rotation.x = -Math.PI / 2; m.position.set(rnd(-4, 7), .011, laneZ(i) - LIFT + rnd(-.6, .6)); scene.add(m);
  }
}
// подсветка дорожки лидера
const laneGlow = [];
const glowTex = canvasTex(256, 8, (g, w) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, 8); });
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(finishX - startX, LANE_W * .9), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((startX + finishX) / 2, .014, laneZ(i) - LIFT);
  scene.add(m); laneGlow.push(m);
}
// разметка
{
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, .14), new THREE.MeshStandardMaterial({ color: '#d8dde6', roughness: .55 }), 5 * 40);
  let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
  for (let i = 1; i < 6; i++) for (let x = startX + 1; x < 40; x += 2.4) { m4.compose(new THREE.Vector3(x, .01, zTop + i * LANE_W), q, one); dash.setMatrixAt(k++, m4); }
  dash.count = k; dash.receiveShadow = true; scene.add(dash);
  for (const z of [zTop + .12, zBot - .12]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(100, .16), new THREE.MeshStandardMaterial({ color: '#e8ecf2', roughness: .5 })); l.rotation.x = -Math.PI / 2; l.position.set(0, .011, z); scene.add(l); }
}
// бордюры: скруглённые красно-белые
{
  const n = 90;
  const geo = new THREE.CylinderGeometry(.32, .32, 1.1, 10, 1, false, 0, Math.PI);
  geo.rotateZ(Math.PI / 2); geo.rotateX(-Math.PI / 2); geo.scale(1, .45, 1);
  const kerb = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .45 }), n * 2);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (const z of [zTop - .32, zBot + .32]) for (let i = 0; i < n; i++) {
    m4.makeTranslation(-50 + i * 1.1, 0, z); kerb.setMatrixAt(k, m4);
    kerb.setColorAt(k++, new THREE.Color(i % 2 ? '#f2f2f2' : '#d4141e'));
  }
  kerb.receiveShadow = kerb.castShadow = true; scene.add(kerb);
}
// старт: линия и стартовая решётка; финиш — шашечки
{
  const start = new THREE.Mesh(new THREE.PlaneGeometry(.35, trackW), new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: .5 }));
  start.rotation.x = -Math.PI / 2; start.position.set(startX, .012, trackMid); scene.add(start);
  const white = new THREE.MeshStandardMaterial({ color: '#e8ecf2', roughness: .5 });
  for (let i = 0; i < 6; i++) {
    const z = laneZ(i) - LIFT;
    for (const dz of [-LANE_W * .32, LANE_W * .32]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(.9, .12), white); b.rotation.x = -Math.PI / 2; b.position.set(startX + CAR_LEN + .6, .012, z + dz); scene.add(b); }
    const c = new THREE.Mesh(new THREE.PlaneGeometry(.12, LANE_W * .64), white); c.rotation.x = -Math.PI / 2; c.position.set(startX + CAR_LEN + 1.05, .012, z); scene.add(c);
  }
  const checker = canvasTex(64, 512, (g, w, h) => { const s = 32; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = ((x + y) / s) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x, y, s, s); } });
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(1, trackW), new THREE.MeshStandardMaterial({ map: checker, roughness: .5 }));
  fin.rotation.x = -Math.PI / 2; fin.position.set(finishX + .5, .012, trackMid); fin.receiveShadow = true; scene.add(fin);
}

// ---------- финишная арка ----------
const fontWord = {};
{
  const red = new THREE.MeshStandardMaterial({ color: '#c80f1a', metalness: .4, roughness: .35 });
  const x = finishX + .5, hgt = 3.9;
  for (const z of [zTop - 1.7, zBot + 1.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.6, hgt, .6), red);
    post.position.set(x, hgt / 2, z); post.castShadow = true; scene.add(post);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.8, .25, .8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe6a0', emissiveIntensity: 3 }));
    cap.position.set(x, hgt + .1, z); scene.add(cap);
  }
  const checker = canvasTex(1024, 64, (g, w, h) => { const s = 32; for (let y = 0; y < h; y += s) for (let xx = 0; xx < w; xx += s) { g.fillStyle = ((xx + y) / s) % 2 ? '#111' : '#f4f4f4'; g.fillRect(xx, y, s, s); } });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, zBot - zTop + 4), new THREE.MeshStandardMaterial({ map: checker, roughness: .5 }));
  beam.position.set(x, hgt, trackMid); beam.castShadow = true; scene.add(beam);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(.08, .12, zBot - zTop + 4), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 4 }));
  strip.position.set(x + .62, hgt - .4, trackMid); scene.add(strip);
  // «ФИНИШ» на асфальте за линией (читается сверху вниз)
  const drawWord = (g, w, h) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
    g.font = '120px "Russo One", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('ФИНИШ', 0, 6);
    g.fillStyle = '#ffd23a'; g.fillText('ФИНИШ', 0, 6);
  };
  fontWord.tex = canvasTex(160, 1024, drawWord);
  fontWord.redraw = () => { drawWord(fontWord.tex.image.getContext('2d'), 160, 1024); fontWord.tex.needsUpdate = true; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.25, trackW * .8), new THREE.MeshStandardMaterial({ map: fontWord.tex, transparent: true, roughness: .6, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(finishX + 1.9, .014, trackMid); scene.add(floor);
}

// ---------- стадион: трибуны, болельщики, табло, прожекторы ----------
const countries = () => R.view?.countries || [];
const TEAM_COLORS = ['#00AFCA', '#FEC50C', '#FFFFFF', '#0039A6', '#D52B1E', '#0057B7', '#FFD700', '#D90012', '#0033A0', '#F2A800', '#0092BC', '#E4002B', '#00AF66', '#E30A17'];
const DARK = ['#1c2030', '#252a3c', '#2e3346', '#3a3f55', '#20242f', '#41465c'];
const SKIN = ['#f1c7a3', '#d8a47f', '#b9835e', '#8d5a3b', '#e9bd94'];
const crowd = { body: null, head: null, base: [], ad: null };
const AD_COLORS = ['#d4141e', '#ffb21a', '#1e8bff', '#1fbf5a', '#b44aff'];
const drawAd = (g, w, h) => {
  for (let i = 0; i < 10; i++) { g.fillStyle = AD_COLORS[i % AD_COLORS.length]; g.fillRect(i * w / 10, 0, w / 10, h); }
  g.fillStyle = '#fff'; g.font = '40px "Russo One", Arial'; g.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) g.fillText('ГОНКА НАЦИЙ', 14 + i * w / 10, h / 2 + 2);
};
{
  const MAX = 7000;
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.2, .32, 2, 8), new THREE.MeshStandardMaterial({ roughness: .85 }), MAX);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshStandardMaterial({ roughness: .7 }), MAX);
  let k = 0; const m4 = new THREE.Matrix4();
  const person = (x, y, z) => {
    if (k >= MAX) return;
    crowd.base.push({ x, y, z, phase: rnd(0, 6.3), amp: rnd(.04, .16) });
    m4.makeTranslation(x, y, z); body.setMatrixAt(k, m4);
    m4.makeTranslation(x, y + .42, z); head.setMatrixAt(k, m4);
    body.setColorAt(k, new THREE.Color(Math.random() < .45 ? TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)] : DARK[Math.floor(Math.random() * DARK.length)]));
    head.setColorAt(k, new THREE.Color(SKIN[Math.floor(Math.random() * SKIN.length)]));
    k++;
  };
  const len = 90;
  // дальняя трибуна: ступени с рядами кресел
  const step = new THREE.MeshStandardMaterial({ color: '#1a1e2c', roughness: .9 });
  const seatA = new THREE.MeshStandardMaterial({ color: '#7a1220', roughness: .7 }), seatB = new THREE.MeshStandardMaterial({ color: '#13306e', roughness: .7 });
  for (let r = 0; r < 9; r++) {
    const z = zTop - 3.4 - r * 1.3, y = .7 + r * .8;
    const s = new THREE.Mesh(new THREE.BoxGeometry(len, y, 1.3), step); s.position.set(0, y / 2, z); s.receiveShadow = true; scene.add(s);
    const seats = new THREE.Mesh(new THREE.BoxGeometry(len, .12, .3), r % 2 ? seatA : seatB); seats.position.set(0, y + .06, z + .45); scene.add(seats);
    for (let x = -len / 2 + .4; x < len / 2; x += .62) if (Math.random() > .1) person(x + rnd(-.1, .1), y + .4, z + rnd(-.15, .15));
  }
  // крыша трибуны с полосой света
  const roof = new THREE.Mesh(new THREE.BoxGeometry(len, .5, 6), new THREE.MeshStandardMaterial({ color: '#0e1120', roughness: .6, metalness: .4 }));
  roof.position.set(0, 10.6, zTop - 9.5); scene.add(roof);
  const roofLight = new THREE.Mesh(new THREE.BoxGeometry(len, .14, .2), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#cfe0ff', emissiveIntensity: 5 }));
  roofLight.position.set(0, 10.3, zTop - 6.6); scene.add(roofLight);
  // ближняя сторона — болельщики на ровных террасах (внизу кадра, зона чата: просто декор)
  for (let r = 0; r < 34; r++) {
    const z = zBot + 3.4 + r * 1.2;
    for (let x = -len / 2 + .4; x < len / 2; x += .66) if (Math.random() > .18) person(x + rnd(-.1, .1), .38, z + rnd(-.18, .18));
  }
  body.count = head.count = k;
  body.castShadow = true;
  crowd.body = body; crowd.head = head;
  scene.add(body, head);
  // стенки вдоль трассы и светящееся рекламное табло
  const wallMat = new THREE.MeshStandardMaterial({ color: '#151a2c', roughness: .6 });
  for (const z of [zTop - 2.35, zBot + 2.45]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(100, 1, .3), wallMat); wall.position.set(0, .5, z); wall.castShadow = true; scene.add(wall); }
  crowd.ad = canvasTex(2048, 64, drawAd, { repeat: [2, 1] });
  const ad = new THREE.Mesh(new THREE.PlaneGeometry(100, .6), new THREE.MeshStandardMaterial({ map: crowd.ad, emissive: '#fff', emissiveMap: crowd.ad, emissiveIntensity: 1.1 }));
  ad.position.set(0, .62, zTop - 2.19); scene.add(ad);
}
// мачты прожекторов + лучи света
{
  const glowSprite = radial('rgba(255,255,255,1)', 'rgba(170,200,255,0)');
  const beamMat = new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: .018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-16, -5, 6, 17]) {
    const z = zTop - 14;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.22, .32, 20, 8), new THREE.MeshStandardMaterial({ color: '#2a3048', metalness: .6, roughness: .4 }));
    mast.position.set(x, 10, z); scene.add(mast);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, .3), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#eef4ff', emissiveIntensity: 6 }));
    panel.position.set(x, 20.5, z); scene.add(panel);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }));
    s.scale.set(10, 10, 1); s.position.set(x, 20.5, z + .5); s.material.opacity = .55; scene.add(s);
    const target = new THREE.Vector3(x * .6, 0, trackMid), from = new THREE.Vector3(x, 20.5, z);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5, from.distanceTo(target), 24, 1, true), beamMat);
    cone.position.copy(from).lerp(target, .5);
    cone.lookAt(target); cone.rotateX(Math.PI / 2);
    scene.add(cone);
  }
}
// флаги шести стран над дальней трибуной + клетчатый на арке
const flags = [];
function addFlag(tex, pos, phase) {
  const geo = new THREE.PlaneGeometry(2.6, 1.7, 18, 6); geo.translate(1.3, 0, 0);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .7 }));
  flag.quaternion.copy(camera.quaternion);
  const group = new THREE.Group(); group.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#ccd', metalness: .8, roughness: .3 }));
  pole.position.y = -.9; group.add(pole);
  group.position.copy(pos);
  scene.add(group);
  flags.push({ group, geo, base: geo.attributes.position.array.slice(), phase });
}
function buildFlags() {
  flags.forEach(f => scene.remove(f.group)); flags.length = 0;
  countries().forEach((c, i) => {
    for (const side of [-1, 1]) {
      const tex = canvasTex(192, 128, (g, w, h) => window.RaceArt.drawFlag(g, c.id, 0, 0, w, h, { radius: 0 }));
      addFlag(tex, new THREE.Vector3(side * (5 + i * 4.6), 9.4, zTop - 12.8), i + (side > 0 ? 3 : 0));
    }
  });
  const chk = canvasTex(192, 128, (g, w, h) => { const s = 32; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = ((x + y) / s) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x, y, s, s); } });
  addFlag(chk, new THREE.Vector3(finishX + .8, 4.9, zBot + 1.7), 9);
}

// ---------- машины ----------
function livery(c, number) {
  return canvasTex(1024, 512, (g, w, h) => {
    const cols = c.colors || ['#888'];
    if (c.id === 'kz' || c.id === 'tr') { g.fillStyle = c.id === 'kz' ? '#00AFCA' : '#E30A17'; g.fillRect(0, 0, w, h); }
    else cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, h * i / cols.length, w, h / cols.length + 1); });
    const ex = w * .7, ey = h * .5;
    if (c.id === 'kz') {
      g.fillStyle = '#FEC50C';
      for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; g.beginPath(); g.moveTo(ex + Math.cos(a) * 58, ey + Math.sin(a) * 58); g.lineTo(ex + Math.cos(a + .1) * 86, ey + Math.sin(a + .1) * 86); g.lineTo(ex + Math.cos(a - .1) * 86, ey + Math.sin(a - .1) * 86); g.fill(); }
      g.beginPath(); g.arc(ex, ey, 48, 0, 7); g.fill();
      for (let y = 20; y < h - 20; y += 52) g.fillRect(w * .05, y, 26, 30);
    }
    if (c.id === 'tr' || c.id === 'az') {
      const r = c.id === 'tr' ? 84 : 58, bg = c.id === 'tr' ? '#E30A17' : '#E4002B';
      const cx = ex - 30, cy = h / 2;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.fillStyle = bg; g.beginPath(); g.arc(cx + r * .28, cy, r * .8, 0, 7); g.fill();
      g.fillStyle = '#fff'; window.RaceArt.star(g, cx + r * 1.15, cy, r * .42, c.id === 'tr' ? 5 : 8, .45, Math.PI);
    }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * .62, w, 10);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, h * .62 + 10, w, 4);
    const nx = w * .42, ny = h * .44;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(nx, ny, 104, 0, 7); g.fill();
    g.lineWidth = 12; g.strokeStyle = '#111'; g.stroke();
    g.fillStyle = '#111'; g.font = '150px "Russo One", Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(number), nx, ny + 8);
    const sill = g.createLinearGradient(0, h * .8, 0, h); sill.addColorStop(0, 'rgba(0,0,0,0)'); sill.addColorStop(1, 'rgba(0,0,0,.7)');
    g.fillStyle = sill; g.fillRect(0, h * .76, w, h * .24);
  });
}
// Единая проекция ливреи на кузов и крышу: полосы флага идут по всей машине
const UV_BOX = { x0: -2.5, x1: 2.55, y0: .28, y1: 1.42 };
function planarUV(geo, box = UV_BOX) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - box.x0) / (box.x1 - box.x0);
    uv[i * 2 + 1] = (p.getY(i) - box.y0) / (box.y1 - box.y0);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const extrude = (shape, depth, bevel = .08) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
};
const MAT = {
  carbon: new THREE.MeshStandardMaterial({ color: '#111318', metalness: .4, roughness: .45 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#0b1522', metalness: .6, roughness: .04, clearcoat: 1, envMapIntensity: 2 }),
  tire: new THREE.MeshStandardMaterial({ color: '#121212', roughness: .9 }),
  rim: new THREE.MeshStandardMaterial({ color: '#dfe4ec', metalness: 1, roughness: .18 }),
  caliper: new THREE.MeshStandardMaterial({ color: '#d4141e', roughness: .4 }),
  head: new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d8', emissiveIntensity: 7 }),
  tail: new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1010', emissiveIntensity: 6 }),
};
const glowWhite = radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
const underGlow = radial('rgba(255,255,255,.9)', 'rgba(255,255,255,0)');

function buildCar(c, number) {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ map: livery(c, number), metalness: .15, roughness: .3, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.3 });
  // кузов
  const s = new THREE.Shape();
  s.moveTo(-2.4, .34); s.lineTo(-2.46, .74); s.quadraticCurveTo(-2.36, .88, -2.0, .9); s.lineTo(1.05, .9);
  s.quadraticCurveTo(2.02, .84, 2.4, .6); s.quadraticCurveTo(2.52, .45, 2.42, .34);
  s.lineTo(2.08, .34); s.absarc(1.56, .42, .56, 0, Math.PI, false); s.lineTo(-1.0, .34);
  s.absarc(-1.56, .42, .56, 0, Math.PI, false); s.lineTo(-2.4, .34);
  const bodyGeo = extrude(s, CAR_W - .2, .1); planarUV(bodyGeo);
  const shell = new THREE.Mesh(bodyGeo, paint); shell.castShadow = shell.receiveShadow = true; body.add(shell);
  // крыша в цвете ливреи
  const k = new THREE.Shape();
  k.moveTo(-1.3, .86); k.quadraticCurveTo(-.95, 1.34, -.38, 1.38); k.lineTo(.32, 1.38); k.quadraticCurveTo(.82, 1.32, 1.2, .86); k.lineTo(-1.3, .86);
  const cabGeo = extrude(k, CAR_W - .62, .1); planarUV(cabGeo);
  const cab = new THREE.Mesh(cabGeo, paint); cab.castShadow = true; body.add(cab);
  // боковые стёкла (чуть выступают из крыши)
  const wnd = new THREE.Shape();
  wnd.moveTo(-1.08, .95); wnd.quadraticCurveTo(-.82, 1.27, -.36, 1.29); wnd.lineTo(.3, 1.29); wnd.quadraticCurveTo(.72, 1.24, 1.0, .95); wnd.lineTo(-1.08, .95);
  const gd = CAR_W - .62 + .24;
  const glassGeo = new THREE.ExtrudeGeometry(wnd, { depth: gd, bevelEnabled: false, curveSegments: 16 }); glassGeo.translate(0, 0, -gd / 2);
  body.add(new THREE.Mesh(glassGeo, MAT.glass));
  // лобовое и заднее стекло
  for (const [x0, y0, x1, y1] of [[.32, 1.38, 1.2, .86], [-1.3, .86, -.38, 1.38]]) {
    const l = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(l * .92, CAR_W - .66), MAT.glass);
    g.rotation.order = 'ZXY'; g.rotation.z = ang; g.rotation.x = -Math.PI / 2;
    g.position.set((x0 + x1) / 2, (y0 + y1) / 2 + .1, 0);
    body.add(g);
  }
  // пороги, сплиттер, диффузор
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.95, .14, CAR_W + .02), MAT.carbon); skirt.position.set(0, .38, 0); body.add(skirt);
  const split = new THREE.Mesh(new THREE.BoxGeometry(.42, .06, CAR_W), MAT.carbon); split.position.set(2.32, .3, 0); body.add(split);
  const diff = new THREE.Mesh(new THREE.BoxGeometry(.3, .18, CAR_W - .2), MAT.carbon); diff.position.set(-2.42, .4, 0); body.add(diff);
  // антикрыло с боковинами
  const accent = (c.colors || ['#fff'])[0] === '#FFFFFF' ? '#0039A6' : (c.colors || ['#fff'])[0];
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.6, .07, CAR_W + .1), new THREE.MeshPhysicalMaterial({ color: accent, metalness: .3, roughness: .3, clearcoat: 1 }));
  wing.position.set(-2.18, 1.3, 0); wing.castShadow = true; body.add(wing);
  for (const z of [-(CAR_W + .1) / 2, (CAR_W + .1) / 2]) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(.66, .34, .04), MAT.carbon); ep.position.set(-2.18, 1.22, z); body.add(ep);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.08, .38, .08), MAT.carbon); post.position.set(-2.1, 1.06, z * .55); body.add(post);
  }
  for (const z of [-(CAR_W / 2 + .08), CAR_W / 2 + .08]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.22, .12, .14), MAT.carbon); m.position.set(.95, 1.0, z); body.add(m); }
  // фары и стопы (светятся)
  for (const z of [-.62, .62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(.22, .1, .42), MAT.head); hl.position.set(2.33, .66, z); hl.rotation.z = -.5; body.add(hl);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowWhite, color: '#fff2cc', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
    sp.scale.set(1.2, 1.2, 1); sp.position.set(2.5, .66, z); body.add(sp);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.06, .1, CAR_W - .5), MAT.tail); tail.position.set(-2.47, .78, 0); body.add(tail);
  // колёса: шина со скруглённой боковиной, диск со спицами, суппорт
  const wheels = [];
  for (const x of [-1.56, 1.56]) for (const side of [-1, 1]) {
    const wgrp = new THREE.Group(); wgrp.position.set(x, .46, side * (CAR_W / 2 - .12));
    const spin = new THREE.Group(); wgrp.add(spin);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .34, 32), MAT.tire); t.rotation.x = Math.PI / 2; t.castShadow = true; spin.add(t);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(.4, .07, 10, 32), MAT.tire); tor.position.z = side * .17; spin.add(tor);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .05, 28), MAT.rim); disc.rotation.x = Math.PI / 2; disc.position.z = side * .16; spin.add(disc);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.07, .5, .04), MAT.rim); sp.rotation.z = i * Math.PI / 6; sp.position.z = side * .19; spin.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .08, 12), MAT.carbon); hub.rotation.x = Math.PI / 2; hub.position.z = side * .21; spin.add(hub);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(.18, .26, .08), MAT.caliper); cal.position.set(.12, .1, side * .12); wgrp.add(cal);
    group.add(wgrp); wheels.push(spin);
  }
  // подсветка днища цветом команды
  const under = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), new THREE.MeshBasicMaterial({ map: underGlow, color: c.car || '#fff', transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }));
  under.rotation.x = -Math.PI / 2; under.position.y = .02; group.add(under);
  return { group, body, wheels };
}

// Модель Kenney Car Kit (если положена в папку) — кузов перекрашивается в ливрею флага
let kenney = null;
fetch('/race/assets/kenney/race.glb', { method: 'HEAD' }).then(r => {
  if (r.ok) new GLTFLoader().load('/race/assets/kenney/race.glb', gltf => { kenney = gltf.scene; rebuildCars(); }, undefined, () => {});
}).catch(() => {});
function buildKenney(c, number) {
  const group = new THREE.Group(), body = kenney.clone(true);
  const box = new THREE.Box3().setFromObject(body), size = box.getSize(new THREE.Vector3());
  if (size.z > size.x) body.rotation.y = Math.PI / 2;
  const scale = CAR_LEN / Math.max(size.x, size.z);
  body.scale.setScalar(scale);
  body.position.y = -box.min.y * scale;
  const wheels = [];
  body.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (/wheel/i.test(o.name)) wheels.push(o);
    else if (/body/i.test(o.name) || /body/i.test(o.parent?.name)) {
      o.geometry = o.geometry.clone();
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      planarUV(o.geometry, { x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y });
      o.material = new THREE.MeshPhysicalMaterial({ map: livery(c, number), metalness: .15, roughness: .3, clearcoat: 1 });
    }
  });
  group.add(body);
  return { group, body, wheels, kenney: true };
}

const cars = new Map();
function rebuildCars() {
  for (const car of cars.values()) scene.remove(car.group);
  cars.clear();
  countries().forEach((c, i) => {
    let car;
    try { car = kenney ? buildKenney(c, i + 1) : buildCar(c, i + 1); } catch { car = buildCar(c, i + 1); }
    car.lane = i; car.id = c.id; car.spin = 0;
    scene.add(car.group);
    cars.set(c.id, car);
  });
}

// ---------- препятствия: шипы и масло ----------
const hazardGroup = new THREE.Group(); scene.add(hazardGroup);
let hazardKey = '';
function buildHazard(h) {
  hazardGroup.clear();
  const lane = R.laneOf(h.target);
  if (lane < 0 || h.pos == null) return;
  const x = frontX(h.pos) - .6, z = laneZ(lane) - LIFT;
  if (h.kind === 'oil') {
    const tex = canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(8,8,12,1)'); gr.addColorStop(.75, 'rgba(8,8,12,.95)'); gr.addColorStop(1, 'rgba(8,8,12,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, w / 2, w / 2, w / 2.6, .3, 0, 7); g.fill();
      const sheen = g.createLinearGradient(40, 60, 200, 200); sheen.addColorStop(0, 'rgba(255,60,200,.4)'); sheen.addColorStop(.5, 'rgba(60,220,255,.35)'); sheen.addColorStop(1, 'rgba(255,230,60,.3)');
      g.fillStyle = sheen; g.beginPath(); g.ellipse(w / 2 - 10, w / 2 - 6, w / 3, w / 5, .3, 0, 7); g.fill();
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, LANE_W * .8), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: .03, metalness: .3, clearcoat: 1, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .02, z); hazardGroup.add(m);
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, LANE_W * .82), new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: .6, roughness: .4 }));
    base.position.set(x, .04, z); base.castShadow = true; hazardGroup.add(base);
    const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(.12, .44, 6), new THREE.MeshStandardMaterial({ color: '#e6e9ef', metalness: 1, roughness: .15 }), 34);
    const mm = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 17; i++) for (const dx of [-.18, .18]) { mm.makeTranslation(x + dx, .3, z - LANE_W * .38 + i * LANE_W * .76 / 16); spikes.setMatrixAt(k++, mm); }
    spikes.castShadow = true; hazardGroup.add(spikes);
  }
  for (const dz of [-LANE_W * .46, LANE_W * .46]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.28, .8, 14), new THREE.MeshStandardMaterial({ color: '#ff7a10', emissive: '#ff5a00', emissiveIntensity: .6, roughness: .5 }));
    cone.position.set(x, .4, z + dz); cone.castShadow = true; hazardGroup.add(cone);
  }
}

// ---------- кадр ----------
const frontX = pos => (startX + CAR_LEN) + Math.max(0, Math.min(1.02, pos / (R.state?.length || 1000))) * (finishX - startX - CAR_LEN);
let builtKey = '';
const v3 = new THREE.Vector3();
const m4 = new THREE.Matrix4();
// Авто-качество: если кадров мало, сначала выключаем свечение, потом мягкие тени
const quality = { level: 2, frames: 0, t: performance.now() };
function adaptQuality(now) {
  quality.frames++;
  if (now - quality.t < 3000) return;
  const fps = quality.frames * 1000 / (now - quality.t);
  quality.frames = 0; quality.t = now;
  if (fps < 45 && quality.level > 0 && !navigator.webdriver) {
    quality.level--;
    if (quality.level === 1) bloom.enabled = false;
    if (quality.level === 0) { renderer.shadowMap.type = THREE.BasicShadowMap; key.shadow.mapSize.set(1024, 1024); key.shadow.map?.dispose(); key.shadow.map = null; }
    R.report?.(`3D: мало кадров (${Math.round(fps)}), упрощаю графику до уровня ${quality.level}`);
  }
}

function update(dt, now) {
  const st = R.state;
  const keyC = countries().map(c => c.id).join();
  if (keyC && keyC !== builtKey) { builtKey = keyC; buildFlags(); rebuildCars(); }
  const t = now / 1000;
  if (st) for (const c of st.cars) {
    const car = cars.get(c.id), disp = R.cars.get(c.id);
    if (!car || !disp) continue;
    const x = frontX(disp.disp) - CAR_LEN / 2, z = laneZ(car.lane) - LIFT;
    let jx = 0, jz = 0;
    if (c.stun || c.back) { jx = Math.sin(t * 60) * .05; jz = Math.cos(t * 47) * .04; }
    car.group.position.set(x + jx, 0, z + jz);
    car.spin = c.spin ? car.spin + dt * 9 : car.spin * Math.exp(-dt * 8);
    car.group.rotation.y = c.spin ? car.spin : Math.sin(car.spin) * .3;
    const accel = (disp.speed || 0) - (car.lastSpeed || 0); car.lastSpeed = disp.speed || 0;
    car.pitch = (car.pitch || 0) + ((-accel * .0025) - (car.pitch || 0)) * Math.min(1, dt * 6);
    car.body.rotation.z = Math.max(-.07, Math.min(.07, car.pitch)) + Math.sin(t * 7 + car.lane) * .004;
    car.body.rotation.x = Math.sin(t * 5.3 + car.lane * 1.7) * .012;
    car.body.position.y = Math.abs(Math.sin(t * 11 + car.lane)) * .015;
    const ang = -(disp.disp || 0) * .07;
    for (const w of car.wheels) { if (car.kenney) w.rotation.x = ang; else w.rotation.z = ang; }
  }
  const lead = st && st.phase !== 'countdown' ? [...R.cars.values()].sort((a, b) => b.disp - a.disp)[0]?.id : null;
  laneGlow.forEach((m, i) => {
    const c = countries()[i];
    const target = c && c.id === lead ? .3 : 0;
    m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 4);
    if (c) m.material.color.set(c.colors[0] === '#FFFFFF' ? '#ffd45a' : c.colors[0]);
  });
  const h = st?.hazard;
  const hk = h && h.state === 'on' ? `${h.target}${h.kind}${h.pos}` : '';
  if (hk !== hazardKey) { hazardKey = hk; if (hk) buildHazard(h); else hazardGroup.clear(); }
  // болельщики: волна по трибунам, в финале прыгают выше
  if (crowd.body) {
    const hype = st?.final ? 2 : 1;
    for (let i = (Math.floor(t * 60) % 2); i < crowd.base.length; i += 2) {
      const b = crowd.base[i];
      const wave = Math.max(0, Math.sin(b.x * .35 - t * 3.2)) ** 6 * .5;
      const y = b.y + Math.max(0, Math.sin(t * 6 * hype + b.phase)) * b.amp * hype + wave;
      m4.makeTranslation(b.x, y, b.z); crowd.body.setMatrixAt(i, m4);
      m4.makeTranslation(b.x, y + .42, b.z); crowd.head.setMatrixAt(i, m4);
    }
    crowd.body.instanceMatrix.needsUpdate = true; crowd.head.instanceMatrix.needsUpdate = true;
    crowd.ad.offset.x = (t * .02) % 1;
  }
  for (const f of flags) {
    const p = f.geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const bx = f.base[i * 3], by = f.base[i * 3 + 1], k = bx / 2.6;
      p.setZ(i, Math.sin(bx * 2.2 - t * 6 + f.phase) * .24 * k);
      p.setY(i, by + Math.sin(bx * 1.6 - t * 5 + f.phase) * .06 * k);
    }
    p.needsUpdate = true;
  }
  // камера: на фотофинише приближает финиш
  const z = R.camera.zoom;
  camera.zoom = z;
  camera.position.copy(camBase).addScaledVector(camRight, (R.camera.x - W / 2) * (1 - 1 / z) / PX).addScaledVector(camUp, -(R.camera.y - H / 2) * (1 - 1 / z) / PX);
  camera.updateProjectionMatrix();
  if (bloom.enabled) composer.render(dt); else renderer.render(scene, camera);
  adaptQuality(now);
}

function project(x, y, z) {
  v3.set(x, y, z).project(camera);
  return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H };
}
function carRect(id) {
  const car = cars.get(id), disp = R.cars.get(id);
  if (!car || !disp) return null;
  const fx = frontX(disp.disp), z = car.group.position.z;
  const a = project(fx - CAR_LEN, 0, z + CAR_W / 2), b = project(fx, 1.4, z - CAR_W / 2), mid = project(fx - CAR_LEN / 2, .65, z);
  const ex = project(fx - CAR_LEN - .05, .45, z + CAR_W / 2);
  return { x: a.x, y: b.y, w: b.x - a.x, h: a.y - b.y, front: b.x, mid: mid.y, cx: mid.x, exX: ex.x, exY: ex.y, car: disp };
}

window.Race3D = {
  update, carRect, rebuildCars,
  onFonts() { fontWord.redraw(); drawAd(crowd.ad.image.getContext('2d'), 2048, 64); crowd.ad.needsUpdate = true; rebuildCars(); },
};
window.dispatchEvent(new Event('race3d'));
