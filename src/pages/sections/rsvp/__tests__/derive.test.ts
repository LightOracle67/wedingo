/**
 * derive.test.ts — Funciones puras del estado derivado del RSVP (v2.191):
 * etiquetas de salida (4 ramas de departureLabel), modos de transporte
 * (both/bus/taxi/none) y derivación del estado con fechas límite/expiración.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildDepartures, buildModeOptions, departureLabel, deriveRsvpState } from "../derive";

const t = ((key: string) => key) as never;

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("buildDepartures", () => {
  it("vacío con transporte desactivado", () => {
    expect(buildDepartures({ transportEnabled: "" } as never)).toEqual([]);
    expect(buildDepartures({ transportEnabled: "none" } as never)).toEqual([]);
  });

  it("parsea las salidas cuando el transporte está activo", () => {
    const deps = buildDepartures({
      transportEnabled: "both",
      transportDepartures: JSON.stringify([{ type: "bus", time: "10:30", url: "https://maps.google.com/?q=Plaza" }]),
    } as never);
    expect(deps).toHaveLength(1);
    expect(deps[0]!.time).toBe("10:30");
  });
});

describe("buildModeOptions", () => {
  it("both ofrece bus y taxi; solo bus; solo taxi; none solo propio", () => {
    expect(buildModeOptions({ transportEnabled: "both" } as never, t).map((o) => o.value)).toEqual([
      "own",
      "bus",
      "taxi",
    ]);
    expect(buildModeOptions({ transportEnabled: "bus" } as never, t).map((o) => o.value)).toEqual(["own", "bus"]);
    expect(buildModeOptions({ transportEnabled: "taxi" } as never, t).map((o) => o.value)).toEqual(["own", "taxi"]);
    expect(buildModeOptions({ transportEnabled: "none" } as never, t).map((o) => o.value)).toEqual(["own"]);
  });

  it("etiquetas traducidas de cada opción", () => {
    const opts = buildModeOptions({ transportEnabled: "bus" } as never, t);
    expect(opts[1]!.label).toBe("rsvp.transportBusOption");
  });
});

describe("departureLabel", () => {
  const dep = { type: "bus" as const, time: "10:30", url: "https://maps.google.com/?q=Salida+Sur" };

  it("lugar + hora cuando hay ambos", () => {
    const label = departureLabel(dep, t);
    expect(label).toContain("10:30");
  });

  it("solo lugar cuando no hay hora (URL /maps/place/…)", () => {
    const depOk = { type: "bus" as const, time: "", url: "https://maps.google.com/maps/place/Salida+Sur" };
    const label = departureLabel(depOk as never, t);
    expect(label).toBe("Salida Sur");
  });

  it("URL no parseable + sin hora: fallback al tipo", () => {
    const label = departureLabel({ ...dep, time: "" } as never, t);
    expect(label).toBe("transport.typeBus");
  });

  it("hora + tipo cuando no hay lugar", () => {
    const label = departureLabel({ ...dep, url: "" } as never, t);
    expect(label).toBe("10:30 (transport.typeBus)");
  });

  it("solo tipo como fallback final", () => {
    expect(departureLabel({ type: "taxi" as const, time: "", url: "" } as never, t)).toBe("transport.typeTaxi");
  });
});

describe("deriveRsvpState", () => {
  it("bloqueado cuando config.status es blocked", () => {
    const s = deriveRsvpState({ config: { status: "blocked" } as never });
    expect(s.isBlocked).toBe(true);
  });

  it("fecha límite pasada cuando rsvpDeadline ya venció", () => {
    vi.setSystemTime(new Date("2099-01-01T12:00:00Z"));
    vi.useFakeTimers();
    const s = deriveRsvpState({
      config: { rsvpDeadlineEnabled: "true", rsvpDeadline: "2020-01-01" } as never,
    });
    expect(s.deadlinePassed).toBe(true);
    vi.useRealTimers();
  });

  it("simulación ?sim=expired activa deadlinePassed", () => {
    window.history.replaceState({}, "", "/?sim=expired");
    const s = deriveRsvpState({ config: {} as never });
    expect(s.deadlinePassed).toBe(true);
  });

  it("simulación ?sim=responded activa isAlreadySubmitted", () => {
    window.history.replaceState({}, "", "/?sim=responded");
    const s = deriveRsvpState({ config: {} as never });
    expect(s.isAlreadySubmitted).toBe(true);
  });

  it("boda pasada por expiración manual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00Z"));
    const s = deriveRsvpState({ config: { manualExpiry: "2020-01-01" } as never });
    expect(s.weddingPassed).toBe(true);
    vi.useRealTimers();
  });

  it("boda pasada por la fecha configurada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-06-15T12:00:00Z"));
    const s = deriveRsvpState({ config: { weddingYear: "2020", weddingMonth: "enero", weddingDay: "1" } as never });
    expect(s.weddingPassed).toBe(true);
    vi.useRealTimers();
  });

  it("deshabilitado si ya ha enviado o está enviando", () => {
    const s = deriveRsvpState({ config: {} as never, hasSubmitted: true });
    expect(s.isDisabled).toBe(true);
    const s2 = deriveRsvpState({ config: {} as never, isRsvpSubmitting: true });
    expect(s2.isDisabled).toBe(true);
  });
});
