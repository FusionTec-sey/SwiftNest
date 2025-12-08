CREATE TYPE "public"."account_type" AS ENUM('INDIVIDUAL', 'ORGANIZATION');--> statement-breakpoint
CREATE TYPE "public"."collaborator_role" AS ENUM('VIEWER', 'EDITOR');--> statement-breakpoint
CREATE TYPE "public"."issue_category" AS ENUM('ELECTRICAL', 'PLUMBING', 'HVAC', 'STRUCTURAL', 'CLEANING', 'PEST_CONTROL', 'APPLIANCE', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('BUILDING', 'FLOOR', 'FLAT', 'VILLA', 'ROOM', 'BED', 'SECTION', 'PLOT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('APARTMENT', 'VILLA', 'PLOT', 'OFFICE', 'SHOP');--> statement-breakpoint
CREATE TYPE "public"."schedule_cadence" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."skill_type" AS ENUM('HVAC', 'PLUMBING', 'ELECTRICAL', 'CLEANING', 'CARPENTRY', 'PAINTING', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('SUPERVISOR', 'TECHNICIAN', 'CLEANER', 'INSPECTOR');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('VACANT', 'OCCUPIED');--> statement-breakpoint
CREATE TABLE "maintenance_issues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_issues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"unit_id" integer,
	"node_id" integer,
	"reported_by_user_id" integer NOT NULL,
	"assigned_to_member_id" integer,
	"category" "issue_category" NOT NULL,
	"severity" "issue_severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "issue_status" DEFAULT 'OPEN' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"resolution_notes" text,
	"attachments" text[] DEFAULT '{}',
	"due_at" timestamp,
	"closed_at" timestamp,
	"cost_labor" numeric(10, 2) DEFAULT '0',
	"cost_materials" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_materials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_materials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer,
	"name" text NOT NULL,
	"sku" text,
	"unit" text DEFAULT 'pcs',
	"quantity_on_hand" numeric(10, 2) DEFAULT '0',
	"reorder_threshold" numeric(10, 2) DEFAULT '5',
	"cost_per_unit" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_member_skills" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_member_skills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"member_id" integer NOT NULL,
	"skill" "skill_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_schedules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"unit_id" integer,
	"node_id" integer,
	"title" text NOT NULL,
	"description" text,
	"category" "issue_category" NOT NULL,
	"priority" "task_priority" DEFAULT 'MEDIUM' NOT NULL,
	"cadence" "schedule_cadence" NOT NULL,
	"default_assigned_member_id" integer,
	"template_checklist" jsonb DEFAULT '[]'::jsonb,
	"is_active" integer DEFAULT 1 NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_task_activity" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_task_activity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"task_id" integer NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_task_materials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_task_materials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"task_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"quantity_used" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"issue_id" integer,
	"schedule_id" integer,
	"unit_id" integer,
	"node_id" integer,
	"title" text NOT NULL,
	"description" text,
	"category" "issue_category" NOT NULL,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"priority" "task_priority" DEFAULT 'MEDIUM' NOT NULL,
	"assigned_to_member_id" integer,
	"requested_by_user_id" integer NOT NULL,
	"approval_required" integer DEFAULT 0,
	"approved_by_user_id" integer,
	"approved_at" timestamp,
	"due_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"labor_hours" numeric(6, 2) DEFAULT '0',
	"total_cost" numeric(10, 2) DEFAULT '0',
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"attachments" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_team_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_team_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"property_id" integer,
	"role" "team_role" DEFAULT 'TECHNICIAN' NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"max_concurrent_jobs" integer DEFAULT 5,
	"hourly_rate" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "properties_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_user_id" integer NOT NULL,
	"owner_org_name" text,
	"name" text NOT NULL,
	"property_type" "property_type" NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text NOT NULL,
	"pincode" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"images" text[] DEFAULT '{}',
	"is_deleted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_collaborators" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "property_collaborators_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "collaborator_role" DEFAULT 'VIEWER' NOT NULL,
	"invited_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_nodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "property_nodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"parent_id" integer,
	"label" text NOT NULL,
	"node_type" "node_type" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"unit_name" text NOT NULL,
	"floor" text,
	"area_sq_ft" numeric(10, 2),
	"status" "unit_status" DEFAULT 'VACANT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password" text NOT NULL,
	"account_type" "account_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"organization_name" text,
	"organization_type" text,
	"gst_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_node_id_property_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."property_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_assigned_to_member_id_maintenance_team_members_id_fk" FOREIGN KEY ("assigned_to_member_id") REFERENCES "public"."maintenance_team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_materials" ADD CONSTRAINT "maintenance_materials_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_member_skills" ADD CONSTRAINT "maintenance_member_skills_member_id_maintenance_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."maintenance_team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_node_id_property_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."property_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_default_assigned_member_id_maintenance_team_members_id_fk" FOREIGN KEY ("default_assigned_member_id") REFERENCES "public"."maintenance_team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task_activity" ADD CONSTRAINT "maintenance_task_activity_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task_activity" ADD CONSTRAINT "maintenance_task_activity_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task_materials" ADD CONSTRAINT "maintenance_task_materials_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task_materials" ADD CONSTRAINT "maintenance_task_materials_material_id_maintenance_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."maintenance_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_issue_id_maintenance_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."maintenance_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_node_id_property_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."property_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_assigned_to_member_id_maintenance_team_members_id_fk" FOREIGN KEY ("assigned_to_member_id") REFERENCES "public"."maintenance_team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_team_members" ADD CONSTRAINT "maintenance_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_team_members" ADD CONSTRAINT "maintenance_team_members_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_collaborators" ADD CONSTRAINT "property_collaborators_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_collaborators" ADD CONSTRAINT "property_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_collaborators" ADD CONSTRAINT "property_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_nodes" ADD CONSTRAINT "property_nodes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_property_idx" ON "maintenance_issues" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "maintenance_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issues_assigned_idx" ON "maintenance_issues" USING btree ("assigned_to_member_id");--> statement-breakpoint
CREATE INDEX "materials_property_idx" ON "maintenance_materials" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "skills_member_idx" ON "maintenance_member_skills" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "schedules_property_idx" ON "maintenance_schedules" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "schedules_next_run_idx" ON "maintenance_schedules" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "activity_task_idx" ON "maintenance_task_activity" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_materials_task_idx" ON "maintenance_task_materials" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_materials_material_idx" ON "maintenance_task_materials" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "tasks_property_idx" ON "maintenance_tasks" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "maintenance_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_assigned_idx" ON "maintenance_tasks" USING btree ("assigned_to_member_id");--> statement-breakpoint
CREATE INDEX "tasks_issue_idx" ON "maintenance_tasks" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "team_user_idx" ON "maintenance_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_property_idx" ON "maintenance_team_members" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "properties_owner_idx" ON "properties" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree ("city");--> statement-breakpoint
CREATE INDEX "collaborators_property_idx" ON "property_collaborators" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "collaborators_user_idx" ON "property_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "nodes_property_idx" ON "property_nodes" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "nodes_parent_idx" ON "property_nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "units_property_idx" ON "units" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");