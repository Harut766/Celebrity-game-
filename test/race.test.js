import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCountryIndex } from '../src/race/countries.js';
import { createModerator } from '../src/race/moderation.js';
import { tierFor, tierPower } from '../src/race/tiers.js';
import { createRace } from '../src/race/engine.js';

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url)));
const R = config.race;
const idx = createCountryIndex(R.countries);

test('вступление: флаг, код, название; «I am here» не считается', () => {
  assert.equal(idx.parseChat('🇦🇲').join, 'am');
  assert.equal(idx.parseChat('вперёд 🇰🇿🇰🇿!!').join, 'kz');
  assert.equal(idx.parseChat('am').join, 'am');
  assert.equal(idx.parseChat('Армения!').join, 'am');
  assert.equal(idx.parseChat('TÜRKİYE').join, 'tr');
  assert.equal(idx.parseChat('turkiye').join, 'tr');
  assert.equal(idx.parseChat('рф').join, 'ru');
  assert.equal(idx.parseChat('I am here').join, null);
  assert.equal(idx.parseChat('привет всем').join, null);
  assert.equal(idx.parseChat('🇫🇷').join, null, 'страны нет в списке — не добавляется');
});

test('атака только по коду/названию страны', () => {
  assert.deepEqual(idx.parseChat('атака ru'), { join: null, attack: 'ru' });
  assert.equal(idx.parseChat('Атака 🇹🇷').attack, 'tr');
  assert.equal(idx.parseChat('атака всех подряд').attack, null);
});

test('модерация ников', () => {
  const m = createModerator(R.moderation);
  assert.equal(m.isClean('Nar_2007'), true);
  assert.equal(m.isClean('Воин_Света'), true, '«воин» — не «война»');
  assert.equal(m.isClean('Nazira'), true);
  assert.equal(m.isClean('хачапури_лав'), true);
  assert.equal(m.isClean('Война'), false);
  assert.equal(m.isClean('p.u.t.i.n'), false);
  assert.equal(m.isClean('karabakh_is'), false);
  assert.equal(m.isClean('хач'), false);
  assert.deepEqual(m.viewer('Война123', 'x'), { name: 'Зритель', hidden: true });
});

test('уровни по монетам', () => {
  const ids = [1, 4, 5, 9, 10, 29, 30, 99, 100, 499, 500, 999, 1000, 30000].map(c => tierFor(R.tiers, c).id);
  assert.deepEqual(ids, ['nitro', 'nitro', 'turbo', 'turbo', 'shield', 'shield', 'rocket', 'rocket', 'super', 'super', 'chaos', 'chaos', 'legend', 'legend']);
  assert.equal(tierPower(tierFor(R.tiers, 100), 100), 1);
  assert.equal(tierPower(tierFor(R.tiers, 100), 400), 2);
});

function makeRace(patch = {}) {
  const events = [];
  const S = { ...R, speedWobble: 0, hazard: { ...R.hazard, enabled: false }, countdownSec: 0, ...patch };
  const race = createRace({ getSettings: () => S, emit: (type, data) => events.push({ type, ...data }), random: () => .5 });
  race.tick(.05); // старт
  const run = sec => { for (let t = 0; t < sec; t += .05) race.tick(.05); };
  const pos = id => race.snapshot().cars.find(c => c.id === id).pos;
  return { race, events, run, pos };
}
const viewer = (name, extra = {}) => ({ user: name, login: name.toLowerCase(), avatar: '', ...extra });

test('машины едут сами, подарок ускоряет', () => {
  const { race, run, pos } = makeRace();
  race.chat({ ...viewer('Nar'), comment: '🇦🇲' });
  run(10);
  const base = pos('ru');
  assert.ok(base > 30, 'базовая скорость');
  race.gift({ ...viewer('Nar'), coins: 5 });
  run(5);
  assert.ok(pos('am') - pos('ru') > 25, 'турбо даёт отрыв');
});

test('подарок без команды уходит последнему месту и закрепляет зрителя', () => {
  const { race, events, run } = makeRace();
  race.chat({ ...viewer('A'), comment: 'kz' });
  race.gift({ ...viewer('A'), coins: 5 });
  run(3);
  const last = race.snapshot().ranking.at(-1);
  race.gift({ ...viewer('Nar'), coins: 1 });
  const rescue = events.find(e => e.kind === 'rescue');
  assert.equal(rescue.country, last);
  assert.equal(rescue.name, 'Nar');
  race.chat({ ...viewer('Nar'), comment: 'am' });
  race.chat({ ...viewer('Nar'), comment: 'ru' });
  assert.equal(events.filter(e => e.kind === 'join' && e.name === 'Nar').length, 1, 'можно один раз выбрать самому, потом выбор закреплён');
});

test('ракета бьёт лидера, щит спасает; если лидер ты — бьёт второго', () => {
  const { race, events, run, pos } = makeRace();
  race.chat({ ...viewer('Ru'), comment: 'ru' });
  race.chat({ ...viewer('Am'), comment: 'am' });
  race.gift({ ...viewer('Ru'), coins: 9 });
  run(4);
  const before = pos('ru');
  race.gift({ ...viewer('Am'), coins: 30 });
  run(1.5);
  assert.ok(pos('ru') < before, 'лидер откинут');
  assert.equal(events.find(e => e.kind === 'hit').target, 'ru');
  race.gift({ ...viewer('Ru'), coins: 10 });
  race.chat({ ...viewer('Am'), comment: 'атака ru' });
  race.gift({ ...viewer('Am'), coins: 30 });
  run(1.5);
  const hits = events.filter(e => e.kind === 'hit');
  assert.equal(hits.at(-1).blocked, true, 'щит спас');
  race.gift({ ...viewer('Am'), coins: 1000 });
  run(8);
  race.gift({ ...viewer('Am'), coins: 30 });
  run(1.5);
  assert.notEqual(events.filter(e => e.kind === 'hit').at(-1).target, 'am');
});

