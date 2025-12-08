import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const accountTypeEnum = pgEnum("account_type", ["INDIVIDUAL", "ORGANIZATION"]);
export const propertyTypeEnum = pgEnum("property_type", ["APARTMENT", "VILLA", "PLOT", "OFFICE", "SHOP", "HOUSE", "TOWNHOUSE", "WAREHOUSE", "INDUSTRIAL", "MIXED_USE", "LAND"]);
export const occupancyPurposeEnum = pgEnum("occupancy_purpose", ["OWNER_OCCUPIED", "RENTAL", "INVESTMENT", "VACANT_LAND"]);
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
  occupancyPurpose: occupancyPurposeEnum("occupancy_purpose").default("RENTAL"),
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

// =====================================================
// DOCUMENT MANAGEMENT MODULE
// =====================================================

export const documentTypeEnum = pgEnum("document_type", [
  "INVOICE", "RECEIPT", "PAYMENT_PROOF", "CONTRACT", "LEASE_AGREEMENT",
  "UTILITY_BILL_IMAGE", "MAINTENANCE_PHOTO", "ID_DOCUMENT", "PROPERTY_IMAGE",
  "WORK_ORDER", "QUOTE", "COMPLETION_CERTIFICATE", "REPORT", "OTHER"
]);

export const documentModuleEnum = pgEnum("document_module", [
  "PROPERTY", "UNIT", "TENANT", "OWNER", "LEASE", "PAYMENT", "UTILITY_BILL",
  "UTILITY_METER", "MAINTENANCE_ISSUE", "MAINTENANCE_TASK", "LOAN", "ASSET", "REPORT"
]);

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  documentType: documentTypeEnum("document_type").notNull(),
  module: documentModuleEnum("module").notNull(),
  moduleId: integer("module_id").notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  shareToken: text("share_token"),
  shareExpiresAt: timestamp("share_expires_at"),
  uploadedByUserId: integer("uploaded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documents_module_idx").on(table.module, table.moduleId),
  index("documents_property_idx").on(table.propertyId),
  index("documents_type_idx").on(table.documentType),
]);

