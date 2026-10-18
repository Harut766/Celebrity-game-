// 3D-сцена «Гонки Наций» (Three.js): ночной стадион, трасса, машины в ливреях флагов.
// Камера ортографическая сбоку-сверху: все 6 дорожек одинаковой высоты на экране и совпадают с разметкой HUD.
// Если в public/race/assets/kenney/ лежит race.glb из Kenney Car Kit (CC0) — используется эта модель.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const R = window.Race;
const W = 1080, H = 1920;
const PX = 40;                       // пикселей экрана на метр
const THETA = 30 * Math.PI / 180;    // наклон камеры: сбоку-сверху, чтобы видна была ливрея на борту
const SIN = Math.sin(THETA), COS = Math.cos(THETA);
const CAR_LEN = 4.6, CAR_W = 1.9;
const START_SX = 222, FINISH_SX = 900; // старт и финиш на экране (px)
const startX = (START_SX - W / 2) / PX, finishX = (FINISH_SX - W / 2) / PX;
// Земля (y=0) ↔ экран: sy = H/2 + z·sinθ·PX  →  z = (sy − H/2) / (sinθ·PX)
const zOfScreen = sy => (sy - H / 2) / (SIN * PX);
const laneZ = i => zOfScreen(R.laneMid(i)) + .62 * COS / SIN; // машина визуально по центру дорожки
const LANE_W = R.LANE_H / (SIN * PX);

const canvas = document.getElementById('scene3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .55;

const camera = new THREE.OrthographicCamera(-W / 2 / PX, W / 2 / PX, H / 2 / PX, -H / 2 / PX, .1, 600);
const camBase = new THREE.Vector3(0, 200 * SIN, 200 * COS);
camera.position.copy(camBase);
camera.lookAt(0, 0, 0);
const camRight = new THREE.Vector3(1, 0, 0), camUp = new THREE.Vector3(0, COS, -SIN);

// ---------- текстуры, нарисованные кодом ----------
function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 4;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);

// Небо: ночной градиент со звёздами и дымкой от прожекторов
scene.background = canvasTex(64, 1024, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#04050d'); gr.addColorStop(.18, '#0b1030'); gr.addColorStop(.32, '#1a2350'); gr.addColorStop(1, '#090b18');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

// ---------- свет ----------
scene.add(new THREE.HemisphereLight('#5a70c8', '#0c0a08', .22));
const sun = new THREE.DirectionalLight('#fff1dc', 2.2);
sun.position.set(-14, 26, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 24, bottom: -24, near: 1, far: 80 });
sun.shadow.bias = -.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight('#6a8cff', .45);
fill.position.set(18, 14, 30);
scene.add(fill);

// ---------- трасса ----------
const zTop = laneZ(0) - LANE_W / 2 - .62 * COS / SIN, zBot = laneZ(5) + LANE_W / 2 - .62 * COS / SIN;
const trackMid = (zTop + zBot) / 2, trackW = zBot - zTop;

const asphalt = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#17191e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) { const v = rnd(14, 70); g.fillStyle = `rgba(${v},${v},${v + 6},${rnd(.15, .5)})`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 2.5), rnd(1, 2.5)); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(0,0,0,${rnd(.05, .15)})`; g.lineWidth = rnd(1, 3); g.beginPath(); g.moveTo(rnd(0, w), rnd(0, h)); g.lineTo(rnd(0, w), rnd(0, h)); g.stroke(); }
}, { repeat: [10, 4] });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: '#10141c', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true;
scene.add(ground);
const track = new THREE.Mesh(new THREE.PlaneGeometry(90, trackW + 1.2), new THREE.MeshStandardMaterial({ map: asphalt, roughness: .86, metalness: .05 }));
track.rotation.x = -Math.PI / 2; track.position.set(0, 0, trackMid); track.receiveShadow = true;
scene.add(track);

// Подсветка дорожки лидера
const laneGlow = [];
const glowTex = canvasTex(256, 8, (g, w) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, 8); });
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(finishX - startX, LANE_W * .92), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((startX + finishX) / 2, .015, laneZ(i) - .62 * COS / SIN);
  scene.add(m); laneGlow.push(m);
}

