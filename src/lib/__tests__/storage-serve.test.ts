import { vi } from "vitest";

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
}));

// Mock node:fs
const mockCreateReadStream = vi.fn();
const mockExistsSync = vi.fn();
vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}));

import { stat } from "node:fs/promises";
import { serveFile } from "@/lib/storage/serve";

// ---------------------------------------------------------------------------
// Helper: create a mock readable stream with EventEmitter-like behavior
// ---------------------------------------------------------------------------
function createMockNodeStream(data: Buffer) {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      // Auto-emit data and end after a tick to simulate streaming
      if (event === "end") {
        queueMicrotask(() => {
          listeners["data"]?.forEach((fn) => fn(data));
          listeners["end"]?.forEach((fn) => fn());
        });
      }
      return this;
    },
    destroy: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// serveFile
// ---------------------------------------------------------------------------
describe("serveFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const response = await serveFile("/data/missing.jpg");

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toBe("File non trovato");
  });

  it("returns 200 with correct headers for a JPEG file", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({
      size: 12345,
      mtime: new Date("2025-01-15T10:00:00Z"),
    } as never);
    const buf = Buffer.from("fake-jpeg-data");
    mockCreateReadStream.mockReturnValue(createMockNodeStream(buf));

    const response = await serveFile("/data/originals/2025/01/PICT0001.JPG");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Length")).toBe("12345");
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(response.headers.get("Last-Modified")).toBe(
      new Date("2025-01-15T10:00:00Z").toUTCString()
    );
  });

  it("detects MIME type for .jpg extension", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/image.jpg");
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("detects MIME type for .jpeg extension", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/image.jpeg");
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("detects MIME type for .png extension", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/image.png");
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("detects MIME type for .webp extension", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/image.webp");
    expect(response.headers.get("Content-Type")).toBe("image/webp");
  });

  it("falls back to application/octet-stream for unknown extensions", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/file.tiff");
    expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
  });

  it("handles case-insensitive extensions (uppercase .JPG)", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/PICT0001.JPG");
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 500 when stat throws an error", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockRejectedValue(new Error("Permission denied"));

    const response = await serveFile("/data/protected.jpg");

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Errore nella lettura del file");
  });

  it("sets Cache-Control max-age to 1 year (31536000 seconds)", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);
    mockCreateReadStream.mockReturnValue(createMockNodeStream(Buffer.from("")));

    const response = await serveFile("/data/image.jpg");
    const cacheControl = response.headers.get("Cache-Control")!;
    expect(cacheControl).toContain("max-age=31536000");
  });

  it("handles string chunks from the node stream", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);

    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const mockStream = {
      on(event: string, cb: (...args: unknown[]) => void) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
        if (event === "end") {
          queueMicrotask(() => {
            // Emit a string chunk instead of a Buffer
            listeners["data"]?.forEach((fn) => fn("string-data"));
            listeners["end"]?.forEach((fn) => fn());
          });
        }
        return this;
      },
      destroy: vi.fn(),
    };
    mockCreateReadStream.mockReturnValue(mockStream);

    const response = await serveFile("/data/image.jpg");
    const body = await response.arrayBuffer();
    const decoded = new TextDecoder().decode(body);
    expect(decoded).toBe("string-data");
  });

  it("propagates stream errors to the response body", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);

    const streamError = new Error("read failure");
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const mockStream = {
      on(event: string, cb: (...args: unknown[]) => void) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
        // Emit error after a tick
        if (event === "error") {
          queueMicrotask(() => {
            listeners["error"]?.forEach((fn) => fn(streamError));
          });
        }
        return this;
      },
      destroy: vi.fn(),
    };
    mockCreateReadStream.mockReturnValue(mockStream);

    const response = await serveFile("/data/image.jpg");
    expect(response.status).toBe(200);

    const reader = response.body!.getReader();
    await expect(reader.read()).rejects.toThrow("read failure");
  });

  it("destroys the node stream when the web stream is cancelled", async () => {
    mockExistsSync.mockReturnValue(true);
    vi.mocked(stat).mockResolvedValue({ size: 100, mtime: new Date() } as never);

    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const destroyFn = vi.fn();
    const mockStream = {
      on(event: string, cb: (...args: unknown[]) => void) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
        return this;
      },
      destroy: destroyFn,
    };
    mockCreateReadStream.mockReturnValue(mockStream);

    const response = await serveFile("/data/image.jpg");
    expect(response.status).toBe(200);

    // Cancel the web stream, which should trigger the cancel() callback
    await response.body!.cancel();
    expect(destroyFn).toHaveBeenCalled();
  });
});
