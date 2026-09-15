import { describe, expect, it } from "vitest";
import { CURATED_FIELD_GALLERY } from "../shared/fieldGallery";

describe("field gallery source record", () => {
  it("contains only the five approved managed AASW field-photo assets", () => {
    expect(CURATED_FIELD_GALLERY).toHaveLength(5);
    for (const item of CURATED_FIELD_GALLERY) {
      expect(item.imageUrl).toMatch(/^\/manus-storage\/aasw-/);
      expect(item.alt).toMatch(/AASW|Women/i);
      expect(item.title.length).toBeGreaterThan(5);
    }
  });
});
