import { 
  users, 
  properties, 
  units,
  propertyCollaborators,
  propertyNodes,
  type User, 
  type InsertUser, 
  type Property,
  type InsertProperty,
  type Unit,
  type InsertUnit,
  type PropertyCollaborator,
  type PropertyNode,
  type InsertPropertyNode,
  type PropertyNodeWithChildren
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]>;
  getDeletedPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]>;
  getPropertyById(id: number): Promise<(Property & { units: Unit[] }) | undefined>;
  getDeletedPropertyById(id: number): Promise<(Property & { units: Unit[] }) | undefined>;
  createProperty(property: InsertProperty & { ownerUserId: number; ownerOrgName?: string | null }): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;
  restoreProperty(id: number): Promise<Property | undefined>;
  permanentlyDeleteProperty(id: number): Promise<void>;
  
  getUnitsByPropertyId(propertyId: number): Promise<Unit[]>;
  getUnitById(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<void>;
  
  getCollaboratorsByPropertyId(propertyId: number): Promise<(PropertyCollaborator & { user: User })[]>;
  getSharedPropertiesForUser(userId: number): Promise<(Property & { units: Unit[]; role: string })[]>;
  addCollaborator(propertyId: number, userId: number, role: string, invitedBy: number): Promise<PropertyCollaborator>;
  removeCollaborator(propertyId: number, userId: number): Promise<void>;
  getCollaboratorRole(propertyId: number, userId: number): Promise<string | null>;
  canUserAccessProperty(propertyId: number, userId: number): Promise<{ canAccess: boolean; role: string | null; isOwner: boolean }>;
  
  getPropertyTree(propertyId: number): Promise<PropertyNodeWithChildren[]>;
  getNodeById(nodeId: number): Promise<PropertyNode | undefined>;
  createPropertyNode(node: InsertPropertyNode): Promise<PropertyNode>;
  updatePropertyNode(nodeId: number, node: Partial<InsertPropertyNode>): Promise<PropertyNode | undefined>;
  movePropertyNode(nodeId: number, parentId: number | null, sortOrder?: number): Promise<PropertyNode | undefined>;
  deletePropertyNode(nodeId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]> {
    const propertyList = await db
      .select()
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 0)))
      .orderBy(desc(properties.createdAt));
    
    const propertiesWithUnits = await Promise.all(
      propertyList.map(async (property) => {
        const propertyUnits = await db
          .select()
          .from(units)
          .where(eq(units.propertyId, property.id))
          .orderBy(units.unitName);
        return { ...property, units: propertyUnits };
      })
    );
    
    return propertiesWithUnits;
  }

  async getPropertyById(id: number): Promise<(Property & { units: Unit[] }) | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.isDeleted, 0)));
    
    if (!property) return undefined;
    
    const propertyUnits = await db
      .select()
      .from(units)
      .where(eq(units.propertyId, id))
      .orderBy(units.unitName);
    
    return { ...property, units: propertyUnits };
  }

  async createProperty(property: InsertProperty & { ownerUserId: number; ownerOrgName?: string | null }): Promise<Property> {
    const [newProperty] = await db
      .insert(properties)
      .values(property)
      .returning();
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProperty(id: number): Promise<void> {
    await db
      .update(properties)
      .set({ isDeleted: 1, updatedAt: new Date() })
      .where(eq(properties.id, id));
  }

  async getDeletedPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]> {
    const propertyList = await db
      .select()
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 1)))
      .orderBy(desc(properties.updatedAt));
    
    const propertiesWithUnits = await Promise.all(
      propertyList.map(async (property) => {
        const propertyUnits = await db
          .select()
          .from(units)
          .where(eq(units.propertyId, property.id))
          .orderBy(units.unitName);
        return { ...property, units: propertyUnits };
      })
    );
    
    return propertiesWithUnits;
  }

  async getDeletedPropertyById(id: number): Promise<(Property & { units: Unit[] }) | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.isDeleted, 1)));
    
    if (!property) return undefined;
    
    const propertyUnits = await db
      .select()
      .from(units)
      .where(eq(units.propertyId, id))
      .orderBy(units.unitName);
    
    return { ...property, units: propertyUnits };
  }

  async restoreProperty(id: number): Promise<Property | undefined> {
    const [restored] = await db
      .update(properties)
      .set({ isDeleted: 0, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return restored || undefined;
  }

  async permanentlyDeleteProperty(id: number): Promise<void> {
    await db.delete(units).where(eq(units.propertyId, id));
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getUnitsByPropertyId(propertyId: number): Promise<Unit[]> {
    return db
      .select()
      .from(units)
      .where(eq(units.propertyId, propertyId))
      .orderBy(units.unitName);
  }

  async getUnitById(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [newUnit] = await db
      .insert(units)
      .values(unit)
      .returning();
    return newUnit;
  }

  async updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined> {
    const [updated] = await db
      .update(units)
      .set({ ...unit, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUnit(id: number): Promise<void> {
    await db.delete(units).where(eq(units.id, id));
  }

  async getCollaboratorsByPropertyId(propertyId: number): Promise<(PropertyCollaborator & { user: User })[]> {
    const collaborators = await db
      .select()
      .from(propertyCollaborators)
      .where(eq(propertyCollaborators.propertyId, propertyId));
    
    const collaboratorsWithUsers = await Promise.all(
      collaborators.map(async (collab) => {
        const [user] = await db.select().from(users).where(eq(users.id, collab.userId));
        return { ...collab, user };
      })
    );
    
    return collaboratorsWithUsers;
  }

  async getSharedPropertiesForUser(userId: number): Promise<(Property & { units: Unit[]; role: string })[]> {
    const collaborations = await db
      .select()
      .from(propertyCollaborators)
      .where(eq(propertyCollaborators.userId, userId));
    
    if (collaborations.length === 0) return [];
    
    const propertyIds = collaborations.map(c => c.propertyId);
    const roleMap = new Map(collaborations.map(c => [c.propertyId, c.role]));
    
    const propertyList = await db
      .select()
      .from(properties)
      .where(and(
        inArray(properties.id, propertyIds),
        eq(properties.isDeleted, 0)
      ))
      .orderBy(desc(properties.createdAt));
    
    const propertiesWithUnits = await Promise.all(
      propertyList.map(async (property) => {
        const propertyUnits = await db
          .select()
          .from(units)
          .where(eq(units.propertyId, property.id))
          .orderBy(units.unitName);
        return { 
          ...property, 
          units: propertyUnits,
          role: roleMap.get(property.id) || 'VIEWER'
        };
      })
    );
    
    return propertiesWithUnits;
  }

  async addCollaborator(propertyId: number, userId: number, role: string, invitedBy: number): Promise<PropertyCollaborator> {
    const existing = await db
      .select()
      .from(propertyCollaborators)
      .where(and(
        eq(propertyCollaborators.propertyId, propertyId),
        eq(propertyCollaborators.userId, userId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(propertyCollaborators)
        .set({ role: role as "VIEWER" | "EDITOR" })
        .where(and(
          eq(propertyCollaborators.propertyId, propertyId),
          eq(propertyCollaborators.userId, userId)
        ))
        .returning();
      return updated;
    }
    
    const [collaborator] = await db
      .insert(propertyCollaborators)
      .values({
        propertyId,
        userId,
        role: role as "VIEWER" | "EDITOR",
        invitedBy
      })
      .returning();
    return collaborator;
  }

  async removeCollaborator(propertyId: number, userId: number): Promise<void> {
    await db
      .delete(propertyCollaborators)
      .where(and(
        eq(propertyCollaborators.propertyId, propertyId),
        eq(propertyCollaborators.userId, userId)
      ));
  }

  async getCollaboratorRole(propertyId: number, userId: number): Promise<string | null> {
    const [collab] = await db
      .select()
      .from(propertyCollaborators)
      .where(and(
        eq(propertyCollaborators.propertyId, propertyId),
        eq(propertyCollaborators.userId, userId)
      ));
    return collab?.role || null;
  }

  async canUserAccessProperty(propertyId: number, userId: number): Promise<{ canAccess: boolean; role: string | null; isOwner: boolean }> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));
    
    if (!property) {
      return { canAccess: false, role: null, isOwner: false };
    }
    
    if (property.ownerUserId === userId) {
      return { canAccess: true, role: 'OWNER', isOwner: true };
    }
    
    const role = await this.getCollaboratorRole(propertyId, userId);
    return { canAccess: role !== null, role, isOwner: false };
  }

  async getPropertyTree(propertyId: number): Promise<PropertyNodeWithChildren[]> {
    const nodes = await db
      .select()
      .from(propertyNodes)
      .where(eq(propertyNodes.propertyId, propertyId))
      .orderBy(propertyNodes.sortOrder);
    
    const nodeMap = new Map<number, PropertyNodeWithChildren>();
    const rootNodes: PropertyNodeWithChildren[] = [];
    
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    
    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      if (node.parentId === null) {
        rootNodes.push(nodeWithChildren);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(nodeWithChildren);
        } else {
          rootNodes.push(nodeWithChildren);
        }
      }
    });
    
    return rootNodes;
  }

  async getNodeById(nodeId: number): Promise<PropertyNode | undefined> {
    const [node] = await db
      .select()
      .from(propertyNodes)
      .where(eq(propertyNodes.id, nodeId));
    return node || undefined;
  }

  async createPropertyNode(node: InsertPropertyNode): Promise<PropertyNode> {
    const [newNode] = await db
      .insert(propertyNodes)
      .values(node)
      .returning();
    return newNode;
  }

  async updatePropertyNode(nodeId: number, node: Partial<InsertPropertyNode>): Promise<PropertyNode | undefined> {
    const [updated] = await db
      .update(propertyNodes)
      .set({ ...node, updatedAt: new Date() })
      .where(eq(propertyNodes.id, nodeId))
      .returning();
    return updated || undefined;
  }

  async movePropertyNode(nodeId: number, parentId: number | null, sortOrder?: number): Promise<PropertyNode | undefined> {
    const updates: Partial<PropertyNode> = { 
      parentId, 
      updatedAt: new Date() 
    };
    if (sortOrder !== undefined) {
      updates.sortOrder = sortOrder;
    }
    
    const [updated] = await db
      .update(propertyNodes)
      .set(updates)
      .where(eq(propertyNodes.id, nodeId))
      .returning();
    return updated || undefined;
  }

  async deletePropertyNode(nodeId: number): Promise<void> {
    const descendantIds = await this.getDescendantNodeIds(nodeId);
    const allIds = [nodeId, ...descendantIds];
    
    await db
      .delete(propertyNodes)
      .where(inArray(propertyNodes.id, allIds));
  }

  private async getDescendantNodeIds(nodeId: number): Promise<number[]> {
    const children = await db
      .select()
      .from(propertyNodes)
      .where(eq(propertyNodes.parentId, nodeId));
    
    const childIds = children.map(c => c.id);
    const descendantIds: number[] = [...childIds];
    
    for (const childId of childIds) {
      const childDescendants = await this.getDescendantNodeIds(childId);
      descendantIds.push(...childDescendants);
    }
    
    return descendantIds;
  }
}

export const storage = new DatabaseStorage();
