import bcrypt from "bcryptjs";

const password = process.env.MEMBER_PASSWORD;

if (!password) {
  console.error("MEMBER_PASSWORD is required.");
  process.exit(1);
}

console.log(await bcrypt.hash(password, 12));
