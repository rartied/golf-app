import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';

export default function History({ rounds }) {
  const navigate = useNavigate();
  const sorted = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''} played
        </p>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">⛳</p>
            <p className="text-gray-600 font-medium">No rounds yet</p>
            <p className="text-gray-400 text-sm mt-1">Play a round to see your history</p>
          </div>
        ) : (
          sorted.map(round => {
            const diff = round.totalScore - round.coursePar;
            return (
              <button
                key={round.id}
                onClick={() => navigate(`/history/${round.id}`)}
                className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors text-left"
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
                  <p className="font-semibold text-gray-900 text-sm truncate">{round.courseName}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{round.teeName} tees</p>
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
          })
        )}
      </div>
    </div>
  );
}
