function isCorrectCompletion(board, incorrectCells, conflictCount) {
  const isFullBoard = (
    Array.isArray(board)
    && board.length === 9
    && board.every(
      (row) => Array.isArray(row)
        && row.length === 9
        && row.every((value) => Number.isInteger(value) && value >= 1 && value <= 9)
    )
  );
  return (
    isFullBoard
    && Array.isArray(incorrectCells)
    && incorrectCells.length === 0
    && conflictCount === 0
  );
}

function createCompletionResult(difficulty, elapsedSeconds, hintsUsed) {
  return {
    difficulty,
    elapsedSeconds,
    hintsUsed,
    completed: true,
  };
}

function createGameState() {
  return {
    difficulty: null,
    elapsedSeconds: 0,
    hintsUsed: 0,
    completed: false,
    gameId: null,
    scoreSubmitted: false,
  };
}

function resetGameState(state, difficulty, gameId) {
  Object.assign(state, {
    difficulty,
    elapsedSeconds: 0,
    hintsUsed: 0,
    completed: false,
    gameId,
    scoreSubmitted: false,
  });
  return state;
}

function markGameCompleted(state, elapsedSeconds) {
  if (state.completed) {
    return false;
  }
  state.elapsedSeconds = elapsedSeconds;
  state.completed = true;
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createCompletionResult,
    createGameState,
    isCorrectCompletion,
    markGameCompleted,
    resetGameState,
  };
} else {
  window.GameCompletion = {
    createCompletionResult,
    createGameState,
    isCorrectCompletion,
    markGameCompleted,
    resetGameState,
  };
}
