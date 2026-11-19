import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "한빛인증평가원 | HCAI",
  description: "Hanvit Certification & Assessment Institute — 종목 정보 및 시험 응시",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        <Header />
        <main style={{ minHeight: "70vh", padding: "1.75rem 0 3rem" }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
