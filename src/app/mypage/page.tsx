"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AppRow = {
  id: string;
  certificationId: string;
  certificationName?: string;
  status: string;
  statusReason?: string;
  createdAt: string;
};

type ExamRow = {
  id: string;
  title: string;
  certificationId: string;
  certificationName?: string;
  startAt: string;
  endAt: string;
};

type AttemptRow = {
  id: string;
  title?: string;
  status: string;
  passed?: boolean;
  totalScore?: number;
};

export default function MyPage() {
  const router = useRouter();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [certs, setCerts] = useState<
    { id: string; certificationName?: string; certType: string; filePath?: string; fileName?: string; issueDate: string }[]
  >([]);
  const [requests, setRequests] = useState<{ id: string; certificationName?: string; status: string }[]>([]);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    const [a, e, c, at] = await Promise.all([
      fetch("/api/applications").then((r) => r.json()),
      fetch("/api/exams").then((r) => r.json()),
      fetch("/api/admin/certificates?mine=1").then((r) => r.json()),
      fetch("/api/exams?mine=1").then((r) => r.json()),
    ]);
    const applications = a.applications || [];
    setApps(applications);
    setCerts(c.certificates || []);
    setRequests(c.requests || []);
    setAttempts(at.attempts || []);

    const approvedIds = new Set(
      applications.filter((x: AppRow) => x.status === "approved").map((x: AppRow) => x.certificationId)
    );
    setExams((e.exams || []).filter((ex: ExamRow) => approvedIds.has(ex.certificationId)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const statusBadge = (s: string) => {
    if (s === "approved") return <span className="badge badge-ok">시험 응시 가능</span>;
    if (s === "supplement") return <span className="badge badge-warn">서류 보완 필요</span>;
    if (s === "rejected") return <span className="badge badge-danger">응시 불가</span>;
    return <span className="badge badge-muted">검토 중</span>;
  };

  async function requestCert(examAttemptId: string) {
    const res = await fetch("/api/admin/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", examAttemptId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "신청 실패");
      return;
    }
    alert("자격증 발급 신청이 접수되었습니다.");
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">마이페이지</h1>
      <p className="page-desc">원서 접수 결과, 시험 응시, 자격증 발급 현황을 확인합니다.</p>

      <section className="card-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, color: "var(--navy)" }}>원서 접수 결과</h2>
        <table className="table">
          <thead>
            <tr>
              <th>종목</th>
              <th>접수일</th>
              <th>결과</th>
              <th>사유</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td>{a.certificationName}</td>
                <td>{a.createdAt.slice(0, 10)}</td>
                <td>{statusBadge(a.status)}</td>
                <td>{a.statusReason || "-"}</td>
              </tr>
            ))}
            {apps.length === 0 && (
              <tr>
                <td colSpan={4}>접수 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, color: "var(--navy)" }}>응시 가능 시험</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {exams.map((ex) => (
            <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong>{ex.title}</strong>
                <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                  {ex.certificationName} · {ex.startAt.slice(0, 16).replace("T", " ")} ~{" "}
                  {ex.endAt.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <Link href={`/exam/${ex.id}`} className="btn btn-primary">
                시험 응시
              </Link>
            </div>
          ))}
          {exams.length === 0 && (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              현재 응시 가능한 시험이 없습니다. (원서 승인 + 시험 기간 필요)
            </p>
          )}
        </div>
      </section>

      <section className="card-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, color: "var(--navy)" }}>시험 결과</h2>
        {attempts.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>응시 기록이 없습니다.</p>}
        {attempts.map((it) => (
          <div
            key={it.id}
            style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem", flexWrap: "wrap" }}
          >
            <div>
              <strong>{it.title}</strong>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
                {it.status === "forced_fail"
                  ? "부정행위로 강제 종료(불합격)"
                  : it.status === "graded"
                    ? it.passed
                      ? `합격 (점수: ${it.totalScore ?? "-"})`
                      : `불합격 (점수: ${it.totalScore ?? "-"})`
                    : it.status === "submitted"
                      ? "채점 대기"
                      : it.status}
              </p>
            </div>
            {it.passed && (
              <button className="btn btn-accent" onClick={() => requestCert(it.id)}>
                자격증 발급 신청
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="card-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0, color: "var(--navy)" }}>발급 신청 / 합격증·수료증</h2>
        <h3 style={{ fontSize: "0.95rem", color: "var(--muted)" }}>발급 신청</h3>
        <ul>
          {requests.map((r) => (
            <li key={r.id}>
              {r.certificationName} —{" "}
              {r.status === "issued" ? "발급완료" : r.status === "pending" ? "대기중" : r.status}
            </li>
          ))}
          {requests.length === 0 && <li>신청 내역 없음</li>}
        </ul>
        <h3 style={{ fontSize: "0.95rem", color: "var(--muted)" }}>다운로드</h3>
        <ul>
          {certs.map((c) => (
            <li key={c.id}>
              {c.certificationName} ({c.certType}) {c.issueDate}{" "}
              {c.filePath && (
                <a href={`/api/upload?file=${encodeURIComponent(c.filePath)}`}>[{c.fileName || "파일"} 다운]</a>
              )}
            </li>
          ))}
          {certs.length === 0 && <li>발급된 파일이 없습니다.</li>}
        </ul>
      </section>

      <Link href="/chat" className="btn btn-ghost">
        관리자와 1:1 상담
      </Link>
    </div>
  );
}
