import { internals } from "./runtime/internal";

interface ScopeEntry {
  jsName: string;
}

export class Scope {
  static createRoot() {
    return new Scope(null, new Set(internals.keys()));
  }
  protected readonly entries = new Map<string, ScopeEntry>();
  protected constructor(
    protected readonly parent: Scope | null,
    readonly usedJsNames: Set<string>,
  ) {}
  child() {
    return new Scope(this, this.usedJsNames);
  }
  ns(name: string) {
    return new NamespaceScope(this, this.usedJsNames, name);
  }
  newId(name: string) {
    const escapedName = name.replace(/[^0-9A-Za-z]/g, "_");
    let jsName: string;
    let count = 0;
    do {
      jsName = count++ === 0 ? escapedName : escapedName + count;
    } while (this.usedJsNames.has(jsName));
    this.usedJsNames.add(jsName);
    return jsName;
  }
  define(name: string): string {
    const jsName = this.newId(name);
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

class NamespaceScope extends Scope {
  constructor(
    parent: Scope | null,
    usedJsNames: Set<string>,
    private readonly nsName: string,
  ) {
    super(parent, usedJsNames);
  }
  override define(name: string): string {
    const jsName = this.parent!.define(`${this.nsName}:${name}`, {
      mutable: true,
    });
    this.entries.set(name, { jsName, mutable: true });
    return jsName;
  }
}
