"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Certification } from "@/lib/types";

export default function CertificationsPage() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [orgs, setOrgs] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [org, setOrg] = useState("");
  const [job, setJob] = useState("");
  const [tab, setTab] = useState<"search" | "org" | "job">("search");

  async function load(params?: { q?: string; org?: string; job?: string }) {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.org) sp.set("org", params.org);
    if (params?.job) sp.set("job", params.job);
    const res = await fetch(`/api/certs?${sp}`);
    const data = await res.json();
    setCerts(data.certifications || []);
    setOrgs(data.organizations || []);
    setJobs(data.jobFields || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">자격증 정보</h1>
      <p className="page-desc">검색, 주관교육기관별, 직무능력별로 자격증을 확인할 수 있습니다.</p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          ["search", "검색"],
          ["org", "주관교육기관별"],
          ["job", "직무능력별"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`btn ${tab === k ? "btn-primary" : "btn-ghost"}`}
            onClick={() => {
              setTab(k as typeof tab);
              setQ("");
              setOrg("");
              setJob("");
              load();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card-panel" style={{ marginBottom: "1rem" }}>
        {tab === "search" && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              style={{ flex: 1, minWidth: 200, padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid var(--line)" }}
              placeholder="자격증명, 기관명 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn btn-accent" onClick={() => load({ q })}>
              검색
            </button>
          </div>
        )}
        {tab === "org" && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {orgs.map((o) => (
              <button
                key={o}
                className={`btn ${org === o ? "btn-accent" : "btn-ghost"}`}
                onClick={() => {
                  setOrg(o);
                  load({ org: o });
                }}
              >
                {o}
              </button>
            ))}
          </div>
        )}
        {tab === "job" && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {jobs.map((j) => (
              <button
                key={j}
                className={`btn ${job === j ? "btn-accent" : "btn-ghost"}`}
                onClick={() => {
                  setJob(j);
                  load({ job: j });
                }}
              >
                {j}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: "0.85rem" }}>
        {certs.map((c) => (
          <article key={c.id} className="card-panel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: "0 0 0.35rem", color: "var(--navy)" }}>{c.name}</h2>
                <p style={{ margin: 0, color: "var(--muted)" }}>주관: {c.organization}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <Link href={`/certifications/${c.id}`} className="btn btn-ghost">
                  상세보기
                </Link>
                <Link href={`/apply?cert=${c.id}`} className="btn btn-primary">
                  원서 접수
                </Link>
              </div>
            </div>
            <p style={{ margin: "0.85rem 0 0", lineHeight: 1.6 }}>{c.overview}</p>
            <p style={{ margin: "0.6rem 0 0", fontSize: "0.9rem", color: "var(--muted)" }}>
              응시자격: {c.eligibility}
            </p>
          </article>
        ))}
        {certs.length === 0 && <p className="card-panel">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
