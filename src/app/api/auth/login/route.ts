import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { createSession, publicUser, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: publicUser(user) });
}
