import { describe, expect, it } from "vitest";
import { createMembershipApplicationNotification } from "./membershipNotification";

describe("createMembershipApplicationNotification", () => {
  it("alerts the Foundation with operational application details without identity-document values", () => {
    const mail = createMembershipApplicationNotification({
      applicationRef: "AASW-MEM-TESTREF12",
      fullName: "Aarti Sharma",
      email: "aarti@example.com",
      phone: "+91 99887 76655",
      district: "Lucknow",
      state: "Uttar Pradesh",
      membershipType: "annual",
    });

    expect(mail.subject).toContain("AASW-MEM-TESTREF12");
    expect(mail.text).toContain("Aarti Sharma");
    expect(mail.text).toContain("Sensitive identity details and uploaded proof are not included");
    expect(mail.html).toContain("AASW-MEM-TESTREF12");
    expect(mail.html).not.toContain("ABCDE1234F");
  });

  it("escapes applicant-controlled HTML before rendering it in the email", () => {
    const mail = createMembershipApplicationNotification({ applicationRef: "AASW-MEM-TESTREF12", fullName: "<b>Applicant</b>", email: "person@example.com", phone: "+91 99887 76655", district: "<script>bad</script>", state: "Uttar Pradesh", membershipType: "annual" });
    expect(mail.html).toContain("&lt;b&gt;Applicant&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>Applicant</b>");
    expect(mail.html).toContain("&lt;script&gt;bad&lt;/script&gt;");
  });
});
