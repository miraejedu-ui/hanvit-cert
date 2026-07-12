"use client";

import { useState } from "react";
import Link from "next/link";

export default function VerifyPage() {
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    phone: "",
    issueDate: "",
    certificationName: "",
  });
  const [result, setResult] = useState<{ matched: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setResult(await res.json());
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1 className="page-title">자격증 진위확인</h1>
      <p className="page-desc">성명, 생년월일, 번호, 발급일, 종목을 입력해 진위를 확인합니다.</p>
      <form className="card-panel" onSubmit={onSubmit}>
        {(
          [
            ["name", "성명", "text"],
            ["birthDate", "생년월일", "date"],
            ["phone", "번호", "tel"],
            ["issueDate", "발급일", "date"],
            ["certificationName", "종목", "text"],
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
        <button className="btn btn-primary" type="submit">
          진위확인
        </button>
      </form>

      {result && (
        <div
          className="card-panel"
          style={{
            marginTop: "1rem",
            borderColor: result.matched ? "var(--ok)" : "var(--danger)",
          }}
        >
          <strong style={{ color: result.matched ? "var(--ok)" : "var(--danger)" }}>{result.message}</strong>
          {!result.matched && (
            <p style={{ margin: "0.6rem 0 0" }}>
              <Link href="/chat">관리자에게 문의하기</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
