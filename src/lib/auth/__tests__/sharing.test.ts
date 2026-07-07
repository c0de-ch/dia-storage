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
  galleryShares: {
    id: "galleryShares.id",
    ownerUserId: "galleryShares.ownerUserId",
    sharedWithUserId: "galleryShares.sharedWithUserId",
  },
}));

import { db } from "@/lib/db";
import {
  collectionIdsSharedWith,
  slideSharedWithUser,
  collectionAccess,
  collectionsSharedWith,
  gallerySharedWithUser,
  canViewOwnerGallery,
  canAccessSlideRecord,
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

describe("gallerySharedWithUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is false when ownerId is null, without querying", async () => {
    expect(await gallerySharedWithUser(null, 1)).toBe(false);
    expect(await gallerySharedWithUser(undefined, 1)).toBe(false);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("is true when the owner views their own gallery, without querying", async () => {
    expect(await gallerySharedWithUser(7, 7)).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("is true when a gallery-share row exists", async () => {
    mockSelectWhereLimit([{ id: 1 }]);
    expect(await gallerySharedWithUser(7, 2)).toBe(true);
  });

  it("is false when no gallery-share row exists", async () => {
    mockSelectWhereLimit([]);
    expect(await gallerySharedWithUser(7, 2)).toBe(false);
  });
});

describe("canViewOwnerGallery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is true for admins/editors without querying", async () => {
    expect(await canViewOwnerGallery(asUser({ id: 2, role: "admin" }), 7)).toBe(true);
    expect(await canViewOwnerGallery(asUser({ id: 3, role: "editor" }), 7)).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("is true when viewing your own gallery without querying", async () => {
    expect(await canViewOwnerGallery(asUser({ id: 7 }), 7)).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("consults the share table for a regular non-owner user", async () => {
    mockSelectWhereLimit([{ id: 1 }]);
    expect(await canViewOwnerGallery(asUser({ id: 2 }), 7)).toBe(true);

    vi.clearAllMocks();
    mockSelectWhereLimit([]);
    expect(await canViewOwnerGallery(asUser({ id: 2 }), 7)).toBe(false);
  });
});

describe("canAccessSlideRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is true for the uploader without querying", async () => {
    expect(
      await canAccessSlideRecord(asUser({ id: 1 }), { id: 10, uploadedBy: 1 })
    ).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("is true for admins without querying", async () => {
    expect(
      await canAccessSlideRecord(asUser({ id: 2, role: "admin" }), { id: 10, uploadedBy: 9 })
    ).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("is true when the slide owner shared their whole gallery", async () => {
    mockSelectWhereLimit([{ id: 1 }]); // gallerySharedWithUser → row
    expect(
      await canAccessSlideRecord(asUser({ id: 2 }), { id: 10, uploadedBy: 9 })
    ).toBe(true);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("falls back to album sharing when the gallery is not shared", async () => {
    let call = 0;
    vi.mocked(db.select).mockImplementation(() => {
      call++;
      if (call === 1) {
        // gallerySharedWithUser → no row
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        } as never;
      }
      // slideSharedWithUser → row
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ collectionId: 3 }]) }),
          }),
        }),
      } as never;
    });
    expect(
      await canAccessSlideRecord(asUser({ id: 2 }), { id: 10, uploadedBy: 9 })
    ).toBe(true);
    expect(call).toBe(2);
  });

  it("is false when neither the gallery nor an album is shared", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      const limit = vi.fn().mockResolvedValue([]);
      const where = vi.fn().mockReturnValue({ limit });
      return {
        from: vi.fn().mockReturnValue({ where, innerJoin: vi.fn().mockReturnValue({ where }) }),
      } as never;
    });
    expect(
      await canAccessSlideRecord(asUser({ id: 2 }), { id: 10, uploadedBy: 9 })
    ).toBe(false);
  });
});
