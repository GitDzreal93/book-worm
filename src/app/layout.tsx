import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { NavBar } from "@/components/layout/NavBar";
import "./globals.css";

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookWorm · 沉浸式小说阅读器",
  description: "导入 epub 电子书，支持人物注释、双语翻译、词汇学习、阅读标注等功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={`${notoSerifSC.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
