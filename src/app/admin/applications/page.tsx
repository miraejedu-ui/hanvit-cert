"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

type App = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  certificationName?: string;
  status: string;
  statusReason?: string;
  documentPath?: string;
  documentFileName?: string;
  createdAt: string;
};

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [list, setList] = useState<App[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/applications?all=1").then((r) => r.json());
    setList(data.applications || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function update(id: string, status: string) {
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, statusReason: reason[id] || "" }),
    });
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">원서 접수 검토</h1>
      <p className="page-desc">시험 응시 가능 / 서류 보완 / 응시 불가능 결과를 전송합니다.</p>
      <AdminNav />

      <div style={{ display: "grid", gap: "0.85rem" }}>
        {list.map((a) => (
          <article key={a.id} className="card-panel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <strong style={{ color: "var(--navy)" }}>{a.certificationName}</strong>
                <p style={{ margin: "0.35rem 0", color: "var(--muted)" }}>
                  {a.name} · {a.birthDate} · {a.phone} · {a.email}
                </p>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  상태: {a.status} {a.statusReason ? `(${a.statusReason})` : ""}
                </p>
                {a.documentPath && (
                  <a href={`/api/upload?file=${encodeURIComponent(a.documentPath)}`}>
                    서류 다운로드 ({a.documentFileName})
                  </a>
                )}
              </div>
              <div style={{ display: "grid", gap: "0.4rem", minWidth: 260 }}>
                <input
                  placeholder="사유 (보완/불가 시)"
                  value={reason[a.id] || ""}
                  onChange={(e) => setReason({ ...reason, [a.id]: e.target.value })}
                  style={{ padding: "0.55rem", borderRadius: "0.45rem", border: "1px solid var(--line)" }}
                />
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <button className="btn btn-accent" onClick={() => update(a.id, "approved")}>
                    시험 응시 가능
                  </button>
                  <button className="btn btn-warn" onClick={() => update(a.id, "supplement")}>
                    서류 미비
                  </button>
                  <button className="btn btn-danger" onClick={() => update(a.id, "rejected")}>
                    응시 불가능
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {list.length === 0 && <p className="card-panel">접수 건이 없습니다.</p>}
      </div>
    </div>
  );
}
