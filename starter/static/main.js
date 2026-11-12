const SIZE = 9;
let currentPuzzle = null;
let boardRevision = 0;
let autoCheckRevision = -1;
let checkingBoard = false;
let gameRequestId = 0;
let hintRequestInProgress = false;
let hintRequestId = 0;
let gameLoading = false;
let gameTimer = null;
let completedGameResult = null;
const gameState = GameCompletion.createGameState();

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  const toggle = document.getElementById('theme-toggle');
  toggle.setAttribute('aria-pressed', String(isDark));
  toggle.querySelector('.theme-icon').textContent = isDark ? '☀' : '☾';
  toggle.querySelector('.theme-label').textContent = isDark ? 'Light mode' : 'Dark mode';
}

function setMessage(text, type = '') {
  const message = document.getElementById('message');
  message.textContent = text;
  message.className = `status-message${type ? ` status-${type}` : ''}`;
}

function updateHintCount() {
  document.getElementById('hint-count').textContent = String(gameState.hintsUsed);
}

function refreshLeaderboard() {
  const status = document.getElementById('leaderboard-status');
  try {
    const result = GameLeaderboard.loadAndRenderScores(
      window.localStorage,
      document.getElementById('leaderboard')
    );
    status.textContent = result.error || '';
  } catch {
    status.textContent = 'Leaderboard storage is unavailable in this browser.';
  }
}

function submitCompletedGame() {
  if (gameState.scoreSubmitted || !completedGameResult || !gameState.gameId) {
    return;
  }
  gameState.scoreSubmitted = true;
  const playerName = window.prompt('Congratulations! Enter your name for the leaderboard:');
  const status = document.getElementById('leaderboard-status');
  if (!playerName || !playerName.trim()) {
    status.textContent = 'Puzzle completed. Score not saved because no name was entered.';
    return;
  }

  try {
    const result = GameLeaderboard.saveScore(
      window.localStorage,
      completedGameResult,
      playerName,
      gameState.gameId
    );
    if (result.saved && result.rank !== null) {
      status.textContent = 'Your time was added to the leaderboard.';
      GameLeaderboard.renderScores(
        document.getElementById('leaderboard'),
        result.scores
      );
    } else if (result.saved) {
      status.textContent = 'Your time did not make the Top 10 fastest times.';
    } else if (result.error) {
      status.textContent = result.error;
    }
  } catch {
    status.textContent = 'Your score could not be saved in this browser.';
  }
}

function updateHintAvailability() {
  const hintButton = document.getElementById('hint-button');
  if (!hintButton) {
    return;
  }
  const boardIsFull = currentPuzzle && isBoardComplete(getBoard());
  hintButton.disabled = (
    !currentPuzzle
    || gameLoading
    || checkingBoard
    || hintRequestInProgress
    || gameState.completed
    || boardIsFull
  );
  document.getElementById('new-game').disabled = gameLoading || hintRequestInProgress;
  document.getElementById('difficulty').disabled = gameLoading || hintRequestInProgress;
}

