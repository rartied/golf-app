// Per-round stat computations shared between PlayRound and Stats pages.
// Holes without explicit stat data (legacy rounds) are excluded from averages.

export function computeRoundStats(holes) {
  const withPutts   = holes.filter(h => h.putts != null);
  const withFairway = holes.filter(h => h.fairway != null && h.fairway !== 'na');
  const withGreen   = holes.filter(h => h.greenHit != null && h.greenHit !== 'na');

  const totalPutts    = withPutts.reduce((s, h) => s + h.putts, 0);
  const fairwaysHit   = withFairway.filter(h => h.fairway === 'hit').length;
  const greensHit     = withGreen.filter(h => h.greenHit === 'hit').length;
  const girHoles      = withGreen.filter(h =>
    h.greenHit === 'hit' && h.putts != null && (h.score - h.putts) <= (h.par - 2)
  );
  const girCount      = girHoles.length;
  const girPutts      = girHoles.reduce((s, h) => s + h.putts, 0);

  const fwBunkers    = holes.reduce((s, h) => s + (h.fairwayBunkers  ?? 0), 0);
  const gsBunkers    = holes.reduce((s, h) => s + (h.greensideBunkers ?? 0), 0);
  const chipShots    = holes.reduce((s, h) => s + (h.chipShots ?? 0), 0);

  // Up & down: hole where player chipped (≥1 chip) and then 1-putted
  const upAndDownAttempts = holes.filter(h => (h.chipShots ?? 0) >= 1).length;
  const upAndDowns        = holes.filter(h => (h.chipShots ?? 0) >= 1 && h.putts === 1).length;
  const waterHazards = holes.reduce((s, h) => s + (h.waterHazards ?? 0), 0);
  const outOfBounds  = holes.reduce((s, h) => s + (h.outOfBounds  ?? 0), 0);
  const dropShots    = holes.reduce((s, h) => s + (h.dropShots    ?? 0), 0);
  // Legacy rounds stored a single `penalties` field — include it in the total
  const penalties    = waterHazards + outOfBounds + dropShots +
    holes.reduce((s, h) => s + (h.penalties ?? 0), 0);
  const ballsLost    = holes.reduce((s, h) => s + (h.ballsLost ?? 0), 0);

  return {
    totalPutts,
    puttHoles:       withPutts.length,
    fairwaysHit,
    fairwayAttempts: withFairway.length,
    greensHit,
    greensAttempts:  withGreen.length,
    girCount,
    girPutts,
    totalHoles:      holes.length,
    fwBunkers,
    gsBunkers,
    chipShots,
    upAndDowns,
    upAndDownAttempts,
    waterHazards,
    outOfBounds,
    dropShots,
    penalties,
    ballsLost,
    hasData: withPutts.length > 0 || withGreen.length > 0,
  };
}