// Разметка: пунктир между дорожками
{
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, .14), new THREE.MeshStandardMaterial({ color: '#e8ecf4', roughness: .6 }), 5 * 34);
  let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 1; i < 6; i++) for (let x = -30; x < 38; x += 2.2) { m4.compose(new THREE.Vector3(x, .01, zTop + i * LANE_W), q, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(k++, m4); }
  dash.count = k; dash.receiveShadow = true; scene.add(dash);
}
// Бордюры красно-белые по краям трассы
{
  const n = 70;
  const kerb = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, .14, .7), new THREE.MeshStandardMaterial({ roughness: .5 }), n * 2);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (const z of [zTop - .35, zBot + .35]) for (let i = 0; i < n; i++) {
    m4.makeTranslation(-42 + i * 1.2, .07, z); kerb.setMatrixAt(k, m4);
    kerb.setColorAt(k++, new THREE.Color(i % 2 ? '#f2f2f2' : '#d4141e'));
  }
  kerb.receiveShadow = kerb.castShadow = true; scene.add(kerb);
}
// Старт и финиш на асфальте
{
  const start = new THREE.Mesh(new THREE.PlaneGeometry(.3, trackW), new THREE.MeshStandardMaterial({ color: '#fff', roughness: .5 }));
  start.rotation.x = -Math.PI / 2; start.position.set(startX, .012, trackMid); scene.add(start);
  const checker = canvasTex(64, 512, (g, w, h) => { const s = 32; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = ((x + y) / s) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x, y, s, s); } });
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(1, trackW), new THREE.MeshStandardMaterial({ map: checker, roughness: .5 }));
  fin.rotation.x = -Math.PI / 2; fin.position.set(finishX + .5, .012, trackMid); fin.receiveShadow = true; scene.add(fin);
}

