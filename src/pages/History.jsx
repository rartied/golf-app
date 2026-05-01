import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function History({ rounds }) {
  const navigate = useNavigate();
  const [view, setView] = useState('all'); // 'all' | 'byCourse'
  const [expanded, setExpanded] = useState({}); // courseKey -> bool

  const sorted = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by course, ordered by each course's most recent round
  const courseGroups = [];
  const seen = {};
  for (const r of sorted) {
    const key = r.courseId || r.courseName;
    if (!seen[key]) {
      seen[key] = { key, name: r.courseName, rounds: [] };
      courseGroups.push(seen[key]);
    }
    seen[key].rounds.push(r);
  }

  function toggleExpand(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">History</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {rounds.length} round{rounds.length !== 1 ? 's' : ''} played
            </p>
          </div>
          {rounds.length > 0 && (
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  view === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setView('byCourse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  view === 'byCourse' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                By Course
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">⛳</p>
            <p className="text-gray-600 font-medium">No rounds yet</p>
            <p className="text-gray-400 text-sm mt-1">Play a round to see your history</p>
          </div>
        ) : view === 'all' ? (
          sorted.map(round => <RoundRow key={round.id} round={round} navigate={navigate} />)
        ) : (
          courseGroups.map(group => {
            const isOpen = !!expanded[group.key];
            const latest = group.rounds[0];
            return (
              <div key={group.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Course header — tap to expand */}
                <button
                  onClick={() => toggleExpand(group.key)}
                  className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-50 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{group.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Last played {format(new Date(latest.date), 'MMM d, yyyy')} · {group.rounds.length} round{group.rounds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Most recent round always visible */}
                <div className="border-t border-gray-100">
                  <RoundRow round={latest} navigate={navigate} compact />
                </div>

                {/* Rest of rounds shown when expanded */}
                {isOpen && group.rounds.length > 1 && (
                  <div className="border-t border-gray-100">
                    {group.rounds.slice(1).map(round => (
                      <div key={round.id} className="border-b border-gray-50 last:border-0">
                        <RoundRow round={round} navigate={navigate} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RoundRow({ round, navigate, compact }) {
  const diff = round.totalScore - round.coursePar;
  return (
    <button
      onClick={() => navigate(`/history/${round.id}`)}
      className="w-full bg-white px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
    >
      <div className="flex-shrink-0 text-center w-12">
        <p className="text-xs text-gray-400 font-medium uppercase">
          {format(new Date(round.date), 'MMM')}
        </p>
        <p className="text-xl font-black text-gray-900 leading-tight">
          {format(new Date(round.date), 'd')}
        </p>
        <p className="text-xs text-gray-400">
          {format(new Date(round.date), 'yyyy')}
        </p>
      </div>
      <div className="w-px h-10 bg-gray-100 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {!compact && <p className="font-semibold text-gray-900 text-sm truncate">{round.courseName}</p>}
        {round.teeName && <p className="text-gray-400 text-xs mt-0.5">{round.teeName}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-gray-900 text-lg">{round.totalScore}</p>
        <p className={`text-xs font-semibold ${
          diff === 0 ? 'text-gray-500' :
          diff < 0   ? 'text-green-600' : 'text-red-500'
        }`}>
          {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  );
}
