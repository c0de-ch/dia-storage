import { vi } from "vitest";

// Mock the config loader before importing the module under test
vi.mock("@/lib/config/loader", () => ({
  getConfig: vi.fn(() => ({
    storage: { basePath: "/data" },
  })),
}));

import {
  getStorageBasePath,
  getIncomingDir,
  getIncomingFilePath,
  getOriginalPath,
  getThumbnailPath,
  getMediumPath,
} from "@/lib/storage/paths";
import { getConfig } from "@/lib/config/loader";

// ---------------------------------------------------------------------------
// getStorageBasePath
// ---------------------------------------------------------------------------
describe("getStorageBasePath", () => {
  it("returns the configured base path", () => {
    expect(getStorageBasePath()).toBe("/data");
  });

  it("reflects config changes", () => {
    vi.mocked(getConfig).mockReturnValue({
      storage: { basePath: "/mnt/slides" },
    } as ReturnType<typeof getConfig>);

    expect(getStorageBasePath()).toBe("/mnt/slides");

    // Reset
    vi.mocked(getConfig).mockReturnValue({
      storage: { basePath: "/data" },
    } as ReturnType<typeof getConfig>);
  });
});

// ---------------------------------------------------------------------------
// getIncomingDir
// ---------------------------------------------------------------------------
describe("getIncomingDir", () => {
  it("builds the correct incoming directory path", () => {
    expect(getIncomingDir("batch-abc123")).toBe("/data/incoming/batch-abc123");
  });

  it("works with UUID-style batch IDs", () => {
    expect(getIncomingDir("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "/data/incoming/550e8400-e29b-41d4-a716-446655440000"
    );
  });
});

// ---------------------------------------------------------------------------
// getIncomingFilePath
// ---------------------------------------------------------------------------
describe("getIncomingFilePath", () => {
  it("builds the correct file path within a batch", () => {
    expect(getIncomingFilePath("batch-1", "PICT0001.JPG")).toBe(
      "/data/incoming/batch-1/PICT0001.JPG"
    );
  });
});

// ---------------------------------------------------------------------------
// getOriginalPath
// ---------------------------------------------------------------------------
describe("getOriginalPath", () => {
  it("builds a path with year/month from provided date", () => {
    const date = new Date(2024, 2, 15); // March 2024 (month is 0-indexed)
    expect(getOriginalPath(42, date)).toBe("/data/originals/2024/03/slide_42.jpg");
  });

  it("zero-pads single-digit months", () => {
    const date = new Date(2023, 0, 1); // January 2023
    expect(getOriginalPath(1, date)).toBe("/data/originals/2023/01/slide_1.jpg");
  });

  it("handles December correctly (month 12)", () => {
    const date = new Date(2025, 11, 25); // December 2025
    expect(getOriginalPath(100, date)).toBe("/data/originals/2025/12/slide_100.jpg");
  });

  it("uses current date when no date is provided", () => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const result = getOriginalPath(7);
    expect(result).toBe(`/data/originals/${year}/${month}/slide_7.jpg`);
  });
});

// ---------------------------------------------------------------------------
// getThumbnailPath
// ---------------------------------------------------------------------------
describe("getThumbnailPath", () => {
  it("builds a path under the thumbnails directory", () => {
    const date = new Date(2024, 5, 10); // June 2024
    expect(getThumbnailPath(99, date)).toBe("/data/thumbnails/2024/06/slide_99.jpg");
  });

  it("uses current date when no date is provided", () => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    expect(getThumbnailPath(3)).toBe(`/data/thumbnails/${year}/${month}/slide_3.jpg`);
  });
});

// ---------------------------------------------------------------------------
// getMediumPath
// ---------------------------------------------------------------------------
describe("getMediumPath", () => {
  it("builds a path under the medium directory", () => {
    const date = new Date(2024, 9, 1); // October 2024
    expect(getMediumPath(55, date)).toBe("/data/medium/2024/10/slide_55.jpg");
  });

  it("uses current date when no date is provided", () => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    expect(getMediumPath(8)).toBe(`/data/medium/${year}/${month}/slide_8.jpg`);
  });
});

// ---------------------------------------------------------------------------
// Custom base path
// ---------------------------------------------------------------------------
describe("with custom base path", () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockReturnValue({
      storage: { basePath: "/mnt/archive" },
    } as ReturnType<typeof getConfig>);
  });

  afterEach(() => {
    vi.mocked(getConfig).mockReturnValue({
      storage: { basePath: "/data" },
    } as ReturnType<typeof getConfig>);
  });

  it("uses the custom base path for incoming", () => {
    expect(getIncomingDir("b1")).toBe("/mnt/archive/incoming/b1");
  });

  it("uses the custom base path for originals", () => {
    const date = new Date(2024, 0, 1);
    expect(getOriginalPath(1, date)).toBe("/mnt/archive/originals/2024/01/slide_1.jpg");
  });

  it("uses the custom base path for thumbnails", () => {
    const date = new Date(2024, 0, 1);
    expect(getThumbnailPath(1, date)).toBe("/mnt/archive/thumbnails/2024/01/slide_1.jpg");
  });

  it("uses the custom base path for medium", () => {
    const date = new Date(2024, 0, 1);
    expect(getMediumPath(1, date)).toBe("/mnt/archive/medium/2024/01/slide_1.jpg");
  });
});
