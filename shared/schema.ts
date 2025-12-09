import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const accountTypeEnum = pgEnum("account_type", ["INDIVIDUAL", "ORGANIZATION"]);
export const propertyTypeEnum = pgEnum("property_type", ["APARTMENT", "VILLA", "PLOT", "OFFICE", "SHOP", "HOUSE", "TOWNHOUSE", "WAREHOUSE", "INDUSTRIAL", "MIXED_USE", "LAND"]);
export const occupancyPurposeEnum = pgEnum("occupancy_purpose", ["OWNER_OCCUPIED", "RENTAL", "INVESTMENT", "VACANT_LAND"]);
export const propertyUsageTypeEnum = pgEnum("property_usage_type", ["LONG_TERM_RENTAL", "SHORT_TERM_RENTAL", "OWNER_OCCUPIED"]);
export const unitStatusEnum = pgEnum("unit_status", ["VACANT", "OCCUPIED"]);
export const nodeTypeEnum = pgEnum("node_type", ["BUILDING", "FLOOR", "FLAT", "VILLA", "ROOM", "BED", "SECTION", "PLOT", "CUSTOM"]);

// Currency enum - major world currencies
export const currencyCodeEnum = pgEnum("currency_code", [
  "USD", // US Dollar
  "EUR", // Euro
  "GBP", // British Pound
  "INR", // Indian Rupee
  "AED", // UAE Dirham
  "SCR", // Seychellois Rupee
  "CAD", // Canadian Dollar
  "AUD", // Australian Dollar
  "SGD", // Singapore Dollar
  "CHF", // Swiss Franc
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
  "ZAR", // South African Rand
  "NZD", // New Zealand Dollar
  "HKD", // Hong Kong Dollar
  "SAR", // Saudi Riyal
  "QAR", // Qatari Riyal
  "KWD", // Kuwaiti Dinar
  "BHD", // Bahraini Dinar
  "OMR", // Omani Rial
  "MYR", // Malaysian Ringgit
  "THB", // Thai Baht
  "IDR", // Indonesian Rupiah
  "PHP", // Philippine Peso
  "MXN", // Mexican Peso
  "BRL", // Brazilian Real
  "RUB", // Russian Ruble
  "KRW", // South Korean Won
  "TRY", // Turkish Lira
  "PKR"  // Pakistani Rupee
]);

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
  isSuperAdmin: integer("is_super_admin").default(0).notNull(), // First user or designated super admins
  isActive: integer("is_active").default(1).notNull(), // Admin can deactivate users
  createdByUserId: integer("created_by_user_id"), // NULL for self-registered, set for admin-created
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
]);

// =====================================================
// EXCHANGE RATES TABLE
// =====================================================

export const exchangeRates = pgTable("exchange_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  baseCurrency: currencyCodeEnum("base_currency").notNull(),
  quoteCurrency: currencyCodeEnum("quote_currency").notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(), // High precision for currency conversion
  effectiveDate: date("effective_date").notNull(),
  source: text("source").default("MANUAL"), // e.g., "MANUAL", "ECB", "FIXER", etc.
  isActive: integer("is_active").default(1).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("exchange_rates_base_quote_idx").on(table.baseCurrency, table.quoteCurrency),
  index("exchange_rates_effective_date_idx").on(table.effectiveDate),
]);

