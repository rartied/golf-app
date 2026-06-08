// World Handicap System (WHS 2024) calculations

// Best differentials to use based on number of scores in record
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

// WHS Rule 5: a Handicap Index is established once 54 holes have been played/posted.
export function isHandicapEstablished(rounds) {
  return rounds.reduce((s, r) => s + (r.holesPlayed ?? 18), 0) >= 54;
}

// Returns approximate 18-hole rounds still needed to reach 54 holes.
export function roundsNeededForHandicap(rounds) {
  const holesPlayed = rounds.reduce((s, r) => s + (r.holesPlayed ?? 18), 0);
  return Math.max(0, Math.ceil((54 - holesPlayed) / 18));
}

// Score Differential = (113 / Slope) × (AGS − Course Rating)
// 9-hole: combine 9-hole SD with expected SD (HI / 2 + 1.5) per WHS 2024.
// Expected score not applied until HI is established (handicapIndex will be null before then).
export function calcScoreDifferential(adjustedGrossScore, courseRating, slope, holesPlayed = 18, handicapIndex = null) {
  if (holesPlayed === 9) {
    const nineHoleSD = parseFloat(((adjustedGrossScore - courseRating / 2) * 113 / slope).toFixed(1));
    if (handicapIndex !== null) {
      const expectedSD = parseFloat((handicapIndex / 2 + 1.5).toFixed(1));
      return parseFloat((nineHoleSD + expectedSD).toFixed(1));
    }
    return nineHoleSD;
  }
  return parseFloat(((adjustedGrossScore - courseRating) * 113 / slope).toFixed(1));
}

// Internal base HI — no exceptional adjustment, no soft/hard cap.
// Used by Low HI and exceptional score checks to avoid circular dependency.
function calcHandicapIndexBase(rounds) {
  const recent = [...rounds]
    .sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'))
    .slice(0, 20);
  const n = recent.length;
  const entry = WHS_TABLE[Math.min(n, 20)];
  if (!entry) return null;
  const sorted = recent.map(r => r.scoreDifferential).sort((a, b) => a - b);
  const best = sorted.slice(0, entry.count);
  const avg = best.reduce((s, d) => s + d, 0) / entry.count;
  return parseFloat(((avg + entry.adj) * 0.96).toFixed(1));
}

// WHS Rule 5.7: Low HI is the lowest Handicap Index achieved in the 365 days
// preceding the most recent score. Only established once 20 scores exist.
export function calcLowHandicapIndex(rounds) {
  if (rounds.length < 20) return null;
  const chrono = [...rounds].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
  const refDate = new Date(chrono[chrono.length - 1].date + 'T00:00:00');
  const cutoff = new Date(refDate);
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  let lowHI = null;
  for (let i = 0; i < chrono.length; i++) {
    if (new Date(chrono[i].date + 'T00:00:00') < cutoff) continue;
    const hi = calcHandicapIndexBase(chrono.slice(0, i + 1));
    if (hi !== null && (lowHI === null || hi < lowHI)) lowHI = hi;
  }
  return lowHI;
}

// Full WHS Handicap Index calculation (Rule 5):
// 1. 54-hole minimum to establish
// 2. Best N of 20 with 0.96 multiplier
// 3. Exceptional score reduction (Rule 5.9)
// 4. Soft cap + hard cap vs Low HI (Rule 5.8)
// 5. Maximum 54.0
export function calcHandicapIndex(rounds) {
  if (!isHandicapEstablished(rounds)) return null;

  const allChrono = [...rounds].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
  const recent = allChrono.slice(-20);
  const n = recent.length;
  const entry = WHS_TABLE[Math.min(n, 20)];
  if (!entry) return null;

  // Exceptional score reduction (Rule 5.9):
  // For each round in the recent 20, compare its SD against the HI before it was posted.
  // If the round is 7+ strokes better, apply −1 (or −2 if 10+) to all 20 differentials cumulatively.
  let totalExceptionalAdj = 0;
  for (const round of recent) {
    const idx = allChrono.indexOf(round);
    const priorHI = calcHandicapIndexBase(allChrono.slice(0, idx));
    if (priorHI === null) continue;
    const gap = priorHI - round.scoreDifferential; // positive = better than HI
    if (gap >= 10.0) totalExceptionalAdj += 2;
    else if (gap >= 7.0) totalExceptionalAdj += 1;
  }

  const adjustedDiffs = recent.map(r => r.scoreDifferential - totalExceptionalAdj);
  const sorted = [...adjustedDiffs].sort((a, b) => a - b);
  const best = sorted.slice(0, entry.count);
  const avg = best.reduce((s, d) => s + d, 0) / entry.count;
  const uncapped = parseFloat(((avg + entry.adj) * 0.96).toFixed(1));

  // Soft cap and hard cap vs Low HI (Rule 5.8):
  // Low HI only applies once the player has 20 scores.
  const lowHI = calcLowHandicapIndex(rounds);
  let result = uncapped;
  if (lowHI !== null && uncapped > lowHI + 3.0) {
    // Soft cap: only 50% of increase beyond Low HI + 3.0
    result = parseFloat((lowHI + 3.0 + 0.5 * (uncapped - (lowHI + 3.0))).toFixed(1));
  }
  if (lowHI !== null) {
    // Hard cap: cannot exceed Low HI + 5.0
    result = Math.min(result, parseFloat((lowHI + 5.0).toFixed(1)));
  }

  return Math.min(parseFloat(result.toFixed(1)), 54.0);
}

export function calcCourseHandicap(handicapIndex, slope, courseRating, par) {
  return Math.round(handicapIndex * (slope / 113) + (courseRating - par));
}

// How many extra strokes received on a hole based on stroke index
export function getHoleStrokes(courseHandicap, strokeIndex) {
  if (!strokeIndex || strokeIndex < 1) return 0;
  if (courseHandicap >= 0) {
    const full = Math.floor(courseHandicap / 18);
    const rem = courseHandicap % 18;
    return full + (strokeIndex <= rem ? 1 : 0);
  }
  return strokeIndex > 18 + courseHandicap ? -1 : 0;
}

// WHS Rule 3.1:
// Established players → net double bogey (par + 2 + handicap strokes) per hole
// Unestablished players → par + 5 per hole
export function calcAdjustedGrossScore(holeScores, courseHandicap, holesPlayed = 18, established = true) {
  if (!established) {
    return holeScores.reduce((total, hole) => {
      return total + Math.min(hole.score > 0 ? hole.score : hole.par, hole.par + 5);
    }, 0);
  }
  const effectiveHandicap = holesPlayed === 9 ? Math.round(courseHandicap / 2) : courseHandicap;
  return holeScores.reduce((total, hole) => {
    const strokes = getHoleStrokes(effectiveHandicap, hole.strokeIndex || 0);
    const max = hole.par + 2 + strokes;
    return total + (hole.score > 0 ? Math.min(hole.score, max) : hole.par);
  }, 0);
}

export function getHandicapTrend(rounds) {
  const sorted = [...rounds].sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));
  const current = calcHandicapIndex(sorted);
  const previous = calcHandicapIndex(sorted.slice(1));
  if (current === null || previous === null) return null;
  return parseFloat((current - previous).toFixed(1));
}
