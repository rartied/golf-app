import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus, ChevronRight, Flag, Plus } from 'lucide-react';
import { roundsNeededForHandicap, getHandicapTrend } from '../utils/handicap';

export default function Dashboard({ rounds, courses, handicapIndex }) {
  const navigate = useNavigate();
  const recent = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const needed = roundsNeededForHandicap(rounds);
  const trend = getHandicapTrend(rounds);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-golf-green safe-pt px-4 pb-8 pt-12">
        <p className="text-green-100 text-sm font-medium">Golf Tracker</p>
        <h1 className="text-white text-3xl font-bold mt-1">
          {handicapIndex !== null ? handicapIndex.toFixed(1) : '—'}
        </h1>
        <p className="text-green-200 text-sm mt-0.5">Handicap Index (WHS)</p>

        {trend !== null && (
          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
            trend < 0 ? 'bg-green-700 text-green-100' :
            trend > 0 ? 'bg-red-700 text-red-100' :
            'bg-green-700 text-green-100'
          }`}>
            {trend < -0.3 ? <TrendingDown size={12} /> : trend > 0.3 ? <TrendingUp size={12} /> : <Minus size={12} />}
            {trend < 0 ? `${Math.abs(trend).toFixed(1)} improving` : trend > 0 ? `${trend.toFixed(1)} higher` : 'Stable'}
          </div>
        )}

        {needed > 0 && (
          <p className="text-green-200 text-sm mt-2">
            {needed} more round{needed > 1 ? 's' : ''} needed to establish handicap
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="px-4 -mt-4">
        <button
          onClick={() => navigate('/play')}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-golf-light rounded-full flex items-center justify-center flex-shrink-0">
            <Flag size={20} className="text-golf-green" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Play Round / Log Score</span>
        </button>
      </div>

      {/* Stats strip */}
      {rounds.length > 0 && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm px-4 py-3 grid grid-cols-3 divide-x divide-gray-100">
          <div className="text-center pr-4">
            <p className="text-2xl font-bold text-gray-900">{rounds.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rounds</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-gray-900">
              {rounds.length > 0
                ? (rounds.reduce((s, r) => s + (r.totalScore - r.coursePar), 0) / rounds.length > 0 ? '+' : '')
                  + (rounds.reduce((s, r) => s + (r.totalScore - r.coursePar), 0) / rounds.length).toFixed(1)
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Avg vs Par</p>
          </div>
          <div className="text-center pl-4">
            <p className="text-2xl font-bold text-gray-900">
              {rounds.length > 0
                ? Math.min(...rounds.map(r => r.totalScore - r.coursePar)) >= 0
                  ? '+' + Math.min(...rounds.map(r => r.totalScore - r.coursePar))
                  : Math.min(...rounds.map(r => r.totalScore - r.coursePar))
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Best Score</p>
          </div>
        </div>
      )}

      {/* Recent rounds */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">Recent Rounds</h2>
          {rounds.length > 0 && (
            <button onClick={() => navigate('/history')} className="text-golf-green text-sm font-medium">
              See all
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-4xl mb-3">⛳</p>
            <p className="text-gray-500 text-sm">No rounds yet.</p>
            <p className="text-gray-400 text-xs mt-1">Play a round or upload a scorecard to get started.</p>
            {courses.length === 0 && (
              <button
                onClick={() => navigate('/courses/add')}
                className="mt-4 inline-flex items-center gap-1 text-golf-green text-sm font-medium"
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
                  className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">⛳</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{round.courseName}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {format(new Date(round.date), 'MMM d, yyyy')} · {round.teeName}
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
