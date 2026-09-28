import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { centralAdvisoryGallery, digitalTrainerGallery, stateCouncilMembers, teamFilterOptions, teamSectionDefinitions } from "../frontend/src/pages/InnerPages";

const teamPageSource = readFileSync(resolve(process.cwd(), "frontend/src/pages/InnerPages.tsx"), "utf8");
const teamStyles = readFileSync(resolve(process.cwd(), "frontend/src/index.css"), "utf8");

describe("official Team page roster", () => {
  it("keeps every official Central Advisory portrait mapped to a displayed member name", () => {
    expect(centralAdvisoryGallery).toHaveLength(14);
    expect(centralAdvisoryGallery.map((member) => member.name)).toEqual(["Prof. Meera K Desai", "Anand Vardhan Shukla", "Dr. Archana R. Singh", "Dr. Priya Vasist", "Dr. Mamta Tiwari", "Dr. Navneesh Tyagi", "Dr. Seema Dwivedi", "Kushal Pal Singh", "Madhuri Joshi", "Mamta Jain", "Manisha Tripathi", "Pro. M. Moni", "Anuj Kanawat", "Anupam Shahi"]);
    for (const member of centralAdvisoryGallery) expect(member.image).toMatch(/^\/manus-storage\//);
  });

  it("keeps the three official Digital Trainers and their portraits", () => {
    expect(digitalTrainerGallery.map((member) => member.name)).toEqual(["Mr. Mohit Gupta (CA)", "Dr. Nidhi Thakur", "Mr. Kharal Singh"]);
    for (const member of digitalTrainerGallery) expect(member.designation).toBe("Digital Trainer");
  });

  it("shows the official State Council as name-only records because no portraits are supplied", () => {
    expect(stateCouncilMembers).toHaveLength(17);
    expect(stateCouncilMembers).toContain("Abhilash Sharma");
    expect(stateCouncilMembers).toContain("Suresh S. Kattimane");
  });

  it("keeps the requested interactive filter categories available", () => {
    expect(teamFilterOptions.map((filter) => filter.id)).toEqual(["all", "core", "advisory", "trainers", "program", "state"]);
  });

  it("organises All People in the requested leadership, advisory and State Council hierarchy", () => {
    expect(teamSectionDefinitions.map((section) => section.title)).toEqual(["Patron, Founder & Co-Founder", "Central Advisory", "Digital Trainers", "Program Management", "State Council Members"]);
    expect(teamFilterOptions.find((filter) => filter.id === "core")?.label).toBe("Leadership");
  });

  it("uses the unchanged official Team-page portrait assets without a softening image filter", () => {
    expect(teamPageSource).toContain("officialTeamPortraits");
    expect(teamPageSource).toContain("/manus-storage/anupam_d0361120.webp");
    expect(teamPageSource).toContain("/manus-storage/aparna_54a0aec8.jpeg");
    expect(teamPageSource).toContain("/manus-storage/meera_74ce15e8.JPG");
    expect(teamPageSource).toContain("/manus-storage/trainer-2_fcbe185e.webp");
    expect(teamStyles).toContain(".team-photo img { display: block");
    expect(teamStyles).toContain("filter: none");
    expect(teamStyles).toContain(".team-photo-native-square img");
  });

  it("places the Patron’s official image in a responsive framed portrait that fills its card", () => {
    expect(teamPageSource).toContain('category === "Patron" ? "team-card-patron"');
    expect(teamPageSource).toContain('portraitMode: "native-portrait" as const');
    expect(teamStyles).toContain(".team-card-patron .team-photo-native-portrait img");
    expect(teamStyles).toContain("aspect-ratio: 133 / 184");
    expect(teamStyles).toContain("height: calc(100% - 1.4rem)");
    expect(teamStyles).toContain("background-color: #f6efe3");
  });

  it("keeps the reported leadership portraits filling the card with faces intact and supports accessible card interaction", () => {
    expect(teamPageSource).toContain('name: "Anupam Trivedi"');
    expect(teamPageSource).toContain('name: "Aparna Mishra"');
    expect(teamPageSource).toContain('portraitMode: "face-safe"');
    expect(teamStyles).toContain(".team-photo-face-safe img");
    expect(teamStyles).toContain("object-fit: cover; object-position: center top");
    expect(teamStyles).toContain(".team-card:hover, .team-card:focus-within");
    expect(teamStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses a dedicated large portrait hierarchy for leadership and a three-column people presentation on wider screens", () => {
    expect(teamPageSource).toContain("team-section-${section.id}");
    expect(teamPageSource).toContain("team-grid-${section.id}");
    expect(teamStyles).toContain(".team-grid-core { grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(teamStyles).toContain(".team-grid-advisory, .team-grid-trainers { grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(teamStyles).toContain(".team-grid-core .team-photo { height: clamp(330px, 31vw, 430px)");
  });

  it("promotes Central Advisory portraits into the same face-safe large-card presentation", () => {
    expect(teamPageSource).toContain('group: "advisory" as const, image: member.image, portraitMode: "face-safe" as const');
    expect(teamStyles).toContain(".team-grid-advisory .team-photo { height: clamp(335px, 30vw, 425px)");
    expect(teamStyles).toContain(".team-grid-advisory .team-photo-face-safe");
    expect(teamStyles).toContain(".team-grid-advisory .team-card-copy { min-height: 148px");
  });

  it("promotes Digital Trainer portraits into the same large face-safe card hierarchy", () => {
    expect(teamPageSource).toContain('group: "trainers" as const, image: member.image, portraitMode: "face-safe" as const');
    expect(teamStyles).toContain(".team-grid-trainers .team-photo { height: clamp(335px, 30vw, 425px)");
    expect(teamStyles).toContain(".team-grid-trainers .team-photo-face-safe");
    expect(teamStyles).toContain(".team-grid-trainers .team-card-copy { min-height: 148px");
  });

  it("presents the Program Manager roster in the same large face-safe card hierarchy", () => {
    expect(teamPageSource).toContain('name: "Kshama Rani", category: "Program Manager"');
    expect(teamPageSource).toContain('group: "program" as const, image: officialTeamPortraits.kshamaRani, portraitMode: "face-safe" as const');
    expect(teamStyles).toContain(".team-grid-program { grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(teamStyles).toContain(".team-grid-program .team-photo { height: clamp(335px, 30vw, 425px)");
    expect(teamStyles).toContain(".team-grid-program .team-photo-face-safe");
  });

  it("keeps face-safe portraits filling the full card width so no cropped empty band remains", () => {
    expect(teamStyles).toContain(".team-photo-face-safe { width: 100%");
  });

  it("keeps the source-portrait-unavailable State Council roster in compact, balanced responsive identity tiles", () => {
    expect(teamStyles).toContain(".team-grid-state { display:grid; grid-template-columns:repeat(4,minmax(0,1fr))");
    expect(teamStyles).toContain(".team-grid-state .team-default-avatar { min-height:168px");
    expect(teamStyles).toContain("@media (max-width:800px) { .team-grid-state { grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(teamStyles).toContain("@media (max-width:560px) { .team-grid-state { grid-template-columns:repeat(2,minmax(0,1fr))");
  });
});
