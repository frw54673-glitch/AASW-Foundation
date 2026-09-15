import { describe, expect, it } from "vitest";
import { createInquiryNotification } from "./inquiryNotification";

describe("inquiry notification", () => {
  it("creates a branded Foundation alert with all inquiry fields", () => {
    const notification = createInquiryNotification({ inquiryRef: "AASW-INQ-TEST123456", fullName: "Aarti Sharma", email: "aarti@example.com", phone: "+91 99887 76655", topic: "partnership", message: "I would like to discuss a community partnership." });
    expect(notification.subject).toContain("AASW-INQ-TEST123456");
    expect(notification.text).toContain("Partnership");
    expect(notification.html).toContain("AASW Foundation");
  });
  it("HTML-escapes user controlled inquiry content", () => {
    const notification = createInquiryNotification({ inquiryRef: "AASW-INQ-TEST123456", fullName: "<script>", email: "aarti@example.com", phone: "+91 99887 76655", topic: "other", message: "hello <b>there</b>" });
    expect(notification.html).toContain("&lt;script&gt;");
    expect(notification.html).not.toContain("<script>");
    expect(notification.html).toContain("hello &lt;b&gt;there&lt;/b&gt;");
  });
});
