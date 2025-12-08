import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const accountTypeEnum = pgEnum("account_type", ["INDIVIDUAL", "ORGANIZATION"]);
export const propertyTypeEnum = pgEnum("property_type", ["APARTMENT", "VILLA", "PLOT", "OFFICE", "SHOP"]);
export const unitStatusEnum = pgEnum("unit_status", ["VACANT", "OCCUPIED"]);
export const nodeTypeEnum = pgEnum("node_type", ["BUILDING", "FLOOR", "FLAT", "VILLA", "ROOM", "BED", "SECTION", "PLOT", "CUSTOM"]);

// Users table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  accountType: accountTypeEnum("account_type").notNull().default("INDIVIDUAL"),
  organizationName: text("organization_name"),
  organizationType: text("organization_type"),
  gstId: text("gst_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
]);

// Properties table
export const properties = pgTable("properties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerOrgName: text("owner_org_name"),
  name: text("name").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull(),
  pincode: text("pincode").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: text("images").array().default([]),
  isDeleted: integer("is_deleted").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("properties_owner_idx").on(table.ownerUserId),
  index("properties_city_idx").on(table.city),
]);

// Units table
export const units = pgTable("units", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitName: text("unit_name").notNull(),
  floor: text("floor"),
  areaSqFt: decimal("area_sq_ft", { precision: 10, scale: 2 }),
  status: unitStatusEnum("status").notNull().default("VACANT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("units_property_idx").on(table.propertyId),
]);

// Collaborator role enum
export const collaboratorRoleEnum = pgEnum("collaborator_role", ["VIEWER", "EDITOR"]);

// Property Collaborators table
export const propertyCollaborators = pgTable("property_collaborators", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: collaboratorRoleEnum("role").notNull().default("VIEWER"),
  invitedBy: integer("invited_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("collaborators_property_idx").on(table.propertyId),
  index("collaborators_user_idx").on(table.userId),
]);

// Property Nodes table (hierarchical tree structure)
export const propertyNodes = pgTable("property_nodes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  label: text("label").notNull(),
  nodeType: nodeTypeEnum("node_type").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("nodes_property_idx").on(table.propertyId),
  index("nodes_parent_idx").on(table.parentId),
]);

// =====================================================
// MAINTENANCE MANAGEMENT TABLES
// =====================================================