// ---------- финишная арка ----------
{
  const metal = new THREE.MeshStandardMaterial({ color: '#c9ced8', metalness: .8, roughness: .3 });
  const red = new THREE.MeshStandardMaterial({ color: '#d4141e', metalness: .3, roughness: .4 });
  const x = finishX + .5, hgt = 3.8;
  for (const z of [zTop - 1.4, zBot + 1.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.7, hgt, .7), red);
    post.position.set(x, hgt / 2, z); post.castShadow = true; scene.add(post);
  }
  const checker = canvasTex(1024, 64, (g, w, h) => { const s = 32; for (let y = 0; y < h; y += s) for (let xx = 0; xx < w; xx += s) { g.fillStyle = ((xx + y) / s) % 2 ? '#111' : '#f4f4f4'; g.fillRect(xx, y, s, s); } });
  const chk = new THREE.MeshStandardMaterial({ map: checker, roughness: .5, emissive: '#222', emissiveMap: checker });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, zBot - zTop + 3.5), chk);
  beam.position.set(x, hgt, trackMid); beam.castShadow = true; scene.add(beam);
  // Надпись «ФИНИШ» на асфальте за финишной чертой (читается сверху вниз)
  const word = canvasTex(160, 1024, (g, w, h) => {
    g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
    g.font = '120px "Russo One", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('ФИНИШ', 0, 6);
    g.fillStyle = '#ffd23a'; g.fillText('ФИНИШ', 0, 6);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.25, trackW * .8), new THREE.MeshStandardMaterial({ map: word, transparent: true, roughness: .6, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(finishX + 1.9, .014, trackMid); scene.add(floor);
  R.on3dFonts = () => {
    const g = word.image.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 160, 1024);
    g.translate(80, 512); g.rotate(-Math.PI / 2); g.font = '120px "Russo One", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText('ФИНИШ', 0, 6); g.fillStyle = '#ffd23a'; g.fillText('ФИНИШ', 0, 6);
    word.needsUpdate = true;
  };
}
// Пятна света от прожекторов на асфальте
{
  const pool = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,210,.55)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  for (const [x, z] of [[-9, -.3], [0, .25], [9, -.1], [-4.5, .5], [4.5, -.4]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(16, trackW * 1.1), new THREE.MeshBasicMaterial({ map: pool, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .016, trackMid + z * trackW / 2); scene.add(m);
  }
}

// ---------- стадион: трибуны, болельщики, прожекторы, флаги ----------
const countries = () => R.view?.countries || [];
const crowdColors = ['#00AFCA', '#FEC50C', '#FFFFFF', '#0039A6', '#D52B1E', '#0057B7', '#FFD700', '#D90012', '#0033A0', '#F2A800', '#0092BC', '#E4002B', '#00AF66', '#E30A17', '#2a2f45', '#3a3f55'];
let crowd = null; const crowdBase = [];
{
  const stepMat = new THREE.MeshStandardMaterial({ color: '#23283a', roughness: .9 });
  const rows = 7, len = 80;
  const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.22, .45, 2, 6), new THREE.MeshStandardMaterial({ roughness: .8 }), 6400);
  let k = 0; const m4 = new THREE.Matrix4();
  const addStand = (z0, dir) => {
    for (let r = 0; r < rows; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(len, .9 + r * .9, 1.4), stepMat);
      const z = z0 + dir * (r * 1.4 + .7), y = (.9 + r * .9) / 2;
      step.position.set(0, y, z); step.receiveShadow = true; scene.add(step);
      for (let x = -len / 2 + .5; x < len / 2; x += .62) {
        if (Math.random() < .12 || k >= 6400) continue;
        const pos = new THREE.Vector3(x + rnd(-.1, .1), .9 + r * .9 + .45, z + rnd(-.2, .2));
        crowdBase.push({ pos, phase: rnd(0, 6.3), amp: rnd(.02, .14) });
        m4.makeTranslation(pos.x, pos.y, pos.z); people.setMatrixAt(k, m4);
        people.setColorAt(k++, new THREE.Color(crowdColors[Math.floor(Math.random() * crowdColors.length)]));
      }
    }
  };
  addStand(zTop - 3.2, -1);   // дальняя трибуна (над трассой на экране)
  // ближняя сторона — болельщики на ровных террасах (видны внизу кадра, в зоне чата: просто декор)
  for (let r = 0; r < 36; r++) {
    const z = zBot + 3.2 + r * 1.25;
    for (let x = -len / 2 + .5; x < len / 2; x += .66) {
      if (Math.random() < .2 || k >= 6400) continue;
      const pos = new THREE.Vector3(x + rnd(-.1, .1), .45, z + rnd(-.2, .2));
      crowdBase.push({ pos, phase: rnd(0, 6.3), amp: rnd(.02, .14) });
      m4.makeTranslation(pos.x, pos.y, pos.z); people.setMatrixAt(k, m4);
      people.setColorAt(k++, new THREE.Color(crowdColors[Math.floor(Math.random() * crowdColors.length)]));
    }
  }
  people.count = k; crowd = people; scene.add(people);
  // ограждения вдоль трассы
  const wallMat = new THREE.MeshStandardMaterial({ color: '#1b2036', roughness: .6 });
  for (const z of [zTop - 1.9, zBot + 2]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 1, .3), wallMat); wall.position.set(0, .5, z); wall.castShadow = true; scene.add(wall); }
  const adTex = canvasTex(1024, 64, (g, w, h) => { const cs = ['#d4141e', '#ffd23a', '#1e8bff', '#1fbf5a']; for (let i = 0; i < 16; i++) { g.fillStyle = cs[i % 4]; g.fillRect(i * 64, 0, 64, h); } g.fillStyle = '#fff'; g.font = '40px "Russo One", Arial'; g.textBaseline = 'middle'; for (let i = 0; i < 4; i++) g.fillText('ГОНКА НАЦИЙ', 30 + i * 256, h / 2); }, { repeat: [3, 1] });
  const ad = new THREE.Mesh(new THREE.PlaneGeometry(90, .55), new THREE.MeshBasicMaterial({ map: adTex, toneMapped: false }));
  ad.position.set(0, .6, zTop - 1.73); scene.add(ad);
  R.on3dAds = () => { adTex.needsUpdate = true; };
}
// Прожекторы на мачтах
const glowSprite = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(220,235,255,.8)'); gr.addColorStop(1, 'rgba(160,190,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
for (const x of [-15, 0, 15]) {
  const z = zTop - 13;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 18, 8), new THREE.MeshStandardMaterial({ color: '#3a4058', metalness: .6, roughness: .4 }));
  mast.position.set(x, 9, z); scene.add(mast);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(4, 2, .3), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#e8f0ff', emissiveIntensity: 2 }));
  panel.position.set(x, 18.5, z); scene.add(panel);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 }));
  s.scale.set(16, 16, 1); s.position.set(x, 18.5, z + .5); scene.add(s);
}
// Флаги шести стран машут над дальней трибуной
const flags = [];
function buildFlags() {
  flags.forEach(f => scene.remove(f.group)); flags.length = 0;
  const list = countries();
  list.forEach((c, i) => {
    for (const side of [-1, 1]) {
      const x = side * (6 + i * 4.4) - (side < 0 ? 0 : 0);
      const group = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 5, 6), new THREE.MeshStandardMaterial({ color: '#ccd', metalness: .8, roughness: .3 }));
      pole.position.y = 2.5; group.add(pole);
      const tex = canvasTex(192, 128, (g, w, h) => window.RaceArt.drawFlag(g, c.id, 0, 0, w, h, { radius: 0 }));
      const geo = new THREE.PlaneGeometry(2.4, 1.6, 16, 6);
      geo.translate(1.2, 0, 0);
      const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .7 }));
      flag.position.y = 4.1; flag.quaternion.copy(camera.quaternion);
      group.add(flag);
      group.position.set(x, 7.2, zTop - 3.2 - 9.4);
      scene.add(group);
      flags.push({ group, geo, base: geo.attributes.position.array.slice(), phase: i + (side > 0 ? 3 : 0) });
    }
  });
  // Клетчатый флаг на ближней стойке финишной арки
  const tex = canvasTex(192, 128, (g, w, h) => { const s = 32; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = ((x + y) / s) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x, y, s, s); } });
  const geo = new THREE.PlaneGeometry(2.4, 1.6, 16, 6); geo.translate(1.2, 0, 0);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .7 }));
  flag.quaternion.copy(camera.quaternion);
  const group = new THREE.Group(); group.add(flag);
  group.position.set(finishX + .9, 3.4, zBot + 1.4);
  scene.add(group);
  flags.push({ group, geo, base: geo.attributes.position.array.slice(), phase: 9 });
}

