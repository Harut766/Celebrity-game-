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
  const punishment = resolvePunishment(config, gift);
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
  const giftType = data.gift?.type ?? data.giftDetails?.giftType;
  return !(giftType === 1 && !data.repeatEnd);
}

/**
 * Нормализует сырое событие из tiktok-live-connector.
 * Версия 2.x кладёт подарок в `gift` (name, diamondCount), старые версии — в `giftDetails`.
 */
export function normalizeTikTokGift(data) {
  return {
    user: data.user?.nickname || data.user?.uniqueId || 'Аноним',
    login: data.user?.uniqueId || '',
    giftName: data.gift?.name || data.giftDetails?.giftName || data.extendedGiftInfo?.name || '',
    coins: data.gift?.diamondCount || data.giftDetails?.diamondCount || data.extendedGiftInfo?.diamond_count || 0,
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
