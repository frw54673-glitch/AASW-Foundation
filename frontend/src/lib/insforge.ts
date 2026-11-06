import { createClient } from "@insforge/sdk";

const insforgeUrl = import.meta.env.VITE_INSFORGE_URL || "https://3q8p3w2r.ap-southeast.insforge.app";
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY || "anon_7b32e745ccee627ff2825a8a05b1150ca8a7f79bbfd95192f372dadc86263437";

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey,
});
