import type { Request, Response } from "express";
import { HttpError } from "@shared/_core/errors";
import { claimPostGraceRenewalFollowUpCandidates, claimSevenDayExpiryReminderCandidates, getMembershipReminderAutomationByTaskUid, markMembershipExpiryReminder, recordMembershipReminderAutomationRun } from "../db";
import { dispatchMemberExpiryReminderEmail, dispatchMemberPostGraceFollowUpEmail } from "../email/memberActivation";
import { sdk } from "../_core/sdk";

function memberPortalUrl(req: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return `${configured.replace(/\/$/, "")}/member/dashboard`;
  const host = req.get("host");
  return `${req.protocol === "http" ? "http" : "https"}://${host}/member/dashboard`;
}

/** Separate daily, idempotent, platform-authenticated seven-day reminder callback. */
export async function handleMembershipReminderSchedule(req: Request, res: Response) {
  let taskUid = "unavailable";
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const config = await getMembershipReminderAutomationByTaskUid(taskUid);
    if (!config) return res.json({ ok: true, skipped: "orphan" });

    const sevenDayCandidates = await claimSevenDayExpiryReminderCandidates();
    const postGraceCandidates = await claimPostGraceRenewalFollowUpCandidates();
    const candidates = [...sevenDayCandidates, ...postGraceCandidates];
    let sentCount = 0;
    let failedCount = 0;
    for (const candidate of candidates) {
      const delivery = candidate.reminderType === "post_grace"
        ? await dispatchMemberPostGraceFollowUpEmail({ ...candidate, portalUrl: memberPortalUrl(req) })
        : await dispatchMemberExpiryReminderEmail({ ...candidate, portalUrl: memberPortalUrl(req) });
      if (delivery === "sent" || delivery === "mocked") {
        await markMembershipExpiryReminder(candidate.reminderId, { status: "sent" });
        sentCount += 1;
      } else {
        await markMembershipExpiryReminder(candidate.reminderId, { status: "failed", error: delivery.error });
        failedCount += 1;
      }
    }
    await recordMembershipReminderAutomationRun(taskUid, { eligibleCount: candidates.length });
    return res.json({ ok: true, eligibleCount: candidates.length, sevenDayEligibleCount: sevenDayCandidates.length, postGraceEligibleCount: postGraceCandidates.length, sentCount, failedCount });
  } catch (error) {
    // Auth failures carry their own status code; only processing errors are 500.
    if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
    const message = error instanceof Error ? error.message : "Unknown membership reminder error.";
    if (taskUid !== "unavailable") {
      try { await recordMembershipReminderAutomationRun(taskUid, { eligibleCount: 0, error: message }); } catch { /* retain original cron error */ }
    }
    console.error("[MembershipReminder] scheduled callback failed", { taskUid, error: message });
    return res.status(500).json({ error: "Membership reminder automation failed. Review the protected automation log." });
  }
}
