"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { SearchSelect } from "@/components/SearchSelect";
import type { Certification, EligibilityPreset } from "@/lib/types";

const empty = {
  name: "",
  organization: "",
  relatedMajors: "",
  jobFields: "",
  subjects: "",
  passCriteria: "",
  overview: "",
  duties: "",
  career: "",
  eligibility: "",
};

export default function AdminCertsPage() {
  const router = useRouter();
  const [list, setList] = useState<Certification[]>([]);
  const [presets, setPresets] = useState<EligibilityPreset[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState("");

  const presetOptions = useMemo(
    () => [
      { value: "", label: "직접 입력 (커스텀)" },
      ...presets.map((p) => ({ value: p.id, label: p.name, keywords: p.content.slice(0, 80) })),
    ],
    [presets]
  );

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const [certsRes, metaRes] = await Promise.all([fetch("/api/certs"), fetch("/api/admin/meta")]);
    setList((await certsRes.json()).certifications || []);
    setPresets((await metaRes.json()).eligibilityPresets || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  function loadIntoForm(c: Certification) {
    setEditId(c.id);
    setPresetId("");
    setForm({
      name: c.name,
      organization: c.organization,
      relatedMajors: c.relatedMajors.join(", "),
      jobFields: c.jobFields.join(", "),
      subjects: c.subjects.join(", "),
      passCriteria: c.passCriteria,
      overview: c.overview,
      duties: c.duties,
      career: c.career,
      eligibility: c.eligibility,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditId(null);
    setPresetId("");
    setForm(empty);
  }

  function onPresetChange(id: string) {
    setPresetId(id);
    if (!id) return;
    const preset = presets.find((p) => p.id === id);
    if (preset) setForm((f) => ({ ...f, eligibility: preset.content }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      relatedMajors: form.relatedMajors.split(",").map((s) => s.trim()).filter(Boolean),
      jobFields: form.jobFields.split(",").map((s) => s.trim()).filter(Boolean),
      subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
    };
    if (editId) {
      await fetch("/api/certs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...payload }),
      });
    } else {
      await fetch("/api/certs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">자격증 정보 등록</h1>
      <p className="page-desc">
        주관교육기관, 관련 전공, 시험과목, 합격기준, 개요, 수행직무, 진로 및 전망을 등록합니다.
        목록 항목을 클릭하면 수정할 수 있습니다.
      </p>
      <AdminNav />

      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        {editId && (
          <p style={{ marginTop: 0, color: "var(--teal)" }}>
            수정 모드 —{" "}
            <button type="button" className="btn" onClick={resetForm} style={{ fontSize: "0.85rem" }}>
              새 등록으로 전환
            </button>
          </p>
        )}
        {(
          [
            ["name", "자격증명"],
            ["organization", "주관교육기관"],
            ["relatedMajors", "관련 전공 (쉼표)"],
            ["jobFields", "직무 분야 (쉼표)"],
            ["subjects", "시험과목 (쉼표)"],
            ["passCriteria", "합격기준"],
            ["overview", "자격개요"],
            ["duties", "수행직무"],
            ["career", "진로 및 전망"],
          ] as const
        ).map(([key, label]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            {key === "overview" || key === "duties" || key === "career" || key === "passCriteria" ? (
              <textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
            ) : (
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
            )}
          </div>
        ))}

        <div className="field">
          <label>응시자격 기본 세트 (선택 시 내용 채움)</label>
          <SearchSelect
            options={presetOptions}
            value={presetId}
            onChange={(v) => onPresetChange(v)}
            placeholder="기본 세트 검색·선택 또는 직접 입력"
            allowCustom={false}
          />
        </div>
        <div className="field">
          <label>응시자격</label>
          <textarea
            value={form.eligibility}
            onChange={(e) => {
              setPresetId("");
              setForm({ ...form, eligibility: e.target.value });
            }}
            required
            rows={5}
          />
        </div>

        <button className="btn btn-primary" type="submit">
          {editId ? "수정 저장" : "등록"}
        </button>
      </form>

      <div className="card-panel">
        <table className="table">
          <thead>
            <tr>
              <th>자격증</th>
              <th>주관</th>
              <th>직무</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr
                key={c.id}
                onClick={() => loadIntoForm(c)}
                style={{ cursor: "pointer", background: editId === c.id ? "var(--teal-soft)" : undefined }}
              >
                <td>{c.name}</td>
                <td>{c.organization}</td>
                <td>{c.jobFields.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
