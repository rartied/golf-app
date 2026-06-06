import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Trash2, MapPin, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

const SORTS = [
  { key: 'az', label: 'A–Z' },
  { key: 'za', label: 'Z–A' },
  { key: 'easy', label: 'Easiest' },
  { key: 'hard', label: 'Hardest' },
];

function avgSlope(course) {
  const tees = course.tees?.filter(t => t.slope) ?? [];
  if (!tees.length) return null;
  return tees.reduce((s, t) => s + Number(t.slope), 0) / tees.length;
}

function avgRating(course) {
  const tees = course.tees?.filter(t => t.rating) ?? [];
  if (!tees.length) return null;
  return tees.reduce((s, t) => s + Number(t.rating), 0) / tees.length;
}

export default function Courses({ courses, deleteCourse, courseSort, setCourseSort, courseSearch, setCourseSearch }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const search = courseSearch;
  const setSearch = setCourseSearch;
  const sort = courseSort;
  const setSort = setCourseSort;

  const displayed = useMemo(() => {
    let list = courses;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q)
      );
    }
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'za') list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'easy') list = [...list].sort((a, b) => {
      const sa = avgSlope(a), sb = avgSlope(b);
      if (sa !== null && sb !== null && sa !== sb) return sa - sb;
      if (sa === null && sb !== null) return 1;
      if (sa !== null && sb === null) return -1;
      const ra = avgRating(a), rb = avgRating(b);
      if (ra === null && rb === null) return 0;
      if (ra === null) return 1;
      if (rb === null) return -1;
      return ra - rb;
    });
    else if (sort === 'hard') list = [...list].sort((a, b) => {
      const sa = avgSlope(a), sb = avgSlope(b);
      if (sa !== null && sb !== null && sa !== sb) return sb - sa;
      if (sa === null && sb !== null) return 1;
      if (sa !== null && sb === null) return -1;
      const ra = avgRating(a), rb = avgRating(b);
      if (ra === null && rb === null) return 0;
      if (ra === null) return 1;
      if (rb === null) return -1;
      return rb - ra;
    });
    return list;
  }, [courses, search, sort]);

  function handleDelete(id) {
    if (confirmDelete === id) {
      deleteCourse(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-canvas-cream pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <p className="text-gray-500 text-sm mt-0.5">{courses.length} saved course{courses.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {courses.length > 0 && (
          <>
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
            <div className="flex gap-2">
              {SORTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSort(prev => prev === s.key ? null : s.key)}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                    sort === s.key
                      ? 'bg-golf-green text-white'
                      : 'bg-white text-gray-500 border border-hairline'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-10 text-center">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="text-gray-600 font-medium">No courses saved yet</p>
            <p className="text-gray-400 text-sm mt-1">Add a course to get started</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <p className="text-gray-500 text-sm">No courses match "{search}"</p>
          </div>
        ) : (
          displayed.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3"
            >
              <button
                className="flex-1 flex items-center gap-3 text-left active:opacity-70"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="w-10 h-10 bg-golf-light rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-golf-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{course.name}</p>
                  {course.location && (
                    <p className="text-gray-400 text-xs truncate">{course.location}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
                    {course.tees.length} tee{course.tees.length !== 1 ? 's' : ''}
                    {course.holes.length === 18 ? ' · Holes configured' : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
              <button
                onClick={() => handleDelete(course.id)}
                className={`p-2 rounded-full transition-colors ${
                  confirmDelete === course.id
                    ? 'bg-red-100 text-red-500'
                    : 'text-gray-300 active:text-red-400'
                }`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/courses/add')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-golf-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
