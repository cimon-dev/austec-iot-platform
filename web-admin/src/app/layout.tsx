import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "../components/AppProviders";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "Austec IoT Platform - Modern Cloud Management",
  description: "Hệ thống Quản trị & Vận hành Thiết bị Thông minh Austec - Enterprise Grade IoT Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
