CREATE TYPE "public"."inventory_item_status" AS ENUM('AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."inventory_item_type" AS ENUM('KEY', 'REMOTE', 'ACCESS_CARD', 'APPLIANCE', 'FURNITURE', 'FIXTURE', 'TOOL', 'CONSUMABLE', 'ELECTRONIC', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('RECEIVED', 'ISSUED', 'RETURNED', 'TRANSFERRED', 'DAMAGED', 'LOST', 'ADJUSTED');--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"parent_id" integer,
	"name" text NOT NULL,
	"description" text,
	"item_type" "inventory_item_type",
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer,
	"item_type" "inventory_item_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"serial_number" text,
	"unit_cost" numeric(14, 2) DEFAULT '0',
	"reorder_level" integer DEFAULT 0,
	"status" "inventory_item_status" DEFAULT 'AVAILABLE' NOT NULL,
	"warehouse_id" integer,
	"property_id" integer,
	"unit_id" integer,
	"tenant_id" integer,
	"assigned_at" timestamp,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer NOT NULL,
	"movement_type" "inventory_movement_type" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"from_warehouse_id" integer,
	"from_property_id" integer,
	"to_warehouse_id" integer,
	"to_property_id" integer,
	"to_unit_id" integer,
	"to_tenant_id" integer,
	"condition_before" text,
	"condition_after" text,
	"damage_notes" text,
	"expense_id" integer,
	"notes" text,
	"performed_by_user_id" integer NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "warehouse_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"address" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_parent_id_inventory_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."inventory_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_id_warehouse_locations_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_from_warehouse_id_warehouse_locations_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_from_property_id_properties_id_fk" FOREIGN KEY ("from_property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_warehouse_id_warehouse_locations_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_property_id_properties_id_fk" FOREIGN KEY ("to_property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_unit_id_units_id_fk" FOREIGN KEY ("to_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_tenant_id_tenants_id_fk" FOREIGN KEY ("to_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_categories_parent_idx" ON "inventory_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "inventory_items_category_idx" ON "inventory_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "inventory_items_type_idx" ON "inventory_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "inventory_items_status_idx" ON "inventory_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_items_warehouse_idx" ON "inventory_items" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "inventory_items_property_idx" ON "inventory_items" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "inventory_items_tenant_idx" ON "inventory_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_item_idx" ON "inventory_movements" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "inventory_movements_date_idx" ON "inventory_movements" USING btree ("performed_at");