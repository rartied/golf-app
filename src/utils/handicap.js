// World Handicap System (WHS) calculations

// Best differentials to use based on number of rounds
const WHS_TABLE = [
  null, null, null,            // 0-2: not enough
  { count: 1, adj: -2.0 },    // 3
  { count: 1, adj: -1.0 },    // 4
  { count: 1, adj: 0 },       // 5
  { count: 2, adj: -1.0 },    // 6
  { count: 2, adj: 0 },       // 7
  { count: 2, adj: 0 },       // 8
  { count: 3, adj: 0 },       // 9
  { count: 3, adj: 0 },       // 10
  { count: 3, adj: 0 },       // 11
  { count: 4, adj: 0 },       // 12
  { count: 4, adj: 0 },       // 13
  { count: 4, adj: 0 },       // 14
  { count: 5, adj: 0 },       // 15
  { count: 5, adj: 0 },       // 16
  { count: 6, adj: 0 },       // 17
  { count: 6, adj: 0 },       // 18
  { count: 7, adj: 0 },       // 19
  { count: 8, adj: 0 },       // 20
];

export function calcScoreDifferential(adjustedGrossScore, courseRating, slope) {
  return parseFloat(((adjustedGrossScore - courseRating) * 113 / slope).toFixed(1));
}

export function calcHandicapIndex(rounds) {
  const recent = [...rounds]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);
  const n = recent.length;
  if (n < 3) return null;

  const entry = WHS_TABLE[Math.min(n, 20)];
  const sorted = recent.map(r => r.scoreDifferential).sort((a, b) => a - b);
  const best = sorted.slice(0, entry.count);
  const avg = best.reduce((s, d) => s + d, 0) / entry.count;
  return Math.min(parseFloat(((avg + entry.adj) * 0.96).toFixed(1)), 54.0);
}

export function calcCourseHandicap(handicapIndex, slope, courseRating, par) {
  return Math.round(handicapIndex * (slope / 113) + (courseRating - par));
}

// How many extra strokes on a given hole based on its stroke index (1=hardest)
export function getHoleStrokes(courseHandicap, strokeIndex) {
  if (!strokeIndex || strokeIndex < 1) return 0;
  if (courseHandicap >= 0) {
    const full = Math.floor(courseHandicap / 18);
    const rem = courseHandicap % 18;
    return full + (strokeIndex <= rem ? 1 : 0);
  }
  // Plus handicap (better than scratch)
  return strokeIndex > 18 + courseHandicap ? -1 : 0;
}

// WHS: cap each hole at net double bogey for adjusted gross score
export function calcAdjustedGrossScore(holeScores, courseHandicap) {
  return holeScores.reduce((total, hole) => {
    const strokes = getHoleStrokes(courseHandicap, hole.strokeIndex || 0);
    const max = hole.par + 2 + strokes;
    return total + (hole.score > 0 ? Math.min(hole.score, max) : hole.par); // use par if score missing
  }, 0);
}

export function roundsNeededForHandicap(rounds) {
  return Math.max(0, 3 - rounds.length);
}

export function getHandicapTrend(rounds) {
  if (rounds.length < 6) return null;
  const sorted = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent5 = sorted.slice(0, 5).map(r => r.scoreDifferential);
  const prev5 = sorted.slice(5, 10).map(r => r.scoreDifferential);
  if (prev5.length < 3) return null;
  const avgRecent = recent5.reduce((s, d) => s + d, 0) / recent5.length;
  const avgPrev = prev5.reduce((s, d) => s + d, 0) / prev5.length;
  return avgRecent - avgPrev; // negative = improving
}
