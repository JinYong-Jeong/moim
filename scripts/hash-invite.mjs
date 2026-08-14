import { createHash } from "node:crypto";

const code = process.argv[2]?.trim().toUpperCase();

if (!code) {
  console.error("Usage: npm run invite:hash -- YOUR-INVITE-CODE");
  process.exitCode = 1;
} else {
  console.log(createHash("sha256").update(code).digest("hex"));
}
