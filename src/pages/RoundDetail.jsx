import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function RoundDetail({ rounds, deleteRound }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const round = rounds.find(r => r.id === id);

  if (!round) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Round not found.</p>
      </div>
    );
  }

  const diff = round.totalScore - round.coursePar;

  function handleDelete() {
    if (confirming) {
      deleteRound(round.id);
      navigate('/history');
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-golf-green safe-pt px-4 pt-10 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:opacity-70">
            <ArrowLeft size={22} className="text-white/80" />
          </button>
          <button
            onClick={handleDelete}
            className={`p-2 rounded-full transition-colors ${
              confirming ? 'bg-red-500/30 text-red-200' : 'text-white/50 active:text-white/80'
            }`}
          >
            <Trash2 size={18} />
          </button>
        </div>
        <p className="text-green-200 text-sm font-medium">
          {format(new Date(round.date), 'EEEE, MMMM d, yyyy')}
        </p>
        <p className="text-white text-6xl font-black mt-1 leading-none">{round.totalScore}</p>
        <p className={`text-xl font-bold mt-2 ${
          diff === 0 ? 'text-green-200' : diff < 0 ? 'text-yellow-300' : 'text-red-300'
        }`}>
          {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff} to par
        </p>
        <p className="text-green-200 text-sm mt-1">
          {round.courseName} · {round.teeName}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Stats */}
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

        {/* Scorecard */}
        {round.holeScores?.length === 18 && (
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

            {/* Totals row */}
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

        {confirming && (
          <p className="text-center text-red-500 text-sm font-medium">
            Tap delete again to confirm
          </p>
        )}
      </div>
    </div>
  );
}
