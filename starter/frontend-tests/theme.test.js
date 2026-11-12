const assert = require('node:assert/strict');
const test = require('node:test');

const { THEME_STORAGE_KEY, loadTheme, saveTheme } = require('../static/theme.js');

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) {
    values.set(THEME_STORAGE_KEY, initialValue);
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('theme preference persists and loads from storage', () => {
  const storage = createStorage();
  assert.deepEqual(saveTheme(storage, 'dark'), { saved: true, error: null });
  assert.equal(loadTheme(storage), 'dark');
});

test('missing or invalid stored themes fall back to light mode', () => {
  assert.equal(loadTheme(createStorage()), 'light');
  assert.equal(loadTheme(createStorage('system')), 'light');
});

test('theme storage failures do not break theme initialization or toggling', () => {
  const failingStorage = {
    getItem() {
      throw new Error('storage unavailable');
    },
    setItem() {
      throw new Error('storage unavailable');
    },
  };

  assert.equal(loadTheme(failingStorage), 'light');
  assert.equal(saveTheme(failingStorage, 'dark').saved, false);
});

test('invalid theme values are rejected', () => {
  assert.equal(saveTheme(createStorage(), 'system').saved, false);
});
