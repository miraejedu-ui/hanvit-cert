"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { SearchSelect } from "@/components/SearchSelect";
import type { Certification } from "@/lib/types";

export default function AdminCriteriaPage() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [form, setForm] = useState({ certificationId: "", title: "", content: "" });
  const [file, setFile] = useState<File | null>(null);
  const [list, setList] = useState<{ id: string; title: string; certificationName?: string }[]>([]);

  const certOptions = useMemo(
    () => certs.map((c) => ({ value: c.id, label: c.name, keywords: c.organization })),
    [certs]
  );

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const [c, cr] = await Promise.all([fetch("/api/certs"), fetch("/api/criteria")]);
    setCerts((await c.json()).certifications || []);
    setList((await cr.json()).criteria || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.certificationId) {
      alert("종목을 선택하세요.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("file", file);
    await fetch("/api/criteria", { method: "POST", body: fd });
    setForm({ certificationId: "", title: "", content: "" });
    setFile(null);
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">출제기준 업로드</h1>
      <AdminNav />
      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        <div className="field">
          <label>자격 종목 (검색·선택)</label>
          <SearchSelect
            options={certOptions}
            value={form.certificationId}
            onChange={(v) => setForm({ ...form, certificationId: v })}
            placeholder="종목 검색"
            required
          />
        </div>
        <div className="field">
          <label>제목</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="field">
          <label>내용</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
        </div>
        <div className="field">
          <label>파일</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <button className="btn btn-primary" type="submit">
          업로드
        </button>
      </form>
      <div className="card-panel">
        <ul>
          {list.map((c) => (
            <li key={c.id}>
              {c.title} — {c.certificationName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
