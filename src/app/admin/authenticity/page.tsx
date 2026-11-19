"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

export default function AdminAuthenticityPage() {
  const router = useRouter();
  const [list, setList] = useState<
    { id: string; name: string; birthDate: string; phone: string; issueDate: string; certificationName: string }[]
  >([]);
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    phone: "",
    issueDate: "",
    certificationName: "",
  });

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/admin/certificates").then((r) => r.json());
    setList(data.authenticity || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "authenticity", ...form }),
    });
    setForm({ name: "", birthDate: "", phone: "", issueDate: "", certificationName: "" });
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">자격증 진위확인서 등록</h1>
      <p className="page-desc">성명, 생년월일, 번호, 발급일, 종목을 등록합니다.</p>
      <AdminNav />

      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
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
          등록
        </button>
      </form>

      <div className="card-panel">
        <table className="table">
          <thead>
            <tr>
              <th>성명</th>
              <th>생년월일</th>
              <th>번호</th>
              <th>발급일</th>
              <th>종목</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.birthDate}</td>
                <td>{r.phone}</td>
                <td>{r.issueDate}</td>
                <td>{r.certificationName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
