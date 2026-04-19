import { apiError } from "@/lib/api/errors";

describe("apiError", () => {
  it("returns a 4xx/5xx JSON response with message and success:false", async () => {
    const res = apiError(404, "Non trovato");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, message: "Non trovato" });
  });

  it("includes the optional machine-readable code when provided", async () => {
    const res = apiError(429, "Troppe richieste", "RATE_LIMITED");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      message: "Troppe richieste",
      code: "RATE_LIMITED",
    });
  });

  it("omits the code field when not provided", async () => {
    const res = apiError(500, "Errore interno");
    const body = await res.json();
    expect(body).not.toHaveProperty("code");
  });
});
