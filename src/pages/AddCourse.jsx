import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { sharedSupabase } from '../lib/sharedSupabase';

const TEE_COLORS = ['White', 'Yellow', 'Blue', 'Red', 'Gold', 'Black', 'Green', 'Silver', 'Orange', 'Purple'];

function emptyTee() {
  return { id: uuid(), name: '', color: 'White', rating: '', slope: '', par: 72 };
}

function emptyHoles() {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    strokeIndex: null,
  }));
}

export default function AddCourse({ courses, addCourse, updateCourse }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const existing = courseId ? courses.find(c => c.id === courseId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [tees, setTees] = useState(existing?.tees || [emptyTee()]);
  const [holes, setHoles] = useState(
    existing?.holes?.length === 18 ? existing.holes : emptyHoles()
  );
  const [showHoles, setShowHoles] = useState(true);
  const [errors, setErrors] = useState({});
  const [dupMatches, setDupMatches] = useState(null); // null = no check yet, [] = checked+clear, [...] = matches found
  const [pendingCourse, setPendingCourse] = useState(null);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Course name is required';

    const holeParSum = holes.reduce((s, h) => s + h.par, 0);
    tees.forEach((t, i) => {
      if (!t.rating || isNaN(t.rating)) e[`tee_rating_${i}`] = 'Required';
      if (!t.slope || isNaN(t.slope) || t.slope < 55 || t.slope > 155) e[`tee_slope_${i}`] = '55–155';
      const teePar = parseInt(t.par);
      if (!isNaN(teePar) && holeParSum !== teePar) {
        e[`tee_par_${i}`] = `Hole pars total ${holeParSum}, but this tee is par ${teePar}`;
      }
    });

    const siValues = holes.map(h => h.strokeIndex);
    if (siValues.some(v => v === null)) {
      e.holes_si = 'All 18 holes must have an SI value set (1–18)';
    } else {
      const seen = new Set();
      let dup = null;
      for (const v of siValues) {
        if (seen.has(v)) { dup = v; break; }
        seen.add(v);
      }
      if (dup !== null) e.holes_si = `SI ${dup} is used more than once — each value 1–18 must appear exactly once`;
    }

    return e;
  }

  function buildCourse() {
    return {
      id: existing?.id || uuid(),
      name: name.trim(),
      location: location.trim(),
      tees: tees.map(t => ({
        ...t,
        rating: parseFloat(t.rating),
        slope: parseInt(t.slope),
        par: parseInt(t.par),
      })),
      holes,
    };
  }

  function commitSave(course) {
    if (existing) updateCourse(course);
    else addCourse(course);
    window.scrollTo(0, 0);
    navigate('/courses');
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const course = buildCourse();

    // Skip duplicate check when editing an existing course
    if (existing) { commitSave(course); return; }

    const { data } = await sharedSupabase
      .from('courses')
      .select('id, name, location')
      .ilike('name', `%${name.trim()}%`);

    const matches = (data ?? []).filter(c => c.id !== course.id);
    if (matches.length > 0) {
      setDupMatches(matches);
      setPendingCourse(course);
    } else {
      commitSave(course);
    }
  }

  function confirmDuplicate() {
    if (pendingCourse) commitSave(pendingCourse);
    setDupMatches(null);
    setPendingCourse(null);
  }

  function cancelDuplicate() {
    setDupMatches(null);
    setPendingCourse(null);
  }

  function addTee() { setTees(t => [...t, emptyTee()]); }
  function removeTee(id) { setTees(t => t.filter(x => x.id !== id)); }
  function updateTee(id, field, val) {
    setTees(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  function updateHolePar(idx, par) {
    setHoles(h => h.map((hole, i) => i === idx ? { ...hole, par } : hole));
  }

  function updateHoleSI(idx, val) {
    setHoles(h => h.map((hole, i) => i === idx ? { ...hole, strokeIndex: val } : hole));
  }

  return (
    <div className="min-h-screen bg-canvas-cream pb-24">
      <div className="bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{existing ? 'Edit Course' : 'New Course'}</h1>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Course info */}
        <div className="bg-white rounded-xl shadow-card p-4 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Course Info</h2>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Course Name *</label>
            <input
              className={`w-full border rounded-xl px-3 py-2.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-ink ${errors.name ? 'border-red-400' : 'border-hairline'}`}
              value={name}
              onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: '' })); }}
              placeholder="e.g. Pebble Beach Golf Links"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Location (optional)</label>
            <input
              className="w-full border border-hairline rounded-xl px-3 py-2.5 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-ink"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>

        {/* Tees */}
        <div className="bg-white rounded-xl shadow-card p-4 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Tees</h2>
          {tees.map((tee, i) => (
            <div key={tee.id} className="border border-hairline rounded-xl p-3 space-y-3">
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
                  <label className="text-xs text-gray-400 mb-1 block">Name</label>
                  <input
                    className="w-full border border-hairline rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink"
                    value={tee.name}
                    onChange={e => updateTee(tee.id, 'name', e.target.value)}
                    placeholder="e.g. Blue (optional)"
                  />
                </div>
                <div>
                  {/* datalist lets user pick a preset or type any custom color */}
                  <label className="text-xs text-gray-400 mb-1 block">Color *</label>
                  <input
                    list={`tee-colors-${tee.id}`}
                    className="w-full border border-hairline rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink bg-white"
                    value={tee.color}
                    onChange={e => updateTee(tee.id, 'color', e.target.value)}
                    placeholder="e.g. White"
                  />
                  <datalist id={`tee-colors-${tee.id}`}>
                    {TEE_COLORS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Course Rating *</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink ${errors[`tee_rating_${i}`] ? 'border-red-400' : 'border-hairline'}`}
                    value={tee.rating}
                    onChange={e => { updateTee(tee.id, 'rating', e.target.value); setErrors(x => ({ ...x, [`tee_rating_${i}`]: '' })); }}
                    placeholder="72.1"
                  />
                  {errors[`tee_rating_${i}`] && <p className="text-red-500 text-xs mt-1">{errors[`tee_rating_${i}`]}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Slope (55–155) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink ${errors[`tee_slope_${i}`] ? 'border-red-400' : 'border-hairline'}`}
                    value={tee.slope}
                    onChange={e => { updateTee(tee.id, 'slope', e.target.value); setErrors(x => ({ ...x, [`tee_slope_${i}`]: '' })); }}
                    placeholder="113"
                  />
                  {errors[`tee_slope_${i}`] && <p className="text-red-500 text-xs mt-1">{errors[`tee_slope_${i}`]}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Par</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink ${errors[`tee_par_${i}`] ? 'border-red-400' : 'border-hairline'}`}
                    value={tee.par}
                    onChange={e => { updateTee(tee.id, 'par', e.target.value); setErrors(x => ({ ...x, [`tee_par_${i}`]: '' })); }}
                  />
                  {errors[`tee_par_${i}`] && <p className="text-red-500 text-xs mt-1">{errors[`tee_par_${i}`]}</p>}
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addTee}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-hairline rounded-xl text-gray-400 text-sm font-medium active:border-ink active:text-ink transition-colors"
          >
            <Plus size={16} /> Add Tee
          </button>
        </div>

        {/* Hole Details */}
        <div className="bg-white rounded-xl shadow-card">
          <button
            onClick={() => setShowHoles(s => !s)}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <p className="font-semibold text-gray-700 text-sm">Hole Details</p>
            {showHoles
              ? <ChevronUp size={18} className="text-gray-400" />
              : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {showHoles && (
            <div className="px-4 pb-5 space-y-6">
              {[{ label: 'Front 9', start: 0 }, { label: 'Back 9', start: 9 }].map(({ label, start }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</p>
                  <div className="space-y-2">
                    {holes.slice(start, start + 9).map((h, rel) => {
                      const idx = start + rel;
                      return (
                        <div key={h.number} className="flex items-center gap-3">
                          {/* Hole number */}
                          <div className="w-7 text-center flex-shrink-0">
                            <span className="text-sm font-bold text-gray-400">{h.number}</span>
                          </div>

                          {/* Par — left half decrements, right half increments */}
                          <button
                            type="button"
                            onClick={e => {
                              const { left, width } = e.currentTarget.getBoundingClientRect();
                              const isRight = (e.clientX - left) > width / 2;
                              updateHolePar(idx, isRight
                                ? Math.min(h.par + 1, 5)
                                : Math.max(h.par - 1, 3)
                              );
                            }}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors select-none ${
                              h.par === 3 ? 'bg-blue-100 text-blue-700' :
                              h.par === 5 ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-700'
                            }`}
                          >
                            Par {h.par}
                          </button>

                          {/* SI — minus, editable input, plus */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => updateHoleSI(idx, h.strokeIndex === null || h.strokeIndex <= 1 ? null : h.strokeIndex - 1)}
                              className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 text-lg font-bold active:bg-gray-200"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max="18"
                              value={h.strokeIndex ?? ''}
                              onChange={e => {
                                if (e.target.value === '') { updateHoleSI(idx, null); return; }
                                const n = parseInt(e.target.value);
                                if (!isNaN(n) && n >= 1 && n <= 18) updateHoleSI(idx, n);
                              }}
                              placeholder="—"
                              className="w-9 h-10 text-center text-sm font-bold text-gray-700 bg-transparent border-0 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateHoleSI(idx, Math.min((h.strokeIndex ?? 0) + 1, 18))}
                              className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 text-lg font-bold active:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">Par: tap left ← to lower, right → to raise · SI: tap or type</p>
            </div>
          )}
          {errors.holes_si && (
            <p className="text-red-500 text-xs px-4 pb-3">{errors.holes_si}</p>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90 transition-opacity"
        >
          {existing ? 'Save Changes' : 'Add Course'}
        </button>
      </div>

      {/* Duplicate warning modal */}
      {dupMatches && dupMatches.length > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={cancelDuplicate} />
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 safe-pb">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-lg font-bold text-gray-900 mb-1">Possible duplicate</p>
            <p className="text-sm text-gray-500 mb-4">
              The library already has {dupMatches.length === 1 ? 'a course' : 'courses'} with a similar name:
            </p>
            <div className="space-y-2 mb-5">
              {dupMatches.map(c => (
                <div key={c.id} className="bg-canvas-cream rounded-xl px-4 py-3">
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  {c.location && <p className="text-gray-400 text-xs mt-0.5">{c.location}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <button
                onClick={cancelDuplicate}
                className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90"
              >
                Cancel — don't add
              </button>
              <button
                onClick={confirmDuplicate}
                className="w-full bg-white border border-hairline text-gray-600 font-semibold py-3.5 rounded-full active:bg-gray-50"
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
