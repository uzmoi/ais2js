export class Context {
  private readonly queue: (() => void)[] = [];
  onGenerateEnd(f: () => void) {
    this.queue.push(f);
  }
  generateEnd() {
    while (this.queue.length > 0) {
      this.queue.pop()!();
    }
  }
}
