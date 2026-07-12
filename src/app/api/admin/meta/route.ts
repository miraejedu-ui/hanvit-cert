import { NextResponse } from "next/server";
import { readDb, writeDb, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ majors: db.majors, jobFields: db.jobFields });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const db = await readDb();
  if (body.type === "major") {
    const major = {
      id: uuid(),
      name: String(body.name || ""),
      relatedJobs: String(body.relatedJobs || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
    };
    db.majors.push(major);
    await writeDb(db);
    return NextResponse.json({ major });
  }
  const job = {
    id: uuid(),
    name: String(body.name || ""),
    similarJobs: String(body.similarJobs || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  };
  db.jobFields.push(job);
  await writeDb(db);
  return NextResponse.json({ jobField: job });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const db = await readDb();
  if (type === "major") db.majors = db.majors.filter((m) => m.id !== id);
  else db.jobFields = db.jobFields.filter((j) => j.id !== id);
  await writeDb(db);
  return NextResponse.json({ ok: true });
}
