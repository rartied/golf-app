import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Plus, BarChart2 } from 'lucide-react';
import { roundsNeededForHandicap, getHandicapTrend } from '../utils/handicap';
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

function TrendSparkline({ rounds, handicapIndex }) {
  const raw = [...rounds]
    .filter(r => r.scoreDifferential != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-20)
    .map(r => r.scoreDifferential);

  if (raw.length < 2) return null;

  const data = raw.map((_, i) => {
    const slice = raw.slice(Math.max(0, i - 2), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });

  const VW = 300, VH = 80, PAD_L = 8, PAD_R = 18, PAD_T = 16, PAD_B = 14;
  const iW = VW - PAD_L - PAD_R;
  const iH = VH - PAD_T - PAD_B;

  const allVals = handicapIndex != null ? [...data, handicapIndex] : data;
  const lo = Math.min(...allVals);
  const hi = Math.max(...allVals);
  const span = hi - lo || 1;
  const lo2 = lo - span * 0.22;
  const hi2 = hi + span * 0.22;
  const span2 = hi2 - lo2;

  const px = i => PAD_L + (i / (data.length - 1)) * iW;
  const py = v => PAD_T + (1 - (v - lo2) / span2) * iH;

  const pts = data.map((d, i) => ({ x: px(i), y: py(d) }));
  const linePath = smoothCurve(pts);
  const last = pts[pts.length - 1];
  const latestRaw = raw[raw.length - 1];
  const relVal = handicapIndex != null ? latestRaw - handicapIndex : null;
  const relLabel = relVal != null
    ? (relVal >= 0 ? '+' : '') + relVal.toFixed(1)
    : latestRaw.toFixed(1);

  return (
    <div className="absolute inset-0 flex items-center">
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" preserveAspectRatio="none">

        {handicapIndex != null && (
          <>
            <line
              x1={PAD_L} y1={py(handicapIndex).toFixed(1)}
              x2={VW - PAD_R} y2={py(handicapIndex).toFixed(1)}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3,4"
            />
            <text x={PAD_L + 5} y={(py(handicapIndex) - 3).toFixed(1)} fill="rgba(255,255,255,0.35)" fontSize="7" fontWeight="600">
              HCP
            </text>
            <text
              x={VW - PAD_R - 3} y={(py(handicapIndex ?? lo2) + 10).toFixed(1)}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="6.5" fontWeight="600" letterSpacing="1"
            >
              3-RND AVG · SCORE DIFF
            </text>
          </>
        )}

        <path d={linePath} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="6" fill="rgba(255,255,255,0.15)" />
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="3" fill="white" />

        <text
          x={last.x.toFixed(1)} y={(last.y - 10).toFixed(1)}
          textAnchor="middle" fill="white" fontSize="9" fontWeight="700" opacity="0.9"
        >
          {relLabel}
        </text>
      </svg>
    </div>
  );
}

export default function Dashboard({ rounds, courses, handicapIndex }) {
  const navigate = useNavigate();
  const recent = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const needed = roundsNeededForHandicap(rounds);
  const trend = getHandicapTrend(rounds);

  return (
    <div className="min-h-full bg-canvas-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-canvas-night safe-pt px-4 pb-8 pt-12 relative overflow-hidden">
        {/* Full-width chart behind everything */}
        <TrendSparkline rounds={rounds} handicapIndex={handicapIndex} />

        {/* Left fade — keeps text readable */}
        <div className="absolute inset-y-0 left-0 w-[55%] pointer-events-none z-10"
          style={{ background: 'linear-gradient(to right, #000000 50%, transparent)' }} />

        {/* Text on top */}
        <div className="relative z-20 flex flex-col items-start">
          <h1 className="text-white text-5xl font-light tracking-tight">
            {handicapIndex !== null ? handicapIndex.toFixed(1) : '—'}
          </h1>
          <p className="text-white/50 text-sm mt-0.5">Handicap Index (WHS)</p>

          {trend !== null && (
            <div className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white/90">
              {trend < 0 ? `↓ ${Math.abs(trend).toFixed(1)} since last round` : trend > 0 ? `↑ ${trend.toFixed(1)} since last round` : 'No change'}
            </div>
          )}

          {needed > 0 && (
            <p className="text-white/50 text-sm mt-2">
              {needed} more round{needed > 1 ? 's' : ''} needed to establish handicap
            </p>
          )}
        </div>
      </div>

      {/* Stats strip */}
      {rounds.length > 0 && (
        <div className="mx-4 mt-4 bg-white rounded-xl shadow-card px-4 py-3 grid grid-cols-3 divide-x divide-hairline">
          <div className="text-center pr-4">
            <p className="text-2xl font-bold text-gray-900">{rounds.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rounds</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-gray-900">
              {rounds.length > 0
                ? (rounds.reduce((s, r) => s + r.scoreDifferential, 0) / rounds.length).toFixed(1)
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Avg Diff</p>
          </div>
          <div className="text-center pl-4">
            <p className="text-2xl font-bold text-gray-900">
              {rounds.length > 0
                ? Math.min(...rounds.map(r => r.scoreDifferential)).toFixed(1)
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Best Diff</p>
          </div>
        </div>
      )}

      {/* Stats snapshot */}
      {rounds.some(r => r.holeScores?.length >= 9) && (() => {
        const enriched = rounds
          .filter(r => r.holeScores?.length >= 9)
          .map(r => ({ ...r, stats: computeRoundStats(r.holeScores) }))
          .filter(r => r.stats.hasData);
        if (!enriched.length) return null;
        function avg(arr, fn) {
          return arr.length ? arr.reduce((s, r) => s + fn(r), 0) / arr.length : null;
        }
        const withPutts   = enriched.filter(r => r.stats.puttHoles > 0);
        const withGreen   = enriched.filter(r => r.stats.greensAttempts > 0);
        const withFairway = enriched.filter(r => r.stats.fairwayAttempts > 0);
        const avgPutts = avg(withPutts, r => r.stats.totalPutts);
        const avgGIR   = avg(withGreen, r => (r.stats.girCount / r.stats.greensAttempts) * 100);
        const avgFW    = avg(withFairway, r => (r.stats.fairwaysHit / r.stats.fairwayAttempts) * 100);
        const items = [
          avgPutts != null && { label: 'Putts/Rnd', value: avgPutts.toFixed(1) },
          avgGIR   != null && { label: 'GIR',       value: `${avgGIR.toFixed(0)}%` },
          avgFW    != null && { label: 'Fairways',  value: `${avgFW.toFixed(0)}%` },
        ].filter(Boolean);
        return (
          <div className="mx-4 mt-4">
            <button
              onClick={() => navigate('/stats')}
              className="w-full bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
            >
              <BarChart2 size={18} className="text-ink flex-shrink-0" />
              <div className="flex-1 flex gap-4">
                {items.map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-shade-50">{label}</p>
                    <p className="text-base font-bold text-ink">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-ink text-xs font-semibold flex-shrink-0">
                Stats <ChevronRight size={14} />
              </div>
            </button>
          </div>
        );
      })()}

      {/* Recent rounds */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">Recent Rounds</h2>
          {rounds.length > 0 && (
            <button onClick={() => navigate('/history')} className="text-ink text-sm font-medium">
              See all
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <p className="text-4xl mb-3">⛳</p>
            <p className="text-shade-50 text-sm">No rounds yet.</p>
            <p className="text-shade-40 text-xs mt-1">Play a round or upload a scorecard to get started.</p>
            {courses.length === 0 && (
              <button
                onClick={() => navigate('/courses/add')}
                className="mt-4 inline-flex items-center gap-1 text-ink text-sm font-medium"
              >
                <Plus size={14} /> Add your first course
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(round => {
              const diff = round.totalScore - round.coursePar;
              return (
                <button
                  key={round.id}
                  onClick={() => navigate(`/history/${round.id}`)}
                  className="w-full bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{round.courseName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {format(new Date(round.date), 'MMM d, yyyy')} · {round.teeName}
                      {round.nineHoleType && ` · ${round.nineHoleType === 'front' ? 'Front 9' : 'Back 9'}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{round.totalScore}</p>
                    <p className={`text-xs font-medium ${
                      diff === 0 ? 'text-gray-500' :
                      diff < 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
