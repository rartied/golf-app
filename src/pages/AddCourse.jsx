import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const TEE_COLORS = ['White', 'Yellow', 'Blue', 'Red', 'Gold', 'Black', 'Green', 'Silver'];

function emptyTee() {
  return { id: uuid(), name: '', color: 'White', rating: '', slope: '', par: 72 };
}

function emptyHoles() {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

export default function AddCourse({ courses, addCourse, updateCourse }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const existing = courseId ? courses.find(c => c.id === courseId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [tees, setTees] = useState(existing?.tees || [emptyTee()]);
  const [holes, setHoles] = useState(existing?.holes || []);
  const [showHoles, setShowHoles] = useState(existing?.holes?.length === 18);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Course name is required';
    tees.forEach((t, i) => {
      if (!t.name.trim()) e[`tee_name_${i}`] = 'Name required';
      if (!t.rating || isNaN(t.rating)) e[`tee_rating_${i}`] = 'Required';
      if (!t.slope || isNaN(t.slope) || t.slope < 55 || t.slope > 155) e[`tee_slope_${i}`] = '55–155';
    });
    return e;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const course = {
      id: existing?.id || uuid(),
      name: name.trim(),
      location: location.trim(),
      tees: tees.map(t => ({
        ...t,
        rating: parseFloat(t.rating),
        slope: parseInt(t.slope),
        par: parseInt(t.par),
      })),
      holes: showHoles ? holes : [],
    };

    if (existing) updateCourse(course);
    else addCourse(course);
    navigate('/courses');
  }

  function addTee() { setTees(t => [...t, emptyTee()]); }
  function removeTee(id) { setTees(t => t.filter(x => x.id !== id)); }
  function updateTee(id, field, val) {
    setTees(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  function toggleHoles() {
    if (!showHoles && holes.length === 0) setHoles(emptyHoles());
    setShowHoles(s => !s);
  }
  function updateHole(idx, field, val) {
    setHoles(h => h.map((hole, i) => i === idx ? { ...hole, [field]: parseInt(val) || hole[field] } : hole));
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{existing ? 'Edit Course' : 'New Course'}</h1>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Course info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Course Info</h2>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Course Name *</label>
            <input
              className={`w-full border rounded-xl px-3 py-2.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-golf-green ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
              value={name}
              onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: '' })); }}
              placeholder="e.g. Pebble Beach Golf Links"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Location (optional)</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-golf-green"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>

        {/* Tees */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Tees</h2>
          {tees.map((tee, i) => (
            <div key={tee.id} className="border border-gray-100 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Tee {i + 1}</span>
                {tees.length > 1 && (
                  <button onClick={() => removeTee(tee.id)} className="text-gray-300 active:text-red-400">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                  <input
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-golf-green ${errors[`tee_name_${i}`] ? 'border-red-400' : 'border-gray-200'}`}
                    value={tee.name}
                    onChange={e => { updateTee(tee.id, 'name', e.target.value); setErrors(x => ({ ...x, [`tee_name_${i}`]: '' })); }}
                    placeholder="e.g. Blue"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Color</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-golf-green"
                    value={tee.color}
                    onChange={e => updateTee(tee.id, 'color', e.target.value)}
                  >
                    {TEE_COLORS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Course Rating *</label>
                  <input
                    type="number"
                    step="0.1"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-golf-green ${errors[`tee_rating_${i}`] ? 'border-red-400' : 'border-gray-200'}`}
                    value={tee.rating}
                    onChange={e => { updateTee(tee.id, 'rating', e.target.value); setErrors(x => ({ ...x, [`tee_rating_${i}`]: '' })); }}
                    placeholder="72.1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Slope (55–155) *</label>
                  <input
                    type="number"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-golf-green ${errors[`tee_slope_${i}`] ? 'border-red-400' : 'border-gray-200'}`}
                    value={tee.slope}
                    onChange={e => { updateTee(tee.id, 'slope', e.target.value); setErrors(x => ({ ...x, [`tee_slope_${i}`]: '' })); }}
                    placeholder="113"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Par</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-golf-green"
                    value={tee.par}
                    onChange={e => updateTee(tee.id, 'par', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addTee}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium active:border-golf-green active:text-golf-green transition-colors"
          >
            <Plus size={16} /> Add Tee
          </button>
        </div>

        {/* Hole details (optional) */}
        <div className="bg-white rounded-2xl shadow-sm">
          <button
            onClick={toggleHoles}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold text-gray-700 text-sm">Hole Details (Optional)</p>
              <p className="text-xs text-gray-400 mt-0.5">Par & stroke index per hole — needed for personal par calculation</p>
            </div>
            {showHoles ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {showHoles && (
            <div className="px-4 pb-5 space-y-5">
              {[{ label: 'Front 9', start: 0 }, { label: 'Back 9', start: 9 }].map(({ label, start }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
                  <div className="grid gap-y-2" style={{ gridTemplateColumns: '2rem repeat(9, 1fr)' }}>
                    {/* Hole numbers */}
                    <div className="text-[10px] text-gray-400 font-medium self-center">Hole</div>
                    {holes.slice(start, start + 9).map(h => (
                      <div key={h.number} className="text-[11px] text-gray-400 text-center self-center font-medium">
                        {h.number}
                      </div>
                    ))}

                    {/* Par — tap to cycle 3 → 4 → 5 → 3 */}
                    <div className="text-[10px] text-gray-500 font-semibold self-center">Par</div>
                    {holes.slice(start, start + 9).map((h, rel) => (
                      <button
                        key={h.number}
                        type="button"
                        onClick={() => updateHole(start + rel, 'par', h.par === 3 ? 4 : h.par === 4 ? 5 : 3)}
                        className={`mx-0.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                          h.par === 3 ? 'bg-blue-100 text-blue-700' :
                          h.par === 5 ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {h.par}
                      </button>
                    ))}

                    {/* Stroke Index */}
                    <div className="text-[10px] text-gray-500 font-semibold self-center">SI</div>
                    {holes.slice(start, start + 9).map((h, rel) => (
                      <input
                        key={h.number}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="18"
                        value={h.strokeIndex}
                        onChange={e => updateHole(start + rel, 'strokeIndex', e.target.value)}
                        className="mx-0.5 border border-gray-200 rounded-lg text-center py-1.5 text-[11px] outline-none focus:border-golf-green bg-white"
                      />
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">Par: tap to cycle 3 → 4 → 5 · SI = Stroke Index (1 = hardest)</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-golf-green text-white font-semibold py-4 rounded-2xl active:opacity-90 transition-opacity"
        >
          {existing ? 'Save Changes' : 'Add Course'}
        </button>
      </div>
    </div>
  );
}
