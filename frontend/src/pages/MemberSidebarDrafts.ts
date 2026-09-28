// Draft auto-save: survives section switches, refreshes and crashes. Keyed
// per member so two members on a shared device never see each other's drafts.
export const memberDraftKey = (memberId: string, draft: string) => `member_draft:${memberId}:${draft}`;

export function loadMemberDraft(memberId: string, draft: string): string {
  try {
    return localStorage.getItem(memberDraftKey(memberId, draft)) ?? "";
  } catch {
    return "";
  }
}

export function saveMemberDraft(memberId: string, draft: string, value: string) {
  try {
    if (value) localStorage.setItem(memberDraftKey(memberId, draft), value);
    else localStorage.removeItem(memberDraftKey(memberId, draft));
  } catch {
    // Private-mode or quota errors must never break typing.
  }
}