// Properties table
export const properties = pgTable("properties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerOrgName: text("owner_org_name"),
  name: text("name").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull(),
  usageType: propertyUsageTypeEnum("usage_type").notNull().default("LONG_TERM_RENTAL"),
  occupancyPurpose: occupancyPurposeEnum("occupancy_purpose").default("RENTAL"),
  currencyCode: currencyCodeEnum("currency_code").default("USD"), // Property's base currency for financial transactions
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
  portfolioTag: text("portfolio_tag"), // Optional: for organizing properties (e.g., "Personal", "ABC Holdings")
  coOwnershipNotes: text("co_ownership_notes"), // Optional: legal notes about co-ownership (e.g., "50% John, 50% Jane")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("properties_owner_idx").on(table.ownerUserId),
  index("properties_city_idx").on(table.city),
  index("properties_portfolio_idx").on(table.portfolioTag),
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

// =====================================================
// COMPLIANCE DOCUMENTS MODULE (Licenses, Permits, etc.)
// =====================================================

export const complianceDocTypeEnum = pgEnum("compliance_doc_type", [
  "LICENSE", "PERMIT", "CERTIFICATE", "INSURANCE", "REGISTRATION",
  "TAX_DOCUMENT", "LEGAL_AGREEMENT", "WARRANTY", "INSPECTION", "OTHER"
]);

export const complianceEntityTypeEnum = pgEnum("compliance_entity_type", [
  "OWNER", "PROPERTY"
]);

export const complianceStatusEnum = pgEnum("compliance_status", [
  "ACTIVE", "EXPIRING_SOON", "EXPIRED", "NOT_APPLICABLE"
]);

export const complianceDocuments = pgTable("compliance_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityType: complianceEntityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  documentType: complianceDocTypeEnum("document_type").notNull(),
  documentName: text("document_name").notNull(),
  documentNumber: text("document_number"),
  issuingAuthority: text("issuing_authority"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  reminderDays: integer("reminder_days").default(30),
  notes: text("notes"),
  fileDocumentId: integer("file_document_id").references(() => documents.id, { onDelete: "set null" }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("compliance_docs_entity_idx").on(table.entityType, table.entityId),
  index("compliance_docs_expiry_idx").on(table.expiryDate),
  index("compliance_docs_type_idx").on(table.documentType),
]);

export const complianceDocumentsRelations = relations(complianceDocuments, ({ one }) => ({
  fileDocument: one(documents, {
    fields: [complianceDocuments.fileDocumentId],
    references: [documents.id],
  }),
  createdBy: one(users, {
    fields: [complianceDocuments.createdByUserId],
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

// Exchange rates schema
export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rate: z.string().min(1, "Exchange rate is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
});
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;

// Supported currency codes list for UI
export const CURRENCY_CODES = [
  "USD", "EUR", "GBP", "INR", "AED", "SCR", "CAD", "AUD", "SGD", "CHF",
  "JPY", "CNY", "ZAR", "NZD", "HKD", "SAR", "QAR", "KWD", "BHD", "OMR",
  "MYR", "THB", "IDR", "PHP", "MXN", "BRL", "RUB", "KRW", "TRY", "PKR"
] as const;

export type CurrencyCode = typeof CURRENCY_CODES[number];

// Currency metadata for display
export const CURRENCY_INFO: Record<CurrencyCode, { name: string; symbol: string; decimals: number }> = {
  USD: { name: "US Dollar", symbol: "$", decimals: 2 },
  EUR: { name: "Euro", symbol: "€", decimals: 2 },
  GBP: { name: "British Pound", symbol: "£", decimals: 2 },
  INR: { name: "Indian Rupee", symbol: "₹", decimals: 2 },
  AED: { name: "UAE Dirham", symbol: "د.إ", decimals: 2 },
  SCR: { name: "Seychellois Rupee", symbol: "₨", decimals: 2 },
  CAD: { name: "Canadian Dollar", symbol: "C$", decimals: 2 },
  AUD: { name: "Australian Dollar", symbol: "A$", decimals: 2 },
  SGD: { name: "Singapore Dollar", symbol: "S$", decimals: 2 },
  CHF: { name: "Swiss Franc", symbol: "CHF", decimals: 2 },
  JPY: { name: "Japanese Yen", symbol: "¥", decimals: 0 },
  CNY: { name: "Chinese Yuan", symbol: "¥", decimals: 2 },
  ZAR: { name: "South African Rand", symbol: "R", decimals: 2 },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", decimals: 2 },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$", decimals: 2 },
  SAR: { name: "Saudi Riyal", symbol: "﷼", decimals: 2 },
  QAR: { name: "Qatari Riyal", symbol: "﷼", decimals: 2 },
  KWD: { name: "Kuwaiti Dinar", symbol: "د.ك", decimals: 3 },
  BHD: { name: "Bahraini Dinar", symbol: ".د.ب", decimals: 3 },
  OMR: { name: "Omani Rial", symbol: "﷼", decimals: 3 },
  MYR: { name: "Malaysian Ringgit", symbol: "RM", decimals: 2 },
  THB: { name: "Thai Baht", symbol: "฿", decimals: 2 },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp", decimals: 0 },
  PHP: { name: "Philippine Peso", symbol: "₱", decimals: 2 },
  MXN: { name: "Mexican Peso", symbol: "$", decimals: 2 },
  BRL: { name: "Brazilian Real", symbol: "R$", decimals: 2 },
  RUB: { name: "Russian Ruble", symbol: "₽", decimals: 2 },
  KRW: { name: "South Korean Won", symbol: "₩", decimals: 0 },
  TRY: { name: "Turkish Lira", symbol: "₺", decimals: 2 },
  PKR: { name: "Pakistani Rupee", symbol: "₨", decimals: 2 },
};

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  ownerUserId: true,
  ownerOrgName: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Property name must be at least 2 characters"),
  propertyType: z.enum(["APARTMENT", "VILLA", "PLOT", "OFFICE", "SHOP", "HOUSE", "TOWNHOUSE", "WAREHOUSE", "INDUSTRIAL", "MIXED_USE", "LAND"]),
  usageType: z.enum(["LONG_TERM_RENTAL", "SHORT_TERM_RENTAL", "OWNER_OCCUPIED"]).default("LONG_TERM_RENTAL"),
  occupancyPurpose: z.enum(["OWNER_OCCUPIED", "RENTAL", "INVESTMENT", "VACANT_LAND"]).optional(),
  currencyCode: z.enum(["USD", "EUR", "GBP", "INR", "AED", "SCR", "CAD", "AUD", "SGD", "CHF", "JPY", "CNY", "ZAR", "NZD", "HKD", "SAR", "QAR", "KWD", "BHD", "OMR", "MYR", "THB", "IDR", "PHP", "MXN", "BRL", "RUB", "KRW", "TRY", "PKR"]).optional(),
  addressLine1: z.string().min(5, "Address must be at least 5 characters"),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  country: z.string().min(2, "Country must be at least 2 characters"),
  pincode: z.string().min(4, "Pincode must be at least 4 characters"),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  portfolioTag: z.string().optional().nullable(),
  coOwnershipNotes: z.string().optional().nullable(),
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

// Tenant verification status enum (for KYC)
export const tenantVerificationStatusEnum = pgEnum("tenant_verification_status", ["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"]);

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
  // KYC (Know Your Customer) fields
  passportNumber: text("passport_number"),
  nationality: text("nationality"),
  dateOfBirth: timestamp("date_of_birth"),
  workPermitNumber: text("work_permit_number"),
  workPermitExpiry: timestamp("work_permit_expiry"),
  verificationStatus: tenantVerificationStatusEnum("verification_status").notNull().default("PENDING"),
  kycNotes: text("kyc_notes"),
  kycCompletedAt: timestamp("kyc_completed_at"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tenants_created_by_idx").on(table.createdByUserId),
  index("tenants_email_idx").on(table.email),
  index("tenants_verification_idx").on(table.verificationStatus),
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
  nextInvoiceDate: timestamp("next_invoice_date"),
  lastInvoiceGeneratedAt: timestamp("last_invoice_generated_at"),
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
  // Multi-currency support
  currencyCode: currencyCodeEnum("currency_code").default("USD"), // Transaction currency
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }).default("1"), // Rate at transaction time
  totalAmountBase: decimal("total_amount_base", { precision: 12, scale: 2 }), // Amount in property's base currency
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  dueDate: timestamp("due_date").notNull(),
  issuedAt: timestamp("issued_at"),
  paidAt: timestamp("paid_at"),
  ledgerEntryId: integer("ledger_entry_id"),
  invoiceDocumentId: integer("invoice_document_id"),
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
  // Multi-currency support
  currencyCode: currencyCodeEnum("currency_code").default("USD"), // Payment currency
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }).default("1"), // Rate at payment time
  amountBase: decimal("amount_base", { precision: 12, scale: 2 }), // Amount in property's base currency
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("BANK_TRANSFER"),
  reference: text("reference"),
  appliedToType: appliedToTypeEnum("applied_to_type").notNull(),
  appliedToId: integer("applied_to_id").notNull(),
  bankAccountId: integer("bank_account_id"),
  ledgerEntryId: integer("ledger_entry_id"),
  proofDocumentId: integer("proof_document_id"),
  receiptDocumentId: integer("receipt_document_id"),
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
  // Multi-currency support - original transaction currency
  currencyCode: currencyCodeEnum("currency_code").default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }).default("1"),
  debitBase: decimal("debit_base", { precision: 14, scale: 2 }).default("0"), // Debit in reporting currency
  creditBase: decimal("credit_base", { precision: 14, scale: 2 }).default("0"), // Credit in reporting currency
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
// INVENTORY MANAGEMENT
// =====================================================

// Inventory item type enum
export const inventoryItemTypeEnum = pgEnum("inventory_item_type", [
  "KEY",                    // Keys (master, unit, mailbox)
  "REMOTE",                 // Remotes (gate, garage, AC)
  "ACCESS_CARD",            // Access cards, fobs
  "APPLIANCE",              // Small appliances (microwave, vacuum)
  "FURNITURE",              // Furniture items
  "FIXTURE",                // Light fixtures, faucets
  "TOOL",                   // Maintenance tools
  "CONSUMABLE",             // Cleaning supplies, bulbs
  "ELECTRONIC",             // Electronics (routers, cameras)
  "OTHER"
]);

// Inventory item status enum
export const inventoryItemStatusEnum = pgEnum("inventory_item_status", [
  "AVAILABLE",              // In stock, ready to issue
  "ASSIGNED",               // Issued to property/tenant
  "DAMAGED",                // Damaged, needs repair/replacement
  "LOST",                   // Lost or missing
  "RETIRED"                 // No longer in use
]);

// Inventory movement type enum
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "RECEIVED",               // Received into stock
  "ISSUED",                 // Issued to property/tenant
  "RETURNED",               // Returned from property/tenant
  "TRANSFERRED",            // Transferred between locations
  "DAMAGED",                // Marked as damaged
  "LOST",                   // Marked as lost
  "ADJUSTED"                // Stock adjustment
]);

// Inventory categories (tree structure)
export const inventoryCategories = pgTable("inventory_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  parentId: integer("parent_id").references((): any => inventoryCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  itemType: inventoryItemTypeEnum("item_type"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("inventory_categories_parent_idx").on(table.parentId),
]);

