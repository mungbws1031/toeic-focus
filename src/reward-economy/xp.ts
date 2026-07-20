/**
 * XP/콤보 경제 — 정답 시 즉각 XP 지급, 콤보에 따라 배율 상승.
 * 콤보 5/10/20에서 ×1.2/×1.5/×2.0 배율 적용, 오답 시 콤보 리셋.
 */
const BASE_XP = 10;

export interface XpState {
  totalXp: number;
  combo: number;
}

export function initXpState(): XpState {
  return { totalXp: 0, combo: 0 };
}

function comboMultiplier(combo: number): number {
  if (combo >= 20) return 2.0;
  if (combo >= 10) return 1.5;
  if (combo >= 5) return 1.2;
  return 1.0;
}

export function recordAnswer(
  state: XpState,
  wasCorrect: boolean
): { nextState: XpState; xpGained: number } {
  if (!wasCorrect) {
    return {
      nextState: { totalXp: state.totalXp, combo: 0 },
      xpGained: 0,
    };
  }

  const nextCombo = state.combo + 1;
  const multiplier = comboMultiplier(nextCombo);
  const xpGained = Math.round(BASE_XP * multiplier);

  return {
    nextState: { totalXp: state.totalXp + xpGained, combo: nextCombo },
    xpGained,
  };
}

export function levelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}
