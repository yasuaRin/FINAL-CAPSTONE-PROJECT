// features.js - ES Module version

export function rollingMean(arr, window) {
  return arr.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function rollingStd(arr, window) {
  return arr.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    if (slice.length < 2) return 0;
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / slice.length;
    return Math.sqrt(variance);
  });
}

export function shiftArray(arr, lag) {
  return arr.map((_, i) => (i < lag ? 0 : arr[i - lag]));
}

export function engineerFeatures(dailyRows) {
  const revenues = dailyRows.map(r => r.revenue);
  const viewers = dailyRows.map(r => r.viewers);
  const sessions = dailyRows.map(r => r.sessions);
  const likes = dailyRows.map(r => r.likes);

  const revenueShifted = shiftArray(revenues, 1);
  const rm3 = rollingMean(revenueShifted, 3);
  const rm7 = rollingMean(revenueShifted, 7);
  const rs3 = rollingStd(revenueShifted, 3);
  const lag1 = shiftArray(revenues, 1);
  const lag7 = shiftArray(revenues, 7);

  return dailyRows.map((row, i) => {
    const d = new Date(row.date);
    return {
      dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1,
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      dayIndex: i,
      revRollingMean3: rm3[i],
      revRollingMean7: rm7[i],
      revRollingStd3: rs3[i],
      revLag1: lag1[i],
      revLag7: lag7[i],
      sessions: row.sessions,
      viewers: row.viewers,
      likes: row.likes,
      revPerSession: row.sessions > 0 ? row.revenue / row.sessions : 0,
      revPerViewer: row.viewers > 0 ? row.revenue / row.viewers : 0,
    };
  });
}

export const FEATURE_KEYS = [
  'dayOfWeek', 'dayOfMonth', 'month', 'dayIndex',
  'revRollingMean3', 'revRollingMean7', 'revRollingStd3',
  'revLag1', 'revLag7',
  'sessions', 'viewers', 'likes',
  'revPerSession', 'revPerViewer',
];

export function toMatrix(featureRows, keys = FEATURE_KEYS) {
  return featureRows.map(row => keys.map(k => row[k] ?? 0));
}