// Warehouse locations for spare stock
export const warehouseLocations = pgTable("warehouse_locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address"),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory items
export const inventoryItems = pgTable("inventory_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id").references(() => inventoryCategories.id, { onDelete: "set null" }),
  itemType: inventoryItemTypeEnum("item_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  serialNumber: text("serial_number"),
  unitCost: decimal("unit_cost", { precision: 14, scale: 2 }).default("0"),
  reorderLevel: integer("reorder_level").default(0),
  status: inventoryItemStatusEnum("status").notNull().default("AVAILABLE"),
  // Current location (either warehouse or property)
  warehouseId: integer("warehouse_id").references(() => warehouseLocations.id, { onDelete: "set null" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  // If assigned to a tenant
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  // Tracking
  quantity: integer("quantity").default(1).notNull(),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("inventory_items_category_idx").on(table.categoryId),
  index("inventory_items_type_idx").on(table.itemType),
  index("inventory_items_status_idx").on(table.status),
  index("inventory_items_warehouse_idx").on(table.warehouseId),
  index("inventory_items_property_idx").on(table.propertyId),
  index("inventory_items_tenant_idx").on(table.tenantId),
]);

// Inventory movements (issue/return/transfer history)
export const inventoryMovements = pgTable("inventory_movements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  itemId: integer("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  movementType: inventoryMovementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  // From location
  fromWarehouseId: integer("from_warehouse_id").references(() => warehouseLocations.id, { onDelete: "set null" }),
  fromPropertyId: integer("from_property_id").references(() => properties.id, { onDelete: "set null" }),
  // To location
  toWarehouseId: integer("to_warehouse_id").references(() => warehouseLocations.id, { onDelete: "set null" }),
  toPropertyId: integer("to_property_id").references(() => properties.id, { onDelete: "set null" }),
  toUnitId: integer("to_unit_id").references(() => units.id, { onDelete: "set null" }),
  toTenantId: integer("to_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  // Condition tracking
  conditionBefore: text("condition_before"),
  conditionAfter: text("condition_after"),
  damageNotes: text("damage_notes"),
  // If damage results in expense
  expenseId: integer("expense_id").references(() => expenses.id, { onDelete: "set null" }),
  // Metadata
  notes: text("notes"),
  performedByUserId: integer("performed_by_user_id").notNull().references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("inventory_movements_item_idx").on(table.itemId),
  index("inventory_movements_type_idx").on(table.movementType),
  index("inventory_movements_date_idx").on(table.performedAt),
]);

// =====================================================
// TENANT ONBOARDING MODULE
// =====================================================

// Onboarding stage enum - workflow stages for tenant move-in
export const onboardingStageEnum = pgEnum("onboarding_stage", [
  "CONTRACT_SIGNED",       // Lease agreement signed
  "DEPOSIT_PAID",          // Security deposit received
  "INSPECTION_SCHEDULED",  // Property inspection scheduled
  "INSPECTION_COMPLETED",  // Inspection done, condition documented
  "HANDOVER_SCHEDULED",    // Key handover appointment set
  "HANDOVER_COMPLETED",    // Keys and items handed over
  "MOVE_IN_COMPLETED"      // Tenant has moved in
]);

// Onboarding status enum - overall process status
export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "NOT_STARTED",           // Lease created but onboarding not begun
  "IN_PROGRESS",           // Onboarding underway
  "COMPLETED",             // All stages done
  "ON_HOLD",               // Paused for some reason
  "CANCELLED"              // Onboarding cancelled
]);

// Room type enum for condition checklists
export const checklistRoomTypeEnum = pgEnum("checklist_room_type", [
  "LIVING_ROOM",
  "BEDROOM",
  "BATHROOM",
  "KITCHEN",
  "DINING_ROOM",
  "BALCONY",
  "TERRACE",
  "GARAGE",
  "STORAGE",
  "ENTRANCE",
  "HALLWAY",
  "UTILITY_ROOM",
  "GARDEN",
  "POOL_AREA",
  "OTHER"
]);

// Condition rating enum
export const conditionRatingEnum = pgEnum("condition_rating", [
  "EXCELLENT",             // Like new, no issues
  "GOOD",                  // Minor wear, acceptable
  "FAIR",                  // Some wear, functional
  "POOR",                  // Significant wear or damage
  "DAMAGED"                // Requires repair
]);

// Onboarding Processes table - tracks overall onboarding for each lease
export const onboardingProcesses = pgTable("onboarding_processes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leaseId: integer("lease_id").notNull().references(() => leases.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  // Status tracking
  status: onboardingStatusEnum("status").notNull().default("NOT_STARTED"),
  currentStage: onboardingStageEnum("current_stage"),
  // Stage completion timestamps
  contractSignedAt: timestamp("contract_signed_at"),
  depositPaidAt: timestamp("deposit_paid_at"),
  depositAmount: decimal("deposit_amount", { precision: 14, scale: 2 }),
  depositReference: text("deposit_reference"),
  inspectionScheduledAt: timestamp("inspection_scheduled_at"),
  inspectionCompletedAt: timestamp("inspection_completed_at"),
  inspectionNotes: text("inspection_notes"),
  handoverScheduledAt: timestamp("handover_scheduled_at"),
  handoverCompletedAt: timestamp("handover_completed_at"),
  moveInScheduledAt: timestamp("move_in_scheduled_at"),
  moveInCompletedAt: timestamp("move_in_completed_at"),
  // Digital signatures (base64 or document links)
  tenantSignature: text("tenant_signature"),
  managerSignature: text("manager_signature"),
  signedAt: timestamp("signed_at"),
  // Metadata
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("onboarding_lease_idx").on(table.leaseId),
  index("onboarding_tenant_idx").on(table.tenantId),
  index("onboarding_property_idx").on(table.propertyId),
  index("onboarding_status_idx").on(table.status),
]);

// Condition Checklist Items table - room-by-room inspection documentation
export const conditionChecklistItems = pgTable("condition_checklist_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  onboardingId: integer("onboarding_id").notNull().references(() => onboardingProcesses.id, { onDelete: "cascade" }),
  // Room/area details
  roomType: checklistRoomTypeEnum("room_type").notNull(),
  roomName: text("room_name"), // e.g., "Master Bedroom", "Bathroom 2"
  // Item being inspected
  itemName: text("item_name").notNull(), // e.g., "Walls", "Floor", "Light fixtures"
  itemDescription: text("item_description"),
  // Condition assessment
  conditionRating: conditionRatingEnum("condition_rating").notNull(),
  conditionNotes: text("condition_notes"),
  // Photo documentation (array of URLs/paths)
  photos: text("photos").array().default([]),
  // Damage tracking
  hasDamage: integer("has_damage").default(0).notNull(),
  damageDescription: text("damage_description"),
  estimatedRepairCost: decimal("estimated_repair_cost", { precision: 10, scale: 2 }),
  // If damage creates a maintenance issue
  maintenanceIssueId: integer("maintenance_issue_id").references(() => maintenanceIssues.id, { onDelete: "set null" }),
  // If damage creates an expense
  expenseId: integer("expense_id"),
  // Metadata
  inspectedByUserId: integer("inspected_by_user_id").notNull().references(() => users.id),
  inspectedAt: timestamp("inspected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("checklist_onboarding_idx").on(table.onboardingId),
  index("checklist_room_idx").on(table.roomType),
  index("checklist_damage_idx").on(table.hasDamage),
]);

// Handover Items table - inventory items given to tenant during onboarding
export const handoverItems = pgTable("handover_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  onboardingId: integer("onboarding_id").notNull().references(() => onboardingProcesses.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  // Quantity handed over
  quantity: integer("quantity").notNull().default(1),
  // Condition at handover
  conditionAtHandover: conditionRatingEnum("condition_at_handover").notNull(),
  conditionNotes: text("condition_notes"),
  photos: text("photos").array().default([]),
  // Acknowledgment
  acknowledgedByTenant: integer("acknowledged_by_tenant").default(0).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  // Return tracking (for move-out)
  returnedAt: timestamp("returned_at"),
  conditionAtReturn: conditionRatingEnum("condition_at_return"),
  returnNotes: text("return_notes"),
  returnPhotos: text("return_photos").array().default([]),
  // Metadata
  handedOverByUserId: integer("handed_over_by_user_id").notNull().references(() => users.id),
  handedOverAt: timestamp("handed_over_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("handover_onboarding_idx").on(table.onboardingId),
  index("handover_item_idx").on(table.inventoryItemId),
]);

