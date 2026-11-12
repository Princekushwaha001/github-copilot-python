function formatElapsedTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return [hours, remainingMinutes, remainingSeconds]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  }

  return [minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

class GameTimer {
  constructor(
    display,
    {
      now = () => performance.now(),
      setIntervalFn = (callback) => window.setInterval(callback, 1000),
      clearIntervalFn = (intervalId) => window.clearInterval(intervalId),
    } = {}
  ) {
    this.display = display;
    this.now = now;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.startedAt = null;
    this.intervalId = null;
    this.elapsedSeconds = 0;
  }

  render() {
    if (this.startedAt !== null) {
      this.elapsedSeconds = Math.floor((this.now() - this.startedAt) / 1000);
    }
    this.display.textContent = formatElapsedTime(this.elapsedSeconds);
  }

  reset() {
    this.stop();
    this.elapsedSeconds = 0;
    this.startedAt = null;
    this.render();
  }

  start() {
    this.reset();
    this.startedAt = this.now();
    this.render();
    this.intervalId = this.setIntervalFn(() => this.render(), 1000);
  }

  stop() {
    if (this.intervalId !== null) {
      this.clearIntervalFn(this.intervalId);
      this.intervalId = null;
    }
    this.render();
    this.startedAt = null;
    return this.elapsedSeconds;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameTimer, formatElapsedTime };
} else {
  window.GameTimer = GameTimer;
}
