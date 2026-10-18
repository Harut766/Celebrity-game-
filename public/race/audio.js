// Звук «Гонки Наций»: всё синтезируется (без файлов и чужой музыки — нет проблем с авторскими правами).
// Свой звук на каждый уровень подарка + музыка, которая разгоняется в финале.
(function () {
  let ac = null, master, music, sfx;
  const vol = { master: .9, music: .35, sfx: 1 };

  function ctx() {
    if (!ac) {
      try {
        ac = new AudioContext();
        master = ac.createGain(); master.connect(ac.destination);
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
        music = ac.createGain(); music.connect(comp);
        sfx = ac.createGain(); sfx.connect(comp);
        apply();
      } catch { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function apply() {
    if (!ac) return;
    master.gain.value = vol.master; music.gain.value = vol.music; sfx.gain.value = vol.sfx;
  }

  // ---------- примитивы ----------
  function tone(f1, f2, dur, { type = 'sine', gain = .3, at = 0, attack = .005, out = sfx, q } = {}) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + at;
    const o = a.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    let node = o;
    if (q) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = q; o.connect(f); node = f; }
    node.connect(g).connect(out); o.start(t); o.stop(t + dur + .05);
  }
  let noiseBuf = null;
  function ensureNoise(a) {
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  }
  function noise(dur, { type = 'lowpass', f1 = 1000, f2 = null, q = 1, gain = .4, at = 0, attack = .005, out = sfx } = {}) {
    const a = ctx(); if (!a) return;
    ensureNoise(a);
    const t = a.currentTime + at;
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = a.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f1, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + .05);
  }
  const chord = (notes, dur, opts = {}) => notes.forEach((n, i) => tone(n, n, dur, { type: 'sawtooth', gain: .07, q: 2400, at: (opts.arp || 0) * i, attack: .02, ...opts }));

  // ---------- звуки ----------
  const S = {
    nitro: () => { noise(.35, { type: 'bandpass', f1: 600, f2: 2400, q: 2, gain: .3 }); tone(180, 420, .3, { type: 'sawtooth', gain: .08, q: 1400 }); },
    turbo: () => { noise(.6, { type: 'bandpass', f1: 400, f2: 4200, q: 1.5, gain: .45 }); tone(140, 700, .55, { type: 'sawtooth', gain: .12, q: 2200 }); tone(1400, 2800, .25, { gain: .06, at: .25 }); },
    shield: () => { [880, 1320, 1760, 2640].forEach((f, i) => tone(f, f, .5, { gain: .08, at: i * .05, attack: .02 })); noise(.6, { type: 'highpass', f1: 5000, gain: .08, attack: .1 }); },
    rocket: () => { noise(.7, { type: 'bandpass', f1: 300, f2: 1800, q: 1, gain: .4, attack: .05 }); tone(400, 900, .6, { type: 'square', gain: .04 }); },
    superLaunch: () => { noise(.9, { type: 'bandpass', f1: 200, f2: 2600, q: 1, gain: .55, attack: .05 }); tone(220, 1100, .8, { type: 'sawtooth', gain: .08, q: 3000 }); },
    explosion: () => { noise(1.2, { f1: 1200, f2: 90, gain: .9 }); tone(120, 30, .7, { gain: .7 }); },
    block: () => { tone(1500, 1200, .25, { type: 'square', gain: .06 }); tone(2400, 2200, .5, { gain: .1 }); noise(.2, { type: 'highpass', f1: 4000, gain: .2 }); },
    chaos: () => { tone(900, 90, 1.1, { type: 'sawtooth', gain: .12, q: 1800 }); tone(700, 70, 1.1, { type: 'square', gain: .05, at: .08 }); noise(1.2, { type: 'bandpass', f1: 2000, f2: 200, q: 3, gain: .3 }); },
    legend: () => {
      noise(1.6, { f1: 600, f2: 60, gain: .7 }); tone(110, 40, 1.2, { gain: .6 });
      chord([262, 330, 392], .5, { at: .2 }); chord([294, 370, 440], .5, { at: .7 }); chord([330, 415, 494, 659], 2.2, { at: 1.2, gain: .09 });
      [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, f, .9, { gain: .05, at: 1.2 + i * .08, attack: .03 }));
    },
    like: () => tone(1200 + Math.random() * 400, 1800, .08, { gain: .05 }),
    join: () => { tone(660, 990, .1, { type: 'triangle', gain: .1 }); tone(990, 1320, .12, { type: 'triangle', gain: .08, at: .08 }); },
    firework: () => { tone(300, 1200, .35, { gain: .04 }); noise(.5, { type: 'highpass', f1: 2000, gain: .25, at: .35 }); },
    final: () => { for (let i = 0; i < 3; i++) tone(880, 660, .25, { type: 'square', gain: .08, at: i * .3 }); for (let i = 0; i < 12; i++) noise(.08, { type: 'bandpass', f1: 1200, q: 1, gain: .2, at: .9 + i * .06 }); },
    start: () => { tone(440, 440, .5, { type: 'sawtooth', gain: .09, q: 2000 }); tone(554, 554, .5, { type: 'sawtooth', gain: .07, q: 2000, at: .02 }); tone(659, 659, .7, { type: 'sawtooth', gain: .07, q: 2000, at: .04 }); },
    count: () => tone(660, 660, .18, { type: 'square', gain: .08 }),
    go: () => { tone(1320, 1320, .45, { type: 'square', gain: .1 }); noise(.4, { type: 'bandpass', f1: 800, f2: 3000, gain: .3 }); },
    hazardWarn: () => { for (let i = 0; i < 3; i++) { tone(988, 988, .16, { type: 'square', gain: .1, at: i * .38 }); tone(740, 740, .16, { type: 'square', gain: .1, at: i * .38 + .18 }); } },
    hazardPlace: () => { noise(.25, { type: 'highpass', f1: 2500, gain: .25 }); tone(1600, 1200, .2, { type: 'square', gain: .05 }); },
    puncture: () => { noise(.15, { f1: 4000, gain: .9 }); tone(160, 40, .4, { gain: .6 }); noise(1.2, { type: 'highpass', f1: 3000, f2: 1200, gain: .25, at: .1, attack: .05 }); },
    skid: () => { tone(1400, 900, 1.1, { type: 'sawtooth', gain: .05, q: 3000 }); noise(1.2, { type: 'bandpass', f1: 2200, f2: 1400, q: 6, gain: .4, attack: .05 }); },
    photo: () => { noise(.06, { type: 'highpass', f1: 3000, gain: .5 }); for (let i = 0; i < 4; i++) { tone(70, 45, .16, { gain: .5, at: .3 + i * .7 }); tone(70, 45, .16, { gain: .4, at: .5 + i * .7 }); } },
    overtake: () => noise(.25, { type: 'bandpass', f1: 1800, f2: 400, q: 2, gain: .2 }),
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .35, { type: 'sawtooth', gain: .08, q: 2600, at: i * .15 })); chord([523, 659, 784, 1046], 2.4, { at: .7, gain: .08 }); },
  };

  // ---------- музыка: барабаны + бас + арпеджио, в финале быстрее и плотнее ----------
  const PROG = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]; // Am F C G
  let playing = false, intense = 0, step16 = 0, nextAt = 0, timer = null;
  function kick(t) { const a = ac; const o = a.createOscillator(); const g = a.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .18); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g).connect(music); o.start(t); o.stop(t + .3); }
  function hit(t, f, dur, gain, type = 'highpass') { const a = ac; const s = a.createBufferSource(); s.buffer = noiseBuf; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = a.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl).connect(g).connect(music); s.start(t, Math.random()); s.stop(t + dur + .02); }
  function note(t, f, dur, gain, type = 'sawtooth', cut = 900) { const a = ac; const o = a.createOscillator(); o.type = type; o.frequency.value = f; const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; const g = a.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(fl).connect(g).connect(music); o.start(t); o.stop(t + dur + .02); }
  function schedule() {
    if (!ac) return;
    const bpm = intense >= 2 ? 150 : intense ? 138 : 118;
    const s16 = 60 / bpm / 4;
    while (nextAt < ac.currentTime + .12) {
      const t = nextAt, i = step16 % 16, bar = Math.floor(step16 / 16) % 4, ch = PROG[bar];
      if (i % 4 === 0) kick(t);
      if (i === 4 || i === 12) hit(t, 1800, .14, .35, 'bandpass');
      if (i % 2 === 0 || intense) hit(t, 7000, .04, intense ? .12 : .08);
      if (i % 2 === 0) note(t, ch[0] / 2, s16 * 1.8, .22, 'sawtooth', 500);
      if (intense && i % 2 === 1) note(t, ch[(i >> 1) % 3] * 2, s16 * 1.2, .05, 'square', 2600);
      if (!intense && (i === 0 || i === 8)) ch.forEach(f => note(t, f, s16 * 7, .025, 'triangle', 1800));
      if (intense >= 2 && i % 4 === 2) hit(t, 3000, .06, .15, 'bandpass');
      nextAt += s16; step16++;
    }
  }
  function startMusic() {
    if (playing || !ctx()) return;
    ensureNoise(ac);
    playing = true; nextAt = ac.currentTime + .05; step16 = 0;
    timer = setInterval(schedule, 25);
  }
  function stopMusic() { playing = false; clearInterval(timer); }

  // ---------- голос «Спасибо, Nar, за ракету!» (браузерный синтез речи, по желанию) ----------
  let lastThanks = 0;
  function thank(name, what) {
    if (!window.speechSynthesis || Date.now() - lastThanks < 3500) return;
    lastThanks = Date.now();
    const u = new SpeechSynthesisUtterance(`Спасибо, ${name}, за ${what}!`);
    u.lang = 'ru-RU'; u.rate = 1.05; u.volume = vol.master;
    const v = speechSynthesis.getVoices().find(x => x.lang?.startsWith('ru'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  window.RaceAudio = {
    play(name) { if (ctx()) S[name]?.(); },
    setVolume(v = {}) { Object.assign(vol, { master: v.master ?? vol.master, music: v.music ?? vol.music, sfx: v.sfx ?? vol.sfx }); apply(); },
    music(on, level = 0) { intense = level; if (on) startMusic(); else stopMusic(); },
    thank,
    unlock: () => ctx(),
  };
  // В обычном браузере звук включается после клика (в LIVE Studio — сразу)
  addEventListener('pointerdown', () => ctx(), { once: true });
})();
