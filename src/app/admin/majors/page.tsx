"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import type { EligibilityPreset } from "@/lib/types";

type JobRow = { id: string; name: string; relatedMajors: string[]; similarJobs: string[] };

export default function AdminMajorsPage() {
  const router = useRouter();
  const [majors, setMajors] = useState<{ id: string; name: string; relatedJobs: string[] }[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [presets, setPresets] = useState<EligibilityPreset[]>([]);
  const [majorForm, setMajorForm] = useState({ name: "", relatedJobs: "" });
  const [jobForm, setJobForm] = useState({ name: "", relatedMajors: "", similarJobs: "" });
  const [presetForm, setPresetForm] = useState({ name: "", content: "" });

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/admin/meta").then((r) => r.json());
    setMajors(data.majors || []);
    setJobs(
      (data.jobFields || []).map((j: JobRow) => ({
        ...j,
        relatedMajors: j.relatedMajors || [],
        similarJobs: j.similarJobs || [],
      }))
    );
    setPresets(data.eligibilityPresets || []);
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
    setJobForm({ name: "", relatedMajors: "", similarJobs: "" });
    load();
  }

  async function addPreset(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "eligibilityPreset", ...presetForm }),
    });
    setPresetForm({ name: "", content: "" });
    load();
  }

  async function removePreset(id: string) {
    if (!confirm("이 응시자격 기본 세트를 삭제할까요?")) return;
    await fetch(`/api/admin/meta?type=eligibilityPreset&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">기본 정보</h1>
      <p className="page-desc">
        전공·직무(직무별 관련 전공)·유사직무와 응시자격 기본 세트를 등록합니다. 종목 등록에서도 기본 세트를 선택할 수
        있습니다.
      </p>
      <AdminNav />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="admin-grid">
        <section className="card-panel">
          <h2 style={{ marginTop: 0 }}>전공 등록</h2>
          <form onSubmit={addMajor}>
            <div className="field">
              <label>전공명</label>
              <input
                value={majorForm.name}
                onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>관련 직무 (쉼표 구분)</label>
              <input
                value={majorForm.relatedJobs}
                onChange={(e) => setMajorForm({ ...majorForm, relatedJobs: e.target.value })}
                placeholder="예: 경영관리, 마케팅"
              />
            </div>
            <button className="btn btn-primary" type="submit">
              등록
            </button>
          </form>
          <ul>
            {majors.map((m) => (
              <li key={m.id}>
                <strong>{m.name}</strong> — 관련 직무: {m.relatedJobs.join(", ") || "-"}
              </li>
            ))}
          </ul>
        </section>

        <section className="card-panel">
          <h2 style={{ marginTop: 0 }}>직무 등록</h2>
          <form onSubmit={addJob}>
            <div className="field">
              <label>직무명</label>
              <input
                value={jobForm.name}
                onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                required
                placeholder="예: 경영관리"
              />
            </div>
            <div className="field">
              <label>관련 전공 (쉼표 구분)</label>
              <input
                value={jobForm.relatedMajors}
                onChange={(e) => setJobForm({ ...jobForm, relatedMajors: e.target.value })}
                placeholder="예: E비즈니스, 패션비즈니스, 국제사무"
              />
            </div>
            <div className="field">
              <label>유사 직무 (쉼표 구분)</label>
              <input
                value={jobForm.similarJobs}
                onChange={(e) => setJobForm({ ...jobForm, similarJobs: e.target.value })}
                placeholder="예: 마케팅, 유통물류무역"
              />
            </div>
            <button className="btn btn-primary" type="submit">
              등록
            </button>
          </form>
          <ul>
            {jobs.map((j) => (
              <li key={j.id} style={{ marginBottom: "0.65rem" }}>
                <strong>{j.name}</strong>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                  전공: {j.relatedMajors.join(", ") || "-"}
                  <br />
                  유사직무: {j.similarJobs.join(", ") || "-"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card-panel" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>응시자격 기본 세트</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          종목 등록·수정 시 선택할 수 있는 응시자격 문구 템플릿입니다.
        </p>
        <form onSubmit={addPreset}>
          <div className="field">
            <label>세트 이름</label>
            <input
              value={presetForm.name}
              onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
              placeholder="예: F유형 / 기능사 공통"
              required
            />
          </div>
          <div className="field">
            <label>응시자격 내용</label>
            <textarea
              value={presetForm.content}
              onChange={(e) => setPresetForm({ ...presetForm, content: e.target.value })}
              required
              rows={5}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            등록
          </button>
        </form>
        <ul style={{ marginTop: "1rem" }}>
          {presets.map((p) => (
            <li key={p.id} style={{ marginBottom: "0.75rem" }}>
              <strong>{p.name}</strong>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  margin: "0.35rem 0",
                  color: "var(--muted)",
                  fontSize: "0.9rem",
                }}
              >
                {p.content}
              </pre>
              <button type="button" className="btn" onClick={() => removePreset(p.id)} style={{ fontSize: "0.85rem" }}>
                삭제
              </button>
            </li>
          ))}
          {presets.length === 0 && <li style={{ color: "var(--muted)" }}>등록된 세트가 없습니다.</li>}
        </ul>
      </section>

      <style>{`@media (max-width: 800px) { .admin-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
