import { beforeEach, describe, expect, it, vi } from "vitest";

const { createContactInquiry, markContactInquiryNotification, dispatchInquiryNotification } = vi.hoisted(() => ({ createContactInquiry: vi.fn(), markContactInquiryNotification: vi.fn(), dispatchInquiryNotification: vi.fn() }));

vi.mock("./db", () => ({ createContactInquiry, markContactInquiryNotification }));
vi.mock("./email/inquiryNotification", () => ({ INQUIRY_TOPICS: ["programmes", "membership", "donation", "partnership", "media", "other"], dispatchInquiryNotification }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicCaller() { return appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext); }
const validInquiry = { fullName: "Aarti Sharma", email: "aarti@example.com", phone: "+91 99887 76655", topic: "partnership" as const, message: "I would like to discuss a community partnership with the Foundation.", privacyConsent: true as const };

describe("inquiry.submit", () => {
  beforeEach(() => { vi.resetAllMocks(); createContactInquiry.mockResolvedValue(undefined); dispatchInquiryNotification.mockResolvedValue("sent"); markContactInquiryNotification.mockResolvedValue(undefined); });
  it("stores a valid public inquiry and sends a Foundation notification", async () => {
    const result = await createPublicCaller().inquiry.submit(validInquiry);
    expect(result).toMatchObject({ status: "submitted", notificationStatus: "sent" });
    expect(result.inquiryRef).toMatch(/^AASW-INQ-[A-Z0-9_-]{12}$/);
    expect(createContactInquiry).toHaveBeenCalledWith(expect.objectContaining({ inquiryRef: result.inquiryRef, topic: "partnership", notificationStatus: "pending" }));
    expect(dispatchInquiryNotification).toHaveBeenCalledWith(expect.objectContaining({ inquiryRef: result.inquiryRef, fullName: "Aarti Sharma" }));
    expect(markContactInquiryNotification).toHaveBeenCalledWith(result.inquiryRef, "sent");
  });
  it("rejects malformed contact data, an insufficient message, missing consent and a filled honeypot", async () => {
    await expect(createPublicCaller().inquiry.submit({ ...validInquiry, email: "not-an-email", message: "too short", privacyConsent: false as true })).rejects.toBeDefined();
    await expect(createPublicCaller().inquiry.submit({ ...validInquiry, website: "spam" })).rejects.toBeDefined();
    expect(createContactInquiry).not.toHaveBeenCalled();
  });
  it("records an email failure without rejecting the saved inquiry", async () => {
    dispatchInquiryNotification.mockResolvedValue({ status: "failed", error: "SMTP unavailable" });
    const result = await createPublicCaller().inquiry.submit(validInquiry);
    expect(result.notificationStatus).toBe("failed");
    expect(markContactInquiryNotification).toHaveBeenCalledWith(result.inquiryRef, "failed", "SMTP unavailable");
  });
});