test('«атака xx» выбирает цель ракеты', () => {
  const { race, events, run } = makeRace();
  race.chat({ ...viewer('Nar'), comment: 'am' });
  race.chat({ ...viewer('Nar'), comment: 'атака tr' });
  race.gift({ ...viewer('Nar'), coins: 50 });
  run(1.5);
  assert.equal(events.find(e => e.kind === 'hit').target, 'tr');
});

test('финал ×2 и конец раунда по времени, капитан и герой', () => {
  const { race, events, run } = makeRace({ roundSec: 40, finalSec: 30 });
  race.chat({ ...viewer('Nar'), comment: 'am' });
  run(12);
  assert.ok(events.some(e => e.kind === 'final'));
  race.gift({ ...viewer('Nar', { avatar: 'a.png' }), coins: 20 });
  assert.equal(race.people().captains.am.name, 'Nar');
  run(30);
  const fin = events.find(e => e.type === 'race:finish');
  assert.ok(fin, 'раунд закончился');
  assert.equal(race.snapshot().phase, 'finished');
});

test('подарки между раундами не теряются', () => {
  const { race, events, run } = makeRace({ roundSec: 5, finalSec: 1, winnerSec: 2, countdownSec: 1 });
  run(6);
  assert.equal(race.snapshot().phase, 'finished');
  race.gift({ ...viewer('Nar'), coins: 5 });
  assert.ok(events.some(e => e.kind === 'queued'));
  run(3.5);
  assert.equal(race.snapshot().phase, 'running');
  assert.ok(events.some(e => e.kind === 'turbo'), 'турбо сработало на старте');
});

test('лайки команды дают рывок', () => {
  const { race, events } = makeRace();
  race.chat({ ...viewer('Nar'), comment: 'kz' });
  race.likes(viewer('Nar'), R.likesPerDash);
  assert.ok(events.some(e => e.kind === 'likes' && e.country === 'kz'));
});

test('крупные эффекты идут по очереди, ни один не теряется', () => {
  const { race, events, run } = makeRace();
  race.chat({ ...viewer('A'), comment: 'am' });
  for (let i = 0; i < 3; i++) race.gift({ ...viewer('A'), coins: 1000 });
  run(1);
  assert.equal(events.filter(e => e.kind === 'legend').length, 1);
  run(30);
  assert.equal(events.filter(e => e.kind === 'legend').length, 3);
});

test('ник со стоп-словом не попадает в топы и капитаны', () => {
  const { race } = makeRace();
  race.gift({ ...viewer('война_навсегда'), coins: 500 });
  assert.equal(race.people().topRound.length, 0);
  assert.deepEqual(race.people().captains, {});
});

test('шипы на дорожке лидера: без щита машина теряет дистанцию', () => {
  const H = { ...R.hazard, enabled: true, everySec: [1, 1], warnSec: 1, ahead: 10, kinds: ['spikes'] };
  const { race, events, run } = makeRace({ hazard: H });
  race.chat({ ...viewer('Nar'), comment: 'am' });
  race.gift({ ...viewer('Nar'), coins: 9 });
  run(1.2);
  assert.equal(events.find(e => e.kind === 'hazardWarn').target, 'am');
  run(4);
  const hit = events.find(e => e.kind === 'hazardHit');
  assert.equal(hit.target, 'am');
  assert.equal(hit.blocked, false);
});

test('со щитом машина проезжает шипы и масло', () => {
  for (const kind of ['spikes', 'oil']) {
    const H = { ...R.hazard, enabled: true, everySec: [1, 1], warnSec: 1, ahead: 10, kinds: [kind] };
    const { race, events, run } = makeRace({ hazard: H });
    race.chat({ ...viewer('Nar'), comment: 'am' });
    race.gift({ ...viewer('Nar'), coins: 10 });
    race.gift({ ...viewer('Nar'), coins: 9 });
    run(5);
    const hit = events.find(e => e.kind === 'hazardHit');
    assert.equal(hit.target, 'am');
    assert.equal(hit.blocked, true, kind);
  }
});

test('лайки сразу и заметно толкают машину команды', () => {
  const { race, run, pos } = makeRace();
  race.chat({ ...viewer('Nar'), comment: 'AM' });
  for (let i = 0; i < 4; i++) { race.likes(viewer('Nar'), 15); run(1); }
  assert.ok(pos('am') - pos('ru') > 60, `отрыв ${pos('am') - pos('ru')}`);
});

test('страну можно сменить (не чаще раза в минуту)', () => {
  const { race, events, run } = makeRace();
  race.chat({ ...viewer('Nar'), comment: 'ru' });
  race.chat({ ...viewer('Nar'), comment: 'am' });
  assert.equal(events.filter(e => e.kind === 'join').at(-1).country, 'ru', 'сразу сменить нельзя');
  run(61);
  race.chat({ ...viewer('Nar'), comment: 'am' });
  assert.equal(events.filter(e => e.kind === 'join').at(-1).country, 'am');
  race.likes(viewer('Nar'), 10);
  assert.equal(events.filter(e => e.kind === 'likes').at(-1).country, 'am');
});
