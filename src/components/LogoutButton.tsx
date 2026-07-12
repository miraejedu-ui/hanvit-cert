"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button className="btn btn-ghost" style={{ padding: "0.45rem 0.8rem" }} onClick={logout}>
      로그아웃
    </button>
  );
}
