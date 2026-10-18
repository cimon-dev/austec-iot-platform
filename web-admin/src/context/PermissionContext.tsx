"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface PermissionMatrixItem {
  id: string; // mod_dev, mod_user, mod_cskh, mod_noti, mod_audit, mod_setting, mod_ota
  name: string;
  all: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  view: boolean;
}

export interface SystemRole {
  id: number;
  name: string;
  userCount: number;
  isSystem: boolean;
  permissions: PermissionMatrixItem[];
}

interface PermissionContextType {
  canView: (moduleId: string) => boolean;
  canCreate: (moduleId: string) => boolean;
  canUpdate: (moduleId: string) => boolean;
  canDelete: (moduleId: string) => boolean;
  hasFullAccess: boolean;
  currentRoleName: string;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<SystemRole[]>([]);

  const loadRoles = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("austec_user_roles");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoles(parsed);
            return;
          }
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    loadRoles();
    if (typeof window !== "undefined") {
      window.addEventListener("austec_roles_updated", loadRoles);
      return () => window.removeEventListener("austec_roles_updated", loadRoles);
    }
  }, []);

  // Map AuthUser role to Role Matrix Name
  const userRole = user?.role || "ADMIN";
  const hasFullAccess = userRole === "ADMIN";
  const currentRoleName = userRole === "ADMIN" ? "Administrator" : userRole === "CSKH" ? "CSKH Support" : "Customer Role";

  const getModulePerm = (moduleId: string): PermissionMatrixItem | undefined => {
    if (hasFullAccess) {
      return { id: moduleId, name: moduleId, all: true, create: true, update: true, delete: true, view: true };
    }
    const matchedRole = roles.find(r => 
      r.name.toLowerCase().includes(userRole.toLowerCase()) || 
      (userRole === "CSKH" && r.name.toLowerCase().includes("cskh"))
    );
    if (!matchedRole) {
      // Default fallback for CSKH if no custom role configured
      if (userRole === "CSKH") {
        if (moduleId === "mod_cskh") return { id: moduleId, name: moduleId, all: true, create: true, update: true, delete: false, view: true };
        if (moduleId === "mod_dev") return { id: moduleId, name: moduleId, all: false, create: false, update: false, delete: false, view: true };
        if (moduleId === "mod_noti") return { id: moduleId, name: moduleId, all: false, create: true, update: false, delete: false, view: true };
        // mod_audit, mod_user, mod_setting are forbidden for CSKH
        return { id: moduleId, name: moduleId, all: false, create: false, update: false, delete: false, view: false };
      }
      return { id: moduleId, name: moduleId, all: false, create: false, update: false, delete: false, view: false };
    }
    return matchedRole.permissions.find(p => p.id === moduleId);
  };

  const canView = (moduleId: string): boolean => {
    if (hasFullAccess) return true;
    const perm = getModulePerm(moduleId);
    return !!(perm && (perm.view || perm.all));
  };

  const canCreate = (moduleId: string): boolean => {
    if (hasFullAccess) return true;
    const perm = getModulePerm(moduleId);
    return !!(perm && (perm.create || perm.all));
  };

  const canUpdate = (moduleId: string): boolean => {
    if (hasFullAccess) return true;
    const perm = getModulePerm(moduleId);
    return !!(perm && (perm.update || perm.all));
  };

  const canDelete = (moduleId: string): boolean => {
    if (hasFullAccess) return true;
    const perm = getModulePerm(moduleId);
    return !!(perm && (perm.delete || perm.all));
  };

  return (
    <PermissionContext.Provider
      value={{
        canView,
        canCreate,
        canUpdate,
        canDelete,
        hasFullAccess,
        currentRoleName,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}
