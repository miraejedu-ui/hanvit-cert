import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import type { Certification } from "@/lib/types";

function matchesMajor(
  cert: Certification,
  major: string,
  majors: { name: string; relatedJobs: string[] }[]
) {
  if (!major) return false;
  const direct = cert.relatedMajors.some(
    (m) => m === major || m.includes(major) || major.includes(m)
  );
  if (direct) return true;
  return majors.some(
    (m) =>
      (m.name === major || m.name.includes(major) || major.includes(m.name)) &&
      m.relatedJobs.some((rj) => cert.jobFields.includes(rj))
  );
}

function matchesJob(
  cert: Certification,
  job: string,
  jobFields: { name: string; similarJobs: string[] }[]
) {
  if (!job) return false;
  if (cert.jobFields.some((j) => j === job || j.includes(job) || job.includes(j))) {
    return true;
  }
  return jobFields.some((jf) => {
    const nameHit = jf.name === job || jf.name.includes(job) || job.includes(jf.name);
    if (!nameHit) return false;
    return (
      cert.jobFields.includes(jf.name) ||
      jf.similarJobs.some((s) => cert.jobFields.includes(s) || s.includes(job) || job.includes(s))
    );
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const major = String(body.major || "").trim();
  const job = String(body.job || "").trim();
  const certificationId = String(body.certificationId || "");
  const db = await readDb();

  if (!major && !job) {
    return NextResponse.json({ error: "전공 또는 직무 분야를 입력하세요." }, { status: 400 });
  }

  const eligibleCertifications = db.certifications
    .map((cert) => {
      const majorMatch = matchesMajor(cert, major, db.majors);
      const jobMatch = matchesJob(cert, job, db.jobFields);
      return {
        ...cert,
        majorMatch,
        jobMatch,
        eligible: majorMatch || jobMatch,
      };
    })
    .filter((c) => c.eligible);

  let specific = null;
  if (certificationId) {
    const cert = db.certifications.find((c) => c.id === certificationId);
    if (!cert) return NextResponse.json({ error: "자격증을 찾을 수 없습니다." }, { status: 404 });
    const majorMatch = matchesMajor(cert, major, db.majors);
    const jobMatch = matchesJob(cert, job, db.jobFields);
    const eligible = majorMatch || jobMatch;
    specific = {
      eligible,
      message: eligible
        ? `「${cert.name}」응시자격에 충족하는 것으로 확인됩니다. 정확한 심사는 원서 접수 후 진행됩니다.`
        : `「${cert.name}」은(는) 입력하신 전공/직무 기준으로 응시자격이 충족되지 않을 수 있습니다.`,
      certification: cert,
      checks: { majorMatch, jobMatch },
    };
  }

  return NextResponse.json({
    major,
    job,
    count: eligibleCertifications.length,
    eligibleCertifications,
    specific,
    message:
      eligibleCertifications.length > 0
        ? `입력하신 전공/직무 기준으로 응시 가능한 자격 ${eligibleCertifications.length}건을 찾았습니다.`
        : "입력하신 전공/직무와 일치하는 응시 가능 자격이 없습니다. 자료를 다시 확인하거나 관리자에게 문의해 주세요.",
  });
}
