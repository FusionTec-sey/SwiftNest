-- Add new maintenance enums (skip existing ones)
DO $$ BEGIN
    CREATE TYPE "public"."issue_category" AS ENUM('ELECTRICAL', 'PLUMBING', 'HVAC', 'STRUCTURAL', 'CLEANING', 'PEST_CONTROL', 'APPLIANCE', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."issue_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."issue_status" AS ENUM('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."team_role" AS ENUM('SUPERVISOR', 'TECHNICIAN', 'CLEANER', 'INSPECTOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."skill_type" AS ENUM('HVAC', 'PLUMBING', 'ELECTRICAL', 'CLEANING', 'CARPENTRY', 'PAINTING', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."schedule_cadence" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create maintenance team members table
CREATE TABLE IF NOT EXISTS "maintenance_team_members" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "property_id" integer REFERENCES "properties"("id") ON DELETE CASCADE,
    "role" "team_role" DEFAULT 'TECHNICIAN' NOT NULL,
    "is_active" integer DEFAULT 1 NOT NULL,
    "max_concurrent_jobs" integer DEFAULT 5,
    "hourly_rate" numeric(10, 2),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "team_user_idx" ON "maintenance_team_members" ("user_id");
CREATE INDEX IF NOT EXISTS "team_property_idx" ON "maintenance_team_members" ("property_id");

-- Create member skills table
CREATE TABLE IF NOT EXISTS "maintenance_member_skills" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "member_id" integer NOT NULL REFERENCES "maintenance_team_members"("id") ON DELETE CASCADE,
    "skill" "skill_type" NOT NULL
);
CREATE INDEX IF NOT EXISTS "skills_member_idx" ON "maintenance_member_skills" ("member_id");

-- Create materials table
CREATE TABLE IF NOT EXISTS "maintenance_materials" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "property_id" integer REFERENCES "properties"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "sku" text,
    "unit" text DEFAULT 'pcs',
    "quantity_on_hand" numeric(10, 2) DEFAULT '0',
    "reorder_threshold" numeric(10, 2) DEFAULT '5',
    "cost_per_unit" numeric(10, 2) DEFAULT '0',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "materials_property_idx" ON "maintenance_materials" ("property_id");

-- Create issues table
CREATE TABLE IF NOT EXISTS "maintenance_issues" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "property_id" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
    "unit_id" integer REFERENCES "units"("id") ON DELETE SET NULL,
    "node_id" integer REFERENCES "property_nodes"("id") ON DELETE SET NULL,
    "reported_by_user_id" integer NOT NULL REFERENCES "users"("id"),
    "assigned_to_member_id" integer REFERENCES "maintenance_team_members"("id") ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS "issues_property_idx" ON "maintenance_issues" ("property_id");
CREATE INDEX IF NOT EXISTS "issues_status_idx" ON "maintenance_issues" ("status");
CREATE INDEX IF NOT EXISTS "issues_assigned_idx" ON "maintenance_issues" ("assigned_to_member_id");

-- Create tasks table
CREATE TABLE IF NOT EXISTS "maintenance_tasks" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "property_id" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
    "issue_id" integer REFERENCES "maintenance_issues"("id") ON DELETE SET NULL,
    "schedule_id" integer,
    "unit_id" integer REFERENCES "units"("id") ON DELETE SET NULL,
    "node_id" integer REFERENCES "property_nodes"("id") ON DELETE SET NULL,
    "title" text NOT NULL,
    "description" text,
    "category" "issue_category" NOT NULL,
    "status" "task_status" DEFAULT 'TODO' NOT NULL,
    "priority" "task_priority" DEFAULT 'MEDIUM' NOT NULL,
    "assigned_to_member_id" integer REFERENCES "maintenance_team_members"("id") ON DELETE SET NULL,
    "requested_by_user_id" integer NOT NULL REFERENCES "users"("id"),
    "approval_required" integer DEFAULT 0,
    "approved_by_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "approved_at" timestamp,
    "due_at" timestamp,
    "started_at" timestamp,
    "completed_at" timestamp,
    "labor_hours" numeric(6, 2) DEFAULT '0',
    "total_cost" numeric(10, 2) DEFAULT '0',
    "checklist" jsonb DEFAULT '[]',
    "attachments" text[] DEFAULT '{}',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "tasks_property_idx" ON "maintenance_tasks" ("property_id");
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "maintenance_tasks" ("status");
CREATE INDEX IF NOT EXISTS "tasks_assigned_idx" ON "maintenance_tasks" ("assigned_to_member_id");
CREATE INDEX IF NOT EXISTS "tasks_issue_idx" ON "maintenance_tasks" ("issue_id");

-- Create task activity table
CREATE TABLE IF NOT EXISTS "maintenance_task_activity" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "task_id" integer NOT NULL REFERENCES "maintenance_tasks"("id") ON DELETE CASCADE,
    "created_by_user_id" integer NOT NULL REFERENCES "users"("id"),
    "activity_type" text NOT NULL,
    "payload" jsonb DEFAULT '{}',
    "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "activity_task_idx" ON "maintenance_task_activity" ("task_id");

-- Create task materials table
CREATE TABLE IF NOT EXISTS "maintenance_task_materials" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "task_id" integer NOT NULL REFERENCES "maintenance_tasks"("id") ON DELETE CASCADE,
    "material_id" integer NOT NULL REFERENCES "maintenance_materials"("id") ON DELETE CASCADE,
    "quantity_used" numeric(10, 2) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "task_materials_task_idx" ON "maintenance_task_materials" ("task_id");
CREATE INDEX IF NOT EXISTS "task_materials_material_idx" ON "maintenance_task_materials" ("material_id");

-- Create schedules table
CREATE TABLE IF NOT EXISTS "maintenance_schedules" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "property_id" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
    "unit_id" integer REFERENCES "units"("id") ON DELETE SET NULL,
    "node_id" integer REFERENCES "property_nodes"("id") ON DELETE SET NULL,
    "title" text NOT NULL,
    "description" text,
    "category" "issue_category" NOT NULL,
    "priority" "task_priority" DEFAULT 'MEDIUM' NOT NULL,
    "cadence" "schedule_cadence" NOT NULL,
    "default_assigned_member_id" integer REFERENCES "maintenance_team_members"("id") ON DELETE SET NULL,
    "template_checklist" jsonb DEFAULT '[]',
    "is_active" integer DEFAULT 1 NOT NULL,
    "last_run_at" timestamp,
    "next_run_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "schedules_property_idx" ON "maintenance_schedules" ("property_id");
CREATE INDEX IF NOT EXISTS "schedules_next_run_idx" ON "maintenance_schedules" ("next_run_at");
