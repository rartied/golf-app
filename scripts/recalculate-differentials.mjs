/**
 * One-time migration: recompute adjusted_gross_score and score_differential
 * for rounds that were saved before WHS par+5 cap was implemented.
 *
 * Affected rounds: those posted before the player had 54 holes (pre-establishment),
 * which previously used totalScore as AGS. WHS requires par+5 per-hole cap.
 *
 * Established rounds already used net double bogey — no change needed for those.
 */

const SUPABASE_URL = 'https://nqqzngabmuiyfkapfryt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcXpuZ2FibXVpeWZrYXBmcnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjM5OTUsImV4cCI6MjA5MzEzOTk5NX0.zdtNaJT92j8ICNd74abUprOXSsYMidWSDE-j_BsvfUE';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ─── WHS helpers (mirrors src/utils/handicap.js) ─────────────────────────────

function getHoleStrokes(courseHandicap, strokeIndex) {
  if (!strokeIndex || strokeIndex < 1) return 0;
  if (courseHandicap >= 0) {
    const full = Math.floor(courseHandicap / 18);
    const rem = courseHandicap % 18;
    return full + (strokeIndex <= rem ? 1 : 0);
  }
  return strokeIndex > 18 + courseHandicap ? -1 : 0;
}

function calcAdjustedGrossScore(holeScores, courseHandicap, holesPlayed = 18, established = true) {
  if (!established) {
    // WHS Rule 3.1 for unestablished: par + 5 max per hole
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

function calcCourseHandicap(handicapIndex, slope, courseRating, par) {
  return Math.round(handicapIndex * (slope / 113) + (courseRating - par));
}

function calcScoreDifferential(adjustedGrossScore, courseRating, slope, holesPlayed = 18) {
  if (holesPlayed === 9) {
    return parseFloat(((adjustedGrossScore - courseRating / 2) * 113 / slope).toFixed(1));
  }
  return parseFloat(((adjustedGrossScore - courseRating) * 113 / slope).toFixed(1));
}

const WHS_TABLE = [
  null, null, null,
  { count: 1, adj: -2.0 },
  { count: 1, adj: -1.0 },
  { count: 1, adj: 0 },
  { count: 2, adj: -1.0 },
  { count: 2, adj: 0 },
  { count: 2, adj: 0 },
  { count: 3, adj: 0 },
  { count: 3, adj: 0 },
  { count: 3, adj: 0 },
  { count: 4, adj: 0 },
  { count: 4, adj: 0 },
  { count: 4, adj: 0 },
  { count: 5, adj: 0 },
  { count: 5, adj: 0 },
  { count: 6, adj: 0 },
  { count: 6, adj: 0 },
  { count: 7, adj: 0 },
  { count: 8, adj: 0 },
];

function calcHandicapIndexFromDiffs(rounds) {
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

// ─── Fetch & migrate ──────────────────────────────────────────────────────────

async function fetchAllRounds() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rounds?select=*&order=date.asc`,
    { headers }
  );
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateRound(id, fields) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rounds?id=eq.${id}`,
    { method: 'PATCH', headers, body: JSON.stringify(fields) }
  );
  if (!res.ok) throw new Error(`Update failed for ${id}: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log('Fetching rounds from Supabase…');
  const rows = await fetchAllRounds();
  console.log(`Found ${rows.length} rounds.\n`);

  // Sort chronologically (already ordered, but be safe)
  rows.sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));

  let cumulativeHoles = 0;
  const correctedRounds = []; // store updated diffs for ongoing HI calc

  for (const row of rows) {
    const holesPlayed = row.holes_played ?? 18;
    const wasEstablished = cumulativeHoles >= 54;
    cumulativeHoles += holesPlayed;

    const holeScores = row.hole_scores ?? [];
    const hasHoleData = holeScores.length > 0 && holeScores.some(h => h.score > 0);

    // Build current handicap index from corrected rounds so far (for 9-hole combination)
    const currentHI = calcHandicapIndexFromDiffs(correctedRounds);

    if (!wasEstablished) {
      // Pre-establishment: should use par+5 cap, not totalScore
      if (!hasHoleData) {
        console.log(`[SKIP] ${row.date} — pre-established but no hole data, cannot recompute`);
        correctedRounds.push({ date: row.date, scoreDifferential: row.score_differential, holesPlayed });
        continue;
      }

      const newAGS = calcAdjustedGrossScore(holeScores, 0, holesPlayed, false);
      const newSD = calcScoreDifferential(newAGS, row.course_rating, row.slope, holesPlayed);

      const oldAGS = row.adjusted_gross_score;
      const oldSD = row.score_differential;

      if (Math.abs(newAGS - oldAGS) < 0.01 && Math.abs(newSD - oldSD) < 0.01) {
        console.log(`[OK]   ${row.date} — pre-established, no change (AGS=${newAGS}, SD=${newSD})`);
      } else {
        console.log(`[FIX]  ${row.date} — pre-established`);
        console.log(`       AGS: ${oldAGS} → ${newAGS}`);
        console.log(`       SD:  ${oldSD}  → ${newSD}`);
        await updateRound(row.id, {
          adjusted_gross_score: newAGS,
          score_differential: newSD,
        });
        console.log(`       ✓ Updated in Supabase`);
      }

      correctedRounds.push({ date: row.date, scoreDifferential: newSD, holesPlayed });
    } else {
      // Post-establishment: net double bogey was already correct — skip
      console.log(`[OK]   ${row.date} — established, SD=${row.score_differential} (no change)`);
      correctedRounds.push({ date: row.date, scoreDifferential: row.score_differential, holesPlayed });
    }
  }

  console.log('\nDone. Final Handicap Index (from corrected data):');
  const finalHI = calcHandicapIndexFromDiffs(correctedRounds);
  console.log(`  Handicap Index (base, no caps): ${finalHI}`);
}

main().catch(err => { console.error(err); process.exit(1); });
