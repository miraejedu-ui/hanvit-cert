import Link from "next/link";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--navy-deep)",
        color: "#d5e0eb",
        padding: "2rem 0",
      }}
    >
      <div className="container" style={{ display: "grid", gap: "0.75rem" }}>
        <strong style={{ fontSize: "1.1rem", color: "#fff" }}>한빛인증평가원</strong>
        <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.6 }}>
          HCAI · Hanvit Certification & Assessment Institute
          <br />
          자격증 정보 안내 · 응시자격 자가진단 · 원서 접수 · 온라인 시험 · 자격 진위확인
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.9rem" }}>
          <Link href="/certifications">자격증 정보</Link>
          <Link href="/notices">공지사항</Link>
          <Link href="/certificate/verify">진위확인서</Link>
          <Link href="/chat">1:1 상담</Link>
        </div>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
          © {new Date().getFullYear()} 한빛인증평가원 (HCAI). All rights reserved.
        </p>
      </div>
    </footer>
  );
}
