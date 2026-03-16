import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "敲木鱼 - 积攒功德",
  description: "轻量解压小工具，敲木鱼积功德",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, padding: 0, fontFamily: "'PingFang SC', 'Hiragino Sans GB', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
