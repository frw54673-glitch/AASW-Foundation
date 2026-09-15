import { createBeneficiaryId, createFieldEventId, suggestProjectCode } from "../shared/mis.ts";

const verificationDate = new Date("2026-08-14T00:00:00.000Z");
const results = {
  beneficiaryId: createBeneficiaryId(1, verificationDate),
  fieldEventId: createFieldEventId(2, verificationDate),
  projectCode: suggestProjectCode(3, verificationDate),
};

for (const [label, value] of Object.entries(results)) console.log(`${label}: ${value}`);
