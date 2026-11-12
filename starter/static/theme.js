const THEME_STORAGE_KEY = 'sudoku-theme';

function loadTheme(storage) {
  try {
    const target = storage || (
      typeof window !== 'undefined' ? window.localStorage : localStorage
    );
    const theme = target.getItem(THEME_STORAGE_KEY);
    return theme === 'dark' || theme === 'light' ? theme : 'light';
  } catch {
    return 'light';
  }
}

function saveTheme(storage, theme) {
  if (theme !== 'dark' && theme !== 'light') {
    return { saved: false, error: 'Theme must be light or dark.' };
  }
  try {
    const target = storage || (
      typeof window !== 'undefined' ? window.localStorage : localStorage
    );
    target.setItem(THEME_STORAGE_KEY, theme);
    return { saved: true, error: null };
  } catch {
    return {
      saved: false,
      error: 'Theme preference could not be saved in this browser.',
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { THEME_STORAGE_KEY, loadTheme, saveTheme };
} else {
  window.GameTheme = { loadTheme, saveTheme };
}