export const documentsRelations = relations(documents, ({ one }) => ({
  property: one(properties, {
    fields: [documents.propertyId],
    references: [properties.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedByUserId],
    references: [users.id],
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

// =====================================================
// ENTERPRISE ERP MODULE ENUMS
// =====================================================

// Owner type enum
export const ownerTypeEnum = pgEnum("owner_type", ["INDIVIDUAL", "COMPANY"]);

// Ownership role enum
export const ownershipRoleEnum = pgEnum("ownership_role", ["PRIMARY", "SECONDARY", "INVESTOR"]);

// Tenant type enum
export const tenantTypeEnum = pgEnum("tenant_type", ["INDIVIDUAL", "COMPANY"]);

// Lease status enum
export const leaseStatusEnum = pgEnum("lease_status", ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]);

// Rent frequency enum
export const rentFrequencyEnum = pgEnum("rent_frequency", ["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);

// Invoice status enum
export const invoiceStatusEnum = pgEnum("invoice_status", ["DRAFT", "ISSUED", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"]);

// Payment method enum
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "BANK_TRANSFER", "CHECK", "CARD", "MOBILE_MONEY", "OTHER"]);

// Payer type enum
export const payerTypeEnum = pgEnum("payer_type", ["TENANT", "OWNER"]);

// Applied to type enum
export const appliedToTypeEnum = pgEnum("applied_to_type", ["RENT_INVOICE", "LOAN", "UTILITY", "OTHER"]);

// Account type enum (for Chart of Accounts)
export const coaAccountTypeEnum = pgEnum("coa_account_type", ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);

// Ledger module enum
export const ledgerModuleEnum = pgEnum("ledger_module", ["RENT", "UTILITY", "MAINTENANCE", "LOAN", "DEPRECIATION", "MANUAL", "OTHER"]);

// Utility type enum
export const utilityTypeEnum = pgEnum("utility_type", ["ELECTRICITY", "WATER", "GAS", "INTERNET", "OTHER"]);

// Utility bill status enum
export const utilityBillStatusEnum = pgEnum("utility_bill_status", ["PENDING", "FORWARDED", "PAID", "PARTIALLY_PAID", "OVERDUE"]);

// Meter assignee type enum (who is responsible for meter bills)
export const meterAssigneeTypeEnum = pgEnum("meter_assignee_type", ["OWNER", "TENANT"]);

// Loan compounding enum
export const loanCompoundingEnum = pgEnum("loan_compounding", ["SIMPLE", "COMPOUND_MONTHLY", "COMPOUND_ANNUALLY"]);

// Payment frequency enum
export const paymentFrequencyEnum = pgEnum("payment_frequency", ["MONTHLY", "QUARTERLY", "SEMI_ANNUALLY", "ANNUALLY"]);

// Amortization method enum
export const amortizationMethodEnum = pgEnum("amortization_method", ["STRAIGHT_LINE", "REDUCING_BALANCE", "INTEREST_ONLY"]);

// Asset category enum
export const assetCategoryEnum = pgEnum("asset_category", [
  "LAND", "BUILDING", "FURNITURE_FIXTURES", "APPLIANCES", "AC_UNITS", 
  "VEHICLES", "EQUIPMENT", "COMPUTERS", "OTHER"
]);

// Asset status enum
export const assetStatusEnum = pgEnum("asset_status", ["ACTIVE", "DISPOSED", "FULLY_DEPRECIATED"]);

// Depreciation method enum
export const depreciationMethodEnum = pgEnum("depreciation_method", ["STRAIGHT_LINE", "REDUCING_BALANCE", "UNITS_OF_PRODUCTION"]);

// Depreciation run type enum
export const depreciationRunTypeEnum = pgEnum("depreciation_run_type", ["BOOK", "TAX"]);

// =====================================================
// OWNERS TABLE
// =====================================================

export const owners = pgTable("owners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerType: ownerTypeEnum("owner_type").notNull().default("INDIVIDUAL"),
  legalName: text("legal_name").notNull(),
  tradingName: text("trading_name"),
  registrationNumber: text("registration_number"),
  taxId: text("tax_id"),
  email: text("email"),
  phone: text("phone"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  isResident: integer("is_resident").default(1),
  notes: text("notes"),
  isDefault: integer("is_default").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("owners_user_idx").on(table.userId),
  index("owners_type_idx").on(table.ownerType),
]);

// =====================================================
// PROPERTY OWNERS (LINK TABLE)
// =====================================================

export const propertyOwners = pgTable("property_owners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  ownershipPercent: decimal("ownership_percent", { precision: 5, scale: 2 }).notNull().default("100"),
  ownershipRole: ownershipRoleEnum("ownership_role").notNull().default("PRIMARY"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("property_owners_property_idx").on(table.propertyId),
  index("property_owners_owner_idx").on(table.ownerId),
]);

// =====================================================
// OWNER TEAM MANAGEMENT
// =====================================================

// Team member role enum - defines access levels for team members
export const ownerTeamRoleEnum = pgEnum("owner_team_role", [
  "ADMIN",              // Full access to owner's data
  "ACCOUNTANT",         // Access to accounting, assets, loans, payments
  "MAINTENANCE_MANAGER", // Access to all maintenance modules
  "MAINTENANCE_STAFF",  // Can create issues, update assigned tasks
  "VIEWER"              // Read-only access to all data
]);

// Invitation status enum
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"]);

// Owner Team Members table - links users to owners with specific roles
export const ownerTeamMembers = pgTable("owner_team_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: ownerTeamRoleEnum("role").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  addedByUserId: integer("added_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("owner_team_owner_idx").on(table.ownerId),
  index("owner_team_user_idx").on(table.userId),
]);

// Owner Invitations table - pending invitations to join an owner's team
export const ownerInvitations = pgTable("owner_invitations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: ownerTeamRoleEnum("role").notNull(),
  inviteToken: text("invite_token").notNull().unique(),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  invitedByUserId: integer("invited_by_user_id").notNull().references(() => users.id),
  acceptedByUserId: integer("accepted_by_user_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("owner_invitations_owner_idx").on(table.ownerId),
  index("owner_invitations_email_idx").on(table.email),
  index("owner_invitations_token_idx").on(table.inviteToken),
]);

// =====================================================
// TENANTS TABLE
// =====================================================

export const tenants = pgTable("tenants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantType: tenantTypeEnum("tenant_type").notNull().default("INDIVIDUAL"),
  legalName: text("legal_name").notNull(),
  registrationNumber: text("registration_number"),
  idNumber: text("id_number"),
  email: text("email"),
  phone: text("phone").notNull(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  country: text("country"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tenants_created_by_idx").on(table.createdByUserId),
  index("tenants_email_idx").on(table.email),
]);

// =====================================================
// LEASES TABLE
// =====================================================

export const leases = pgTable("leases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  status: leaseStatusEnum("status").notNull().default("DRAFT"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }).notNull(),
  rentFrequency: rentFrequencyEnum("rent_frequency").notNull().default("MONTHLY"),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }).default("0"),
  escalationPercent: decimal("escalation_percent", { precision: 5, scale: 2 }),
  escalationFrequencyMonths: integer("escalation_frequency_months"),
  paymentDueDay: integer("payment_due_day").default(1),
  lateFeePercent: decimal("late_fee_percent", { precision: 5, scale: 2 }),
  lateFeeGraceDays: integer("late_fee_grace_days").default(5),
  terms: text("terms"),
  documents: text("documents").array().default([]),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("leases_property_idx").on(table.propertyId),
  index("leases_tenant_idx").on(table.tenantId),
  index("leases_status_idx").on(table.status),
]);

// =====================================================
// RENT INVOICES TABLE
// =====================================================

export const rentInvoices = pgTable("rent_invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leaseId: integer("lease_id").notNull().references(() => leases.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }).notNull(),
  utilityCharges: decimal("utility_charges", { precision: 12, scale: 2 }).default("0"),
  maintenanceCharges: decimal("maintenance_charges", { precision: 12, scale: 2 }).default("0"),
  lateFees: decimal("late_fees", { precision: 12, scale: 2 }).default("0"),
  otherCharges: decimal("other_charges", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  dueDate: timestamp("due_date").notNull(),
  issuedAt: timestamp("issued_at"),
  paidAt: timestamp("paid_at"),
  ledgerEntryId: integer("ledger_entry_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("rent_invoices_lease_idx").on(table.leaseId),
  index("rent_invoices_status_idx").on(table.status),
  index("rent_invoices_due_date_idx").on(table.dueDate),
]);

// =====================================================
// PAYMENTS TABLE
// =====================================================

export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payerType: payerTypeEnum("payer_type").notNull(),
  payerId: integer("payer_id").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("BANK_TRANSFER"),
  reference: text("reference"),
  appliedToType: appliedToTypeEnum("applied_to_type").notNull(),
  appliedToId: integer("applied_to_id").notNull(),
  bankAccountId: integer("bank_account_id"),
  ledgerEntryId: integer("ledger_entry_id"),
  notes: text("notes"),
  recordedByUserId: integer("recorded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("payments_payer_idx").on(table.payerType, table.payerId),
  index("payments_applied_idx").on(table.appliedToType, table.appliedToId),
  index("payments_date_idx").on(table.paymentDate),
]);

// =====================================================
// CHART OF ACCOUNTS TABLE
// =====================================================

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  accountType: coaAccountTypeEnum("account_type").notNull(),
  parentCode: text("parent_code"),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
  isSystem: integer("is_system").default(0).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("coa_code_idx").on(table.code),
  index("coa_type_idx").on(table.accountType),
]);

// =====================================================
// LEDGER ENTRIES TABLE (Journal Entries)
// =====================================================

export const ledgerEntries = pgTable("ledger_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entryNumber: text("entry_number").notNull(),
  entryDate: timestamp("entry_date").notNull(),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
  ownerId: integer("owner_id").references(() => owners.id, { onDelete: "set null" }),
  module: ledgerModuleEnum("module").notNull(),
  referenceId: integer("reference_id"),
  memo: text("memo"),
  isReversed: integer("is_reversed").default(0).notNull(),
  reversedByEntryId: integer("reversed_by_entry_id"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ledger_entries_date_idx").on(table.entryDate),
  index("ledger_entries_property_idx").on(table.propertyId),
  index("ledger_entries_owner_idx").on(table.ownerId),
  index("ledger_entries_module_idx").on(table.module),
]);

// =====================================================
// LEDGER LINES TABLE (Journal Lines)
// =====================================================

export const ledgerLines = pgTable("ledger_lines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entryId: integer("entry_id").notNull().references(() => ledgerEntries.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
  debit: decimal("debit", { precision: 14, scale: 2 }).default("0"),
  credit: decimal("credit", { precision: 14, scale: 2 }).default("0"),
  relatedType: text("related_type"),
  relatedId: integer("related_id"),
  memo: text("memo"),
}, (table) => [
  index("ledger_lines_entry_idx").on(table.entryId),
  index("ledger_lines_account_idx").on(table.accountId),
]);

