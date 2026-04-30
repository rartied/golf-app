// Scorecard OCR using Tesseract.js
// Parses numeric rows from a scorecard image

export async function recognizeScorecard(imageFile, onProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const url = URL.createObjectURL(imageFile);
    const { data } = await worker.recognize(url);
    URL.revokeObjectURL(url);
    return parseScorecard(data.text);
  } finally {
    await worker.terminate();
  }
}

export function parseScorecard(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract rows that contain mostly digits (likely data rows)
  const numericRows = lines
    .map(line => {
      const tokens = line.split(/\s+/);
      const nums = tokens
        .map(t => parseInt(t.replace(/[^0-9]/g, ''), 10))
        .filter(n => !isNaN(n) && n > 0);
      return { raw: line, nums };
    })
    .filter(row => row.nums.length >= 8);

  // Try to identify the rows by their value ranges
  const parRow = numericRows.find(r => r.nums.length >= 9 && r.nums.every(n => n >= 3 && n <= 5));
  const siRow = numericRows.find(r =>
    r !== parRow &&
    r.nums.length >= 9 &&
    r.nums.every(n => n >= 1 && n <= 18) &&
    new Set(r.nums.map(String)).size >= 8 // mostly unique
  );
  const scoreRow = numericRows.find(r =>
    r !== parRow &&
    r !== siRow &&
    r.nums.length >= 9 &&
    r.nums.every(n => n >= 1 && n <= 15)
  );

  const front9Par = parRow?.nums.slice(0, 9) || [];
  const back9Par = parRow?.nums.slice(9, 18) || [];
  const front9SI = siRow?.nums.slice(0, 9) || [];
  const back9SI = siRow?.nums.slice(9, 18) || [];
  const front9Score = scoreRow?.nums.slice(0, 9) || [];
  const back9Score = scoreRow?.nums.slice(9, 18) || [];

  const holes = Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: (i < 9 ? front9Par[i] : back9Par[i - 9]) || null,
    strokeIndex: (i < 9 ? front9SI[i] : back9SI[i - 9]) || null,
    score: (i < 9 ? front9Score[i] : back9Score[i - 9]) || null,
  }));

  return {
    rawText,
    holes,
    allRows: numericRows,
    confidence: {
      par: !!parRow,
      strokeIndex: !!siRow,
      scores: !!scoreRow,
    },
  };
}
