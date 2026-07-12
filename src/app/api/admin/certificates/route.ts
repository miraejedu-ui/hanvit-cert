import { NextResponse } from "next/server";
import { readDb, writeDb, saveUpload, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const db = await readDb();

  if (mine) {
    if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
    return NextResponse.json({
      certificates: db.issuedCertificates
        .filter((c) => c.userId === user.id)
        .map((c) => ({
          ...c,
          certificationName: db.certifications.find((x) => x.id === c.certificationId)?.name,
        })),
      requests: db.certificateRequests
        .filter((r) => r.userId === user.id)
        .map((r) => ({
          ...r,
          certificationName: db.certifications.find((x) => x.id === r.certificationId)?.name,
        })),
    });
  }

  if (user?.role === "admin") {
    return NextResponse.json({
      certificates: db.issuedCertificates,
      requests: db.certificateRequests.map((r) => ({
        ...r,
        userName: db.users.find((u) => u.id === r.userId)?.name,
        certificationName: db.certifications.find((c) => c.id === r.certificationId)?.name,
      })),
      authenticity: db.authenticity,
    });
  }

  return NextResponse.json({ error: "권한 없음" }, { status: 403 });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    if (user.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    const form = await req.formData();
    const action = String(form.get("action") || "issue");
    const db = await readDb();

    if (action === "issue") {
      const file = form.get("file") as File | null;
      let fileName: string | undefined;
      let filePath: string | undefined;
      if (file && file.size > 0) {
        const uploaded = await saveUpload(file, file.name);
        fileName = uploaded.fileName;
        filePath = uploaded.filePath;
      }
      const cert = {
        id: uuid(),
        userId: String(form.get("userId") || ""),
        certificationId: String(form.get("certificationId") || ""),
        name: String(form.get("name") || ""),
        birthDate: String(form.get("birthDate") || ""),
        phone: String(form.get("phone") || ""),
        issueDate: String(form.get("issueDate") || new Date().toISOString().slice(0, 10)),
        certType: String(form.get("certType") || "pass") as "pass" | "completion" | "license",
        fileName,
        filePath,
        createdAt: new Date().toISOString(),
      };
      db.issuedCertificates.push(cert);

      const requestId = String(form.get("requestId") || "");
      if (requestId) {
        const ridx = db.certificateRequests.findIndex((r) => r.id === requestId);
        if (ridx >= 0) db.certificateRequests[ridx].status = "issued";
      }

      // also register authenticity
      const certName =
        db.certifications.find((c) => c.id === cert.certificationId)?.name || cert.name;
      db.authenticity.push({
        id: uuid(),
        name: cert.name,
        birthDate: cert.birthDate,
        phone: cert.phone,
        issueDate: cert.issueDate,
        certificationName: certName,
        createdAt: new Date().toISOString(),
      });

      await writeDb(db);
      return NextResponse.json({ certificate: cert });
    }
  }

  const body = await req.json();
  const db = await readDb();

  if (body.action === "request") {
    const attempt = db.attempts.find(
      (a) => a.id === body.examAttemptId && a.userId === user.id && a.passed
    );
    if (!attempt) {
      return NextResponse.json({ error: "합격한 시험 기록이 필요합니다." }, { status: 400 });
    }
    const exam = db.exams.find((e) => e.id === attempt.examId);
    if (!exam) return NextResponse.json({ error: "시험 없음" }, { status: 404 });
    const request = {
      id: uuid(),
      userId: user.id,
      certificationId: exam.certificationId,
      examAttemptId: attempt.id,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    db.certificateRequests.push(request);
    await writeDb(db);
    return NextResponse.json({ request });
  }

  if (body.action === "authenticity" && user.role === "admin") {
    const record = {
      id: uuid(),
      name: String(body.name || ""),
      birthDate: String(body.birthDate || ""),
      phone: String(body.phone || ""),
      issueDate: String(body.issueDate || ""),
      certificationName: String(body.certificationName || ""),
      createdAt: new Date().toISOString(),
    };
    db.authenticity.push(record);
    await writeDb(db);
    return NextResponse.json({ record });
  }

  return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
}
