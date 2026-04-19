import { vi } from "vitest";
import { reportError, reportEvent } from "@/lib/observability/report";

function parseLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1);
  if (!call) throw new Error("no console call");
  return JSON.parse(String(call[0]));
}

describe("reportError", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it("emits a structured error payload with name/message/stack", () => {
    const err = new Error("boom");
    reportError("backup", err, { slideId: 42 });

    const line = parseLine(errSpy);
    expect(line).toMatchObject({
      level: "error",
      scope: "backup",
      message: "boom",
      fields: { slideId: 42 },
    });
    const error = line.error as { name: string; message: string; stack?: string };
    expect(error.name).toBe("Error");
    expect(error.message).toBe("boom");
    expect(typeof line.timestamp).toBe("string");
  });

  it("omits fields when they are not provided", () => {
    reportError("scope", new Error("x"));
    const line = parseLine(errSpy);
    expect(line).not.toHaveProperty("fields");
  });

  it("handles non-Error throws by stringifying them", () => {
    reportError("scope", "just a string");
    const line = parseLine(errSpy);
    expect(line.error).toEqual({
      name: "NonErrorThrown",
      message: "just a string",
    });
    expect(line.message).toBe("just a string");
  });

  it("handles thrown plain objects", () => {
    reportError("scope", { foo: "bar" });
    const line = parseLine(errSpy);
    expect(line.error).toEqual({
      name: "NonErrorThrown",
      message: "[object Object]",
    });
  });

  it("copes with an Error that has no stack", () => {
    const err = new Error("no-stack");
    err.stack = undefined;
    reportError("scope", err);
    const line = parseLine(errSpy);
    expect(line.error).toEqual({ name: "Error", message: "no-stack" });
  });
});

describe("reportEvent", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("emits an info-level event by default", () => {
    reportEvent("backup", "started", { jobId: "abc" });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const line = parseLine(infoSpy);
    expect(line).toMatchObject({
      level: "info",
      scope: "backup",
      message: "started",
      fields: { jobId: "abc" },
    });
  });

  it("routes warn-level events to console.warn", () => {
    reportEvent("scope", "msg", undefined, "warn");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const line = parseLine(warnSpy);
    expect(line.level).toBe("warn");
    expect(line).not.toHaveProperty("fields");
  });

  it("routes error-level events to console.error", () => {
    reportEvent("scope", "bad", { a: 1 }, "error");

    expect(errSpy).toHaveBeenCalledTimes(1);
    const line = parseLine(errSpy);
    expect(line.level).toBe("error");
  });

  it("omits fields when not provided", () => {
    reportEvent("scope", "msg");
    const line = parseLine(infoSpy);
    expect(line).not.toHaveProperty("fields");
  });
});
