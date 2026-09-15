import { ENV } from "./env";

export function backendHealth() {
  return {
    ok: true as const,
    service: "aasw-foundation",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reports only whether the backend's production dependencies are configured;
 * it deliberately never exposes secret values or connection strings.
 */
export function backendReadiness() {
  const checks = {
    database: Boolean(ENV.databaseUrl),
    sessionSigning: Boolean(ENV.cookieSecret),
    adminOAuth: Boolean(ENV.appId && ENV.oAuthServerUrl),
    managedStorage: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
  };

  return {
    ok: Object.values(checks).every(Boolean),
    service: "aasw-foundation",
    environment: ENV.isProduction ? "production" : "development",
    checks,
  };
}
