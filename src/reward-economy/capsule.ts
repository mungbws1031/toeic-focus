/**
 * 보상 캡슐 등급 추첨 (설계 스펙 §7).
 * 확률표: 일반 60% / 레어 25% / 에픽 10% / 전설 4% / 응원카드 1%
 * 누적 구간: [0, 0.60) common, [0.60, 0.85) rare, [0.85, 0.95) epic,
 *            [0.95, 0.99) legendary, [0.99, 1.0) cheerCard
 */
export type CapsuleRarity = "common" | "rare" | "epic" | "legendary" | "cheerCard";

export function openCapsule(rng: () => number): CapsuleRarity {
  const roll = rng();

  if (roll < 0.6) return "common";
  if (roll < 0.85) return "rare";
  if (roll < 0.95) return "epic";
  if (roll < 0.99) return "legendary";
  return "cheerCard";
}
