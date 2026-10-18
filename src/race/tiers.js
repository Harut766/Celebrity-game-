// Уровни подарков: эффект выбирается по количеству монет (цена подарка × сколько штук пришло).
// Цены конкретных подарков не зашиты — только пороги из config.json → race.tiers.

export function sortedTiers(tiers) {
  return [...(tiers || [])].sort((a, b) => a.min - b.min);
}

/** Уровень для суммы монет (самый дорогой, чей порог ≤ монет). */
export function tierFor(tiers, coins) {
  const list = sortedTiers(tiers);
  let found = list[0] || null;
  for (const t of list) if (coins >= t.min) found = t;
  return found;
}

/**
 * Сила эффекта внутри уровня: подарок за 199 монет сильнее, чем за 100.
 * Растёт как корень и не больше чем ×2 от базовой силы уровня.
 */
export function tierPower(tier, coins) {
  if (!tier) return 1;
  return Math.min(2, Math.max(1, Math.sqrt(Math.max(coins, tier.min) / tier.min)));
}
