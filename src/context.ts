export class Context {
  private readonly queue: (() => void)[] = [];
  defer(f: () => void) {
    this.queue.push(f);
  }
  runDeferTask() {
    while (this.queue.length > 0) {
      this.queue.pop()!();
    }
  }
}
