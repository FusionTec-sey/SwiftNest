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
