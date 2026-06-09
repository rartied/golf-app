import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { computeRoundStats } from '../utils/roundStats';

const DEFAULT_ORDER = ['putts','gir','fw','putts_gir','gs_bunker','fw_bunker','balls','up_down','penalties'];

const CARD_LABELS = {
  putts:     'Putts / Round',
  gir:       'GIR %',
  fw:        'Fairways Hit',
  putts_gir: 'Putts / GIR',
  gs_bunker: 'GS Bunkers / Round',
  fw_bunker: 'FW Bunkers / Round',
  balls:     'Balls / Round',
  up_down:   'Up & Down %',
  penalties: 'Penalties / Round',
};

function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem('golf_stat_order'));
    // Accept any saved array that is a valid subset/superset of known keys
    if (Array.isArray(saved) && saved.length > 0 && saved.every(k => DEFAULT_ORDER.includes(k))) return saved;
  } catch {}
  return DEFAULT_ORDER;
}

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

function StatCard({ label, value, improving, isDragging, isOver, onTouchStart, onTouchMove, onTouchEnd, cardRef, onClick }) {
  return (
    <div
      ref={cardRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
      className={`bg-white rounded-xl shadow-card px-4 py-3 h-[88px] flex flex-col text-left select-none transition-all ${
        onClick ? 'active:bg-gray-50' : ''
      } ${isDragging ? 'opacity-40 scale-[1.03] ring-2 ring-ink shadow-xl' : ''} ${
        isOver && !isDragging ? 'ring-2 ring-golf-green' : ''
      }`}
    >
      <p className="text-[11px] text-gray-400 font-medium leading-none">{label}</p>
      <div className="flex items-end gap-1.5 mt-auto">
        <p className="text-[26px] font-bold text-gray-900 leading-none">{value ?? '—'}</p>
        {improving === true  && <span className="text-green-500 text-xl leading-none pb-0.5">↑</span>}
        {improving === false && <span className="text-red-500  text-xl leading-none pb-0.5">↓</span>}
      </div>
    </div>
  );
}

function ManageSheet({ cardOrder, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-hairline flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Manage Stat Cards</h3>
          <button onClick={onClose} className="text-gray-400 p-1 text-lg leading-none">✕</button>
        </div>
        <div className="overflow-y-auto divide-y divide-hairline px-4">
          {DEFAULT_ORDER.map(key => {
            const on = cardOrder.includes(key);
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className="w-full flex items-center justify-between py-3.5 active:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{CARD_LABELS[key]}</p>
                <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${on ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RecordRow({ label, value, sub, roundId, navigate, onClick: customClick }) {
  const handleClick = customClick ?? (roundId ? () => navigate(`/history/${roundId}`) : undefined);
  const hasAction = !!handleClick;
  return (
    <button
      onClick={handleClick}
      disabled={!hasAction}
      className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${hasAction ? 'active:bg-gray-50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <p className="font-bold text-ink">{value ?? '—'}</p>
        {hasAction && <ChevronRight size={14} className="text-gray-300" />}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-hairline flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">{label}</p>
          <button onClick={onClose} className="text-gray-400 p-1 text-lg leading-none">✕</button>
        </div>
        <div className="overflow-y-auto px-4 pt-4 pb-6">
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
    </div>
  );
}

export default function Stats({ rounds }) {
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState(null);
  const [cardOrder, setCardOrder]       = useState(loadOrder);
  const [manageOpen, setManageOpen]     = useState(false);
  const [dragKey, setDragKey]           = useState(null);
  const [overKey, setOverKey]           = useState(null);

  const longPressTimer = useRef(null);
  const touchOrigin    = useRef({ x: 0, y: 0 });
  const cardEls        = useRef({});
  const dragKeyRef     = useRef(null);
  const overKeyRef     = useRef(null);

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

  const avgPutts       = avg(withPutts,   r => r.stats.totalPutts);
  const avgGIR         = avg(withGreen,   r => (r.stats.girCount / r.stats.greensAttempts) * 100);
  const avgFW          = avg(withFairway, r => (r.stats.fairwaysHit / r.stats.fairwayAttempts) * 100);
  const avgFWBnkr      = avg(withStats,   r => r.stats.fwBunkers);
  const avgGSBnkr      = avg(withStats,   r => r.stats.gsBunkers);
  const avgPenalties   = avg(withStats,   r => r.stats.penalties);
  const avgUpDown      = avg(withChips,   r => (r.stats.upAndDowns / r.stats.upAndDownAttempts) * 100);
  const avgPuttsPerGIR = avg(withGIR,     r => r.stats.girPutts / r.stats.girCount);
  const avgBalls       = avg(enriched,    r => r.stats.ballsLost);

  // All 9 cards are always defined — value is null (shows "—") when no data yet
  const allCardDefs = {
    putts: {
      key: 'putts', label: CARD_LABELS.putts,
      value: avgPutts != null ? avgPutts.toFixed(1) : null,
      improving: trendImproving(withPutts, r => r.stats.totalPutts, true),
      points: withPutts.map(r => ({ date: r.date, v: r.stats.totalPutts })),
      avg: avgPutts, fmt: v => v.toFixed(1),
    },
    gir: {
      key: 'gir', label: CARD_LABELS.gir,
      value: avgGIR != null ? `${avgGIR.toFixed(0)}%` : null,
      improving: trendImproving(withGreen, r => r.stats.girCount / r.stats.greensAttempts, false),
      points: withGreen.map(r => ({ date: r.date, v: (r.stats.girCount / r.stats.greensAttempts) * 100 })),
      avg: avgGIR, fmt: v => `${v.toFixed(0)}%`,
    },
    fw: {
      key: 'fw', label: CARD_LABELS.fw,
      value: avgFW != null ? `${avgFW.toFixed(0)}%` : null,
      improving: trendImproving(withFairway, r => r.stats.fairwaysHit / r.stats.fairwayAttempts, false),
      points: withFairway.map(r => ({ date: r.date, v: (r.stats.fairwaysHit / r.stats.fairwayAttempts) * 100 })),
      avg: avgFW, fmt: v => `${v.toFixed(0)}%`,
    },
    putts_gir: {
      key: 'putts_gir', label: CARD_LABELS.putts_gir,
      value: avgPuttsPerGIR != null ? avgPuttsPerGIR.toFixed(2) : null,
      improving: trendImproving(withGIR, r => r.stats.girPutts / r.stats.girCount, true),
      points: withGIR.map(r => ({ date: r.date, v: r.stats.girPutts / r.stats.girCount })),
      avg: avgPuttsPerGIR, fmt: v => v.toFixed(2),
    },
    gs_bunker: {
      key: 'gs_bunker', label: CARD_LABELS.gs_bunker,
      value: avgGSBnkr != null ? avgGSBnkr.toFixed(1) : null,
      improving: trendImproving(withStats, r => r.stats.gsBunkers, true),
      points: withStats.map(r => ({ date: r.date, v: r.stats.gsBunkers })),
      avg: avgGSBnkr, fmt: v => v.toFixed(1),
    },
    fw_bunker: {
      key: 'fw_bunker', label: CARD_LABELS.fw_bunker,
      value: avgFWBnkr != null ? avgFWBnkr.toFixed(1) : null,
      improving: trendImproving(withStats, r => r.stats.fwBunkers, true),
      points: withStats.map(r => ({ date: r.date, v: r.stats.fwBunkers })),
      avg: avgFWBnkr, fmt: v => v.toFixed(1),
    },
    balls: {
      key: 'balls', label: CARD_LABELS.balls,
      value: avgBalls != null ? avgBalls.toFixed(1) : null,
      improving: trendImproving(enriched, r => r.stats.ballsLost, true),
      points: enriched.map(r => ({ date: r.date, v: r.stats.ballsLost })),
      avg: avgBalls, fmt: v => v.toFixed(1),
    },
    up_down: {
      key: 'up_down', label: CARD_LABELS.up_down,
      value: avgUpDown != null ? `${avgUpDown.toFixed(0)}%` : null,
      improving: trendImproving(withChips, r => r.stats.upAndDowns / r.stats.upAndDownAttempts, false),
      points: withChips.map(r => ({ date: r.date, v: (r.stats.upAndDowns / r.stats.upAndDownAttempts) * 100 })),
      avg: avgUpDown, fmt: v => `${v.toFixed(0)}%`,
    },
    penalties: {
      key: 'penalties', label: CARD_LABELS.penalties,
      value: avgPenalties != null ? avgPenalties.toFixed(1) : null,
      improving: trendImproving(withStats, r => r.stats.penalties, true),
      points: withStats.map(r => ({ date: r.date, v: r.stats.penalties })),
      avg: avgPenalties, fmt: v => v.toFixed(1),
    },
  };

  // Only show cards the user has enabled, in their chosen order
  const orderedCards = cardOrder.map(k => allCardDefs[k]).filter(Boolean);

  // ── Card management ─────────────────────────────────────────────────────────

  function handleCardToggle(key) {
    setCardOrder(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      localStorage.setItem('golf_stat_order', JSON.stringify(next));
      return next;
    });
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function handleTouchStart(e, key) {
    touchOrigin.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      navigator.vibrate?.(40);
      dragKeyRef.current = key;
      setDragKey(key);
    }, 350);
  }

  function handleTouchMove(e) {
    const touch = e.touches[0];
    if (!dragKeyRef.current) {
      if (Math.abs(touch.clientX - touchOrigin.current.x) > 8 ||
          Math.abs(touch.clientY - touchOrigin.current.y) > 8) {
        clearTimeout(longPressTimer.current);
      }
      return;
    }
    for (const [k, el] of Object.entries(cardEls.current)) {
      if (!el || k === dragKeyRef.current) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top  && touch.clientY <= rect.bottom) {
        if (k !== overKeyRef.current) {
          navigator.vibrate?.(8);
          overKeyRef.current = k;
          setOverKey(k);
        }
        return;
      }
    }
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current);
    const dk = dragKeyRef.current;
    const ok = overKeyRef.current;
    if (dk && ok && dk !== ok) {
      setCardOrder(prev => {
        const next = [...prev];
        const from = next.indexOf(dk);
        const to   = next.indexOf(ok);
        next.splice(from, 1);
        next.splice(to, 0, dk);
        localStorage.setItem('golf_stat_order', JSON.stringify(next));
        return next;
      });
    }
    dragKeyRef.current = null;
    overKeyRef.current = null;
    setDragKey(null);
    setOverKey(null);
  }

  // ── Personal records ────────────────────────────────────────────────────────

  const hasAnyStats = withStats.length > 0 || withPutts.length > 0;

  const bestPuttRound = withPutts.length
    ? withPutts.reduce((best, r) => r.stats.totalPutts < best.stats.totalPutts ? r : best) : null;
  const bestGIRRound = withGreen.length
    ? withGreen.reduce((best, r) => r.stats.girCount > best.stats.girCount ? r : best) : null;
  const mostFWRound = withFairway.length
    ? withFairway.reduce((best, r) => r.stats.fairwaysHit > best.stats.fairwaysHit ? r : best) : null;

  const rounds18 = rounds.filter(r => (r.holesPlayed ?? 18) === 18);
  const rounds9  = rounds.filter(r => r.holesPlayed === 9);

  const bestDiff    = rounds.length
    ? rounds.reduce((best, r) => r.scoreDifferential < best.scoreDifferential ? r : best) : null;
  const best18Score = rounds18.length
    ? rounds18.reduce((best, r) => r.totalScore < best.totalScore ? r : best) : null;
  const best9Score  = rounds9.length
    ? rounds9.reduce((best, r) => (r.totalScore - r.coursePar) < (best.totalScore - best.coursePar) ? r : best) : null;

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
    return { label: (d > 0 ? '+' : '') + d.toFixed(1), color: better ? 'text-green-600' : 'text-red-500' };
  }

  return (
    <div className="min-h-full bg-canvas-cream">
      <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
        <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {hasAnyStats
            ? `${withStats.length || withPutts.length} round${(withStats.length || withPutts.length) !== 1 ? 's' : ''} with stat data`
            : `${rounds.length} round${rounds.length !== 1 ? 's' : ''} played`}
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">

        {/* Last round vs previous */}
        {lastRound && prevRound && (() => {
          const lp = lastRound.stats, pp = prevRound.stats;
          const rows = [
            lp.puttHoles > 0 && pp.puttHoles > 0 && { label: 'Putts', last: lp.totalPutts, prev: pp.totalPutts, d: delta(lastRound, prevRound, r => r.stats.totalPutts, true) },
            lp.greensAttempts > 0 && pp.greensAttempts > 0 && { label: 'GIR', last: `${lp.girCount}/${lp.greensAttempts}`, prev: `${pp.girCount}/${pp.greensAttempts}`, d: delta(lastRound, prevRound, r => r.stats.girCount / r.stats.greensAttempts, false) },
            lp.fairwayAttempts > 0 && pp.fairwayAttempts > 0 && { label: 'FW Hit', last: `${lp.fairwaysHit}/${lp.fairwayAttempts}`, prev: `${pp.fairwaysHit}/${pp.fairwayAttempts}`, d: delta(lastRound, prevRound, r => r.stats.fairwaysHit / r.stats.fairwayAttempts, false) },
            lp.hasData && pp.hasData && { label: 'Balls Lost', last: lp.ballsLost, prev: pp.ballsLost, d: delta(lastRound, prevRound, r => r.stats.ballsLost, true) },
          ].filter(Boolean);
          if (!rows.length) return null;
          return (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Last Round vs. Previous</h2>
              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="grid grid-cols-4 px-4 py-2 bg-canvas-cream border-b border-hairline">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider col-span-1" />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center truncate">{format(new Date(lastRound.date + 'T00:00:00'), 'MMM d')}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center truncate">{format(new Date(prevRound.date + 'T00:00:00'), 'MMM d')}</p>
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

        {/* Averages grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900">Averages</h2>
            <button
              onClick={() => setManageOpen(true)}
              className="flex items-center gap-1 text-xs text-gray-400 font-medium active:text-gray-600"
            >
              <SlidersHorizontal size={13} />
              Manage
            </button>
          </div>

          {orderedCards.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-8 text-center">
              <p className="text-gray-400 text-sm">No cards selected. Tap <strong>Manage</strong> to add some.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {orderedCards.map(card => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  value={card.value}
                  improving={card.improving}
                  isDragging={dragKey === card.key}
                  isOver={overKey === card.key}
                  cardRef={el => { if (el) cardEls.current[card.key] = el; else delete cardEls.current[card.key]; }}
                  onTouchStart={e => handleTouchStart(e, card.key)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={card.points?.length >= 2 ? () => setSelectedStat(card) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Personal records */}
        {rounds.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Personal Records</h2>
            <div className="bg-white rounded-xl shadow-card divide-y divide-hairline">
              {bestDiff      && <RecordRow label="Best Differential"  value={bestDiff.scoreDifferential.toFixed(1)}                                          sub={roundSub(bestDiff)}    roundId={bestDiff.id}    navigate={navigate} />}
              {best18Score   && <RecordRow label="Best 18-Hole Score" value={scoreLine(best18Score)}                                                          sub={roundSub(best18Score)} roundId={best18Score.id} navigate={navigate} />}
              {best9Score    && <RecordRow label="Best 9-Hole Score"  value={scoreLine(best9Score)}                                                           sub={roundSub(best9Score)}  roundId={best9Score.id}  navigate={navigate} />}
              {bestPuttRound && <RecordRow label="Best Putting Round" value={`${bestPuttRound.stats.totalPutts} putts`}                                      sub={roundSub(bestPuttRound)} roundId={bestPuttRound.id} navigate={navigate} />}
              {bestGIRRound  && <RecordRow label="Best GIR Round"     value={`${bestGIRRound.stats.girCount}/${bestGIRRound.stats.greensAttempts}`}           sub={roundSub(bestGIRRound)}  roundId={bestGIRRound.id}  navigate={navigate} />}
              {mostFWRound   && <RecordRow label="Most Fairways Hit"  value={`${mostFWRound.stats.fairwaysHit}/${mostFWRound.stats.fairwayAttempts}`}         sub={roundSub(mostFWRound)}   roundId={mostFWRound.id}   navigate={navigate} />}
              {enriched.length > 0 && (() => {
                const total = enriched.reduce((s, r) => s + r.stats.ballsLost, 0);
                return (
                  <RecordRow
                    label="Career Balls Lost"
                    value={total}
                    sub={`${enriched.length} round${enriched.length !== 1 ? 's' : ''} tracked`}
                    navigate={navigate}
                    onClick={allCardDefs.balls?.points?.length >= 2 ? () => setSelectedStat(allCardDefs.balls) : undefined}
                  />
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {manageOpen && (
        <ManageSheet
          cardOrder={cardOrder}
          onToggle={handleCardToggle}
          onClose={() => setManageOpen(false)}
        />
      )}

      {selectedStat && <TrendSheet config={selectedStat} onClose={() => setSelectedStat(null)} />}
    </div>
  );
}
