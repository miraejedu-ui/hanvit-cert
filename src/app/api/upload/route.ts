import { NextResponse } from "next/server";
import { downloadUpload } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  if (!file || file.includes("..")) {
    return NextResponse.json({ error: "잘못된 경로" }, { status: 400 });
  }
  try {
    const { data, name } = await downloadUpload(file);
    const buf = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "파일 없음" }, { status: 404 });
  }
}
