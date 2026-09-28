import { CircleUserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

function initials(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "M";
}

function isTransientFetchError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message === "Failed to fetch" || error.message.includes("received HTML instead of JSON") || error.message.includes("Unexpected token '<'");
}

const memberHeaderQueryOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  retry: (failureCount: number, error: unknown) => isTransientFetchError(error) && failureCount < 3,
  retryDelay: (attemptIndex: number) => Math.min(500 * 2 ** attemptIndex, 4_000),
};

export function MemberHeaderAccount({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const member = trpc.member.me.useQuery(undefined, memberHeaderQueryOptions);
  const destination = member.data ? "/member/dashboard" : "/member/login";
  if (mobile) return <a href={destination} className="mobile-nav-link" onClick={onNavigate}><span>{member.data ? "My member account" : "Member Login"}</span>{member.data ? <span className="member-header-initials member-header-initials-mobile" aria-label={`${member.data.fullName} member account`}>{initials(member.data.fullName)}</span> : <CircleUserRound size={17} />}</a>;
  if (!member.data) return <a className="header-member-login" href="/member/login">Member Login</a>;
  return <a className="member-header-account" href="/member/dashboard" aria-label={`Open ${member.data.fullName}'s member dashboard`}><span className="member-header-initials">{initials(member.data.fullName)}</span><span className="member-header-account-copy"><small>Member</small><strong>{member.data.fullName.split(" ")[0]}</strong></span></a>;
}
