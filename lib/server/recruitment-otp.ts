import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const generateRecruitmentCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");

export const hashRecruitmentCode = (email: string, code: string, secret: string) =>
  createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");

export const matchesRecruitmentCode = (email: string, code: string, hash: string, secret: string) => {
  const expected = Buffer.from(hashRecruitmentCode(email, code, secret), "hex");
  const actual = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
