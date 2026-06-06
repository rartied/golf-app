import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { calcCourseHandicap, getHoleStrokes } from '../utils/handicap';

function teeColorHex(color) {
  const map = {
    White: '#f3f4f6', Yellow: '#eab308', Blue: '#3b82f6',
    Red: '#ef4444', Gold: '#d97706', Black: '#1f2937',
    Green: '#16a34a', Silver: '#9ca3af', Orange: '#f97316', Purple: '#7c3aed',
  };
  return map[color] ?? '#9ca3af';
}


function CourseSearch({ courses, selected, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = query.trim()
    ? courses.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.location ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : courses;

  function pick(course) {
    onSelect(course);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  // Close dropdown when tapping outside
  useEffect(() => {
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 border border-hairline rounded-xl px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-ink">
        <Search size={15} className="text-shade-40 flex-shrink-0" />
        <input
          ref={inputRef}
          value={open ? query : ''}
          placeholder={selected?.name ?? 'Search courses…'}
          onFocus={() => setOpen(true)}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-900 placeholder:font-medium"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-card overflow-hidden z-30 max-h-56 overflow-y-auto">
          {filtered.map(course => (
            <button
              key={course.id}
              onPointerDown={e => { e.preventDefault(); pick(course); }}
              className={`w-full text-left px-4 py-3 flex flex-col border-b border-hairline last:border-0 active:bg-canvas-cream transition-colors ${
                course.id === selected?.id ? 'bg-canvas-cream' : ''
              }`}
            >
              <span className="text-sm font-semibold text-gray-900">{course.name}</span>
              {course.location && (
                <span className="text-xs text-shade-40 mt-0.5">{course.location}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-card px-4 py-3 z-30">
          <p className="text-sm text-shade-40">No courses match "{query}"</p>
        </div>
      )}
    </div>
  );
}

export default function StrokeCard({ courses, handicapIndex }) {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState(courses[0] ?? null);
  const [selectedTee, setSelectedTee] = useState(courses[0]?.tees[0] ?? null);

  function handleCourseChange(course) {
    setSelectedCourse(course ?? null);
    setSelectedTee(course?.tees[0] ?? null);
  }

  // ── No handicap yet ────────────────────────────────────────────────────────
  if (handicapIndex === null) {
    return (
      <div className="min-h-screen bg-canvas-cream pb-24 flex flex-col">
        <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
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
      <div className="min-h-screen bg-canvas-cream pb-24 flex flex-col">
        <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
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
    <div className="min-h-screen bg-canvas-cream pb-24">
      {/* Header */}
      <div className="bg-canvas-night safe-pt px-4 pt-12 pb-6">
        <p className="text-white/50 text-sm font-medium">Handicap Index</p>
        <p className="text-white text-5xl font-black leading-none mt-1">{handicapIndex.toFixed(1)}</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Course + tee picker */}
        <div className="bg-white rounded-xl shadow-card p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Course</label>
            <CourseSearch
              courses={courses}
              selected={selectedCourse}
              onSelect={handleCourseChange}
            />
          </div>

          {selectedCourse && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Tee</label>
              <div className="flex gap-2 flex-wrap">
                {selectedCourse.tees.map(tee => {
                  const isSelected = selectedTee?.id === tee.id;
                  return (
                    <button
                      key={tee.id}
                      onClick={() => setSelectedTee(tee)}
                      style={{ backgroundColor: teeColorHex(tee.color) }}
                      className={`px-4 py-2 min-w-[4rem] rounded-xl transition-all ${
                        isSelected ? 'ring-2 ring-offset-2 ring-gray-400' : 'opacity-50 active:opacity-80'
                      } ${tee.color === 'White' ? 'border border-gray-200' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Course handicap summary */}
        {courseHandicap !== null && (
          <div className="bg-white rounded-xl shadow-card divide-y divide-hairline">
            <div className="px-4 py-3.5 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Course Handicap</span>
              <span className="font-black text-gray-900 text-2xl">{courseHandicap}</span>
            </div>
            <div className="px-4 py-3.5 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Target gross score</p>
                <p className="text-gray-400 text-xs mt-0.5">Shoot this to play exactly to your handicap</p>
              </div>
              <span className="font-black text-ink text-2xl">{targetGross}</span>
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
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h3 className="font-semibold text-gray-800 text-sm">Stroke Allocation</h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Green = you get extra strokes · Target = gross score for net par
              </p>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-5 px-4 py-2 bg-canvas-cream border-y border-hairline text-xs font-semibold text-gray-400 text-center">
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

            <div className="border-t border-hairline mx-4" />

            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest py-1">Back 9</p>
              {back9.map(h => <HoleRow key={h.number} hole={h} />)}
              <NineTotal label="In" holes={back9} />
            </div>

            <div className="border-t border-hairline" />

            {/* Grand total */}
            <div className="grid grid-cols-5 px-4 py-3.5 text-sm text-center font-bold bg-canvas-cream">
              <div className="text-left text-gray-700">Total</div>
              <div className="text-gray-700">{holes.reduce((s, h) => s + h.par, 0)}</div>
              <div />
              <div className="text-ink">
                {holes.reduce((s, h) => s + h.strokes, 0) > 0
                  ? `+${holes.reduce((s, h) => s + h.strokes, 0)}`
                  : holes.reduce((s, h) => s + h.strokes, 0)}
              </div>
              <div className="text-ink">{holes.reduce((s, h) => s + h.netPar, 0)}</div>
            </div>
          </div>
        ) : selectedCourse ? (
          <div className="bg-white rounded-xl shadow-card p-6 text-center">
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
    <div className={`grid grid-cols-5 py-2.5 text-sm text-center border-b border-hairline last:border-0 ${
      hasStrokes ? 'bg-aloe/20' : ''
    }`}>
      <div className="text-left font-semibold text-gray-700">{hole.number}</div>
      <div className="text-gray-500">{hole.par}</div>
      <div className="text-gray-400 text-xs self-center">{hole.strokeIndex}</div>
      <div className={
        hasStrokes  ? 'font-bold text-ink' :
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
      <div className="text-ink">
        {totalStrokes > 0 ? `+${totalStrokes}` : totalStrokes || '·'}
      </div>
      <div className="text-gray-700">{holes.reduce((s, h) => s + h.netPar, 0)}</div>
    </div>
  );
}
