const assert = require('node:assert/strict');
const test = require('node:test');

const { GameTimer, formatElapsedTime } = require('../static/game-timer.js');

test('formats minutes and hours with padded components', () => {
  assert.equal(formatElapsedTime(0), '00:00');
  assert.equal(formatElapsedTime(65), '01:05');
  assert.equal(formatElapsedTime(3605), '01:00:05');
});

test('calculates elapsed time from the monotonic clock and stops cleanly', () => {
  let now = 1250;
  let intervalCallback;
  let nextIntervalId = 0;
  const activeIntervals = new Set();
  const display = { textContent: '' };
  const timer = new GameTimer(display, {
    now: () => now,
    setIntervalFn: (callback) => {
      intervalCallback = callback;
      const intervalId = ++nextIntervalId;
      activeIntervals.add(intervalId);
      return intervalId;
    },
    clearIntervalFn: (intervalId) => activeIntervals.delete(intervalId),
  });

  timer.start();
  now += 2450;
  intervalCallback();

  assert.equal(display.textContent, '00:02');
  assert.equal(timer.stop(), 2);
  assert.equal(activeIntervals.size, 0);

  now += 8000;
  timer.render();
  assert.equal(display.textContent, '00:02');
});

test('starting again replaces the existing interval and resets elapsed time', () => {
  let now = 0;
  let nextIntervalId = 0;
  const activeIntervals = new Set();
  const display = { textContent: '' };
  const timer = new GameTimer(display, {
    now: () => now,
    setIntervalFn: () => {
      const intervalId = ++nextIntervalId;
      activeIntervals.add(intervalId);
      return intervalId;
    },
    clearIntervalFn: (intervalId) => activeIntervals.delete(intervalId),
  });

  timer.start();
  now = 5000;
  timer.render();
  timer.start();

  assert.equal(display.textContent, '00:00');
  assert.equal(activeIntervals.size, 1);
});

test('reset stops the timer and clears elapsed time', () => {
  let now = 0;
  const activeIntervals = new Set();
  let nextIntervalId = 0;
  const display = { textContent: '' };
  const timer = new GameTimer(display, {
    now: () => now,
    setIntervalFn: () => {
      const intervalId = ++nextIntervalId;
      activeIntervals.add(intervalId);
      return intervalId;
    },
    clearIntervalFn: (intervalId) => activeIntervals.delete(intervalId),
  });

  timer.start();
  now = 4200;
  timer.render();
  timer.reset();

  assert.equal(display.textContent, '00:00');
  assert.equal(timer.elapsedSeconds, 0);
  assert.equal(activeIntervals.size, 0);
});
