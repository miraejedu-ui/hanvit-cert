"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { id: string; content: string; senderName?: string; isMine?: boolean; createdAt: string };

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");
  const [roomId, setRoomId] = useState("");

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    if (me.user.role === "admin") {
      router.push("/admin/chat");
      return;
    }
    const data = await fetch("/api/chat").then((r) => r.json());
    setMessages(data.messages || []);
    setRoomId(data.room?.id || "");
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, roomId }),
    });
    setContent("");
    load();
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">관리자 1:1 상담</h1>
      <p className="page-desc">응시 관련 문의 사항을 남겨 주세요.</p>
      <div className="card-panel" style={{ minHeight: 360, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: "0.5rem" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                justifySelf: m.isMine ? "end" : "start",
                maxWidth: "80%",
                background: m.isMine ? "var(--teal-soft)" : "#eef2f6",
                padding: "0.65rem 0.8rem",
                borderRadius: "0.75rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.2rem" }}>
                {m.senderName} · {m.createdAt.slice(11, 16)}
              </div>
              {m.content}
            </div>
          ))}
          {messages.length === 0 && <p style={{ color: "var(--muted)" }}>아직 대화가 없습니다.</p>}
        </div>
        <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            style={{ flex: 1, padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid var(--line)" }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="메시지를 입력하세요"
          />
          <button className="btn btn-primary" type="submit">
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