// Maintenance enums
export const issueCategoryEnum = pgEnum("issue_category", [
  "ELECTRICAL", "PLUMBING", "HVAC", "STRUCTURAL", "CLEANING", "PEST_CONTROL", "APPLIANCE", "GENERAL"
]);
export const issueSeverityEnum = pgEnum("issue_severity", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const issueStatusEnum = pgEnum("issue_status", ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"]);
export const taskStatusEnum = pgEnum("task_status", ["TODO", "IN_PROGRESS", "WAITING_APPROVAL", "COMPLETED", "CLOSED"]);
export const taskPriorityEnum = pgEnum("task_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const teamRoleEnum = pgEnum("team_role", ["SUPERVISOR", "TECHNICIAN", "CLEANER", "INSPECTOR"]);
export const skillTypeEnum = pgEnum("skill_type", ["HVAC", "PLUMBING", "ELECTRICAL", "CLEANING", "CARPENTRY", "PAINTING", "GENERAL"]);
export const scheduleCadenceEnum = pgEnum("schedule_cadence", ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

// Maintenance Team Members
export const maintenanceTeamMembers = pgTable("maintenance_team_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }),
  role: teamRoleEnum("role").notNull().default("TECHNICIAN"),
  isActive: integer("is_active").default(1).notNull(),
  maxConcurrentJobs: integer("max_concurrent_jobs").default(5),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("team_user_idx").on(table.userId),
  index("team_property_idx").on(table.propertyId),
]);

// Team Member Skills
export const maintenanceMemberSkills = pgTable("maintenance_member_skills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  memberId: integer("member_id").notNull().references(() => maintenanceTeamMembers.id, { onDelete: "cascade" }),
  skill: skillTypeEnum("skill").notNull(),
}, (table) => [
  index("skills_member_idx").on(table.memberId),
]);

// Maintenance Materials/Inventory
export const maintenanceMaterials = pgTable("maintenance_materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  unit: text("unit").default("pcs"),
  quantityOnHand: decimal("quantity_on_hand", { precision: 10, scale: 2 }).default("0"),
  reorderThreshold: decimal("reorder_threshold", { precision: 10, scale: 2 }).default("5"),
  costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("materials_property_idx").on(table.propertyId),
]);

// Maintenance Issues
export const maintenanceIssues = pgTable("maintenance_issues", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  nodeId: integer("node_id").references(() => propertyNodes.id, { onDelete: "set null" }),
  reportedByUserId: integer("reported_by_user_id").notNull().references(() => users.id),
  assignedToMemberId: integer("assigned_to_member_id").references(() => maintenanceTeamMembers.id, { onDelete: "set null" }),
  category: issueCategoryEnum("category").notNull(),
  severity: issueSeverityEnum("severity").notNull().default("MEDIUM"),
  status: issueStatusEnum("status").notNull().default("OPEN"),
  title: text("title").notNull(),
  description: text("description"),
  resolutionNotes: text("resolution_notes"),
  attachments: text("attachments").array().default([]),
  dueAt: timestamp("due_at"),
  closedAt: timestamp("closed_at"),
  costLabor: decimal("cost_labor", { precision: 10, scale: 2 }).default("0"),
  costMaterials: decimal("cost_materials", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("issues_property_idx").on(table.propertyId),
  index("issues_status_idx").on(table.status),
  index("issues_assigned_idx").on(table.assignedToMemberId),
]);

// Maintenance Tasks
export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  issueId: integer("issue_id").references(() => maintenanceIssues.id, { onDelete: "set null" }),
  scheduleId: integer("schedule_id"),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  nodeId: integer("node_id").references(() => propertyNodes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  category: issueCategoryEnum("category").notNull(),
  status: taskStatusEnum("status").notNull().default("TODO"),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  assignedToMemberId: integer("assigned_to_member_id").references(() => maintenanceTeamMembers.id, { onDelete: "set null" }),
  requestedByUserId: integer("requested_by_user_id").notNull().references(() => users.id),
  approvalRequired: integer("approval_required").default(0),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  dueAt: timestamp("due_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  laborHours: decimal("labor_hours", { precision: 6, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0"),
  checklist: jsonb("checklist").default([]).$type<{ item: string; completed: boolean }[]>(),
  attachments: text("attachments").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tasks_property_idx").on(table.propertyId),
  index("tasks_status_idx").on(table.status),
  index("tasks_assigned_idx").on(table.assignedToMemberId),
  index("tasks_issue_idx").on(table.issueId),
]);

// Task Activity Log (for tracking changes, comments, material usage)
export const maintenanceTaskActivity = pgTable("maintenance_task_activity", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  taskId: integer("task_id").notNull().references(() => maintenanceTasks.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(),
  payload: jsonb("payload").default({}).$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activity_task_idx").on(table.taskId),
]);

// Task Material Usage
export const maintenanceTaskMaterials = pgTable("maintenance_task_materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  taskId: integer("task_id").notNull().references(() => maintenanceTasks.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => maintenanceMaterials.id, { onDelete: "cascade" }),
  quantityUsed: decimal("quantity_used", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("task_materials_task_idx").on(table.taskId),
  index("task_materials_material_idx").on(table.materialId),
]);

// Recurring Maintenance Schedules
export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  nodeId: integer("node_id").references(() => propertyNodes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  category: issueCategoryEnum("category").notNull(),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  cadence: scheduleCadenceEnum("cadence").notNull(),
  defaultAssignedMemberId: integer("default_assigned_member_id").references(() => maintenanceTeamMembers.id, { onDelete: "set null" }),
  templateChecklist: jsonb("template_checklist").default([]).$type<{ item: string }[]>(),
  isActive: integer("is_active").default(1).notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("schedules_property_idx").on(table.propertyId),
  index("schedules_next_run_idx").on(table.nextRunAt),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerUserId],
    references: [users.id],
  }),
  units: many(units),
}));

export const unitsRelations = relations(units, ({ one }) => ({
  property: one(properties, {
    fields: [units.propertyId],
    references: [properties.id],
  }),
}));

export const propertyCollaboratorsRelations = relations(propertyCollaborators, ({ one }) => ({
  property: one(properties, {
    fields: [propertyCollaborators.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyCollaborators.userId],
    references: [users.id],
  }),
}));

