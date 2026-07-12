"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

export default function AdminNoticesPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notices, setNotices] = useState<{ id: string; title: string; createdAt: string }[]>([]);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/notices").then((r) => r.json());
    setNotices(data.notices || []);
  }

  useEffect(() => {
    load();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    fd.append("content", content);
    if (file) fd.append("file", file);
    await fetch("/api/notices", { method: "POST", body: fd });
    setTitle("");
    setContent("");
    setFile(null);
    load();
  }

  return (
    <div className="container">
      <h1 className="page-title">공지 작성</h1>
      <AdminNav />
      <form className="card-panel" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        <div className="field">
          <label>제목</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="field">
          <label>내용</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>
        <div className="field">
          <label>첨부파일</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <button className="btn btn-primary" type="submit">
          등록
        </button>
      </form>
      <div className="card-panel">
        <ul>
          {notices.map((n) => (
            <li key={n.id}>
              {n.title} ({n.createdAt.slice(0, 10)})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
