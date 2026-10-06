import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getCompletionProofByRef, getMembershipApplicationProofKey, listMemberDocumentRecords } from "../db";
import { storageGetLocalUpload, storageGetSignedUrl } from "../storage";

/** Resolve a stored document key into a viewable URL. Signed URLs are minted
 * in production; local development has no Forge credentials and inlines the
 * stored upload as a data URL instead. */
async function documentViewUrl(storageKey: string) {
  try {
    return { url: await storageGetSignedUrl(storageKey) };
  } catch (error) {
    // Local dev has no Forge credentials, so signed URLs cannot be minted.
    // Inline the locally stored upload instead; production always signs.
    if (process.env.NODE_ENV === "production") throw error;
    const local = storageGetLocalUpload(storageKey);
    return { url: `data:${local.mimeType};base64,${local.data.toString("base64")}` };
  }
}

export const documentsRouter = router({
  list: adminProcedure.query(async () => listMemberDocumentRecords()),
  view: adminProcedure.input(z.object({ kind: z.enum(["membership_proof", "completion_proof"]), ref: z.string().trim().min(6).max(40) })).mutation(async ({ input }) => {
    // The storage key is always resolved from the database by reference —
    // client-supplied keys are never trusted for document reads.
    if (input.kind === "membership_proof") {
      const storageKey = await getMembershipApplicationProofKey(input.ref);
      if (!storageKey) throw new TRPCError({ code: "NOT_FOUND", message: "This application has no ID-proof document." });
      const { url } = await documentViewUrl(storageKey);
      return { url };
    }
    const proof = await getCompletionProofByRef(input.ref);
    if (!proof) throw new TRPCError({ code: "NOT_FOUND", message: "This completion report has no attached proof." });
    if (!proof.storageKey.startsWith("member-completions/")) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid proof key." });
    const { url } = await documentViewUrl(proof.storageKey);
    return { url };
  }),
});
