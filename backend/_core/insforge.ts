import { createClient, createAdminClient } from "@insforge/sdk";
import { ENV } from "./env";

export const insforgeClient = createClient({
  baseUrl: ENV.insforgeUrl || "https://3q8p3w2r.ap-southeast.insforge.app",
  anonKey: ENV.insforgeAnonKey || "anon_7b32e745ccee627ff2825a8a05b1150ca8a7f79bbfd95192f372dadc86263437",
});

export const insforgeAdmin = createAdminClient({
  baseUrl: ENV.insforgeUrl || "https://3q8p3w2r.ap-southeast.insforge.app",
  apiKey: ENV.insforgeApiKey || "ik_6f949eb49036f42147e4b6eccbe661f2",
});