// =====================================================
// UTILITY METERS TABLE
// =====================================================

export const utilityMeters = pgTable("utility_meters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  utilityType: utilityTypeEnum("utility_type").notNull(),
  meterNumber: text("meter_number").notNull(),
  provider: text("provider"),
  ratePerUnit: decimal("rate_per_unit", { precision: 10, scale: 4 }),
  fixedCharge: decimal("fixed_charge", { precision: 10, scale: 2 }).default("0"),
  assignedToType: meterAssigneeTypeEnum("assigned_to_type").notNull().default("OWNER"),
  assignedToOwnerId: integer("assigned_to_owner_id").references(() => owners.id, { onDelete: "set null" }),
  assignedToTenantId: integer("assigned_to_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("utility_meters_property_idx").on(table.propertyId),
  index("utility_meters_unit_idx").on(table.unitId),
  index("utility_meters_type_idx").on(table.utilityType),
  index("utility_meters_owner_idx").on(table.assignedToOwnerId),
  index("utility_meters_tenant_idx").on(table.assignedToTenantId),
]);

// =====================================================
// METER READINGS TABLE
// =====================================================

export const meterReadings = pgTable("meter_readings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  meterId: integer("meter_id").notNull().references(() => utilityMeters.id, { onDelete: "cascade" }),
  readingDate: timestamp("reading_date").notNull(),
  previousReading: decimal("previous_reading", { precision: 12, scale: 2 }),
  currentReading: decimal("current_reading", { precision: 12, scale: 2 }).notNull(),
  consumption: decimal("consumption", { precision: 12, scale: 2 }),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  billAmount: decimal("bill_amount", { precision: 12, scale: 2 }),
  rebillableAmount: decimal("rebillable_amount", { precision: 12, scale: 2 }),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  isRebilled: integer("is_rebilled").default(0),
  ledgerEntryId: integer("ledger_entry_id"),
  notes: text("notes"),
  recordedByUserId: integer("recorded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("meter_readings_meter_idx").on(table.meterId),
  index("meter_readings_date_idx").on(table.readingDate),
]);

