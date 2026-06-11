import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({
  collectionShares: {
    collectionId: "collectionShares.collectionId",
    sharedWithUserId: "collectionShares.sharedWithUserId",
    id: "collectionShares.id",
  },
  slideCollections: {
    collectionId: "slideCollections.collectionId",
    slideId: "slideCollections.slideId",
  },
  collections: { id: "collections.id" },
}));

import { db } from "@/lib/db";
import {
  collectionIdsSharedWith,
  slideSharedWithUser,
  collectionAccess,
  collectionsSharedWith,
} from "@/lib/auth/sharing";
import type { users, collections } from "@/lib/db/schema";

type User = typeof users.$inferSelect;
type Collection = typeof collections.$inferSelect;

const asUser = (p: Partial<User>): User =>
  ({ id: 1, role: "user", active: true, ...p } as User);
const asCollection = (p: Partial<Collection>): Collection =>
  ({ id: 5, name: "A", ownerUserId: 1, ...p } as Collection);

/** Mock db.select().from().where() resolving to `rows`. */
function mockSelectWhere(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

/** Mock db.select().from().innerJoin().where().limit() resolving to `rows`. */
function mockSelectJoinLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

/** Mock db.select().from().where().limit() resolving to `rows`. */
function mockSelectWhereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

describe("collectionIdsSharedWith", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns the collection ids shared with the user", async () => {
    mockSelectWhere([{ collectionId: 3 }, { collectionId: 7 }]);
    expect(await collectionIdsSharedWith(1)).toEqual([3, 7]);
  });
  it("returns [] when nothing is shared", async () => {
    mockSelectWhere([]);
    expect(await collectionIdsSharedWith(1)).toEqual([]);
  });
});

describe("slideSharedWithUser", () => {
  beforeEach(() => vi.clearAllMocks());
  it("is true when the slide is in a shared album", async () => {
    mockSelectJoinLimit([{ collectionId: 3 }]);
    expect(await slideSharedWithUser(10, 1)).toBe(true);
  });
  it("is false otherwise", async () => {
    mockSelectJoinLimit([]);
    expect(await slideSharedWithUser(10, 1)).toBe(false);
  });
});

describe("collectionAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 'owner' for the owner without querying shares", async () => {
    const res = await collectionAccess(asUser({ id: 1 }), asCollection({ ownerUserId: 1 }));
    expect(res).toBe("owner");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns 'owner' for admins", async () => {
    const res = await collectionAccess(asUser({ id: 2, role: "admin" }), asCollection({ ownerUserId: 1 }));
    expect(res).toBe("owner");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns 'shared' when a share row exists", async () => {
    mockSelectWhereLimit([{ id: 99 }]);
    const res = await collectionAccess(asUser({ id: 2 }), asCollection({ ownerUserId: 1 }));
    expect(res).toBe("shared");
  });

  it("returns 'none' when no access", async () => {
    mockSelectWhereLimit([]);
    const res = await collectionAccess(asUser({ id: 2 }), asCollection({ ownerUserId: 1 }));
    expect(res).toBe("none");
  });
});

describe("collectionsSharedWith", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] (no second query) when nothing is shared", async () => {
    mockSelectWhere([]); // collectionIdsSharedWith → []
    expect(await collectionsSharedWith(1)).toEqual([]);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("fetches the shared collection rows", async () => {
    let call = 0;
    vi.mocked(db.select).mockImplementation(() => {
      call++;
      if (call === 1) {
        // collectionIdsSharedWith
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ collectionId: 3 }]) }) } as never;
      }
      // inArray fetch
      return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 3, name: "Shared" }]) }) } as never;
    });
    const rows = await collectionsSharedWith(1);
    expect(rows).toEqual([{ id: 3, name: "Shared" }]);
  });
});
