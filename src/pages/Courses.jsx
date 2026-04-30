import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Trash2, MapPin } from 'lucide-react';
import { useState } from 'react';

export default function Courses({ courses, deleteCourse }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(null);

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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <p className="text-gray-500 text-sm mt-0.5">{courses.length} saved course{courses.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">🏌️</p>
            <p className="text-gray-600 font-medium">No courses saved yet</p>
            <p className="text-gray-400 text-sm mt-1">Add a course to get started</p>
          </div>
        ) : (
          courses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3"
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

      {/* FAB */}
      <button
        onClick={() => navigate('/courses/add')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-golf-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
