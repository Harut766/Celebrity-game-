import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePunishment, giftToHits, isFinalGiftEvent, normalizeTikTokGift, createStreakTracker } from '../src/punish.js';

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url)));

test('самый дешёвый подарок (1 монета) = яйцо в лоб', () => {
  assert.equal(resolvePunishment(config, { coins: 1 }).id, 'egg');
});

test('цена выбирает самое дорогое доступное наказание', () => {
  assert.equal(resolvePunishment(config, { coins: 4 }).id, 'egg');
  assert.equal(resolvePunishment(config, { coins: 5 }).id, 'tomato');
  assert.equal(resolvePunishment(config, { coins: 30 }).id, 'watermelon');
  assert.equal(resolvePunishment(config, { coins: 150 }).id, 'brick');
  assert.equal(resolvePunishment(config, { coins: 299 }).id, 'poop');
  assert.equal(resolvePunishment(config, { coins: 44999 }).id, 'full');
});

test('подарок дешевле всех наказаний ничего не делает', () => {
  assert.equal(resolvePunishment(config, { coins: 0 }), null);
});

test('имя подарка из списка gifts важнее цены', () => {
  assert.equal(resolvePunishment(config, { giftName: 'doughnut', coins: 1 }).id, 'watermelon');
});

test('серия подарков даёт несколько ударов, но не больше лимита', () => {
  assert.equal(giftToHits(config, { coins: 1, repeatCount: 3 }).length, 3);
  assert.equal(giftToHits(config, { coins: 1, repeatCount: 100 }).length, config.maxRepeatPerGift);
});

test('промежуточные события серии не засчитываются', () => {
  assert.equal(isFinalGiftEvent({ giftDetails: { giftType: 1 }, repeatEnd: false }), false);
  assert.equal(isFinalGiftEvent({ giftDetails: { giftType: 1 }, repeatEnd: true }), true);
  assert.equal(isFinalGiftEvent({ giftDetails: { giftType: 2 }, repeatEnd: false }), true);
});

test('нормализация события TikTok', () => {
  const g = normalizeTikTokGift({
    user: { uniqueId: 'jackie', nickname: 'Jackie' },
    giftDetails: { giftName: 'Rose', diamondCount: 1, giftType: 1 },
    repeatCount: 2,
  });
  assert.deepEqual(g, { user: 'Jackie', login: 'jackie', giftId: 0, giftName: 'Rose', coins: 1, repeatCount: 2 });
});

test('армянская фамилия в нике распознаётся', async () => {
  const { looksArmenian } = await import('../src/punish.js');
  for (const n of ['Petrosyan', 'aram_hakobyan_77', 'Арамян', 'Melikian', 'Պետրոսյան']) assert.equal(looksArmenian(config, n), true, n);
  for (const n of ['Jackie', 'ivanov', 'Тест']) assert.equal(looksArmenian(config, n), false, n);
});

test('подарок без деталей распознаётся по номеру', () => {
  const g = normalizeTikTokGift({ user: { nickname: '.' }, giftId: 5655, giftDetails: { giftName: '', diamondCount: 0, giftType: 1 }, repeatCount: 1 });
  assert.equal(g.giftName, 'Rose');
  assert.equal(g.coins, 1);
  assert.equal(giftToHits(config, g)[0].punishmentId, 'egg');
  const corgi = normalizeTikTokGift({ user: {}, giftId: 6267, repeatCount: 1 });
  assert.equal(giftToHits(config, corgi)[0].punishmentId, 'poop');
});

test('название подарка из текста события', () => {
  const g = normalizeTikTokGift({ user: {}, giftId: 1, common: { describe: 'Vova: sent Doughnut' }, repeatCount: 1 });
  assert.equal(g.giftName, 'Doughnut');
  assert.equal(giftToHits(config, g)[0].punishmentId, 'watermelon');
});

test('совсем неизвестный подарок всё равно даёт яйцо', () => {
  const g = normalizeTikTokGift({ user: {}, giftId: 999999, repeatCount: 2 });
  const hits = giftToHits(config, g);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].punishmentId, 'egg');
});

test('серия роз считается по приросту, без задвоения', () => {
  const track = createStreakTracker();
  const ev = (rc, end = 0, groupId = 'g1') => ({ user: { userId: 'u1' }, giftId: 5655, groupId, repeatCount: rc, repeatEnd: end });
  assert.deepEqual([ev(1), ev(2), ev(3), ev(3, 1)].map(e => track(e, 1000)), [1, 1, 1, 0]);
  // новая серия того же подарка
  assert.deepEqual([ev(1, 0, 'g2'), ev(1, 1, 'g2')].map(e => track(e, 2000)), [1, 0]);
  // пришёл только финал серии ×4
  assert.equal(track(ev(4, 1, 'g3'), 3000), 4);
});
