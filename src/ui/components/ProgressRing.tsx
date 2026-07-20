export interface ProgressRingProps {
  /** 진행률(0~1). 범위를 벗어나면 clamp된다. */
  progress: number;
  /** 원형 게이지의 지름(px). */
  size?: number;
  /** 스트로크 두께(px). */
  strokeWidth?: number;
  /** 중앙에 작게 표시할 보조 텍스트. 숫자 타이머를 크게 강조하지 않기 위해 선택적으로만 사용한다. */
  label?: string;
  /** 진행 스트로크 색상. */
  color?: string;
}

function clampProgress(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * 진행률/남은 시간을 숫자가 아닌 줄어드는 도형(원형 게이지)으로 표시하는 공용 컴포넌트.
 * 설계 원칙: "모든 시간은 숫자가 아니라 줄어드는 도형으로 표시" — SVG 게이지가 시각적 주인공이고,
 * label은 어디까지나 보조 텍스트다.
 */
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  label,
  color = "#4f46e5",
}: ProgressRingProps) {
  const clamped = clampProgress(progress);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {label !== undefined && (
        <span
          style={{
            position: "absolute",
            fontSize: size * 0.14,
            color: "#6b7280",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
