import { describe, expect, it } from "vitest";
import { ABOUT_MENU_GROUPS } from "./AboutMegaMenu";

describe("About mega-menu source routes", () => {
  it("provides the expected institutional navigation groups", () => {
    expect(ABOUT_MENU_GROUPS.map((group) => group.label)).toEqual(["Who we are"]);
    expect(ABOUT_MENU_GROUPS.flatMap((group) => group.links.map((link) => link.href))).toEqual(expect.arrayContaining(["/about", "/team", "/governance"]));
  });
});
