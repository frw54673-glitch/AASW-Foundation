export type RouteMetadata = { title: string; description: string; indexable?: boolean };

export const defaultRouteMetadata: RouteMetadata = {
  title: "AASW Foundation | NGO for Women Empowerment in Uttar Pradesh",
  description: "Fueling women's success through tech & enterprise — AASW Foundation is a registered NGO in Uttar Pradesh: 800+ women trained, 300+ businesses launched or scaled, 30+ eco-friendly projects across 5 districts.",
};

export const routeMetadata: Record<string, RouteMetadata> = {
  "/about": { title: "About AASW Foundation | Purpose, people and public trust", description: "Learn about AASW Foundation’s purpose, approach, people and public commitment in Uttar Pradesh." },
  "/who-we-are": { title: "Who We Are | AASW Foundation", description: "Meet AASW Foundation and learn how the organisation supports women and communities in Uttar Pradesh." },
  "/vision-mission": { title: "Vision and Mission | AASW Foundation", description: "Read AASW Foundation’s vision for women’s leadership, digital capability and sustainable enterprise." },
  "/what-we-do": { title: "What We Do | AASW Foundation", description: "Explore AASW Foundation’s work in digital skills, green entrepreneurship, mentorship and community learning." },
  "/digital-skills": { title: "Digital Skills Programme | AASW Foundation", description: "Learn about digital skills and enterprise training for women through AASW Foundation." },
  "/green-entrepreneurship": { title: "Green Entrepreneurship | AASW Foundation", description: "Explore AASW Foundation’s support for ecologically responsible enterprise and sustainable livelihoods." },
  "/mentorship-community": { title: "Mentorship and Community | AASW Foundation", description: "Discover AASW Foundation’s mentorship, workshops and peer support for women entrepreneurs." },
  "/programs": { title: "AASW Foundation Programmes | Capability in practice", description: "Explore AASW Foundation programmes in digital capability, green enterprise, mentorship and community support." },
  "/team": { title: "Our Team | AASW Foundation", description: "Meet the source-backed leadership, advisory and training team behind AASW Foundation." },
  "/reports": { title: "Reports | AASW Foundation", description: "Read AASW Foundation’s public reports and request organisational information." },
  "/governance": { title: "Governance | AASW Foundation", description: "Learn about AASW Foundation’s advisory structure, governance approach and public policies." },
  "/stories": { title: "Stories and Impact | AASW Foundation", description: "Explore AASW Foundation’s work and public impact supporting women and communities." },
  "/updates": { title: "Updates | AASW Foundation", description: "Read the latest programme and community updates from AASW Foundation." },
  "/membership": { title: "Membership | AASW Foundation", description: "Apply for AASW Foundation membership and stay connected to practical support, learning and community." },
  "/volunteer": { title: "Volunteer | AASW Foundation", description: "Volunteer with AASW Foundation and support digital education, green entrepreneurship and community work in Uttar Pradesh." },
  "/donate": { title: "Donate | Support AASW Foundation", description: "Support AASW Foundation’s work with women through digital education, enterprise and community support." },
  "/contact": { title: "Contact AASW Foundation | Get in touch", description: "Contact AASW Foundation for programme questions, partnerships, membership, donations or support enquiries." },
  "/contact-us": { title: "Contact AASW Foundation | Get in touch", description: "Contact AASW Foundation for programme questions, partnerships, membership, donations or support enquiries." },
  "/faq": { title: "FAQ | AASW Foundation", description: "Frequently asked questions about AASW Foundation donations, membership, volunteering and transparency." },
  "/media-centre": { title: "Media Centre | AASW Foundation", description: "Read AASW Foundation updates, field notes and public information." },
  "/field-gallery": { title: "Field Gallery | AASW Foundation", description: "View Foundation-approved field photographs from AASW work and community activity." },
  "/privacy": { title: "Privacy Policy | AASW Foundation", description: "Read how AASW Foundation handles information submitted through this website." },
  "/refund": { title: "Refund Policy | AASW Foundation", description: "Read AASW Foundation’s membership fee refund and cancellation information." },
  "/thank-you": { title: "Thank You | AASW Foundation", description: "Thank you for connecting with AASW Foundation.", indexable: false },
  "/404": { title: "Page Not Found | AASW Foundation", description: "The page you requested could not be found.", indexable: false },
};

const privateRoutePaths = new Set([
  "/member", "/member/login", "/member/setup-password", "/member/reset-password", "/member/dashboard",
  "/member/projects", "/member/discover", "/member/programmes", "/member/membership", "/member/profile",
  "/member/history", "/member/services", "/member/password", "/member/email-certificate", "/member/certificate",
  "/foundation-admin", "/foundation-admin/login", "/foundation-admin/documents", "/foundation-admin/members",
  "/foundation-admin/service-requests", "/foundation-admin/support-inbox", "/mis/dashboard", "/mis/projects",
  "/mis/delivery", "/mis/operations", "/mis/governance",
]);

export function normalizeRoutePath(path: string) {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function isPrivateRoute(path: string) {
  const pathname = normalizeRoutePath(path);
  return pathname === "/member" || pathname.startsWith("/member/") || pathname === "/foundation-admin" || pathname.startsWith("/foundation-admin/") || pathname === "/mis" || pathname.startsWith("/mis/");
}

export function isKnownRoute(path: string) {
  const pathname = normalizeRoutePath(path);
  return pathname === "/" || pathname === "/404" || Object.hasOwn(routeMetadata, pathname) || privateRoutePaths.has(pathname);
}

export function isNotFoundRoute(path: string) {
  const pathname = normalizeRoutePath(path);
  return pathname === "/404" || !isKnownRoute(pathname);
}

export function getRouteMetadata(path: string): RouteMetadata {
  const pathname = normalizeRoutePath(path);
  if (isPrivateRoute(pathname)) return { title: "Secure Workspace | AASW Foundation", description: "Secure member and staff workspace for AASW Foundation.", indexable: false };
  return routeMetadata[pathname] ?? (pathname === "/" ? defaultRouteMetadata : { title: "Page Not Found | AASW Foundation", description: "The page you requested could not be found.", indexable: false });
}
