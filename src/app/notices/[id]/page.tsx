import Link from "next/link";
import { readDb } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDb();
  const notice = db.notices.find((n) => n.id === id);
  if (!notice) notFound();

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <Link href="/notices" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        ← 목록
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        {notice.title}
      </h1>
      <p className="page-desc">{notice.createdAt.slice(0, 10)}</p>
      <div className="card-panel">
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.7 }}>
          {notice.content}
        </pre>
        {notice.filePath && (
          <p style={{ marginTop: "1.25rem" }}>
            <a className="btn btn-accent" href={`/api/upload?file=${encodeURIComponent(notice.filePath)}`}>
              첨부파일 다운로드 ({notice.fileName})
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
