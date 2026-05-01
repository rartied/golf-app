import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { calcScoreDifferential, calcAdjustedGrossScore, calcCourseHandicap } from '../utils/handicap';

export default function RoundDetail({ rounds, deleteRound, updateRound, handicapIndex }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editScores, setEditScores] = useState([]);
  const [editTotal, setEditTotal] = useState(0);

  const round = rounds.find(r => r.id === id);

  if (!round) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Round not found.</p>
      </div>
    );
  }

  const hasHoleScores = round.holeScores?.length === 18;

  function startEdit() {
    setEditDate(round.date);
    setEditScores(hasHoleScores ? round.holeScores.map(h => ({ ...h })) : []);
    setEditTotal(round.totalScore);
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

  function saveEdit() {
    const totalScore = hasHoleScores
      ? editScores.reduce((s, h) => s + h.score, 0)
      : editTotal;

    const courseHandicap = handicapIndex !== null
      ? calcCourseHandicap(handicapIndex, round.slope, round.courseRating, round.coursePar)
      : null;

    const adjustedGrossScore = courseHandicap !== null && hasHoleScores
      ? calcAdjustedGrossScore(editScores, courseHandicap)
      : totalScore;

    const scoreDifferential = calcScoreDifferential(
      adjustedGrossScore, round.courseRating, round.slope
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-golf-green safe-pt px-4 pt-10 pb-8">
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
          <input
            type="date"
            value={editDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setEditDate(e.target.value)}
            className="text-green-200 text-sm font-medium bg-transparent outline-none border-b border-green-400/50 pb-0.5 mb-1"
          />
        ) : (
          <p className="text-green-200 text-sm font-medium">
            {format(new Date(round.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
          </p>
        )}
        <p className="text-white text-6xl font-black mt-1 leading-none">{displayTotal}</p>
        <p className={`text-xl font-bold mt-2 ${
          diff === 0 ? 'text-green-200' : diff < 0 ? 'text-yellow-300' : 'text-red-300'
        }`}>
          {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff} to par
        </p>
        <p className="text-green-200 text-sm mt-1">
          {round.courseName}{round.teeName ? ` · ${round.teeName}` : ''}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Stats (hidden while editing) */}
        {!editing && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
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
        )}

        {/* Edit total score (no hole data) */}
        {editing && !hasHoleScores && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
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

        {/* Edit hole scores */}
        {editing && hasHoleScores && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Edit Scores</p>
            {[editScores.slice(0, 9), editScores.slice(9)].map((nine, nineIdx) => (
              <div key={nineIdx}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                  {nineIdx === 0 ? 'Front 9' : 'Back 9'}
                </p>
                <div className="space-y-1">
                  {nine.map((h, rel) => {
                    const idx = nineIdx * 9 + rel;
                    const d = h.score - h.par;
                    return (
                      <div key={h.number} className="flex items-center gap-3 py-1">
                        <span className="w-6 text-sm font-bold text-gray-400 text-center flex-shrink-0">{h.number}</span>
                        <span className="w-12 text-xs text-gray-400 flex-shrink-0">Par {h.par}</span>
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <button
                            onClick={() => adjustScore(idx, -1)}
                            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-lg font-bold text-gray-600 active:bg-gray-200"
                          >−</button>
                          <span className={`w-8 text-center text-xl font-black ${
                            d < 0  ? 'text-green-600' :
                            d === 0 ? 'text-gray-700' :
                            d === 1 ? 'text-blue-500' : 'text-red-500'
                          }`}>{h.score}</span>
                          <button
                            onClick={() => adjustScore(idx, 1)}
                            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-lg font-bold text-gray-600 active:bg-gray-200"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {nineIdx === 0 && <div className="border-t border-gray-100 my-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Read-only scorecard */}
        {!editing && hasHoleScores && (
          <div className="bg-white rounded-2xl shadow-sm p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Scorecard</h3>
            {[round.holeScores.slice(0, 9), round.holeScores.slice(9)].map((nine, nineIdx) => (
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
                {nineIdx === 0 && <div className="border-t border-gray-100 my-2" />}
              </div>
            ))}
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
          </div>
        )}

        {editing && (
          <button
            onClick={saveEdit}
            className="w-full bg-golf-green text-white font-semibold py-4 rounded-2xl active:opacity-90"
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
