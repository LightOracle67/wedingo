/**
 * transport-utils.test.ts — parseTransportDepartures: tolera JSON inválido,
 * filtra entradas malformadas, acota el número de salidas y normaliza tipos.
 */
import { describe, it, expect } from "vitest";
import { parseTransportDepartures } from "../transport-utils";

describe("parseTransportDepartures", () => {
  it("devuelve [] para entrada vacía o inválida", () => {
    expect(parseTransportDepartures(undefined)).toEqual([]);
    expect(parseTransportDepartures("")).toEqual([]);
    expect(parseTransportDepartures("no es json")).toEqual([]);
    expect(parseTransportDepartures('{"a":1}')).toEqual([]);
  });

  it("parsea salidas válidas y normaliza type/url", () => {
    const out = parseTransportDepartures(
      JSON.stringify([
        { type: "bus", time: "20:00", url: "https://maps.google.com/x" },
        { type: "taxi", time: "21:30", url: "" },
        null,
        "basura",
      ]),
    );
    expect(out).toEqual([
      { type: "bus", time: "20:00", url: "https://maps.google.com/x" },
      { type: "taxi", time: "21:30", url: "" },
    ]);
  });

  it("normaliza un tipo desconocido a 'bus' y campos no string a ''", () => {
    const out = parseTransportDepartures(JSON.stringify([{ type: "helicoptero", time: 5, url: null }]));
    expect(out).toEqual([{ type: "bus", time: "", url: "" }]);
  });

  it("acota el número de salidas a max", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ type: "bus", time: `${i}`, url: "" }));
    expect(parseTransportDepartures(JSON.stringify(many), 3)).toHaveLength(3);
  });
});
