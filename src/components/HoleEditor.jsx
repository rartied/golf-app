// Shared hole-by-hole scoring components used in PlayRound and RoundDetail.

const DP_S = 130, DP_CX = 65, DP_CY = 65, DP_OR = 63, DP_IR = 36;

function dpPt(r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return [DP_CX + r * Math.cos(rad), DP_CY + r * Math.sin(rad)];
}

function dpArc(a1, a2) {
  const span = (a2 - a1 + 360) % 360;
  const lg = span > 180 ? 1 : 0;
  const [ox1, oy1] = dpPt(DP_OR, a1), [ox2, oy2] = dpPt(DP_OR, a2);
  const [ix2, iy2] = dpPt(DP_IR, a2), [ix1, iy1] = dpPt(DP_IR, a1);
  const f = n => n.toFixed(2);
  return `M${f(ox1)},${f(oy1)} A${DP_OR},${DP_OR} 0 ${lg},1 ${f(ox2)},${f(oy2)} L${f(ix2)},${f(iy2)} A${DP_IR},${DP_IR} 0 ${lg},0 ${f(ix1)},${f(iy1)}Z`;
}

const FW_SECTORS = [
  { v: 'long',  a1: 317, a2: 43  },
  { v: 'right', a1: 47,  a2: 133 },
  { v: 'na',    a1: 137, a2: 223 },
  { v: 'left',  a1: 227, a2: 313 },
];
const GRN_SECTORS = [
  { v: 'long',  a1: 317, a2: 43  },
  { v: 'right', a1: 47,  a2: 133 },
  { v: 'short', a1: 137, a2: 223 },
  { v: 'left',  a1: 227, a2: 313 },
];

export function relativeScore(score, par) {
  const d = score - par;
  if (d <= -3) return { label: 'Albatross', color: 'text-yellow-500' };
  if (d === -2) return { label: 'Eagle',    color: 'text-yellow-500' };
  if (d === -1) return { label: 'Birdie',   color: 'text-green-600'  };
  if (d === 0)  return { label: 'Par',      color: 'text-gray-500'   };
  if (d === 1)  return { label: 'Bogey',    color: 'text-blue-500'   };
  if (d === 2)  return { label: 'Double',   color: 'text-red-500'    };
  return { label: `+${d}`, color: 'text-red-600' };
}

export function dotColor(score, par) {
  const d = score - par;
  if (d <= -2) return 'bg-yellow-400';
  if (d === -1) return 'bg-green-500';
  if (d === 0)  return 'bg-white/50';
  if (d === 1)  return 'bg-blue-400';
  return 'bg-red-400';
}

export function DirectionPicker({ label, value, onChange, hasLongShort = false }) {
  function pick(v) { onChange(value === v ? null : v); }
  const sectors = hasLongShort ? GRN_SECTORS : FW_SECTORS;
  const hasNa = sectors.some(s => s.v === 'na');
  const [naX, naY] = dpPt((DP_OR + DP_IR) / 2, 180);
  return (
    <div className="flex-1 flex flex-col items-center">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="relative" style={{ width: DP_S, height: DP_S }}>
        <svg width={DP_S} height={DP_S} className="absolute inset-0">
          {sectors.map(({ v, a1, a2 }) => (
            <path key={v} d={dpArc(a1, a2)} fill={value === v ? '#000000' : '#f3f4f6'} onClick={() => pick(v)} style={{ cursor: 'pointer' }} />
          ))}
          {hasNa && (
            <text x={naX.toFixed(1)} y={(naY + 4).toFixed(1)} textAnchor="middle" fontSize="11" fontWeight="700"
              fill={value === 'na' ? 'white' : '#d1d5db'} style={{ pointerEvents: 'none', userSelect: 'none' }}>×</text>
          )}
        </svg>
        <button
          onClick={() => pick('hit')}
          style={{ position: 'absolute', left: DP_CX - DP_IR, top: DP_CY - DP_IR, width: DP_IR * 2, height: DP_IR * 2, borderRadius: '50%' }}
          className={`flex items-center justify-center text-sm font-black transition-all bg-golf-green text-white ${
            value === 'hit' ? 'shadow-md scale-105' : 'opacity-60 active:opacity-80'
          }`}
        >
          {value === 'hit' ? '✓' : 'HIT'}
        </button>
      </div>
    </div>
  );
}

export function StatTracker({ topLabel, label, value, onChange }) {
  const active = value > 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full aspect-square">
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={`w-full h-full rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
            active ? 'bg-golf-light ring-2 ring-golf-green' : 'bg-gray-50'
          }`}
        >
          {topLabel && (
            <span className={`text-[9px] font-bold uppercase leading-none ${active ? 'text-golf-green' : 'text-gray-400'}`}>
              {topLabel}
            </span>
          )}
          <span className={`text-2xl font-black leading-none tabular-nums ${active ? 'text-golf-green' : 'text-gray-700'}`}>
            {value}
          </span>
        </button>
        {active && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(value - 1); }}
            className="absolute -top-3 -right-3 w-8 h-8 bg-gray-400 text-white text-base font-bold rounded-full flex items-center justify-center z-10"
          >−</button>
        )}
      </div>
      <span className={`text-[9px] font-semibold uppercase tracking-wide text-center leading-tight ${active ? 'text-golf-green' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

export function PenaltyPill({ label, value, onChange }) {
  const active = value > 0;
  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={`w-full py-2.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all active:scale-95 ${
          active ? 'bg-canvas-night text-white' : 'bg-white border border-hairline text-gray-500'
        }`}
      >
        {label}{active ? ` · ${value}` : ''}
      </button>
      {active && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(value - 1); }}
          className="absolute -top-3 -right-3 w-8 h-8 bg-gray-400 text-white text-base font-bold rounded-full flex items-center justify-center z-10"
        >−</button>
      )}
    </div>
  );
}
