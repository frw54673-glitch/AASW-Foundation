import { MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { AASW_CONTACT } from "@shared/organisationContact";

function isProtectedWorkspace(location: string) {
  const pathname = location.split("?")[0] ?? location;
  return /^(?:\/member|\/foundation-admin|\/mis)(?:\/|$)/.test(pathname);
}

/** Public-site contact action. Internal member, MIS and admin workspaces intentionally omit it. */
export function FloatingWhatsApp() {
  const [location] = useLocation();
  if (isProtectedWorkspace(location)) return null;

  return <a className="floating-whatsapp" href={AASW_CONTACT.whatsappHref} target="_blank" rel="noreferrer" aria-label="Chat with AASW Foundation on WhatsApp"><span className="floating-whatsapp-icon"><MessageCircle size={22} strokeWidth={2.1} /></span><span className="floating-whatsapp-copy"><strong>Chat with AASW</strong><small>WhatsApp</small></span></a>;
}