// ---------- машины ----------
const liveryCache = new Map();
function livery(c, number) {
  return canvasTex(1024, 512, (g, w, h) => {
    const cols = c.colors || ['#888'];
    // Полосы флага по всему кузову; эмблемы стран с солнцем/полумесяцем — на передней двери
    if (c.id === 'kz' || c.id === 'tr') { g.fillStyle = c.id === 'kz' ? '#00AFCA' : '#E30A17'; g.fillRect(0, 0, w, h); }
    else cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, h * i / cols.length, w, h / cols.length + 1); });
    const ex = w * .66, ey = h * .46;
    if (c.id === 'kz') {
      g.fillStyle = '#FEC50C';
      for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; g.beginPath(); g.moveTo(ex + Math.cos(a) * 62, ey + Math.sin(a) * 62); g.lineTo(ex + Math.cos(a + .1) * 92, ey + Math.sin(a + .1) * 92); g.lineTo(ex + Math.cos(a - .1) * 92, ey + Math.sin(a - .1) * 92); g.fill(); }
      g.beginPath(); g.arc(ex, ey, 52, 0, 7); g.fill();
      for (let y = 20; y < h - 20; y += 52) g.fillRect(w * .05, y, 26, 30);
    }
    if (c.id === 'tr' || c.id === 'az') {
      const r = c.id === 'tr' ? 90 : 62, bg = c.id === 'tr' ? '#E30A17' : '#E4002B';
      const cx = c.id === 'tr' ? ex - 30 : ex - 20, cy = c.id === 'tr' ? ey : h / 2;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.fillStyle = bg; g.beginPath(); g.arc(cx + r * .28, cy, r * .8, 0, 7); g.fill();
      g.fillStyle = '#fff'; window.RaceArt.star(g, cx + r * 1.15, cy, r * .42, c.id === 'tr' ? 5 : 8, .45, Math.PI);
    }
    // Номер на двери
    const nx = w * .34, ny = h * .5;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(nx, ny, 118, 0, 7); g.fill();
    g.lineWidth = 12; g.strokeStyle = '#111'; g.stroke();
    g.fillStyle = '#111'; g.font = '170px "Russo One", Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(number), nx, ny + 8);
    // Тёмный порог снизу и тонкая линия по кромке крыши
    const sill = g.createLinearGradient(0, h * .82, 0, h); sill.addColorStop(0, 'rgba(0,0,0,0)'); sill.addColorStop(1, 'rgba(0,0,0,.65)');
    g.fillStyle = sill; g.fillRect(0, h * .78, w, h * .22);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * .05, w, 6);
  });
}