// =====================================================
// TENANT OUTBOARDING (MOVE-OUT)
// =====================================================

// Outboarding stage enum - progressive move-out workflow
export const outboardingStageEnum = pgEnum("outboarding_stage", [
  "NOTICE_RECEIVED",         // Tenant has given notice to vacate
  "EXIT_INSPECTION_SCHEDULED", // Exit inspection appointment set
  "EXIT_INSPECTION_COMPLETED", // Exit inspection done, damages documented
  "INVENTORY_RETURN",        // Items being returned and checked
  "DEPOSIT_SETTLEMENT",      // Calculating deposit deductions
  "FINAL_CHECKOUT"           // Move-out complete, keys returned
]);

// Outboarding status enum
export const outboardingStatusEnum = pgEnum("outboarding_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED"
]);

// Deposit deduction reason enum
export const depositDeductionReasonEnum = pgEnum("deposit_deduction_reason", [
  "DAMAGE_REPAIR",           // Repairs for damages beyond normal wear
  "CLEANING",                // Professional cleaning required
  "UNPAID_RENT",             // Outstanding rent balance
  "UNPAID_UTILITIES",        // Outstanding utility bills
  "MISSING_ITEMS",           // Items not returned
  "LOCK_CHANGE",             // Key not returned, lock change needed
  "EARLY_TERMINATION",       // Early lease termination fee
  "OTHER"                    // Other deductions
]);

// Outboarding Processes table
export const outboardingProcesses = pgTable("outboarding_processes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leaseId: integer("lease_id").notNull().references(() => leases.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  onboardingId: integer("onboarding_id").references(() => onboardingProcesses.id, { onDelete: "set null" }),
  // Status tracking
  status: outboardingStatusEnum("status").notNull().default("NOT_STARTED"),
  currentStage: outboardingStageEnum("current_stage"),
  // Notice details
  noticeReceivedAt: timestamp("notice_received_at"),
  noticeType: text("notice_type"), // "TENANT_INITIATED", "LEASE_EXPIRY", "EVICTION", etc.
  plannedMoveOutDate: timestamp("planned_move_out_date"),
  actualMoveOutDate: timestamp("actual_move_out_date"),
  // Exit inspection
  exitInspectionScheduledAt: timestamp("exit_inspection_scheduled_at"),
  exitInspectionCompletedAt: timestamp("exit_inspection_completed_at"),
  exitInspectionNotes: text("exit_inspection_notes"),
  // Inventory return
  inventoryReturnCompletedAt: timestamp("inventory_return_completed_at"),
  inventoryReturnNotes: text("inventory_return_notes"),
  // Deposit settlement
  depositSettlementCompletedAt: timestamp("deposit_settlement_completed_at"),
  originalDepositAmount: decimal("original_deposit_amount", { precision: 14, scale: 2 }),
  totalDeductions: decimal("total_deductions", { precision: 14, scale: 2 }).default("0"),
  refundAmount: decimal("refund_amount", { precision: 14, scale: 2 }),
  refundPaidAt: timestamp("refund_paid_at"),
  refundReference: text("refund_reference"),
  // Final checkout
  keysReturnedAt: timestamp("keys_returned_at"),
  finalCheckoutAt: timestamp("final_checkout_at"),
  // Digital signatures
  tenantSignature: text("tenant_signature"),
  managerSignature: text("manager_signature"),
  signedAt: timestamp("signed_at"),
  // Metadata
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("outboarding_lease_idx").on(table.leaseId),
  index("outboarding_tenant_idx").on(table.tenantId),
  index("outboarding_property_idx").on(table.propertyId),
  index("outboarding_status_idx").on(table.status),
]);

// Exit Inspection Checklist - compares against move-in condition
export const exitChecklistItems = pgTable("exit_checklist_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  outboardingId: integer("outboarding_id").notNull().references(() => outboardingProcesses.id, { onDelete: "cascade" }),
  // Link to original move-in checklist item for comparison
  moveInChecklistItemId: integer("move_in_checklist_item_id").references(() => conditionChecklistItems.id, { onDelete: "set null" }),
  // Room/area details
  roomType: checklistRoomTypeEnum("room_type").notNull(),
  roomName: text("room_name"),
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description"),
  // Move-in condition (copied from onboarding for reference)
  moveInCondition: conditionRatingEnum("move_in_condition"),
  moveInNotes: text("move_in_notes"),
  moveInPhotos: text("move_in_photos").array().default([]),
  // Current condition at exit
  exitCondition: conditionRatingEnum("exit_condition").notNull(),
  exitNotes: text("exit_notes"),
  exitPhotos: text("exit_photos").array().default([]),
  // Damage assessment
  hasDamage: integer("has_damage").default(0).notNull(),
  damageDescription: text("damage_description"),
  estimatedRepairCost: decimal("estimated_repair_cost", { precision: 10, scale: 2 }),
  isNormalWear: integer("is_normal_wear").default(0).notNull(), // Normal wear vs chargeable damage
  // Links to related records
  maintenanceIssueId: integer("maintenance_issue_id").references(() => maintenanceIssues.id, { onDelete: "set null" }),
  depositDeductionId: integer("deposit_deduction_id"), // Links to deposit deduction
  // Metadata
  inspectedByUserId: integer("inspected_by_user_id").notNull().references(() => users.id),
  inspectedAt: timestamp("inspected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("exit_checklist_outboarding_idx").on(table.outboardingId),
  index("exit_checklist_room_idx").on(table.roomType),
  index("exit_checklist_damage_idx").on(table.hasDamage),
]);

// Deposit Deductions table - itemized deductions from security deposit
export const depositDeductions = pgTable("deposit_deductions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  outboardingId: integer("outboarding_id").notNull().references(() => outboardingProcesses.id, { onDelete: "cascade" }),
  reason: depositDeductionReasonEnum("reason").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  // Supporting documentation
  photos: text("photos").array().default([]),
  invoiceReference: text("invoice_reference"),
  // Links to related records
  exitChecklistItemId: integer("exit_checklist_item_id").references(() => exitChecklistItems.id, { onDelete: "set null" }),
  expenseId: integer("expense_id").references(() => expenses.id, { onDelete: "set null" }),
  // Tenant acknowledgment
  acknowledgedByTenant: integer("acknowledged_by_tenant").default(0).notNull(),
  disputedByTenant: integer("disputed_by_tenant").default(0).notNull(),
  disputeNotes: text("dispute_notes"),
  // Metadata
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("deduction_outboarding_idx").on(table.outboardingId),
  index("deduction_reason_idx").on(table.reason),
]);

// =====================================================
// EXPENSE MANAGEMENT
// =====================================================

