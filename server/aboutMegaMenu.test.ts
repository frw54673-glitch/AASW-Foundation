import { describe, expect, it } from "vitest";
import { ABOUT_MENU_GROUPS } from "../shared/aboutMenu";
import { DIRECT_HOME_PRIMARY_NAV_ITEMS, HOME_PRIMARY_NAV_ITEMS, INNER_PRIMARY_NAV_ITEMS } from "../shared/primaryNavigation";
import { CONTACT_US_MENU, MEDIA_CENTRE_MENU, WHAT_WE_DO_MENU } from "../client/src/components/AboutMegaMenu";

describe("About mega-menu configuration", () => {
  it("exposes institutional sections and current application routes", () => {
    expect(ABOUT_MENU_GROUPS.map((group) => group.label)).toEqual(["Who we are"]);
    expect(ABOUT_MENU_GROUPS.map((group) => group.href)).toEqual(["/who-we-are"]);
    expect(ABOUT_MENU_GROUPS.flatMap((group) => group.links.map((link) => link.href))).toEqual(["/about", "/vision-mission", "/team", "/governance"]);
  });

  it("places Media Centre and Contact Us before Membership while keeping About institutional-only", () => {
    expect(HOME_PRIMARY_NAV_ITEMS).toEqual([{ label: "Media Centre", href: "/media-centre" }, { label: "Contact Us", href: "/contact-us" }, { label: "Membership", href: "/membership" }, { label: "Donate", href: "/donate" }]);
    expect(INNER_PRIMARY_NAV_ITEMS).toEqual([{ label: "Home", href: "/" }, ...DIRECT_HOME_PRIMARY_NAV_ITEMS]);
    expect(ABOUT_MENU_GROUPS.flatMap((group) => group.links.map((link) => link.label))).not.toEqual(expect.arrayContaining(["Programmes", "Digital skill development", "Green entrepreneurship", "Mentorship & community", "Impact reports", "Updates", "Impact", "Transparency"]));
  });

  it("exposes the What We Do dropdown route through its own overview menu", () => {
    expect(WHAT_WE_DO_MENU.label).toBe("What we do");
    expect(WHAT_WE_DO_MENU.overviewHref).toBe("/what-we-do");
    expect(WHAT_WE_DO_MENU.groups.flatMap((group) => group.links.map((link) => link.href))).toEqual(["/programs", "/digital-skills", "/green-entrepreneurship", "/mentorship-community"]);
  });

  it("keeps the removed Transparency section’s destinations reachable through Media Centre and About", () => {
    const menuHrefs = [MEDIA_CENTRE_MENU.groups, CONTACT_US_MENU.groups, WHAT_WE_DO_MENU.groups].flatMap((groups) => groups.flatMap((group) => group.links.map((link) => link.href)));
    expect(menuHrefs).toEqual(expect.arrayContaining(["/stories", "/reports", "/updates", "/field-gallery"]));
    expect(ABOUT_MENU_GROUPS.flatMap((group) => group.links.map((link) => link.href))).toEqual(expect.arrayContaining(["/governance"]));
    expect(MEDIA_CENTRE_MENU.activePaths).toEqual(expect.arrayContaining(["/stories", "/reports", "/updates"]));
  });

  it("exposes Media Centre and Contact Us through dedicated dropdown menus", () => {
    expect(MEDIA_CENTRE_MENU.overviewHref).toBe("/media-centre");
    expect(MEDIA_CENTRE_MENU.groups.flatMap((group) => group.links.map((link) => link.href))).toEqual(["/updates", "/stories", "/field-gallery", "/reports", "mailto:aaswfoundation06@gmail.com?subject=Media%20enquiry%20for%20AASW%20Foundation"]);
    expect(CONTACT_US_MENU.overviewHref).toBe("/contact-us");
    expect(CONTACT_US_MENU.groups.flatMap((group) => group.links.map((link) => link.href))).toEqual(["mailto:aaswfoundation06@gmail.com", "tel:+919984156418", "/contact-us", "/membership", "/volunteer", "/faq"]);
  });

  it("keeps every navigation item labelled and routable", () => {
    for (const link of ABOUT_MENU_GROUPS.flatMap((group) => group.links)) {
      expect(link.label.trim().length).toBeGreaterThan(0);
      expect(link.href).toMatch(/^\//);
    }
  });
});
