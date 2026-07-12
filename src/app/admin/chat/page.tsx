"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

type Room = { id: string; userName?: string; userEmail?: string; lastMessage?: string };
type Msg = { id: string; content: string; senderName?: string; isMine?: boolean; createdAt: string };

export default function AdminChatPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");

  async function loadRooms() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user || me.user.role !== "admin") {
      router.push("/login");
      return;
    }
    const data = await fetch("/api/chat").then((r) => r.json());
    setRooms(data.rooms || []);
  }

  async function loadMessages(id: string) {
    const data = await fetch(`/api/chat?roomId=${id}`).then((r) => r.json());
    setMessages(data.messages || []);
  }

  useEffect(() => {
    loadRooms();
    const t = setInterval(() => {
      loadRooms();
      if (roomId) loadMessages(roomId);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, roomId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !content.trim()) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, roomId }),
    });
    setContent("");
    loadMessages(roomId);
  }

  return (
    <div className="container">
      <h1 className="page-title">1:1 상담 관리</h1>
      <AdminNav />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1rem" }} className="chat-grid">
        <div className="card-panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>상담 목록</h2>
          {rooms.map((r) => (
            <button
              key={r.id}
              className="btn btn-ghost"
              style={{ width: "100%", marginBottom: "0.4rem", justifyContent: "flex-start", textAlign: "left" }}
              onClick={() => {
                setRoomId(r.id);
                loadMessages(r.id);
              }}
            >
              <span>
                <strong>{r.userName}</strong>
                <br />
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{r.lastMessage || "대화 없음"}</span>
              </span>
            </button>
          ))}
          {rooms.length === 0 && <p style={{ color: "var(--muted)" }}>상담방이 없습니다.</p>}
        </div>
        <div className="card-panel" style={{ minHeight: 420, display: "flex", flexDirection: "column" }}>
          {!roomId ? (
            <p style={{ color: "var(--muted)" }}>왼쪽에서 상담을 선택하세요.</p>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: "0.5rem", marginBottom: "0.75rem" }}>
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
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {m.senderName} · {m.createdAt.slice(11, 16)}
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
              <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  style={{ flex: 1, padding: "0.7rem", borderRadius: "0.55rem", border: "1px solid var(--line)" }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  전송
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .chat-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
