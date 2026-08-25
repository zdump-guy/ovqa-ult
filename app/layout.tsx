import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrepPulse — Rapid AI-Powered Exam & Adaptive Quiz Engine",
  description: "Transform course materials into intensive quiz checkpoints and full mock exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-black text-white selection:bg-white selection:text-black antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
