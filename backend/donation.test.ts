import { beforeEach, describe, expect, it, vi } from "vitest";

const { createDonationIntent, markDonationIntentNotification, encryptSensitiveValue, dispatchDonationNotification } = vi.hoisted(() => ({ createDonationIntent: vi.fn(), markDonationIntentNotification: vi.fn(), encryptSensitiveValue: vi.fn(), dispatchDonationNotification: vi.fn() }));
vi.mock("./db", () => ({ createDonationIntent, markDonationIntentNotification }));
vi.mock("./security/sensitive", () => ({ encryptSensitiveValue }));
vi.mock("./email/donationNotification", () => ({ dispatchDonationNotification }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() { return appRouter.createCaller({ user: null, req: {}, res: {} } as TrpcContext); }
const validDonation = { fullName: "Aarti Sharma", email: "aarti@example.com", phone: "+91 99887 76655", dob: "1994-05-21", panNumber: "ABCDE1234F", state: "Uttar Pradesh", city: "Lucknow", address: "12 Community Lane, Lucknow", pincode: "226001", amount: 4000, privacyConsent: true as const };

describe("donation.submitDetails", () => {
  beforeEach(() => { vi.resetAllMocks(); createDonationIntent.mockResolvedValue(undefined); encryptSensitiveValue.mockReturnValue("encrypted-pan"); dispatchDonationNotification.mockResolvedValue("sent"); markDonationIntentNotification.mockResolvedValue(undefined); });
  it("stores encrypted donation details and sends a Foundation alert without exposing PAN", async () => {
    const result = await caller().donation.submitDetails(validDonation);
    expect(result).toMatchObject({ status: "details_submitted", notificationStatus: "sent" });
    expect(result.donationRef).toMatch(/^AASW-DON-[A-Z0-9_-]{12}$/);
    expect(encryptSensitiveValue).toHaveBeenCalledWith("ABCDE1234F");
    expect(createDonationIntent).toHaveBeenCalledWith(expect.objectContaining({ donationRef: result.donationRef, panEncrypted: "encrypted-pan", panLastFour: "234F", amount: 4000, notificationStatus: "pending" }));
    expect(dispatchDonationNotification).toHaveBeenCalledWith(expect.not.objectContaining({ panNumber: expect.anything(), address: expect.anything(), dob: expect.anything() }));
    expect(markDonationIntentNotification).toHaveBeenCalledWith(result.donationRef, "sent");
  });
  it("rejects malformed PAN, future dates, invalid amounts and missing consent before persistence", async () => {
    await expect(caller().donation.submitDetails({ ...validDonation, panNumber: "invalid", privacyConsent: false as true })).rejects.toBeDefined();
    await expect(caller().donation.submitDetails({ ...validDonation, dob: "2999-01-01" })).rejects.toThrow("future");
    await expect(caller().donation.submitDetails({ ...validDonation, amount: 0 })).rejects.toBeDefined();
    expect(createDonationIntent).not.toHaveBeenCalled();
  });
});
