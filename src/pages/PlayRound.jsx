import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Search } from 'lucide-react';
import { storage } from '../utils/storage';
import {
  calcCourseHandicap,
  calcScoreDifferential,
  calcAdjustedGrossScore,
} from '../utils/handicap';

function relativeScore(score, par) {
  const d = score - par;
  if (d <= -3) return { label: 'Albatross', color: 'text-yellow-500' };
  if (d === -2) return { label: 'Eagle', color: 'text-yellow-500' };
  if (d === -1) return { label: 'Birdie', color: 'text-green-600' };
  if (d === 0)  return { label: 'Par',    color: 'text-gray-500' };
  if (d === 1)  return { label: 'Bogey',  color: 'text-blue-500' };
  if (d === 2)  return { label: 'Double', color: 'text-red-500' };
  return { label: `+${d}`, color: 'text-red-600' };
}

function dotColor(score, par) {
  const d = score - par;
  if (d <= -2) return 'bg-yellow-400';
  if (d === -1) return 'bg-green-500';
  if (d === 0)  return 'bg-white/50';
  if (d === 1)  return 'bg-blue-400';
  return 'bg-red-400';
}

function teeColorHex(color) {
  const map = {
    White: '#e5e7eb', Yellow: '#eab308', Blue: '#3b82f6',
    Red: '#ef4444', Gold: '#d97706', Black: '#1f2937',
    Green: '#16a34a', Silver: '#9ca3af',
  };
  return map[color] ?? '#9ca3af';
}

function buildHoleScores(course, tee) {
  if (course.holes?.length === 18) {
    return course.holes.map(h => ({
      number: h.number,
      par: h.par,
      strokeIndex: h.strokeIndex,
      score: h.par,
    }));
  }
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    strokeIndex: i + 1,
    score: 4,
  }));
}

