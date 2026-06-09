import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Trash2, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { teeRatingSlope } from '../utils/handicap';
import { useAuth } from '../context/AuthContext';

const SORTS = [
  { key: 'hard', label: 'Hardest' },
  { key: 'easy', label: 'Easiest' },
  { key: 'az', label: 'A–Z' },
];

function teeColorHex(color) {
  const map = {
    Gold: '#d4af37', Red: '#ef4444', Green: '#16a34a', White: '#e5e7eb',
    Blue: '#3b82f6', Black: '#1f2937', Yellow: '#eab308', Orange: '#f97316',
    Purple: '#a855f7', Silver: '#9ca3af',
  };
  return map[color] ?? '#9ca3af';
}

const genderLabel = g => (g === 'womens' ? "Women's" : "Men's");

function TeeDot({ color, color2, className = 'w-3 h-3' }) {
  const c1 = teeColorHex(color);
  const c2 = color2 ? teeColorHex(color2) : null;
  return (
    <span
      className={`${className} rounded-full border border-gray-200 inline-block flex-shrink-0`}
      style={c2 ? { background: `linear-gradient(135deg, ${c1} 0 50%, ${c2} 50% 100%)` } : { backgroundColor: c1 }}
    />
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
        active ? 'bg-golf-green text-white' : 'bg-white text-gray-500 border border-hairline'
      }`}
    >
      {children}
    </button>
  );
}

function SummaryChip({ onClear, children }) {
  return (
    <span className="flex-shrink-0 inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold bg-golf-light text-golf-green">
      {children}
      <button onClick={onClear} className="w-4 h-4 rounded-full bg-golf-green/20 flex items-center justify-center active:bg-golf-green/40">
        <X size={10} />
      </button>
    </span>
  );
}

function FilterSection({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function Courses({ courses, users = [], deleteCourse, courseSort, setCourseSort, courseSearch, setCourseSearch }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState(null);
  const [colorFilter, setColorFilter] = useState(null);
  const [userFilter, setUserFilter] = useState(null);
  const search = courseSearch;
  const setSearch = setCourseSearch;
  const sort = courseSort ?? 'hard';
  const setSort = setCourseSort;

  // Flatten to playable (course, tee, gender) entries with rating + slope.
  const entries = useMemo(() => {
    const out = [];
    for (const course of courses) {
      const playedBy = users.filter(u => (u.played_course_ids ?? []).includes(course.id)).map(u => u.id);
      for (const tee of (course.tees ?? [])) {
        for (const g of ['mens', 'womens']) {
          const rs = teeRatingSlope(tee, g);
          if (rs.rating != null && rs.slope != null) {
            out.push({ course, courseId: course.id, color: tee.color, color2: tee.color2 || null, gender: g, rating: rs.rating, slope: rs.slope, playedBy });
          }
        }
      }
    }
    return out;
  }, [courses, users]);

  const colorsOf = e => [e.color, e.color2].filter(Boolean);
  const passGender = (e, g) => !g || e.gender === g;
  const passColor = (e, c) => !c || colorsOf(e).includes(c);
  const passUser = (e, u) => !u || e.playedBy.includes(u);

  // Cascading available options — each computed from the OTHER selected filters.
  const availGenders = useMemo(() => {
    const s = new Set();
    for (const e of entries) if (passColor(e, colorFilter) && passUser(e, userFilter)) s.add(e.gender);
    return s;
  }, [entries, colorFilter, userFilter]);
  const availColors = useMemo(() => {
    const s = new Set();
    for (const e of entries) if (passGender(e, genderFilter) && passUser(e, userFilter)) colorsOf(e).forEach(c => s.add(c));
    return s;
  }, [entries, genderFilter, userFilter]);
  const availUserIds = useMemo(() => {
    const s = new Set();
    for (const e of entries) if (passGender(e, genderFilter) && passColor(e, colorFilter)) e.playedBy.forEach(id => s.add(id));
    return s;
  }, [entries, genderFilter, colorFilter]);

  // Drop a selection once another filter makes it unavailable.
  useEffect(() => { if (genderFilter && !availGenders.has(genderFilter)) setGenderFilter(null); }, [availGenders, genderFilter]);
  useEffect(() => { if (colorFilter && !availColors.has(colorFilter)) setColorFilter(null); }, [availColors, colorFilter]);
  useEffect(() => { if (userFilter && !availUserIds.has(userFilter)) setUserFilter(null); }, [availUserIds, userFilter]);

  const colorOptions = useMemo(
    () => ['Gold', 'Red', 'Green', 'White', 'Blue', 'Black', 'Yellow', 'Orange', 'Purple', 'Silver'].filter(c => availColors.has(c)),
    [availColors]
  );
  const userOptions = useMemo(() => users.filter(u => availUserIds.has(u.id)), [users, availUserIds]);
  const userName = id => users.find(u => u.id === id)?.display_name || 'Player';

  // Per-course hardest matching tee under all filters, then sort.
  const ranked = useMemo(() => {
    const byCourse = new Map();
    for (const e of entries) {
      if (!passGender(e, genderFilter) || !passColor(e, colorFilter) || !passUser(e, userFilter)) continue;
      const cur = byCourse.get(e.courseId);
      if (!cur || e.slope > cur.slope || (e.slope === cur.slope && e.rating > cur.rating)) byCourse.set(e.courseId, e);
    }
    let rows = [...byCourse.values()];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(e => e.course.name.toLowerCase().includes(q) || (e.course.location ?? '').toLowerCase().includes(q));
    }
    if (sort === 'az') rows.sort((a, b) => a.course.name.localeCompare(b.course.name));
    else if (sort === 'za') rows.sort((a, b) => b.course.name.localeCompare(a.course.name));
    else if (sort === 'easy') rows.sort((a, b) => a.slope - b.slope || a.rating - b.rating);
    else rows.sort((a, b) => b.slope - a.slope || b.rating - a.rating);
    return rows;
  }, [entries, genderFilter, colorFilter, userFilter, search, sort]);

  // Courses that don't match the current filters — still listed for edit/delete.
  const otherCourses = useMemo(() => {
    const matched = new Set(ranked.map(e => e.courseId));
    let list = courses.filter(c => !matched.has(c.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.location ?? '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [courses, ranked, search]);

  const activeCount = [genderFilter, colorFilter, userFilter].filter(Boolean).length;
  const anyFilter = activeCount > 0;
  const showRank = sort === 'hard' || sort === 'easy';

  function handleDelete(id) {
    if (confirmDelete === id) {
      deleteCourse(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }

  function clearAll() {
    setGenderFilter(null);
    setColorFilter(null);
    setUserFilter(null);
  }

  function CourseRow({ entry, course, rank }) {
    const c = course ?? entry.course;
    return (
      <div className="bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3">
        <button className="flex-1 flex items-center gap-3 text-left active:opacity-70 min-w-0" onClick={() => navigate(`/courses/${c.id}`)}>
          {rank != null ? (
            <div className="w-7 text-center flex-shrink-0">
              <span className="text-base font-black text-gray-300 tabular-nums">{rank}</span>
            </div>
          ) : (
            <div className="w-9 h-9 bg-golf-light rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-golf-green" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
            {c.location && <p className="text-gray-400 text-xs truncate">{c.location}</p>}
            {entry ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <TeeDot color={entry.color} color2={entry.color2} />
                <span className="text-gray-400 text-xs truncate">
                  {entry.color2 ? `${entry.color}/${entry.color2}` : entry.color} · {genderLabel(entry.gender)}
                </span>
              </div>
            ) : (
              <p className="text-gray-300 text-xs mt-0.5">
                {anyFilter ? 'No matching tee' : `${c.tees?.length ?? 0} tee${(c.tees?.length ?? 0) !== 1 ? 's' : ''} · no rating yet`}
              </p>
            )}
          </div>
          {entry && (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{entry.rating} / {entry.slope}</p>
              <p className="text-[9px] font-semibold text-gray-300 uppercase tracking-wider mt-0.5">Rating / Slope</p>
            </div>
          )}
          {!entry && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
        </button>
        <button
          onClick={() => handleDelete(c.id)}
          className={`p-2 rounded-full transition-colors ${confirmDelete === c.id ? 'bg-red-100 text-red-500' : 'text-gray-300 active:text-red-400'}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas-cream">
      <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <p className="text-gray-500 text-sm mt-0.5">{courses.length} saved course{courses.length !== 1 ? 's' : ''} · ranked by difficulty</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {courses.length > 0 && (
          <div className="space-y-2.5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="w-full bg-white border border-hairline rounded-full pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ink shadow-card"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(true)}
                className="flex-shrink-0 flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-hairline text-gray-600 shadow-card active:bg-gray-50"
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeCount > 0 && (
                  <span className="ml-0.5 min-w-[16px] h-4 px-1 bg-golf-green text-white rounded-full text-[10px] flex items-center justify-center">{activeCount}</span>
                )}
              </button>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mr-4 pr-4">
                {genderFilter && <SummaryChip onClear={() => setGenderFilter(null)}>{genderLabel(genderFilter)}</SummaryChip>}
                {colorFilter && <SummaryChip onClear={() => setColorFilter(null)}><TeeDot color={colorFilter} /> {colorFilter}</SummaryChip>}
                {userFilter && <SummaryChip onClear={() => setUserFilter(null)}>{userName(userFilter)}</SummaryChip>}
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-gray-400 border border-hairline"
                >
                  Sort: {SORTS.find(s => s.key === sort)?.label}
                </button>
              </div>
            </div>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-10 text-center">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="text-gray-600 font-medium">No courses saved yet</p>
            <p className="text-gray-400 text-sm mt-1">Add a course to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranked.length === 0 && otherCourses.length === 0 && (
              <div className="bg-white rounded-xl shadow-card p-8 text-center">
                <p className="text-gray-500 text-sm">No courses match these filters.</p>
              </div>
            )}

            {ranked.map((entry, i) => (
              <CourseRow key={entry.courseId} entry={entry} rank={showRank ? i + 1 : null} />
            ))}

            {otherCourses.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest pt-3 px-1">
                  {anyFilter ? 'Not matching filters' : 'No rating data'}
                </p>
                {otherCourses.map(course => (
                  <CourseRow key={course.id} course={course} rank={null} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter & sort bottom sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowFilters(false)}>
          <div
            className="w-full max-w-md bg-canvas-cream rounded-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filter &amp; Sort</h2>
              {activeCount > 0
                ? <button onClick={clearAll} className="text-xs font-semibold text-golf-green">Clear all</button>
                : <button onClick={() => setShowFilters(false)} className="text-gray-400 text-sm font-medium">Close</button>}
            </div>

            <FilterSection label="Gender">
              <Chip active={!genderFilter} onClick={() => setGenderFilter(null)}>Any</Chip>
              {['mens', 'womens'].filter(g => availGenders.has(g) || genderFilter === g).map(g => (
                <Chip key={g} active={genderFilter === g} onClick={() => setGenderFilter(genderFilter === g ? null : g)}>{genderLabel(g)}</Chip>
              ))}
            </FilterSection>

            {colorOptions.length > 0 && (
              <FilterSection label="Tee color">
                <Chip active={!colorFilter} onClick={() => setColorFilter(null)}>Any</Chip>
                {colorOptions.map(c => (
                  <Chip key={c} active={colorFilter === c} onClick={() => setColorFilter(colorFilter === c ? null : c)}><TeeDot color={c} /> {c}</Chip>
                ))}
              </FilterSection>
            )}

            {userOptions.length > 0 && (
              <FilterSection label="Played by">
                <Chip active={!userFilter} onClick={() => setUserFilter(null)}>Anyone</Chip>
                {userOptions.map(u => (
                  <Chip key={u.id} active={userFilter === u.id} onClick={() => setUserFilter(userFilter === u.id ? null : u.id)}>
                    {(u.display_name || 'Player')}{u.id === user?.id ? ' (you)' : ''}
                  </Chip>
                ))}
              </FilterSection>
            )}

            <FilterSection label="Sort by">
              {SORTS.map(s => (
                <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</Chip>
              ))}
            </FilterSection>

            <button
              onClick={() => setShowFilters(false)}
              className="w-full bg-golf-green text-white font-semibold py-3.5 rounded-full active:opacity-90 transition-opacity"
            >
              Show {ranked.length} course{ranked.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/courses/add')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-golf-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
