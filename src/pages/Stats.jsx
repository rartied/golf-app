import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { computeRoundStats } from '../utils/roundStats';

function StatCard({ label, value, sub, improving }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex flex-col">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {improving != null && (
        <p className={`text-xs font-semibold mt-1 ${improving ? 'text-green-600' : 'text-red-500'}`}>
          {improving ? 'improving' : 'declining'}
        </p>
      )}
    </div>
  );
}

function RecordRow({ label, value, sub, roundId, navigate }) {
  return (
    <button
      onClick={() => roundId && navigate(`/history/${roundId}`)}
      className="w-full px-4 py-3 flex items-center justify-between active:bg-gray-50 transition-colors text-left"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <p className="font-bold text-golf-green">{value ?? '—'}</p>
        {roundId && <ChevronRight size={14} className="text-gray-300" />}
      </div>
    </button>
  );
}

export default function Stats({ rounds }) {
  const navigate = useNavigate();

  const enriched = useMemo(() => {
    return rounds
      .filter(r => r.holeScores?.length >= 9)
      .map(r => ({ ...r, stats: computeRoundStats(r.holeScores) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [rounds]);

  const withPutts   = enriched.filter(r => r.stats.puttHoles > 0);
  const withFairway = enriched.filter(r => r.stats.fairwayAttempts > 0);
  const withGreen   = enriched.filter(r => r.stats.greensAttempts > 0);
  const withStats   = enriched.filter(r => r.stats.hasData);

  function avg(arr, fn) {
    if (!arr.length) return null;
    return arr.reduce((s, r) => s + fn(r), 0) / arr.length;
  }

  function trendImproving(arr, fn, lowerIsBetter) {
    if (arr.length < 6) return null;
    const last5 = arr.slice(-5);
    const prev5 = arr.slice(-10, -5);
    if (!prev5.length) return null;
    const recent = avg(last5, fn);
    const prior  = avg(prev5, fn);
    if (recent == null || prior == null) return null;
    const delta = recent - prior;
    if (Math.abs(delta) < 0.01) return null;
    return lowerIsBetter ? delta < 0 : delta > 0;
  }

  const withChips    = enriched.filter(r => r.stats.upAndDownAttempts > 0);

  const avgPutts      = avg(withPutts, r => r.stats.totalPutts);
  const avgGIR        = avg(withGreen, r => (r.stats.girCount / r.stats.greensAttempts) * 100);
  const avgFW         = avg(withFairway, r => (r.stats.fairwaysHit / r.stats.fairwayAttempts) * 100);
  const avgFWBnkr     = avg(withStats, r => r.stats.fwBunkers);
  const avgGSBnkr     = avg(withStats, r => r.stats.gsBunkers);
  const avgPenalties  = avg(withStats, r => r.stats.penalties);
  const avgUpDown     = avg(withChips, r => (r.stats.upAndDowns / r.stats.upAndDownAttempts) * 100);

  const upDownImproving = trendImproving(withChips, r => r.stats.upAndDowns / r.stats.upAndDownAttempts, false);

  const puttImproving = trendImproving(withPutts, r => r.stats.totalPutts, true);
  const girImproving  = trendImproving(withGreen, r => r.stats.girCount / r.stats.greensAttempts, false);
  const fwImproving   = trendImproving(withFairway, r => r.stats.fairwaysHit / r.stats.fairwayAttempts, false);

  // Personal records
  const bestPuttRound = withPutts.length
    ? withPutts.reduce((best, r) => r.stats.totalPutts < best.stats.totalPutts ? r : best)
    : null;
  const bestGIRRound = withGreen.length
    ? withGreen.reduce((best, r) => r.stats.girCount > best.stats.girCount ? r : best)
    : null;
  const mostFWRound = withFairway.length
    ? withFairway.reduce((best, r) => r.stats.fairwaysHit > best.stats.fairwaysHit ? r : best)
    : null;

  const rounds18 = rounds.filter(r => (r.holesPlayed ?? 18) === 18);
  const rounds9  = rounds.filter(r => r.holesPlayed === 9);

  const bestDiff    = rounds.length
    ? rounds.reduce((best, r) => r.scoreDifferential < best.scoreDifferential ? r : best)
    : null;
  const best18Score = rounds18.length
    ? rounds18.reduce((best, r) => r.totalScore < best.totalScore ? r : best)
    : null;
  const best9Score  = rounds9.length
    ? rounds9.reduce((best, r) => (r.totalScore - r.coursePar) < (best.totalScore - best.coursePar) ? r : best)
    : null;

  const hasAnyStats = withStats.length > 0;

  function scoreLine(r) {
    const d = r.totalScore - r.coursePar;
    return `${r.totalScore} (${d === 0 ? 'E' : d > 0 ? `+${d}` : d})`;
  }

  function roundSub(r) {
    return `${r.courseName} · ${format(new Date(r.date + 'T00:00:00'), 'MMM d, yyyy')}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {withStats.length > 0
            ? `${withStats.length} round${withStats.length !== 1 ? 's' : ''} with stat data`
            : `${rounds.length} round${rounds.length !== 1 ? 's' : ''} played`}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!hasAnyStats ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-600 font-medium">No stat data yet</p>
            <p className="text-gray-400 text-sm mt-1">Track fairways, greens, and putts on your next round</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Averages</h2>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Putts / Round"
                  value={avgPutts != null ? avgPutts.toFixed(1) : null}
                  sub={withPutts.length < rounds.length ? `${withPutts.length} rounds` : null}
                  improving={puttImproving}
                />
                <StatCard
                  label="GIR %"
                  value={avgGIR != null ? `${avgGIR.toFixed(0)}%` : null}
                  sub={withGreen.length < rounds.length ? `${withGreen.length} rounds` : null}
                  improving={girImproving}
                />
                <StatCard
                  label="Fairways Hit"
                  value={avgFW != null ? `${avgFW.toFixed(0)}%` : null}
                  sub={withFairway.length < rounds.length ? `${withFairway.length} rounds` : null}
                  improving={fwImproving}
                />
                <StatCard
                  label="GS Bunkers / Rnd"
                  value={avgGSBnkr != null ? avgGSBnkr.toFixed(1) : null}
                />
                <StatCard
                  label="FW Bunkers / Rnd"
                  value={avgFWBnkr != null ? avgFWBnkr.toFixed(1) : null}
                />
                <StatCard
                  label="Penalties / Rnd"
                  value={avgPenalties != null ? avgPenalties.toFixed(1) : null}
                />
                <StatCard
                  label="Up & Down %"
                  value={avgUpDown != null ? `${avgUpDown.toFixed(0)}%` : null}
                  sub={withChips.length > 0 ? `${withChips.length} rounds` : null}
                  improving={upDownImproving}
                />
              </div>
            </div>
          </>
        )}

        {/* Personal records — always shown if any rounds exist */}
        {rounds.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Personal Records</h2>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {bestDiff && (
                <RecordRow
                  label="Best Differential"
                  value={bestDiff.scoreDifferential.toFixed(1)}
                  sub={roundSub(bestDiff)}
                  roundId={bestDiff.id}
                  navigate={navigate}
                />
              )}
              {best18Score && (
                <RecordRow
                  label="Best 18-Hole Score"
                  value={scoreLine(best18Score)}
                  sub={roundSub(best18Score)}
                  roundId={best18Score.id}
                  navigate={navigate}
                />
              )}
              {best9Score && (
                <RecordRow
                  label="Best 9-Hole Score"
                  value={scoreLine(best9Score)}
                  sub={roundSub(best9Score)}
                  roundId={best9Score.id}
                  navigate={navigate}
                />
              )}
              {bestPuttRound && (
                <RecordRow
                  label="Best Putting Round"
                  value={`${bestPuttRound.stats.totalPutts} putts`}
                  sub={roundSub(bestPuttRound)}
                  roundId={bestPuttRound.id}
                  navigate={navigate}
                />
              )}
              {bestGIRRound && (
                <RecordRow
                  label="Best GIR Round"
                  value={`${bestGIRRound.stats.girCount}/${bestGIRRound.stats.greensAttempts}`}
                  sub={roundSub(bestGIRRound)}
                  roundId={bestGIRRound.id}
                  navigate={navigate}
                />
              )}
              {mostFWRound && (
                <RecordRow
                  label="Most Fairways Hit"
                  value={`${mostFWRound.stats.fairwaysHit}/${mostFWRound.stats.fairwayAttempts}`}
                  sub={roundSub(mostFWRound)}
                  roundId={mostFWRound.id}
                  navigate={navigate}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
