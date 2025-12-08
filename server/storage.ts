import { 
  users, 
  properties, 
  units,
  propertyCollaborators,
  propertyNodes,
  maintenanceTeamMembers,
  maintenanceMemberSkills,
  maintenanceMaterials,
  maintenanceIssues,
  maintenanceTasks,
  maintenanceTaskActivity,
  maintenanceTaskMaterials,
  maintenanceSchedules,
  type User, 
  type InsertUser, 
  type Property,
  type InsertProperty,
  type Unit,
  type InsertUnit,
  type PropertyCollaborator,
  type PropertyNode,
  type InsertPropertyNode,
  type PropertyNodeWithChildren,
  type MaintenanceTeamMember,
  type InsertMaintenanceTeamMember,
  type MaintenanceMemberSkill,
  type MaintenanceMaterial,
  type InsertMaintenanceMaterial,
  type MaintenanceIssue,
  type InsertMaintenanceIssue,
  type MaintenanceTask,
  type InsertMaintenanceTask,
  type MaintenanceTaskActivity,
  type MaintenanceSchedule,
  type InsertMaintenanceSchedule,
  type TeamMemberWithSkills,
  type IssueWithDetails,
  type TaskWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, isNull } from "drizzle-orm";
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
  updateProperty(id: number, property: Partial<InsertProperty> & { images?: string[] }): Promise<Property | undefined>;
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
  
  // Maintenance Team Members
  getTeamMembersByPropertyId(propertyId: number): Promise<TeamMemberWithSkills[]>;
  getTeamMemberById(id: number): Promise<TeamMemberWithSkills | undefined>;
  createTeamMember(member: InsertMaintenanceTeamMember, skills?: string[]): Promise<TeamMemberWithSkills>;
  updateTeamMember(id: number, member: Partial<InsertMaintenanceTeamMember>, skills?: string[]): Promise<TeamMemberWithSkills | undefined>;
  deleteTeamMember(id: number): Promise<void>;
  
  // Maintenance Materials
  getMaterialsByPropertyId(propertyId: number): Promise<MaintenanceMaterial[]>;
  getMaterialById(id: number): Promise<MaintenanceMaterial | undefined>;
  createMaterial(material: InsertMaintenanceMaterial): Promise<MaintenanceMaterial>;
  updateMaterial(id: number, material: Partial<InsertMaintenanceMaterial>): Promise<MaintenanceMaterial | undefined>;
  deleteMaterial(id: number): Promise<void>;
  adjustMaterialStock(id: number, quantityChange: number): Promise<MaintenanceMaterial | undefined>;
  getLowStockMaterials(propertyId: number): Promise<MaintenanceMaterial[]>;
  
  // Maintenance Issues
  getIssuesByPropertyId(propertyId: number): Promise<IssueWithDetails[]>;
  getIssueById(id: number): Promise<IssueWithDetails | undefined>;
  createIssue(issue: InsertMaintenanceIssue & { reportedByUserId: number }): Promise<MaintenanceIssue>;
  updateIssue(id: number, issue: Partial<MaintenanceIssue>): Promise<MaintenanceIssue | undefined>;
  assignIssue(issueId: number, memberId: number | null): Promise<MaintenanceIssue | undefined>;
  updateIssueStatus(issueId: number, status: string, resolutionNotes?: string): Promise<MaintenanceIssue | undefined>;
  deleteIssue(id: number): Promise<void>;
  
  // Maintenance Tasks
  getTasksByPropertyId(propertyId: number): Promise<TaskWithDetails[]>;
  getTasksByIssueId(issueId: number): Promise<MaintenanceTask[]>;
  getTaskById(id: number): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertMaintenanceTask & { requestedByUserId: number }): Promise<MaintenanceTask>;
  updateTask(id: number, task: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined>;
  assignTask(taskId: number, memberId: number | null): Promise<MaintenanceTask | undefined>;
  updateTaskStatus(taskId: number, status: string, userId: number): Promise<MaintenanceTask | undefined>;
  approveTask(taskId: number, userId: number): Promise<MaintenanceTask | undefined>;
  deleteTask(id: number): Promise<void>;
  addTaskActivity(taskId: number, userId: number, activityType: string, payload?: Record<string, unknown>): Promise<MaintenanceTaskActivity>;
  getTaskActivities(taskId: number): Promise<MaintenanceTaskActivity[]>;
  
  // Maintenance Schedules
  getSchedulesByPropertyId(propertyId: number): Promise<MaintenanceSchedule[]>;
  getScheduleById(id: number): Promise<MaintenanceSchedule | undefined>;
  createSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule>;
  updateSchedule(id: number, schedule: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule | undefined>;
  deleteSchedule(id: number): Promise<void>;
  runSchedule(scheduleId: number, requestedByUserId: number): Promise<MaintenanceTask>;
  getUpcomingSchedules(propertyId?: number): Promise<MaintenanceSchedule[]>;
  
  // Dashboard Stats
  getMaintenanceStats(propertyId?: number): Promise<{
    openIssues: number;
    inProgressTasks: number;
    overdueTasks: number;
    completedThisMonth: number;
    lowStockMaterials: number;
  }>;
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

  async updateProperty(id: number, property: Partial<InsertProperty> & { images?: string[] }): Promise<Property | undefined> {
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
    let sortOrder = node.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const siblings = await db
        .select()
        .from(propertyNodes)
        .where(
          node.parentId === null || node.parentId === undefined
            ? and(eq(propertyNodes.propertyId, node.propertyId), isNull(propertyNodes.parentId))
            : eq(propertyNodes.parentId, node.parentId)
        );
      const maxSort = siblings.reduce((max, s) => Math.max(max, s.sortOrder), -1);
      sortOrder = maxSort + 1;
    }
    
    const [newNode] = await db
      .insert(propertyNodes)
      .values({ ...node, sortOrder })
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
    const existingNode = await this.getNodeById(nodeId);
    if (!existingNode) return undefined;
    
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const siblings = await db
        .select()
        .from(propertyNodes)
        .where(
          parentId === null
            ? and(eq(propertyNodes.propertyId, existingNode.propertyId), isNull(propertyNodes.parentId))
            : eq(propertyNodes.parentId, parentId)
        );
      const maxSort = siblings.filter(s => s.id !== nodeId).reduce((max, s) => Math.max(max, s.sortOrder), -1);
      finalSortOrder = maxSort + 1;
    }
    
    const [updated] = await db
      .update(propertyNodes)
      .set({ parentId, sortOrder: finalSortOrder, updatedAt: new Date() })
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

  // =====================================================
  // MAINTENANCE TEAM MEMBERS
  // =====================================================

  async getTeamMembersByPropertyId(propertyId: number): Promise<TeamMemberWithSkills[]> {
    const members = await db
      .select()
      .from(maintenanceTeamMembers)
      .where(eq(maintenanceTeamMembers.propertyId, propertyId))
      .orderBy(maintenanceTeamMembers.createdAt);
    
    const membersWithSkills = await Promise.all(
      members.map(async (member) => {
        const skills = await db
          .select()
          .from(maintenanceMemberSkills)
          .where(eq(maintenanceMemberSkills.memberId, member.id));
        const [user] = await db.select().from(users).where(eq(users.id, member.userId));
        return { ...member, skills, user };
      })
    );
    
    return membersWithSkills;
  }

  async getTeamMemberById(id: number): Promise<TeamMemberWithSkills | undefined> {
    const [member] = await db
      .select()
      .from(maintenanceTeamMembers)
      .where(eq(maintenanceTeamMembers.id, id));
    
    if (!member) return undefined;
    
    const skills = await db
      .select()
      .from(maintenanceMemberSkills)
      .where(eq(maintenanceMemberSkills.memberId, id));
    const [user] = await db.select().from(users).where(eq(users.id, member.userId));
    
    return { ...member, skills, user };
  }

  async createTeamMember(member: InsertMaintenanceTeamMember, skills: string[] = []): Promise<TeamMemberWithSkills> {
    const [newMember] = await db
      .insert(maintenanceTeamMembers)
      .values(member)
      .returning();
    
    if (skills.length > 0) {
      await db.insert(maintenanceMemberSkills).values(
        skills.map(skill => ({ memberId: newMember.id, skill: skill as any }))
      );
    }
    
    const memberSkills = await db
      .select()
      .from(maintenanceMemberSkills)
      .where(eq(maintenanceMemberSkills.memberId, newMember.id));
    const [user] = await db.select().from(users).where(eq(users.id, newMember.userId));
    
    return { ...newMember, skills: memberSkills, user };
  }

  async updateTeamMember(id: number, member: Partial<InsertMaintenanceTeamMember>, skills?: string[]): Promise<TeamMemberWithSkills | undefined> {
    const [updated] = await db
      .update(maintenanceTeamMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(maintenanceTeamMembers.id, id))
      .returning();
    
    if (!updated) return undefined;
    
    if (skills !== undefined) {
      await db.delete(maintenanceMemberSkills).where(eq(maintenanceMemberSkills.memberId, id));
      if (skills.length > 0) {
        await db.insert(maintenanceMemberSkills).values(
          skills.map(skill => ({ memberId: id, skill: skill as any }))
        );
      }
    }
    
    return this.getTeamMemberById(id);
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(maintenanceMemberSkills).where(eq(maintenanceMemberSkills.memberId, id));
    await db.delete(maintenanceTeamMembers).where(eq(maintenanceTeamMembers.id, id));
  }

  // =====================================================
  // MAINTENANCE MATERIALS
  // =====================================================

  async getMaterialsByPropertyId(propertyId: number): Promise<MaintenanceMaterial[]> {
    return db
      .select()
      .from(maintenanceMaterials)
      .where(eq(maintenanceMaterials.propertyId, propertyId))
      .orderBy(maintenanceMaterials.name);
  }

  async getMaterialById(id: number): Promise<MaintenanceMaterial | undefined> {
    const [material] = await db
      .select()
      .from(maintenanceMaterials)
      .where(eq(maintenanceMaterials.id, id));
    return material || undefined;
  }

  async createMaterial(material: InsertMaintenanceMaterial): Promise<MaintenanceMaterial> {
    const [newMaterial] = await db
      .insert(maintenanceMaterials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: number, material: Partial<InsertMaintenanceMaterial>): Promise<MaintenanceMaterial | undefined> {
    const [updated] = await db
      .update(maintenanceMaterials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(maintenanceMaterials.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMaterial(id: number): Promise<void> {
    await db.delete(maintenanceMaterials).where(eq(maintenanceMaterials.id, id));
  }

  async adjustMaterialStock(id: number, quantityChange: number): Promise<MaintenanceMaterial | undefined> {
    const material = await this.getMaterialById(id);
    if (!material) return undefined;
    
    const currentQuantity = parseFloat(material.quantityOnHand || "0");
    const newQuantity = currentQuantity + quantityChange;
    
    // Guard against negative stock
    if (newQuantity < 0) {
      throw new Error(`Cannot reduce stock below zero. Current: ${currentQuantity}, Requested change: ${quantityChange}`);
    }
    
    return this.updateMaterial(id, { quantityOnHand: newQuantity.toString() } as any);
  }

  async getLowStockMaterials(propertyId: number): Promise<MaintenanceMaterial[]> {
    const materials = await this.getMaterialsByPropertyId(propertyId);
    return materials.filter(m => 
      parseFloat(m.quantityOnHand || "0") <= parseFloat(m.reorderThreshold || "5")
    );
  }

  // =====================================================
  // MAINTENANCE ISSUES
  // =====================================================

  async getIssuesByPropertyId(propertyId: number): Promise<IssueWithDetails[]> {
    const issues = await db
      .select()
      .from(maintenanceIssues)
      .where(eq(maintenanceIssues.propertyId, propertyId))
      .orderBy(desc(maintenanceIssues.createdAt));
    
    const issuesWithDetails = await Promise.all(
      issues.map(async (issue) => {
        const [property] = await db.select().from(properties).where(eq(properties.id, issue.propertyId));
        const assignedMember = issue.assignedToMemberId 
          ? await this.getTeamMemberById(issue.assignedToMemberId) 
          : null;
        const [reporter] = await db.select().from(users).where(eq(users.id, issue.reportedByUserId));
        return { ...issue, property, assignedMember, reporter };
      })
    );
    
    return issuesWithDetails;
  }

  async getIssueById(id: number): Promise<IssueWithDetails | undefined> {
    const [issue] = await db
      .select()
      .from(maintenanceIssues)
      .where(eq(maintenanceIssues.id, id));
    
    if (!issue) return undefined;
    
    const [property] = await db.select().from(properties).where(eq(properties.id, issue.propertyId));
    const assignedMember = issue.assignedToMemberId 
      ? await this.getTeamMemberById(issue.assignedToMemberId) 
      : null;
    const [reporter] = await db.select().from(users).where(eq(users.id, issue.reportedByUserId));
    
    return { ...issue, property, assignedMember, reporter };
  }

  async createIssue(issue: InsertMaintenanceIssue & { reportedByUserId: number }): Promise<MaintenanceIssue> {
    const [newIssue] = await db
      .insert(maintenanceIssues)
      .values(issue)
      .returning();
    return newIssue;
  }

  async updateIssue(id: number, issue: Partial<MaintenanceIssue>): Promise<MaintenanceIssue | undefined> {
    const [updated] = await db
      .update(maintenanceIssues)
      .set({ ...issue, updatedAt: new Date() })
      .where(eq(maintenanceIssues.id, id))
      .returning();
    return updated || undefined;
  }

  async assignIssue(issueId: number, memberId: number | null): Promise<MaintenanceIssue | undefined> {
    return this.updateIssue(issueId, { assignedToMemberId: memberId });
  }

  async updateIssueStatus(issueId: number, status: string, resolutionNotes?: string): Promise<MaintenanceIssue | undefined> {
    const updates: Partial<MaintenanceIssue> = { status: status as any };
    if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
    if (status === "CLOSED" || status === "RESOLVED") updates.closedAt = new Date();
    return this.updateIssue(issueId, updates);
  }

  async deleteIssue(id: number): Promise<void> {
    await db.delete(maintenanceIssues).where(eq(maintenanceIssues.id, id));
  }

  // =====================================================
  // MAINTENANCE TASKS
  // =====================================================

  async getTasksByPropertyId(propertyId: number): Promise<TaskWithDetails[]> {
    const tasks = await db
      .select()
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.propertyId, propertyId))
      .orderBy(desc(maintenanceTasks.createdAt));
    
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        const [property] = await db.select().from(properties).where(eq(properties.id, task.propertyId));
        const issue = task.issueId 
          ? (await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.id, task.issueId)))[0] 
          : null;
        const assignedMember = task.assignedToMemberId 
          ? await this.getTeamMemberById(task.assignedToMemberId) 
          : null;
        const activities = await this.getTaskActivities(task.id);
        return { ...task, property, issue, assignedMember, activities };
      })
    );
    
    return tasksWithDetails;
  }

  async getTasksByIssueId(issueId: number): Promise<MaintenanceTask[]> {
    return db
      .select()
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.issueId, issueId))
      .orderBy(desc(maintenanceTasks.createdAt));
  }

  async getTaskById(id: number): Promise<TaskWithDetails | undefined> {
    const [task] = await db
      .select()
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.id, id));
    
    if (!task) return undefined;
    
    const [property] = await db.select().from(properties).where(eq(properties.id, task.propertyId));
    const issue = task.issueId 
      ? (await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.id, task.issueId)))[0] 
      : null;
    const assignedMember = task.assignedToMemberId 
      ? await this.getTeamMemberById(task.assignedToMemberId) 
      : null;
    const activities = await this.getTaskActivities(id);
    
    return { ...task, property, issue, assignedMember, activities };
  }

  async createTask(task: InsertMaintenanceTask & { requestedByUserId: number }): Promise<MaintenanceTask> {
    const [newTask] = await db
      .insert(maintenanceTasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined> {
    const [updated] = await db
      .update(maintenanceTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return updated || undefined;
  }

  async assignTask(taskId: number, memberId: number | null): Promise<MaintenanceTask | undefined> {
    return this.updateTask(taskId, { assignedToMemberId: memberId });
  }

  async updateTaskStatus(taskId: number, status: string, userId: number): Promise<MaintenanceTask | undefined> {
    const updates: Partial<MaintenanceTask> = { status: status as any };
    if (status === "IN_PROGRESS" && !updates.startedAt) updates.startedAt = new Date();
    if (status === "COMPLETED") updates.completedAt = new Date();
    
    const updated = await this.updateTask(taskId, updates);
    if (updated) {
      await this.addTaskActivity(taskId, userId, "STATUS_CHANGE", { status });
    }
    return updated;
  }

  async approveTask(taskId: number, userId: number): Promise<MaintenanceTask | undefined> {
    const updated = await this.updateTask(taskId, {
      approvedByUserId: userId,
      approvedAt: new Date(),
      status: "COMPLETED" as any
    });
    if (updated) {
      await this.addTaskActivity(taskId, userId, "APPROVAL", { approved: true });
    }
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(maintenanceTaskActivity).where(eq(maintenanceTaskActivity.taskId, id));
    await db.delete(maintenanceTaskMaterials).where(eq(maintenanceTaskMaterials.taskId, id));
    await db.delete(maintenanceTasks).where(eq(maintenanceTasks.id, id));
  }

  async addTaskActivity(taskId: number, userId: number, activityType: string, payload: Record<string, unknown> = {}): Promise<MaintenanceTaskActivity> {
    const [activity] = await db
      .insert(maintenanceTaskActivity)
      .values({ taskId, createdByUserId: userId, activityType, payload })
      .returning();
    return activity;
  }

  async getTaskActivities(taskId: number): Promise<MaintenanceTaskActivity[]> {
    return db
      .select()
      .from(maintenanceTaskActivity)
      .where(eq(maintenanceTaskActivity.taskId, taskId))
      .orderBy(desc(maintenanceTaskActivity.createdAt));
  }

  // =====================================================
  // MAINTENANCE SCHEDULES
  // =====================================================

  async getSchedulesByPropertyId(propertyId: number): Promise<MaintenanceSchedule[]> {
    return db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.propertyId, propertyId))
      .orderBy(maintenanceSchedules.title);
  }

  async getScheduleById(id: number): Promise<MaintenanceSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
    return schedule || undefined;
  }

  async createSchedule(schedule: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const nextRunAt = this.calculateNextRunDate(schedule.cadence);
    const [newSchedule] = await db
      .insert(maintenanceSchedules)
      .values({ ...schedule, nextRunAt })
      .returning();
    return newSchedule;
  }

  async updateSchedule(id: number, schedule: Partial<InsertMaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    const updates: any = { ...schedule, updatedAt: new Date() };
    if (schedule.cadence) {
      updates.nextRunAt = this.calculateNextRunDate(schedule.cadence);
    }
    const [updated] = await db
      .update(maintenanceSchedules)
      .set(updates)
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.id, id));
  }

  async runSchedule(scheduleId: number, requestedByUserId: number): Promise<MaintenanceTask> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) throw new Error("Schedule not found");
    
    const task = await this.createTask({
      propertyId: schedule.propertyId,
      scheduleId: schedule.id,
      unitId: schedule.unitId,
      nodeId: schedule.nodeId,
      title: schedule.title,
      description: schedule.description,
      category: schedule.category,
      priority: schedule.priority,
      assignedToMemberId: schedule.defaultAssignedMemberId,
      checklist: schedule.templateChecklist?.map(item => ({ item: (item as any).item, completed: false })) || [],
      requestedByUserId
    });
    
    const nextRunAt = this.calculateNextRunDate(schedule.cadence);
    await db
      .update(maintenanceSchedules)
      .set({ lastRunAt: new Date(), nextRunAt, updatedAt: new Date() })
      .where(eq(maintenanceSchedules.id, scheduleId));
    
    return task;
  }

  async getUpcomingSchedules(propertyId?: number): Promise<MaintenanceSchedule[]> {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let query = db.select().from(maintenanceSchedules);
    if (propertyId) {
      return query
        .where(and(
          eq(maintenanceSchedules.propertyId, propertyId),
          eq(maintenanceSchedules.isActive, 1)
        ))
        .orderBy(maintenanceSchedules.nextRunAt);
    }
    return query
      .where(eq(maintenanceSchedules.isActive, 1))
      .orderBy(maintenanceSchedules.nextRunAt);
  }

  private calculateNextRunDate(cadence: string): Date {
    const now = new Date();
    switch (cadence) {
      case "DAILY": return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "WEEKLY": return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "MONTHLY": return new Date(now.setMonth(now.getMonth() + 1));
      case "QUARTERLY": return new Date(now.setMonth(now.getMonth() + 3));
      case "YEARLY": return new Date(now.setFullYear(now.getFullYear() + 1));
      default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  async getMaintenanceStats(propertyId?: number): Promise<{
    openIssues: number;
    inProgressTasks: number;
    overdueTasks: number;
    completedThisMonth: number;
    lowStockMaterials: number;
  }> {
    let issuesQuery = db.select().from(maintenanceIssues);
    let tasksQuery = db.select().from(maintenanceTasks);
    
    const allIssues = propertyId 
      ? await issuesQuery.where(eq(maintenanceIssues.propertyId, propertyId))
      : await issuesQuery;
    
    const allTasks = propertyId 
      ? await tasksQuery.where(eq(maintenanceTasks.propertyId, propertyId))
      : await tasksQuery;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const openIssues = allIssues.filter(i => i.status === "OPEN" || i.status === "IN_PROGRESS").length;
    const inProgressTasks = allTasks.filter(t => t.status === "IN_PROGRESS" || t.status === "TODO").length;
    const overdueTasks = allTasks.filter(t => 
      t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED" && t.status !== "CLOSED"
    ).length;
    const completedThisMonth = allTasks.filter(t => 
      t.completedAt && new Date(t.completedAt) >= startOfMonth && t.status === "COMPLETED"
    ).length;
    
    let lowStockCount = 0;
    if (propertyId) {
      const lowStockMaterials = await this.getLowStockMaterials(propertyId);
      lowStockCount = lowStockMaterials.length;
    }
    
    return {
      openIssues,
      inProgressTasks,
      overdueTasks,
      completedThisMonth,
      lowStockMaterials: lowStockCount
    };
  }
}

export const storage = new DatabaseStorage();
