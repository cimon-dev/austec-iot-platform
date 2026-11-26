import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { AppProviders } from "../components/AppProviders";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "Austec Smart Home — Hệ sinh thái IoT Thông minh",
  description: "Nền tảng điều khiển nhà thông minh và quản trị thiết bị IoT Austec",
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
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased font-sans overflow-hidden" suppressHydrationWarning>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
