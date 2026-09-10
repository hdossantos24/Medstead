import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  PIN_PERMISSIONS,
  homePathForRole,
  isStaffRole,
  ruleAllowed,
  type Permission,
  type StaffRole,
} from "./staff";

const SESSION_COOKIE = "medstead_session";
const OPS_COOKIE = "medstead_ops";
const MAX_AGE = 60 * 60 * 24 * 30;

export type OpsActor =
  | { kind: "staff"; user: NonNullable<Awaited<ReturnType<typeof currentUser>>> }
  | { kind: "pin"; user: null };

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

export function opsPinOk(pin: string) {
  const expected = process.env.OPS_PIN || "local-ops";
  const a = Buffer.from(pin);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function currentStaff() {
  const user = await currentUser();
  if (!user || !user.active || !isStaffRole(user.role)) return null;
  return user;
}

export async function getOpsActor(): Promise<OpsActor | null> {
  const staff = await currentStaff();
  if (staff) return { kind: "staff", user: staff };
  if (isOps()) return { kind: "pin", user: null };
  return null;
}

export async function loadPermissionSet(role: StaffRole) {
  const stored = await prisma.staffRule.findMany({ where: { role } });
  return (key: Permission) => ruleAllowed(role, key, stored);
}

export async function actorAllows(actor: OpsActor, key: Permission) {
  if (actor.kind === "pin") return PIN_PERMISSIONS.includes(key);
  return (await loadPermissionSet(actor.user.role as StaffRole))(key);
}

export async function requireOpsApi(key?: Permission) {
  const actor = await getOpsActor();
  if (!actor) return { error: "Ops sign-in required" as const, status: 401 as const, actor: null };
  if (key && !(await actorAllows(actor, key))) {
    return { error: "That seat cannot do this." as const, status: 403 as const, actor };
  }
  return { actor, error: null, status: 200 as const };
}

export async function requireStaffPage(roles?: StaffRole[]) {
  const actor = await getOpsActor();
  if (!actor) redirect("/ops");
  if (actor.kind === "pin") {
    if (roles && !roles.includes("STAFF")) redirect("/ops");
    return actor;
  }
  if (roles && !roles.includes(actor.user.role as StaffRole)) {
    redirect(homePathForRole(actor.user.role));
  }
  return actor;
}

export async function ensureDefaultRules() {
  const { DEFAULT_RULES, PERMISSIONS } = await import("./staff");
  for (const role of Object.keys(DEFAULT_RULES) as StaffRole[]) {
    for (const key of PERMISSIONS) {
      await prisma.staffRule.upsert({
        where: { role_key: { role, key } },
        update: {},
        create: {
          role,
          key,
          allowed: DEFAULT_RULES[role].includes(key),
        },
      });
    }
  }
}
