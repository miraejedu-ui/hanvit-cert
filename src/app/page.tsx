import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      <section
        className="rise"
        style={{
          minHeight: "68vh",
          display: "grid",
          alignItems: "center",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "2rem",
          position: "relative",
          overflow: "hidden",
          borderRadius: "1.25rem",
          padding: "clamp(1.5rem, 4vw, 3rem)",
          background:
            "linear-gradient(135deg, rgba(11,44,74,0.95) 0%, rgba(13,122,111,0.88) 100%), url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 60L60 0H30L0 30M60 60V30L30 60\" fill=\"%23ffffff\" fill-opacity=\"0.04\"/%3E%3C/svg%3E')",
          color: "#fff",
        }}
      >
        <div>
          <p style={{ margin: "0 0 0.6rem", letterSpacing: "0.12em", fontSize: "0.8rem", opacity: 0.85 }}>
            HCAI · HANVIT CERTIFICATION & ASSESSMENT INSTITUTE
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              fontWeight: 900,
            }}
          >
            한빛인증평가원
          </h1>
          <p style={{ margin: "1rem 0 1.6rem", maxWidth: "34rem", lineHeight: 1.7, opacity: 0.92 }}>
            종목 정보부터 응시자격 확인, 원서 접수, 온라인 시험까지 한곳에서 진행하세요.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href="/certifications"
              className="btn"
              style={{ background: "#fff", color: "var(--navy)" }}
            >
              종목 명칭 보기
            </Link>
            <Link
              href="/eligibility"
              className="btn"
              style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.45)" }}
            >
              응시자격 자가진단
            </Link>
          </div>
        </div>
        <div
          className="rise rise-delay"
          style={{
            alignSelf: "end",
            justifySelf: "end",
            width: "min(100%, 360px)",
            aspectRatio: "4/5",
            borderRadius: "1rem",
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05)), repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.05) 12px, rgba(255,255,255,0.05) 24px)",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "grid",
            placeItems: "center",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.05em" }}>HCAI</div>
            <p style={{ margin: "0.5rem 0 0", opacity: 0.85, lineHeight: 1.5 }}>
              신뢰할 수 있는
              <br />
              인증·평가와 시험 응시
            </p>
          </div>
        </div>
      </section>

      <section
        className="rise rise-delay-2"
        style={{
          marginTop: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          { href: "/certifications", title: "종목 명칭", desc: "검색·주관기관·직무능력별 조회" },
          { href: "/apply", title: "원서 접수", desc: "로그인 후 종목 선택 및 서류 제출" },
          { href: "/notices", title: "공지사항", desc: "시험 일정과 안내 자료 확인" },
          { href: "/certificate/verify", title: "진위확인", desc: "발급 자격증 진위 여부 확인" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="card-panel" style={{ display: "block" }}>
            <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.05rem", color: "var(--navy)" }}>{item.title}</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>{item.desc}</p>
          </Link>
        ))}
      </section>

      <style>{`
        @media (max-width: 860px) {
          section.rise {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
