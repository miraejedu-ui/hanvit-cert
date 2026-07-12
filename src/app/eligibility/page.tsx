"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchSelect } from "@/components/SearchSelect";
import type { Certification } from "@/lib/types";

type EligibleCert = Certification & {
  majorMatch: boolean;
  jobMatch: boolean;
  eligible: boolean;
};

type DiagnoseResult = {
  message: string;
  count: number;
  eligibleCertifications: EligibleCert[];
  specific: {
    eligible: boolean;
    message: string;
  } | null;
  error?: string;
};

export default function EligibilityPage() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [majors, setMajors] = useState<{ id: string; name: string }[]>([]);
  const [jobs, setJobs] = useState<{ id: string; name: string }[]>([]);
  const [major, setMajor] = useState("");
  const [job, setJob] = useState("");
  const [certificationId, setCertificationId] = useState("");
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/certs"), fetch("/api/admin/meta")]).then(async ([c, m]) => {
      const cd = await c.json();
      const md = await m.json();
      setCerts(cd.certifications || []);
      setMajors(md.majors || []);
      setJobs(md.jobFields || []);
    });
  }, []);

  const certOptions = useMemo(
    () => certs.map((c) => ({ value: c.id, label: c.name, keywords: c.organization })),
    [certs]
  );
  const majorOptions = useMemo(
    () => majors.map((m) => ({ value: m.name, label: m.name })),
    [majors]
  );
  const jobOptions = useMemo(
    () => jobs.map((j) => ({ value: j.name, label: j.name })),
    [jobs]
  );

  async function diagnose(e?: React.FormEvent) {
    e?.preventDefault();
    if (!major.trim() && !job.trim()) {
      setResult({
        message: "",
        count: 0,
        eligibleCertifications: [],
        specific: null,
        error: "전공 또는 직무 분야를 입력하세요.",
      });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ major, job, certificationId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setResult({
        message: "",
        count: 0,
        eligibleCertifications: [],
        specific: null,
        error: data.error || "조회에 실패했습니다.",
      });
      return;
    }
    setResult(data);
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">응시자격 자가진단</h1>
      <p className="page-desc">
        전공·직무를 입력하면 응시 가능한 자격 목록을 보여 줍니다. 특정 종목을 선택하면 해당 자격만 따로 확인할 수도 있습니다.
      </p>
      <form className="card-panel" onSubmit={diagnose}>
        <div className="field">
          <label>전공 (검색 또는 직접 입력)</label>
          <SearchSelect
            options={majorOptions}
            value={major}
            onChange={setMajor}
            placeholder="예: 컴퓨터공학"
            allowCustom
          />
        </div>
        <div className="field">
          <label>직무 분야 (검색 또는 직접 입력)</label>
          <SearchSelect
            options={jobOptions}
            value={job}
            onChange={setJob}
            placeholder="예: 소프트웨어개발"
            allowCustom
          />
        </div>
        <div className="field">
          <label>특정 종목 확인 (선택)</label>
          <SearchSelect
            options={certOptions}
            value={certificationId}
            onChange={setCertificationId}
            placeholder="비워두면 전체 추천 목록만 표시"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "조회 중..." : "응시 가능 자격 보기"}
        </button>
      </form>

      {result?.error && (
        <p className="card-panel" style={{ marginTop: "1rem", color: "var(--danger)" }}>
          {result.error}
        </p>
      )}

      {result && !result.error && (
        <>
          {result.specific && (
            <div
              className="card-panel"
              style={{
                marginTop: "1rem",
                borderColor: result.specific.eligible ? "var(--ok)" : "var(--warn)",
              }}
            >
              <strong style={{ color: result.specific.eligible ? "var(--ok)" : "var(--warn)" }}>
                {result.specific.eligible ? "선택 종목: 충족 가능" : "선택 종목: 미충족 가능"}
              </strong>
              <p style={{ margin: "0.5rem 0 0", lineHeight: 1.6 }}>{result.specific.message}</p>
            </div>
          )}

          <section className="card-panel" style={{ marginTop: "1rem" }}>
            <h2 style={{ marginTop: 0, color: "var(--navy)", fontSize: "1.1rem" }}>
              응시 가능 자격 목록
            </h2>
            <p style={{ margin: "0 0 1rem", color: "var(--muted)" }}>{result.message}</p>

            {result.eligibleCertifications.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                일치하는 자격이 없습니다.{" "}
                <Link href="/chat" style={{ color: "var(--teal)" }}>
                  관리자에게 문의
                </Link>
                해 보세요.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {result.eligibleCertifications.map((c) => (
                  <article
                    key={c.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "0.75rem",
                      padding: "0.9rem 1rem",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--navy)", fontSize: "1.05rem" }}>{c.name}</strong>
                        <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
                          {c.organization}
                        </p>
                        <p style={{ margin: "0.45rem 0 0", fontSize: "0.85rem" }}>
                          {c.majorMatch && <span className="badge badge-ok">전공 일치</span>}{" "}
                          {c.jobMatch && <span className="badge badge-ok">직무 일치</span>}
                        </p>
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "var(--muted)" }}>
                          응시자격: {c.eligibility}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <Link href={`/certifications/${c.id}`} className="btn btn-ghost" style={{ padding: "0.45rem 0.75rem" }}>
                          상세
                        </Link>
                        <Link href={`/apply?cert=${c.id}`} className="btn btn-primary" style={{ padding: "0.45rem 0.75rem" }}>
                          원서 접수
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
