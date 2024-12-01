import {
  type AiScriptValue,
  assertArrayOf,
  assertNumber,
} from "../internal/types";

export const stdMath = (): Record<string, AiScriptValue> => ({
  "Math:Infinity": Number.POSITIVE_INFINITY,
  "Math:E": Math.E,
  "Math:LN2": Math.LN2,
  "Math:LN10": Math.LN10,
  "Math:LOG2E": Math.LOG2E,
  "Math:LOG10E": Math.LOG10E,
  "Math:PI": Math.PI,
  "Math:SQRT1_2": Math.SQRT1_2,
  "Math:SQRT2": Math.SQRT2,
  "Math:abs"(value) {
    assertNumber(value);
    return Math.abs(value);
  },
  "Math:acos"(value) {
    assertNumber(value);
    return Math.acos(value);
  },
  "Math:acosh"(value) {
    assertNumber(value);
    return Math.acosh(value);
  },
  "Math:asin"(value) {
    assertNumber(value);
    return Math.asin(value);
  },
  "Math:asinh"(value) {
    assertNumber(value);
    return Math.asinh(value);
  },
  "Math:atan"(value) {
    assertNumber(value);
    return Math.atan(value);
  },
  "Math:atanh"(value) {
    assertNumber(value);
    return Math.atanh(value);
  },
  "Math:atan2"(y, x) {
    assertNumber(y);
    assertNumber(x);
    return Math.atan2(y, x);
  },
  "Math:cbrt"(value) {
    assertNumber(value);
    return Math.cbrt(value);
  },
  "Math:ceil"(value) {
    assertNumber(value);
    return Math.ceil(value);
  },
  "Math:clz32"(value) {
    assertNumber(value);
    return Math.clz32(value);
  },
  "Math:cos"(value) {
    assertNumber(value);
    return Math.cos(value);
  },
  "Math:cosh"(value) {
    assertNumber(value);
    return Math.cosh(value);
  },
  "Math:exp"(value) {
    assertNumber(value);
    return Math.exp(value);
  },
  "Math:expm1"(value) {
    assertNumber(value);
    return Math.expm1(value);
  },
  "Math:floor"(value) {
    assertNumber(value);
    return Math.floor(value);
  },
  "Math:fround"(value) {
    assertNumber(value);
    return Math.fround(value);
  },
  "Math:hypot"(vs) {
    assertArrayOf(vs, assertNumber);
    return Math.hypot(...vs);
  },
  "Math:imul"(x, y) {
    assertNumber(x);
    assertNumber(y);
    return Math.imul(x, y);
  },
  "Math:log"(value) {
    assertNumber(value);
    return Math.log(value);
  },
  "Math:log1p"(value) {
    assertNumber(value);
    return Math.log1p(value);
  },
  "Math:log10"(value) {
    assertNumber(value);
    return Math.log10(value);
  },
  "Math:log2"(value) {
    assertNumber(value);
    return Math.log2(value);
  },
  "Math:max"(a, b) {
    assertNumber(a);
    assertNumber(b);
    return Math.max(a, b);
  },
  "Math:min"(a, b) {
    assertNumber(a);
    assertNumber(b);
    return Math.min(a, b);
  },
  "Math:pow"(x, y) {
    assertNumber(x);
    assertNumber(y);
    // biome-ignore lint/style/useExponentiationOperator:
    return Math.pow(x, y);
  },
  "Math:round"(value) {
    assertNumber(value);
    return Math.round(value);
  },
  "Math:sign"(value) {
    assertNumber(value);
    return Math.sign(value);
  },
  "Math:sin"(value) {
    assertNumber(value);
    return Math.sin(value);
  },
  "Math:sinh"(value) {
    assertNumber(value);
    return Math.sinh(value);
  },
  "Math:sqrt"(value) {
    assertNumber(value);
    return Math.sqrt(value);
  },
  "Math:tan"(value) {
    assertNumber(value);
    return Math.tan(value);
  },
  "Math:tanh"(value) {
    assertNumber(value);
    return Math.tanh(value);
  },
  "Math:trunc"(value) {
    assertNumber(value);
    return Math.trunc(value);
  },
});
