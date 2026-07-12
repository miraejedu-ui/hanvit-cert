import { NextResponse } from "next/server";
import { readDb, writeDb, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const org = searchParams.get("org") || "";
  const job = searchParams.get("job") || "";
  const id = searchParams.get("id");
  const db = await readDb();

  if (id) {
    const cert = db.certifications.find((c) => c.id === id);
    if (!cert) return NextResponse.json({ error: "없음" }, { status: 404 });
    return NextResponse.json({ certification: cert });
  }

  let list = db.certifications;
  if (q) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.organization.toLowerCase().includes(q) ||
        c.overview.toLowerCase().includes(q)
    );
  }
  if (org) list = list.filter((c) => c.organization === org);
  if (job) list = list.filter((c) => c.jobFields.includes(job));

  const organizations = [...new Set(db.certifications.map((c) => c.organization))];
  const jobFields = [...new Set(db.certifications.flatMap((c) => c.jobFields))];

  return NextResponse.json({ certifications: list, organizations, jobFields });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const db = await readDb();
  const cert = {
    id: uuid(),
    name: String(body.name || ""),
    organization: String(body.organization || ""),
    relatedMajors: Array.isArray(body.relatedMajors) ? body.relatedMajors.map(String) : [],
    jobFields: Array.isArray(body.jobFields) ? body.jobFields.map(String) : [],
    subjects: Array.isArray(body.subjects) ? body.subjects.map(String) : String(body.subjects || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    passCriteria: String(body.passCriteria || ""),
    overview: String(body.overview || ""),
    duties: String(body.duties || ""),
    career: String(body.career || ""),
    eligibility: String(body.eligibility || ""),
    createdAt: new Date().toISOString(),
  };
  db.certifications.push(cert);
  await writeDb(db);
  return NextResponse.json({ certification: cert });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const db = await readDb();
  const idx = db.certifications.findIndex((c) => c.id === body.id);
  if (idx < 0) return NextResponse.json({ error: "없음" }, { status: 404 });
  db.certifications[idx] = {
    ...db.certifications[idx],
    ...body,
    subjects: Array.isArray(body.subjects)
      ? body.subjects
      : String(body.subjects || db.certifications[idx].subjects.join(","))
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
  };
  await writeDb(db);
  return NextResponse.json({ certification: db.certifications[idx] });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const db = await readDb();
  db.certifications = db.certifications.filter((c) => c.id !== id);
  await writeDb(db);
  return NextResponse.json({ ok: true });
}
