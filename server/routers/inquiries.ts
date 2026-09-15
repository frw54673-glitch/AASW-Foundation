import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createContactInquiry, markContactInquiryNotification, subscribeNewsletterEmail } from "../db";
import { dispatchInquiryNotification, INQUIRY_TOPICS } from "../email/inquiryNotification";
import { publicProcedure, router } from "../_core/trpc";

export const contactInquiryInput = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(255),
  email: z.string().trim().email("Please enter a valid email address.").max(320),
  phone: z.string().trim().min(8, "Please enter a valid phone number.").max(32).regex(/^[0-9+()\-\s]+$/, "Please use a valid phone number."),
  topic: z.enum(INQUIRY_TOPICS),
  message: z.string().trim().min(15, "Please share a little more detail so the Foundation can help.").max(2000),
  privacyConsent: z.literal(true, { error: "Please confirm that AASW may use these details to respond to your inquiry." }),
  website: z.string().max(0).optional(),
});

function createInquiryRef() {
  return `AASW-INQ-${nanoid(12).toUpperCase()}`;
}

export const inquiryRouter = router({
  submit: publicProcedure.input(contactInquiryInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Unable to submit this inquiry." });
    const inquiryRef = createInquiryRef();
    await createContactInquiry({ inquiryRef, fullName: input.fullName, email: input.email, phone: input.phone, topic: input.topic, message: input.message, status: "submitted", notificationStatus: "pending" });
    const notification = await dispatchInquiryNotification({ inquiryRef, fullName: input.fullName, email: input.email, phone: input.phone, topic: input.topic, message: input.message });
    if (notification === "sent") await markContactInquiryNotification(inquiryRef, "sent");
    else await markContactInquiryNotification(inquiryRef, "failed", notification.error);
    return { inquiryRef, status: "submitted" as const, notificationStatus: notification === "sent" ? "sent" as const : "failed" as const };
  }),
});

const newsletterSubscribeInput = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(320),
  source: z.enum(["footer", "updates_page"]).default("footer"),
  website: z.string().max(0).optional(),
});

export const newsletterRouter = router({
  subscribe: publicProcedure.input(newsletterSubscribeInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Unable to process this subscription." });
    const email = input.email.toLowerCase();
    const result = await subscribeNewsletterEmail({ email, source: input.source });
    return { email, status: "subscribed" as const, alreadySubscribed: !result.created };
  }),
});
