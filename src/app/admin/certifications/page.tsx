"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import type { Certification } from "@/lib/types";

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
  const [form, setForm] = useState(empty);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/certs").then((r) => r.json());
    setList(data.certifications || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/certs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        relatedMajors: form.relatedMajors.split(",").map((s) => s.trim()).filter(Boolean),
        jobFields: form.jobFields.split(",").map((s) => s.trim()).filter(Boolean),
        subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setForm(empty);
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">자격증 정보 등록</h1>
      <p className="page-desc">주관교육기관, 관련 전공, 시험과목, 합격기준, 개요, 수행직무, 진로 및 전망을 등록합니다.</p>
      <AdminNav />

      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        {(
          [
            ["name", "자격증명"],
            ["organization", "주관교육기관"],
            ["relatedMajors", "관련 전공 (쉼표)"],
            ["jobFields", "직무 분야 (쉼표)"],
            ["subjects", "시험과목 (쉼표)"],
            ["eligibility", "응시자격"],
            ["passCriteria", "합격기준"],
            ["overview", "자격개요"],
            ["duties", "수행직무"],
            ["career", "진로 및 전망"],
          ] as const
        ).map(([key, label]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            {key === "overview" || key === "duties" || key === "career" || key === "passCriteria" || key === "eligibility" ? (
              <textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
            ) : (
              <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
            )}
          </div>
        ))}
        <button className="btn btn-primary" type="submit">
          등록
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
              <tr key={c.id}>
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
