import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { 
  users, roles, permissions, rolePermissions, userRoleAssignments, properties 
} from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

export type UserPermissions = {
  global: string[];
  byProperty: Record<number, string[]>;
};

export async function getUserPermissions(userId: number): Promise<UserPermissions> {
  const result: UserPermissions = {
    global: [],
    byProperty: {},
  };

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return result;
  }

  if (user.isSuperAdmin === 1) {
    const allPermissions = await db.select({ key: permissions.key }).from(permissions);
    result.global = allPermissions.map(p => p.key);
    return result;
  }

  const assignments = await db
    .select({
      roleId: userRoleAssignments.roleId,
      propertyId: userRoleAssignments.propertyId,
      isActive: userRoleAssignments.isActive,
    })
    .from(userRoleAssignments)
    .where(and(
      eq(userRoleAssignments.userId, userId),
      eq(userRoleAssignments.isActive, 1)
    ));

  if (assignments.length === 0) {
    return result;
  }

  const roleIds = Array.from(new Set(assignments.map(a => a.roleId)));

  const rolePerms = await db
    .select({
      roleId: rolePermissions.roleId,
      permissionKey: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

  const permsByRole: Record<number, string[]> = {};
  for (const rp of rolePerms) {
    if (!permsByRole[rp.roleId]) {
      permsByRole[rp.roleId] = [];
    }
    permsByRole[rp.roleId].push(rp.permissionKey);
  }

  for (const assignment of assignments) {
    const perms = permsByRole[assignment.roleId] || [];
    
    if (assignment.propertyId === null) {
      for (const perm of perms) {
        if (!result.global.includes(perm)) {
          result.global.push(perm);
        }
      }
    } else {
      if (!result.byProperty[assignment.propertyId]) {
        result.byProperty[assignment.propertyId] = [];
      }
      for (const perm of perms) {
        if (!result.byProperty[assignment.propertyId].includes(perm)) {
          result.byProperty[assignment.propertyId].push(perm);
        }
      }
    }
  }

  return result;
}

export function hasPermission(
  userPerms: UserPermissions,
  requiredPermission: string,
  propertyId?: number
): boolean {
  if (userPerms.global.includes(requiredPermission)) {
    return true;
  }
  
  if (propertyId !== undefined && userPerms.byProperty[propertyId]) {
    return userPerms.byProperty[propertyId].includes(requiredPermission);
  }

  return false;
}

export function hasAnyPermission(
  userPerms: UserPermissions,
  requiredPermissions: string[],
  propertyId?: number
): boolean {
  return requiredPermissions.some(perm => hasPermission(userPerms, perm, propertyId));
}

export function hasAllPermissions(
  userPerms: UserPermissions,
  requiredPermissions: string[],
  propertyId?: number
): boolean {
  return requiredPermissions.every(perm => hasPermission(userPerms, perm, propertyId));
}

export function getAccessiblePropertyIds(userPerms: UserPermissions): number[] | "all" {
  if (userPerms.global.includes("property.view")) {
    return "all";
  }
  return Object.keys(userPerms.byProperty)
    .filter(pid => userPerms.byProperty[parseInt(pid)].includes("property.view"))
    .map(pid => parseInt(pid));
}

export function requirePermission(permission: string, getPropertyId?: (req: Request) => number | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userPerms = await getUserPermissions(req.user.id);
      const propertyId = getPropertyId ? getPropertyId(req) : undefined;

      if (!hasPermission(userPerms, permission, propertyId)) {
        return res.status(403).json({ 
          message: "Access denied. You don't have permission to perform this action." 
        });
      }

      (req as any).userPermissions = userPerms;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAnyPermission(permissions: string[], getPropertyId?: (req: Request) => number | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userPerms = await getUserPermissions(req.user.id);
      const propertyId = getPropertyId ? getPropertyId(req) : undefined;

      if (!hasAnyPermission(userPerms, permissions, propertyId)) {
        return res.status(403).json({ 
          message: "Access denied. You don't have permission to perform this action." 
        });
      }

      (req as any).userPermissions = userPerms;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireSuperAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user || user.isSuperAdmin !== 1) {
        return res.status(403).json({ 
          message: "Access denied. Super admin privileges required." 
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function canAccessProperty(userId: number, propertyId: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return false;
  if (user.isSuperAdmin === 1) return true;

  const property = await db.query.properties.findFirst({
    where: and(
      eq(properties.id, propertyId),
      eq(properties.ownerUserId, userId)
    ),
  });
  if (property) return true;

  const userPerms = await getUserPermissions(userId);
  return hasPermission(userPerms, "property.view", propertyId);
}

export async function filterAccessibleProperties(userId: number, propertyIds: number[]): Promise<number[]> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return [];
  if (user.isSuperAdmin === 1) return propertyIds;

  const userPerms = await getUserPermissions(userId);
  
  if (userPerms.global.includes("property.view")) {
    return propertyIds;
  }

  const ownedProperties = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(
      eq(properties.ownerUserId, userId),
      inArray(properties.id, propertyIds)
    ));

  const ownedIds = new Set(ownedProperties.map(p => p.id));

  const accessibleFromRoles = Object.keys(userPerms.byProperty)
    .map(id => parseInt(id))
    .filter(id => userPerms.byProperty[id].includes("property.view"));

  return propertyIds.filter(id => ownedIds.has(id) || accessibleFromRoles.includes(id));
}
