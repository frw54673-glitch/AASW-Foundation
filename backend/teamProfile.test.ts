import { describe, expect, it } from "vitest";
import { AASW_ORG_SOCIAL_LINKS, UNPUBLISHED_PROFILE_NOTE } from "../shared/teamProfile";

describe("team profile social-link policy", () => {
  it("uses the three verified organisation-level social destinations", () => {
    expect(AASW_ORG_SOCIAL_LINKS).toEqual({
      linkedin: "https://www.linkedin.com/company/108100135",
      facebook: "https://www.facebook.com/share/19TMKDwzfi/",
      instagram: "https://www.instagram.com/aaswfoundation?igsh=MTBvb2sxN2pqeWkxbA==",
    });
  });

  it("keeps the unsupported individual-profile state explicit", () => {
    expect(UNPUBLISHED_PROFILE_NOTE).toContain("does not publish");
  });
});
