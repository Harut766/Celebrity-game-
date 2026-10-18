// «Гонка Наций»: вся логика гонки. Сервер вызывает tick() 20 раз в секунду и передаёт сюда события TikTok.
// Экран (public/race) только рисует то, что отсюда приходит через emit().
import { createCountryIndex } from './countries.js';
import { createModerator } from './moderation.js';
import { tierFor, tierPower, sortedTiers } from './tiers.js';

const BOOST_TAU = 1;        // рывок «тает» за ~1 с (расстояние рывка = boost × BOOST_TAU)
const BACK_SPEED = 260;     // как быстро машину откидывает назад (единиц трассы в секунду)
const MEMBERS_SHOWN = 6;    // сколько аватарок держим возле машинки
const ATTACK_PREF_SEC = 90; // «атака xx» действует полторы минуты
const BIG_SLOTS = { super: 1.8, chaos: 3, legend: null }; // крупные эффекты идут по очереди

export function createRace({ getSettings, emit = () => {}, store = null, random = Math.random, isLive = () => false }) {
  let S = getSettings();
  let index = createCountryIndex(S.countries);
  let mod = createModerator(S.moderation);
  let countriesKey = '';

  const cars = new Map();
  const teams = new Map();        // зритель → { country, explicit }
  const roundDonors = new Map();  // зритель → { name, avatar, coins, country }
  const members = new Map();      // страна → последние активные зрители
  const attackPref = new Map();   // зритель → { country, until }
  const followed = new Set();
  const shared = new Map();
  const pending = [];             // подарки между раундами — сработают на старте
  const bigQueue = [];
  const timers = [];
  let bigBusy = 0;

  let phase = 'countdown';
  let paused = false;
  let round = 1;
  let phaseT = 0;
  let elapsed = 0;
  let clock = 0;
  let final = false;
  let slowmo = { left: 0, used: false };
  let ranking = [];
  let leader = null;
  let lastGiftAt = 0;
  let marks = {};
  let hazard = { state: 'idle', t: 0, next: 0 };
  const talk = { last: -99, lastText: '', pending: null };
  let peopleDirty = true;

  const L = () => S.trackLength;
  const mult = () => (final ? S.finalMultiplier : 1);
  const rand = (a, b) => a + random() * (b - a);
  // Один и тот же зритель в разных событиях TikTok может прийти то с userId, то только с логином или ником —
  // связываем их, чтобы чат, лайки и подарки считались за одного человека
  const aliases = new Map();
  function keyOf(ev) {
    const id = ev.id ? `id:${ev.id}` : '';
    const byLogin = ev.login ? `login:${ev.login.toLowerCase()}` : '', byNick = ev.user ? `nick:${ev.user}` : '';
    const key = id || aliases.get(byLogin) || aliases.get(byNick) || byLogin || byNick || 'anon';
    if (id) { if (byLogin) aliases.set(byLogin, id); if (byNick) aliases.set(byNick, id); }
    if (id && byLogin && teams.has(byLogin) && !teams.has(id)) { teams.set(id, teams.get(byLogin)); teams.delete(byLogin); }
    return key;
  }

  function syncCountries() {
    const key = JSON.stringify(S.countries.map(c => c.id + (c.aliases || []).join()));
    if (key === countriesKey) return;
    countriesKey = key;
    index = createCountryIndex(S.countries);
    for (const c of S.countries) if (!cars.has(c.id)) cars.set(c.id, newCar(c.id));
    for (const id of [...cars.keys()]) if (!S.countries.some(c => c.id === id)) cars.delete(id);
  }
  function newCar(id) {
    return { id, pos: 0, vel: 0, boost: 0, back: 0, stun: 0, spin: 0, shield: 0, likeAcc: 0, wobble: random() * 6.28, wobble2: random() * 6.28, lastFor: 0, worst: 0 };
  }
  function refresh() {
    const next = getSettings();
    if (next === S && countriesKey) return;
    S = next;
    mod = createModerator(S.moderation);
    syncCountries();
  }
  refresh();
  hazard.next = rand(...S.hazard.everySec);

  // ---------- комментатор: не чаще раза в 4–5 с, без одинаковых фраз подряд ----------
  function say(kind, vars = {}, priority = 1) {
    const list = S.commentator?.[kind];
    if (!list?.length || phase !== 'running') return;
    if (talk.pending && talk.pending.priority > priority) return;
    talk.pending = { kind, vars, priority };
  }
  function flushTalk() {
    if (!talk.pending || clock - talk.last < S.commentatorEverySec) return;
    const { kind, vars } = talk.pending;
    talk.pending = null;
    const list = S.commentator[kind];
    const options = list.length > 1 ? list.filter(t => t !== talk.lastText) : list;
    const text = options[Math.floor(random() * options.length)];
    talk.last = clock;
    talk.lastText = text;
    emit('race:say', { text, vars });
  }

  // ---------- команды и зрители ----------
  function viewerOf(ev) {
    const v = mod.viewer(ev.user, ev.login);
    return { key: keyOf(ev), name: v.name, avatar: v.hidden ? '' : (ev.avatar || ''), hidden: v.hidden };
  }
  function lastPlace() {
    const list = rankedIds();
    return list[list.length - 1];
  }
  function assign(v, country, explicit) {
    teams.set(v.key, { country, explicit });
    store?.saveTeams(teams);
    touchMember(v, country);
  }
  function touchMember(v, country) {
    if (v.hidden) return;
    const list = (members.get(country) || []).filter(m => m.key !== v.key);
    list.unshift({ key: v.key, name: v.name, avatar: v.avatar });
    members.set(country, list.slice(0, MEMBERS_SHOWN));
    peopleDirty = true;
  }
  /** Команда зрителя; если её нет — последнее место (и зритель закрепляется за ним). */
  function teamFor(v, { announce = true } = {}) {
    const t = teams.get(v.key);
    if (t) { touchMember(v, t.country); return { country: t.country, rescue: false }; }
    const country = lastPlace();
    assign(v, country, false);
    if (announce) emit('race:fx', { kind: 'rescue', country, name: v.name, avatar: v.avatar });
    return { country, rescue: true };
  }

  // ---------- физика ----------
  function rankedIds() {
    return [...cars.values()].sort((a, b) => b.pos - a.pos).map(c => c.id);
  }
  function dash(id, distance) {
    const car = cars.get(id);
    if (car) car.boost += distance * mult() / BOOST_TAU;
  }
  function protect(id, sec) {
    const car = cars.get(id);
    if (car) car.shield = Math.max(car.shield, sec * mult());
  }
  /** Удар по машине. false — если спас щит. */
  function knock(id, distance, stunSec) {
    const car = cars.get(id);
    if (!car) return false;
    if (car.shield > 0) return false;
    car.back += distance * mult();
    car.stun = Math.max(car.stun, stunSec);
    car.boost = 0;
    return true;
  }
  function later(sec, fn) { timers.push({ at: clock + sec, fn }); }

  function targetsFor(own, key, n) {
    const out = [];
    const pref = attackPref.get(key);
    if (pref && pref.until > clock && pref.country !== own && cars.has(pref.country)) out.push(pref.country);
    for (const id of rankedIds()) {
      if (out.length >= n) break;
      if (id !== own && !out.includes(id)) out.push(id);
    }
    return out;
  }

  // ---------- подарки ----------
  function gift(ev) {
    const v = viewerOf(ev);
    const coins = Math.max(1, Math.round(ev.coins || 1));
    const { country } = teamFor(v);
    lastGiftAt = clock;
    store?.logGift({ ...ev, coins, country, sim: !!ev.sim, tier: tierFor(S.tiers, coins)?.id });
    if (!v.hidden) {
      const row = roundDonors.get(v.key) || { key: v.key, name: v.name, avatar: v.avatar, coins: 0, country };
      row.coins += coins; row.avatar = v.avatar || row.avatar; row.country = country;
      roundDonors.set(v.key, row);
      if (!ev.sim) store?.addDonor(v, coins);
      peopleDirty = true;
    }
    const item = { v, coins, country, giftImage: ev.giftImage || '', giftName: ev.giftName || '' };
    if (phase !== 'running' || paused) {
      pending.push(item);
      emit('race:fx', { kind: 'queued', country, name: v.name, avatar: v.avatar, coins, giftImage: item.giftImage });
      return;
    }
    applyGift(item);
  }

  function applyGift(item) {
    const { v, coins, country } = item;
    const tier = tierFor(S.tiers, coins);
    if (!tier) return;
    const p = tierPower(tier, coins);
    const fx = { kind: tier.id, tier: tier.id, title: tier.name, country, name: v.name, avatar: v.avatar, coins, giftImage: item.giftImage, final };
    const slot = BIG_SLOTS[tier.id];
    if (slot !== undefined) {
      bigQueue.push({ item, run: () => runBig(tier, p, fx, v.key), sec: slot ?? (tier.cinematicSec || 6) + .6 });
      if (bigQueue.length > 1 || bigBusy > 0) emit('race:fx', { ...fx, kind: 'wait', place: bigQueue.length });
      return;
    }
    if (tier.id === 'shield') {
      protect(country, tier.shieldSec * p);
      dash(country, tier.dash * p);
      emit('race:fx', { ...fx, sec: tier.shieldSec * p * mult() });
      say('shield', { a: country });
    } else if (tier.knockback) {
      const targets = targetsFor(country, v.key, tier.targets || 1);
      dash(country, tier.dash * p);
      emit('race:fx', { ...fx, targets });
      later(.8, () => targets.forEach(t => hit(t, tier.knockback * p, tier.stunSec, fx)));
    } else {
      dash(country, tier.dash * p);
      emit('race:fx', fx);
    }
  }

  function hit(target, distance, stunSec, fx) {
    const ok = knock(target, distance, stunSec);
    emit('race:fx', { kind: 'hit', target, blocked: !ok, from: fx.country, name: fx.name, tier: fx.tier });
    if (ok) say('attacked', { a: target }, 3);
  }

  function runBig(tier, p, fx, key) {
    if (tier.id === 'super') {
      const targets = targetsFor(fx.country, key, tier.targets || 2);
      dash(fx.country, tier.dash * p);
      emit('race:fx', { ...fx, targets });
      later(.8, () => targets.forEach(t => hit(t, tier.knockback * p, tier.stunSec, fx)));
    } else if (tier.id === 'chaos') {
      const hitList = [], saved = [];
      for (const car of cars.values()) {
        if (car.id === fx.country) continue;
        if (car.shield > 0) { saved.push(car.id); continue; }
        car.spin = Math.max(car.spin, tier.spinSec);
        car.boost = 0;
        hitList.push(car.id);
      }
      dash(fx.country, tier.dash * p);
      emit('race:fx', { ...fx, targets: hitList, saved, sec: tier.spinSec });
    } else if (tier.id === 'legend') {
      emit('race:fx', { ...fx, sec: tier.cinematicSec || 6 });
      say('legend', { a: fx.country, n: fx.name }, 5);
      later(1.5, () => dash(fx.country, tier.dash * p));
    }
  }

  // ---------- бесплатные действия ----------
  // Каждый лайк сразу толкает машину своей команды; шкала команды копится до бонусного рывка.
  // Без команды лайк машину не двигает — зритель получает подсказку «напиши код страны».
  const nudged = new Map();
  function needTeam(v) {
    if (clock - (nudged.get(v.key) ?? -99) < 20) return null;
    nudged.set(v.key, clock);
    emit('race:fx', { kind: 'needTeam', name: v.name, avatar: v.avatar });
    return null;
  }
  function likes(ev, count) {
    const v = viewerOf(ev);
    const t = teams.get(v.key);
    if (!t) return needTeam(v);
    const country = t.country;
    touchMember(v, country);
    const car = cars.get(country);
    const n = Math.max(1, count || 1);
    const running = phase === 'running' && !paused;
    // «Бюджет» лайков команды: не больше likeSpeedCap единиц в секунду, чтобы тапанье не обесценило подарки
    const cap = S.likeSpeedCap ?? 10;
    car.likeBudget = Math.min(cap * 2, (car.likeBudget ?? cap * 2) + (clock - (car.likeAt ?? clock)) * cap);
    car.likeAt = clock;
    const gain = Math.min(car.likeBudget, S.maxLikeDistance ?? 15, n * (S.likeDistance ?? 1.5));
    if (running && gain > 0) { dash(country, gain); car.likeBudget -= gain; }
    emit('race:fx', { kind: 'likes', country, count: n, name: v.name, avatar: v.avatar });
    car.likeAcc += n;
    const need = Math.max(1, S.likesPerDash);
    while (car.likeAcc >= need) {
      if (!running) { car.likeAcc = need; break; }
      car.likeAcc -= need;
      dash(country, S.likeDash);
      emit('race:fx', { kind: 'likeBonus', country });
    }
    return country;
  }
  function follow(ev) {
    const v = viewerOf(ev);
    if (followed.has(v.key)) return;
    followed.add(v.key);
    const country = teams.get(v.key)?.country;
    if (!country) return needTeam(v);
    protect(country, S.followShieldSec / mult());
    emit('race:fx', { kind: 'follow', country, name: v.name, avatar: v.avatar, sec: S.followShieldSec });
  }
  function share(ev) {
    const v = viewerOf(ev);
    if (clock - (shared.get(v.key) ?? -999) < 60) return;
    shared.set(v.key, clock);
    const country = teams.get(v.key)?.country;
    if (!country) return needTeam(v);
    if (phase === 'running') dash(country, S.shareDash);
    emit('race:fx', { kind: 'share', country, name: v.name, avatar: v.avatar });
  }
  function join(ev) {
    const v = viewerOf(ev);
    const t = teams.get(v.key);
    if (t) { touchMember(v, t.country); emit('race:fx', { kind: 'arrive', country: t.country, name: v.name, avatar: v.avatar }); }
    else emit('race:fx', { kind: 'hello', name: v.name, avatar: v.avatar });
  }
  // Код страны в чате: вступить в команду. Выбор запоминается на всю трансляцию,
  // но сменить страну можно — не чаще раза в минуту (чтобы не прыгали туда-сюда).
  const switchedAt = new Map(), rejoinShown = new Map();
  function chat(ev) {
    const v = viewerOf(ev);
    const { join: wanted, attack } = index.parseChat(ev.comment);
    if (attack) { attackPref.set(v.key, { country: attack, until: clock + ATTACK_PREF_SEC }); return { attack }; }
    const t = teams.get(v.key);
    if (!wanted) { if (t) touchMember(v, t.country); return {}; }
    if (t?.country === wanted) {
      touchMember(v, wanted);
      // повторное «AM» в чате показываем не чаще раза в 30 с, иначе дорожка тонет в карточках
      if (clock - (rejoinShown.get(v.key) ?? -999) >= 30) { rejoinShown.set(v.key, clock); emit('race:fx', { kind: 'join', country: wanted, name: v.name, avatar: v.avatar }); }
      return { join: wanted, same: true };
    }
    if (t?.explicit && clock - (switchedAt.get(v.key) ?? -999) < 60) return { join: t.country, locked: true, wanted };
    switchedAt.set(v.key, clock);
    if (t) { const list = (members.get(t.country) || []).filter(m => m.key !== v.key); members.set(t.country, list); }
    assign(v, wanted, true);
    rejoinShown.set(v.key, clock);
    emit('race:fx', { kind: 'join', country: wanted, name: v.name, avatar: v.avatar });
    return { join: wanted, from: t?.country };
  }

  // ---------- раунды ----------
  function newRound() {
    // Крупные эффекты, которые не успели сыграть, не пропадают — переходят на старт
    for (const b of bigQueue) pending.push(b.item);
    bigQueue.length = 0;
    bigBusy = 0;
    timers.length = 0;
    for (const id of cars.keys()) cars.set(id, { ...newCar(id), likeAcc: cars.get(id).likeAcc });
    round++;
    phase = 'countdown'; phaseT = 0; elapsed = 0;
    final = false; slowmo = { left: 0, used: false }; marks = {};
    roundDonors.clear();
    hazard = { state: 'idle', t: 0, next: rand(...S.hazard.everySec) };
    leader = null;
    peopleDirty = true;
    emit('race:round', { round });
  }
  function startRunning() {
    phase = 'running'; phaseT = 0; elapsed = 0;
    emit('race:fx', { kind: 'start' });
    say('start', {}, 2);
    const list = pending.splice(0);
    list.forEach((item, i) => later(.4 + i * .15, () => applyGift(item)));
  }
  function finishRound(winner) {
    if (phase !== 'running') return;
    phase = 'finished'; phaseT = 0;
    const donors = [...roundDonors.values()].sort((a, b) => b.coins - a.coins);
    const heroRow = donors.find(d => d.country === winner) || donors[0] || null;
    const hero = heroRow && { name: heroRow.name, avatar: heroRow.avatar, coins: heroRow.coins, country: heroRow.country };
    const wins = isLive() ? store?.addWin(winner) : store?.wins();
    emit('race:finish', { winner, hero, wins: wins || {}, standings: rankedIds(), round });
    talk.pending = null;
  }

  // ---------- шаг симуляции ----------
  function tick(dt) {
    refresh();
    if (paused) return;
    clock += dt;
    phaseT += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= clock) { const t = timers.splice(i, 1)[0]; t.fn(); }
    if (phase === 'countdown' && phaseT >= S.countdownSec) startRunning();
    else if (phase === 'running') step(dt);
    else if (phase === 'finished' && S.autoNextRound && phaseT >= S.winnerSec) newRound();
    for (const [k, a] of attackPref) if (a.until < clock) attackPref.delete(k);
    flushTalk();
  }

  function step(dtReal) {
    const slow = slowmo.left > 0 ? S.photoFinish.slowmo : 1;
    if (slowmo.left > 0) slowmo.left -= dtReal;
    const dt = dtReal * slow;
    elapsed += dt;
    const left = S.roundSec - elapsed;

    // Крупные эффекты по очереди
    if (bigBusy > 0) bigBusy -= dtReal;
    if (bigBusy <= 0 && bigQueue.length) { const b = bigQueue.shift(); bigBusy = b.sec; b.run(); }

    if (!final && left <= S.finalSec) { final = true; emit('race:fx', { kind: 'final', multiplier: S.finalMultiplier }); say('final', {}, 6); }
    if (!marks.minute && left <= 60 && S.roundSec > 90) { marks.minute = true; say('minute', {}, 4); }
    if (!marks.ten && left <= 10) { marks.ten = true; say('tenSec', {}, 7); }

    for (const car of cars.values()) {
      const wob = 1 + S.speedWobble * (.65 * Math.sin(elapsed * .31 + car.wobble) + .35 * Math.sin(elapsed * .83 + car.wobble2));
      let base = S.baseSpeed * wob;
      if (car.stun > 0) { car.stun -= dt; base = 0; }
      else if (car.spin > 0) { car.spin -= dt; base = 0; car.boost *= Math.exp(-dt * 3); }
      let move = (base + car.boost) * dt;
      car.boost *= Math.exp(-dt / BOOST_TAU);
      if (car.back > 0) { const b = Math.min(car.back, BACK_SPEED * dt); car.back -= b; move -= b; }
      const before = car.pos;
      car.pos = Math.max(0, Math.min(L(), car.pos + move));
      car.vel = dt > 0 ? (car.pos - before) / dt : 0;
      if (car.shield > 0) car.shield = Math.max(0, car.shield - dt);
    }

    ranking = rankedIds();
    const [first, second] = ranking;
    const lastId = ranking[ranking.length - 1];
    const c1 = cars.get(first), c2 = cars.get(second);
    // Смена лидера
    if (leader && first !== leader && c1.pos > L() * .08) say('overtake', { a: first, b: leader }, 2);
    leader = first;
    // Отрыв и плотная борьба
    if (c1.pos - c2.pos > L() * .15 && clock - (marks.breakaway ?? -99) > 25) { marks.breakaway = clock; say('breakaway', { a: first }, 1); }
    if (c1.pos > L() * .3 && c1.pos - c2.pos < L() * .015 && clock - (marks.close ?? -99) > 20) { marks.close = clock; say('close', { a: first, b: second }, 1); }
    // Последнее место и камбэк
    for (const car of cars.values()) {
      const place = ranking.indexOf(car.id);
      if (place >= ranking.length - 2) car.worst = clock;
      if (elapsed > 25 && car.pos > L() * .2 && place <= 2 && clock - car.worst < 15 && car.worst > 0 && clock - (marks['cb' + car.id] ?? -99) > 30) {
        marks['cb' + car.id] = clock; say('comeback', { a: car.id }, 2);
      }
    }
    const last = cars.get(lastId);
    if (last.lastFor === 0) last.lastFor = clock;
    for (const car of cars.values()) if (car.id !== lastId) car.lastFor = 0;
    if (elapsed > 25 && clock - last.lastFor > 20 && clock - (marks.last ?? -99) > 30 && c1.pos - last.pos > L() * .1) { marks.last = clock; say('last', { a: lastId }, 1); }

    // Фотофиниш: две машины рядом у самого финиша
    const pf = S.photoFinish;
    if (!slowmo.used && c1.pos >= L() * pf.atProgress && c1.pos - c2.pos <= pf.gap) {
      slowmo = { left: pf.sec, used: true };
      emit('race:fx', { kind: 'photo', a: first, b: second, sec: pf.sec });
      say('photo', { a: first, b: second }, 8);
    }

    stepHazard(dt, left);

    if (c1.pos >= L()) finishRound(first);
    else if (left <= 0) finishRound(first);
  }

  // Шипы или масло: раз в 30–45 с появляются на дорожке лидера. За 3 с — предупреждение.
  // Без щита: шипы пробивают колесо (машина теряет дистанцию), на масле машину заносит. Со щитом — проезжает.
  function stepHazard(dt, left) {
    const H = S.hazard;
    if (!H?.enabled) return;
    hazard.t += dt;
    if (hazard.state === 'idle' && hazard.t >= hazard.next && left > H.warnSec + 6 && slowmo.left <= 0) {
      const target = ranking[0];
      const kind = H.kinds[Math.floor(random() * H.kinds.length)];
      hazard = { state: 'warn', t: 0, target, kind };
      emit('race:fx', { kind: 'hazardWarn', hazard: kind, target, sec: H.warnSec });
      say(kind === 'oil' ? 'oilWarn' : 'spikesWarn', { a: target }, 4);
    } else if (hazard.state === 'warn' && hazard.t >= H.warnSec) {
      const car = cars.get(hazard.target);
      hazard = { ...hazard, state: 'on', t: 0, pos: Math.min(L() - 15, car.pos + H.ahead) };
      emit('race:fx', { kind: 'hazardPlace', hazard: hazard.kind, target: hazard.target, pos: hazard.pos });
    } else if (hazard.state === 'on') {
      const car = cars.get(hazard.target);
      if (car && car.pos >= hazard.pos) {
        let blocked = car.shield > 0;
        if (!blocked && hazard.kind === 'oil') { car.spin = Math.max(car.spin, H.oil.spinSec); car.boost = 0; }
        else if (!blocked) blocked = !knock(car.id, H.spikes.knockback, H.spikes.stunSec);
        emit('race:fx', { kind: 'hazardHit', hazard: hazard.kind, target: car.id, blocked });
        say(blocked ? 'hazardBlocked' : hazard.kind === 'oil' ? 'oilHit' : 'spikesHit', { a: car.id }, 4);
        hazard = { state: 'idle', t: 0, next: rand(...H.everySec) };
      } else if (hazard.t > 12) {
        emit('race:fx', { kind: 'hazardClear', target: hazard.target });
        hazard = { state: 'idle', t: 0, next: rand(...H.everySec) };
      }
    }
  }

  // ---------- для экрана и панели ----------
  function snapshot() {
    const left = Math.max(0, S.roundSec - elapsed);
    return {
      phase, paused, round, final, slowmo: slowmo.left > 0,
      timeLeft: phase === 'running' ? left : S.roundSec,
      countdown: phase === 'countdown' ? Math.max(0, S.countdownSec - phaseT) : 0,
      idle: phase === 'running' && clock - lastGiftAt > S.hintAfterSec,
      length: L(),
      cars: [...cars.values()].map(c => ({
        id: c.id, pos: +c.pos.toFixed(2), vel: +c.vel.toFixed(2), shield: +c.shield.toFixed(1),
        stun: c.stun > 0, spin: c.spin > 0, back: c.back > 0, like: Math.min(1, c.likeAcc / Math.max(1, S.likesPerDash)),
      })),
      ranking,
      hazard: hazard.state === 'idle' ? null : { state: hazard.state, kind: hazard.kind, target: hazard.target, pos: hazard.pos ?? null },
    };
  }
  function people() {
    peopleDirty = false;
    const donors = [...roundDonors.values()].sort((a, b) => b.coins - a.coins);
    const captains = {};
    for (const d of donors) if (!captains[d.country]) captains[d.country] = { name: d.name, avatar: d.avatar, coins: d.coins };
    const counts = {};
    for (const t of teams.values()) counts[t.country] = (counts[t.country] || 0) + 1;
    return {
      captains,
      members: Object.fromEntries([...members].map(([k, list]) => [k, list.map(({ name, avatar }) => ({ name, avatar }))])),
      counts,
      topRound: donors.slice(0, 3).map(({ name, avatar, coins, country }) => ({ name, avatar, coins, country })),
      topDay: store?.topDay(3) || [],
      wins: store?.wins() || {},
    };
  }

  // Команды прошлого запуска (в пределах одного эфира)
  for (const [k, t] of Object.entries(store?.loadTeams() || {})) if (cars.has(t.country)) teams.set(k, t);

  return {
    tick, snapshot, people,
    peopleChanged: () => peopleDirty,
    gift, likes, follow, share, join, chat,
    start() { if (paused) paused = false; else if (phase !== 'running') { if (phase === 'finished') newRound(); startRunning(); } },
    pause() { paused = !paused; return paused; },
    reset() { newRound(); },
    pendingCount: () => pending.length + bigQueue.length,
    teamsCount: () => teams.size,
  };
}
