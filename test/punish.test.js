import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePunishment, giftToHits, isFinalGiftEvent, normalizeTikTokGift } from '../src/punish.js';

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
  assert.deepEqual(g, { user: 'Jackie', giftName: 'Rose', coins: 1, repeatCount: 2 });
});
