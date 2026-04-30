import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcCourseHandicap, getHoleStrokes } from '../utils/handicap';

export default function StrokeCard({ courses, handicapIndex }) {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState(courses[0] ?? null);
  const [selectedTee, setSelectedTee] = useState(courses[0]?.tees[0] ?? null);

  function handleCourseChange(id) {
    const course = courses.find(c => c.id === id);
    setSelectedCourse(course ?? null);
    setSelectedTee(course?.tees[0] ?? null);
  }

  // ── No handicap yet ────────────────────────────────────────────────────────
  if (handicapIndex === null) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">
        <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Stroke Card</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
          <p className="text-5xl">🏌️</p>
          <p className="text-gray-700 font-semibold">No handicap yet</p>
          <p className="text-gray-400 text-sm">You need at least 3 rounds recorded to establish a handicap index.</p>
        </div>
      </div>
    );
  }

  // ── No courses ─────────────────────────────────────────────────────────────
  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">
        <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Stroke Card</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
          <p className="text-gray-400 text-sm">Add a course to see your stroke allocation.</p>
          <button onClick={() => navigate('/courses/add')} className="text-golf-green text-sm font-medium">
            Add a course →
          </button>
        </div>
      </div>
    );
  }

  const courseHandicap = selectedTee
    ? calcCourseHandicap(handicapIndex, selectedTee.slope, selectedTee.rating, selectedTee.par)
    : null;

  const targetGross = courseHandicap !== null ? selectedTee.par + courseHandicap : null;
  const hasHoleDetails = selectedCourse?.holes?.length === 18;

  const holes = hasHoleDetails
    ? selectedCourse.holes.map(h => {
        const strokes = getHoleStrokes(courseHandicap, h.strokeIndex);
        return { ...h, strokes, netPar: h.par + strokes };
      })
    : [];

  const front9 = holes.slice(0, 9);
  const back9  = holes.slice(9);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-golf-green safe-pt px-4 pt-12 pb-6">
        <p className="text-green-200 text-sm font-medium">Handicap Index</p>
        <p className="text-white text-5xl font-black leading-none mt-1">{handicapIndex.toFixed(1)}</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Course + tee picker */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Course</label>
            {courses.length === 1 ? (
              <p className="text-sm font-semibold text-gray-900">{selectedCourse.name}</p>
            ) : (
              <select
                value={selectedCourse?.id ?? ''}
                onChange={e => handleCourseChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-golf-green"
              >
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {selectedCourse && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Tee</label>
              <div className="flex gap-2 flex-wrap">
                {selectedCourse.tees.map(tee => (
                  <button
                    key={tee.id}
                    onClick={() => setSelectedTee(tee)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      selectedTee?.id === tee.id
                        ? 'bg-golf-green text-white'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    {tee.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Course handicap summary */}
        {courseHandicap !== null && (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            <div className="px-4 py-3.5 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Course Handicap</span>
              <span className="font-black text-gray-900 text-2xl">{courseHandicap}</span>
            </div>
            <div className="px-4 py-3.5 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Target gross score</p>
                <p className="text-gray-400 text-xs mt-0.5">Shoot this to play exactly to your handicap</p>
              </div>
              <span className="font-black text-golf-green text-2xl">{targetGross}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-gray-400 text-xs">Rating / Slope / Par</span>
              <span className="text-gray-500 text-xs font-medium">
                {selectedTee.rating} / {selectedTee.slope} / {selectedTee.par}
              </span>
            </div>
          </div>
        )}

        {/* Per-hole stroke allocation */}
        {hasHoleDetails ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-semibold text-gray-800 text-sm">Stroke Allocation</h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Green = you get extra strokes · Target = gross score for net par
              </p>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-5 px-4 py-2 bg-gray-50 border-y border-gray-100 text-xs font-semibold text-gray-400 text-center">
              <div className="text-left">Hole</div>
              <div>Par</div>
              <div>SI</div>
              <div>Strokes</div>
              <div>Target</div>
            </div>

            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest py-1">Front 9</p>
              {front9.map(h => <HoleRow key={h.number} hole={h} />)}
              <NineTotal label="Out" holes={front9} />
            </div>

            <div className="border-t border-gray-200 mx-4" />

            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest py-1">Back 9</p>
              {back9.map(h => <HoleRow key={h.number} hole={h} />)}
              <NineTotal label="In" holes={back9} />
            </div>

            <div className="border-t border-gray-200" />

            {/* Grand total */}
            <div className="grid grid-cols-5 px-4 py-3.5 text-sm text-center font-bold bg-gray-50">
              <div className="text-left text-gray-700">Total</div>
              <div className="text-gray-700">{holes.reduce((s, h) => s + h.par, 0)}</div>
              <div />
              <div className="text-golf-green">
                {holes.reduce((s, h) => s + h.strokes, 0) > 0
                  ? `+${holes.reduce((s, h) => s + h.strokes, 0)}`
                  : holes.reduce((s, h) => s + h.strokes, 0)}
              </div>
              <div className="text-golf-green">{holes.reduce((s, h) => s + h.netPar, 0)}</div>
            </div>
          </div>
        ) : selectedCourse ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-gray-500 text-sm">No hole details configured for this course.</p>
            <p className="text-gray-400 text-xs mt-1">Add par and stroke index per hole to see allocation.</p>
            <button
              onClick={() => navigate(`/courses/${selectedCourse.id}`)}
              className="mt-3 text-golf-green text-sm font-medium"
            >
              Edit course →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HoleRow({ hole }) {
  const hasStrokes = hole.strokes > 0;
  const plusStrokes = hole.strokes < 0; // plus handicap
  return (
    <div className={`grid grid-cols-5 py-2.5 text-sm text-center border-b border-gray-50 last:border-0 ${
      hasStrokes ? 'bg-green-50/40' : ''
    }`}>
      <div className="text-left font-semibold text-gray-700">{hole.number}</div>
      <div className="text-gray-500">{hole.par}</div>
      <div className="text-gray-400 text-xs self-center">{hole.strokeIndex}</div>
      <div className={
        hasStrokes  ? 'font-bold text-golf-green' :
        plusStrokes ? 'font-bold text-red-400' :
                      'text-gray-300'
      }>
        {hasStrokes ? `+${hole.strokes}` : plusStrokes ? hole.strokes : '·'}
      </div>
      <div className={`font-bold ${hasStrokes || plusStrokes ? 'text-gray-900' : 'text-gray-400'}`}>
        {hole.netPar}
      </div>
    </div>
  );
}

function NineTotal({ label, holes }) {
  const totalStrokes = holes.reduce((s, h) => s + h.strokes, 0);
  return (
    <div className="grid grid-cols-5 py-2 text-xs text-center font-bold text-gray-500 border-t border-gray-100 mt-1">
      <div className="text-left">{label}</div>
      <div>{holes.reduce((s, h) => s + h.par, 0)}</div>
      <div />
      <div className="text-golf-green">
        {totalStrokes > 0 ? `+${totalStrokes}` : totalStrokes || '·'}
      </div>
      <div className="text-gray-700">{holes.reduce((s, h) => s + h.netPar, 0)}</div>
    </div>
  );
}
