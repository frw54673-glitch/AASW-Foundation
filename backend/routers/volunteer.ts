import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createVolunteerApplication, getVolunteerApplicationByRef, markVolunteerApplicationNotification, markVolunteerDecisionNotification } from "../db";
import { dispatchVolunteerApplicationNotification, dispatchVolunteerDecisionEmail } from "../email/volunteerNotification";
import { publicProcedure, router } from "../_core/trpc";

const VOLUNTEER_STATUSES = ["submitted", "reviewing", "approved", "rejected", "inactive"] as const;

export const volunteerApplicationInput = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(255),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(320),
  phone: z.string().trim().min(8, "Please enter a valid phone number.").max(32).regex(/^[0-9+()\-\s]+$/, "Please use a valid phone number."),
  city: z.string().trim().min(2, "Please enter your city.").max(128),
  state: z.string().trim().min(2, "Please enter your state or region.").max(128),
  skills: z.string().trim().min(3, "Please share the skills you can contribute.").max(2000),
  availability: z.string().trim().min(3, "Please share when you are available.").max(255),
  interests: z.string().trim().min(3, "Please share where you would like to help.").max(2000),
  message: z.string().trim().max(1500).optional(),
  privacyConsent: z.literal(true, { error: "Please confirm that AASW may use these details to follow up on your application." }),
  website: z.string().max(0).optional(),
});

function createVolunteerApplicationRef() {
  return `AASW-VOL-${nanoid(12).toUpperCase()}`;
}

export const volunteerRouter = router({
  submit: publicProcedure.input(volunteerApplicationInput).mutation(async ({ input }) => {
    if (input.website) throw new TRPCError({ code: "BAD_REQUEST", message: "Unable to submit this application." });
    const applicationRef = createVolunteerApplicationRef();

    try {
      await createVolunteerApplication({
        applicationRef,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        state: input.state,
        skills: input.skills,
        availability: input.availability,
        interests: input.interests,
        message: input.message || null,
        status: "submitted",
        notificationStatus: "pending",
        decisionNotificationStatus: "pending",
      });
    } catch (error) {
      console.error("[Volunteer] Application submission failed", { applicationRef, error });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your volunteer application could not be saved. Please try again." });
    }

    const notification = await dispatchVolunteerApplicationNotification({ applicationRef, fullName: input.fullName, email: input.email, phone: input.phone, city: input.city, state: input.state, skills: input.skills, availability: input.availability, interests: input.interests });
    if (notification === "sent") await markVolunteerApplicationNotification(applicationRef, "sent");
    else await markVolunteerApplicationNotification(applicationRef, "failed", notification.error);

    return { applicationRef, status: "submitted" as const, notificationStatus: notification === "sent" ? ("sent" as const) : ("failed" as const) };
  }),

  /** Public status lookup: requires both the unguessable reference and the applicant email. */
  myStatus: publicProcedure.input(z.object({ applicationRef: z.string().trim().min(6).max(40), email: z.string().trim().toLowerCase().email().max(320) })).query(async ({ input }) => {
    const application = await getVolunteerApplicationByRef(input.applicationRef);
    if (!application || application.email !== input.email) return { found: false as const, status: null as null | (typeof VOLUNTEER_STATUSES)[number] };
    return { found: true as const, status: application.status };
  }),
});
