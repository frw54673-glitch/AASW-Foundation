// Design reminder: Human-first Civic Editorial — the volunteer route mirrors the membership journey with the same warm, legible form language.
import { HandHeart, Users2 } from "lucide-react";
import { InnerPageShell, InnerSection } from "@/components/InnerPageShell";
import { VolunteerApplicationForm } from "@/components/VolunteerApplicationForm";

const VOLUNTEER_PATHS = [
  { label: "Field events", copy: "Support on-ground camps, workshops and community gatherings with logistics, coordination and documentation help." },
  { label: "Training support", copy: "Assist digital-skills and green-entrepreneurship sessions as a co-facilitator, translator or practice guide." },
  { label: "Community outreach", copy: "Help connect more women to AASW programmes through local networks, awareness drives and follow-up conversations." },
];

export function VolunteerPage() {
  return (
    <InnerPageShell activePath="/volunteer" chapter="10 / VOLUNTEER" eyebrow="Volunteer with us" title={<>Volunteer<br /><em>with AASW.</em></>} intro="Volunteers make AASW field work possible. Share your skills and availability, and the Foundation will match review decisions with real opportunities." heroImage="/manus-storage/aasw-community-gathering_31224a60.jpg" heroAlt="AASW community gathering from the supplied source archive">
      <InnerSection className="volunteer-paths-section">
        <div className="chapter-card-grid">
          {VOLUNTEER_PATHS.map((path, index) => (
            <article key={path.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p className="section-kicker"><HandHeart size={15} />Where help lands</p>
              <h2>{path.label}</h2>
              <p>{path.copy}</p>
            </article>
          ))}
        </div>
      </InnerSection>
      <InnerSection className="volunteer-form-section">
        <div className="chapter-statement">
          <span className="section-kicker"><Users2 size={15} />Apply to volunteer</span>
          <blockquote>“Stronger communities are built by people who show up.”</blockquote>
        </div>
        <VolunteerApplicationForm />
      </InnerSection>
    </InnerPageShell>
  );
}

export default VolunteerPage;
