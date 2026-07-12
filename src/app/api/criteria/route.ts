import { NextResponse } from "next/server";
import { readDb, writeDb, saveUpload, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const certificationId = searchParams.get("certificationId");
  const db = await readDb();
  if (id) {
    const item = db.criteria.find((c) => c.id === id);
    if (!item) return NextResponse.json({ error: "없음" }, { status: 404 });
    const cert = db.certifications.find((c) => c.id === item.certificationId);
    return NextResponse.json({ criteria: item, certification: cert });
  }
  let list = db.criteria;
  if (certificationId) list = list.filter((c) => c.certificationId === certificationId);
  return NextResponse.json({
    criteria: list.map((c) => ({
      ...c,
      certificationName: db.certifications.find((x) => x.id === c.certificationId)?.name,
    })),
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
  const certificationId = String(form.get("certificationId") || "");
  const file = form.get("file") as File | null;
  let fileName: string | undefined;
  let filePath: string | undefined;
  if (file && file.size > 0) {
    const uploaded = await saveUpload(file, file.name);
    fileName = uploaded.fileName;
    filePath = uploaded.filePath;
  }
  const db = await readDb();
  const item = {
    id: uuid(),
    certificationId,
    title,
    content,
    fileName,
    filePath,
    createdAt: new Date().toISOString(),
  };
  db.criteria.push(item);
  await writeDb(db);
  return NextResponse.json({ criteria: item });
}
