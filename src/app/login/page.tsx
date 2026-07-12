"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "로그인 실패");
      return;
    }
    router.push(data.user.role === "admin" ? "/admin" : "/mypage");
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <h1 className="page-title">로그인</h1>
      <p className="page-desc">원서 접수 및 시험 응시를 위해 로그인해 주세요.</p>
      <form className="card-panel" onSubmit={onSubmit}>
        <div className="field">
          <label>아이디</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="text"
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label>비밀번호</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "처리 중..." : "로그인"}
        </button>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          계정이 없나요? <Link href="/register">회원가입</Link>
        </p>
      </form>
    </div>
  );
}