export const propertyNodesRelations = relations(propertyNodes, ({ one, many }) => ({
  property: one(properties, {
    fields: [propertyNodes.propertyId],
    references: [properties.id],
  }),
  parent: one(propertyNodes, {
    fields: [propertyNodes.parentId],
    references: [propertyNodes.id],
    relationName: "parentChild",
  }),
  children: many(propertyNodes, {
    relationName: "parentChild",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  ownerUserId: true,
  ownerOrgName: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Property name must be at least 2 characters"),
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  country: z.string().min(2, "Country must be at least 2 characters"),
  pincode: z.string().min(4, "Pincode must be at least 4 characters"),
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  unitName: z.string().min(1, "Unit name is required"),
});

export const insertCollaboratorSchema = createInsertSchema(propertyCollaborators).omit({
  id: true,
  createdAt: true,
});

// Share property schema
export const sharePropertySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["VIEWER", "EDITOR"]),
});

// Property node schema - propertyId and nodeType are required
export const insertPropertyNodeSchema = createInsertSchema(propertyNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sortOrder: true,
}).extend({
  label: z.string().min(1, "Label is required"),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePropertyNodeSchema = insertPropertyNodeSchema.partial().extend({
  label: z.string().min(1, "Label is required").optional(),
});

export const movePropertyNodeSchema = z.object({
  parentId: z.number().nullable(),
  sortOrder: z.number().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type PropertyCollaborator = typeof propertyCollaborators.$inferSelect;
export type SharePropertyData = z.infer<typeof sharePropertySchema>;
export type InsertPropertyNode = z.infer<typeof insertPropertyNodeSchema>;
export type PropertyNode = typeof propertyNodes.$inferSelect;
export type UpdatePropertyNode = z.infer<typeof updatePropertyNodeSchema>;
export type MovePropertyNode = z.infer<typeof movePropertyNodeSchema>;

// Tree node with children for frontend
export type PropertyNodeWithChildren = PropertyNode & {
  children: PropertyNodeWithChildren[];
};

// Property with units type
export type PropertyWithUnits = Property & { units: Unit[] };

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

// =====================================================
// MAINTENANCE SCHEMAS AND TYPES
// =====================================================

// Insert schemas for maintenance entities
export const insertMaintenanceTeamMemberSchema = createInsertSchema(maintenanceTeamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceMaterialSchema = createInsertSchema(maintenanceMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Material name is required"),
});

export const insertMaintenanceIssueSchema = createInsertSchema(maintenanceIssues).omit({
  id: true,
  reportedByUserId: true,
  status: true,
  closedAt: true,
  costLabor: true,
  costMaterials: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Issue title is required"),
});

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({
  id: true,
  requestedByUserId: true,
  status: true,
  approvedByUserId: true,
  approvedAt: true,
  startedAt: true,
  completedAt: true,
  laborHours: true,
  totalCost: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Task title is required"),
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceSchedules).omit({
  id: true,
  lastRunAt: true,
  nextRunAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Schedule title is required"),
});

// Maintenance types
export type MaintenanceTeamMember = typeof maintenanceTeamMembers.$inferSelect;
export type InsertMaintenanceTeamMember = z.infer<typeof insertMaintenanceTeamMemberSchema>;
export type MaintenanceMemberSkill = typeof maintenanceMemberSkills.$inferSelect;
export type MaintenanceMaterial = typeof maintenanceMaterials.$inferSelect;
export type InsertMaintenanceMaterial = z.infer<typeof insertMaintenanceMaterialSchema>;
export type MaintenanceIssue = typeof maintenanceIssues.$inferSelect;
export type InsertMaintenanceIssue = z.infer<typeof insertMaintenanceIssueSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type MaintenanceTaskActivity = typeof maintenanceTaskActivity.$inferSelect;
export type MaintenanceTaskMaterial = typeof maintenanceTaskMaterials.$inferSelect;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;

// Team member with skills for frontend
export type TeamMemberWithSkills = MaintenanceTeamMember & { 
  skills: MaintenanceMemberSkill[];
  user: User;
};

// Issue with related data
export type IssueWithDetails = MaintenanceIssue & {
  property?: Property;
  assignedMember?: TeamMemberWithSkills | null;
  reporter?: User;
};

// Task with related data
export type TaskWithDetails = MaintenanceTask & {
  property?: Property;
  issue?: MaintenanceIssue | null;
  assignedMember?: TeamMemberWithSkills | null;
  activities?: MaintenanceTaskActivity[];
  materials?: (MaintenanceTaskMaterial & { material: MaintenanceMaterial })[];
};
