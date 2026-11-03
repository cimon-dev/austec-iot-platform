import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "../components/AppProviders";
import { AppShell } from "../components/AppShell";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Austec IoT Platform - Modern Cloud Management",
  description: "Hệ thống Quản trị & Vận hành Thiết bị Thông minh Austec - Enterprise Grade IoT Platform",
  icons: {
    icon: "/logo-app.webp",
    shortcut: "/logo-app.webp",
    apple: "/logo-app.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased font-sans`} suppressHydrationWarning>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
