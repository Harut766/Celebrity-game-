// Драма «Гонки Наций»: шипы и масло на дорожке лидера, фотофиниш, обгоны, подсказки, салют победителю.
(function () {
  const R = window.Race, F = window.RaceFx;
  const { ctx, rand, esc, flagImg, iconHtml, countryById, carRect, FONT } = R;

  // ---------- Шипы / масло: за 3 с крупное предупреждение, мигает дорожка лидера ----------
  const NAMES = { spikes: 'ШИПЫ', oil: 'МАСЛО' };
  let warn = null; // { target, until, kind }
  const warnIcon = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#ffc21a'; g.strokeStyle = '#000'; g.lineWidth = 7; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(48, 8); g.lineTo(90, 84); g.lineTo(6, 84); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#000'; g.fillRect(43, 32, 10, 30); g.fillRect(43, 68, 10, 10);
    return c;
  })();
  const warnHtml = `<img class="tic" src="${warnIcon.toDataURL()}" alt="">`;
  function hazardWarn(fx) {
    const c = countryById(fx.target);
    warn = { target: fx.target, kind: fx.hazard, until: performance.now() + (fx.sec || 3) * 1000 };
    F.banner(`<div class="big">${warnHtml} ${NAMES[fx.hazard] || 'ШИПЫ'} ВПЕРЕДИ!</div>
      <div class="sub">у ${c ? flagImg(c.id, 66, 44) : ''} ${esc(c?.name || '')} · нужен ${iconHtml('shield')} щит!</div>`, { color: '#ffb21a', ms: (fx.sec || 3) * 1000 - 300, priority: 5 });
    F.sound('hazardWarn');
  }
  function hazardHit(fx) {
    const r = carRect(fx.target);
    if (!r) return;
    if (fx.blocked) {
      F.burst(r.cx, r.mid, 26, { colors: ['#bff0ff', '#fff'] });
      F.emitOver({ type: 'ring', x: r.cx, y: r.mid, life: .6, size: 160, color: '#bff0ff' });
      F.sound('block');
      F.card(fx.target, { name: 'ЩИТ СПАС', avatar: '' }, 'ПРОЕХАЛ!', '#8fb4ff', 'shield');
      return;
    }
    if (fx.hazard === 'oil') {
      F.sound('skid');
      F.card(fx.target, { name: 'ЗАНОС', avatar: '' }, 'НА МАСЛЕ!', '#ffb21a');
    } else {
      F.burst(r.cx, r.mid + r.h * .3, 34, { colors: ['#ffe27a', '#fff', '#ff8a1a'], speed: 700 });
      for (let i = 0; i < 14; i++) F.emitUnder({ type: 'smoke', x: r.cx + rand(-30, 30), y: r.mid + r.h * .3, vx: rand(-80, 80), vy: rand(-110, -30), life: rand(.8, 1.4), size: rand(16, 28), drag: 1, light: true });
      F.sound('puncture');
      F.card(fx.target, { name: 'ПРОКОЛ', avatar: '' }, 'КОЛЕСО ПРОБИТО!', '#ff5a4a');
    }
    F.shake(false);
  }
  function drawWarn() {
    if (!warn || performance.now() > warn.until) return;
    const i = R.laneOf(warn.target);
    if (i < 0) return;
    ctx.save();
    ctx.globalAlpha = .55 + .45 * Math.sin(performance.now() / 90);
    ctx.strokeStyle = '#ffb21a'; ctx.lineWidth = 8; ctx.shadowColor = '#ff8a1a'; ctx.shadowBlur = 20;
    ctx.strokeRect(R.LABEL_W + 6, R.laneY(i) + 6, 1080 - R.LABEL_W - 12, R.LANE_H - 12);
    const r = carRect(warn.target);
    if (r) ctx.drawImage(warnIcon, Math.min(r.front + 30, 990), r.mid - 40, 80, 80);
    ctx.restore();
  }
  R.hooks.over.push(() => drawWarn());

  // ---------- Фотофиниш: камера приближает финиш ----------
  function photo(fx) {
    const a = carRect(fx.a), b = carRect(fx.b);
    if (!a || !b) return;
    R.camera.set({ zoom: 1.5, x: R.FINISH_X - 120, y: (a.mid + b.mid) / 2, sec: (fx.sec || 3) + .6 });
    F.banner(`<div class="big">ФОТОФИНИШ!</div><div class="sub">${flagImg(fx.a, 66, 44)} против ${flagImg(fx.b, 66, 44)}</div>`, { color: '#ffffff', ms: 2200, priority: 6 });
    F.sound('photo');
  }

  // ---------- Обгон лидера ----------
  let leader = null;
  R.hooks.over.push(() => {
    const st = R.state;
    if (!st || st.phase !== 'running') { leader = null; return; }
    const first = [...R.cars.values()].sort((a, b) => b.disp - a.disp)[0]?.id;
    if (leader && first && first !== leader) {
      const r = carRect(first);
      if (r) { F.burst(r.front, r.mid, 26, { colors: countryById(first)?.colors || ['#fff'] }); F.emitOver({ type: 'ring', x: r.cx, y: r.mid, life: .5, size: 140, color: '#ffd23a' }); }
      F.sound('overtake');
    }
    leader = first;
  });

  // ---------- Финал ×2: трасса пульсирует ----------
  R.hooks.over.push(() => {
    const st = R.state;
    if (!st?.final || st.phase !== 'running') return;
    ctx.save();
    ctx.globalAlpha = .4 + .35 * Math.sin(performance.now() / 160);
    ctx.strokeStyle = '#ffb21a'; ctx.lineWidth = 8; ctx.shadowColor = '#ff8a1a'; ctx.shadowBlur = 24;
    ctx.strokeRect(4, R.LANE_TOP - 2, 1072, R.LANE_H * 6 + 4);
    ctx.restore();
  });

  // ---------- Победа: салют в цветах флага ----------
  function finish(f) {
    const colors = countryById(f.winner)?.colors || ['#ffd23a'];
    F.sound('win');
    F.confetti(540, 1180, colors, 170, 1.3);
    for (let i = 0; i < 9; i++) setTimeout(() => F.firework(rand(160, 920), rand(440, 900), colors), 200 + i * 650);
  }

  // ---------- Подсказки в строке комментатора, когда давно не было подарков ----------
  let hintIdx = 0, lastSay = performance.now();
  const say = document.getElementById('say');
  new MutationObserver(() => { if (!say.querySelector('.hint')) lastSay = performance.now(); }).observe(say, { childList: true });
  setInterval(() => {
    const hints = R.view?.hints || [];
    if (!hints.length || !R.state?.idle || performance.now() - lastSay < 6000) return;
    R.sayLine(esc(hints[hintIdx++ % hints.length]), 'hint');
  }, 6000);

  Object.assign(R.fxHandlers, { hazardWarn, hazardHit, hazardPlace: () => F.sound('hazardPlace'), hazardClear: () => {}, photo });
  window.RaceDrama = { finish };
})();
