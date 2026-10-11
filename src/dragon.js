// Игра «Давид против Вишапа»: логика боя на сервере. Без зависимостей от TikTok, чтобы легко тестировать.
import { resolvePunishment } from './punish.js';

export const DRAGON_DEFAULTS = {
  baseHp: 500,            // жизнь дракона на 1-м уровне
  hpGrowth: 1.5,          // во сколько раз сильнее каждый следующий уровень
  damagePerCoin: 10,      // урон за 1 монету подарка
  critChance: 0.12,       // шанс критического удара подарком
  critMultiplier: 2,
  likeDamage: 1,          // урон за 1 лайк
  maxLikeDamage: 60,      // не больше за одну пачку лайков
  likesFinishLimit: 0.1,  // лайками нельзя опустить жизнь ниже 10% — добить можно только подарком
  followDamage: 30,
  shareDamage: 20,
  maxAnimations: 8,       // сколько снарядов максимум рисовать для серии подарков (урон считается весь)
  regenAfterSec: 60,      // если никто не бьёт столько секунд — дракон лечится
  regenPercentPerMin: 3,
  overflowCap: 0.5,       // лишний урон переходит на следующего дракона, но не больше половины его жизни
  leadersCount: 5,
};

export const dragonSettings = config => ({ ...DRAGON_DEFAULTS, ...(config.dragon || {}) });
export const levelHp = (s, level) => Math.max(1, Math.round(s.baseHp * s.hpGrowth ** (level - 1)));

/** Какой удар даёт подарок: по названию из `gifts`, иначе самый дорогой, который покрывает цена. */
export function attackForGift(s, gift) {
  const attacks = [...(s.attacks || [])].sort((a, b) => a.price - b.price);
  if (!attacks.length) return null;
  if (!gift.giftName && !gift.coins) return attacks[0];
  return resolvePunishment({ punishments: attacks }, gift) || attacks[0];
}

/** Картинка профиля TikTok (берём не .heic — его браузер не покажет). */
export function avatarOf(user) {
  const pic = user?.profilePicture || user?.profilePictureMedium || user?.avatarThumb;
  const urls = pic?.url || pic?.urlList || pic?.url_list || [];
  return urls.find(u => !/\.heic/i.test(u)) || urls[0] || '';
}

/**
 * Состояние боя. getSettings() вызывается на каждое событие — настройки можно менять без перезапуска.
 * Все методы возвращают событие для оверлея (или null).
 */
export function createBattle(getSettings, { random = Math.random, now = Date.now } = {}) {
  let s = getSettings();
  let level = 1;
  let maxHp = levelHp(s, 1);
  let hp = maxHp;
  let kills = 0;
  let lastHero = null;
  let lastDamageAt = now();
  const board = new Map();

  const finishFloor = () => Math.ceil(maxHp * s.likesFinishLimit);
  const state = () => ({ level, hp, maxHp, kills, lastHero, finishAt: finishFloor() });

  function credit(p, damage, coins = 0) {
    const key = p.login || p.user;
    const row = board.get(key) || { user: p.user, login: p.login || '', avatar: '', damage: 0, coins: 0 };
    row.user = p.user || row.user;
    row.avatar = p.avatar || row.avatar;
    row.damage += damage;
    row.coins += coins;
    board.set(key, row);
  }

  function apply(p, damage, canKill) {
    s = getSettings();
    lastDamageAt = now();
    const floor = canKill ? 0 : Math.min(hp, finishFloor());
    const dealt = Math.max(0, Math.min(damage, hp - floor));
    hp -= dealt;
    const hit = { level, maxHp, hpAfter: hp, dealt, blocked: !canKill && dealt < damage };
    if (hp > 0) return hit;
    // Дракон повержен: герой — тот, кто нанёс последний удар. Новый дракон сильнее.
    kills++;
    lastHero = { user: p.user, login: p.login || '', avatar: p.avatar || '', level };
    const overflow = damage - dealt;
    level++;
    maxHp = levelHp(s, level);
    hp = Math.max(1, maxHp - Math.min(overflow, Math.floor(maxHp * s.overflowCap)));
    return { ...hit, killed: true, hero: lastHero, next: { level, hp, maxHp } };
  }

  return {
    state,
    leaders: () => [...board.values()].sort((a, b) => b.damage - a.damage).slice(0, s.leadersCount),

    gift(p, gift) {
      s = getSettings();
      const attack = attackForGift(s, gift);
      if (!attack) return null;
      const repeat = Math.max(1, gift.repeatCount || 1);
      const coins = (gift.coins || attack.price || 1) * repeat;
      const crit = random() < s.critChance;
      const damage = Math.round(coins * s.damagePerCoin * (crit ? s.critMultiplier : 1));
      const hit = apply(p, damage, true);
      credit(p, damage, coins);
      return {
        type: 'attack', attackId: attack.id, user: p.user, login: p.login || '', avatar: p.avatar || '',
        giftName: gift.giftName || '', coins, repeatCount: repeat, count: Math.min(repeat, s.maxAnimations),
        crit, damage, ...hit,
      };
    },

    likes(p, count) {
      s = getSettings();
      const damage = Math.min(s.maxLikeDamage, Math.max(1, Math.round((count || 1) * s.likeDamage)));
      const hit = apply(p, damage, false);
      if (hit.dealt) credit(p, hit.dealt);
      return { type: 'likes', user: p.user, login: p.login || '', avatar: p.avatar || '', count: count || 1, damage: hit.dealt, ...hit };
    },

    social(p, kind) {
      s = getSettings();
      const damage = kind === 'follow' ? s.followDamage : s.shareDamage;
      const hit = apply(p, damage, false);
      if (hit.dealt) credit(p, hit.dealt);
      return { type: 'social', kind, user: p.user, login: p.login || '', avatar: p.avatar || '', damage: hit.dealt, ...hit };
    },

    /** Вызывается раз в несколько секунд: если долго никто не бьёт, дракон понемногу лечится. */
    tick(dtMs) {
      s = getSettings();
      if (hp >= maxHp || now() - lastDamageAt < s.regenAfterSec * 1000) return null;
      const amount = Math.min(maxHp - hp, Math.max(1, Math.round(maxHp * s.regenPercentPerMin / 100 * dtMs / 60000)));
      hp += amount;
      return { type: 'heal', amount, hp, maxHp, level };
    },
  };
}
