export type EnergyLevel = "low" | "normal" | "high";

const DAILY_CAPS: Record<EnergyLevel, number> = {
  low: 30,
  normal: 60,
  high: 90,
};

export function dailyCap(energyLevel: EnergyLevel = "normal"): number {
  return DAILY_CAPS[energyLevel];
}