// Expense category enum
export const expenseCategoryEnum = pgEnum("expense_category", [
  "MAINTENANCE",           // Repairs, maintenance work
  "DOCUMENT_FEES",         // License renewals, permit fees, registration
  "INSURANCE",             // Insurance premiums
  "UTILITIES",             // Landlord-paid utilities
  "PROPERTY_TAX",          // Property taxes
  "MANAGEMENT_FEES",       // Property management fees
  "LEGAL_FEES",            // Legal and professional fees
  "SUPPLIES",              // Cleaning supplies, consumables
  "CAPITAL_IMPROVEMENT",   // Major renovations, upgrades
  "TRAVEL",                // Travel related to property management
  "MARKETING",             // Advertising, tenant acquisition
  "BANK_CHARGES",          // Bank fees, transaction fees
  "OTHER"                  // Miscellaneous expenses
]);

// Expense payment status enum
export const expensePaymentStatusEnum = pgEnum("expense_payment_status", [
  "UNPAID",                // Not yet paid
  "PAID",                  // Fully paid
  "PARTIALLY_PAID",        // Partially paid
  "CANCELLED"              // Cancelled/voided
]);

// Expense payment method enum
export const expensePaymentMethodEnum = pgEnum("expense_payment_method", [
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CHECK",
  "MOBILE_PAYMENT",
  "OTHER"
]);

// Expense approval status enum
export const expenseApprovalStatusEnum = pgEnum("expense_approval_status", [
  "PENDING",               // Submitted, awaiting approval
  "APPROVED",              // Approved by authorized user
  "REJECTED",              // Rejected by authorized user
  "CANCELLED"              // Cancelled by submitter
]);

// Expenses table
export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  // Optional links to related modules
  maintenanceIssueId: integer("maintenance_issue_id").references(() => maintenanceIssues.id, { onDelete: "set null" }),
  maintenanceTaskId: integer("maintenance_task_id").references(() => maintenanceTasks.id, { onDelete: "set null" }),
  complianceDocumentId: integer("compliance_document_id").references(() => complianceDocuments.id, { onDelete: "set null" }),
  // Expense details
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  // Multi-currency support
  currencyCode: currencyCodeEnum("currency_code").default("USD"), // Expense currency
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }).default("1"), // Rate at expense time
  totalAmountBase: decimal("total_amount_base", { precision: 14, scale: 2 }), // Amount in property's base currency
  expenseDate: timestamp("expense_date").notNull(),
  // Vendor information
  vendorName: text("vendor_name"),
  vendorTaxId: text("vendor_tax_id"),
  vendorContact: text("vendor_contact"),
  invoiceNumber: text("invoice_number"),
  // Payment details
  paymentStatus: expensePaymentStatusEnum("payment_status").notNull().default("UNPAID"),
  paymentMethod: expensePaymentMethodEnum("payment_method"),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  // Attachments (receipt images, invoices)
  attachments: text("attachments").array().default([]),
  notes: text("notes"),
  // Approval workflow
  approvalStatus: expenseApprovalStatusEnum("approval_status").notNull().default("PENDING"),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  // Accounting integration (only populated after approval)
  ledgerEntryId: integer("ledger_entry_id"),
  // Audit fields
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("expenses_owner_idx").on(table.ownerId),
  index("expenses_property_idx").on(table.propertyId),
  index("expenses_category_idx").on(table.category),
  index("expenses_date_idx").on(table.expenseDate),
  index("expenses_status_idx").on(table.paymentStatus),
  index("expenses_approval_idx").on(table.approvalStatus),
  index("expenses_maintenance_issue_idx").on(table.maintenanceIssueId),
  index("expenses_maintenance_task_idx").on(table.maintenanceTaskId),
  index("expenses_compliance_idx").on(table.complianceDocumentId),
]);

// =====================================================
// ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
// =====================================================

// System role enum - predefined roles with bundled permissions
export const systemRoleEnum = pgEnum("system_role", [
  "SUPER_ADMIN",        // Full system access, can manage all users and settings
  "PROPERTY_MANAGER",   // Manage properties, units, tenants, leases
  "ACCOUNTANT",         // View/manage invoices, payments, financial reports
  "MAINTENANCE_SUPERVISOR", // Manage maintenance tasks, teams, materials
  "COMPLIANCE_OFFICER", // Manage documents, licenses, permits, reminders
  "VIEWER"              // Read-only access
]);

// Permission scope enum - whether permission applies globally or per-property
export const permissionScopeEnum = pgEnum("permission_scope", ["GLOBAL", "PROPERTY"]);

// Roles table - predefined and custom roles
export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isSystem: integer("is_system").default(1).notNull(), // System roles cannot be deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("roles_name_idx").on(table.name),
]);

// Permissions table - granular permissions for each module
export const permissions = pgTable("permissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(), // e.g., "property.view", "tenant.create"
  displayName: text("display_name").notNull(),
  description: text("description"),
  module: text("module").notNull(), // e.g., "property", "tenant", "lease", "finance"
  scope: permissionScopeEnum("scope").notNull().default("PROPERTY"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("permissions_key_idx").on(table.key),
  index("permissions_module_idx").on(table.module),
]);

// Role-Permission mapping table
export const rolePermissions = pgTable("role_permissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("role_permissions_role_idx").on(table.roleId),
  index("role_permissions_permission_idx").on(table.permissionId),
]);

// User Role Assignments - assigns roles to users (globally or per-property)
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "cascade" }), // NULL = global assignment
  assignedByUserId: integer("assigned_by_user_id").notNull().references(() => users.id),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_role_user_idx").on(table.userId),
  index("user_role_role_idx").on(table.roleId),
  index("user_role_property_idx").on(table.propertyId),
]);

// Add isSuperAdmin to users for the first admin bootstrap
// This is handled via a separate field rather than modifying the users table

// =====================================================
// DASHBOARD WIDGET SYSTEM
// =====================================================

// Widget size enum for grid layout
export const widgetSizeEnum = pgEnum("widget_size", ["SMALL", "MEDIUM", "LARGE", "FULL"]);

// Dashboard layout scope - whether it applies to a role globally or a specific user
export const layoutScopeEnum = pgEnum("layout_scope", ["ROLE", "USER"]);

// Dashboard Layouts table - stores widget configurations per role or user
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  scope: layoutScopeEnum("scope").notNull().default("ROLE"),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }), // NULL for user-specific layouts
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // NULL for role-based layouts
  widgets: jsonb("widgets").notNull().$type<DashboardWidgetConfig[]>(),
  isDefault: integer("is_default").default(0).notNull(), // Default layout for new users with this role
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dashboard_layouts_role_idx").on(table.roleId),
  index("dashboard_layouts_user_idx").on(table.userId),
]);

// Widget configuration type (stored in JSONB)
export type DashboardWidgetConfig = {
  id: string; // Unique instance ID
  widgetType: string; // References widget registry key
  title?: string; // Optional custom title
  size: "SMALL" | "MEDIUM" | "LARGE" | "FULL";
  order: number; // Display order
  settings?: Record<string, unknown>; // Widget-specific settings
};

// Widget registry definition (used in code, not stored in DB)
export type DashboardWidgetDefinition = {
  type: string; // Unique identifier
  title: string; // Default title
  description: string;
  defaultSize: "SMALL" | "MEDIUM" | "LARGE" | "FULL";
  requiredPermissions: string[]; // Any of these permissions grants access
  availableSizes: ("SMALL" | "MEDIUM" | "LARGE" | "FULL")[];
  category: "OVERVIEW" | "FINANCIAL" | "MAINTENANCE" | "COMPLIANCE" | "ACTIVITY" | "QUICK_ACTIONS";
};

// =====================================================
// SYSTEM SETTINGS
// =====================================================

export const settingCategoryEnum = pgEnum("setting_category", [
  "FINANCIAL",
  "LEASE_DEFAULTS",
  "DASHBOARD",
  "OPERATIONS",
  "AUTOMATION",
  "NOTIFICATIONS"
]);

