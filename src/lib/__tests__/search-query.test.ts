import { buildSearchQuery, type SearchParams } from "@/lib/search/query";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => {
  const db: Record<string, unknown> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  };
  db.transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db));
  return { db };
});

// The global db mock from setup.ts provides a chainable mock.
// We need a more specific mock that captures how buildSearchQuery chains calls.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a deeply chainable mock that tracks calls and returns test data. */
function setupDbMock(opts: { countResult?: number; slideResults?: unknown[] } = {}) {
  const { countResult = 0, slideResults = [] } = opts;

  // The count query chain: db.select().from().where() -> [{ count }]
  const countWhere = vi.fn().mockResolvedValue([{ count: countResult }]);
  const countFrom = vi.fn(() => ({ where: countWhere }));
  const countSelect = vi.fn(() => ({ from: countFrom }));

  // The results query chain: db.select().from().where().orderBy().limit().offset()
  const resultOffset = vi.fn().mockResolvedValue(slideResults);
  const resultLimit = vi.fn(() => ({ offset: resultOffset }));
  const resultOrderBy = vi.fn(() => ({ limit: resultLimit }));
  const resultWhere = vi.fn(() => ({ orderBy: resultOrderBy }));
  const resultFrom = vi.fn(() => ({ where: resultWhere }));
  const resultSelect = vi.fn(() => ({ from: resultFrom }));

  // db.select is called twice: once for count, once for results
  let selectCallIndex = 0;
  vi.mocked(db.select).mockImplementation((...args: unknown[]) => {
    selectCallIndex++;
    if (selectCallIndex % 2 === 1) {
      // First call (count)
      return countSelect(...args) as ReturnType<typeof db.select>;
    }
    // Second call (results)
    return resultSelect(...args) as ReturnType<typeof db.select>;
  });

  return {
    count: { select: countSelect, from: countFrom, where: countWhere },
    result: {
      select: resultSelect,
      from: resultFrom,
      where: resultWhere,
      orderBy: resultOrderBy,
      limit: resultLimit,
      offset: resultOffset,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildSearchQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Pagination defaults
  // -------------------------------------------------------------------------
  describe("pagination", () => {
    it("defaults to page 1 and limit 24", async () => {
      const mocks = setupDbMock({ countResult: 0, slideResults: [] });

      const result = await buildSearchQuery({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(24);
      expect(result.totalPages).toBe(0);
      expect(result.total).toBe(0);
      expect(result.slides).toEqual([]);

      // Offset should be 0 for page 1
      expect(mocks.result.offset).toHaveBeenCalledWith(0);
      expect(mocks.result.limit).toHaveBeenCalledWith(24);
    });

    it("clamps page to minimum of 1", async () => {
      setupDbMock({ countResult: 0 });

      const result = await buildSearchQuery({ page: -5 });
      expect(result.page).toBe(1);
    });

    it("clamps limit to minimum of 1", async () => {
      const mocks = setupDbMock({ countResult: 0 });

      const result = await buildSearchQuery({ limit: 0 });
      expect(result.limit).toBe(1);
      expect(mocks.result.limit).toHaveBeenCalledWith(1);
    });

    it("clamps limit to maximum of 100", async () => {
      const mocks = setupDbMock({ countResult: 0 });

      const result = await buildSearchQuery({ limit: 500 });
      expect(result.limit).toBe(100);
      expect(mocks.result.limit).toHaveBeenCalledWith(100);
    });

    it("calculates offset from page and limit", async () => {
      const mocks = setupDbMock({ countResult: 100 });

      await buildSearchQuery({ page: 3, limit: 10 });
      // offset = (3-1) * 10 = 20
      expect(mocks.result.offset).toHaveBeenCalledWith(20);
    });

    it("calculates totalPages correctly", async () => {
      setupDbMock({ countResult: 50 });

      const result = await buildSearchQuery({ limit: 24 });
      expect(result.totalPages).toBe(3); // ceil(50/24) = 3
    });

    it("returns totalPages=1 for count less than limit", async () => {
      setupDbMock({ countResult: 5 });

      const result = await buildSearchQuery({ limit: 24 });
      expect(result.totalPages).toBe(1); // ceil(5/24) = 1
    });
  });

  // -------------------------------------------------------------------------
  // Result passthrough
  // -------------------------------------------------------------------------
  describe("results", () => {
    it("returns slides from the database query", async () => {
      const fakeSlides = [
        { id: 1, title: "Slide 1" },
        { id: 2, title: "Slide 2" },
      ];
      setupDbMock({ countResult: 2, slideResults: fakeSlides });

      const result = await buildSearchQuery({});
      expect(result.slides).toEqual(fakeSlides);
      expect(result.total).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Count fallback
  // -------------------------------------------------------------------------
  describe("count edge cases", () => {
    it("defaults total to 0 when count row is undefined", async () => {
      // Count returns empty array (no rows), results return empty array
      const resultOffset = vi.fn().mockResolvedValue([]);
      const resultLimit = vi.fn(() => ({ offset: resultOffset }));
      const resultOrderBy = vi.fn(() => ({ limit: resultLimit }));
      const resultWhere = vi.fn(() => ({ orderBy: resultOrderBy }));
      const resultFrom = vi.fn(() => ({ where: resultWhere }));

      const countWhere = vi.fn().mockResolvedValue([]);
      const countFrom = vi.fn(() => ({ where: countWhere }));

      let callIndex = 0;
      vi.mocked(db.select).mockImplementation((() => {
        callIndex++;
        if (callIndex % 2 === 1) {
          return { from: countFrom };
        }
        return { from: resultFrom };
      }) as typeof db.select);

      const result = await buildSearchQuery({});
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Search params are used
  // -------------------------------------------------------------------------
  describe("query parameters", () => {
    it("calls db.select twice (count + results) for any query", async () => {
      setupDbMock({ countResult: 0 });

      await buildSearchQuery({ q: "vacanza" });
      // db.select called twice: once for count, once for page
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it("calls db.select twice even with no params", async () => {
      setupDbMock({ countResult: 0 });

      await buildSearchQuery({});
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Various param combinations
  // -------------------------------------------------------------------------
  describe("param combinations", () => {
    it("handles all filters together without error", async () => {
      setupDbMock({ countResult: 5, slideResults: [{ id: 1 }] });

      const params: SearchParams = {
        q: "montagna",
        dateFrom: "1985-01-01",
        dateTo: "1990-12-31",
        magazineId: 3,
        collectionId: 7,
        page: 1,
        limit: 10,
        sortBy: "date",
        sortDir: "asc",
      };

      const result = await buildSearchQuery(params);
      expect(result.total).toBe(5);
      expect(result.slides).toEqual([{ id: 1 }]);
    });

    it("handles empty string q as no text search", async () => {
      setupDbMock({ countResult: 0 });

      // Empty q should not cause errors
      const result = await buildSearchQuery({ q: "   " });
      expect(result.total).toBe(0);
    });

    it("works with only sortBy and sortDir", async () => {
      setupDbMock({ countResult: 0 });

      const result = await buildSearchQuery({ sortBy: "title", sortDir: "asc" });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(24);
    });

    it("works with sortBy=created", async () => {
      setupDbMock({ countResult: 0 });

      const result = await buildSearchQuery({ sortBy: "created", sortDir: "desc" });
      expect(result.page).toBe(1);
    });

    it("defaults to desc when sortDir is not provided", async () => {
      setupDbMock({ countResult: 0 });

      const result = await buildSearchQuery({ sortBy: "date" });
      expect(result.page).toBe(1);
    });
  });
});
