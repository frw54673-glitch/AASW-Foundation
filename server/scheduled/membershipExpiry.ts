import type { Request, Response } from "express";
import { HttpError } from "@shared/_core/errors";
import { expireDueMemberships, getMembershipExpiryAutomationByTaskUid, recordMembershipExpiryAutomationRun } from "../db";
import { sdk } from "../_core/sdk";

/** Daily, idempotent, platform-authenticated membership expiry callback. */
export async function handleMembershipExpirySchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const config = await getMembershipExpiryAutomationByTaskUid(user.taskUid);
    if (!config) return res.json({ ok: true, skipped: "orphan" });
    const expiredCount = await expireDueMemberships();
    await recordMembershipExpiryAutomationRun(user.taskUid, { expiredCount });
    return res.json({ ok: true, expiredCount });
  } catch (error) {
    // Auth failures carry their own status code; only processing errors are 500.
    if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
    const message = error instanceof Error ? error.message : "Unknown membership expiry error.";
    const taskUid = "unavailable";
    try { await recordMembershipExpiryAutomationRun(taskUid, { expiredCount: 0, error: message }); } catch { /* no trusted task UID is available during failure */ }
    console.error("[MembershipExpiry] scheduled callback failed", { taskUid, error: message });
    return res.status(500).json({ error: "Membership expiry automation failed. Review the protected automation log." });
  }
}
