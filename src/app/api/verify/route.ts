import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const birthDate = String(body.birthDate || "").trim();
  const phone = String(body.phone || "").trim();
  const issueDate = String(body.issueDate || "").trim();
  const certificationName = String(body.certificationName || "").trim();

  const db = await readDb();
  const match = db.authenticity.find(
    (r) =>
      r.name === name &&
      r.birthDate === birthDate &&
      r.phone.replace(/-/g, "") === phone.replace(/-/g, "") &&
      r.issueDate === issueDate &&
      r.certificationName === certificationName
  );

  if (match) {
    return NextResponse.json({
      matched: true,
      message: "일치합니다",
    });
  }

  return NextResponse.json({
    matched: false,
    message:
      "불일치합니다. 자료를 다시 한번 검토해주시고 필요시 관리자한테 문의 남겨주세요",
  });
}