// =====================================================
// METER ASSIGNMENT HISTORY TABLE
// =====================================================

export const meterAssignmentHistory = pgTable("meter_assignment_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  meterId: integer("meter_id").notNull().references(() => utilityMeters.id, { onDelete: "cascade" }),
  previousAssigneeType: meterAssigneeTypeEnum("previous_assignee_type"),
  previousOwnerId: integer("previous_owner_id").references(() => owners.id, { onDelete: "set null" }),
  previousTenantId: integer("previous_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  newAssigneeType: meterAssigneeTypeEnum("new_assignee_type").notNull(),
  newOwnerId: integer("new_owner_id").references(() => owners.id, { onDelete: "set null" }),
  newTenantId: integer("new_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  leaseId: integer("lease_id").references(() => leases.id, { onDelete: "set null" }),
  transferDate: timestamp("transfer_date").defaultNow().notNull(),
  finalMeterReading: decimal("final_meter_reading", { precision: 12, scale: 2 }),
  outstandingBillsSettled: integer("outstanding_bills_settled").default(0).notNull(),
  settlementAmount: decimal("settlement_amount", { precision: 12, scale: 2 }),
  transferReason: text("transfer_reason"),
  notes: text("notes"),
  recordedByUserId: integer("recorded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("meter_assignment_history_meter_idx").on(table.meterId),
  index("meter_assignment_history_date_idx").on(table.transferDate),
]);

// =====================================================
// UTILITY BILLS TABLE
// =====================================================

export const utilityBills = pgTable("utility_bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  meterId: integer("meter_id").references(() => utilityMeters.id, { onDelete: "set null" }),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  utilityType: utilityTypeEnum("utility_type").notNull(),
  provider: text("provider").notNull().default("PUC"),
  billReference: text("bill_reference"),
  accountNumber: text("account_number"),
  billDate: timestamp("bill_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  previousReading: decimal("previous_reading", { precision: 12, scale: 2 }),
  currentReading: decimal("current_reading", { precision: 12, scale: 2 }),
  consumption: decimal("consumption", { precision: 12, scale: 2 }),
  previousBalance: decimal("previous_balance", { precision: 12, scale: 2 }).default("0"),
  currentCharges: decimal("current_charges", { precision: 12, scale: 2 }).notNull(),
  taxes: decimal("taxes", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
  status: utilityBillStatusEnum("status").notNull().default("PENDING"),
  billImagePath: text("bill_image_path"),
  forwardedToTenantAt: timestamp("forwarded_to_tenant_at"),
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  recordedByUserId: integer("recorded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("utility_bills_property_idx").on(table.propertyId),
  index("utility_bills_unit_idx").on(table.unitId),
  index("utility_bills_tenant_idx").on(table.tenantId),
  index("utility_bills_status_idx").on(table.status),
  index("utility_bills_due_date_idx").on(table.dueDate),
]);

// =====================================================
// LOANS TABLE
// =====================================================

export const loans = pgTable("loans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
  lenderName: text("lender_name").notNull(),
  loanReference: text("loan_reference"),
  currency: text("currency").default("SCR").notNull(),
  principal: decimal("principal", { precision: 14, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 6, scale: 4 }).notNull(),
  compounding: loanCompoundingEnum("compounding").notNull().default("SIMPLE"),
  termMonths: integer("term_months").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  paymentFrequency: paymentFrequencyEnum("payment_frequency").notNull().default("MONTHLY"),
  amortizationMethod: amortizationMethodEnum("amortization_method").notNull().default("REDUCING_BALANCE"),
  outstandingBalance: decimal("outstanding_balance", { precision: 14, scale: 2 }),
  totalInterestPaid: decimal("total_interest_paid", { precision: 14, scale: 2 }).default("0"),
  totalPrincipalPaid: decimal("total_principal_paid", { precision: 14, scale: 2 }).default("0"),
  isActive: integer("is_active").default(1).notNull(),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("loans_owner_idx").on(table.ownerId),
  index("loans_property_idx").on(table.propertyId),
]);

// =====================================================
// LOAN SCHEDULE TABLE
// =====================================================

export const loanSchedule = pgTable("loan_schedule", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  periodNumber: integer("period_number").notNull(),
  dueDate: timestamp("due_date").notNull(),
  openingBalance: decimal("opening_balance", { precision: 14, scale: 2 }).notNull(),
  principalDue: decimal("principal_due", { precision: 14, scale: 2 }).notNull(),
  interestDue: decimal("interest_due", { precision: 14, scale: 2 }).notNull(),
  totalDue: decimal("total_due", { precision: 14, scale: 2 }).notNull(),
  closingBalance: decimal("closing_balance", { precision: 14, scale: 2 }).notNull(),
  isPaid: integer("is_paid").default(0).notNull(),
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("loan_schedule_loan_idx").on(table.loanId),
  index("loan_schedule_due_idx").on(table.dueDate),
]);

// =====================================================
// LOAN PAYMENTS TABLE
// =====================================================

export const loanPayments = pgTable("loan_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  scheduleId: integer("schedule_id").references(() => loanSchedule.id, { onDelete: "set null" }),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  principalComponent: decimal("principal_component", { precision: 14, scale: 2 }).notNull(),
  interestComponent: decimal("interest_component", { precision: 14, scale: 2 }).notNull(),
  bankAccountId: integer("bank_account_id"),
  ledgerEntryId: integer("ledger_entry_id"),
  reference: text("reference"),
  notes: text("notes"),
  recordedByUserId: integer("recorded_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("loan_payments_loan_idx").on(table.loanId),
  index("loan_payments_schedule_idx").on(table.scheduleId),
  index("loan_payments_date_idx").on(table.paymentDate),
]);

// =====================================================
// ASSETS TABLE
// =====================================================

export const assets = pgTable("assets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
  assetCategory: assetCategoryEnum("asset_category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  serialNumber: text("serial_number"),
  acquisitionDate: timestamp("acquisition_date").notNull(),
  cost: decimal("cost", { precision: 14, scale: 2 }).notNull(),
  salvageValue: decimal("salvage_value", { precision: 14, scale: 2 }).default("0"),
  usefulLifeMonths: integer("useful_life_months").notNull(),
  bookMethod: depreciationMethodEnum("book_method").notNull().default("STRAIGHT_LINE"),
  taxMethod: depreciationMethodEnum("tax_method").notNull().default("STRAIGHT_LINE"),
  taxRateCode: text("tax_rate_code"),
  businessUsePercent: decimal("business_use_percent", { precision: 5, scale: 2 }).default("100"),
  status: assetStatusEnum("status").notNull().default("ACTIVE"),
  bookAccumulatedDepreciation: decimal("book_accumulated_depreciation", { precision: 14, scale: 2 }).default("0"),
  taxAccumulatedDepreciation: decimal("tax_accumulated_depreciation", { precision: 14, scale: 2 }).default("0"),
  disposalDate: timestamp("disposal_date"),
  disposalAmount: decimal("disposal_amount", { precision: 14, scale: 2 }),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assets_owner_idx").on(table.ownerId),
  index("assets_property_idx").on(table.propertyId),
  index("assets_category_idx").on(table.assetCategory),
  index("assets_status_idx").on(table.status),
]);

// =====================================================
// DEPRECIATION RULES TABLE
// =====================================================

export const depreciationRules = pgTable("depreciation_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assetCategory: assetCategoryEnum("asset_category").notNull(),
  jurisdiction: text("jurisdiction").default("SC").notNull(),
  lawReference: text("law_reference"),
  ratePercentPerYear: decimal("rate_percent_per_year", { precision: 6, scale: 2 }).notNull(),
  method: depreciationMethodEnum("method").notNull().default("STRAIGHT_LINE"),
  isFirstYearFull: integer("is_first_year_full").default(0).notNull(),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("depreciation_rules_category_idx").on(table.assetCategory),
  index("depreciation_rules_jurisdiction_idx").on(table.jurisdiction),
]);

// =====================================================
// DEPRECIATION RUNS TABLE
// =====================================================

export const depreciationRuns = pgTable("depreciation_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assetId: integer("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  runType: depreciationRunTypeEnum("run_type").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  depreciationAmount: decimal("depreciation_amount", { precision: 14, scale: 2 }).notNull(),
  openingNetBookValue: decimal("opening_net_book_value", { precision: 14, scale: 2 }).notNull(),
  closingNetBookValue: decimal("closing_net_book_value", { precision: 14, scale: 2 }).notNull(),
  ledgerEntryId: integer("ledger_entry_id"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("depreciation_runs_asset_idx").on(table.assetId),
  index("depreciation_runs_period_idx").on(table.periodStart, table.periodEnd),
]);

// =====================================================
// INSERT SCHEMAS FOR ENTERPRISE MODULES
// =====================================================

// Owner schemas
export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  legalName: z.string().min(2, "Legal name must be at least 2 characters"),
  isDefault: z.number().optional(),
  tradingName: z.string().optional(),
});

