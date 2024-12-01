import type { AiScriptValue } from "../internal";
import { assertNumber, assertString, error } from "../internal/types";

export const stdDate = (): Record<string, AiScriptValue> => ({
  "Date:now": () => Date.now(),
  "Date:year"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getFullYear();
  },
  "Date:month"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getMonth() + 1;
  },
  "Date:day"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getDate();
  },
  "Date:hour"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getHours();
  },
  "Date:minute"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getMinutes();
  },
  "Date:second"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getSeconds();
  },
  "Date:millisecond"(value = Date.now()) {
    assertNumber(value);
    return new Date(value).getMilliseconds();
  },
  "Date:parse"(value) {
    assertString(value);
    const date = new Date(value).getTime();
    return Number.isNaN(date) ? error("not_date") : date;
  },
  "Date:to_iso_str"(value = Date.now(), offsetArg?) {
    assertNumber(value);
    const date = new Date(value ?? Date.now());

    if (offsetArg !== undefined) assertNumber(offsetArg);

    const offset = offsetArg ?? -date.getTimezoneOffset();
    let offsetString = "Z";
    if (offset !== 0) {
      const sign = Math.sign(offset);
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetMinutes = Math.abs(offset) % 60;
      date.setUTCHours(date.getUTCHours() + sign * offsetHours);
      date.setUTCMinutes(date.getUTCMinutes() + sign * offsetMinutes);

      const h = pad(offsetHours, 2);
      const m = pad(offsetMinutes, 2);
      offsetString = `${offset > 0 ? "+" : "-"}${h}:${m}`;
    }

    const Y = pad(date.getUTCFullYear(), 4);
    const M = pad(date.getUTCMonth() + 1, 2);
    const D = pad(date.getUTCDate(), 2);
    const h = pad(date.getUTCHours(), 2);
    const m = pad(date.getUTCMinutes(), 2);
    const s = pad(date.getUTCSeconds(), 2);
    const ms = pad(date.getUTCMilliseconds(), 3);
    return `${Y}-${M}-${D}T${h}:${m}:${s}.${ms}${offsetString}`;
  },
});

const pad = (n: number, length: number) => n.toString().padStart(length, "0");
