class Counter {
  constructor() { this.count = 0; }
  increment() {
    this.count++;
    return this.count;
  }
}
const globalCounter = new Counter();
function getNextId() {
  return globalCounter.increment();
}
module.exports = { getNextId };