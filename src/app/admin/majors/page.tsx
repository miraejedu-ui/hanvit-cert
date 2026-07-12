"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

export default function AdminMajorsPage() {
  const router = useRouter();
  const [majors, setMajors] = useState<{ id: string; name: string; relatedJobs: string[] }[]>([]);
  const [jobs, setJobs] = useState<{ id: string; name: string; similarJobs: string[] }[]>([]);
  const [majorForm, setMajorForm] = useState({ name: "", relatedJobs: "" });
  const [jobForm, setJobForm] = useState({ name: "", similarJobs: "" });

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/admin/meta").then((r) => r.json());
    setMajors(data.majors || []);
    setJobs(data.jobFields || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function addMajor(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "major", ...majorForm }),
    });
    setMajorForm({ name: "", relatedJobs: "" });
    load();
  }

  async function addJob(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "job", ...jobForm }),
    });
    setJobForm({ name: "", similarJobs: "" });
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">응시자격 자가진단 기초정보</h1>
      <p className="page-desc">전공, 동일·유사 직무 정보를 등록합니다.</p>
      <AdminNav />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="admin-grid">
        <section className="card-panel">
          <h2 style={{ marginTop: 0 }}>전공 등록</h2>
          <form onSubmit={addMajor}>
            <div className="field">
              <label>전공명</label>
              <input value={majorForm.name} onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>관련 직무 (쉼표 구분)</label>
              <input
                value={majorForm.relatedJobs}
                onChange={(e) => setMajorForm({ ...majorForm, relatedJobs: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              등록
            </button>
          </form>
          <ul>
            {majors.map((m) => (
              <li key={m.id}>
                {m.name} — {m.relatedJobs.join(", ")}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-panel">
          <h2 style={{ marginTop: 0 }}>직무/유사직무 등록</h2>
          <form onSubmit={addJob}>
            <div className="field">
              <label>직무명</label>
              <input value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>유사 직무 (쉼표 구분)</label>
              <input
                value={jobForm.similarJobs}
                onChange={(e) => setJobForm({ ...jobForm, similarJobs: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" type="submit">
              등록
            </button>
          </form>
          <ul>
            {jobs.map((j) => (
              <li key={j.id}>
                {j.name} — {j.similarJobs.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <style>{`@media (max-width: 800px) { .admin-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
