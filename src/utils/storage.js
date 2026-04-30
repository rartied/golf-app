// Active round only — persists in-progress rounds on the current device.
// All courses and rounds data lives in Supabase.

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const storage = {
  getActiveRound: () => load('golf_active_round', null),
  saveActiveRound: (round) => localStorage.setItem('golf_active_round', JSON.stringify(round)),
  clearActiveRound: () => localStorage.removeItem('golf_active_round'),
};
