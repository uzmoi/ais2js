import { randId } from "./converts/utils";

interface ScopeEntry {
  jsName: string;
}

export class Scope {
  private readonly entries = new Map<string, ScopeEntry>();
  constructor(readonly parent: Scope | null) {}
  child() {
    return new Scope(this);
  }
  define(name: string): string {
    const jsName = `${name}_${randId()}`;
    this.entries.set(name, { jsName });
    return jsName;
  }
  ref(name: string): string | undefined {
    const entry = this.entries.get(name);
    if (entry != null) {
      return entry.jsName;
    }

    return this.parent?.ref(name);
  }
}
