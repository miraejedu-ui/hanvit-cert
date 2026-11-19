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
      <p className="page-desc">해당 자격을 찾아 클릭하면 출제기준을 확인하고 다운로드할 수 있습니다.</p>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {list.map((c) => (
          <Link key={c.id} href={`/criteria/${c.id}`} className="card-panel" style={{ display: "block" }}>
            <strong style={{ color: "var(--navy)" }}>{c.title}</strong>
            <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>{c.certificationName}</p>
          </Link>
        ))}
        {list.length === 0 && <p className="card-panel">등록된 출제기준이 없습니다.</p>}
      </div>
    </div>
  );
}
