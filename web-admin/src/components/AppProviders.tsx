"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "../context/ThemeContext";
import { LanguageProvider } from "../context/LanguageContext";
import { SidebarProvider } from "../context/SidebarContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { PermissionProvider } from "../context/PermissionContext";
import { CustomerAuthProvider } from "../customer/context/CustomerAuthContext";
import { CustomerIoTProvider } from "../customer/context/CustomerIoTContext";
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
            <CustomerAuthProvider>
              <CustomerIoTProvider>
                <DynamicGoogleProvider>
                  <PermissionProvider>
                    {children}
                    <Toaster position="top-right" richColors closeButton expand={false} />
                  </PermissionProvider>
                </DynamicGoogleProvider>
              </CustomerIoTProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </SidebarProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
