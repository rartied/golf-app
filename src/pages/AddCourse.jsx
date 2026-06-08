import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const TEE_COLORS = ['Gold', 'Red', 'Green', 'White', 'Blue', 'Black', 'Yellow', 'Orange', 'Purple', 'Silver'];

function teeColorHex(color) {
  const map = {
    Gold: '#d4af37', Red: '#ef4444', Green: '#16a34a', White: '#e5e7eb',
    Blue: '#3b82f6', Black: '#1f2937', Yellow: '#eab308', Orange: '#f97316',
    Purple: '#a855f7', Silver: '#9ca3af',
  };
  return map[color] ?? '#9ca3af';
}

function teeChipLabel(t) {
  if (t?.name?.trim()) return t.name.trim();
  return t?.color2 ? `${t.color}/${t.color2}` : (t?.color ?? 'Tee');
}

function emptyHoles() {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    mensStrokeIndex: null,
    womensStrokeIndex: null,
  }));
}

// Normalise a holes array to the gendered shape. Legacy single strokeIndex was
// entered for women's tees, so it seeds womensStrokeIndex.
function toGenderedHoles(src) {
  const base = src?.length === 18 ? src : emptyHoles();
  return base.map((h, i) => ({
    number: h.number ?? i + 1,
    par: h.par ?? 4,
    mensStrokeIndex: h.mensStrokeIndex ?? null,
    womensStrokeIndex: h.womensStrokeIndex ?? h.strokeIndex ?? null,
  }));
}

function emptyTee() {
  return {
    id: uuid(), name: '', color: 'White', color2: '',
    mensRating: '', mensSlope: '', womensRating: '', womensSlope: '',
    par: 72, holes: emptyHoles(),
  };
}