export default function PlayRound({ courses, handicapIndex, addRound }) {
  const navigate = useNavigate();

  const [phase, setPhase] = useState('setup');
  const [savedRound, setSavedRound] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTee, setSelectedTee] = useState(null);
  const [holeScores, setHoleScores] = useState([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    const saved = storage.getActiveRound();
    if (saved?.phase === 'scoring') {
      setSavedRound(saved);
      setPhase('resume');
    }
  }, []);

  // Persist active round during scoring
  useEffect(() => {
    if (phase !== 'scoring' || !selectedCourse || !selectedTee) return;
    storage.saveActiveRound({
      phase: 'scoring',
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      teeId: selectedTee.id,
      teeName: selectedTee.name,
      courseRating: selectedTee.rating,
      slope: selectedTee.slope,
      par: selectedTee.par,
      date,
      holeScores,
      currentHole,
    });
  }, [phase, holeScores, currentHole, selectedCourse, selectedTee, date]);

  function handleResume() {
    const s = savedRound;
    const course = courses.find(c => c.id === s.courseId) ?? { id: s.courseId, name: s.courseName, holes: [] };
    const tee = course.tees?.find(t => t.id === s.teeId) ?? {
      id: s.teeId, name: s.teeName, rating: s.courseRating, slope: s.slope, par: s.par,
    };
    setSelectedCourse(course);
    setSelectedTee(tee);
    setHoleScores(s.holeScores);
    setCurrentHole(s.currentHole);
    setPhase('scoring');
  }

  function handleStartNew() {
    storage.clearActiveRound();
    setSavedRound(null);
    setPhase('setup');
  }

  function handleStart() {
    setHoleScores(buildHoleScores(selectedCourse, selectedTee));
    setCurrentHole(0);
    setPhase('scoring');
  }

  function adjustScore(idx, delta) {
    setHoleScores(prev => prev.map((h, i) => {
      if (i !== idx) return h;
      return { ...h, score: Math.max(1, Math.min(h.score + delta, h.par + 8)) };
    }));
  }

  function handleSave() {
    const totalScore = holeScores.reduce((s, h) => s + h.score, 0);
    const coursePar = selectedTee.par;
    const courseHandicap = handicapIndex !== null
      ? calcCourseHandicap(handicapIndex, selectedTee.slope, selectedTee.rating, selectedTee.par)
      : null;
    const adjustedGrossScore = courseHandicap !== null
      ? calcAdjustedGrossScore(holeScores, courseHandicap)
      : totalScore;
    const scoreDifferential = calcScoreDifferential(adjustedGrossScore, selectedTee.rating, selectedTee.slope);

    addRound({
      id: uuid(),
      date,
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      teeId: selectedTee.id,
      teeName: selectedTee.name,
      courseRating: selectedTee.rating,
      slope: selectedTee.slope,
      coursePar,
      totalScore,
      adjustedGrossScore,
      scoreDifferential,
      holeScores,
    });
    storage.clearActiveRound();
    navigate('/');
  }

  function handleDiscard() {
    storage.clearActiveRound();
    navigate('/');
  }

  // ── RESUME PROMPT ──────────────────────────────────────────────────────────
  if (phase === 'resume') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Play Round</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <div className="w-16 h-16 bg-golf-light rounded-full flex items-center justify-center">
            <Flag size={28} className="text-golf-green" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">Round in progress</p>
            <p className="text-gray-500 text-sm mt-1">
              {savedRound.courseName} · {savedRound.teeName}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Hole {savedRound.currentHole + 1} of 18
            </p>
          </div>
          <div className="w-full space-y-3">
            <button
              onClick={handleResume}
              className="w-full bg-golf-green text-white font-semibold py-4 rounded-2xl active:opacity-90"
            >
              Resume Round
            </button>
            <button
              onClick={handleStartNew}
              className="w-full bg-white border border-gray-200 text-gray-600 font-semibold py-4 rounded-2xl active:bg-gray-50"
            >
              Start New Round
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Play Round</h1>
        </div>

        <div className="px-4 pt-5 space-y-5">
          {/* Date */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Date Played
            </h2>
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
              <input
                type="date"
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                className="w-full text-gray-900 text-sm font-medium bg-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Select Course
            </h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-gray-500 text-sm">No courses saved yet.</p>
                <button
                  onClick={() => navigate('/courses/add')}
                  className="mt-3 text-golf-green text-sm font-medium"
                >
                  Add a course →
                </button>
              </div>
            ) : (
              <>
                {courses.length > 4 && (
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={e => setCourseSearch(e.target.value)}
                      placeholder="Search courses…"
                      className="w-full bg-white border border-gray-200 rounded-2xl pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-golf-green shadow-sm"
                    />
                  </div>
                )}
              <div className="space-y-2">
                {courses.filter(c =>
                  !courseSearch.trim() ||
                  c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                  (c.location ?? '').toLowerCase().includes(courseSearch.toLowerCase())
                ).map(course => (
                  <button
                    key={course.id}
                    onClick={() => { setSelectedCourse(course); setSelectedTee(null); }}
                    className={`w-full text-left bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 transition-all ${
                      selectedCourse?.id === course.id ? 'ring-2 ring-golf-green' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-golf-light rounded-full flex items-center justify-center flex-shrink-0">
                      <Flag size={18} className="text-golf-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{course.name}</p>
                      {course.location && (
                        <p className="text-gray-400 text-xs truncate">{course.location}</p>
                      )}
                    </div>
                    {selectedCourse?.id === course.id && (
                      <div className="w-5 h-5 bg-golf-green rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              </>
            )}
          </div>

          {selectedCourse && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Select Tee
              </h2>
              <div className="space-y-2">
                {selectedCourse.tees.map(tee => (
                  <button
                    key={tee.id}
                    onClick={() => setSelectedTee(tee)}
                    className={`w-full text-left bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 transition-all ${
                      selectedTee?.id === tee.id ? 'ring-2 ring-golf-green' : ''
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: teeColorHex(tee.color) }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{tee.name}</p>
                      <p className="text-gray-400 text-xs">
                        Rating {tee.rating} · Slope {tee.slope} · Par {tee.par}
                      </p>
                    </div>
                    {selectedTee?.id === tee.id && (
                      <div className="w-5 h-5 bg-golf-green rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCourse && selectedTee && (
            <button
              onClick={handleStart}
              className="w-full bg-golf-green text-white font-semibold py-4 rounded-2xl active:opacity-90 transition-opacity"
            >
              {date === new Date().toISOString().split('T')[0] ? 'Start Round' : 'Log Past Round'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── SCORING ────────────────────────────────────────────────────────────────
  if (phase === 'scoring') {
    const hole = holeScores[currentHole];
    const rel = relativeScore(hole.score, hole.par);
    const totalGross = holeScores.reduce((s, h) => s + h.score, 0);
    const totalPar = holeScores.reduce((s, h) => s + h.par, 0);
    const totalDiff = totalGross - totalPar;

    return (
      <div className="h-dvh bg-gray-50 flex flex-col overflow-hidden">
        {/* Green header */}
        <div className="bg-golf-green safe-pt px-4 pt-10 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setPhase('setup')}
              className="p-1 -ml-1 active:opacity-70"
            >
              <ArrowLeft size={22} className="text-white/80" />
            </button>
            <div className="text-center flex-1 mx-3">
              <p className="text-white font-bold text-base leading-tight truncate">
                {selectedCourse.name}
              </p>
              <p className="text-green-200 text-xs">{selectedTee.name} · Par {selectedTee.par}</p>
            </div>
            <div className="text-right min-w-[40px]">
              <p className="text-white font-bold text-lg leading-tight">{totalGross}</p>
              <p className={`text-xs font-semibold ${
                totalDiff === 0 ? 'text-green-200' :
                totalDiff < 0  ? 'text-yellow-300' : 'text-red-300'
              }`}>
                {totalDiff === 0 ? 'E' : totalDiff > 0 ? `+${totalDiff}` : totalDiff}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center">
            {holeScores.map((h, i) => (
              <button
                key={h.number}
                onClick={() => setCurrentHole(i)}
                className={`rounded-full transition-all ${
                  i === currentHole
                    ? `w-5 h-5 ring-2 ring-white ring-offset-1 ring-offset-golf-green ${dotColor(h.score, h.par)}`
                    : i < currentHole
                    ? `w-3.5 h-3.5 ${dotColor(h.score, h.par)}`
                    : 'w-3.5 h-3.5 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Hole scoring area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          <div className="text-center">
            <p className="text-7xl font-black text-gray-900 leading-none">
              {hole.number}
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="px-3.5 py-1 bg-golf-light text-golf-green text-sm font-bold rounded-full">
                Par {hole.par}
              </span>
              {hole.strokeIndex && (
                <span className="px-3.5 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-full">
                  SI {hole.strokeIndex}
                </span>
              )}
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-10">
            <button
              onPointerDown={() => adjustScore(currentHole, -1)}
              className="w-16 h-16 bg-white shadow-md rounded-full flex items-center justify-center text-3xl font-light text-gray-600 active:scale-95 transition-transform select-none"
            >
              −
            </button>
            <div className="text-center w-20">
              <p className="text-8xl font-black text-gray-900 leading-none tabular-nums">
                {hole.score}
              </p>
              <p className={`text-sm font-semibold mt-2 ${rel.color}`}>{rel.label}</p>
            </div>
            <button
              onPointerDown={() => adjustScore(currentHole, 1)}
              className="w-16 h-16 bg-white shadow-md rounded-full flex items-center justify-center text-3xl font-light text-gray-600 active:scale-95 transition-transform select-none"
            >
              +
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 pb-6 safe-pb space-y-2 flex-shrink-0">
          <div className="flex gap-3">
            {currentHole > 0 ? (
              <button
                onClick={() => setCurrentHole(h => h - 1)}
                className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-1 active:bg-gray-50"
              >
                <ChevronLeft size={18} /> Prev
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {currentHole < 17 ? (
              <button
                onClick={() => setCurrentHole(h => h + 1)}
                className="flex-1 bg-golf-green text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-1 active:opacity-90"
              >
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => setPhase('summary')}
                className="flex-1 bg-golf-green text-white font-semibold py-3.5 rounded-2xl active:opacity-90"
              >
                Finish Round
              </button>
            )}
          </div>

          {currentHole < 17 && (
            <button
              onClick={() => setPhase('summary')}
              className="w-full text-center text-gray-400 text-sm py-1"
            >
              Finish early
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const totalScore = holeScores.reduce((s, h) => s + h.score, 0);
  const coursePar = selectedTee.par;
  const diff = totalScore - coursePar;
  const courseHandicap = handicapIndex !== null
    ? calcCourseHandicap(handicapIndex, selectedTee.slope, selectedTee.rating, selectedTee.par)
    : null;
  const adjustedGrossScore = courseHandicap !== null
    ? calcAdjustedGrossScore(holeScores, courseHandicap)
    : totalScore;
  const scoreDifferential = calcScoreDifferential(adjustedGrossScore, selectedTee.rating, selectedTee.slope);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-golf-green safe-pt px-4 pt-12 pb-8 text-center">
        <p className="text-green-200 text-sm font-medium">Round Complete</p>
        <p className="text-white text-6xl font-black mt-1 leading-none">{totalScore}</p>
        <p className={`text-xl font-bold mt-2 ${
          diff === 0 ? 'text-green-200' : diff < 0 ? 'text-yellow-300' : 'text-red-300'
        }`}>
          {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff} to par
        </p>
        <p className="text-green-200 text-sm mt-2">
          {selectedCourse.name} · {selectedTee.name}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {[
            ['Gross Score', totalScore],
            ['Course Par', coursePar],
            ...(adjustedGrossScore !== totalScore ? [['Adjusted Gross', adjustedGrossScore]] : []),
            ['Score Differential', scoreDifferential.toFixed(1)],
            ['Rating / Slope', `${selectedTee.rating} / ${selectedTee.slope}`],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3 flex justify-between items-center">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Scorecard */}
        <div className="bg-white rounded-2xl shadow-sm p-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Scorecard</h3>
          {[holeScores.slice(0, 9), holeScores.slice(9)].map((nine, nineIdx) => (
            <div key={nineIdx} className="mb-3 last:mb-0">
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
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-golf-green text-white font-semibold py-4 rounded-2xl active:opacity-90 transition-opacity"
        >
          Save Round
        </button>
        <button
          onClick={() => setPhase('scoring')}
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl active:bg-gray-50"
        >
          Keep Editing
        </button>
        <button
          onClick={handleDiscard}
          className="w-full text-center text-gray-400 text-sm py-2"
        >
          Discard Round
        </button>
      </div>
    </div>
  );
}