export const systemSettings = pgTable("system_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: settingCategoryEnum("category").notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  label: text("label"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("system_settings_user_idx").on(table.userId),
  index("system_settings_category_idx").on(table.category),
  index("system_settings_key_idx").on(table.userId, table.key),
]);

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// Default settings structure
export type FinancialSettings = {
  defaultLateFeeEnabled: boolean;
  defaultLateFeePercent: string;
  defaultLateFeeGraceDays: number;
  invoiceNumberPrefix: string;
  invoiceNumberNext: number;
  expenseApprovalThreshold: string;
  defaultCurrency: string;
};

export type LeaseDefaultSettings = {
  defaultRentFrequency: string;
  defaultPaymentDueDay: number;
  defaultSecurityDepositMonths: number;
  renewalReminderDays: number;
  noticePeriodDays: number;
};

export type OperationsSettings = {
  maintenanceDefaultSLAHours: number;
  onboardingAutoAdvance: boolean;
  requirePhotoForIssues: boolean;
  requirePhotoForOnboarding: boolean;
  defaultMaintenanceCategory: string;
};

export type AutomationSettings = {
  autoGenerateRentInvoices: boolean;
  rentInvoiceGenerateDaysBefore: number;
  complianceReminderLeadDays: number;
  leaseRenewalReminderDays: number;
  autoCalculateLateFees: boolean;
};

// =====================================================
// SHORT-TERM RENTAL TABLES
// =====================================================

// Turnover status enum
export const turnoverStatusEnum = pgEnum("turnover_status", [
  "PENDING",        // Checkout expected, not started
  "CLEANING",       // Cleaning in progress
  "INSPECTION",     // Quality check needed
  "READY",          // Ready for next guest
  "BLOCKED"         // Unit not available
]);

// Guest check-in/out status
export const guestStatusEnum = pgEnum("guest_status", [
  "EXPECTED",       // Booking confirmed, not arrived
  "CHECKED_IN",     // Guest has arrived
  "CHECKED_OUT",    // Guest has departed
  "NO_SHOW",        // Guest didn't arrive
  "CANCELLED"       // Booking cancelled
]);

// Turnovers table - track unit status between stays
export const turnovers = pgTable("turnovers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  status: turnoverStatusEnum("status").default("PENDING").notNull(),
  
  // Guest info
  checkoutDate: date("checkout_date").notNull(),
  nextCheckinDate: date("next_checkin_date"),
  guestName: text("guest_name"),
  guestNotes: text("guest_notes"),
  
  // Cleaning assignment
  assignedToMemberId: integer("assigned_to_member_id").references(() => maintenanceTeamMembers.id, { onDelete: "set null" }),
  cleaningStartedAt: timestamp("cleaning_started_at"),
  cleaningCompletedAt: timestamp("cleaning_completed_at"),
  
  // Inspection
  inspectedByUserId: integer("inspected_by_user_id").references(() => users.id, { onDelete: "set null" }),
  inspectionNotes: text("inspection_notes"),
  inspectionPhotos: text("inspection_photos").array(),
  passedInspection: integer("passed_inspection").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("turnovers_property_idx").on(table.propertyId),
  index("turnovers_status_idx").on(table.status),
  index("turnovers_checkout_date_idx").on(table.checkoutDate),
]);

// Cleaning checklist templates
export const cleaningTemplates = pgTable("cleaning_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  roomType: text("room_type"), // Optional: BEDROOM, BATHROOM, KITCHEN, LIVING_AREA, EXTERIOR
  isDefault: integer("is_default").default(0),
  items: jsonb("items").default([]).$type<{ task: string; order: number; isRequired: boolean }[]>(),
  estimatedMinutes: integer("estimated_minutes"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("cleaning_templates_property_idx").on(table.propertyId),
]);

// Cleaning tasks - individual tasks for a turnover
export const cleaningTasks = pgTable("cleaning_tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  turnoverId: integer("turnover_id").notNull().references(() => turnovers.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => cleaningTemplates.id, { onDelete: "set null" }),
  taskName: text("task_name").notNull(),
  roomType: text("room_type"),
  isCompleted: integer("is_completed").default(0),
  completedByMemberId: integer("completed_by_member_id").references(() => maintenanceTeamMembers.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("cleaning_tasks_turnover_idx").on(table.turnoverId),
  index("cleaning_tasks_completed_idx").on(table.isCompleted),
]);

// Guest check-ins - quick registration for short-term stays
export const guestCheckins = pgTable("guest_checkins", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  turnoverId: integer("turnover_id").references(() => turnovers.id, { onDelete: "set null" }),
  
  // Guest info
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  numberOfGuests: integer("number_of_guests").default(1),
  
  // Stay details
  status: guestStatusEnum("status").default("EXPECTED").notNull(),
  expectedCheckinDate: date("expected_checkin_date").notNull(),
  expectedCheckoutDate: date("expected_checkout_date").notNull(),
  actualCheckinTime: timestamp("actual_checkin_time"),
  actualCheckoutTime: timestamp("actual_checkout_time"),
  
  // Access & notes
  accessCode: text("access_code"),
  specialRequests: text("special_requests"),
  internalNotes: text("internal_notes"),
  
  // Verification
  idVerified: integer("id_verified").default(0),
  signatureReceived: integer("signature_received").default(0),
  
  checkedInByUserId: integer("checked_in_by_user_id").references(() => users.id, { onDelete: "set null" }),
  checkedOutByUserId: integer("checked_out_by_user_id").references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("guest_checkins_property_idx").on(table.propertyId),
  index("guest_checkins_status_idx").on(table.status),
  index("guest_checkins_dates_idx").on(table.expectedCheckinDate, table.expectedCheckoutDate),
]);

// =====================================================
// SHORT-TERM RENTAL INSERT SCHEMAS
// =====================================================

export const insertTurnoverSchema = createInsertSchema(turnovers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  propertyId: z.number().min(1, "Property is required"),
  checkoutDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
  nextCheckinDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? val : val.toISOString().split('T')[0];
  }),
});

export const insertCleaningTemplateSchema = createInsertSchema(cleaningTemplates).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  propertyId: z.number().min(1, "Property is required"),
  name: z.string().min(1, "Name is required"),
});

export const insertCleaningTaskSchema = createInsertSchema(cleaningTasks).omit({
  id: true,
  createdAt: true,
}).extend({
  turnoverId: z.number().min(1, "Turnover is required"),
  taskName: z.string().min(1, "Task name is required"),
});

export const insertGuestCheckinSchema = createInsertSchema(guestCheckins).omit({
  id: true,
  checkedInByUserId: true,
  checkedOutByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  propertyId: z.number().min(1, "Property is required"),
  guestName: z.string().min(1, "Guest name is required"),
  expectedCheckinDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
  expectedCheckoutDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
});

// Short-term rental types
export type Turnover = typeof turnovers.$inferSelect;
export type InsertTurnover = z.infer<typeof insertTurnoverSchema>;
export type CleaningTemplate = typeof cleaningTemplates.$inferSelect;
export type InsertCleaningTemplate = z.infer<typeof insertCleaningTemplateSchema>;
export type CleaningTask = typeof cleaningTasks.$inferSelect;
export type InsertCleaningTask = z.infer<typeof insertCleaningTaskSchema>;
export type GuestCheckin = typeof guestCheckins.$inferSelect;
export type InsertGuestCheckin = z.infer<typeof insertGuestCheckinSchema>;

