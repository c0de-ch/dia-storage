import { knowledgeBase, suggestedTopics } from "@/lib/help-bot/knowledge-base";

describe("knowledgeBase", () => {
  it("exports a non-empty array of help entries", () => {
    expect(Array.isArray(knowledgeBase)).toBe(true);
    expect(knowledgeBase.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    for (const entry of knowledgeBase) {
      expect(entry.id).toBeTruthy();
      expect(entry.question).toBeTruthy();
      expect(entry.answer).toBeTruthy();
      expect(entry.voiceAnswer).toBeTruthy();
      expect(Array.isArray(entry.keywords)).toBe(true);
      expect(entry.keywords.length).toBeGreaterThan(0);
      expect(entry.category).toBeTruthy();
    }
  });

  it("all entry IDs are unique", () => {
    const ids = knowledgeBase.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("voice answers are shorter than full answers", () => {
    for (const entry of knowledgeBase) {
      expect(entry.voiceAnswer.length).toBeLessThanOrEqual(entry.answer.length);
    }
  });

  it("covers expected categories", () => {
    const categories = new Set(knowledgeBase.map((e) => e.category));
    expect(categories.has("generale")).toBe(true);
    expect(categories.has("accesso")).toBe(true);
  });
});

describe("suggestedTopics", () => {
  it("exports a non-empty array of strings", () => {
    expect(Array.isArray(suggestedTopics)).toBe(true);
    expect(suggestedTopics.length).toBeGreaterThan(0);
    for (const topic of suggestedTopics) {
      expect(typeof topic).toBe("string");
      expect(topic.length).toBeGreaterThan(0);
    }
  });
});
