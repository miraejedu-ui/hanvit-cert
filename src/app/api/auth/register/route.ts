import { NextResponse } from "next/server";
import { createSession, registerUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await registerUser({
      email: String(body.email || "").trim(),
      password: String(body.password || ""),
      name: String(body.name || "").trim(),
      phone: body.phone ? String(body.phone) : undefined,
      birthDate: body.birthDate ? String(body.birthDate) : undefined,
    });
    await createSession(user.id);
    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
    }
    return NextResponse.json({ error: "회원가입에 실패했습니다." }, { status: 500 });
  }
}