function planarUV(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - b.min.x) / (b.max.x - b.min.x);
    uv[i * 2 + 1] = (p.getY(i) - b.min.y) / (b.max.y - b.min.y);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Процедурная машина: кузов-экструзия по боковому профилю, стеклянная кабина, колёса со спицами, антикрыло
function buildCar(c, number) {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const s = new THREE.Shape();
  s.moveTo(-2.3, .3); s.lineTo(-2.36, .78); s.quadraticCurveTo(-2.1, .86, -1.6, .86); s.lineTo(1.0, .86);
  s.quadraticCurveTo(1.9, .8, 2.3, .58); s.quadraticCurveTo(2.42, .45, 2.3, .3);
  s.lineTo(1.95, .3); s.absarc(1.45, .38, .52, 0, Math.PI, false); s.lineTo(-.95, .3);
  s.absarc(-1.45, .38, .52, 0, Math.PI, false); s.lineTo(-2.3, .3);
  const depth = CAR_W - .16;
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 3, curveSegments: 14 });
  geo.translate(0, 0, -depth / 2);
  planarUV(geo);
  const paint = new THREE.MeshPhysicalMaterial({ map: livery(c, number), metalness: .1, roughness: .38, clearcoat: 1, clearcoatRoughness: .06 });
  const shell = new THREE.Mesh(geo, paint); shell.castShadow = true; shell.receiveShadow = true; body.add(shell);
  // кабина
  const k = new THREE.Shape();
  k.moveTo(-1.25, .82); k.quadraticCurveTo(-.85, 1.24, -.4, 1.26); k.lineTo(.3, 1.26); k.quadraticCurveTo(.75, 1.2, 1.1, .82); k.lineTo(-1.25, .82);
  const kd = depth - .34;
  const kgeo = new THREE.ExtrudeGeometry(k, { depth: kd, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2 });
  kgeo.translate(0, 0, -kd / 2);
  const glass = new THREE.Mesh(kgeo, new THREE.MeshPhysicalMaterial({ color: '#2a4a6e', metalness: .7, roughness: .08, clearcoat: 1, envMapIntensity: 1.6 }));
  glass.castShadow = true; body.add(glass);
  // антикрыло
  const dark = new THREE.MeshStandardMaterial({ color: '#15171d', metalness: .5, roughness: .4 });
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.42, .07, CAR_W), new THREE.MeshPhysicalMaterial({ color: (c.colors || ['#fff'])[0], metalness: .3, roughness: .35, clearcoat: 1 }));
  wing.position.set(-2.08, 1.16, 0); wing.castShadow = true; body.add(wing);
  for (const z of [-.6, .6]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.08, .32, .08), dark); post.position.set(-2.05, .98, z); body.add(post); }
  // фары и стопы
  for (const z of [-.62, .62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(.08, .12, .32), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6d0', emissiveIntensity: 2.5 }));
    hl.position.set(2.33, .55, z); body.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(.06, .12, .36), new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 2 }));
    tl.position.set(-2.38, .7, z); body.add(tl);
  }
  // колёса
  const wheels = [];
  const tire = new THREE.MeshStandardMaterial({ color: '#141414', roughness: .85 });
  const rim = new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: .95, roughness: .2 });
  for (const x of [-1.45, 1.45]) for (const z of [-CAR_W / 2 + .14, CAR_W / 2 - .14]) {
    const wgrp = new THREE.Group(); wgrp.position.set(x, .42, z);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .32, 26), tire); t.rotation.x = Math.PI / 2; t.castShadow = true; wgrp.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .34, 20), rim); r.rotation.x = Math.PI / 2; wgrp.add(r);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.06, .46, .02), dark); sp.rotation.z = i * Math.PI / 5; sp.position.z = Math.sign(z) * .175; wgrp.add(sp); }
    group.add(wgrp); wheels.push(wgrp);
  }
  return { group, body, wheels };
}

