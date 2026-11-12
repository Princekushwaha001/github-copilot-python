const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createCompletionResult,
  createGameState,
  isCorrectCompletion,
  markGameCompleted,
  resetGameState,
} = require('../static/game-completion.js');

const SOLVED_BOARD = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

test('completion requires a full conflict-free board confirmed by the server', () => {
  assert.equal(isCorrectCompletion(SOLVED_BOARD, [], 0), true);

  const unfinishedBoard = SOLVED_BOARD.map((row) => row.slice());
  unfinishedBoard[0][0] = 0;
  assert.equal(isCorrectCompletion(unfinishedBoard, [], 0), false);
  assert.equal(isCorrectCompletion(SOLVED_BOARD, [[0, 0]], 0), false);
  assert.equal(isCorrectCompletion(SOLVED_BOARD, [], 2), false);
});

test('completion result stores only the requested game summary', () => {
  assert.deepEqual(createCompletionResult('hard', 3723, 2), {
    difficulty: 'hard',
    elapsedSeconds: 3723,
    hintsUsed: 2,
    completed: true,
  });
});

test('a new game resets hints, elapsed time, completion, and score submission state', () => {
  const state = createGameState();
  Object.assign(state, {
    elapsedSeconds: 98,
    hintsUsed: 3,
    completed: true,
    scoreSubmitted: true,
  });

  assert.equal(resetGameState(state, 'medium', 'game-2'), state);
  assert.deepEqual(state, {
    difficulty: 'medium',
    elapsedSeconds: 0,
    hintsUsed: 0,
    completed: false,
    gameId: 'game-2',
    scoreSubmitted: false,
  });
});

test('a completion can be recorded only once', () => {
  const state = createGameState();
  assert.equal(markGameCompleted(state, 42), true);
  assert.equal(markGameCompleted(state, 99), false);
  assert.equal(state.elapsedSeconds, 42);
});
