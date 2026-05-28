# Calculations

Everything the app computes, explained. All formulas follow the **World Handicap System (WHS) 2024** specification unless noted otherwise.

---

## Score Differential

The score differential measures how well you played relative to the course difficulty. It is stored for every round and is the foundation of the handicap index.

### 18-hole round

```
scoreDifferential = (adjustedGrossScore − courseRating) × 113 / slope
```

### 9-hole round

A 9-hole round produces a partial differential. To make it comparable to an 18-hole differential, the app uses the WHS 2024 expected-score method:

```
nineHoleSD   = (adjustedGrossScore − courseRating / 2) × 113 / slope
expectedSD   = handicapIndex / 2 + 1.5
scoreDifferential = nineHoleSD + expectedSD   ← 18-hole equivalent
```

The `expectedSD` represents what an average second 9 holes would look like for your current ability. If no handicap index exists yet (fewer than 3 rounds), the raw `nineHoleSD` is stored and used as-is until enough rounds accumulate.

---

## Adjusted Gross Score

Before computing the differential, each hole score is capped at **Net Double Bogey** to limit the damage a single bad hole can do.

```
cap (per hole) = par + 2 + handicapStrokes
adjustedGrossScore = sum of min(holeScore, cap) across all holes
```

`handicapStrokes` on a hole is determined by the hole's stroke index and your course handicap:

- Every hole gets `floor(courseHandicap / 18)` strokes.
- Holes whose stroke index ≤ `courseHandicap % 18` get one extra stroke.
- Plus-handicap players (better than scratch) lose a stroke on holes whose stroke index > `18 + courseHandicap`.

For a 9-hole round, course handicap is halved before applying the cap.

---

## Course Handicap

Converts your handicap index to the number of strokes you receive at a specific course and tee.

```
courseHandicap = round(handicapIndex × (slope / 113) + (courseRating − par))
```

---

## Handicap Index

The handicap index is calculated from your most recent **20 rounds**. The number of differentials used depends on how many rounds you have:

| Rounds | Differentials used | Adjustment |
|--------|-------------------|------------|
| 3      | best 1            | −2.0       |
| 4      | best 1            | −1.0       |
| 5      | best 1            | 0          |
| 6      | best 2            | −1.0       |
| 7–8    | best 2            | 0          |
| 9–11   | best 3            | 0          |
| 12–14  | best 4            | 0          |
| 15–16  | best 5            | 0          |
| 17–18  | best 6            | 0          |
| 19     | best 7            | 0          |
| 20     | best 8            | 0          |

```
handicapIndex = (average of selected differentials + adjustment) × 0.96
handicapIndex = min(handicapIndex, 54.0)
```

The 0.96 factor is the WHS "playing conditions calculation" constant. The cap of 54.0 is the WHS maximum.

---

## Dashboard Trend Sparkline

The chart on the dashboard shows your recent scoring trajectory.

- Source data: last 20 rounds, sorted oldest → newest, using raw score differentials.
- Each plotted point is a **3-round rolling average** of the differentials up to that round (i.e. point *i* = average of rounds *i−2*, *i−1*, *i*).
- The dashed horizontal line is your current handicap index.
- The label on the last dot shows your most recent raw differential relative to your handicap index (`+1.2`, `−0.8`, etc.).

The rolling average smooths out round-to-round noise so the trend direction is clearer.

---

## Stats Trend Indicators

Each stat card on the Stats page shows "improving" or "declining" once you have enough data.

- Requires at least **6 rounds** with data for that metric.
- Compares the **last 5 rounds** against the **5 rounds before that** (rounds 6–10 chronologically).
- "Improving" means the recent average moved in the beneficial direction (lower for putts/bunkers/penalties, higher for GIR%/fairway%/up-down%).
- Changes smaller than 0.01 are treated as no change (neither improving nor declining shown).

---

## GIR — Green in Regulation

A green is hit in regulation when the ball is on the putting surface in **par − 2 strokes or fewer**.

| Par | Shots to reach green for GIR |
|-----|------------------------------|
| 3   | 1                            |
| 4   | 2                            |
| 5   | 3                            |

In the app: `greenHit === 'hit'` AND `(score − putts) ≤ (par − 2)`.

**GIR %** = GIR holes / total holes attempted.

---

## Putts per GIR

Average number of putts taken on holes where GIR was achieved.

```
puttsPerGIR = total putts on GIR holes / number of GIR holes
```

This isolates putting quality from approach play. A scratch golfer averages ~1.75 putts per GIR; most amateur players are closer to 1.9–2.0.

---

## Up & Down

An up and down is inferred automatically — no separate input required.

```
upAndDown = chipShots ≥ 1  AND  putts = 1  (on the same hole)
```

**Up & Down %** = up-and-down holes / total holes where at least one chip was played.

---

## Fairway Hit %

```
fairwayHit% = fairways hit / fairway attempts × 100
```

Fairway attempts exclude par 3s (recorded as N/A since there is no fairway to hit). A fairway is "hit" when the tee shot comes to rest in the fairway; "right" or "left" count as misses.

---

## Penalties

The app tracks three penalty types separately: **water hazards**, **out of bounds**, and **drop shots**. The total displayed in stats is their sum. Legacy rounds that stored a single `penalties` field are included in the total for backwards compatibility.
