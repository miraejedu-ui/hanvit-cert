import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { readDb, writeDb, uuid } from "./db";
import type { Role, User } from "./types";

const SESSION_COOKIE = "hanvit_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const db = await readDb();
  return db.users.find((u) => u.id === id) ?? null;
}

export async function requireUser(role?: Role): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (role && user.role !== role) throw new Error("FORBIDDEN");
  return user;
}

export function publicUser(user: User) {
  const { password: _, ...rest } = user;
  return rest;
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  birthDate?: string;
}) {
  const db = await readDb();
  if (db.users.some((u) => u.email === input.email)) {
    throw new Error("EMAIL_EXISTS");
  }
  const user: User = {
    id: uuid(),
    email: input.email,
    password: await hashPassword(input.password),
    name: input.name,
    phone: input.phone,
    birthDate: input.birthDate,
    role: "applicant",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDb(db);
  return publicUser(user);
}
