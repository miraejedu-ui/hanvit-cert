import { NextResponse } from "next/server";
import { readDb, writeDb, saveUpload, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const db = await readDb();
  if (id) {
    const notice = db.notices.find((n) => n.id === id);
    if (!notice) return NextResponse.json({ error: "없음" }, { status: 404 });
    return NextResponse.json({ notice });
  }
  return NextResponse.json({
    notices: [...db.notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const form = await req.formData();
  const title = String(form.get("title") || "");
  const content = String(form.get("content") || "");
  const file = form.get("file") as File | null;
  let fileName: string | undefined;
  let filePath: string | undefined;
  if (file && file.size > 0) {
    const uploaded = await saveUpload(file, file.name);
    fileName = uploaded.fileName;
    filePath = uploaded.filePath;
  }
  const db = await readDb();
  const notice = {
    id: uuid(),
    title,
    content,
    fileName,
    filePath,
    authorId: user.id,
    createdAt: new Date().toISOString(),
  };
  db.notices.unshift(notice);
  await writeDb(db);
  return NextResponse.json({ notice });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const db = await readDb();
  db.notices = db.notices.filter((n) => n.id !== id);
  await writeDb(db);
  return NextResponse.json({ ok: true });
}
