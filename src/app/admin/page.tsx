import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login");
  const db = await readDb();

  const stats = [
    { label: "자격증", value: db.certifications.length, href: "/admin/certifications" },
    { label: "대기 원서", value: db.applications.filter((a) => a.status === "pending").length, href: "/admin/applications" },
    { label: "시험", value: db.exams.length, href: "/admin/exams" },
    { label: "채점대기", value: db.attempts.filter((a) => a.status === "submitted").length, href: "/admin/grading" },
    { label: "상담방", value: db.chatRooms.length, href: "/admin/chat" },
  ];

  return (
    <div className="container">
      <h1 className="page-title">관리자</h1>
      <p className="page-desc">한빛인증평가원(HCAI) 운영 관리 화면입니다.</p>
      <AdminNav />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem" }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card-panel" style={{ display: "block" }}>
            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--navy)" }}>{s.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
