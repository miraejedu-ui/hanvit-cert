import Link from "next/link";

const links = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/majors", label: "자가진단 기초정보" },
  { href: "/admin/certifications", label: "종목 등록" },
  { href: "/admin/notices", label: "공지 작성" },
  { href: "/admin/criteria", label: "출제기준" },
  { href: "/admin/applications", label: "원서 검토" },
  { href: "/admin/exams", label: "시험 제작" },
  { href: "/admin/grading", label: "채점/결과" },
  { href: "/admin/certificates", label: "자격증 발급" },
  { href: "/admin/authenticity", label: "진위확인 등록" },
  { href: "/admin/chat", label: "1:1 상담" },
];

export function AdminNav() {
  return (
    <nav
      className="card-panel"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.45rem",
        marginBottom: "1rem",
        padding: "0.85rem",
      }}
    >
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="btn btn-ghost" style={{ padding: "0.4rem 0.7rem", fontSize: "0.85rem" }}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
