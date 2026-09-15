// Dev-only helper: lists RecordSection call sites for the progressive-loading edit.
import fs from "fs";
const c = fs.readFileSync("client/src/pages/FoundationAdminPage.tsx", "utf8");
const re = /<RecordSection title="([^"]+)"([^>]*)>/g;
let m;
let count = 0;
while ((m = re.exec(c)) !== null) {
  count += 1;
  console.log(count + ". " + m[1] + " | props: " + m[2].trim());
}
console.log("total:", count);
