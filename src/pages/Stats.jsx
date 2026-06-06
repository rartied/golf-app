import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { computeRoundStats } from '../utils/roundStats';

function smoothCurve(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cx = (p1.x - p0.x) / 2.5;
    d += ` C${(p0.x + cx).toFixed(1)},${p0.y.toFixed(1)} ${(p1.x - cx).toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

function StatCard({ label, value, sub, improving, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl shadow-card px-4 py-3 flex flex-col text-left w-full transition-colors ${onClick ? 'active:bg-gray-50' : 'pointer-events-none'}`}
    >
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {improving != null && (
        <p className={`text-xs font-semibold mt-1 ${improving ? 'text-green-600' : 'text-red-500'}`}>
          {improving ? 'improving' : 'declining'}
        </p>
      )}
    </button>
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
        <p className="font-bold text-ink">{value ?? '—'}</p>
        {roundId && <ChevronRight size={14} className="text-gray-300" />}
      </div>
    </button>
  );
}

function TrendSheet({ config, onClose }) {
  const { label, points, avg, fmt, improving } = config;
  if (!points || points.length < 2) return null;

  const VW = 320, VH = 130;
  const PL = 8, PR = 8, PT = 16, PB = 28;
  const iW = VW - PL - PR;
  const iH = VH - PT - PB;

  const vals = points.map(p => p.v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const lo2 = lo - span * 0.3;
  const hi2 = hi + span * 0.3;
  const sp2 = hi2 - lo2;

  const px = i => PL + (i / Math.max(points.length - 1, 1)) * iW;
  const py = v => PT + (1 - (v - lo2) / sp2) * iH;

  const svgPts = points.map((p, i) => ({ x: px(i), y: py(p.v) }));
  const path = smoothCurve(svgPts);
  const avgY = py(avg);
  const last = svgPts[svgPts.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8 safe-pb">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-1">
          <p className="text-lg font-bold text-gray-900">{label}</p>
          <button onClick={onClose} className="text-gray-400 p-1 text-lg leading-none">✕</button>
        </div>
        <div className="flex items-baseline gap-2 mb-5">
          <p className="text-3xl font-black text-gray-900">{fmt(avg)}</p>
          <p className="text-sm text-gray-400">career avg</p>
          {improving != null && (
            <span className={`text-xs font-semibold ${improving ? 'text-green-600' : 'text-red-500'}`}>
              {improving ? '↑ improving' : '↓ declining'}
            </span>
          )}
        </div>

        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ overflow: 'visible' }}>
          <line x1={PL} y1={avgY.toFixed(1)} x2={VW - PR} y2={avgY.toFixed(1)}
            stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4,4" />
          <path d={path} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {svgPts.map((p, i) => (
            <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3"
              fill="white" stroke="#000000" strokeWidth="1.5" />
          ))}
          <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="5" fill="#000000" />
          <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2.5" fill="white" />
          <text x={PL} y={VH} fontSize="9" fill="#9ca3af">
            {format(new Date(points[0].date + 'T00:00:00'), 'MMM d')}
          </text>
          <text x={VW - PR} y={VH} fontSize="9" fill="#9ca3af" textAnchor="end">
            {format(new Date(points[points.length - 1].date + 'T00:00:00'), 'MMM d')}
          </text>
        </svg>

        <div className="mt-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Rounds</p>
          <div className="space-y-1">
            {[...points].reverse().slice(0, 5).map((p, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <p className="text-xs text-gray-500">{format(new Date(p.date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                <p className="text-sm font-semibold text-gray-900">{fmt(p.v)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Stats({ rounds }) {
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState(null);

  const allRounds = rounds;

  const enriched = useMemo(() => {
    return allRounds
      .filter(r => r.holeScores?.length >= 9)
      .map(r => ({ ...r, stats: computeRoundStats(r.holeScores) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allRounds]);

  const withPutts   = enriched.filter(r => r.stats.puttHoles > 0);
  const withFairway = enriched.filter(r => r.stats.fairwayAttempts > 0);
  const withGreen   = enriched.filter(r => r.stats.greensAttempts > 0);
  const withStats   = enriched.filter(r => r.stats.hasData);
  const withChips   = enriched.filter(r => r.stats.upAndDownAttempts > 0);
  const withGIR     = enriched.filter(r => r.stats.girCount > 0);

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

  const avgPutts        = avg(withPutts,   r => r.stats.totalPutts);
  const avgGIR          = avg(withGreen,   r => (r.stats.girCount / r.stats.greensAttempts) * 100);
  const avgFW           = avg(withFairway, r => (r.stats.fairwaysHit / r.stats.fairwayAttempts) * 100);
  const avgFWBnkr       = avg(withStats,   r => r.stats.fwBunkers);
  const avgGSBnkr       = avg(withStats,   r => r.stats.gsBunkers);
  const avgPenalties    = avg(withStats,   r => r.stats.penalties);
  const avgUpDown       = avg(withChips,   r => (r.stats.upAndDowns / r.stats.upAndDownAttempts) * 100);
  const avgPuttsPerGIR  = avg(withGIR,    r => r.stats.girPutts / r.stats.girCount);

  const puttImproving     = trendImproving(withPutts,   r => r.stats.totalPutts, true);
  const girImproving      = trendImproving(withGreen,   r => r.stats.girCount / r.stats.greensAttempts, false);
  const fwImproving       = trendImproving(withFairway, r => r.stats.fairwaysHit / r.stats.fairwayAttempts, false);
  const upDownImproving   = trendImproving(withChips,   r => r.stats.upAndDowns / r.stats.upAndDownAttempts, false);
  const girPuttImproving  = trendImproving(withGIR,     r => r.stats.girPutts / r.stats.girCount, true);

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

  const rounds18 = allRounds.filter(r => (r.holesPlayed ?? 18) === 18);
  const rounds9  = allRounds.filter(r => r.holesPlayed === 9);

  const bestDiff    = allRounds.length
    ? allRounds.reduce((best, r) => r.scoreDifferential < best.scoreDifferential ? r : best)
    : null;
  const best18Score = rounds18.length
    ? rounds18.reduce((best, r) => r.totalScore < best.totalScore ? r : best)
    : null;
  const best9Score  = rounds9.length
    ? rounds9.reduce((best, r) => (r.totalScore - r.coursePar) < (best.totalScore - best.coursePar) ? r : best)
    : null;

  const hasAnyStats = withStats.length > 0;

  // Last round vs previous round
  const sorted = [...enriched].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastRound = sorted[0] ?? null;
  const prevRound = sorted[1] ?? null;

  function scoreLine(r) {
    const d = r.totalScore - r.coursePar;
    return `${r.totalScore} (${d === 0 ? 'E' : d > 0 ? `+${d}` : d})`;
  }

  function roundSub(r) {
    return `${r.courseName} · ${format(new Date(r.date + 'T00:00:00'), 'MMM d, yyyy')}`;
  }

  function delta(last, prev, fn, lowerIsBetter) {
    const lv = fn(last), pv = fn(prev);
    if (lv == null || pv == null) return null;
    const d = lv - pv;
    if (Math.abs(d) < 0.05) return { label: '—', color: 'text-gray-400' };
    const better = lowerIsBetter ? d < 0 : d > 0;
    return {
      label: (d > 0 ? '+' : '') + d.toFixed(1),
      color: better ? 'text-green-600' : 'text-red-500',
    };
  }

  const statCards = [
    withPutts.length > 0 && {
      label: 'Putts / Round',
      value: avgPutts != null ? avgPutts.toFixed(1) : null,
      sub: withPutts.length < allRounds.length ? `${withPutts.length} rounds` : null,
      improving: puttImproving,
      points: withPutts.map(r => ({ date: r.date, v: r.stats.totalPutts })),
      avg: avgPutts,
      fmt: v => v.toFixed(1),
    },
    withGreen.length > 0 && {
      label: 'GIR %',
      value: avgGIR != null ? `${avgGIR.toFixed(0)}%` : null,
      sub: withGreen.length < allRounds.length ? `${withGreen.length} rounds` : null,
      improving: girImproving,
      points: withGreen.map(r => ({ date: r.date, v: (r.stats.girCount / r.stats.greensAttempts) * 100 })),
      avg: avgGIR,
      fmt: v => `${v.toFixed(0)}%`,
    },
    withFairway.length > 0 && {
      label: 'Fairways Hit',
      value: avgFW != null ? `${avgFW.toFixed(0)}%` : null,
      sub: withFairway.length < allRounds.length ? `${withFairway.length} rounds` : null,
      improving: fwImproving,
      points: withFairway.map(r => ({ date: r.date, v: (r.stats.fairwaysHit / r.stats.fairwayAttempts) * 100 })),
      avg: avgFW,
      fmt: v => `${v.toFixed(0)}%`,
    },
    withGIR.length > 0 && {
      label: 'Putts / GIR',
      value: avgPuttsPerGIR != null ? avgPuttsPerGIR.toFixed(2) : null,
      sub: withGIR.length < allRounds.length ? `${withGIR.length} rounds` : null,
      improving: girPuttImproving,
      points: withGIR.map(r => ({ date: r.date, v: r.stats.girPutts / r.stats.girCount })),
      avg: avgPuttsPerGIR,
      fmt: v => v.toFixed(2),
    },
    withStats.length > 0 && {
      label: 'GS Bunkers / Rnd',
      value: avgGSBnkr != null ? avgGSBnkr.toFixed(1) : null,
      points: withStats.map(r => ({ date: r.date, v: r.stats.gsBunkers })),
      avg: avgGSBnkr,
      fmt: v => v.toFixed(1),
    },
    withStats.length > 0 && {
      label: 'FW Bunkers / Rnd',
      value: avgFWBnkr != null ? avgFWBnkr.toFixed(1) : null,
      points: withStats.map(r => ({ date: r.date, v: r.stats.fwBunkers })),
      avg: avgFWBnkr,
      fmt: v => v.toFixed(1),
    },
    withStats.length > 0 && {
      label: 'Penalties / Rnd',
      value: avgPenalties != null ? avgPenalties.toFixed(1) : null,
      points: withStats.map(r => ({ date: r.date, v: r.stats.penalties })),
      avg: avgPenalties,
      fmt: v => v.toFixed(1),
    },
    withChips.length > 0 && {
      label: 'Up & Down %',
      value: avgUpDown != null ? `${avgUpDown.toFixed(0)}%` : null,
      sub: withChips.length > 0 ? `${withChips.length} rounds` : null,
      improving: upDownImproving,
      points: withChips.map(r => ({ date: r.date, v: (r.stats.upAndDowns / r.stats.upAndDownAttempts) * 100 })),
      avg: avgUpDown,
      fmt: v => `${v.toFixed(0)}%`,
    },
  ].filter(Boolean);

  return (
    <div className="min-h-full bg-canvas-cream">
      <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
        <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {withStats.length > 0
            ? `${withStats.length} round${withStats.length !== 1 ? 's' : ''} with stat data`
            : `${allRounds.length} round${allRounds.length !== 1 ? 's' : ''} played`}
        </p>
      </div>


      <div className="px-4 pt-4 space-y-4">

        {/* Last round vs previous */}
        {lastRound && prevRound && (() => {
          const lp = lastRound.stats, pp = prevRound.stats;
          const rows = [
            lp.puttHoles > 0 && pp.puttHoles > 0 && {
              label: 'Putts',
              last: lp.totalPutts,
              prev: pp.totalPutts,
              d: delta(lastRound, prevRound, r => r.stats.totalPutts, true),
            },
            lp.greensAttempts > 0 && pp.greensAttempts > 0 && {
              label: 'GIR',
              last: `${lp.girCount}/${lp.greensAttempts}`,
              prev: `${pp.girCount}/${pp.greensAttempts}`,
              d: delta(lastRound, prevRound, r => r.stats.girCount / r.stats.greensAttempts, false),
            },
            lp.fairwayAttempts > 0 && pp.fairwayAttempts > 0 && {
              label: 'FW Hit',
              last: `${lp.fairwaysHit}/${lp.fairwayAttempts}`,
              prev: `${pp.fairwaysHit}/${pp.fairwayAttempts}`,
              d: delta(lastRound, prevRound, r => r.stats.fairwaysHit / r.stats.fairwayAttempts, false),
            },
          ].filter(Boolean);
          if (!rows.length) return null;
          return (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Last Round vs. Previous</h2>
              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="grid grid-cols-4 px-4 py-2 bg-canvas-cream border-b border-hairline">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider col-span-1"></p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center truncate">
                    {format(new Date(lastRound.date + 'T00:00:00'), 'MMM d')}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center truncate">
                    {format(new Date(prevRound.date + 'T00:00:00'), 'MMM d')}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Δ</p>
                </div>
                {rows.map(row => (
                  <div key={row.label} className="grid grid-cols-4 px-4 py-2.5 border-b border-hairline last:border-0">
                    <p className="text-sm text-gray-500 font-medium">{row.label}</p>
                    <p className="text-sm font-bold text-gray-900 text-center">{row.last}</p>
                    <p className="text-sm text-gray-400 text-center">{row.prev}</p>
                    <p className={`text-sm font-bold text-center ${row.d?.color ?? 'text-gray-400'}`}>{row.d?.label ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {!hasAnyStats ? (
          <div className="bg-white rounded-xl shadow-card p-10 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-600 font-medium">No stat data yet</p>
            <p className="text-gray-400 text-sm mt-1">Track fairways, greens, and putts on your next round</p>
          </div>
        ) : (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Averages</h2>
            <div className="grid grid-cols-2 gap-2">
              {statCards.map(card => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  sub={card.sub}
                  improving={card.improving}
                  onClick={card.points?.length >= 2 ? () => setSelectedStat(card) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Personal records */}
        {allRounds.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Personal Records</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-hairline">
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

      {selectedStat && (
        <TrendSheet config={selectedStat} onClose={() => setSelectedStat(null)} />
      )}
    </div>
  );
}
