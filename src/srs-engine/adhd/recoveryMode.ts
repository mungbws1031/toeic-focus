const COMPRESSED_REVIEW_MAX = 40;
const NEW_LEARNING_LOCK_DAYS = 3;
const RECOVERY_TRIGGER_DAYS = 4;

export interface RecoveryPlan<T> {
  triggered: boolean;
  compressedReview: T[];
  newLearningLockDays: number;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calendarDayDiff(lastActiveDate: Date, now: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(now).getTime() - startOfDay(lastActiveDate).getTime()) / msPerDay);
}

export function evaluateRecovery<T>(
  lastActiveDate: Date,
  now: Date,
  overdueCardsSortedByForgetRisk: T[]
): RecoveryPlan<T> {
  const dayDiff = calendarDayDiff(lastActiveDate, now);

  if (dayDiff < RECOVERY_TRIGGER_DAYS) {
    return {
      triggered: false,
      compressedReview: [],
      newLearningLockDays: 0,
    };
  }

  return {
    triggered: true,
    compressedReview: overdueCardsSortedByForgetRisk.slice(0, COMPRESSED_REVIEW_MAX),
    newLearningLockDays: NEW_LEARNING_LOCK_DAYS,
  };
}
