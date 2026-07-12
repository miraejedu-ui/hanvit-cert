"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

export default function AdminCertificatesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<
    { id: string; userId: string; userName?: string; certificationId: string; certificationName?: string; status: string }[]
  >([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [certs, setCerts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    userId: "",
    certificationId: "",
    name: "",
    birthDate: "",
    phone: "",
    issueDate: "",
    certType: "pass",
    requestId: "",
  });
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const [c, certsRes] = await Promise.all([
      fetch("/api/admin/certificates"),
      fetch("/api/certs"),
    ]);
    const cd = await c.json();
    setRequests(cd.requests || []);
    setCerts((await certsRes.json()).certifications || []);
    // users from requests + we don't have user list API; derive from requests
    const uniq = new Map<string, string>();
    (cd.requests || []).forEach((r: { userId: string; userName?: string }) => {
      if (r.userId) uniq.set(r.userId, r.userName || r.userId);
    });
    setUsers([...uniq.entries()].map(([id, name]) => ({ id, name })));
  }

  useEffect(() => {
    load();
  }, [router]);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("action", "issue");
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("file", file);
    await fetch("/api/admin/certificates", { method: "POST", body: fd });
    alert("합격증/수료증이 전송(등록)되었습니다.");
    setFile(null);
    load();
  }

  function fillFromRequest(r: {
    id: string;
    userId: string;
    userName?: string;
    certificationId: string;
  }) {
    setForm((f) => ({
      ...f,
      requestId: r.id,
      userId: r.userId,
      certificationId: r.certificationId,
      name: r.userName || "",
    }));
  }

  return (
    <div className="container">
      <h1 className="page-title">합격증·수료증 전송</h1>
      <p className="page-desc">합격자에게 합격증 및 수료증을 수동 전송합니다.</p>
      <AdminNav />

      <section className="card-panel" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>발급 신청 목록</h2>
        <ul>
          {requests.map((r) => (
            <li key={r.id} style={{ marginBottom: "0.45rem" }}>
              {r.userName} — {r.certificationName} ({r.status}){" "}
              {r.status === "pending" && (
                <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={() => fillFromRequest(r)}>
                  선택
                </button>
              )}
            </li>
          ))}
          {requests.length === 0 && <li>신청 없음</li>}
        </ul>
      </section>

      <form className="card-panel" onSubmit={issue}>
        <div className="field">
          <label>대상 사용자 ID</label>
          <input
            list="users"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            required
          />
          <datalist id="users">
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </datalist>
        </div>
        <div className="field">
          <label>종목</label>
          <select
            required
            value={form.certificationId}
            onChange={(e) => setForm({ ...form, certificationId: e.target.value })}
          >
            <option value="">선택</option>
            {certs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {(
          [
            ["name", "성명", "text"],
            ["birthDate", "생년월일", "date"],
            ["phone", "번호", "tel"],
            ["issueDate", "발급일", "date"],
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
          <label>유형</label>
          <select value={form.certType} onChange={(e) => setForm({ ...form, certType: e.target.value })}>
            <option value="pass">합격증</option>
            <option value="completion">수료증</option>
            <option value="license">자격증</option>
          </select>
        </div>
        <div className="field">
          <label>파일 첨부</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <input type="hidden" value={form.requestId} />
        <button className="btn btn-primary" type="submit">
          전송(등록)
        </button>
      </form>
    </div>
  );
}
