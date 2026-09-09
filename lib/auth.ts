import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SESSION_COOKIE = "medstead_session";
const OPS_COOKIE = "medstead_ops";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  return process.env.SESSION_SECRET || "dev-only-session-secret-change-me";
}

function sign(payload: string) {
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verify(token: string) {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      role?: string;
      exp?: number;
    };
  } catch {
    return null;
  }
}

function encode(data: object) {
  return sign(Buffer.from(JSON.stringify(data)).toString("base64url"));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function setUserCookie(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  cookies().set(SESSION_COOKIE, encode({ sub: userId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearUserCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function setOpsCookie() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  cookies().set(OPS_COOKIE, encode({ role: "ops", exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearOpsCookie() {
  cookies().set(OPS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function currentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const data = verify(token);
  if (!data?.sub || (data.exp && data.exp < Date.now() / 1000)) return null;
  return prisma.user.findUnique({ where: { id: data.sub } });
}

export function isOps() {
  const token = cookies().get(OPS_COOKIE)?.value;
  if (!token) return false;
  const data = verify(token);
  if (!data || data.role !== "ops") return false;
  if (data.exp && data.exp < Date.now() / 1000) return false;
  return true;
}

/** Display label for audit (paidBy). Never returns or stores the raw OPS_PIN. */
export function opsIdentity(): string | null {
  if (!isOps()) return null;
  // Optional host override for multi-desk labeling; default is a stable session label.
  return process.env.OPS_STAFF_LABEL?.trim() || "ops-desk";
}

export function opsPinOk(pin: string) {
  const expected = process.env.OPS_PIN || "local-ops";
  const a = Buffer.from(pin);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
