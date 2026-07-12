import { NextResponse } from "next/server";
import { readDb, writeDb, uuid } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const db = await readDb();

  if (user.role === "admin" && !roomId) {
    const rooms = db.chatRooms.map((r) => {
      const u = db.users.find((x) => x.id === r.userId);
      const last = [...db.chatMessages].filter((m) => m.roomId === r.id).pop();
      return { ...r, userName: u?.name, userEmail: u?.email, lastMessage: last?.content };
    });
    return NextResponse.json({ rooms });
  }

  let room = roomId
    ? db.chatRooms.find((r) => r.id === roomId)
    : db.chatRooms.find((r) => r.userId === user.id);

  if (!room && user.role === "applicant") {
    room = { id: uuid(), userId: user.id, createdAt: new Date().toISOString() };
    db.chatRooms.push(room);
    await writeDb(db);
  }

  if (!room) return NextResponse.json({ error: "방 없음" }, { status: 404 });
  if (user.role !== "admin" && room.userId !== user.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const messages = db.chatMessages
    .filter((m) => m.roomId === room!.id)
    .map((m) => ({
      ...m,
      senderName: db.users.find((u) => u.id === m.senderId)?.name,
      isMine: m.senderId === user.id,
    }));

  return NextResponse.json({ room, messages });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const body = await req.json();
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "내용 필요" }, { status: 400 });

  const db = await readDb();
  let room = body.roomId
    ? db.chatRooms.find((r) => r.id === body.roomId)
    : db.chatRooms.find((r) => r.userId === user.id);

  if (!room && user.role === "applicant") {
    room = { id: uuid(), userId: user.id, createdAt: new Date().toISOString() };
    db.chatRooms.push(room);
  }
  if (!room) return NextResponse.json({ error: "방 없음" }, { status: 404 });
  if (user.role !== "admin" && room.userId !== user.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const message = {
    id: uuid(),
    roomId: room.id,
    senderId: user.id,
    content,
    createdAt: new Date().toISOString(),
  };
  db.chatMessages.push(message);
  await writeDb(db);
  return NextResponse.json({ message, room });
}
