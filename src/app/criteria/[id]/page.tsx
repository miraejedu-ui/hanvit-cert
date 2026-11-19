import Link from "next/link";
import { CriteriaView } from "@/components/CriteriaView";
import { readDb } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function CriteriaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDb();
  const item = db.criteria.find((c) => c.id === id);
  if (!item) notFound();
  const cert = db.certifications.find((c) => c.id === item.certificationId);

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <Link href={cert ? `/certifications/${cert.id}#criteria` : "/criteria"} style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        ← {cert ? "종목으로" : "목록"}
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        {item.title}
      </h1>
      <p className="page-desc">
        {cert ? (
          <Link href={`/certifications/${cert.id}`} style={{ color: "var(--teal)" }}>
            {cert.name}
          </Link>
        ) : (
          "연결된 종목 없음"
        )}
      </p>
      <div className="card-panel">
        <CriteriaView item={item} />
        {item.filePath && (
          <p style={{ marginTop: "1.25rem" }}>
            <a className="btn btn-accent" href={`/api/upload?file=${encodeURIComponent(item.filePath)}`}>
              출제기준 파일 다운로드 ({item.fileName})
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
