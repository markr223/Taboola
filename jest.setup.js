class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }

  observe(element) {
    this.callback([], this);
  }

  unobserve(element) {}

  disconnect() {}
}

global.IntersectionObserver = IntersectionObserver;
window.IntersectionObserver = IntersectionObserver;
