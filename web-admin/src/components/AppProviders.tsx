"use client";

import React from "react";
import { ThemeProvider } from "../context/ThemeContext";
import { LanguageProvider } from "../context/LanguageContext";
import { SidebarProvider } from "../context/SidebarContext";
import { AuthProvider } from "../context/AuthContext";
import { PermissionProvider } from "../context/PermissionContext";

import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SidebarProvider>
          <AuthProvider>
            <PermissionProvider>
              {children}
              <Toaster position="top-right" richColors closeButton expand={false} />
            </PermissionProvider>
          </AuthProvider>
        </SidebarProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
