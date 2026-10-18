// Рисунки «Гонки Наций»: флаги, машинки, трасса. Всё рисуется кодом — без файлов и эмодзи,
// чтобы одинаково выглядело на Mac, Windows и в LIVE Studio.
(function () {
  const TAU = Math.PI * 2;

  function star(g, cx, cy, r, points = 5, inner = .45, rot = -Math.PI / 2) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = rot + i * Math.PI / points;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }
  function crescent(g, cx, cy, r, bg, off = .28) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.fillStyle = bg; g.beginPath(); g.arc(cx + r * off, cy, r * .8, 0, TAU); g.fill();
  }
  const stripes = (g, w, h, colors) => colors.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, h * i / colors.length, w, h / colors.length + 1); });

  // Флаги в прямоугольнике w×h (пропорции 3:2, кроме Казахстана 2:1 — вписываем)
  const FLAGS = {
    kz(g, w, h) {
      g.fillStyle = '#00AFCA'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#FEC50C';
      const cx = w * .55, cy = h * .42, r = h * .17;
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2);
        g.lineTo(cx + Math.cos(a + .1) * r * 1.65, cy + Math.sin(a + .1) * r * 1.65);
        g.lineTo(cx + Math.cos(a - .1) * r * 1.65, cy + Math.sin(a - .1) * r * 1.65); g.fill();
      }
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
      // орёл — упрощённо, крылья дугой
      g.beginPath(); g.ellipse(cx, cy + r * 2.1, r * 1.6, r * .35, 0, 0, TAU); g.fill();
      // орнамент у древка
      for (let y = h * .08; y < h * .92; y += h * .14) { g.fillRect(w * .07, y, w * .05, h * .08); }
    },
    ru: (g, w, h) => stripes(g, w, h, ['#FFFFFF', '#0039A6', '#D52B1E']),
    ua: (g, w, h) => stripes(g, w, h, ['#0057B7', '#FFD700']),
    am: (g, w, h) => stripes(g, w, h, ['#D90012', '#0033A0', '#F2A800']),
    az(g, w, h) {
      stripes(g, w, h, ['#0092BC', '#E4002B', '#00AF66']);
      crescent(g, w * .47, h * .5, h * .15, '#E4002B', .3);
      g.fillStyle = '#fff'; star(g, w * .6, h * .5, h * .075, 8, .5);
    },
    tr(g, w, h) {
      g.fillStyle = '#E30A17'; g.fillRect(0, 0, w, h);
      crescent(g, w * .38, h * .5, h * .25, '#E30A17', .3);
      g.fillStyle = '#fff'; star(g, w * .56, h * .5, h * .11, 5, .4, Math.PI);
    },
  };

  /** Флаг на холсте: прямоугольник с лёгким глянцем и рамкой. */
  function drawFlag(g, id, x, y, w, h, { radius = 6, wave = 0 } = {}) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, w, h, radius); else g.rect(0, 0, w, h);
    g.clip();
    (FLAGS[id] || ((gg, ww, hh) => { gg.fillStyle = '#888'; gg.fillRect(0, 0, ww, hh); }))(g, w, h);
    const gl = g.createLinearGradient(0, 0, w, h);
    gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(.5 + wave * .1, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
    g.restore();
    g.save();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2;
    g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, radius); else g.rect(x, y, w, h); g.stroke();
    g.restore();
  }

  const flagCache = new Map();
  /** Флаг картинкой (для HTML): data:URL */
  function flagUrl(id, w = 60, h = 40) {
    const key = `${id}${w}x${h}`;
    if (!flagCache.has(key)) {
      const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
      const g = c.getContext('2d'); g.scale(2, 2);
      drawFlag(g, id, 1, 1, w - 2, h - 2, { radius: 4 });
      flagCache.set(key, c.toDataURL());
    }
    return flagCache.get(key);
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  /**
   * Машинка страны (вид сбоку, едет вправо) — рисуется один раз в отдельный холст.
   * Колёса рисуются отдельно (крутятся), окно кабины оставлено под аватар капитана.
   */
  const CAR = { w: 168, h: 76, wheelY: 60, wheels: [38, 128], wheelR: 15, cockpit: { x: 84, y: 22, r: 15 } };
  function carSprite(c, scale = 2) {
    const cv = document.createElement('canvas');
    cv.width = CAR.w * scale; cv.height = CAR.h * scale;
    const g = cv.getContext('2d');
    g.scale(scale, scale);
    const body = c.car, s1 = c.stripe, s2 = c.stripe2 || c.stripe;
    // тень
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(84, 72, 80, 6, 0, 0, TAU); g.fill();
    // кузов
    const path = new Path2D('M6 56 L6 44 Q8 34 22 31 L52 27 Q64 12 92 10 L112 10 Q126 11 136 24 L152 30 Q166 34 166 46 L166 56 Q160 60 150 60 L18 60 Q8 60 6 56 Z');
    const grad = g.createLinearGradient(0, 8, 0, 62);
    grad.addColorStop(0, shade(body, .35)); grad.addColorStop(.45, body); grad.addColorStop(1, shade(body, -.45));
    g.fillStyle = grad; g.fill(path);
    // полосы в цветах флага
    g.save(); g.clip(path);
    g.fillStyle = s1; g.fillRect(0, 38, 170, 6);
    g.fillStyle = s2; g.fillRect(0, 44, 170, 5);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 14, 170, 3);
    g.restore();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.7)'; g.stroke(path);
    // стекло
    const glass = new Path2D('M58 28 Q68 15 92 14 L110 14 Q122 15 130 26 Z');
    const gg = g.createLinearGradient(60, 14, 120, 30);
    gg.addColorStop(0, '#9fd8ff'); gg.addColorStop(.5, '#2a4a6a'); gg.addColorStop(1, '#0c1826');
    g.fillStyle = gg; g.fill(glass);
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke(glass);
    // спойлер и фары
    g.fillStyle = shade(body, -.55); g.fillRect(2, 24, 16, 5); g.fillRect(8, 28, 4, 8);
    g.fillStyle = '#fff6c0'; g.beginPath(); g.ellipse(160, 40, 5, 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff3a3a'; g.fillRect(6, 42, 5, 6);
    // ниши колёс
    g.fillStyle = '#111';
    for (const x of CAR.wheels) { g.beginPath(); g.arc(x, CAR.wheelY, CAR.wheelR + 3, Math.PI, TAU); g.fill(); }
    return cv;
  }

  function drawWheel(g, x, y, r, angle) {
    g.save(); g.translate(x, y); g.rotate(angle);
    g.fillStyle = '#151515'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = '#b8bec8'; g.beginPath(); g.arc(0, 0, r * .55, 0, TAU); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); g.stroke(); }
    g.restore();
  }

  window.RaceArt = { drawFlag, flagUrl, carSprite, drawWheel, CAR, shade, star };
})();
