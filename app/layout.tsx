import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "뉴트월드 5인 협동",
  description: "뉴트월드 메탈슬러그 3 · 5인 온라인 협동 개발 검증",
  other: {
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}