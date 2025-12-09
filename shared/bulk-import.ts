import { z } from "zod";

export const PROPERTY_TYPES = ["APARTMENT", "VILLA", "PLOT", "OFFICE", "SHOP", "HOUSE", "TOWNHOUSE", "WAREHOUSE", "INDUSTRIAL", "MIXED_USE", "LAND"] as const;
export const USAGE_TYPES = ["LONG_TERM_RENTAL", "SHORT_TERM_RENTAL", "OWNER_OCCUPIED"] as const;
export const UNIT_STATUSES = ["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"] as const;
export const TENANT_TYPES = ["INDIVIDUAL", "COMPANY"] as const;
export const LEASE_STATUSES = ["ACTIVE", "EXPIRED", "TERMINATED", "PENDING"] as const;
export const RENT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "BIANNUALLY", "ANNUALLY", "WEEKLY", "DAILY"] as const;

export interface ColumnDefinition {
  header: string;
  field: string;
  required: boolean;
  type: "string" | "number" | "date" | "enum";
  enumValues?: readonly string[];
  description: string;
  example: string;
}

export interface TemplateDefinition {
  entity: string;
  displayName: string;
  description: string;
  columns: ColumnDefinition[];
}

export const propertyTemplate: TemplateDefinition = {
  entity: "properties",
  displayName: "Properties",
  description: "Import property records. Each row represents one property.",
  columns: [
    { header: "Property Name", field: "name", required: true, type: "string", description: "Unique name for the property", example: "Sunset Apartments" },
    { header: "Property Type", field: "propertyType", required: true, type: "enum", enumValues: PROPERTY_TYPES, description: "Type of property", example: "APARTMENT" },
    { header: "Usage Type", field: "usageType", required: false, type: "enum", enumValues: USAGE_TYPES, description: "How property is used", example: "LONG_TERM_RENTAL" },
    { header: "Address Line 1", field: "addressLine1", required: true, type: "string", description: "Street address", example: "123 Main Street" },
    { header: "Address Line 2", field: "addressLine2", required: false, type: "string", description: "Additional address info", example: "Suite 100" },
    { header: "City", field: "city", required: true, type: "string", description: "City name", example: "New York" },
    { header: "State", field: "state", required: true, type: "string", description: "State or province", example: "NY" },
    { header: "Country", field: "country", required: true, type: "string", description: "Country name", example: "USA" },
    { header: "Pincode", field: "pincode", required: true, type: "string", description: "Postal/ZIP code", example: "10001" },
    { header: "Portfolio Tag", field: "portfolioTag", required: false, type: "string", description: "Optional grouping tag", example: "Downtown" },
  ],
};

export const unitTemplate: TemplateDefinition = {
  entity: "units",
  displayName: "Units",
  description: "Import unit records. Requires existing Property ID. Each row represents one unit within a property.",
  columns: [
    { header: "Property ID", field: "propertyId", required: true, type: "number", description: "ID of the parent property (from Properties import)", example: "1" },
    { header: "Unit Name", field: "unitName", required: true, type: "string", description: "Name or number of the unit", example: "Unit 101" },
    { header: "Floor", field: "floor", required: false, type: "string", description: "Floor number or name", example: "1" },
    { header: "Area (sq ft)", field: "areaSqFt", required: false, type: "number", description: "Unit size in square feet", example: "850" },
    { header: "Status", field: "status", required: false, type: "enum", enumValues: UNIT_STATUSES, description: "Current unit status", example: "VACANT" },
  ],
};

export const tenantTemplate: TemplateDefinition = {
  entity: "tenants",
  displayName: "Tenants",
  description: "Import tenant records. Each row represents one tenant (individual or company).",
  columns: [
    { header: "Property ID", field: "propertyId", required: true, type: "number", description: "ID of property tenant is associated with", example: "1" },
    { header: "Legal Name", field: "legalName", required: true, type: "string", description: "Full legal name of tenant", example: "John Smith" },
    { header: "Tenant Type", field: "tenantType", required: false, type: "enum", enumValues: TENANT_TYPES, description: "Individual or company", example: "INDIVIDUAL" },
    { header: "Email", field: "email", required: false, type: "string", description: "Email address", example: "john@example.com" },
    { header: "Phone", field: "phone", required: true, type: "string", description: "Phone number", example: "+1234567890" },
    { header: "Emergency Contact Name", field: "emergencyContactName", required: false, type: "string", description: "Emergency contact name", example: "Jane Smith" },
    { header: "Emergency Contact Phone", field: "emergencyContactPhone", required: false, type: "string", description: "Emergency contact phone", example: "+1234567891" },
  ],
};

export const leaseTemplate: TemplateDefinition = {
  entity: "leases",
  displayName: "Leases",
  description: "Import lease records. Requires existing Property ID, Unit ID, and Tenant ID.",
  columns: [
    { header: "Property ID", field: "propertyId", required: true, type: "number", description: "ID of the property", example: "1" },
    { header: "Unit ID", field: "unitId", required: false, type: "number", description: "ID of the unit (optional)", example: "1" },
    { header: "Tenant ID", field: "tenantId", required: true, type: "number", description: "ID of the tenant", example: "1" },
    { header: "Rent Amount", field: "rentAmount", required: true, type: "number", description: "Monthly rent amount", example: "1500" },
    { header: "Security Deposit", field: "securityDeposit", required: false, type: "number", description: "Security deposit amount", example: "3000" },
    { header: "Start Date", field: "startDate", required: true, type: "date", description: "Lease start date (YYYY-MM-DD)", example: "2024-01-01" },
    { header: "End Date", field: "endDate", required: true, type: "date", description: "Lease end date (YYYY-MM-DD)", example: "2024-12-31" },
    { header: "Rent Frequency", field: "rentFrequency", required: false, type: "enum", enumValues: RENT_FREQUENCIES, description: "How often rent is paid", example: "MONTHLY" },
    { header: "Status", field: "status", required: false, type: "enum", enumValues: LEASE_STATUSES, description: "Lease status", example: "ACTIVE" },
  ],
};

export const allTemplates: TemplateDefinition[] = [
  propertyTemplate,
  unitTemplate,
  tenantTemplate,
  leaseTemplate,
];

export function getTemplateByEntity(entity: string): TemplateDefinition | undefined {
  return allTemplates.find(t => t.entity === entity);
}

export interface ImportRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: string[];
  isValid: boolean;
}

export interface ImportResult {
  entity: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
  createdIds: number[];
}
