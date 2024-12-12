import { describe, expect, test } from "vitest";
import { transform } from ".";
import { Scope } from "./scope";

const t = (source: string, globals: readonly string[] = []) => {
  const scope = Scope.createRoot();

  for (const global of globals) {
    scope.define(global, { mutable: true });
  }

  return transform(source, scope);
};

describe("literals", () => {
  test.for([
    ["null", "null"],
    ["boolean", "true; false"],
    ["number", "0; 6.28; 1024"],
    ["string", '"hoge"'],
    ["tmpl", "`Hello {name}!`", ["name"]],
    ["array", "[0, 1, 2, 3]"],
    ["object", "{ a: 0, b: 1 }"],
  ] as const)("%s", ([_, code, globals], { expect }) => {
    expect(t(code, globals)).toMatchSnapshot();
  });
});

describe("variables", () => {
  test("reference", () => {
    expect(t("hoge", ["hoge"])).toMatchSnapshot();
  });
  test("undefined", () => {
    expect(t("hoge")).toMatchSnapshot();
  });
  test("var", () => {
    expect(t("var hoge = 0; hoge")).toMatchSnapshot();
  });
  test("let", () => {
    expect(t("let hoge = 0; hoge")).toMatchSnapshot();
  });
  test("let dest", () => {
    const source = `
      let { values: [hoge, fuga] } = a
      hoge
      fuga
    `;
    expect(t(source, ["a"])).toMatchSnapshot();
  });
});

describe("assignment", () => {
  test("identifier", () => {
    const source = `
      a = 1
      a += 2
      a -= 3
      let b = 4
      b = 5
    `;
    expect(t(source, ["a"])).toMatchSnapshot();
  });
  test("prop", () => {
    const source = `
      a.b = 1
      a.b += 2
      a.b -= 3
    `;
    expect(t(source, ["a"])).toMatchSnapshot();
  });
  test("index", () => {
    const source = `
      a[b] = 1
      a[b] += 2
      a[b] -= 3
    `;
    expect(t(source, ["a", "b"])).toMatchSnapshot();
  });
  test("dest", () => {
    const source = `
      let d = null
      [{ identifier: b, prop: b.c, index: b[c] }, d] = a
    `;
    expect(t(source, ["a", "b", "c"])).toMatchSnapshot();
  });
});

describe("accessors", () => {
  test("prop", () => {
    expect(t("target.prop", ["target"])).toMatchSnapshot();
  });
  test("index", () => {
    expect(t("target[index]", ["target", "index"])).toMatchSnapshot();
  });
});

describe("fn", () => {
  test("noop fn", () => {
    expect(t("@noop() {}")).toMatchSnapshot();
  });
  test("implicit return", () => {
    expect(t("@hoge() { 0 }")).toMatchSnapshot();
  });
  test("return", () => {
    expect(t("@hoge() { return 0 }")).toMatchSnapshot();
  });
  describe("arguments", () => {
    test("reference", () => {
      expect(t("@identify(value) { value }")).toMatchSnapshot();
    });
    test("dest", () => {
      expect(t("@hoge({ fuga: [piyo] }) { piyo }")).toMatchSnapshot();
    });
    test("default", () => {
      expect(t("@hoge(arg = 0) {}")).toMatchSnapshot();
    });
  });
  test("call", () => {
    expect(t("f()", ["f"])).toMatchSnapshot();
  });
});

describe("operators", () => {
  describe("logic", () => {
    test.for([
      ["and", "a && b.c()"],
      ["or", "a || b.c()"],
    ] as const)("%s", ([_, code], { expect }) => {
      expect(t(code, ["a", "b"])).toMatchSnapshot();
    });
  });
  describe("unary", () => {
    test.for([
      ["not", "!a"],
      ["plus", "+a"],
      ["minus", "-a"],
    ] as const)("%s", ([_, code], { expect }) => {
      expect(t(code, ["a"])).toMatchSnapshot();
    });
  });
  describe("binary", () => {
    test.for([
      ["pow", "a ^ b"],
      ["mul", "a * b"],
      ["div", "a / b"],
      ["rem", "a % b"],
      ["add", "a + b"],
      ["sub", "a - b"],
      ["lt", "a < b"],
      ["lteq", "a <= b"],
      ["gt", "a > b"],
      ["gteq", "a >= b"],
      ["eq", "a == b"],
      ["neq", "a != b"],
    ] as const)("%s", ([_, code], { expect }) => {
      expect(t(code, ["a", "b"])).toMatchSnapshot();
    });
  });
});

describe("flow", () => {
  test("eval", () => {
    const source = `
      let a = 0
      let b = eval {
        let a = 1
        a
      }
    `;
    expect(t(source)).toMatchSnapshot();
  });
  test("if", () => {
    const source = `
      if cond 1 elif cond 2 else 3
    `;
    expect(t(source, ["cond"])).toMatchSnapshot();
  });
  test.for([
    ["loop", "loop { break }"],
    ["for", "for 10 { continue }"],
    ["for-i", "for (let i, 10) { i }"],
    ["each", "each (let x, xs) { x }", ["xs"]],
  ] as const)("%s", ([_, code, globals], { expect }) => {
    expect(t(code, globals)).toMatchSnapshot();
  });
});

describe("namespace", () => {
  test("reference", () => {
    const source = `
      <: Foo:hoge
      <: Foo:Foo:hoge
      :: Foo {
        let hoge = Foo:hoge
        :: Foo {
          let hoge = 0
        }
      }
    `;
    expect(t(source, ["print"])).toMatchSnapshot();
  });
});
