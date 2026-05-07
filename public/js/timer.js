/**
 * Timer class for countdown functionality
 */
class Timer {
  constructor(duration, onTick, onComplete) {
    this.duration = duration;
    this.remaining = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.interval = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.onTick?.(this.remaining);
    this.interval = setInterval(() => {
      this.remaining--;
      this.onTick?.(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        this.onComplete?.();
      }
    }, 1000);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.interval);
    this.interval = null;
  }

  resume() { this.start(); }

  reset(newDuration) {
    this.pause();
    this.remaining = newDuration || this.duration;
    this.onTick?.(this.remaining);
  }

  stop() {
    this.pause();
    this.remaining = 0;
  }

  getRemaining() { return this.remaining; }
  isRunning() { return this.running; }
  isWarning() { return this.remaining > 0 && this.remaining <= 60; }
}
