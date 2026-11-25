"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "../context/ThemeContext";
import { LanguageProvider } from "../context/LanguageContext";
import { SidebarProvider } from "../context/SidebarContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { PermissionProvider } from "../context/PermissionContext";
import { Toaster } from "sonner";

function DynamicGoogleProvider({ children }: { children: React.ReactNode }) {
  const { authConfig } = useAuth();
  const clientId = authConfig.googleWebClientId;

  if (!clientId) {
    return <>{children}</>;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SidebarProvider>
          <AuthProvider>
            <DynamicGoogleProvider>
              <PermissionProvider>
                {children}
                <Toaster position="top-right" richColors closeButton expand={false} />
              </PermissionProvider>
            </DynamicGoogleProvider>
          </AuthProvider>
        </SidebarProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