function createBoardElement() {
  const board = document.getElementById('sudoku-board');
  board.replaceChildren();

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const cell = document.createElement('input');
      cell.type = 'text';
      cell.inputMode = 'numeric';
      cell.autocomplete = 'off';
      cell.maxLength = 1;
      cell.className = 'sudoku-cell';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, empty`);
      cell.setAttribute('aria-invalid', 'false');
      cell.setAttribute('aria-describedby', 'message');

      if ((Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1) {
        cell.classList.add('alternate-box');
      }
      if (col === 2 || col === 5) {
        cell.classList.add('box-right');
      }
      if (row === 2 || row === 5) {
        cell.classList.add('box-bottom');
      }

      cell.addEventListener('beforeinput', (event) => {
        if (
          event.inputType.startsWith('insert')
          && event.data !== null
          && !/^[1-9]$/.test(event.data)
        ) {
          event.preventDefault();
          setMessage('Enter a single number from 1 to 9.', 'error');
        }
      });
      cell.addEventListener('input', () => handleCellInput(cell, row, col));
      cell.addEventListener('keydown', handleCellKeydown);
      board.appendChild(cell);
    }
  }
}

function handleCellInput(cell, row, col) {
  const invalidEntry = cell.value !== '' && !/^[1-9]$/.test(cell.value);
  if (invalidEntry) {
    cell.value = '';
  }
  cell.setAttribute(
    'aria-label',
    `Row ${row + 1}, column ${col + 1}, ${cell.value || 'empty'}`
  );
  boardRevision += 1;

  document.querySelectorAll('.sudoku-cell.incorrect').forEach((entry) => {
    entry.classList.remove('incorrect');
  });
  const conflictCount = updateConflicts();
  if (invalidEntry) {
    setMessage('Enter a single number from 1 to 9.', 'error');
  } else if (conflictCount > 0) {
    setMessage(
      `${conflictCount} cells conflict with another number in the same row, column, or box.`,
      'error'
    );
  } else {
    setMessage('');
  }
  updateHintAvailability();
  maybeCheckCompletion();
}

function focusAdjacentCell(currentCell, rowStep, colStep) {
  let row = Number(currentCell.dataset.row);
  let col = Number(currentCell.dataset.col);

  for (let step = 0; step < SIZE * SIZE; step += 1) {
    row = (row + rowStep + SIZE) % SIZE;
    col = (col + colStep + SIZE) % SIZE;
    const candidate = document.querySelector(
      `.sudoku-cell[data-row="${row}"][data-col="${col}"]`
    );
    if (candidate && !candidate.disabled) {
      candidate.focus();
      return;
    }
  }
}

function handleCellKeydown(event) {
  const directions = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const direction = directions[event.key];

  if (direction) {
    event.preventDefault();
    focusAdjacentCell(event.currentTarget, direction[0], direction[1]);
  }
}

function getBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  document.querySelectorAll('.sudoku-cell').forEach((cell) => {
    board[Number(cell.dataset.row)][Number(cell.dataset.col)] = cell.value
      ? Number(cell.value)
      : 0;
  });
  return board;
}

function isBoardComplete(board) {
  return board.every((row) => row.every((value) => value !== 0));
}

function updateConflicts() {
  const cells = Array.from(document.querySelectorAll('.sudoku-cell'));
  const conflictingCells = new Set();
  const groups = [];

  for (let row = 0; row < SIZE; row += 1) {
    groups.push(Array.from({ length: SIZE }, (_, col) => row * SIZE + col));
  }
  for (let col = 0; col < SIZE; col += 1) {
    groups.push(Array.from({ length: SIZE }, (_, row) => row * SIZE + col));
  }
  for (let boxRow = 0; boxRow < SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
      const box = [];
      for (let row = boxRow; row < boxRow + 3; row += 1) {
        for (let col = boxCol; col < boxCol + 3; col += 1) {
          box.push(row * SIZE + col);
        }
      }
      groups.push(box);
    }
  }

  groups.forEach((group) => {
    const cellsByValue = new Map();
    group.forEach((index) => {
      const value = cells[index].value;
      if (!value) {
        return;
      }
      if (!cellsByValue.has(value)) {
        cellsByValue.set(value, []);
      }
      cellsByValue.get(value).push(index);
    });
    cellsByValue.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((index) => conflictingCells.add(index));
      }
    });
  });

  cells.forEach((cell, index) => {
    cell.classList.toggle('conflict', conflictingCells.has(index));
    cell.setAttribute(
      'aria-invalid',
      String(conflictingCells.has(index) || cell.classList.contains('incorrect'))
    );
  });
  return conflictingCells.size;
}

function renderPuzzle(puzzle) {
  currentPuzzle = puzzle;
  GameCompletion.resetGameState(
    gameState,
    gameState.difficulty,
    gameState.gameId
  );
  completedGameResult = null;
  updateHintCount();
  createBoardElement();
  puzzle.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const cell = document.querySelector(
        `.sudoku-cell[data-row="${rowIndex}"][data-col="${colIndex}"]`
      );
      if (value !== 0) {
        cell.value = String(value);
        cell.disabled = true;
        cell.classList.add('prefilled');
        cell.setAttribute(
          'aria-label',
          `Row ${rowIndex + 1}, column ${colIndex + 1}, given ${value}, locked`
        );
      }
    });
  });
  boardRevision += 1;
  autoCheckRevision = -1;
  updateConflicts();
  document.getElementById('check-solution').disabled = checkingBoard;
  updateHintAvailability();
}

function completeGame() {
  if (!GameCompletion.markGameCompleted(gameState, 0)) {
    return;
  }
  const elapsedSeconds = gameTimer.stop();
  gameState.elapsedSeconds = elapsedSeconds;
  completedGameResult = GameCompletion.createCompletionResult(
    gameState.difficulty,
    elapsedSeconds,
    gameState.hintsUsed
  );
  document.querySelectorAll('.sudoku-cell').forEach((cell) => {
    cell.disabled = true;
  });
  document.getElementById('check-solution').disabled = true;
  updateHintAvailability();
  const difficultyLabel = gameState.difficulty[0].toUpperCase()
    + gameState.difficulty.slice(1);
  setMessage(
    `Puzzle solved! ${difficultyLabel} · ${formatElapsedTime(elapsedSeconds)} · ${gameState.hintsUsed} ${gameState.hintsUsed === 1 ? 'hint' : 'hints'} used.`,
    'success'
  );
  submitCompletedGame();
}

function maybeCheckCompletion() {
  const board = getBoard();
  if (
    currentPuzzle
    && isBoardComplete(board)
    && autoCheckRevision !== boardRevision
    && !checkingBoard
  ) {
    autoCheckRevision = boardRevision;
    checkBoard(true);
  }
}

async function checkBoard(isAutomatic = false) {
  if (checkingBoard || !currentPuzzle) {
    return;
  }
  const board = getBoard();
  const checkedRevision = boardRevision;
  const checkButton = document.getElementById('check-solution');
  checkingBoard = true;
  checkButton.disabled = true;
  updateHintAvailability();
  checkButton.setAttribute('aria-busy', 'true');
  setMessage(isAutomatic ? 'Verifying your completed puzzle…' : 'Checking your entries…');

  try {
    const response = await fetch('/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to check this puzzle.');
    }
    if (!Array.isArray(data.incorrect)) {
      throw new Error('The server returned an invalid check response.');
    }
    if (checkedRevision !== boardRevision) {
      return;
    }

    const cells = document.querySelectorAll('.sudoku-cell');
    let incorrectCount = 0;
    data.incorrect.forEach(([row, col]) => {
      const cell = cells[row * SIZE + col];
      if (cell && !cell.disabled && cell.value !== '') {
        cell.classList.add('incorrect');
        incorrectCount += 1;
      }
    });
    const conflictCount = updateConflicts();
    const complete = isBoardComplete(board);
    const isConfirmedCompletion = GameCompletion.isCorrectCompletion(
      board,
      data.incorrect,
      conflictCount
    );

    if (isConfirmedCompletion) {
      completeGame();
    } else if (incorrectCount > 0) {
      setMessage(
        `${incorrectCount} entered ${incorrectCount === 1 ? 'value is' : 'values are'} incorrect. Check the highlighted cells.`,
        'error'
      );
    } else if (conflictCount > 0) {
      setMessage(
        `${conflictCount} cells conflict with another number in the same row, column, or box.`,
        'error'
      );
    } else if (complete) {
      setMessage('The completed board is not correct yet. Keep trying.', 'error');
    } else {
      setMessage('No incorrect entries so far. Keep going.', 'success');
    }
  } catch (error) {
    if (checkedRevision === boardRevision) {
      setMessage(
        error.message || 'Unable to reach the game server. Please try again.',
        'error'
      );
    }
  } finally {
    checkingBoard = false;
    checkButton.disabled = !currentPuzzle || gameState.completed || gameLoading;
    checkButton.removeAttribute('aria-busy');
    updateHintAvailability();
    if (boardRevision !== checkedRevision) {
      maybeCheckCompletion();
    }
  }
}

function setEditableCellsDisabled(disabled) {
  document.querySelectorAll('.sudoku-cell').forEach((cell) => {
    if (!cell.classList.contains('prefilled') && !cell.classList.contains('hinted')) {
      cell.disabled = disabled;
    }
  });
}

async function requestHint() {
  if (
    hintRequestInProgress
    || gameState.completed
    || checkingBoard
    || gameLoading
    || !currentPuzzle
    || isBoardComplete(getBoard())
  ) {
    return;
  }

  const requestId = ++hintRequestId;
  const requestGameId = gameRequestId;
  hintRequestInProgress = true;
  const hintButton = document.getElementById('hint-button');
  document.getElementById('new-game').disabled = true;
  document.getElementById('difficulty').disabled = true;
  hintButton.setAttribute('aria-busy', 'true');
  setEditableCellsDisabled(true);
  updateHintAvailability();
  setMessage('Finding a hint…');

  try {
    const response = await fetch('/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: getBoard() }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to get a hint.');
    }
    if (
      !Number.isInteger(data.row)
      || !Number.isInteger(data.col)
      || !Number.isInteger(data.value)
      || data.row < 0
      || data.row >= SIZE
      || data.col < 0
      || data.col >= SIZE
      || data.value < 1
      || data.value > SIZE
    ) {
      throw new Error('The server returned an invalid hint.');
    }
    if (requestGameId !== gameRequestId || requestId !== hintRequestId) {
      return;
    }

    const cell = document.querySelector(
      `.sudoku-cell[data-row="${data.row}"][data-col="${data.col}"]`
    );
    if (!cell || cell.value !== '' || cell.classList.contains('prefilled')) {
      throw new Error('The hinted cell is no longer available. Please try again.');
    }

    cell.value = String(data.value);
    cell.disabled = true;
    cell.classList.add('hinted');
    cell.setAttribute(
      'aria-label',
      `Row ${data.row + 1}, column ${data.col + 1}, hint ${data.value}, locked`
    );
    boardRevision += 1;
    gameState.hintsUsed += 1;
    updateHintCount();
    updateConflicts();
    setMessage(`Hint revealed at row ${data.row + 1}, column ${data.col + 1}.`, 'success');
    maybeCheckCompletion();
  } catch (error) {
    if (requestGameId === gameRequestId && requestId === hintRequestId) {
      setMessage(
        error.message || 'Unable to reach the game server. Please try again.',
        'error'
      );
    }
  } finally {
    if (requestId === hintRequestId) {
      hintRequestInProgress = false;
      hintButton.removeAttribute('aria-busy');
      if (requestGameId === gameRequestId && !gameLoading) {
        setEditableCellsDisabled(false);
      }
      updateHintAvailability();
      document.getElementById('new-game').disabled = gameLoading;
      document.getElementById('difficulty').disabled = gameLoading;
    }
  }
}

async function newGame() {
  const button = document.getElementById('new-game');
  const checkButton = document.getElementById('check-solution');
  const requestedDifficulty = document.getElementById('difficulty').value;
  const requestId = ++gameRequestId;
  hintRequestId += 1;
  hintRequestInProgress = false;
  gameLoading = true;
  gameTimer.reset();
  setEditableCellsDisabled(true);
  updateHintAvailability();
  boardRevision += 1;
  autoCheckRevision = -1;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  checkButton.disabled = true;
  setMessage('Creating your puzzle…');

  try {
    const response = await fetch(
      `/new?difficulty=${encodeURIComponent(requestedDifficulty)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to create a new puzzle.');
    }
    if (!Array.isArray(data.puzzle) || data.puzzle.length !== SIZE) {
      throw new Error('The server returned an invalid puzzle.');
    }
    if (requestId !== gameRequestId) {
      return;
    }
    gameLoading = false;
    GameCompletion.resetGameState(
      gameState,
      requestedDifficulty,
      GameLeaderboard.createGameId()
    );
    completedGameResult = null;
    renderPuzzle(data.puzzle);
    gameTimer.start();
    setMessage('');
  } catch (error) {
    if (requestId === gameRequestId) {
      gameLoading = false;
      setMessage(
        error.message || 'Unable to reach the game server. Please try again.',
        'error'
      );
      checkButton.disabled = !currentPuzzle || checkingBoard || gameState.completed;
      setEditableCellsDisabled(gameState.completed);
      if (currentPuzzle && !gameState.completed) {
        gameTimer.start();
      }
      updateHintAvailability();
    }
  } finally {
    if (requestId === gameRequestId) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }
}

function initialize() {
  gameTimer = new GameTimer(document.getElementById('game-timer'));
  gameTimer.reset();
  refreshLeaderboard();
  applyTheme(GameTheme.loadTheme());
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    const result = GameTheme.saveTheme(null, nextTheme);
    applyTheme(nextTheme);
    if (!result.saved) {
      document.getElementById('leaderboard-status').textContent = result.error;
    }
  });
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('difficulty').addEventListener('change', newGame);
  document.getElementById('check-solution').addEventListener('click', () => checkBoard());
  document.getElementById('hint-button').addEventListener('click', requestHint);
  document.getElementById('check-solution').disabled = true;
  document.getElementById('hint-button').disabled = true;
  newGame();
}

document.addEventListener('DOMContentLoaded', initialize);
