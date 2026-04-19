import { z } from "zod";
import { parseJsonBody } from "@/lib/api/validation";

function jsonRequest(body: string): Request {
  return new Request("http://test.local/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("parseJsonBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns typed data when JSON is valid and matches schema", async () => {
    const result = await parseJsonBody(jsonRequest('{"name":"Kim"}'), schema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ name: "Kim" });
  });

  it("returns a 400 when the body is not valid JSON", async () => {
    const result = await parseJsonBody(jsonRequest("not-json"), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body).toMatchObject({
        success: false,
        message: "Corpo della richiesta non valido.",
      });
    }
  });

  it("returns a 400 with issues[] when the body fails schema validation", async () => {
    const result = await parseJsonBody(jsonRequest('{"name":""}'), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body).toMatchObject({
        success: false,
        message: "Dati non validi.",
      });
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues[0]).toMatchObject({ path: "name" });
    }
  });

  it("rejects a body that is missing required fields", async () => {
    const result = await parseJsonBody(jsonRequest("{}"), schema);
    expect(result.ok).toBe(false);
  });
});
