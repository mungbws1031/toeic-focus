import { ProgressRing } from "../components/ProgressRing";

export interface HomeScreenProps {
  /** "지금 3분" 버튼을 눌렀을 때 호출된다. 엔진이 고른 3분짜리 마이크로 세션을 즉시 시작시킨다. */
  onStart: () => void;
  /** 오늘 목표 대비 진행률(0~1). */
  todayProgress: number;
  /** 실력 진단(미니모의) 완료 여부. false면 진단 유도 버튼을 함께 보여준다. */
  diagnosisCompleted: boolean;
  /** "내 실력 진단하기" 버튼을 눌렀을 때 호출된다. */
  onStartDiagnosis?: () => void;
  /** "굿나잇 2분" 버튼을 눌렀을 때 호출된다. 오늘 학습한 카드가 있을 때만 노출된다. */
  onStartGoodnight?: () => void;
  /** "오늘의 한 문장" 버튼을 눌렀을 때 호출된다. */
  onStartSentenceLens?: () => void;
}

/**
 * 홈 화면 = 큰 버튼 하나 + 오늘의 진행 링. 그 외 아무것도 없다. 스크롤이 생기지 않는다.
 * (설계 스펙 §3.1 "3분 스타트", §6 "3화면 원칙")
 */
export function HomeScreen({
  onStart,
  todayProgress,
  diagnosisCompleted,
  onStartDiagnosis,
  onStartGoodnight,
  onStartSentenceLens,
}: HomeScreenProps) {
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        overflow: "hidden",
      }}
    >
      <ProgressRing progress={todayProgress} size={160} />
      <button
        type="button"
        onClick={onStart}
        style={{
          fontSize: 24,
          fontWeight: 700,
          padding: "20px 48px",
          borderRadius: 999,
          border: "none",
          background: "#4f46e5",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        지금 3분
      </button>
      {!diagnosisCompleted && (
        <button
          type="button"
          onClick={onStartDiagnosis}
          style={{
            fontSize: 14,
            padding: "8px 16px",
            border: "none",
            background: "transparent",
            color: "#6b7280",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          내 실력 진단하기(5분)
        </button>
      )}
      <button
        type="button"
        onClick={onStartSentenceLens}
        style={{
          fontSize: 14,
          padding: "8px 16px",
          border: "none",
          background: "transparent",
          color: "#6b7280",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        오늘의 한 문장
      </button>
      {todayProgress > 0 && (
        <button
          type="button"
          onClick={onStartGoodnight}
          style={{
            fontSize: 14,
            padding: "8px 16px",
            border: "none",
            background: "transparent",
            color: "#6b7280",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          굿나잇 2분
        </button>
      )}
    </div>
  );
}