// Модель Kenney Car Kit (если положена в папку) — перекрашиваем кузов в ливрею флага
let kenney = null;
fetch('/race/assets/kenney/race.glb', { method: 'HEAD' }).then(r => {
  if (r.ok) new GLTFLoader().load('/race/assets/kenney/race.glb', gltf => { kenney = gltf.scene; rebuildCars(); }, undefined, () => {});
}).catch(() => {});
function buildKenney(c, number) {
  const group = new THREE.Group(), body = kenney.clone(true);
  const box = new THREE.Box3().setFromObject(body), size = box.getSize(new THREE.Vector3());
  const lenAxis = size.x >= size.z ? 'x' : 'z';
  if (lenAxis === 'z') body.rotation.y = Math.PI / 2;
  const scale = CAR_LEN / Math.max(size.x, size.z);
  body.scale.setScalar(scale);
  body.position.y = -box.min.y * scale;
  const wheels = [];
  body.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (/wheel/i.test(o.name)) wheels.push(o);
    else if (/body/i.test(o.name) || /body/i.test(o.parent?.name)) {
      o.geometry = o.geometry.clone(); planarUV(o.geometry);
      o.material = new THREE.MeshPhysicalMaterial({ map: livery(c, number), metalness: .35, roughness: .32, clearcoat: 1 });
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
  const x = frontX(h.pos) - .6, z = laneZ(lane) - .62 * COS / SIN;
  if (h.kind === 'oil') {
    const tex = canvasTex(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(10,10,14,1)'); gr.addColorStop(.75, 'rgba(10,10,14,.95)'); gr.addColorStop(1, 'rgba(10,10,14,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, w / 2, w / 2, w / 2.6, .3, 0, 7); g.fill();
      const sheen = g.createLinearGradient(40, 60, 200, 200); sheen.addColorStop(0, 'rgba(255,60,200,.35)'); sheen.addColorStop(.5, 'rgba(60,220,255,.3)'); sheen.addColorStop(1, 'rgba(255,230,60,.25)');
      g.fillStyle = sheen; g.beginPath(); g.ellipse(w / 2 - 10, w / 2 - 6, w / 3, w / 5, .3, 0, 7); g.fill();
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, LANE_W * .8), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: .05, metalness: .2, clearcoat: 1, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .02, z); hazardGroup.add(m);
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, LANE_W * .82), new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: .6, roughness: .4 }));
    base.position.set(x, .04, z); base.castShadow = true; hazardGroup.add(base);
    const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(.12, .42, 6), new THREE.MeshStandardMaterial({ color: '#e6e9ef', metalness: 1, roughness: .2 }), 30);
    const m4 = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i < 15; i++) for (const dx of [-.18, .18]) { m4.makeTranslation(x + dx, .29, z - LANE_W * .38 + i * LANE_W * .76 / 14); spikes.setMatrixAt(k++, m4); }
    spikes.castShadow = true; hazardGroup.add(spikes);
    // жёлто-чёрные столбики по краям
    for (const dz of [-LANE_W * .46, LANE_W * .46]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.28, .8, 12), new THREE.MeshStandardMaterial({ color: '#ff8a1a', roughness: .5 }));
      cone.position.set(x, .4, z + dz); cone.castShadow = true; hazardGroup.add(cone);
    }
  }
}

// ---------- кадр ----------
const frontX = pos => (startX + CAR_LEN) + Math.max(0, Math.min(1.02, pos / (R.state?.length || 1000))) * (finishX - startX - CAR_LEN);
let flagsBuilt = '';
const v3 = new THREE.Vector3();
const cam = { zoom: 1, px: W / 2, py: H / 2 };

