const LEADERBOARD_STORAGE_KEY = 'sudoku-top-times';
const MAX_LEADERBOARD_ENTRIES = 10;
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const EMPTY_SCORE_DATA = { scores: [], submittedGameIds: [] };

function isValidEntry(entry) {
  return (
    entry !== null
    && typeof entry === 'object'
    && typeof entry.name === 'string'
    && entry.name.trim().length > 0
    && Number.isInteger(entry.elapsedSeconds)
    && entry.elapsedSeconds >= 0
    && VALID_DIFFICULTIES.has(entry.difficulty)
    && Number.isInteger(entry.hintsUsed)
    && entry.hintsUsed >= 0
    && typeof entry.gameId === 'string'
    && entry.gameId.length > 0
  );
}

function sortScores(scores) {
  return scores
    .filter(isValidEntry)
    .slice()
    .sort((left, right) => left.elapsedSeconds - right.elapsedSeconds)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}

function loadScores(storage = localStorage) {
  try {
    const storedValue = storage.getItem(LEADERBOARD_STORAGE_KEY);
    if (storedValue === null) {
      return { ...EMPTY_SCORE_DATA, error: null };
    }

    const parsedValue = JSON.parse(storedValue);
    const storedScores = Array.isArray(parsedValue) ? parsedValue : parsedValue.scores;
    if (!Array.isArray(storedScores)) {
      return { ...EMPTY_SCORE_DATA, error: 'Saved leaderboard data is invalid.' };
    }

    const validScores = storedScores.filter(isValidEntry);
    const submittedGameIds = Array.isArray(parsedValue.submittedGameIds)
      ? parsedValue.submittedGameIds.filter(
        (gameId) => typeof gameId === 'string' && gameId.length > 0
      )
      : validScores.map((score) => score.gameId);
    return {
      scores: sortScores(validScores),
      submittedGameIds: [...new Set([...submittedGameIds, ...validScores.map((score) => score.gameId)])],
      error: storedScores.some((entry) => !isValidEntry(entry))
        ? 'Some invalid saved scores were ignored.'
        : null,
    };
  } catch {
    return {
      ...EMPTY_SCORE_DATA,
      error: 'Saved leaderboard data could not be loaded.',
    };
  }
}

function saveScore(storage, result, name, gameId) {
  const normalizedName = typeof name === 'string' ? name.trim().slice(0, 40) : '';
  const scoresResult = loadScores(storage);
  if (!normalizedName) {
    return { saved: false, duplicate: false, error: 'Enter a player name to save this score.' };
  }
  if (
    !result
    || !Number.isInteger(result.elapsedSeconds)
    || result.elapsedSeconds < 0
    || !VALID_DIFFICULTIES.has(result.difficulty)
    || !Number.isInteger(result.hintsUsed)
    || result.hintsUsed < 0
    || result.completed !== true
    || typeof gameId !== 'string'
    || gameId.length === 0
  ) {
    return { saved: false, duplicate: false, error: 'Completed game data is invalid.' };
  }
  if (scoresResult.submittedGameIds.includes(gameId)) {
    return { saved: false, duplicate: true, error: null };
  }

  const entry = {
    name: normalizedName,
    elapsedSeconds: result.elapsedSeconds,
    difficulty: result.difficulty,
    hintsUsed: result.hintsUsed,
    gameId,
  };
  const scores = sortScores([...scoresResult.scores, entry]);
  const submittedGameIds = [...scoresResult.submittedGameIds, gameId];

  try {
    storage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify({ scores, submittedGameIds })
    );
    return {
      saved: true,
      duplicate: false,
      error: null,
      scores,
      entry,
      rank: scores.findIndex((score) => score.gameId === gameId) + 1 || null,
    };
  } catch {
    return {
      saved: false,
      duplicate: false,
      error: 'Your score could not be saved in this browser.',
    };
  }
}

function formatScoreTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0'));
  return hours > 0 ? parts.join(':') : parts.slice(1).join(':');
}

function renderScores(container, scores) {
  container.replaceChildren();
  if (scores.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-leaderboard';
    emptyMessage.textContent = 'Complete a puzzle to set your first time.';
    container.appendChild(emptyMessage);
    return;
  }

  const table = document.createElement('table');
  table.className = 'leaderboard-table';
  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = 'Top 10 fastest Sudoku completion times';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Rank', 'Player', 'Time', 'Difficulty', 'Hints'].forEach((label) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.textContent = label;
    headerRow.appendChild(heading);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  scores.forEach((score, index) => {
    const row = document.createElement('tr');
    const values = [
      String(index + 1),
      score.name,
      formatScoreTime(score.elapsedSeconds),
      score.difficulty[0].toUpperCase() + score.difficulty.slice(1),
      String(score.hintsUsed),
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function loadAndRenderScores(storage = localStorage, container) {
  const result = loadScores(storage);
  if (container) {
    renderScores(container, result.scores);
  }
  return result;
}

function createGameId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LEADERBOARD_STORAGE_KEY,
    MAX_LEADERBOARD_ENTRIES,
    createGameId,
    formatScoreTime,
    loadScores,
    loadAndRenderScores,
    renderScores,
    saveScore,
    sortScores,
  };
} else {
  window.GameLeaderboard = {
    createGameId,
    formatScoreTime,
    loadScores,
    loadAndRenderScores,
    renderScores,
    saveScore,
    sortScores,
  };
}
