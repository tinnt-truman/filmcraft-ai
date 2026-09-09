import bcrypt from "bcryptjs";
export const hashPw = (s: string) => bcrypt.hash(s, 10);
export const verifyPw = (s: string, h: string) => bcrypt.compare(s, h);
