import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createDonationIntent, markDonationIntentNotification } from "../db";
import { dispatchDonationNotification } from "../email/donationNotification";
import { encryptSensitiveValue } from "../security/sensitive";
import { publicProcedure, router } from "../_core/trpc";

const donationDetailsInput = z.object({
  fullName: z.string().trim().min(2).max(255), email: z.string().trim().email().max(320), phone: z.string().trim().min(8).max(32).regex(/^[0-9+()\-\s]+$/),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), panNumber: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/), state: z.string().trim().min(2).max(128), city: z.string().trim().min(2).max(128), address: z.string().trim().min(8).max(1500), pincode: z.string().regex(/^\d{6}$/), amount: z.number().int().min(10).max(10_000_000), privacyConsent: z.literal(true), website: z.string().max(0).optional(),
});

function createDonationRef() { return `AASW-DON-${nanoid(12).toUpperCase()}`; }

export const donationRouter = router({
  submitDetails: publicProcedure.input(donationDetailsInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Unable to submit donation details." });
    if (new Date(`${input.dob}T00:00:00Z`).getTime() > Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Date of birth cannot be in the future." });
    const donationRef = createDonationRef();
    await createDonationIntent({ donationRef, fullName: input.fullName, email: input.email, phone: input.phone, dob: input.dob, panEncrypted: encryptSensitiveValue(input.panNumber), panLastFour: input.panNumber.slice(-4), country: "India", state: input.state, city: input.city, address: input.address, pincode: input.pincode, amount: input.amount, status: "details_submitted", notificationStatus: "pending" });
    const notification = await dispatchDonationNotification({ donationRef, fullName: input.fullName, email: input.email, phone: input.phone, amount: input.amount, state: input.state, city: input.city });
    if (notification === "sent") await markDonationIntentNotification(donationRef, "sent"); else await markDonationIntentNotification(donationRef, "failed", notification.error);
    return { donationRef, status: "details_submitted" as const, notificationStatus: notification === "sent" ? "sent" as const : "failed" as const };
  }),
});