// Extended types for short-term rentals
export type TurnoverWithDetails = Turnover & {
  property?: Property | null;
  unit?: Unit | null;
  assignedMember?: MaintenanceTeamMember | null;
  cleaningTasks?: CleaningTask[];
  guestCheckin?: GuestCheckin | null;
};

export type GuestCheckinWithDetails = GuestCheckin & {
  property?: Property | null;
  unit?: Unit | null;
  turnover?: Turnover | null;
};

// =====================================================
// OWNER-OCCUPIED TABLES
// =====================================================

// Maintenance frequency enum
export const maintenanceFrequencyEnum = pgEnum("maintenance_frequency", [
  "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "BIANNUALLY", "ANNUALLY", "AS_NEEDED"
]);

// Maintenance season enum
export const maintenanceSeasonEnum = pgEnum("maintenance_season", [
  "SPRING", "SUMMER", "FALL", "WINTER", "ALL_YEAR"
]);

// Appliance category enum
export const applianceCategoryEnum = pgEnum("appliance_category", [
  "KITCHEN", "LAUNDRY", "HVAC", "PLUMBING", "ELECTRICAL", "OUTDOOR", "SECURITY", "ENTERTAINMENT", "OTHER"
]);

// Home Maintenance Schedules - recurring maintenance tasks for personal properties
export const homeMaintenanceSchedules = pgTable("home_maintenance_schedules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // e.g., "HVAC", "Plumbing", "Exterior", "Interior", "Lawn", "Pool", etc.
  frequency: maintenanceFrequencyEnum("frequency").notNull().default("ANNUALLY"),
  preferredSeason: maintenanceSeasonEnum("preferred_season").default("ALL_YEAR"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  lastCompletedDate: date("last_completed_date"),
  nextDueDate: date("next_due_date"),
  reminderDaysBefore: integer("reminder_days_before").default(14),
  notes: text("notes"),
  isActive: integer("is_active").default(1).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("home_maintenance_property_idx").on(table.propertyId),
  index("home_maintenance_next_due_idx").on(table.nextDueDate),
  index("home_maintenance_category_idx").on(table.category),
]);

// Appliances - track home appliances with warranty and service info
export const appliances = pgTable("appliances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => units.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  category: applianceCategoryEnum("category").notNull().default("OTHER"),
  location: text("location"), // e.g., "Kitchen", "Master Bedroom", "Garage"
  purchaseDate: date("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
  purchaseStore: text("purchase_store"),
  warrantyStartDate: date("warranty_start_date"),
  warrantyEndDate: date("warranty_end_date"),
  warrantyDetails: text("warranty_details"),
  serviceProviderName: text("service_provider_name"),
  serviceProviderPhone: text("service_provider_phone"),
  serviceProviderEmail: text("service_provider_email"),
  notes: text("notes"),
  isActive: integer("is_active").default(1).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("appliances_property_idx").on(table.propertyId),
  index("appliances_warranty_idx").on(table.warrantyEndDate),
  index("appliances_category_idx").on(table.category),
]);

// Appliance Service History - track maintenance/repairs on appliances
export const applianceServiceHistory = pgTable("appliance_service_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  applianceId: integer("appliance_id").notNull().references(() => appliances.id, { onDelete: "cascade" }),
  serviceDate: date("service_date").notNull(),
  serviceType: text("service_type").notNull(), // e.g., "Repair", "Maintenance", "Inspection", "Replacement"
  description: text("description"),
  servicedBy: text("serviced_by"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("service_history_appliance_idx").on(table.applianceId),
  index("service_history_date_idx").on(table.serviceDate),
]);

// OWNER-OCCUPIED INSERT SCHEMAS
export const insertHomeMaintenanceScheduleSchema = createInsertSchema(homeMaintenanceSchedules).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  propertyId: z.number().min(1, "Property is required"),
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  estimatedCost: z.string().or(z.number()).optional().nullable().transform(val => val ? String(val) : null),
  lastCompletedDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? val : val.toISOString().split('T')[0];
  }),
  nextDueDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? val : val.toISOString().split('T')[0];
  }),
});

export const insertApplianceSchema = createInsertSchema(appliances).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  propertyId: z.number().min(1, "Property is required"),
  name: z.string().min(1, "Appliance name is required"),
  purchasePrice: z.string().or(z.number()).optional().nullable().transform(val => val ? String(val) : null),
  purchaseDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? val : val.toISOString().split('T')[0];
  }),
  warrantyStartDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? val : val.toISOString().split('T')[0];
  }),
  warrantyEndDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? val : val.toISOString().split('T')[0];
  }),
});

export const insertApplianceServiceHistorySchema = createInsertSchema(applianceServiceHistory).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
}).extend({
  applianceId: z.number().min(1, "Appliance is required"),
  serviceDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
  serviceType: z.string().min(1, "Service type is required"),
});

// Owner-occupied types
export type HomeMaintenanceSchedule = typeof homeMaintenanceSchedules.$inferSelect;
export type InsertHomeMaintenanceSchedule = z.infer<typeof insertHomeMaintenanceScheduleSchema>;
export type Appliance = typeof appliances.$inferSelect;
export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type ApplianceServiceHistory = typeof applianceServiceHistory.$inferSelect;
export type InsertApplianceServiceHistory = z.infer<typeof insertApplianceServiceHistorySchema>;

// Extended types for owner-occupied
export type ApplianceWithDetails = Appliance & {
  property?: Property | null;
  unit?: Unit | null;
  serviceHistory?: ApplianceServiceHistory[];
};

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
  kycCompletedAt: true,
}).extend({
  legalName: z.string().min(2, "Legal name must be at least 2 characters"),
  phone: z.string().min(7, "Phone number is required"),
  dateOfBirth: z.string().optional().nullable(),
  workPermitExpiry: z.string().optional().nullable(),
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

// Compliance document schemas
export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  documentName: z.string().min(1, "Document name is required"),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  reminderDays: z.number().min(1).max(365).default(30),
});

export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;

// Computed compliance status helper
export type ComplianceDocumentWithStatus = ComplianceDocument & {
  computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_APPLICABLE";
  daysUntilExpiry: number | null;
  entityName?: string;
};

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
// INVENTORY INSERT SCHEMAS
// =====================================================

// Inventory category schemas
export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Category name is required"),
});

// Warehouse location schemas
export const insertWarehouseLocationSchema = createInsertSchema(warehouseLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Location name is required"),
});

// Inventory item schemas
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Item name is required"),
  unitCost: z.string().or(z.number()).optional().transform(val => val ? String(val) : "0"),
});

// Inventory movement schemas
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  performedByUserId: true,
  createdAt: true,
}).extend({
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

// =====================================================
// ONBOARDING INSERT SCHEMAS
// =====================================================

// Onboarding process schemas
export const insertOnboardingProcessSchema = createInsertSchema(onboardingProcesses).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  leaseId: z.number().min(1, "Lease is required"),
  tenantId: z.number().min(1, "Tenant is required"),
  propertyId: z.number().min(1, "Property is required"),
  depositAmount: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
});

// Condition checklist item schemas
export const insertConditionChecklistItemSchema = createInsertSchema(conditionChecklistItems).omit({
  id: true,
  inspectedByUserId: true,
  createdAt: true,
}).extend({
  onboardingId: z.number().min(1, "Onboarding process is required"),
  itemName: z.string().min(1, "Item name is required"),
  estimatedRepairCost: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
});

