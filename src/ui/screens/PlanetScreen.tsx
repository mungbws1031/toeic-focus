import { levelFromXp } from "../../reward-economy/xp";
import { ProgressRing } from "../components/ProgressRing";

export interface PlanetScreenProps {
  /** XP/콤보 경제 상태. 레벨 계산과 총 XP 표시에 쓰인다. */
  xpState: { totalXp: number; combo: number };
  /** 오늘 목표 대비 진행률(0~1). */
  todayProgress: number;
}

/**
 * 내 행성 화면(MVP 최소버전) — 풀 시각화(지형·위성)는 V1으로 미루고,
 * XP·레벨·오늘 진행률만 보여준다. 레벨에 따라 배경색이 조금씩 달라져
 * "행성이 자란다"는 콘셉트만 암시한다. (설계 스펙 §6, §9)
 */
export function PlanetScreen({ xpState, todayProgress }: PlanetScreenProps) {
  const level = levelFromXp(xpState.totalXp);
  const hue = 220 + ((level * 12) % 140);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        overflow: "hidden",
        background: `hsl(${hue}, 60%, 96%)`,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: `hsl(${hue}, 70%, 55%)`,
        }}
        aria-hidden="true"
      />
      <div style={{ fontSize: 20, fontWeight: 700 }}>Lv. {level}</div>
      <div style={{ fontSize: 14, color: "#6b7280" }}>
        총 {xpState.totalXp} XP
      </div>
      <ProgressRing
        progress={todayProgress}
        size={120}
        label={`오늘 ${Math.round(todayProgress * 100)}%`}
      />
    </div>
  );
}
