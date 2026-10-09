// Логика "подарок -> наказание". Без зависимостей, чтобы легко тестировать.

/** Наказания, отсортированные от дешёвого к дорогому. */
export function sortedPunishments(config) {
  return [...config.punishments].sort((a, b) => a.price - b.price);
}

/**
 * Выбирает наказание для подарка.
 * 1) если имя подарка явно указано в `gifts` у наказания — берём его;
 * 2) иначе берём самое дорогое наказание, чья цена <= цене подарка.
 * Возвращает null, если подарок дешевле самого дешёвого наказания.
 */
export function resolvePunishment(config, { giftName, coins }) {
  const list = sortedPunishments(config);
  const name = (giftName || '').toLowerCase();
  if (name) {
    const byName = list.find(p => (p.gifts || []).some(g => g.toLowerCase() === name));
    if (byName) return byName;
  }
  let found = null;
  for (const p of list) {
    if (coins >= p.price) found = p;
  }
  return found;
}

/**
 * Превращает событие подарка в список ударов для очереди.
 * Серия из N одинаковых подарков = N ударов (но не больше maxRepeatPerGift).
 */
export function giftToHits(config, gift) {
  // Подарок не распознали (нет ни названия, ни цены) — всё равно наказываем самым дешёвым, а не игнорируем
  const fallback = !gift.giftName && !gift.coins
    ? config.punishments.find(p => p.id === (config.unknownGiftPunishment || 'egg'))
    : null;
  const punishment = fallback || resolvePunishment(config, gift);
  if (!punishment) return [];
  const max = Math.max(1, config.maxRepeatPerGift ?? 5);
  const count = Math.min(Math.max(1, gift.repeatCount || 1), max);
  return Array.from({ length: count }, (_, i) => ({
    punishmentId: punishment.id,
    user: gift.user || 'Аноним',
    login: gift.login || '',
    giftName: gift.giftName || '',
    coins: gift.coins,
    index: i + 1,
    total: count,
  }));
}

/**
 * TikTok шлёт серийные подарки (giftType 1) много раз, пока идёт серия,
 * и ещё раз с repeatEnd=true в конце. Засчитываем только финальное событие,
 * иначе одна серия из 3 роз дала бы 1+2+3 = 6 яиц.
 */
export function isFinalGiftEvent(data) {
  const giftType = data.giftDetails?.giftType;
  return !(giftType === 1 && !data.repeatEnd);
}

/**
 * Известные подарки TikTok по номеру (giftId). Бесплатное подключение часто присылает только номер,
 * без названия и цены — тогда берём их отсюда. Новые номера видны в Терминале как "id 1234".
 */
export const KNOWN_GIFTS = {
  5655: ['Rose', 1], 5269: ['TikTok', 1], 5827: ['Ice Cream Cone', 1], 6064: ['GG', 1], 7934: ['Heart Me', 1],
  5487: ['Finger Heart', 5], 9947: ['Friendship Necklace', 10], 5658: ['Perfume', 20], 5879: ['Doughnut', 30],
  6427: ['Hat and Mustache', 99], 5660: ['Hand Heart', 100], 5586: ['Hearts', 199], 5509: ['Sunglasses', 199],
  6267: ['Corgi', 299], 7168: ['Money Gun', 500], 11046: ['Galaxy', 1000], 6369: ['Lion', 29999],
};

/** Достаёт название подарка из текста события ("… sent Rose", "… отправил(а) Rose"). */
function giftNameFromText(data) {
  const texts = [
    data.common?.describe,
    data.common?.displayText?.defaultPattern,
    data.displayTextForAnchor?.defaultPattern,
    data.displayTextForAudience?.defaultPattern,
  ].filter(Boolean);
  for (const t of texts) {
    const m = String(t).match(/(?:sent|gifted|отправил[аи]?)\s+(?:the host\s+)?(?:\d+\s*x?\s*)?([A-Za-z][A-Za-z' ]{1,40})/i);
    if (m) return m[1].trim();
  }
  return '';
}

/** Нормализует сырое событие из tiktok-live-connector. */
export function normalizeTikTokGift(data) {
  const known = KNOWN_GIFTS[data.giftId];
  const giftName = data.giftDetails?.giftName || data.extendedGiftInfo?.name || known?.[0] || giftNameFromText(data);
  const coins = data.giftDetails?.diamondCount || data.extendedGiftInfo?.diamond_count || known?.[1] || 0;
  return {
    user: data.user?.nickname || data.user?.uniqueId || 'Аноним',
    login: data.user?.uniqueId || '',
    giftId: data.giftId || 0,
    giftName,
    coins,
    repeatCount: data.repeatCount || 1,
  };
}

/**
 * Похож ли ник на армянскую фамилию (…yan, …ian, …ян, …յան). Цифры и символы в конце ника игнорируются.
 * Шаблон можно поменять в config.json -> armenian.pattern.
 */
export function looksArmenian(config, ...names) {
  const pattern = new RegExp(config.armenian?.pattern || '(yan|ian|ян|յան)$', 'iu');
  return names.some(n => {
    const clean = String(n || '').replace(/[^\p{L}]+$/u, '');
    return clean.split(/[^\p{L}]+/u).some(part => pattern.test(part));
  });
}

/**
 * Считает, сколько НОВЫХ подарков принесло событие. TikTok шлёт серию (роза ×1, ×2, ×3, конец ×3)
 * отдельными событиями с растущим repeatCount — засчитываем только прирост, поэтому
 * яйца летят сразу по ходу серии, а итог не задваивается. Работает и без giftDetails.
 */
export function createStreakTracker(ttlMs = 15000) {
  const seen = new Map();
  return (data, now = Date.now()) => {
    for (const [k, v] of seen) if (now - v.t > ttlMs) seen.delete(k);
    const key = [data.user?.userId || data.user?.uniqueId || '', data.giftId || '', data.groupId || ''].join('|');
    const rc = data.repeatCount || 1;
    const delta = Math.max(0, rc - (seen.get(key)?.rc || 0));
    if (data.repeatEnd) seen.delete(key);
    else seen.set(key, { rc, t: now });
    return delta;
  };
}