// Property owner schemas
export const insertPropertyOwnerSchema = createInsertSchema(propertyOwners).omit({
  id: true,
  createdAt: true,
});

// Owner team member schemas
export const insertOwnerTeamMemberSchema = createInsertSchema(ownerTeamMembers).omit({
  id: true,
  addedByUserId: true,
  createdAt: true,
  updatedAt: true,
});

// Owner invitation schemas
export const insertOwnerInvitationSchema = createInsertSchema(ownerInvitations).omit({
  id: true,
  inviteToken: true,
  invitedByUserId: true,
  acceptedByUserId: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Valid email required"),
});

// Tenant schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  legalName: z.string().min(2, "Legal name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number is required"),
});

// Lease schemas
export const insertLeaseSchema = createInsertSchema(leases).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rentAmount: z.string().or(z.number()).transform(val => String(val)),
});

// Rent invoice schemas
export const insertRentInvoiceSchema = createInsertSchema(rentInvoices).omit({
  id: true,
  invoiceNumber: true,
  amountPaid: true,
  status: true,
  issuedAt: true,
  paidAt: true,
  ledgerEntryId: true,
  createdAt: true,
  updatedAt: true,
});

// Payment schemas
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  ledgerEntryId: true,
  recordedByUserId: true,
  createdAt: true,
});

