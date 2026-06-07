import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import { useState } from 'react';
import { calcScoreDifferential, calcAdjustedGrossScore, calcCourseHandicap } from '../utils/handicap';
import { DirectionPicker, StatTracker, PenaltyPill, dotColor, relativeScore } from '../components/HoleEditor';

export default function RoundDetail({ rounds, deleteRound, updateRound, handicapIndex }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editScores, setEditScores] = useState([]);
  const [editTotal, setEditTotal] = useState(0);
  const [editCurrentHole, setEditCurrentHole] = useState(0);

  const round = rounds.find(r => r.id === id);

  if (!round) {
    return (
      <div className="min-h-full bg-canvas-cream flex items-center justify-center">
        <p className="text-gray-400">Round not found.</p>
      </div>
    );
  }

  const hasHoleScores = (round.holeScores?.length ?? 0) >= 9;
  const isNineHole = (round.holesPlayed ?? 18) === 9;

  function startEdit() {
    setEditDate(round.date);
    setEditScores(hasHoleScores ? round.holeScores.map(h => ({ ...h })) : []);
    setEditTotal(round.totalScore);
    setEditCurrentHole(0);
    setEditing(true);
    window.scrollTo(0, 0);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function adjustScore(idx, delta) {
    setEditScores(prev => prev.map((h, i) =>
      i !== idx ? h : { ...h, score: Math.max(1, Math.min(h.score + delta, h.par + 8)) }
    ));
  }

  function updateEditStat(idx, stat, value) {
    setEditScores(prev => prev.map((h, i) => i !== idx ? h : { ...h, [stat]: value }));
  }

  function saveEdit() {
    const totalScore = hasHoleScores
      ? editScores.reduce((s, h) => s + h.score, 0)
      : editTotal;

    const established = handicapIndex !== null;
    const courseHandicap = (established && !isNineHole)
      ? calcCourseHandicap(handicapIndex, round.slope, round.courseRating, round.coursePar)
      : null;

    const adjustedGrossScore = hasHoleScores
      ? calcAdjustedGrossScore(editScores, courseHandicap ?? 0, round.holesPlayed ?? 18, established)
      : totalScore;

    const scoreDifferential = calcScoreDifferential(
      adjustedGrossScore, round.courseRating, round.slope, round.holesPlayed ?? 18,
      isNineHole ? handicapIndex : null
    );

    updateRound({
      ...round,
      date: editDate,
      totalScore,
      adjustedGrossScore,
      scoreDifferential,
      holeScores: hasHoleScores ? editScores : round.holeScores,
    });
    setEditing(false);
  }

  function handleDelete() {
    if (confirming) {
      deleteRound(round.id);
      navigate('/history');
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  const displayTotal = editing
    ? (hasHoleScores ? editScores.reduce((s, h) => s + h.score, 0) : editTotal)
    : round.totalScore;
  const diff = displayTotal - round.coursePar;

  // ── EDIT MODE (hole-by-hole) — compact full-screen layout ─────────────────
  if (editing && hasHoleScores && editScores.length > 0) {
    const h = editScores[editCurrentHole];
    const rel = relativeScore(h.score, h.par);
    const girAchieved = h.greenHit === 'hit' && h.putts != null
      ? (h.score - h.putts) <= (h.par - 2) : false;

    return (
      <div className="h-dvh bg-canvas-cream flex flex-col">
        {/* Compact dark header */}
        <div className="bg-canvas-night safe-pt px-4 pt-2 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:opacity-70">
              <ArrowLeft size={20} className="text-white/80" />
            </button>
            <div className="text-center flex-1 mx-2">
              <p className="text-white font-bold text-sm leading-tight truncate">{round.courseName}</p>
              <p className="text-white/50 text-xs">
                {displayTotal} · {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff} to par
              </p>
            </div>
            <button onClick={cancelEdit} className="p-1 active:opacity-70">
              <X size={18} className="text-white/60" />
            </button>
          </div>
          <div className="flex gap-1 justify-center mb-1">
            {editScores.map((eh, i) => (
              <button
                key={eh.number}
                onClick={() => setEditCurrentHole(i)}
                className={`rounded-full transition-all ${
                  i === editCurrentHole
                    ? `w-4 h-4 ring-2 ring-white ring-offset-1 ring-offset-canvas-night ${dotColor(eh.score, eh.par)}`
                    : `w-2.5 h-2.5 ${dotColor(eh.score, eh.par)}`
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-xs">Hole {h.number} · Par {h.par}</span>
            <div className="flex items-center gap-2">
              {girAchieved && <span className="px-2 py-0.5 bg-golf-light text-gray-700 text-xs font-bold rounded-full">GIR ✓</span>}
              {h.strokeIndex && <span className="text-white/30 text-xs">SI {h.strokeIndex}</span>}
            </div>
          </div>
        </div>

        {/* Scrollable cards */}
        <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1.5">
          {/* Score + Putts */}
          <div className="bg-white rounded-xl shadow-card px-4 py-2">
            <div className="flex items-stretch gap-4">
              <div className="flex-1 flex flex-col items-center">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Score</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustScore(editCurrentHole, -1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none">−</button>
                  <div className="text-center w-12">
                    <p className="text-5xl font-black text-gray-900 tabular-nums leading-none">{h.score}</p>
                  </div>
                  <button onClick={() => adjustScore(editCurrentHole, 1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none">+</button>
                </div>
                <p className={`text-xs font-semibold mt-1 ${rel.color}`}>{rel.label}</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 flex flex-col items-center">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Putts</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateEditStat(editCurrentHole, 'putts', Math.max(0, (h.putts ?? 0) - 1))} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none">−</button>
                  <div className="text-center w-12">
                    <p className="text-5xl font-black text-gray-900 tabular-nums leading-none">{h.putts ?? 0}</p>
                  </div>
                  <button onClick={() => updateEditStat(editCurrentHole, 'putts', (h.putts ?? 0) + 1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none">+</button>
                </div>
                <p className="text-xs font-semibold mt-1 text-gray-300">putts</p>
              </div>
            </div>
          </div>

          {/* Direction pickers */}
          <div className="bg-white rounded-xl shadow-card px-4 py-2">
            <div className="flex items-center gap-2">
              {h.par !== 3 ? (
                <DirectionPicker label="Fairway" value={h.fairway} onChange={v => updateEditStat(editCurrentHole, 'fairway', v)} hasLongShort={false} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Fairway</p>
                  <p className="text-xs text-gray-300 italic py-6">Par 3</p>
                </div>
              )}
              <div className="w-px bg-gray-100 self-stretch mx-1" />
              <DirectionPicker label="GIR" value={h.greenHit} onChange={v => updateEditStat(editCurrentHole, 'greenHit', v)} hasLongShort={true} />
            </div>
          </div>

          {/* Stat trackers + Penalties */}
          <div className="bg-white rounded-xl shadow-card px-4 py-3 space-y-3">
            <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Stat Trackers</p>
            <div className="grid grid-cols-4 gap-2">
              <StatTracker topLabel="FW" label="Bunker" value={h.fairwayBunkers ?? 0} onChange={v => updateEditStat(editCurrentHole, 'fairwayBunkers', v)} />
              <StatTracker topLabel="GS" label="Bunker" value={h.greensideBunkers ?? 0} onChange={v => updateEditStat(editCurrentHole, 'greensideBunkers', v)} />
              <StatTracker label="Chip" value={h.chipShots ?? 0} onChange={v => updateEditStat(editCurrentHole, 'chipShots', v)} />
              <StatTracker label="Lost Ball" value={h.ballsLost ?? 0} onChange={v => updateEditStat(editCurrentHole, 'ballsLost', v)} />
            </div>
            <div className="border-t border-hairline" />
            <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Penalties</p>
            <div className="flex gap-2">
              <PenaltyPill label="Water" value={h.waterHazards ?? 0} onChange={v => updateEditStat(editCurrentHole, 'waterHazards', v)} />
              <PenaltyPill label="OB" value={h.outOfBounds ?? 0} onChange={v => updateEditStat(editCurrentHole, 'outOfBounds', v)} />
              <PenaltyPill label="Drop" value={h.dropShots ?? 0} onChange={v => updateEditStat(editCurrentHole, 'dropShots', v)} />
            </div>
          </div>
        </div>

        {/* Hole navigation */}
        <div className="px-4 pt-1 pb-3 safe-pb flex-shrink-0 bg-canvas-cream">
          <div className="flex gap-3">
            {editCurrentHole > 0 ? (
              <button onClick={() => setEditCurrentHole(i => i - 1)} className="flex-1 bg-white border border-hairline text-gray-700 font-semibold py-3.5 rounded-full flex items-center justify-center gap-1 active:bg-gray-50">
                <ChevronLeft size={18} /> Prev
              </button>
            ) : <div className="flex-1" />}
            {editCurrentHole < editScores.length - 1 ? (
              <button onClick={() => setEditCurrentHole(i => i + 1)} className="flex-1 bg-golf-green text-white font-semibold py-3.5 rounded-full flex items-center justify-center gap-1 active:opacity-90">
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button onClick={saveEdit} className="flex-1 bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90">
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-canvas-night safe-pt px-4 pt-10 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:opacity-70">
            <ArrowLeft size={22} className="text-white/80" />
          </button>
          <div className="flex items-center gap-1">
            {editing ? (
              <button onClick={cancelEdit} className="p-2 rounded-full text-white/60 active:text-white/90">
                <X size={18} />
              </button>
            ) : (
              <>
                <button onClick={startEdit} className="p-2 rounded-full text-white/60 active:text-white/90">
                  <Pencil size={18} />
                </button>
                <button
                  onClick={handleDelete}
                  className={`p-2 rounded-full transition-colors ${
                    confirming ? 'bg-red-500/30 text-red-200' : 'text-white/50 active:text-white/80'
                  }`}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>
        {editing ? (
          <div className="mb-1">
            <DatePicker value={editDate} onChange={setEditDate} max={new Date().toISOString().split('T')[0]} className="text-white/70 text-sm" />
          </div>
        ) : (
          <p className="text-white/50 text-sm font-medium">
            {format(new Date(round.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
          </p>
        )}
        <p className="text-white text-6xl font-black mt-1 leading-none">{displayTotal}</p>
        <p className={`text-xl font-bold mt-2 ${
          diff === 0 ? 'text-white/50' : diff < 0 ? 'text-yellow-300' : 'text-red-300'
        }`}>
          {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff} to par
        </p>
        <p className="text-green-200 text-sm mt-1">
          {round.courseName}{round.teeName ? ` · ${round.teeName}` : ''}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Stats */}
        <div className="bg-white rounded-xl shadow-card divide-y divide-hairline">
          {[
            ['Course Par', round.coursePar],
            ...(round.adjustedGrossScore !== round.totalScore
              ? [['Adjusted Gross', round.adjustedGrossScore]]
              : []),
            ['Score Differential', round.scoreDifferential?.toFixed(1)],
            ['Course Rating', round.courseRating],
            ['Slope', round.slope],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3 flex justify-between items-center">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="font-semibold text-gray-900">{value ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* Edit total score (no hole data) */}
        {editing && !hasHoleScores && (
          <div className="bg-white rounded-xl shadow-card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Total Score</p>
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => setEditTotal(t => Math.max(18, t - 1))}
                className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600 active:bg-gray-200"
              >−</button>
              <span className="text-5xl font-black text-gray-900 w-20 text-center">{editTotal}</span>
              <button
                onClick={() => setEditTotal(t => Math.min(t + 1, round.coursePar + 72))}
                className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600 active:bg-gray-200"
              >+</button>
            </div>
          </div>
        )}

        {/* Read-only scorecard */}
        {!editing && hasHoleScores && (
          <div className="bg-white rounded-xl shadow-card p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Scorecard</h3>
            {(isNineHole ? [round.holeScores] : [round.holeScores.slice(0, 9), round.holeScores.slice(9)]).map((nine, nineIdx) => (
              <div key={nineIdx} className="mb-2 last:mb-0">
                <div className="grid text-xs text-center" style={{ gridTemplateColumns: `3rem repeat(9, 1fr)` }}>
                  <div className="text-left text-gray-400 font-medium py-0.5">Hole</div>
                  {nine.map(h => <div key={h.number} className="text-gray-400 py-0.5">{h.number}</div>)}
                  <div className="text-left text-gray-400 py-0.5">Par</div>
                  {nine.map(h => <div key={h.number} className="text-gray-400 py-0.5">{h.par}</div>)}
                  <div className="text-left text-gray-700 font-semibold py-0.5">Score</div>
                  {nine.map(h => {
                    const d = h.score - h.par;
                    return (
                      <div key={h.number} className={`font-bold py-0.5 ${
                        d <= -2 ? 'text-yellow-500' :
                        d === -1 ? 'text-green-600' :
                        d === 0  ? 'text-gray-700' :
                        d === 1  ? 'text-blue-500' : 'text-red-500'
                      }`}>{h.score}</div>
                    );
                  })}
                </div>
                {nineIdx === 0 && !isNineHole && <div className="border-t border-gray-100 my-2" />}
              </div>
            ))}
            {!isNineHole && (
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm">
                <span className="text-gray-500">Out / In / Total</span>
                <span className="font-bold text-gray-900">
                  {round.holeScores.slice(0, 9).reduce((s, h) => s + h.score, 0)}
                  {' / '}
                  {round.holeScores.slice(9).reduce((s, h) => s + h.score, 0)}
                  {' / '}
                  {round.totalScore}
                </span>
              </div>
            )}
          </div>
        )}

        {editing && !hasHoleScores && (
          <button
            onClick={saveEdit}
            className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90"
          >
            Save Changes
          </button>
        )}

        {confirming && !editing && (
          <p className="text-center text-red-500 text-sm font-medium">
            Tap delete again to confirm
          </p>
        )}
      </div>
    </div>
  );
}
