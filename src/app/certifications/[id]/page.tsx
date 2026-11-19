import Link from "next/link";
import { readDb } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function CertificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDb();
  const cert = db.certifications.find((c) => c.id === id);
  if (!cert) notFound();

  const criteria = db.criteria.find((c) => c.certificationId === cert.id);

  return (
    <div className="container">
      <h1 className="page-title">{cert.name}</h1>
      <p className="page-desc">주관교육기관: {cert.organization}</p>

      <div className="card-panel" style={{ display: "grid", gap: "1rem" }}>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>자격개요</h2>
          <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{cert.overview || "-"}</p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>응시자격</h2>
          <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{cert.eligibility || "-"}</p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>관련 전공</h2>
          <p style={{ margin: 0 }}>{cert.relatedMajors.join(", ") || "-"}</p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>직무 분야</h2>
          <p style={{ margin: 0 }}>{cert.jobFields.join(", ") || "-"}</p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>시험과목</h2>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {cert.subjects.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {cert.subjects.length === 0 && <li>-</li>}
          </ul>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>합격기준</h2>
          <p style={{ margin: 0, lineHeight: 1.7 }}>{cert.passCriteria || "-"}</p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>수행직무</h2>
          <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{cert.duties || "-"}</p>
        </section>
        <section>
          <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--teal)" }}>진로 및 전망</h2>
          <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{cert.career || "-"}</p>
        </section>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href={`/apply?cert=${cert.id}`} className="btn btn-primary">
            원서 접수
          </Link>
          <Link href="/eligibility" className="btn btn-ghost">
            응시자격 자가진단
          </Link>
          <Link
            href={criteria ? `/criteria/${criteria.id}` : "/criteria"}
            className="btn btn-ghost"
          >
            출제기준 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
