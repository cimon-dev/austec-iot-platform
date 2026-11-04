"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getApiBaseUrl } from "./apiConfig";

export interface PermissionMatrixItem {
  id: string; // mod_dash, mod_dev, mod_ota, mod_user, mod_customer, mod_cskh, mod_noti, mod_audit, mod_store, mod_guide, mod_setting
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
  roleCode?: string;
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
  roles: SystemRole[];
  refreshRoles: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<SystemRole[]>([]);

  const fetchRolesFromApi = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.roles) && data.roles.length > 0) {
        setRoles(data.roles);
        if (typeof window !== "undefined") {
          localStorage.setItem("austec_user_roles", JSON.stringify(data.roles));
        }
      }
    } catch (e) {
      console.warn("[PermissionContext] Lỗi đồng bộ vai trò từ API:", e);
    }
  }, []);

  const loadLocalRoles = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("austec_user_roles");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoles(parsed);
          }
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    loadLocalRoles();
    fetchRolesFromApi();

    const handleUpdate = () => {
      loadLocalRoles();
      fetchRolesFromApi();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("austec_roles_updated", handleUpdate);
      return () => window.removeEventListener("austec_roles_updated", handleUpdate);
    }
  }, [loadLocalRoles, fetchRolesFromApi]);

  // Determine user permissions based on user role and database configuration
  const userRole = (user?.role || "ADMIN").toUpperCase();
  const hasFullAccess = userRole === "ADMIN";

  const matchedRole = roles.find(r => {
    const code = (r.roleCode || "").toUpperCase();
    const name = (r.name || "").toUpperCase();
    if (userRole === "ADMIN" && (code === "ROLE_ADMIN" || name.includes("ADMINISTRATOR"))) return true;
    if (userRole === "CSKH" && (code === "ROLE_CSKH" || name.includes("CSKH"))) return true;
    if (code === `ROLE_${userRole}` || name === userRole) return true;
    return false;
  });

  const currentRoleName = matchedRole?.name || (userRole === "ADMIN" ? "Administrator" : userRole === "CSKH" ? "CSKH Support" : "Customer");

  const getModulePerm = (moduleId: string): PermissionMatrixItem | undefined => {
    if (hasFullAccess) {
      return { id: moduleId, name: moduleId, all: true, create: true, update: true, delete: true, view: true };
    }
    if (!matchedRole) {
      return undefined;
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
        roles,
        refreshRoles: fetchRolesFromApi,
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
