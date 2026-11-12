const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LEADERBOARD_STORAGE_KEY,
  MAX_LEADERBOARD_ENTRIES,
  loadScores,
  saveScore,
  sortScores,
} = require('../static/leaderboard.js');

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function createScore(index, elapsedSeconds = index) {
  return {
    name: `Player ${index}`,
    elapsedSeconds,
    difficulty: 'easy',
    hintsUsed: 0,
    gameId: `game-${index}`,
  };
}

test('sorts scores by fastest completion time', () => {
  const sorted = sortScores([
    createScore(1, 120),
    createScore(2, 45),
    createScore(3, 80),
  ]);

  assert.deepEqual(sorted.map((score) => score.elapsedSeconds), [45, 80, 120]);
});

test('keeps only the ten fastest scores', () => {
  const sorted = sortScores(
    Array.from({ length: 15 }, (_, index) => createScore(index, 100 - index))
  );

  assert.equal(sorted.length, MAX_LEADERBOARD_ENTRIES);
  assert.equal(sorted[0].elapsedSeconds, 86);
  assert.equal(sorted[9].elapsedSeconds, 95);
});

test('does not rank a score slower than the current top ten', () => {
  const storage = createMemoryStorage({
    [LEADERBOARD_STORAGE_KEY]: JSON.stringify({
      scores: Array.from({ length: 10 }, (_, index) => createScore(index, 20 + index)),
      submittedGameIds: [],
    }),
  });

  const result = saveScore(
    storage,
    {
      difficulty: 'hard',
      elapsedSeconds: 1000,
      hintsUsed: 0,
      completed: true,
    },
    'Slow Player',
    'game-slow'
  );

  assert.equal(result.saved, true);
  assert.equal(result.rank, null);
  assert.equal(loadScores(storage).scores.length, 10);
});

test('saves scores and loads them from localStorage', () => {
  const storage = createMemoryStorage();
  const result = {
    difficulty: 'medium',
    elapsedSeconds: 95,
    hintsUsed: 1,
    completed: true,
  };
  const saved = saveScore(storage, result, 'Ada', 'game-ada');
  const loaded = loadScores(storage);

  assert.equal(saved.saved, true);
  assert.equal(storage.getItem(LEADERBOARD_STORAGE_KEY) !== null, true);
  assert.deepEqual(loaded.scores, [
    {
      name: 'Ada',
      elapsedSeconds: 95,
      difficulty: 'medium',
      hintsUsed: 1,
      gameId: 'game-ada',
    },
  ]);
});

test('handles corrupted and invalid stored data gracefully', () => {
  const corrupted = createMemoryStorage({
    [LEADERBOARD_STORAGE_KEY]: '{not json',
  });
  assert.deepEqual(loadScores(corrupted).scores, []);
  assert.ok(loadScores(corrupted).error);

  const invalidEntry = createMemoryStorage({
    [LEADERBOARD_STORAGE_KEY]: JSON.stringify([{ name: '<img>', elapsedSeconds: -1 }]),
  });
  assert.deepEqual(loadScores(invalidEntry).scores, []);
  assert.ok(loadScores(invalidEntry).error);
});

test('prevents a completed game from being submitted more than once', () => {
  const storage = createMemoryStorage();
  const result = {
    difficulty: 'hard',
    elapsedSeconds: 400,
    hintsUsed: 2,
    completed: true,
  };

  assert.equal(saveScore(storage, result, 'Sam', 'game-unique').saved, true);
  assert.deepEqual(saveScore(storage, result, 'Sam', 'game-unique'), {
    saved: false,
    duplicate: true,
    error: null,
  });
  assert.equal(loadScores(storage).scores.length, 1);
});

test('remembers submissions even after a score falls outside the top ten', () => {
  const storage = createMemoryStorage();
  for (let index = 0; index < 12; index += 1) {
    saveScore(
      storage,
      {
        difficulty: 'easy',
        elapsedSeconds: 100 + index,
        hintsUsed: 0,
        completed: true,
      },
      `Player ${index}`,
      `game-${index}`
    );
  }

  const repeat = saveScore(
    storage,
    {
      difficulty: 'easy',
      elapsedSeconds: 100,
      hintsUsed: 0,
      completed: true,
    },
    'Player 0',
    'game-0'
  );

  assert.equal(loadScores(storage).scores.length, MAX_LEADERBOARD_ENTRIES);
  assert.equal(repeat.duplicate, true);
});

test('reports browser storage errors without throwing', () => {
  const unavailableStorage = {
    getItem() {
      throw new Error('Storage disabled');
    },
    setItem() {
      throw new Error('Storage disabled');
    },
  };

  assert.ok(loadScores(unavailableStorage).error);
  const saved = saveScore(
    unavailableStorage,
    {
      difficulty: 'easy',
      elapsedSeconds: 5,
      hintsUsed: 0,
      completed: true,
    },
    'Player',
    'game-storage-error'
  );
  assert.equal(saved.saved, false);
  assert.ok(saved.error);
});

test('renders player-provided names as text, not markup', () => {
  const originalDocument = global.document;
  const elements = [];
  global.document = {
    createElement(tagName) {
      const element = {
        tagName,
        children: [],
        className: '',
        textContent: '',
        appendChild(child) {
          this.children.push(child);
        },
      };
      elements.push(element);
      return element;
    },
  };
  const container = {
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    },
  };

  try {
    const unsafeName = '<img src=x onerror=alert(1)>';
    const scores = sortScores([{
      name: unsafeName,
      elapsedSeconds: 45,
      difficulty: 'easy',
      hintsUsed: 0,
      gameId: 'safe-render-test',
    }]);
    require('../static/leaderboard.js').renderScores(container, scores);

    assert.equal(container.children[0].tagName, 'table');
    assert.ok(elements.some((element) => element.textContent === unsafeName));
    assert.ok(elements.every((element) => !('innerHTML' in element)));
  } finally {
    global.document = originalDocument;
  }
});
