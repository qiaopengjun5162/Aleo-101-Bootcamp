import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Animal-Crossing-inspired: rounded, friendly Nunito for everything, a mono only
// for hashes/field values.
const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Private Gate Pass · 匿名凭证门禁",
  description:
    "在 Aleo 上证明「我是某发证方的 tier≥N 会员」——不暴露你是谁、具体几级、或两次到访是不是同一人。ZK 选择性披露 + 不可关联 nullifier。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh" className={`${nunito.variable} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
