import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const user = await getSessionUser();

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.85rem 0",
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
          <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.03em" }}>
            한빛인증평가원
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--teal)", fontWeight: 700 }}>HCAI</span>
        </Link>

        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.85rem",
            fontSize: "0.92rem",
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          <Link href="/certifications">종목 명칭</Link>
          <Link href="/eligibility">응시자격 자가진단</Link>
          <Link href="/notices">공지</Link>
          <Link href="/criteria">출제기준</Link>
          <Link href="/apply">원서 접수</Link>
          <Link href="/certificate/verify">진위확인</Link>
          <Link href="/chat">1:1 상담</Link>
          {user?.role === "admin" && <Link href="/admin">관리자</Link>}
          {user && <Link href="/mypage">마이페이지</Link>}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {user ? (
            <>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {user.name} ({user.role === "admin" ? "관리자" : "응시자"})
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost" style={{ padding: "0.45rem 0.8rem" }}>
                로그인
              </Link>
              <Link href="/register" className="btn btn-primary" style={{ padding: "0.45rem 0.8rem" }}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
