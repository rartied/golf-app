# Calculations

Everything the app computes, explained. All handicap formulas follow the **World Handicap System (WHS) 2024** specification as published by the USGA.

---

## Handicap Establishment

A Handicap Index is not issued until a player has posted at least **54 holes** (e.g. three 18-hole rounds, or six 9-hole rounds, or any combination that totals 54). Until then, the app records rounds and score differentials but displays "Not yet established" instead of an index.

---

## Adjusted Gross Score (AGS)

Before computing a score differential, each hole score is capped to remove the effect of a single catastrophic hole. The cap rule differs depending on whether the player has an established Handicap Index.

### Established players — Net Double Bogey cap

```
cap (per hole) = par + 2 + handicapStrokes
AGS = sum of min(holeScore, cap) across all holes
```

`handicapStrokes` on a hole depends on the hole's stroke index and your Course Handicap:

- Every hole gets `floor(courseHandicap / 18)` strokes.
- Holes whose stroke index ≤ `courseHandicap % 18` receive one additional stroke.
- Plus-handicap players (better than scratch) lose a stroke on holes whose stroke index > `18 + courseHandicap`.

For a 9-hole round, the Course Handicap is halved before the cap is applied.

### Unestablished players — Par + 5 cap (WHS Rule 3.1)

Before a Handicap Index exists, there is no Course Handicap to use for the net double bogey calculation. Instead, WHS specifies a fixed cap:

```
cap (per hole) = par + 5
AGS = sum of min(holeScore, cap) across all holes
```

---

## Course Handicap

Converts your Handicap Index to the number of strokes you receive at a specific course and tee.

```
courseHandicap = round(handicapIndex × (slope / 113) + (courseRating − par))
```

---

## Score Differential

Measures how well you played relative to the course difficulty. Stored for every round and used as the input to all handicap calculations.

### 18-hole round

```
scoreDifferential = (AGS − courseRating) × 113 / slope
```

### 9-hole round (WHS 2024 expected-score method)

A 9-hole round produces a partial differential. To make it comparable to an 18-hole differential, the app combines it with an "expected" second-9 differential:

```
nineHoleSD        = (AGS − courseRating / 2) × 113 / slope
expectedSD        = handicapIndex / 2 + 1.5
scoreDifferential = nineHoleSD + expectedSD   ← stored as 18-hole equivalent
```

`expectedSD` represents the expected performance on the half of the round not played, given your current ability level. If no Handicap Index exists yet, only `nineHoleSD` is stored and the combination happens once enough rounds accumulate.

---

## Handicap Index

Calculated from your most recent **20 rounds**. The number of differentials used depends on how many rounds are in the record:

| Rounds in record | Differentials used | Adjustment |
|------------------|--------------------|------------|
| 3                | best 1             | −2.0       |
| 4                | best 1             | −1.0       |
| 5                | best 1             | 0          |
| 6                | best 2             | −1.0       |
| 7–8              | best 2             | 0          |
| 9–11             | best 3             | 0          |
| 12–14            | best 4             | 0          |
| 15–16            | best 5             | 0          |
| 17–18            | best 6             | 0          |
| 19               | best 7             | 0          |
| 20               | best 8             | 0          |

```
baseIndex     = (average of selected differentials + adjustment) × 0.96
handicapIndex = min(baseIndex, 54.0)
```

The **0.96 multiplier** is WHS's built-in "excellence factor" — it rewards players for playing to their potential rather than their average. The **54.0 cap** is the WHS maximum Handicap Index.

Three additional adjustments are then applied on top of the base calculation (see below).

---

## Exceptional Score Reduction (WHS Rule 5.9)

If any round in your most recent 20 was significantly better than your Handicap Index at the time it was played, the index is reduced:

```
gap = priorHandicapIndex − scoreDifferential
```

| Gap        | Reduction applied to index |
|------------|---------------------------|
| ≥ 7.0      | −1.0                      |
| ≥ 10.0     | −2.0                      |

Reductions from all qualifying rounds in the 20-round window accumulate. For example, if two rounds each had a gap ≥ 7.0 (but < 10.0), the total reduction is −2.0.

The app computes `priorHandicapIndex` as the base index calculated from all rounds posted *before* each respective round — this avoids a circular dependency (using a round to calculate the very index that determines whether that round triggers a reduction).

---

## Low Handicap Index (WHS Rule 5.7)

The Low Handicap Index is the **lowest Handicap Index achieved in the 365 days** preceding the most recent round. It is used as a reference point for the soft and hard caps below.

Low HI only applies once you have at least **20 rounds** in your record. If you have fewer than 20 rounds, no soft or hard cap is in effect.

---

## Soft Cap and Hard Cap (WHS Rule 5.8)

These rules limit how much a Handicap Index can increase above the Low HI, preventing a temporary stretch of poor play from inflating the index significantly.

### Soft cap

If the uncapped index exceeds `Low HI + 3.0`, only 50% of the increase beyond that point is applied:

```
if uncapped > lowHI + 3.0:
    result = (lowHI + 3.0) + 0.5 × (uncapped − (lowHI + 3.0))
```

### Hard cap

The index cannot exceed `Low HI + 5.0` under any circumstances:

```
result = min(result, lowHI + 5.0)
```

---

## Playing Conditions Calculation (PCC)

WHS includes a daily PCC adjustment that shifts all differentials up or down based on how all players performed at a given course on a given day. The app does **not** implement PCC — it requires population-level aggregate scoring data across all players on the same course and day, which is not available in a single-user context. Rounds are saved with PCC = 0.

---

## Dashboard Trend Sparkline

The chart on the dashboard shows your recent scoring trajectory.

- Source: last 20 rounds, sorted oldest → newest, using raw score differentials.
- Each point is a **3-round rolling average** of differentials up to that round (point *i* = average of rounds *i−2*, *i−1*, *i*).
- The dashed horizontal line is your current Handicap Index.
- The label on the last dot shows your most recent raw differential relative to your Handicap Index.

The rolling average smooths out round-to-round noise so the trend direction is clearer.

---

## Stats Trend Indicators

Each stat card on the Stats page shows "improving" or "declining" once you have enough data.

- Requires at least **6 rounds** with data for that metric.
- Compares the **last 5 rounds** against the **5 rounds before that**.
- "Improving" = recent average moved in the beneficial direction (lower for putts/bunkers/penalties/balls lost; higher for GIR%/fairway%/up-down%).
- Changes smaller than 0.01 are treated as no change.

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
puttsPerGIR = total putts on GIR holes / GIR holes
```

Isolates putting quality from approach play. A scratch golfer averages ~1.75 putts per GIR; most amateurs are around 1.9–2.0.

---

## Up & Down

Inferred automatically — no separate input required.

```
upAndDown = chipShots ≥ 1  AND  putts = 1  (on the same hole)
```

**Up & Down %** = up-and-down holes / total holes where at least one chip was played.

---

## Fairway Hit %

```
fairwayHit% = fairways hit / fairway attempts × 100
```

Fairway attempts exclude par 3s (recorded as N/A). A fairway is "hit" when the tee shot lands in the fairway; "right" or "left" count as misses.

---

## Balls Lost

Tracked per hole as an integer count. Stats page reports:

- **Balls / Round** — average across rounds that have ball-tracking data.
- **Fewest Balls** — personal best (lowest balls lost in a single round).
- **Career Balls Lost** — total across all rounds.

---

## Penalties

Three types are tracked separately: **water hazards**, **out of bounds**, and **drop shots**. The total shown in stats is their sum. Legacy rounds that stored a single `penalties` field are included in the total for backwards compatibility.
