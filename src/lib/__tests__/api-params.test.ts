import { parseIdParam } from "@/lib/api/params";

describe("parseIdParam", () => {
  it("returns ok with the numeric id for a valid numeric string", () => {
    const result = parseIdParam("42");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.id).toBe(42);
  });

  it("rejects undefined", async () => {
    const result = parseIdParam(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body).toMatchObject({ success: false });
    }
  });

  it("rejects non-numeric strings", () => {
    const result = parseIdParam("abc");
    expect(result.ok).toBe(false);
  });

  it("rejects zero and negative numbers (must be positive)", () => {
    expect(parseIdParam("0").ok).toBe(false);
    expect(parseIdParam("-5").ok).toBe(false);
  });

  it("rejects non-integer numbers", () => {
    expect(parseIdParam("3.14").ok).toBe(false);
  });
});