export default function AddCourse({ courses, addCourse, updateCourse }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const existing = courseId ? courses.find(c => c.id === courseId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [tees, setTees] = useState(() => {
    if (!existing?.tees?.length) return [emptyTee()];
    return existing.tees.map(t => {
      // The legacy single rating/slope (pre gender-split) was entered for
      // women's tees, so map it onto women's — but ONLY for a true legacy tee
      // with no gendered ratings. On newer tees `rating`/`slope` is just a
      // mirror of whichever gender is set, so falling back to it would wrongly
      // give a men's-only tee a women's rating (and demand a women's SI it
      // doesn't have, silently blocking saves).
      const hasGendered = [t.mensRating, t.mensSlope, t.womensRating, t.womensSlope]
        .some(v => v != null && v !== '');
      return {
        id: t.id,
        name: t.name ?? '',
        color: t.color ?? 'White',
        color2: t.color2 ?? '',
        mensRating:   t.mensRating   ?? '',
        mensSlope:    t.mensSlope    ?? '',
        womensRating: t.womensRating ?? (hasGendered ? '' : (t.rating ?? '')),
        womensSlope:  t.womensSlope  ?? (hasGendered ? '' : (t.slope ?? '')),
        par: t.par ?? 72,
        // Use tee-specific holes if present, otherwise fall back to course-level holes
        holes: toGenderedHoles(t.holes?.length === 18 ? t.holes : (existing.holes?.length === 18 ? existing.holes : null)),
      };
    });
  });
  const [activeTeeId, setActiveTeeId] = useState(() => tees[0]?.id);
  // Which gender's rating/slope + stroke index the active tee editor is showing.
  const [editGender, setEditGender] = useState('womens');
  const [showHoles, setShowHoles] = useState(true);
  const [errors, setErrors] = useState({});
  const [dupMatches, setDupMatches] = useState(null);
  const [pendingCourse, setPendingCourse] = useState(null);

  const activeTee = tees.find(t => t.id === activeTeeId) ?? tees[0];

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Course name is required';

    tees.forEach((t, i) => {
      // Validate each gendered rating/slope pair that has any value entered.
      let hasAnyPair = false;
      for (const key of ['mens', 'womens']) {
        const r = t[`${key}Rating`], s = t[`${key}Slope`];
        const rFilled = r !== '' && r != null;
        const sFilled = s !== '' && s != null;
        if (!rFilled && !sFilled) continue;
        if (!rFilled || isNaN(r)) e[`tee_${key}Rating_${i}`] = 'rating required';
        if (!sFilled || isNaN(s) || s < 55 || s > 155) e[`tee_${key}Slope_${i}`] = 'slope 55–155';
        if (rFilled && sFilled && !isNaN(r) && !isNaN(s) && s >= 55 && s <= 155) hasAnyPair = true;
      }
      if (!hasAnyPair && !e[`tee_mensRating_${i}`] && !e[`tee_womensRating_${i}`]) {
        e[`tee_ratingreq_${i}`] = "Enter a men's and/or women's rating + slope";
      }

      const holeParSum = t.holes.reduce((s, h) => s + h.par, 0);
      const teePar = parseInt(t.par);
      if (!isNaN(teePar) && holeParSum !== teePar) {
        e[`tee_par_${i}`] = `Hole pars total ${holeParSum}, but tee par is ${teePar}`;
      }

      // Each rated gender needs a complete, unique 1–18 stroke-index set.
      for (const key of ['mens', 'womens']) {
        const rated = t[`${key}Rating`] !== '' && t[`${key}Rating`] != null
                   && t[`${key}Slope`] !== '' && t[`${key}Slope`] != null;
        if (!rated) continue;
        const label = key === 'mens' ? "Men's" : "Women's";
        const si = t.holes.map(h => h[`${key}StrokeIndex`]);
        if (si.some(v => v === null || v === undefined || v === '')) {
          e[`tee_${key}_si_${i}`] = `All 18 holes need a ${label} SI (1–18)`;
          continue;
        }
        const seen = new Set();
        let dup = null;
        for (const v of si) { if (seen.has(v)) { dup = v; break; } seen.add(v); }
        if (dup !== null) e[`tee_${key}_si_${i}`] = `${label} SI ${dup} used more than once`;
      }
    });

    return e;
  }

  function buildCourse() {
    const numF = v => (v === '' || v == null ? null : parseFloat(v));
    const numI = v => (v === '' || v == null ? null : parseInt(v));
    const mappedTees = tees.map(t => {
      const mensRating   = numF(t.mensRating);
      const mensSlope    = numI(t.mensSlope);
      const womensRating = numF(t.womensRating);
      const womensSlope  = numI(t.womensSlope);
      return {
        id: t.id,
        name: t.name,
        color: t.color,
        color2: t.color2?.trim() ? t.color2.trim() : null,
        mensRating, mensSlope, womensRating, womensSlope,
        // Legacy single fields kept for backward compatibility (prefer women's).
        rating: womensRating ?? mensRating,
        slope:  womensSlope  ?? mensSlope,
        par: parseInt(t.par),
        holes: t.holes.map(h => {
          const mensSI   = numI(h.mensStrokeIndex);
          const womensSI = numI(h.womensStrokeIndex);
          return {
            number: h.number,
            par: h.par,
            mensStrokeIndex: mensSI,
            womensStrokeIndex: womensSI,
            // Legacy mirror (prefer women's) for any older consumer.
            strokeIndex: womensSI ?? mensSI,
          };
        }),
      };
    });
    return {
      id: existing?.id || uuid(),
      name: name.trim(),
      location: location.trim(),
      tees: mappedTees,
      holes: mappedTees[0]?.holes ?? emptyHoles(), // keep course-level holes for backward compat
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
    if (existing) { commitSave(course); return; }

    // Duplicate check against the already-loaded shared course library.
    const needle = name.trim().toLowerCase();
    const matches = courses.filter(
      c => c.id !== course.id && c.name?.toLowerCase().includes(needle)
    );
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

  function addTee() {
    const t = emptyTee();
    setTees(prev => [...prev, t]);
    setActiveTeeId(t.id);
  }

  function removeTee(id) {
    setTees(prev => {
      const next = prev.filter(x => x.id !== id);
      if (activeTeeId === id) setActiveTeeId(next[0]?.id);
      return next;
    });
  }

  function updateTee(id, field, val) {
    setTees(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  function updateHolePar(idx, par) {
    setTees(ts => ts.map(t => t.id === activeTeeId
      ? { ...t, holes: t.holes.map((h, i) => i === idx ? { ...h, par } : h) }
      : t
    ));
  }

  function updateHoleSI(idx, val) {
    const field = `${editGender}StrokeIndex`;
    setTees(ts => ts.map(t => t.id === activeTeeId
      ? { ...t, holes: t.holes.map((h, i) => i === idx ? { ...h, [field]: val } : h) }
      : t
    ));
  }

  const activeTeeIndex = tees.findIndex(t => t.id === activeTeeId);

  return (
    <div className="min-h-full bg-canvas-cream">
      <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline flex items-center gap-3">
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

        {/* Tees — pick one to edit; each tee holds both genders' ratings + SI */}
        <div className="bg-white rounded-xl shadow-card p-4 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Tees</h2>

          {/* Tee selector chips (by colour / name) */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {tees.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTeeId(t.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  t.id === activeTeeId ? 'bg-canvas-night text-white' : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0"
                  style={{ background: t.color2
                    ? `linear-gradient(135deg, ${teeColorHex(t.color)} 0 50%, ${teeColorHex(t.color2)} 50% 100%)`
                    : teeColorHex(t.color) }}
                />
                {teeChipLabel(t)}
              </button>
            ))}
            <button
              onClick={addTee}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-gray-400 border border-dashed border-hairline active:text-ink flex items-center gap-1"
            >
              <Plus size={14} /> Add tee
            </button>
          </div>

          {activeTee && (() => {
            const i = tees.findIndex(t => t.id === activeTee.id);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Color *</label>
                    <input
                      list={`tee-colors-${activeTee.id}`}
                      className="w-full border border-hairline rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink bg-white"
                      value={activeTee.color}
                      onChange={e => updateTee(activeTee.id, 'color', e.target.value)}
                      placeholder="e.g. White"
                    />
                    <datalist id={`tee-colors-${activeTee.id}`}>
                      {TEE_COLORS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Combo 2nd color</label>
                    <input
                      list={`tee-colors2-${activeTee.id}`}
                      className="w-full border border-hairline rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink bg-white"
                      value={activeTee.color2 ?? ''}
                      onChange={e => updateTee(activeTee.id, 'color2', e.target.value)}
                      placeholder="optional"
                    />
                    <datalist id={`tee-colors2-${activeTee.id}`}>
                      {TEE_COLORS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Name (optional)</label>
                    <input
                      className="w-full border border-hairline rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink"
                      value={activeTee.name}
                      onChange={e => updateTee(activeTee.id, 'name', e.target.value)}
                      placeholder="defaults to color"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Par</label>
                    <input
                      type="number" inputMode="numeric"
                      className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink ${errors[`tee_par_${i}`] ? 'border-red-400' : 'border-hairline'}`}
                      value={activeTee.par}
                      onChange={e => { updateTee(activeTee.id, 'par', e.target.value); setErrors(x => ({ ...x, [`tee_par_${i}`]: '' })); }}
                    />
                    {errors[`tee_par_${i}`] && <p className="text-red-500 text-xs mt-1">{errors[`tee_par_${i}`]}</p>}
                  </div>
                </div>

                {/* Gender toggle — drives rating/slope + stroke index below */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ratings &amp; SI for</span>
                  <div className="flex bg-gray-100 rounded-full p-0.5">
                    {[['mens', "Men's"], ['womens', "Women's"]].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setEditGender(val)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          editGender === val ? 'bg-golf-green text-white' : 'text-gray-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating + slope for the selected gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Course Rating</label>
                    <input
                      type="number" step="0.1" inputMode="decimal"
                      className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink ${errors[`tee_${editGender}Rating_${i}`] ? 'border-red-400' : 'border-hairline'}`}
                      value={activeTee[`${editGender}Rating`] ?? ''}
                      onChange={e => { updateTee(activeTee.id, `${editGender}Rating`, e.target.value); setErrors(x => ({ ...x, [`tee_${editGender}Rating_${i}`]: '', [`tee_ratingreq_${i}`]: '' })); }}
                      placeholder="72.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Slope (55–155)</label>
                    <input
                      type="number" inputMode="numeric"
                      className={`w-full border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ink ${errors[`tee_${editGender}Slope_${i}`] ? 'border-red-400' : 'border-hairline'}`}
                      value={activeTee[`${editGender}Slope`] ?? ''}
                      onChange={e => { updateTee(activeTee.id, `${editGender}Slope`, e.target.value); setErrors(x => ({ ...x, [`tee_${editGender}Slope_${i}`]: '' })); }}
                      placeholder="113"
                    />
                  </div>
                </div>
                {(errors[`tee_${editGender}Rating_${i}`] || errors[`tee_${editGender}Slope_${i}`]) && (
                  <p className="text-red-500 text-xs">{errors[`tee_${editGender}Rating_${i}`] || errors[`tee_${editGender}Slope_${i}`]}</p>
                )}
                {errors[`tee_ratingreq_${i}`] && <p className="text-red-500 text-xs">{errors[`tee_ratingreq_${i}`]}</p>}

                {tees.length > 1 && (
                  <button
                    onClick={() => removeTee(activeTee.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-400 active:text-red-500 pt-1"
                  >
                    <Trash2 size={14} /> Remove {teeChipLabel(activeTee)} tee
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Hole Details — per tee */}
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
            <div className="pb-5">
              {/* Active tee + which gender's stroke index is being edited.
                  Par is shared across genders; stroke index is per gender. */}
              <div className="px-4 mb-4 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500 min-w-0 truncate">
                  <span className="font-semibold text-gray-700">{teeChipLabel(activeTee)}</span> · stroke index
                </p>
                <div className="flex bg-gray-100 rounded-full p-0.5 flex-shrink-0">
                  {[['mens', "Men's"], ['womens', "Women's"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setEditGender(val)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        editGender === val ? 'bg-golf-green text-white' : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 space-y-6">
                {[{ label: 'Front 9', start: 0 }, { label: 'Back 9', start: 9 }].map(({ label, start }) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</p>
                    <div className="space-y-2">
                      {(activeTee?.holes ?? emptyHoles()).slice(start, start + 9).map((h, rel) => {
                        const idx = start + rel;
                        const si = h[`${editGender}StrokeIndex`] ?? null;
                        return (
                          <div key={h.number} className="flex items-center gap-3">
                            <div className="w-7 text-center flex-shrink-0">
                              <span className="text-sm font-bold text-gray-400">{h.number}</span>
                            </div>
                            <button
                              type="button"
                              onClick={e => {
                                const { left, width } = e.currentTarget.getBoundingClientRect();
                                const isRight = (e.clientX - left) > width / 2;
                                updateHolePar(idx, isRight ? Math.min(h.par + 1, 5) : Math.max(h.par - 1, 3));
                              }}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors select-none ${
                                h.par === 3 ? 'bg-blue-100 text-blue-700' :
                                h.par === 5 ? 'bg-amber-100 text-amber-700' :
                                              'bg-gray-100 text-gray-700'
                              }`}
                            >
                              Par {h.par}
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => updateHoleSI(idx, si === null || si <= 1 ? null : si - 1)}
                                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 text-lg font-bold active:bg-gray-200"
                              >−</button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1" max="18"
                                value={si ?? ''}
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
                                onClick={() => updateHoleSI(idx, Math.min((si ?? 0) + 1, 18))}
                                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 text-lg font-bold active:bg-gray-200"
                              >+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400">Par is shared; stroke index is per gender. Par: tap left ← to lower, right → to raise · SI: tap or type</p>
              </div>

              {errors[`tee_${editGender}_si_${activeTeeIndex}`] && (
                <p className="text-red-500 text-xs px-4 pt-2">{errors[`tee_${editGender}_si_${activeTeeIndex}`]}</p>
              )}
            </div>
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
              <button onClick={cancelDuplicate} className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90">
                Cancel — don't add
              </button>
              <button onClick={confirmDuplicate} className="w-full bg-white border border-hairline text-gray-600 font-semibold py-3.5 rounded-full active:bg-gray-50">
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
