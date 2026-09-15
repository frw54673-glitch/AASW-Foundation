import { ArrowUpRight, Home, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="aasw-not-found">
      <a className="skip-link" href="#not-found-content">Skip to content</a>
      <main id="not-found-content" className="aasw-not-found-main">
        <div className="aasw-not-found-card">
          <div className="aasw-not-found-mark" aria-hidden="true"><span className="sun-disc" /></div>
          <a href="/" className="brand-lockup aasw-not-found-brand">
            <span className="brand-mark-wrap"><img src="/manus-storage/aasw-foundation-official-logo_41a4007d.png" alt="AASW Foundation official logo" className="brand-mark" /></span>
            <span className="brand-copy"><strong>AASW</strong><span>Foundation</span></span>
          </a>
          <p className="eyebrow"><span className="eyebrow-dot" />Page not found</p>
          <h1>Sorry, we couldn’t<br /><em>find this page.</em></h1>
          <p className="aasw-not-found-copy">The link may have moved, changed or no longer be available. You can return to the Foundation home or contact AASW if you need help finding something.</p>
          <div id="not-found-button-group" className="aasw-not-found-actions">
            <button type="button" className="button button-primary" onClick={() => setLocation("/")}><Home size={16} />Return home</button>
            <a className="text-link text-link-green" href="/contact-us"><MapPin size={15} />Contact AASW <ArrowUpRight size={15} /></a>
          </div>
          <p className="aasw-not-found-note">AASW Foundation · Rura, Kanpur Dehat</p>
        </div>
      </main>
    </div>
  );
}