// Chart of accounts schemas
export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  code: z.string().min(3, "Account code must be at least 3 characters"),
  name: z.string().min(2, "Account name is required"),
});

// Ledger entry schemas
export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({
  id: true,
  entryNumber: true,
  isReversed: true,
  reversedByEntryId: true,
  createdByUserId: true,
  createdAt: true,
});

// Ledger line schemas
export const insertLedgerLineSchema = createInsertSchema(ledgerLines).omit({
  id: true,
});

// Utility meter schemas
export const insertUtilityMeterSchema = createInsertSchema(utilityMeters).omit({
  id: true,
  assignedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  meterNumber: z.string().min(1, "Meter number is required"),
});

// Meter reading schemas
export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({
  id: true,
  consumption: true,
  isRebilled: true,
  ledgerEntryId: true,
  recordedByUserId: true,
  createdAt: true,
});

// Utility bill schemas
export const insertUtilityBillSchema = createInsertSchema(utilityBills).omit({
  id: true,
  amountPaid: true,
  forwardedToTenantAt: true,
  paidAt: true,
  paymentReference: true,
  recordedByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  provider: z.string().min(1, "Provider is required"),
  currentCharges: z.string().or(z.number()).transform(val => String(val)),
  totalAmount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertUtilityBill = z.infer<typeof insertUtilityBillSchema>;
export type UtilityBill = typeof utilityBills.$inferSelect;

// Meter assignment history schemas
export const insertMeterAssignmentHistorySchema = createInsertSchema(meterAssignmentHistory).omit({
  id: true,
  transferDate: true,
  recordedByUserId: true,
  createdAt: true,
});

export type InsertMeterAssignmentHistory = z.infer<typeof insertMeterAssignmentHistorySchema>;
export type MeterAssignmentHistory = typeof meterAssignmentHistory.$inferSelect;

// Document schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  shareToken: true,
  shareExpiresAt: true,
  uploadedByUserId: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Loan schemas
export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  endDate: true,
  outstandingBalance: true,
  totalInterestPaid: true,
  totalPrincipalPaid: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lenderName: z.string().min(2, "Lender name is required"),
  principal: z.string().or(z.number()).transform(val => String(val)),
  interestRate: z.string().or(z.number()).transform(val => String(val)),
});