function update(dt, now) {
  const st = R.state;
  const key = countries().map(c => c.id).join();
  if (key && key !== flagsBuilt) { flagsBuilt = key; buildFlags(); rebuildCars(); }
  const t = now / 1000;
  // машины
  if (st) for (const c of st.cars) {
    const car = cars.get(c.id), disp = R.cars.get(c.id);
    if (!car || !disp) continue;
    const fx = frontX(disp.disp);
    const x = fx - CAR_LEN / 2, z = laneZ(car.lane) - .62 * COS / SIN;
    let jx = 0, jz = 0;
    if (c.stun || c.back) { jx = Math.sin(t * 60) * .05; jz = Math.cos(t * 47) * .04; }
    car.group.position.set(x + jx, 0, z + jz);
    // занос при «хаосе» и на масле
    car.spin = c.spin ? car.spin + dt * 9 : car.spin * Math.exp(-dt * 8);
    car.group.rotation.y = c.spin ? car.spin : Math.sin(car.spin) * .3;
    // покачивание кузова и «клевок» при разгоне
    const accel = (disp.speed || 0) - (car.lastSpeed || 0); car.lastSpeed = disp.speed || 0;
    car.pitch = (car.pitch || 0) + ((-accel * .002) - (car.pitch || 0)) * Math.min(1, dt * 6);
    car.body.rotation.z = Math.max(-.06, Math.min(.06, car.pitch)) + Math.sin(t * 7 + car.lane) * .004;
    car.body.rotation.x = Math.sin(t * 5.3 + car.lane * 1.7) * .012;
    car.body.position.y = Math.abs(Math.sin(t * 11 + car.lane)) * .015;
    const spinAngle = -(disp.disp || 0) * .06;
    for (const w of car.wheels) { if (car.kenney) w.rotation.x = spinAngle; else w.rotation.z = spinAngle; }
  }
  // подсветка дорожки лидера
  const lead = st && st.phase !== 'countdown' ? [...R.cars.values()].sort((a, b) => b.disp - a.disp)[0]?.id : null;
  laneGlow.forEach((m, i) => {
    const c = countries()[i];
    const target = c && c.id === lead ? .32 : 0;
    m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 4);
    if (c) m.material.color.set(c.id === 'ru' ? '#ffd45a' : c.colors[0] === '#FFFFFF' ? '#ffd45a' : c.colors[0]);
  });
  // препятствие
  const h = st?.hazard;
  const hk = h && h.state === 'on' ? `${h.target}${h.kind}${h.pos}` : '';
  if (hk !== hazardKey) { hazardKey = hk; if (hk) buildHazard(h); else hazardGroup.clear(); }
  // болельщики подпрыгивают (быстрее в финале)
  if (crowd) {
    const m4 = new THREE.Matrix4(), hype = st?.final ? 2.2 : 1;
    for (let i = (Math.floor(t * 60) % 2); i < crowdBase.length; i += 2) {
      const b = crowdBase[i];
      m4.makeTranslation(b.pos.x, b.pos.y + Math.max(0, Math.sin(t * 6 * hype + b.phase)) * b.amp * hype, b.pos.z);
      crowd.setMatrixAt(i, m4);
    }
    crowd.instanceMatrix.needsUpdate = true;
  }
  // флаги машут
  for (const f of flags) {
    const p = f.geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const bx = f.base[i * 3], by = f.base[i * 3 + 1];
      const k = bx / 2.4;
      p.setZ(i, Math.sin(bx * 2.2 - t * 6 + f.phase) * .22 * k);
      p.setY(i, by + Math.sin(bx * 1.6 - t * 5 + f.phase) * .06 * k);
    }
    p.needsUpdate = true;
  }
  // камера: на фотофинише приближает финиш
  const z = R.camera.zoom;
  camera.zoom = z;
  const dx = (R.camera.x - W / 2) * (1 - 1 / z) / PX, dy = -(R.camera.y - H / 2) * (1 - 1 / z) / PX;
  camera.position.copy(camBase).addScaledVector(camRight, dx).addScaledVector(camUp, dy);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

// Где машина на экране (для эффектов на 2D-слое)
function project(x, y, z) {
  v3.set(x, y, z).project(camera);
  return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H };
}
function carRect(id) {
  const car = cars.get(id), disp = R.cars.get(id);
  if (!car || !disp) return null;
  const fx = frontX(disp.disp), z = car.group.position.z;
  const a = project(fx - CAR_LEN, 0, z + CAR_W / 2), b = project(fx, 1.3, z - CAR_W / 2), mid = project(fx - CAR_LEN / 2, .6, z);
  const ex = project(fx - CAR_LEN - .05, .45, z + CAR_W / 2);
  return { x: a.x, y: b.y, w: b.x - a.x, h: a.y - b.y, front: b.x, mid: mid.y, cx: mid.x, exX: ex.x, exY: ex.y, car: disp };
}

window.Race3D = { update, carRect, rebuildCars, onFonts() { R.on3dFonts?.(); R.on3dAds?.(); liveryCache.clear(); rebuildCars(); } };
window.dispatchEvent(new Event('race3d'));
