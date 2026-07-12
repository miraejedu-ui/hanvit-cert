import Link from "next/link";
import { readDb } from "@/lib/db";

export default async function NoticesPage() {
  const db = await readDb();
  const notices = [...db.notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="container">
      <h1 className="page-title">공지사항</h1>
      <p className="page-desc">시험 일정 및 안내 자료를 확인할 수 있습니다.</p>
      <div className="card-panel">
        <table className="table">
          <thead>
            <tr>
              <th>제목</th>
              <th>작성일</th>
              <th>첨부</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id}>
                <td>
                  <Link href={`/notices/${n.id}`} style={{ fontWeight: 600, color: "var(--navy)" }}>
                    {n.title}
                  </Link>
                </td>
                <td>{n.createdAt.slice(0, 10)}</td>
                <td>{n.fileName ? "있음" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