// Loan payment schemas
export const insertLoanPaymentSchema = createInsertSchema(loanPayments).omit({
  id: true,
  ledgerEntryId: true,
  recordedByUserId: true,
  createdAt: true,
});

// Asset schemas
export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  status: true,
  bookAccumulatedDepreciation: true,
  taxAccumulatedDepreciation: true,
  disposalDate: true,
  disposalAmount: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Asset name is required"),
  cost: z.string().or(z.number()).transform(val => String(val)),
});

// Depreciation rule schemas
export const insertDepreciationRuleSchema = createInsertSchema(depreciationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// =====================================================
// ENTERPRISE MODULE TYPES
// =====================================================

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type PropertyOwner = typeof propertyOwners.$inferSelect;
export type InsertPropertyOwner = z.infer<typeof insertPropertyOwnerSchema>;
export type OwnerTeamMember = typeof ownerTeamMembers.$inferSelect;
export type InsertOwnerTeamMember = z.infer<typeof insertOwnerTeamMemberSchema>;
export type OwnerInvitation = typeof ownerInvitations.$inferSelect;
export type InsertOwnerInvitation = z.infer<typeof insertOwnerInvitationSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Lease = typeof leases.$inferSelect;
export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type RentInvoice = typeof rentInvoices.$inferSelect;
export type InsertRentInvoice = z.infer<typeof insertRentInvoiceSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerLine = typeof ledgerLines.$inferSelect;
export type InsertLedgerLine = z.infer<typeof insertLedgerLineSchema>;
export type UtilityMeter = typeof utilityMeters.$inferSelect;
export type InsertUtilityMeter = z.infer<typeof insertUtilityMeterSchema>;
export type MeterReading = typeof meterReadings.$inferSelect;
export type InsertMeterReading = z.infer<typeof insertMeterReadingSchema>;
export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type LoanScheduleEntry = typeof loanSchedule.$inferSelect;
export type LoanPayment = typeof loanPayments.$inferSelect;
export type InsertLoanPayment = z.infer<typeof insertLoanPaymentSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type DepreciationRule = typeof depreciationRules.$inferSelect;
export type InsertDepreciationRule = z.infer<typeof insertDepreciationRuleSchema>;
export type DepreciationRun = typeof depreciationRuns.$inferSelect;

// Extended types with relations
export type OwnerWithProperties = Owner & {
  propertyOwnerships: (PropertyOwner & { property: Property })[];
};

export type LeaseWithDetails = Lease & {
  property: Property;
  unit?: Unit | null;
  tenant: Tenant;
};

export type LoanWithSchedule = Loan & {
  owner: Owner;
  property?: Property | null;
  schedule: LoanScheduleEntry[];
  payments: LoanPayment[];
};

export type AssetWithDepreciation = Asset & {
  owner: Owner;
  property?: Property | null;
  depreciationRuns: DepreciationRun[];
};

export type LedgerEntryWithLines = LedgerEntry & {
  lines: (LedgerLine & { account: ChartOfAccount })[];
};
