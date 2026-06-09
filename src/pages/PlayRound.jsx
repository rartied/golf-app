import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Search, Plus, Star } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import { DirectionPicker, StatTracker, PenaltyPill, dotColor, relativeScore } from '../components/HoleEditor';
import { storage } from '../utils/storage';
import {
  calcCourseHandicap,
  calcScoreDifferential,
  calcAdjustedGrossScore,
  teeRatingSlope,
  teeHoles,
} from '../utils/handicap';
import { computeRoundStats } from '../utils/roundStats';
import { useAuth } from '../context/AuthContext';

function teeColorHex(color) {
  const map = {
    Gold: '#d4af37', Red: '#ef4444', Green: '#16a34a', White: '#e5e7eb',
    Blue: '#3b82f6', Black: '#1f2937', Yellow: '#eab308', Orange: '#f97316',
    Purple: '#a855f7', Silver: '#9ca3af',
  };
  return map[color] ?? '#9ca3af';
}

// Ordered roughly how tee markers tend to appear on a card.
const TEE_COLORS = ['Gold', 'Red', 'Green', 'White', 'Blue', 'Black', 'Yellow', 'Orange', 'Purple', 'Silver'];

// Round colour marker for a tee. When a second colour is set (combo tee, e.g.
// Blue/White) the circle is split diagonally into the two colours.
function TeeSwatch({ color, color2, className = 'w-4 h-4' }) {
  const c1 = teeColorHex(color);
  const c2 = color2 ? teeColorHex(color2) : null;
  return (
    <div
      className={`${className} rounded-full flex-shrink-0 border border-gray-200`}
      style={c2
        ? { background: `linear-gradient(135deg, ${c1} 0 50%, ${c2} 50% 100%)` }
        : { backgroundColor: c1 }}
    />
  );
}

// Display label for a tee: its name, falling back to its colour(s).
function teeLabel(tee) {
  if (tee.name) return tee.name;
  return tee.color2 ? `${tee.color}/${tee.color2}` : tee.color;
}

