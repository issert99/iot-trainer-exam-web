import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知测 · 多专业智能考试平台",
  description: "公平、可信的多专业智能考试平台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
