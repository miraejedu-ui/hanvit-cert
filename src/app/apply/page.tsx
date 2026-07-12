"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchSelect } from "@/components/SearchSelect";
import type { Certification } from "@/lib/types";

function ApplyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preset = searchParams.get("cert") || "";
  const [certs, setCerts] = useState<Certification[]>([]);
  const [user, setUser] = useState<{ name?: string; email?: string; phone?: string; birthDate?: string } | null>(null);
  const [form, setForm] = useState({
    certificationId: preset,
    name: "",
    birthDate: "",
    phone: "",
    email: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const certOptions = useMemo(
    () =>
      certs.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.organization})`,
        keywords: `${c.name} ${c.organization} ${c.jobFields.join(" ")}`,
      })),
    [certs]
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUser(d.user);
        setForm((f) => ({
          ...f,
          certificationId: preset || f.certificationId,
          name: d.user.name || "",
          email: d.user.email || "",
          phone: d.user.phone || "",
          birthDate: d.user.birthDate || "",
        }));
      });
    fetch("/api/certs")
      .then((r) => r.json())
      .then((d) => setCerts(d.certifications || []));
  }, [preset, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.certificationId) {
      setError("종목을 검색하여 선택하세요.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("document", file);
    const res = await fetch("/api/applications", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "접수 실패");
      return;
    }
    setMessage("원서 접수가 완료되었습니다. 마이페이지에서 결과를 확인하세요.");
    setTimeout(() => router.push("/mypage"), 1000);
  }

  if (!user) return <p className="container">로그인 확인 중...</p>;

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1 className="page-title">원서 접수</h1>
      <p className="page-desc">종목은 검색해 선택하고, 나머지 정보는 직접 작성하세요.</p>
      <form className="card-panel" onSubmit={onSubmit}>
        <div className="field">
          <label>종목 (검색·선택)</label>
          <SearchSelect
            options={certOptions}
            value={form.certificationId}
            onChange={(v) => setForm({ ...form, certificationId: v })}
            placeholder="종목명·기관명으로 검색"
            required
          />
        </div>
        {(
          [
            ["name", "이름", "text"],
            ["birthDate", "생년월일", "date"],
            ["phone", "연락처(번호)", "tel"],
            ["email", "연락처(이메일)", "email"],
          ] as const
        ).map(([key, label, type]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input
              type={type}
              required
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        <div className="field">
          <label>제출서류 (선택)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {message && <p style={{ color: "var(--ok)" }}>{message}</p>}
        <button className="btn btn-primary" type="submit">
          접수하기
        </button>
      </form>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<p className="container">로딩 중...</p>}>
      <ApplyForm />
    </Suspense>
  );
}
