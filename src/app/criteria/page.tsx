import Link from "next/link";
import { readDb } from "@/lib/db";

export default async function CriteriaPage() {
  const db = await readDb();
  const list = db.criteria.map((c) => ({
    ...c,
    certificationName: db.certifications.find((x) => x.id === c.certificationId)?.name,
  }));

  return (
    <div className="container">
      <h1 className="page-title">출제기준</h1>
      <p className="page-desc">
        종목을 선택하면 해당 종목 상세에서 출제기준 표까지 함께 확인할 수 있습니다.
      </p>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {list.map((c) => (
          <Link
            key={c.id}
            href={c.certificationId ? `/certifications/${c.certificationId}#criteria` : `/criteria/${c.id}`}
            className="card-panel"
            style={{ display: "block" }}
          >
            <strong style={{ color: "var(--navy)" }}>{c.certificationName || c.title}</strong>
            <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>출제기준 바로 보기</p>
          </Link>
        ))}
        {list.length === 0 && <p className="card-panel">등록된 출제기준이 없습니다.</p>}
      </div>
    </div>
  );
}