// Handover item schemas
export const insertHandoverItemSchema = createInsertSchema(handoverItems).omit({
  id: true,
  handedOverByUserId: true,
  createdAt: true,
}).extend({
  onboardingId: z.number().min(1, "Onboarding process is required"),
  inventoryItemId: z.number().min(1, "Inventory item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

// =====================================================
// OUTBOARDING INSERT SCHEMAS
// =====================================================

// Outboarding process schemas
export const insertOutboardingProcessSchema = createInsertSchema(outboardingProcesses).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  leaseId: z.number().min(1, "Lease is required"),
  tenantId: z.number().min(1, "Tenant is required"),
  propertyId: z.number().min(1, "Property is required"),
  originalDepositAmount: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
  totalDeductions: z.string().or(z.number()).optional().transform(val => val ? String(val) : "0"),
  refundAmount: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
  plannedMoveOutDate: z.string().or(z.date()).optional().nullable().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

// Exit checklist item schemas
export const insertExitChecklistItemSchema = createInsertSchema(exitChecklistItems).omit({
  id: true,
  inspectedByUserId: true,
  createdAt: true,
}).extend({
  outboardingId: z.number().min(1, "Outboarding process is required"),
  itemName: z.string().min(1, "Item name is required"),
  estimatedRepairCost: z.string().or(z.number()).optional().transform(val => val ? String(val) : undefined),
});

// Deposit deduction schemas
export const insertDepositDeductionSchema = createInsertSchema(depositDeductions).omit({
  id: true,
  createdByUserId: true,
  createdAt: true,
}).extend({
  outboardingId: z.number().min(1, "Outboarding process is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().or(z.number()).transform(val => String(val)),
});

// =====================================================
// EXPENSE INSERT SCHEMAS
// =====================================================

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ledgerEntryId: true,
  createdByUserId: true,
}).extend({
  ownerId: z.number().min(1, "Owner is required"),
  propertyId: z.number().optional().nullable(),
  unitId: z.number().optional().nullable(),
  maintenanceIssueId: z.number().optional().nullable(),
  maintenanceTaskId: z.number().optional().nullable(),
  complianceDocumentId: z.number().optional().nullable(),
  amount: z.string().or(z.number()).transform((val) => String(val)),
  taxAmount: z.string().or(z.number()).optional().transform((val) => val ? String(val) : "0"),
  totalAmount: z.string().or(z.number()).transform((val) => String(val)),
  expenseDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
  paymentDate: z.string().or(z.date()).optional().nullable().transform((val) => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

// =====================================================
// RBAC INSERT SCHEMAS
// =====================================================

// Role schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Role name is required"),
  displayName: z.string().min(2, "Display name is required"),
});

// Permission schemas
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
}).extend({
  key: z.string().min(3, "Permission key is required"),
  displayName: z.string().min(2, "Display name is required"),
  module: z.string().min(2, "Module is required"),
});

// Role-Permission schemas
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

// User role assignment schemas
export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({
  id: true,
  assignedByUserId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().min(1, "User ID is required"),
  roleId: z.number().min(1, "Role ID is required"),
  propertyId: z.number().optional().nullable(), // NULL for global assignment
});

// Admin user creation schema (for super admin creating new users)
export const adminCreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  accountType: z.enum(["INDIVIDUAL", "ORGANIZATION"]).optional().default("INDIVIDUAL"),
  organizationName: z.string().optional(),
  organizationType: z.string().optional(),
  roleAssignments: z.array(z.object({
    roleId: z.number(),
    propertyId: z.number().optional().nullable(),
  })).optional().default([]),
});

export type AdminCreateUser = z.infer<typeof adminCreateUserSchema>;

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
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Inventory types
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;
export type WarehouseLocation = typeof warehouseLocations.$inferSelect;
export type InsertWarehouseLocation = z.infer<typeof insertWarehouseLocationSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

// Onboarding types
export type OnboardingProcess = typeof onboardingProcesses.$inferSelect;
export type InsertOnboardingProcess = z.infer<typeof insertOnboardingProcessSchema>;
export type ConditionChecklistItem = typeof conditionChecklistItems.$inferSelect;
export type InsertConditionChecklistItem = z.infer<typeof insertConditionChecklistItemSchema>;
export type HandoverItem = typeof handoverItems.$inferSelect;
export type InsertHandoverItem = z.infer<typeof insertHandoverItemSchema>;

// Outboarding types
export type OutboardingProcess = typeof outboardingProcesses.$inferSelect;
export type InsertOutboardingProcess = z.infer<typeof insertOutboardingProcessSchema>;
export type ExitChecklistItem = typeof exitChecklistItems.$inferSelect;
export type InsertExitChecklistItem = z.infer<typeof insertExitChecklistItemSchema>;
export type DepositDeduction = typeof depositDeductions.$inferSelect;
export type InsertDepositDeduction = z.infer<typeof insertDepositDeductionSchema>;

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

export type ExpenseWithDetails = Expense & {
  owner: Owner;
  property?: Property | null;
  unit?: Unit | null;
  maintenanceIssue?: MaintenanceIssue | null;
  maintenanceTask?: MaintenanceTask | null;
  complianceDocument?: ComplianceDocument | null;
};

// Inventory extended types
export type InventoryCategoryWithChildren = InventoryCategory & {
  children: InventoryCategory[];
  itemCount?: number;
};

export type InventoryItemWithDetails = InventoryItem & {
  category?: InventoryCategory | null;
  warehouse?: WarehouseLocation | null;
  property?: Property | null;
  unit?: Unit | null;
  tenant?: Tenant | null;
  movements?: InventoryMovement[];
};

export type InventoryMovementWithDetails = InventoryMovement & {
  item: InventoryItem;
  fromWarehouse?: WarehouseLocation | null;
  fromProperty?: Property | null;
  toWarehouse?: WarehouseLocation | null;
  toProperty?: Property | null;
  toUnit?: Unit | null;
  toTenant?: Tenant | null;
  expense?: Expense | null;
  performedBy: User;
};

// Onboarding extended types
export type OnboardingProcessWithDetails = OnboardingProcess & {
  lease: Lease;
  tenant: Tenant;
  property: Property;
  unit?: Unit | null;
  checklistItems: ConditionChecklistItem[];
  handoverItems: (HandoverItem & { inventoryItem: InventoryItem })[];
  createdBy: User;
};

export type TenantWithOnboarding = Tenant & {
  onboardingProcesses: OnboardingProcess[];
  activeOnboarding?: OnboardingProcess | null;
};

export type LedgerEntryWithLines = LedgerEntry & {
  lines: (LedgerLine & { account: ChartOfAccount })[];
};

// =====================================================
// RBAC TYPES
// =====================================================

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;

// Extended RBAC types
export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export type UserWithRoles = {
  id: number;
  name: string;
  email: string;
  phone: string;
  isSuperAdmin: number;
  isActive: number;
  roles: (UserRoleAssignment & { 
    role: Role;
    property?: Property | null;
  })[];
};

export type UserPermissions = {
  global: string[]; // Permission keys for global access
  byProperty: Record<number, string[]>; // Permission keys per property ID
};

// =====================================================
// DASHBOARD WIDGET TYPES
// =====================================================

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type InsertDashboardLayout = {
  name: string;
  scope: "ROLE" | "USER";
  roleId?: number | null;
  userId?: number | null;
  widgets: DashboardWidgetConfig[];
  isDefault?: number;
  createdByUserId?: number | null;
};

// Effective layout returned to client
export type EffectiveDashboardLayout = {
  layoutId: number | null; // null if using defaults
  layoutName: string;
  source: "USER" | "ROLE" | "DEFAULT";
  widgets: DashboardWidgetConfig[];
  availableWidgets: DashboardWidgetDefinition[];
};
