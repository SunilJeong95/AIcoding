import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "실습 교육",
  description: "AI 실습 교육 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
