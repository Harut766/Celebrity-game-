import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBattle, dragonSettings, attackForGift, levelHp, avatarOf } from '../src/dragon.js';

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url)));
const settings = (patch = {}) => ({ ...dragonSettings(config), critChance: 0, regenAfterSec: 60, ...patch });
const user = name => ({ user: name, login: name.toLowerCase(), avatar: '' });

test('подарок выбирает удар по названию и по цене', () => {
  const s = settings();
  assert.equal(attackForGift(s, { giftName: 'Rose', coins: 1 }).id, 'arrow');
  assert.equal(attackForGift(s, { giftName: 'Doughnut', coins: 30 }).id, 'boulder');
  assert.equal(attackForGift(s, { giftName: 'Corgi', coins: 299 }).id, 'david');
  assert.equal(attackForGift(s, { coins: 150 }).id, 'knight');
  assert.equal(attackForGift(s, { coins: 44999 }).id, 'meteor');
  assert.equal(attackForGift(s, {}).id, 'arrow', 'нераспознанный подарок — хотя бы стрела');
});

test('урон = монеты × урон за монету × серия', () => {
  const b = createBattle(() => settings());
  const ev = b.gift(user('Арам'), { giftName: 'Rose', coins: 1, repeatCount: 3 });
  assert.equal(ev.damage, 30);
  assert.equal(ev.count, 3);
  assert.equal(b.state().hp, levelHp(settings(), 1) - 30);
});

test('крит удваивает урон', () => {
  const b = createBattle(() => settings({ critChance: 1 }));
  assert.equal(b.gift(user('Ани'), { coins: 5 }).damage, 100);
});

test('лайками нельзя добить — последний удар только подарком', () => {
  const b = createBattle(() => settings({ baseHp: 100, likeDamage: 1, maxLikeDamage: 1000 }));
  const ev = b.likes(user('Гор'), 500);
  assert.equal(ev.hpAfter, 10, 'остаётся 10%');
  assert.equal(ev.blocked, true);
  assert.equal(b.likes(user('Гор'), 5).dealt, 0);
  assert.equal(b.state().level, 1);
  const kill = b.gift(user('Давид'), { giftName: 'Rose', coins: 1 });
  assert.equal(kill.killed, true);
  assert.equal(kill.hero.user, 'Давид');
});

test('после победы — новый уровень, дракон сильнее, лишний урон частично переходит', () => {
  const b = createBattle(() => settings({ baseHp: 100, hpGrowth: 2, overflowCap: .5 }));
  const ev = b.gift(user('Нарек'), { coins: 299 });
  assert.equal(ev.killed, true);
  assert.equal(ev.next.level, 2);
  assert.equal(ev.next.maxHp, 200);
  assert.equal(ev.next.hp, 100, 'переходит не больше половины жизни нового дракона');
  assert.equal(b.state().lastHero.user, 'Нарек');
});

test('топ урона по убыванию', () => {
  const b = createBattle(() => settings({ baseHp: 1e6 }));
  b.gift(user('A'), { coins: 1 });
  b.gift(user('B'), { coins: 30 });
  b.likes(user('C'), 5);
  b.gift(user('A'), { coins: 5 });
  assert.deepEqual(b.leaders().map(r => r.user), ['B', 'A', 'C']);
});

test('дракон лечится, если долго никто не бьёт', () => {
  let t = 0;
  const b = createBattle(() => settings({ baseHp: 1000, regenAfterSec: 60, regenPercentPerMin: 6 }), { now: () => t });
  b.gift(user('A'), { coins: 50 });
  t = 30_000;
  assert.equal(b.tick(5000), null, 'рано');
  t = 61_000;
  const heal = b.tick(5000);
  assert.equal(heal.amount, 5);
  assert.equal(b.state().hp, 505);
});

test('аватарка: берём не .heic', () => {
  assert.equal(avatarOf({ profilePicture: { url: ['https://x/a.heic', 'https://x/a.webp'] } }), 'https://x/a.webp');
  assert.equal(avatarOf({}), '');
});

test('бой продолжается после перезапуска сервера', () => {
  const a = createBattle(() => settings({ baseHp: 1000 }));
  a.gift(user('Арам'), { coins: 30 });
  const b = createBattle(() => settings({ baseHp: 1000 }), { saved: JSON.parse(JSON.stringify(a.save())) });
  assert.equal(b.state().hp, 700);
  assert.equal(b.leaders()[0].user, 'Арам');
  b.gift(user('Арам'), { coins: 1 });
  assert.equal(b.leaders()[0].damage, 310);
});
