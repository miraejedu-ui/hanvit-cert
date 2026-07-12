"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    birthDate: "",
  });
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "회원가입 실패");
      return;
    }
    router.push("/mypage");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 className="page-title">회원가입</h1>
      <p className="page-desc">응시(예정)자 회원으로 가입합니다.</p>
      <form className="card-panel" onSubmit={onSubmit}>
        {(
          [
            ["email", "이메일", "email"],
            ["password", "비밀번호", "password"],
            ["name", "이름", "text"],
            ["phone", "연락처(번호)", "tel"],
            ["birthDate", "생년월일", "date"],
          ] as const
        ).map(([key, label, type]) => (
          <div className="field" key={key}>
            <label>{label}</label>
            <input
              type={type}
              required={key === "email" || key === "password" || key === "name"}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
          가입하기
        </button>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </p>
      </form>
    </div>
  );
}
