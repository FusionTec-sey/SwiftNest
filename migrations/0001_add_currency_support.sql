CREATE TYPE "public"."amortization_method" AS ENUM('STRAIGHT_LINE', 'REDUCING_BALANCE', 'INTEREST_ONLY');--> statement-breakpoint
CREATE TYPE "public"."applied_to_type" AS ENUM('RENT_INVOICE', 'LOAN', 'UTILITY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."asset_category" AS ENUM('LAND', 'BUILDING', 'FURNITURE_FIXTURES', 'APPLIANCES', 'AC_UNITS', 'VEHICLES', 'EQUIPMENT', 'COMPUTERS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('ACTIVE', 'DISPOSED', 'FULLY_DEPRECIATED');--> statement-breakpoint
CREATE TYPE "public"."coa_account_type" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."compliance_doc_type" AS ENUM('LICENSE', 'PERMIT', 'CERTIFICATE', 'INSURANCE', 'REGISTRATION', 'TAX_DOCUMENT', 'LEGAL_AGREEMENT', 'WARRANTY', 'INSPECTION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."compliance_entity_type" AS ENUM('OWNER', 'PROPERTY');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."currency_code" AS ENUM('USD', 'EUR', 'GBP', 'INR', 'AED', 'SCR', 'CAD', 'AUD', 'SGD', 'CHF', 'JPY', 'CNY', 'ZAR', 'NZD', 'HKD', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'MYR', 'THB', 'IDR', 'PHP', 'MXN', 'BRL', 'RUB', 'KRW', 'TRY', 'PKR');--> statement-breakpoint
CREATE TYPE "public"."depreciation_method" AS ENUM('STRAIGHT_LINE', 'REDUCING_BALANCE', 'UNITS_OF_PRODUCTION');--> statement-breakpoint
CREATE TYPE "public"."depreciation_run_type" AS ENUM('BOOK', 'TAX');--> statement-breakpoint
CREATE TYPE "public"."document_module" AS ENUM('PROPERTY', 'UNIT', 'TENANT', 'OWNER', 'LEASE', 'PAYMENT', 'UTILITY_BILL', 'UTILITY_METER', 'MAINTENANCE_ISSUE', 'MAINTENANCE_TASK', 'LOAN', 'ASSET', 'REPORT');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('INVOICE', 'RECEIPT', 'PAYMENT_PROOF', 'CONTRACT', 'LEASE_AGREEMENT', 'UTILITY_BILL_IMAGE', 'MAINTENANCE_PHOTO', 'ID_DOCUMENT', 'PROPERTY_IMAGE', 'WORK_ORDER', 'QUOTE', 'COMPLETION_CERTIFICATE', 'REPORT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('MAINTENANCE', 'DOCUMENT_FEES', 'INSURANCE', 'UTILITIES', 'PROPERTY_TAX', 'MANAGEMENT_FEES', 'LEGAL_FEES', 'SUPPLIES', 'CAPITAL_IMPROVEMENT', 'TRAVEL', 'MARKETING', 'BANK_CHARGES', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_payment_method" AS ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'MOBILE_PAYMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_payment_status" AS ENUM('UNPAID', 'PAID', 'PARTIALLY_PAID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."layout_scope" AS ENUM('ROLE', 'USER');--> statement-breakpoint
CREATE TYPE "public"."lease_status" AS ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."ledger_module" AS ENUM('RENT', 'UTILITY', 'MAINTENANCE', 'LOAN', 'DEPRECIATION', 'MANUAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."loan_compounding" AS ENUM('SIMPLE', 'COMPOUND_MONTHLY', 'COMPOUND_ANNUALLY');--> statement-breakpoint
CREATE TYPE "public"."meter_assignee_type" AS ENUM('OWNER', 'TENANT');--> statement-breakpoint
CREATE TYPE "public"."occupancy_purpose" AS ENUM('OWNER_OCCUPIED', 'RENTAL', 'INVESTMENT', 'VACANT_LAND');--> statement-breakpoint
CREATE TYPE "public"."owner_team_role" AS ENUM('ADMIN', 'ACCOUNTANT', 'MAINTENANCE_MANAGER', 'MAINTENANCE_STAFF', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."owner_type" AS ENUM('INDIVIDUAL', 'COMPANY');--> statement-breakpoint
CREATE TYPE "public"."ownership_role" AS ENUM('PRIMARY', 'SECONDARY', 'INVESTOR');--> statement-breakpoint
CREATE TYPE "public"."payer_type" AS ENUM('TENANT', 'OWNER');--> statement-breakpoint
CREATE TYPE "public"."payment_frequency" AS ENUM('MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'BANK_TRANSFER', 'CHECK', 'CARD', 'MOBILE_MONEY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."permission_scope" AS ENUM('GLOBAL', 'PROPERTY');--> statement-breakpoint
CREATE TYPE "public"."rent_frequency" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('SUPER_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT', 'MAINTENANCE_SUPERVISOR', 'COMPLIANCE_OFFICER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."tenant_type" AS ENUM('INDIVIDUAL', 'COMPANY');--> statement-breakpoint
CREATE TYPE "public"."tenant_verification_status" AS ENUM('PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."utility_bill_status" AS ENUM('PENDING', 'FORWARDED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."utility_type" AS ENUM('ELECTRICITY', 'WATER', 'GAS', 'INTERNET', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."widget_size" AS ENUM('SMALL', 'MEDIUM', 'LARGE', 'FULL');--> statement-breakpoint
ALTER TYPE "public"."property_type" ADD VALUE 'HOUSE';--> statement-breakpoint
ALTER TYPE "public"."property_type" ADD VALUE 'TOWNHOUSE';--> statement-breakpoint
ALTER TYPE "public"."property_type" ADD VALUE 'WAREHOUSE';--> statement-breakpoint
ALTER TYPE "public"."property_type" ADD VALUE 'INDUSTRIAL';--> statement-breakpoint
ALTER TYPE "public"."property_type" ADD VALUE 'MIXED_USE';--> statement-breakpoint
ALTER TYPE "public"."property_type" ADD VALUE 'LAND';--> statement-breakpoint
CREATE TABLE "assets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL,
	"property_id" integer,
	"asset_category" "asset_category" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"serial_number" text,
	"acquisition_date" timestamp NOT NULL,
	"cost" numeric(14, 2) NOT NULL,
	"salvage_value" numeric(14, 2) DEFAULT '0',
	"useful_life_months" integer NOT NULL,
	"book_method" "depreciation_method" DEFAULT 'STRAIGHT_LINE' NOT NULL,
	"tax_method" "depreciation_method" DEFAULT 'STRAIGHT_LINE' NOT NULL,
	"tax_rate_code" text,
	"business_use_percent" numeric(5, 2) DEFAULT '100',
	"status" "asset_status" DEFAULT 'ACTIVE' NOT NULL,
	"book_accumulated_depreciation" numeric(14, 2) DEFAULT '0',
	"tax_accumulated_depreciation" numeric(14, 2) DEFAULT '0',
	"disposal_date" timestamp,
	"disposal_amount" numeric(14, 2),
	"notes" text,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chart_of_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" "coa_account_type" NOT NULL,
	"parent_code" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"is_system" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chart_of_accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "compliance_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "compliance_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" "compliance_entity_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"document_type" "compliance_doc_type" NOT NULL,
	"document_name" text NOT NULL,
	"document_number" text,
	"issuing_authority" text,
	"issue_date" date,
	"expiry_date" date,
	"reminder_days" integer DEFAULT 30,
	"notes" text,
	"file_document_id" integer,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dashboard_layouts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"scope" "layout_scope" DEFAULT 'ROLE' NOT NULL,
	"role_id" integer,
	"user_id" integer,
	"widgets" jsonb NOT NULL,
	"is_default" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depreciation_rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "depreciation_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"asset_category" "asset_category" NOT NULL,
	"jurisdiction" text DEFAULT 'SC' NOT NULL,
	"law_reference" text,
	"rate_percent_per_year" numeric(6, 2) NOT NULL,
	"method" "depreciation_method" DEFAULT 'STRAIGHT_LINE' NOT NULL,
	"is_first_year_full" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depreciation_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "depreciation_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"asset_id" integer NOT NULL,
	"run_type" "depreciation_run_type" NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"depreciation_amount" numeric(14, 2) NOT NULL,
	"opening_net_book_value" numeric(14, 2) NOT NULL,
	"closing_net_book_value" numeric(14, 2) NOT NULL,
	"ledger_entry_id" integer,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"document_type" "document_type" NOT NULL,
	"module" "document_module" NOT NULL,
	"module_id" integer NOT NULL,
	"property_id" integer,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"share_token" text,
	"share_expires_at" timestamp,
	"uploaded_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exchange_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"base_currency" "currency_code" NOT NULL,
	"quote_currency" "currency_code" NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"effective_date" date NOT NULL,
	"source" text DEFAULT 'MANUAL',
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL,
	"property_id" integer,
	"unit_id" integer,
	"maintenance_issue_id" integer,
	"maintenance_task_id" integer,
	"compliance_document_id" integer,
	"category" "expense_category" NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0',
	"total_amount" numeric(14, 2) NOT NULL,
	"currency_code" "currency_code" DEFAULT 'USD',
	"exchange_rate" numeric(18, 8) DEFAULT '1',
	"total_amount_base" numeric(14, 2),
	"expense_date" timestamp NOT NULL,
	"vendor_name" text,
	"vendor_tax_id" text,
	"vendor_contact" text,
	"invoice_number" text,
	"payment_status" "expense_payment_status" DEFAULT 'UNPAID' NOT NULL,
	"payment_method" "expense_payment_method",
	"payment_date" timestamp,
	"payment_reference" text,
	"attachments" text[] DEFAULT '{}',
	"notes" text,
	"approval_status" "expense_approval_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by_user_id" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"ledger_entry_id" integer,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "leases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"unit_id" integer,
	"tenant_id" integer NOT NULL,
	"status" "lease_status" DEFAULT 'DRAFT' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"rent_amount" numeric(12, 2) NOT NULL,
	"rent_frequency" "rent_frequency" DEFAULT 'MONTHLY' NOT NULL,
	"deposit_amount" numeric(12, 2) DEFAULT '0',
	"escalation_percent" numeric(5, 2),
	"escalation_frequency_months" integer,
	"payment_due_day" integer DEFAULT 1,
	"late_fee_percent" numeric(5, 2),
	"late_fee_grace_days" integer DEFAULT 5,
	"terms" text,
	"documents" text[] DEFAULT '{}',
	"next_invoice_date" timestamp,
	"last_invoice_generated_at" timestamp,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ledger_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entry_number" text NOT NULL,
	"entry_date" timestamp NOT NULL,
	"property_id" integer,
	"owner_id" integer,
	"module" "ledger_module" NOT NULL,
	"reference_id" integer,
	"memo" text,
	"is_reversed" integer DEFAULT 0 NOT NULL,
	"reversed_by_entry_id" integer,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_lines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ledger_lines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" numeric(14, 2) DEFAULT '0',
	"credit" numeric(14, 2) DEFAULT '0',
	"currency_code" "currency_code" DEFAULT 'USD',
	"exchange_rate" numeric(18, 8) DEFAULT '1',
	"debit_base" numeric(14, 2) DEFAULT '0',
	"credit_base" numeric(14, 2) DEFAULT '0',
	"related_type" text,
	"related_id" integer,
	"memo" text
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "loan_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"loan_id" integer NOT NULL,
	"schedule_id" integer,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"principal_component" numeric(14, 2) NOT NULL,
	"interest_component" numeric(14, 2) NOT NULL,
	"bank_account_id" integer,
	"ledger_entry_id" integer,
	"reference" text,
	"notes" text,
	"recorded_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_schedule" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "loan_schedule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"loan_id" integer NOT NULL,
	"period_number" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"opening_balance" numeric(14, 2) NOT NULL,
	"principal_due" numeric(14, 2) NOT NULL,
	"interest_due" numeric(14, 2) NOT NULL,
	"total_due" numeric(14, 2) NOT NULL,
	"closing_balance" numeric(14, 2) NOT NULL,
	"is_paid" integer DEFAULT 0 NOT NULL,
	"paid_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "loans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL,
	"property_id" integer,
	"lender_name" text NOT NULL,
	"loan_reference" text,
	"currency" text DEFAULT 'SCR' NOT NULL,
	"principal" numeric(14, 2) NOT NULL,
	"interest_rate" numeric(6, 4) NOT NULL,
	"compounding" "loan_compounding" DEFAULT 'SIMPLE' NOT NULL,
	"term_months" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"payment_frequency" "payment_frequency" DEFAULT 'MONTHLY' NOT NULL,
	"amortization_method" "amortization_method" DEFAULT 'REDUCING_BALANCE' NOT NULL,
	"outstanding_balance" numeric(14, 2),
	"total_interest_paid" numeric(14, 2) DEFAULT '0',
	"total_principal_paid" numeric(14, 2) DEFAULT '0',
	"is_active" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_assignment_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meter_assignment_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meter_id" integer NOT NULL,
	"previous_assignee_type" "meter_assignee_type",
	"previous_owner_id" integer,
	"previous_tenant_id" integer,
	"new_assignee_type" "meter_assignee_type" NOT NULL,
	"new_owner_id" integer,
	"new_tenant_id" integer,
	"lease_id" integer,
	"transfer_date" timestamp DEFAULT now() NOT NULL,
	"final_meter_reading" numeric(12, 2),
	"outstanding_bills_settled" integer DEFAULT 0 NOT NULL,
	"settlement_amount" numeric(12, 2),
	"transfer_reason" text,
	"notes" text,
	"recorded_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meter_readings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meter_readings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meter_id" integer NOT NULL,
	"reading_date" timestamp NOT NULL,
	"previous_reading" numeric(12, 2),
	"current_reading" numeric(12, 2) NOT NULL,
	"consumption" numeric(12, 2),
	"billing_period_start" timestamp,
	"billing_period_end" timestamp,
	"bill_amount" numeric(12, 2),
	"rebillable_amount" numeric(12, 2),
	"tenant_id" integer,
	"is_rebilled" integer DEFAULT 0,
	"ledger_entry_id" integer,
	"notes" text,
	"recorded_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_invitations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "owner_invitations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" "owner_team_role" NOT NULL,
	"invite_token" text NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"accepted_by_user_id" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "owner_invitations_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "owner_team_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "owner_team_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "owner_team_role" NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"added_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "owners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"owner_type" "owner_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"legal_name" text NOT NULL,
	"trading_name" text,
	"registration_number" text,
	"tax_id" text,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"is_resident" integer DEFAULT 1,
	"notes" text,
	"is_default" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"payer_type" "payer_type" NOT NULL,
	"payer_id" integer NOT NULL,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency_code" "currency_code" DEFAULT 'USD',
	"exchange_rate" numeric(18, 8) DEFAULT '1',
	"amount_base" numeric(12, 2),
	"payment_method" "payment_method" DEFAULT 'BANK_TRANSFER' NOT NULL,
	"reference" text,
	"applied_to_type" "applied_to_type" NOT NULL,
	"applied_to_id" integer NOT NULL,
	"bank_account_id" integer,
	"ledger_entry_id" integer,
	"proof_document_id" integer,
	"receipt_document_id" integer,
	"notes" text,
	"recorded_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"module" text NOT NULL,
	"scope" "permission_scope" DEFAULT 'PROPERTY' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "property_owners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "property_owners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"ownership_percent" numeric(5, 2) DEFAULT '100' NOT NULL,
	"ownership_role" "ownership_role" DEFAULT 'PRIMARY' NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rent_invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rent_invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lease_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"rent_amount" numeric(12, 2) NOT NULL,
	"utility_charges" numeric(12, 2) DEFAULT '0',
	"maintenance_charges" numeric(12, 2) DEFAULT '0',
	"late_fees" numeric(12, 2) DEFAULT '0',
	"other_charges" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"currency_code" "currency_code" DEFAULT 'USD',
	"exchange_rate" numeric(18, 8) DEFAULT '1',
	"total_amount_base" numeric(12, 2),
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"due_date" timestamp NOT NULL,
	"issued_at" timestamp,
	"paid_at" timestamp,
	"ledger_entry_id" integer,
	"invoice_document_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_system" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tenants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_type" "tenant_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"legal_name" text NOT NULL,
	"registration_number" text,
	"id_number" text,
	"email" text,
	"phone" text NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"country" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"passport_number" text,
	"nationality" text,
	"date_of_birth" timestamp,
	"work_permit_number" text,
	"work_permit_expiry" timestamp,
	"verification_status" "tenant_verification_status" DEFAULT 'PENDING' NOT NULL,
	"kyc_notes" text,
	"kyc_completed_at" timestamp,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_role_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"property_id" integer,
	"assigned_by_user_id" integer NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_bills" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "utility_bills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"unit_id" integer,
	"meter_id" integer,
	"tenant_id" integer,
	"utility_type" "utility_type" NOT NULL,
	"provider" text DEFAULT 'PUC' NOT NULL,
	"bill_reference" text,
	"account_number" text,
	"bill_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"billing_period_start" timestamp,
	"billing_period_end" timestamp,
	"previous_reading" numeric(12, 2),
	"current_reading" numeric(12, 2),
	"consumption" numeric(12, 2),
	"previous_balance" numeric(12, 2) DEFAULT '0',
	"current_charges" numeric(12, 2) NOT NULL,
	"taxes" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"status" "utility_bill_status" DEFAULT 'PENDING' NOT NULL,
	"bill_image_path" text,
	"forwarded_to_tenant_at" timestamp,
	"paid_at" timestamp,
	"payment_reference" text,
	"notes" text,
	"recorded_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_meters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "utility_meters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"unit_id" integer,
	"utility_type" "utility_type" NOT NULL,
	"meter_number" text NOT NULL,
	"provider" text,
	"rate_per_unit" numeric(10, 4),
	"fixed_charge" numeric(10, 2) DEFAULT '0',
	"assigned_to_type" "meter_assignee_type" DEFAULT 'OWNER' NOT NULL,
	"assigned_to_owner_id" integer,
	"assigned_to_tenant_id" integer,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "occupancy_purpose" "occupancy_purpose" DEFAULT 'RENTAL';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "currency_code" "currency_code" DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "portfolio_tag" text;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "co_ownership_notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_super_admin" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_file_document_id_documents_id_fk" FOREIGN KEY ("file_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_maintenance_issue_id_maintenance_issues_id_fk" FOREIGN KEY ("maintenance_issue_id") REFERENCES "public"."maintenance_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_maintenance_task_id_maintenance_tasks_id_fk" FOREIGN KEY ("maintenance_task_id") REFERENCES "public"."maintenance_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_compliance_document_id_compliance_documents_id_fk" FOREIGN KEY ("compliance_document_id") REFERENCES "public"."compliance_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_entry_id_ledger_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_schedule_id_loan_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."loan_schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedule" ADD CONSTRAINT "loan_schedule_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_meter_id_utility_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."utility_meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_previous_owner_id_owners_id_fk" FOREIGN KEY ("previous_owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_previous_tenant_id_tenants_id_fk" FOREIGN KEY ("previous_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_new_owner_id_owners_id_fk" FOREIGN KEY ("new_owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_new_tenant_id_tenants_id_fk" FOREIGN KEY ("new_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_assignment_history" ADD CONSTRAINT "meter_assignment_history_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meter_id_utility_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."utility_meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_invitations" ADD CONSTRAINT "owner_invitations_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_invitations" ADD CONSTRAINT "owner_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_invitations" ADD CONSTRAINT "owner_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_team_members" ADD CONSTRAINT "owner_team_members_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_team_members" ADD CONSTRAINT "owner_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_team_members" ADD CONSTRAINT "owner_team_members_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_meter_id_utility_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."utility_meters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_meters" ADD CONSTRAINT "utility_meters_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_meters" ADD CONSTRAINT "utility_meters_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_meters" ADD CONSTRAINT "utility_meters_assigned_to_owner_id_owners_id_fk" FOREIGN KEY ("assigned_to_owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_meters" ADD CONSTRAINT "utility_meters_assigned_to_tenant_id_tenants_id_fk" FOREIGN KEY ("assigned_to_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_owner_idx" ON "assets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "assets_property_idx" ON "assets" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("asset_category");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coa_code_idx" ON "chart_of_accounts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coa_type_idx" ON "chart_of_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "compliance_docs_entity_idx" ON "compliance_documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "compliance_docs_expiry_idx" ON "compliance_documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "compliance_docs_type_idx" ON "compliance_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_role_idx" ON "dashboard_layouts" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_user_idx" ON "dashboard_layouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "depreciation_rules_category_idx" ON "depreciation_rules" USING btree ("asset_category");--> statement-breakpoint
CREATE INDEX "depreciation_rules_jurisdiction_idx" ON "depreciation_rules" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "depreciation_runs_asset_idx" ON "depreciation_runs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "depreciation_runs_period_idx" ON "depreciation_runs" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "documents_module_idx" ON "documents" USING btree ("module","module_id");--> statement-breakpoint
CREATE INDEX "documents_property_idx" ON "documents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "documents_type_idx" ON "documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "exchange_rates_base_quote_idx" ON "exchange_rates" USING btree ("base_currency","quote_currency");--> statement-breakpoint
CREATE INDEX "exchange_rates_effective_date_idx" ON "exchange_rates" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "expenses_owner_idx" ON "expenses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "expenses_property_idx" ON "expenses" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "expenses_approval_idx" ON "expenses" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "expenses_maintenance_issue_idx" ON "expenses" USING btree ("maintenance_issue_id");--> statement-breakpoint
CREATE INDEX "expenses_maintenance_task_idx" ON "expenses" USING btree ("maintenance_task_id");--> statement-breakpoint
CREATE INDEX "expenses_compliance_idx" ON "expenses" USING btree ("compliance_document_id");--> statement-breakpoint
CREATE INDEX "leases_property_idx" ON "leases" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "leases_tenant_idx" ON "leases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "leases_status_idx" ON "leases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ledger_entries_date_idx" ON "ledger_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "ledger_entries_property_idx" ON "ledger_entries" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_owner_idx" ON "ledger_entries" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_module_idx" ON "ledger_entries" USING btree ("module");--> statement-breakpoint
CREATE INDEX "ledger_lines_entry_idx" ON "ledger_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "ledger_lines_account_idx" ON "ledger_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "loan_payments_loan_idx" ON "loan_payments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loan_payments_schedule_idx" ON "loan_payments" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "loan_payments_date_idx" ON "loan_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "loan_schedule_loan_idx" ON "loan_schedule" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loan_schedule_due_idx" ON "loan_schedule" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "loans_owner_idx" ON "loans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "loans_property_idx" ON "loans" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "meter_assignment_history_meter_idx" ON "meter_assignment_history" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "meter_assignment_history_date_idx" ON "meter_assignment_history" USING btree ("transfer_date");--> statement-breakpoint
CREATE INDEX "meter_readings_meter_idx" ON "meter_readings" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "meter_readings_date_idx" ON "meter_readings" USING btree ("reading_date");--> statement-breakpoint
CREATE INDEX "owner_invitations_owner_idx" ON "owner_invitations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "owner_invitations_email_idx" ON "owner_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "owner_invitations_token_idx" ON "owner_invitations" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "owner_team_owner_idx" ON "owner_team_members" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "owner_team_user_idx" ON "owner_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "owners_user_idx" ON "owners" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "owners_type_idx" ON "owners" USING btree ("owner_type");--> statement-breakpoint
CREATE INDEX "payments_payer_idx" ON "payments" USING btree ("payer_type","payer_id");--> statement-breakpoint
CREATE INDEX "payments_applied_idx" ON "payments" USING btree ("applied_to_type","applied_to_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "permissions_key_idx" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "permissions_module_idx" ON "permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "property_owners_property_idx" ON "property_owners" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_owners_owner_idx" ON "property_owners" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "rent_invoices_lease_idx" ON "rent_invoices" USING btree ("lease_id");--> statement-breakpoint
CREATE INDEX "rent_invoices_status_idx" ON "rent_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rent_invoices_due_date_idx" ON "rent_invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tenants_created_by_idx" ON "tenants" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "tenants_email_idx" ON "tenants" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tenants_verification_idx" ON "tenants" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "user_role_user_idx" ON "user_role_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_role_idx" ON "user_role_assignments" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "user_role_property_idx" ON "user_role_assignments" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "utility_bills_property_idx" ON "utility_bills" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "utility_bills_unit_idx" ON "utility_bills" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "utility_bills_tenant_idx" ON "utility_bills" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "utility_bills_status_idx" ON "utility_bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX "utility_bills_due_date_idx" ON "utility_bills" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "utility_meters_property_idx" ON "utility_meters" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "utility_meters_unit_idx" ON "utility_meters" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "utility_meters_type_idx" ON "utility_meters" USING btree ("utility_type");--> statement-breakpoint
CREATE INDEX "utility_meters_owner_idx" ON "utility_meters" USING btree ("assigned_to_owner_id");--> statement-breakpoint
CREATE INDEX "utility_meters_tenant_idx" ON "utility_meters" USING btree ("assigned_to_tenant_id");--> statement-breakpoint
CREATE INDEX "properties_portfolio_idx" ON "properties" USING btree ("portfolio_tag");