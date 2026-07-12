import { NextResponse } from "next/server";
import { readDb, writeDb, saveUpload, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ApplicationStatus } from "@/lib/types";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const db = await readDb();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";

  let list = db.applications;
  if (!(user.role === "admin" && all)) {
    list = list.filter((a) => a.userId === user.id);
  }

  return NextResponse.json({
    applications: list
      .map((a) => ({
        ...a,
        certificationName: db.certifications.find((c) => c.id === a.certificationId)?.name,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const form = await req.formData();
  const certificationId = String(form.get("certificationId") || "");
  const name = String(form.get("name") || "");
  const birthDate = String(form.get("birthDate") || "");
  const phone = String(form.get("phone") || "");
  const email = String(form.get("email") || "");
  const file = form.get("document") as File | null;

  if (!certificationId || !name || !birthDate || !phone || !email) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  let documentFileName: string | undefined;
  let documentPath: string | undefined;
  if (file && file.size > 0) {
    const uploaded = await saveUpload(file, file.name);
    documentFileName = uploaded.fileName;
    documentPath = uploaded.filePath;
  }

  const db = await readDb();
  const now = new Date().toISOString();
  const application = {
    id: uuid(),
    userId: user.id,
    certificationId,
    name,
    birthDate,
    phone,
    email,
    documentFileName,
    documentPath,
    status: "pending" as ApplicationStatus,
    createdAt: now,
    updatedAt: now,
  };
  db.applications.push(application);
  await writeDb(db);
  return NextResponse.json({ application });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const db = await readDb();
  const idx = db.applications.findIndex((a) => a.id === body.id);
  if (idx < 0) return NextResponse.json({ error: "없음" }, { status: 404 });
  db.applications[idx] = {
    ...db.applications[idx],
    status: body.status,
    statusReason: body.statusReason || "",
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return NextResponse.json({ application: db.applications[idx] });
}