// Inline "add tee" used during round setup so the user doesn't have to leave the
// flow to add a missing tee. Scoped to the gender being logged (men's/women's),
// so it captures that gender's rating, slope and stroke index. Hole par/SI are
// copied from an existing tee.
function AddTeeModal({ course, gender, onCancel, onSave }) {
  const genderLabel = gender === 'womens' ? "Women's" : "Men's";
  const sourceTee = course.tees?.find(t => t.holes?.length === 18)
    || (course.holes?.length === 18
        ? { name: '', color: null, holes: course.holes, par: course.holes.reduce((s, h) => s + (h.par ?? 0), 0) }
        : null);

  const [color, setColor]   = useState('White');
  const [color2, setColor2] = useState('');   // combo second colour (optional)
  const [name, setName]     = useState('');
  const [rating, setRating] = useState('');
  const [slope, setSlope]   = useState('');
  const [par, setPar]       = useState(String(sourceTee?.par ?? 72));
  const [si, setSi]         = useState(() => Array(18).fill(null)); // gender SI when none exists yet
  const [error, setError]   = useState('');

  // Does the course already have this gender's hole-by-hole stroke index on any
  // tee? If so we reuse it; if not, the user enters it once here and it carries
  // to any later tees of this gender.
  const otherGender = gender === 'womens' ? 'mens' : 'womens';
  const otherGenderLabel = otherGender === 'womens' ? "Women's" : "Men's";
  function courseSIFor(g) {
    const key = g === 'womens' ? 'womensStrokeIndex' : 'mensStrokeIndex';
    for (const t of (course.tees || [])) {
      const hs = t.holes || [];
      if (hs.length !== 18) continue;
      const arr = hs.map(h => h[key] ?? (g === 'womens' ? h.strokeIndex : null));
      if (arr.every(v => v != null && v !== '')) return arr.map(Number);
    }
    return null;
  }
  const existingSI = courseSIFor(gender);   // reuse if present
  const needsSI = !existingSI;
  const copyFromSI = courseSIFor(otherGender); // for the "copy from other gender" shortcut

  function setSiAt(i, val) {
    setSi(prev => {
      const next = prev.slice();
      if (val === '') { next[i] = null; return next; }
      const n = parseInt(val, 10);
      next[i] = (!isNaN(n) && n >= 1 && n <= 18) ? n : prev[i];
      return next;
    });
  }

  // A tee already exists for this exact colour (and combo). Its shared fields
  // (name + par) belong to it and are locked; we're only adding this gender's
  // rating/slope/SI. Changing the combo colour makes a different tee, which
  // unlocks everything again.
  const c2 = color2.trim() || null;
  const matched = (course.tees || []).find(t =>
    (t.color || '').toLowerCase() === color.toLowerCase() && (t.color2 || null) === c2
  ) || null;
  const matchedRS = matched ? teeRatingSlope(matched, gender) : { rating: null, slope: null };
  const lockShared = !!matched;            // name + par come from the existing tee
  const lockRating = matchedRS.rating != null;  // this gender is already set on it

  function handleSave() {
    const p = lockShared ? Number(matched.par) : parseInt(par, 10);
    const r = lockRating ? matchedRS.rating : parseFloat(rating);
    const s = lockRating ? matchedRS.slope  : parseInt(slope, 10);
    if (!lockRating) {
      if (rating === '' || isNaN(r))                     return setError(`${genderLabel} course rating is required.`);
      if (slope === '' || isNaN(s) || s < 55 || s > 155) return setError(`${genderLabel} slope must be 55–155.`);
    }
    if (isNaN(p)) return setError('Par is required.');

    // Stroke index: reuse the course's existing gender SI, or validate the one
    // the user just entered (complete, unique 1–18).
    let giArr = existingSI;
    if (needsSI) {
      if (si.some(v => v == null)) return setError(`Enter a ${genderLabel} stroke index (1–18) for all 18 holes.`);
      const seen = new Set();
      for (const v of si) {
        if (v < 1 || v > 18) return setError('Stroke index must be 1–18.');
        if (seen.has(v)) return setError(`Stroke index ${v} is used more than once.`);
        seen.add(v);
      }
      giArr = si.slice();
    }

    const baseHoles = sourceTee?.holes
      ?? Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 }));
    const holes = baseHoles.map((h, i) => ({
      number: h.number,
      par: h.par,
      mensStrokeIndex:   gender === 'mens'   ? (giArr[i] ?? null) : null,
      womensStrokeIndex: gender === 'womens' ? (giArr[i] ?? null) : null,
    }));
    onSave({
      id: uuid(),
      name: lockShared ? matched.name : (name.trim() || (c2 ? `${color}/${c2}` : color)),
      color,
      color2: c2,
      mensRating:   gender === 'mens'   ? r : null,
      mensSlope:    gender === 'mens'   ? s : null,
      womensRating: gender === 'womens' ? r : null,
      womensSlope:  gender === 'womens' ? s : null,
      // Legacy single fields for older consumers.
      rating: r,
      slope: s,
      par: p,
      holes,
    }, gender);
  }

  const labelCls = 'text-xs font-semibold text-gray-400 uppercase tracking-wider';
  const inputCls = 'w-full mt-1 bg-white border border-hairline rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ink disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="w-full sm:max-w-md bg-canvas-cream rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Add Tee</h2>
            <span className="px-2 py-0.5 rounded-full bg-golf-light text-golf-green text-xs font-bold">{genderLabel}</span>
          </div>
          <button onClick={onCancel} className="text-gray-400 text-sm font-medium">Cancel</button>
        </div>
        <p className="text-xs text-gray-400 -mt-2">Adding the <span className="font-semibold text-gray-600">{genderLabel}</span> rating, slope &amp; stroke index for this tee.</p>

        <div>
          <label className={labelCls}>Color</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TEE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full border transition-all ${color === c ? 'ring-2 ring-ink scale-110 border-white' : 'border-gray-200'}`}
                style={{ backgroundColor: teeColorHex(c) }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Combo 2nd color <span className="text-gray-300 normal-case">(optional)</span></label>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <button
              onClick={() => setColor2('')}
              className={`px-3 h-9 rounded-full border text-xs font-medium transition-all ${color2 === '' ? 'ring-2 ring-ink border-white bg-white' : 'border-gray-200 text-gray-500'}`}
            >None</button>
            {TEE_COLORS.filter(c => c !== color).map(c => (
              <button
                key={c}
                onClick={() => setColor2(c)}
                className={`w-9 h-9 rounded-full border transition-all ${color2 === c ? 'ring-2 ring-ink scale-110 border-white' : 'border-gray-200'}`}
                style={{ backgroundColor: teeColorHex(c) }}
                aria-label={c}
              />
            ))}
          </div>
          {color2 && (
            <div className="flex items-center gap-2 mt-2">
              <TeeSwatch color={color} color2={color2} className="w-5 h-5" />
              <span className="text-xs text-gray-500">{color}/{color2} combo</span>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Name <span className="text-gray-300 normal-case">(optional)</span></label>
          <input
            type="text"
            value={lockShared ? (matched.name || '') : name}
            onChange={e => setName(e.target.value)}
            disabled={lockShared}
            placeholder={color2 ? `${color}/${color2}` : color}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>{genderLabel} course rating &amp; slope</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number" inputMode="decimal" step="0.1"
              value={lockRating ? matchedRS.rating : rating}
              onChange={e => setRating(e.target.value)}
              disabled={lockRating}
              placeholder="Rating 72.1"
              className={inputCls}
            />
            <input
              type="number" inputMode="numeric"
              value={lockRating ? matchedRS.slope : slope}
              onChange={e => setSlope(e.target.value)}
              disabled={lockRating}
              placeholder="Slope 113"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Par</label>
          <input
            type="number" inputMode="numeric"
            value={lockShared ? matched.par : par}
            onChange={e => setPar(e.target.value)}
            disabled={lockShared}
            className={inputCls}
          />
        </div>

        {/* Stroke index — entered once per gender per course, then reused. */}
        {needsSI ? (
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>{genderLabel} stroke index</label>
              {copyFromSI && (
                <button
                  type="button"
                  onClick={() => { setSi(copyFromSI.slice()); setError(''); }}
                  className="text-xs font-semibold text-golf-green active:opacity-70"
                >
                  Copy from {otherGenderLabel}
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-2">
              No {genderLabel} stroke index on this course yet — set the handicap order (1 = hardest) for all 18 holes. You'll only do this once.
            </p>
            <div className="grid grid-cols-9 gap-1">
              {si.map((v, i) => (
                <div key={i} className="text-center">
                  <div className="text-[9px] text-gray-400 leading-none mb-0.5">{i + 1}</div>
                  <input
                    type="number" inputMode="numeric" min="1" max="18"
                    value={v ?? ''}
                    onChange={e => setSiAt(i, e.target.value)}
                    placeholder="–"
                    className="w-full px-0 py-1.5 text-center text-xs font-bold text-gray-800 bg-white border border-hairline rounded-md outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{genderLabel} stroke index comes from this course's existing {genderLabel} tees.</p>
        )}

        {matched
          ? (lockRating
              ? <p className="text-xs text-amber-600">{teeLabel(matched)} already has {genderLabel} data — pick a different colour, or add a combo to create a new tee.</p>
              : <p className="text-xs text-gray-500">{teeLabel(matched)} already exists — its name & par are locked. You're adding its {genderLabel} rating &amp; slope.</p>)
          : (!sourceTee && <p className="text-xs text-amber-600">No existing hole data — par defaults to 4 per hole; adjust in Courses.</p>)}

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <button
          onClick={handleSave}
          disabled={lockRating}
          className={`w-full font-semibold py-3.5 rounded-full transition-opacity ${
            lockRating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-golf-green text-white active:opacity-90'
          }`}
        >
          Add {genderLabel} Tee
        </button>
      </div>
    </div>
  );
}

function buildHoleScores(course, tee, gender, nineHoleType, trackStats = true) {
  let holes;
  // Score-only rounds leave stats untracked: putts null so they're excluded
  // from stat aggregates rather than logged as a fake "2 putts" per hole.
  const putts0 = trackStats ? 2 : null;
  // Stroke index differs by gender, so resolve the tee's holes for this gender;
  // fall back to course-level holes (legacy single SI) when the tee has none.
  const holeData = tee?.holes?.length === 18
    ? teeHoles(tee, gender)
    : (course.holes?.length === 18 ? course.holes : null);
  if (holeData?.length === 18) {
    holes = holeData.map(h => ({
      number:      h.number,
      par:         h.par,
      strokeIndex: h.strokeIndex ?? null,
      score:       h.par,
      putts:       putts0,
      fairway:     h.par === 3 ? 'na' : null,
      greenHit:    null,
      fairwayBunkers:   0,
      greensideBunkers: 0,
      chipShots:        0,
      waterHazards:     0,
      outOfBounds:      0,
      dropShots:        0,
      ballsLost:        0,
    }));
  } else {
    holes = Array.from({ length: 18 }, (_, i) => ({
      number:      i + 1,
      par:         4,
      strokeIndex: i + 1,
      score:       4,
      putts:       putts0,
      fairway:     null,
      greenHit:    null,
      fairwayBunkers:   0,
      greensideBunkers: 0,
      chipShots:        0,
      waterHazards:     0,
      outOfBounds:      0,
      dropShots:        0,
      ballsLost:        0,
    }));
  }
  if (nineHoleType === 'front') return holes.slice(0, 9);
  if (nineHoleType === 'back')  return holes.slice(9);
  return holes;
}

export default function PlayRound({ courses, handicapIndex, addRound, updateCourse }) {
  const navigate = useNavigate();

  const [phase, setPhase]               = useState('setup');
  const [savedRound, setSavedRound]     = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTee, setSelectedTee]   = useState(null);
  const [holeScores, setHoleScores]     = useState([]);
  const [currentHole, setCurrentHole]   = useState(0);
  const [date, setDate]                 = useState(() => new Date().toISOString().split('T')[0]);
  const [courseSearch, setCourseSearch] = useState('');
  const [favIds, setFavIds] = useState(() => storage.getFavoriteCourseIds());
  const [nineHoleType, setNineHoleType] = useState(null);
  const [trackStats, setTrackStats]     = useState(true);  // false = score-only (no putts/fairway/GIR/penalties)
  const [showAddTee, setShowAddTee]     = useState(false);
  const { user } = useAuth();
  // Which tee rating/slope to use this round; defaults to the player's profile
  // setting and can be overridden per round at tee selection.
  const [roundGender, setRoundGender]   = useState('mens');
  useEffect(() => { if (user?.gender) setRoundGender(user.gender); }, [user?.gender]);
  // Switching gender can make the picked tee unavailable (no rating for it).
  useEffect(() => {
    if (selectedTee && teeRatingSlope(selectedTee, roundGender).rating == null) setSelectedTee(null);
  }, [roundGender, selectedTee]);

  // Course rating + slope for the selected tee under the chosen gender.
  const teeRS = teeRatingSlope(selectedTee, roundGender);

  function handleAddTee(newTee, gender) {
    const tees = selectedCourse.tees ?? [];
    // If a same-colour (and same-combo) tee already exists, fill this gender's
    // data into it rather than creating a duplicate-colour entry.
    const matchIdx = tees.findIndex(t =>
      (t.color || '').toLowerCase() === (newTee.color || '').toLowerCase()
      && (t.color2 || null) === (newTee.color2 || null)
    );
    const rk = gender === 'womens' ? 'womensRating' : 'mensRating';
    const sk = gender === 'womens' ? 'womensSlope'  : 'mensSlope';
    const sik = gender === 'womens' ? 'womensStrokeIndex' : 'mensStrokeIndex';

    let chosen, nextTees;
    if (matchIdx >= 0) {
      const ex = tees[matchIdx];
      chosen = {
        ...ex,
        [rk]: newTee[rk],
        [sk]: newTee[sk],
        par: ex.par ?? newTee.par,
        holes: (ex.holes ?? newTee.holes).map((h, i) => ({
          ...h,
          [sik]: newTee.holes?.[i]?.[sik] ?? h[sik] ?? null,
        })),
      };
      nextTees = tees.map((t, i) => (i === matchIdx ? chosen : t));
    } else {
      chosen = newTee;
      nextTees = [...tees, newTee];
    }

    const updated = { ...selectedCourse, tees: nextTees };
    updateCourse(updated);
    setSelectedCourse(updated);
    setSelectedTee(chosen);
    setShowAddTee(false);
  }

  useEffect(() => {
    const saved = storage.getActiveRound();
    if (saved?.phase === 'scoring') {
      setSavedRound(saved);
      setPhase('resume');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'scoring' || !selectedCourse || !selectedTee) return;
    storage.saveActiveRound({
      phase: 'scoring',
      courseId:     selectedCourse.id,
      courseName:   selectedCourse.name,
      teeId:        selectedTee.id,
      teeName:      teeLabel(selectedTee),
      gender:       roundGender,
      courseRating: teeRS.rating,
      slope:        teeRS.slope,
      par:          selectedTee.par,
      date,
      holeScores,
      currentHole,
      nineHoleType,
      trackStats,
      holesPlayed: nineHoleType ? 9 : 18,
    });
  }, [phase, holeScores, currentHole, selectedCourse, selectedTee, date, roundGender, trackStats]);

  function handleResume() {
    const s = savedRound;
    const course = courses.find(c => c.id === s.courseId) ?? { id: s.courseId, name: s.courseName, holes: [] };
    const tee = course.tees?.find(t => t.id === s.teeId) ?? {
      id: s.teeId, name: s.teeName, rating: s.courseRating, slope: s.slope, par: s.par,
    };
    if (s.gender) setRoundGender(s.gender);
    setSelectedCourse(course);
    setSelectedTee(tee);
    setHoleScores(s.holeScores);
    setCurrentHole(s.currentHole);
    setNineHoleType(s.nineHoleType ?? null);
    setTrackStats(s.trackStats ?? true);
    setPhase('scoring');
  }

  function handleStartNew() {
    storage.clearActiveRound();
    setSavedRound(null);
    setPhase('setup');
  }

  function handleStart() {
    setHoleScores(buildHoleScores(selectedCourse, selectedTee, roundGender, nineHoleType, trackStats));
    setCurrentHole(0);
    setPhase('scoring');
  }

  function adjustScore(idx, delta) {
    setHoleScores(prev => prev.map((h, i) => {
      if (i !== idx) return h;
      return { ...h, score: Math.max(1, Math.min(h.score + delta, h.par + 8)) };
    }));
  }

  function updateHoleStat(idx, stat, value) {
    setHoleScores(prev => prev.map((h, i) => i !== idx ? h : { ...h, [stat]: value }));
  }

  function handleSave() {
    const holesPlayed = nineHoleType ? 9 : 18;
    const totalScore  = holeScores.reduce((s, h) => s + h.score, 0);
    const coursePar   = holeScores.reduce((s, h) => s + h.par, 0);
    const { rating, slope } = teeRatingSlope(selectedTee, roundGender);
    const established = handicapIndex !== null;
    const courseHandicap = established
      ? calcCourseHandicap(handicapIndex, slope, rating, selectedTee.par)
      : null;
    const adjustedGrossScore = established
      ? calcAdjustedGrossScore(holeScores, courseHandicap, holesPlayed, true)
      : calcAdjustedGrossScore(holeScores, 0, holesPlayed, false);
    const scoreDifferential = calcScoreDifferential(
      adjustedGrossScore, rating, slope, holesPlayed, handicapIndex
    );

    addRound({
      id: uuid(),
      date,
      courseId:    selectedCourse.id,
      courseName:  selectedCourse.name,
      teeId:       selectedTee.id,
      teeName:     teeLabel(selectedTee),
      courseRating: rating,
      slope,
      coursePar,
      totalScore,
      adjustedGrossScore,
      scoreDifferential,
      holeScores,
      holesPlayed,
      nineHoleType,
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
      <div className="min-h-full bg-canvas-cream flex flex-col">
        <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Log Round</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
          <div className="w-16 h-16 bg-golf-light rounded-full flex items-center justify-center">
            <Flag size={28} className="text-golf-green" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">Round in progress</p>
            <p className="text-gray-500 text-sm mt-1">{savedRound.courseName} · {savedRound.teeName}</p>
            <p className="text-gray-400 text-xs mt-1">
              Hole {savedRound.currentHole + 1} of {savedRound.holesPlayed ?? 18}
            </p>
          </div>
          <div className="w-full space-y-3">
            <button onClick={handleResume} className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90">
              Resume Round
            </button>
            <button onClick={handleStartNew} className="w-full bg-white border border-hairline text-gray-600 font-semibold py-4 rounded-full active:bg-gray-50">
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
      <div className="min-h-full bg-canvas-cream">
        <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Log Round</h1>
        </div>

        <div className="px-4 pt-5 space-y-5">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Date Played</h2>
            <div className="bg-white rounded-xl shadow-card px-4 py-3">
              <DatePicker
                value={date}
                onChange={setDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Select Course</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-xl shadow-card p-8 text-center">
                <p className="text-gray-500 text-sm">No courses saved yet.</p>
                <button onClick={() => navigate('/courses/add')} className="mt-3 text-golf-green text-sm font-medium">
                  Add a course →
                </button>
              </div>
            ) : (() => {
              function toggleFav(e, id) {
                e.stopPropagation();
                setFavIds(prev => {
                  const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
                  storage.saveFavoriteCourseIds(next);
                  return next;
                });
              }

              const favCourses = courses.filter(c => favIds.includes(c.id));
              const q = courseSearch.trim().toLowerCase();
              const listCourses = q
                ? courses.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    (c.location ?? '').toLowerCase().includes(q)
                  )
                : favCourses.length > 0 ? favCourses : courses.slice(0, 3);
              const isSearching = !!q;

              function CourseRow({ course }) {
                const isFav = favIds.includes(course.id);
                return (
                  <button
                    key={course.id}
                    onClick={() => { setSelectedCourse(course); setSelectedTee(null); setNineHoleType(null); }}
                    className={`w-full text-left bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3 transition-all ${
                      selectedCourse?.id === course.id ? 'ring-2 ring-ink' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-golf-light rounded-full flex items-center justify-center flex-shrink-0">
                      <Flag size={18} className="text-golf-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{course.name}</p>
                      {course.location && <p className="text-gray-400 text-xs truncate">{course.location}</p>}
                    </div>
                    {selectedCourse?.id === course.id && (
                      <div className="w-5 h-5 bg-golf-green rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <button
                      onClick={e => toggleFav(e, course.id)}
                      className="p-1 -mr-1 flex-shrink-0"
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        size={18}
                        className={isFav ? 'text-amber-400' : 'text-gray-300'}
                        fill={isFav ? 'currentColor' : 'none'}
                      />
                    </button>
                  </button>
                );
              }

              return (
                <>
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={e => setCourseSearch(e.target.value)}
                      placeholder="Search courses…"
                      className="w-full bg-white border border-hairline rounded-full pl-9 pr-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-ink shadow-card"
                    />
                  </div>
                  {!isSearching && favCourses.length === 0 && (
                    <p className="text-xs text-gray-400 px-1 mb-2">Star a course to pin it here for quick access.</p>
                  )}
                  {!isSearching && favCourses.length > 0 && (
                    <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest px-1 mb-1.5">Favorites</p>
                  )}
                  <div className="space-y-2">
                    {listCourses.map(course => <CourseRow key={course.id} course={course} />)}
                    {listCourses.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No courses match.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {selectedCourse && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Tee</h2>
                <div className="flex bg-gray-100 rounded-full p-0.5">
                  {[['mens', "Men's"], ['womens', "Women's"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setRoundGender(val)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                        roundGender === val ? 'bg-golf-green text-white' : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {(() => {
                  const genderLabel = roundGender === 'womens' ? "Women's" : "Men's";
                  const availableTees = selectedCourse.tees.filter(t => teeRatingSlope(t, roundGender).rating != null);
                  return (
                    <>
                      {availableTees.length === 0 && (
                        <div className="bg-white rounded-xl shadow-card px-4 py-5 text-center">
                          <p className="text-gray-500 text-sm">No {genderLabel} tees for this course yet.</p>
                          <p className="text-gray-400 text-xs mt-0.5">Add one below to log this round.</p>
                        </div>
                      )}
                      {availableTees.map(tee => {
                        const rs = teeRatingSlope(tee, roundGender);
                        return (
                          <button
                            key={tee.id}
                            onClick={() => setSelectedTee(tee)}
                            className={`w-full text-left bg-white rounded-xl shadow-card px-4 py-3 flex items-center gap-3 transition-all ${
                              selectedTee?.id === tee.id ? 'ring-2 ring-ink' : ''
                            }`}
                          >
                            <TeeSwatch color={tee.color} color2={tee.color2} className="w-4 h-4" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">{teeLabel(tee)}</p>
                              <p className="text-gray-400 text-xs">Rating {rs.rating} · Slope {rs.slope} · Par {tee.par}</p>
                            </div>
                            {selectedTee?.id === tee.id && (
                              <div className="w-5 h-5 bg-golf-green rounded-full flex items-center justify-center flex-shrink-0">
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setShowAddTee(true)}
                        className="w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-gray-500 text-sm font-medium active:bg-gray-50 transition-colors"
                      >
                        <Plus size={16} /> Add {genderLabel} tee
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {selectedCourse && selectedTee && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Holes to Play</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Full 18', value: null },
                  { label: 'Front 9', value: 'front' },
                  { label: 'Back 9',  value: 'back'  },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setNineHoleType(value)}
                    className={`py-3 rounded-full text-sm font-semibold transition-colors ${
                      nineHoleType === value ? 'bg-golf-green text-white' : 'bg-white text-gray-600 shadow-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCourse && selectedTee && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Tracking</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Full round', value: true },
                  { label: 'Score only', value: false },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setTrackStats(value)}
                    className={`py-3 rounded-full text-sm font-semibold transition-colors ${
                      trackStats === value ? 'bg-golf-green text-white' : 'bg-white text-gray-600 shadow-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 px-1">
                {trackStats
                  ? 'Track putts, fairways, GIR, bunkers, chips and penalties.'
                  : 'Just enter the score for each hole — counts for your handicap.'}
              </p>
            </div>
          )}

          {selectedCourse && selectedTee && (
            <button onClick={handleStart} className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90 transition-opacity">
              Log Round
            </button>
          )}
        </div>

        {showAddTee && selectedCourse && (
          <AddTeeModal
            course={selectedCourse}
            gender={roundGender}
            onCancel={() => setShowAddTee(false)}
            onSave={handleAddTee}
          />
        )}
      </div>
    );
  }

  // ── SCORING ────────────────────────────────────────────────────────────────
  if (phase === 'scoring') {
    const hole       = holeScores[currentHole];
    const rel        = relativeScore(hole.score, hole.par);
    const totalGross = holeScores.reduce((s, h) => s + h.score, 0);
    const totalPar   = holeScores.reduce((s, h) => s + h.par, 0);
    const totalDiff  = totalGross - totalPar;
    const girAchieved = hole.greenHit === 'hit' && hole.putts != null
      ? (hole.score - hole.putts) <= (hole.par - 2)
      : false;

    return (
      <div className="h-dvh bg-canvas-cream flex flex-col">
        {/* Header */}
        <div className="bg-canvas-night safe-pt px-4 pt-2 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setPhase('setup')} className="p-1 -ml-1 active:opacity-70">
              <ArrowLeft size={20} className="text-white/80" />
            </button>
            <div className="text-center flex-1 mx-2">
              <p className="text-white font-bold text-sm leading-tight truncate">{selectedCourse.name}</p>
              <p className="text-white/50 text-xs">{teeLabel(selectedTee)} · Par {selectedTee.par}</p>
            </div>
            <div className="text-right min-w-[36px]">
              <p className="text-white font-bold text-base leading-tight">{totalGross}</p>
              <p className={`text-xs font-semibold ${
                totalDiff === 0 ? 'text-white/50' : totalDiff < 0 ? 'text-yellow-300' : 'text-red-300'
              }`}>
                {totalDiff === 0 ? 'E' : totalDiff > 0 ? `+${totalDiff}` : totalDiff}
              </p>
            </div>
          </div>
          <div className="flex gap-1 justify-center">
            {holeScores.map((h, i) => (
              <button
                key={h.number}
                onClick={() => setCurrentHole(i)}
                className={`rounded-full transition-all ${
                  i === currentHole
                    ? `w-4 h-4 ring-2 ring-white ring-offset-1 ring-offset-canvas-night ${dotColor(h.score, h.par)}`
                    : i < currentHole
                    ? `w-2.5 h-2.5 ${dotColor(h.score, h.par)}`
                    : 'w-2.5 h-2.5 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cards + nav */}
        <div className="flex-1 flex flex-col gap-1.5 px-3">
          <div className="flex-[0.5]" />

          {/* Score + Putts */}
          <div className="bg-white rounded-xl shadow-card px-4 py-2">
            {/* Hole info */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl font-black text-gray-900 leading-none">{hole.number}</span>
              <span className="px-2 py-0.5 bg-golf-light text-golf-green text-xs font-bold rounded-full">Par {hole.par}</span>
              {hole.strokeIndex && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">SI {hole.strokeIndex}</span>
              )}
              {girAchieved && (
                <span className="px-2 py-0.5 bg-golf-light text-gray-700 text-xs font-bold rounded-full">GIR ✓</span>
              )}
            </div>

            {/* Steppers */}
            <div className="flex items-stretch gap-4">
              {/* Score */}
              <div className="flex-1 flex flex-col items-center">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Score</p>
                <div className="flex items-center gap-2">
                  <button
                    onPointerDown={() => adjustScore(currentHole, -1)}
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none"
                  >−</button>
                  <div className="text-center w-12">
                    <p className="text-5xl font-black text-gray-900 tabular-nums leading-none">{hole.score}</p>
                  </div>
                  <button
                    onPointerDown={() => adjustScore(currentHole, 1)}
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none"
                  >+</button>
                </div>
                <p className={`text-xs font-semibold mt-1 ${rel.color}`}>{rel.label}</p>
              </div>

              {trackStats && (
                <>
                  <div className="w-px bg-gray-100" />

                  {/* Putts */}
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Putts</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateHoleStat(currentHole, 'putts', Math.max(0, (hole.putts ?? 0) - 1))}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none"
                      >−</button>
                      <div className="text-center w-12">
                        <p className="text-5xl font-black text-gray-900 tabular-nums leading-none">{hole.putts ?? 0}</p>
                      </div>
                      <button
                        onClick={() => updateHoleStat(currentHole, 'putts', (hole.putts ?? 0) + 1)}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-light text-gray-600 active:scale-95 select-none"
                      >+</button>
                    </div>
                    <p className="text-xs font-semibold mt-1 text-gray-300">putts</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {trackStats && (
            <>
              {/* Direction pickers */}
              <div className="bg-white rounded-xl shadow-card px-4 py-2">
                <div className="flex items-center gap-2">
                  {hole.par !== 3 ? (
                    <DirectionPicker
                      label="Fairway"
                      value={hole.fairway}
                      onChange={v => updateHoleStat(currentHole, 'fairway', v)}
                      hasLongShort={false}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Fairway</p>
                      <p className="text-xs text-gray-300 italic py-6">Par 3</p>
                    </div>
                  )}
                  <div className="w-px bg-gray-100 self-stretch mx-1" />
                  <DirectionPicker
                    label="GIR"
                    value={hole.greenHit}
                    onChange={v => updateHoleStat(currentHole, 'greenHit', v)}
                    hasLongShort={true}
                  />
                </div>
              </div>

              {/* Stat Trackers + Penalties */}
              <div className="bg-white rounded-xl shadow-card px-4 py-3 space-y-3">
                <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Stat Trackers</p>
                <div className="grid grid-cols-4 gap-2">
                  <StatTracker topLabel="FW" label="Bunker" value={hole.fairwayBunkers} onChange={v => updateHoleStat(currentHole, 'fairwayBunkers', v)} />
                  <StatTracker topLabel="GS" label="Bunker" value={hole.greensideBunkers} onChange={v => updateHoleStat(currentHole, 'greensideBunkers', v)} />
                  <StatTracker label="Chip" value={hole.chipShots} onChange={v => updateHoleStat(currentHole, 'chipShots', v)} />
                  <StatTracker label="Lost Ball" value={hole.ballsLost ?? 0} onChange={v => updateHoleStat(currentHole, 'ballsLost', v)} />
                </div>
                <div className="border-t border-hairline" />
                <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Penalties</p>
                <div className="flex gap-2">
                  <PenaltyPill label="Water" value={hole.waterHazards} onChange={v => updateHoleStat(currentHole, 'waterHazards', v)} />
                  <PenaltyPill label="OB" value={hole.outOfBounds} onChange={v => updateHoleStat(currentHole, 'outOfBounds', v)} />
                  <PenaltyPill label="Drop" value={hole.dropShots} onChange={v => updateHoleStat(currentHole, 'dropShots', v)} />
                </div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              {currentHole > 0 ? (
                <button
                  onClick={() => setCurrentHole(h => h - 1)}
                  className="flex-1 bg-white border border-hairline text-gray-700 font-semibold py-3.5 rounded-full flex items-center justify-center gap-1 active:bg-gray-50"
                >
                  <ChevronLeft size={18} /> Prev
                </button>
              ) : (
                <div className="flex-1" />
              )}
              {currentHole < holeScores.length - 1 ? (
                <button
                  onClick={() => setCurrentHole(h => h + 1)}
                  className="flex-1 bg-golf-green text-white font-semibold py-3.5 rounded-full flex items-center justify-center gap-1 active:opacity-90"
                >
                  Next <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => setPhase('summary')}
                  className="flex-1 bg-golf-green text-white font-semibold py-3.5 rounded-full active:opacity-90"
                >
                  Finish Round
                </button>
              )}
            </div>
            {currentHole < holeScores.length - 1 && (
              <button onClick={() => setPhase('summary')} className="w-full text-center text-gray-400 text-sm py-1">
                Finish early
              </button>
            )}
          </div>
          <div className="flex-[0.5]" />
        </div>
      </div>
    );
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const holesPlayed = nineHoleType ? 9 : 18;
  const totalScore  = holeScores.reduce((s, h) => s + h.score, 0);
  const coursePar   = holeScores.reduce((s, h) => s + h.par, 0);
  const diff        = totalScore - coursePar;
  const established = handicapIndex !== null;
  const courseHandicap = established
    ? calcCourseHandicap(handicapIndex, teeRS.slope, teeRS.rating, selectedTee.par)
    : null;
  const adjustedGrossScore = established
    ? calcAdjustedGrossScore(holeScores, courseHandicap, holesPlayed, true)
    : calcAdjustedGrossScore(holeScores, 0, holesPlayed, false);
  const scoreDifferential = calcScoreDifferential(
    adjustedGrossScore, teeRS.rating, teeRS.slope, holesPlayed, handicapIndex
  );
  const roundStats = computeRoundStats(holeScores);

  return (
    <div className="min-h-full bg-canvas-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-canvas-night safe-pt px-4 pt-12 pb-8 text-center">
        <p className="text-white/50 text-sm font-medium">Round Complete</p>
        <p className="text-white text-6xl font-black mt-1 leading-none">{totalScore}</p>
        <p className={`text-xl font-bold mt-2 ${
          diff === 0 ? 'text-white/50' : diff < 0 ? 'text-yellow-300' : 'text-red-300'
        }`}>
          {diff === 0 ? 'Even' : diff > 0 ? `+${diff}` : diff} to par
        </p>
        <p className="text-white/50 text-sm mt-2">
          {selectedCourse.name} · {teeLabel(selectedTee)}
          {nineHoleType && ` · ${nineHoleType === 'front' ? 'Front 9' : 'Back 9'}`}
        </p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Handicap stats */}
        <div className="bg-white rounded-xl shadow-card divide-y divide-hairline">
          {[
            ['Gross Score', totalScore],
            ['Course Par', coursePar],
            ...(adjustedGrossScore !== totalScore ? [['Adjusted Gross', adjustedGrossScore]] : []),
            ...(holesPlayed === 9 && handicapIndex !== null ? [
              ['9-Hole Differential', parseFloat(((adjustedGrossScore - teeRS.rating / 2) * 113 / teeRS.slope).toFixed(1)).toFixed(1)],
              [`Expected (HI ${handicapIndex.toFixed(1)})`, parseFloat((handicapIndex / 2 + 1.5).toFixed(1)).toFixed(1)],
            ] : []),
            [holesPlayed === 9 && handicapIndex !== null ? '18-Hole Equivalent' : 'Score Differential', scoreDifferential.toFixed(1)],
            [`Rating / Slope (${roundGender === 'womens' ? "Women's" : "Men's"})`, `${teeRS.rating} / ${teeRS.slope}`],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3 flex justify-between items-center">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Round stats (only if data was tracked) */}
        {roundStats.hasData && (
          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Round Stats</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                roundStats.puttHoles > 0       && ['Putts',      roundStats.totalPutts],
                roundStats.fairwayAttempts > 0  && ['Fairways',   `${roundStats.fairwaysHit}/${roundStats.fairwayAttempts}`],
                roundStats.greensAttempts > 0   && ['GIR',        `${roundStats.girCount}/${roundStats.totalHoles}`],
                roundStats.greensAttempts > 0   && ['Greens',     `${roundStats.greensHit}/${roundStats.greensAttempts}`],
                roundStats.fwBunkers > 0        && ['FW Bunkers',  roundStats.fwBunkers],
                roundStats.gsBunkers > 0        && ['GS Bunkers',  roundStats.gsBunkers],
                roundStats.chipShots > 0        && ['Chips',       roundStats.chipShots],
                roundStats.upAndDownAttempts > 0 && ['Up & Down', `${roundStats.upAndDowns}/${roundStats.upAndDownAttempts}`],
                roundStats.waterHazards > 0     && ['Water',       roundStats.waterHazards],
                roundStats.outOfBounds > 0      && ['OB',          roundStats.outOfBounds],
                roundStats.dropShots > 0        && ['Drops',       roundStats.dropShots],
                roundStats.ballsLost > 0        && ['Lost Balls',  roundStats.ballsLost],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="text-center py-2 bg-canvas-cream rounded-xl">
                  <p className="text-lg font-black text-gray-900 leading-tight">{value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scorecard */}
        <div className="bg-white rounded-xl shadow-card p-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Scorecard</h3>
          {(holesPlayed === 9 ? [holeScores] : [holeScores.slice(0, 9), holeScores.slice(9)]).map((nine, nineIdx) => (
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
                      d <= -2 ? 'text-yellow-500' : d === -1 ? 'text-green-600' :
                      d === 0 ? 'text-gray-700'  : d === 1  ? 'text-blue-500' : 'text-red-500'
                    }`}>{h.score}</div>
                  );
                })}
              </div>
              {nineIdx === 0 && holesPlayed === 18 && <div className="border-t border-gray-100 my-2" />}
            </div>
          ))}
        </div>

        <button onClick={handleSave} className="w-full bg-golf-green text-white font-semibold py-4 rounded-full active:opacity-90 transition-opacity">
          Save Round
        </button>
        <button onClick={() => setPhase('scoring')} className="w-full bg-white border border-hairline text-gray-700 font-semibold py-3.5 rounded-full active:bg-gray-50">
          Keep Editing
        </button>
        <button onClick={handleDiscard} className="w-full text-center text-gray-400 text-sm py-2">
          Discard Round
        </button>
      </div>
    </div>
  );
}
