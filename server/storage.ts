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
  owners,
  propertyOwners,
  ownerTeamMembers,
  ownerInvitations,
  tenants,
  leases,
  rentInvoices,
  payments,
  chartOfAccounts,
  ledgerEntries,
  ledgerLines,
  utilityMeters,
  meterReadings,
  meterAssignmentHistory,
  utilityBills,
  loans,
  loanSchedule,
  loanPayments,
  assets,
  depreciationRules,
  depreciationRuns,
  documents,
  complianceDocuments,
  roles,
  permissions,
  rolePermissions,
  userRoleAssignments,
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
  type TaskWithDetails,
  type Owner,
  type InsertOwner,
  type PropertyOwner,
  type InsertPropertyOwner,
  type OwnerTeamMember,
  type InsertOwnerTeamMember,
  type OwnerInvitation,
  type InsertOwnerInvitation,
  type Tenant,
  type InsertTenant,
  type Lease,
  type InsertLease,
  type LeaseWithDetails,
  type RentInvoice,
  type InsertRentInvoice,
  type Payment,
  type InsertPayment,
  type ChartOfAccount,
  type InsertChartOfAccount,
  type LedgerEntry,
  type InsertLedgerEntry,
  type LedgerLine,
  type InsertLedgerLine,
  type LedgerEntryWithLines,
  type UtilityMeter,
  type InsertUtilityMeter,
  type MeterReading,
  type InsertMeterReading,
  type MeterAssignmentHistory,
  type InsertMeterAssignmentHistory,
  type UtilityBill,
  type InsertUtilityBill,
  type Loan,
  type InsertLoan,
  type LoanScheduleEntry,
  type LoanPayment,
  type InsertLoanPayment,
  type LoanWithSchedule,
  type Asset,
  type InsertAsset,
  type AssetWithDepreciation,
  type DepreciationRule,
  type InsertDepreciationRule,
  type DepreciationRun,
  type OwnerWithProperties,
  type Document,
  type InsertDocument,
  type ComplianceDocument,
  type InsertComplianceDocument,
  type ComplianceDocumentWithStatus,
  type Role,
  type InsertRole,
  type Permission,
  type UserRoleAssignment,
  type InsertUserRoleAssignment,
  type UserWithRoles,
  type RoleWithPermissions,
  expenses,
  type Expense,
  type InsertExpense,
  type ExpenseWithDetails,
  dashboardLayouts,
  type DashboardLayout,
  type InsertDashboardLayout,
  type DashboardWidgetConfig,
  exchangeRates,
  type ExchangeRate,
  type InsertExchangeRate,
  inventoryCategories,
  warehouseLocations,
  inventoryItems,
  inventoryMovements,
  type InventoryCategory,
  type InsertInventoryCategory,
  type WarehouseLocation,
  type InsertWarehouseLocation,
  type InventoryItem,
  type InsertInventoryItem,
  type InventoryMovement,
  type InsertInventoryMovement,
  type InventoryCategoryWithChildren,
  type InventoryItemWithDetails,
  type InventoryMovementWithDetails,
  onboardingProcesses,
  conditionChecklistItems,
  handoverItems,
  type OnboardingProcess,
  type InsertOnboardingProcess,
  type ConditionChecklistItem,
  type InsertConditionChecklistItem,
  type HandoverItem,
  type InsertHandoverItem,
  type OnboardingProcessWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, isNull, gte, lte, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Report Types
export interface PropertyPnLEntry {
  propertyId: number;
  propertyName: string;
  income: number;
  expenses: number;
  netIncome: number;
  incomeBreakdown: { category: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
}

export interface PropertyPnLReport {
  startDate: Date;
  endDate: Date;
  properties: PropertyPnLEntry[];
  totals: { income: number; expenses: number; netIncome: number };
}

export interface OwnerPnLEntry {
  ownerId: number;
  ownerName: string;
  ownershipPercent: number;
  properties: { propertyId: number; propertyName: string; ownershipPercent: number }[];
  grossIncome: number;
  ownerShare: number;
  expenses: number;
  netIncome: number;
}

export interface OwnerPnLReport {
  startDate: Date;
  endDate: Date;
  owners: OwnerPnLEntry[];
  totals: { grossIncome: number; expenses: number; netIncome: number };
}

export interface LoanScheduleReport {
  loanId: number;
  lenderName: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: Date;
  schedule: LoanScheduleEntry[];
  summary: {
    totalPayments: number;
    totalInterest: number;
    totalPrincipal: number;
    remainingBalance: number;
    paidPeriods: number;
    remainingPeriods: number;
  };
}

export interface LoanSummaryEntry {
  loanId: number;
  lenderName: string;
  ownerName: string;
  propertyName: string | null;
  principal: number;
  outstandingBalance: number;
  interestRate: number;
  nextPaymentDate: Date | null;
  nextPaymentAmount: number | null;
  status: string;
}

export interface LoansSummaryReport {
  loans: LoanSummaryEntry[];
  totals: {
    totalPrincipal: number;
    totalOutstanding: number;
    monthlyPayments: number;
  };
}

export interface DepreciationAssetEntry {
  assetId: number;
  assetName: string;
  category: string;
  ownerName: string;
  propertyName: string | null;
  acquisitionDate: Date;
  cost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  bookMethod: string;
  taxMethod: string;
  bookAccumulatedDepreciation: number;
  taxAccumulatedDepreciation: number;
  bookNetValue: number;
  taxNetValue: number;
  bookDepreciationYTD: number;
  taxDepreciationYTD: number;
}

export interface DepreciationReportData {
  asOfDate: Date;
  assets: DepreciationAssetEntry[];
  totals: {
    totalCost: number;
    totalBookAccumulated: number;
    totalTaxAccumulated: number;
    totalBookNetValue: number;
    totalTaxNetValue: number;
  };
}

export interface DashboardSummary {
  properties: { total: number; occupied: number; vacant: number };
  tenants: { total: number; active: number };
  leases: { active: number; expiringSoon: number };
  financials: {
    monthlyRentDue: number;
    overdueAmount: number;
    receivedThisMonth: number;
  };
  loans: { total: number; totalOutstanding: number };
  assets: { total: number; totalValue: number };
}

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(id: number, newPassword: string): Promise<boolean>;
  
  getAccessiblePropertyIds(userId: number): Promise<number[]>;
  getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[]; role: string; ownerships: { ownerId: number; ownershipPercent: string }[] })[]>;
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

  // =====================================================
  // OWNERS MODULE
  // =====================================================
  getOwnersByUserId(userId: number): Promise<Owner[]>;
  getOwnerById(id: number): Promise<Owner | undefined>;
  getOwnerWithProperties(id: number): Promise<OwnerWithProperties | undefined>;
  createOwner(owner: InsertOwner & { userId: number }): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<void>;

  // Property Owners
  getPropertyOwnersByPropertyId(propertyId: number): Promise<(PropertyOwner & { owner: Owner })[]>;
  addPropertyOwner(data: InsertPropertyOwner): Promise<PropertyOwner>;
  updatePropertyOwner(id: number, data: Partial<InsertPropertyOwner>): Promise<PropertyOwner | undefined>;
  removePropertyOwner(id: number): Promise<void>;

  // =====================================================
  // OWNER TEAM MANAGEMENT MODULE
  // =====================================================
  
  // Team Members
  getTeamMembersByOwnerId(ownerId: number): Promise<(OwnerTeamMember & { user: User })[]>;
  getTeamMemberById(id: number): Promise<OwnerTeamMember | undefined>;
  getTeamMemberByOwnerAndUser(ownerId: number, userId: number): Promise<OwnerTeamMember | undefined>;
  getOwnersAccessibleByUser(userId: number): Promise<(Owner & { role: string })[]>;
  addOwnerTeamMember(member: InsertOwnerTeamMember & { addedByUserId: number }): Promise<OwnerTeamMember>;
  updateOwnerTeamMember(id: number, data: Partial<InsertOwnerTeamMember>): Promise<OwnerTeamMember | undefined>;
  removeOwnerTeamMember(id: number): Promise<void>;
  canUserAccessOwner(ownerId: number, userId: number): Promise<{ canAccess: boolean; role: string | null; isOwner: boolean }>;
  
  // Invitations
  getInvitationsByOwnerId(ownerId: number): Promise<OwnerInvitation[]>;
  getInvitationById(id: number): Promise<OwnerInvitation | undefined>;
  getInvitationByToken(token: string): Promise<(OwnerInvitation & { owner: Owner }) | undefined>;
  getPendingInvitationByEmail(ownerId: number, email: string): Promise<OwnerInvitation | undefined>;
  createInvitation(invitation: InsertOwnerInvitation & { invitedByUserId: number; inviteToken: string; expiresAt: Date }): Promise<OwnerInvitation>;
  acceptInvitation(token: string, userId: number): Promise<OwnerTeamMember>;
  declineInvitation(token: string): Promise<void>;
  deleteInvitation(id: number): Promise<void>;

  // =====================================================
  // TENANTS MODULE
  // =====================================================
  getTenantsByUserId(userId: number): Promise<Tenant[]>;
  getTenantById(id: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant & { createdByUserId: number }): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<void>;

  // =====================================================
  // LEASES MODULE
  // =====================================================
  getLeasesByUserId(userId: number): Promise<LeaseWithDetails[]>;
  getLeasesByPropertyId(propertyId: number): Promise<LeaseWithDetails[]>;
  getLeasesByTenantId(tenantId: number): Promise<LeaseWithDetails[]>;
  getLeaseById(id: number): Promise<LeaseWithDetails | undefined>;
  getActiveLeasesByPropertyId(propertyId: number): Promise<LeaseWithDetails[]>;
  getActiveLeasesDueForInvoicing(userId: number): Promise<Lease[]>;
  createLease(lease: InsertLease & { createdByUserId: number }): Promise<Lease>;
  updateLease(id: number, lease: Partial<Lease>): Promise<Lease | undefined>;
  updateLeaseStatus(id: number, status: string): Promise<Lease | undefined>;
  deleteLease(id: number): Promise<void>;

  // =====================================================
  // RENT INVOICES MODULE
  // =====================================================
  getInvoicesByUserId(userId: number): Promise<RentInvoice[]>;
  getInvoicesByLeaseId(leaseId: number): Promise<RentInvoice[]>;
  getInvoiceById(id: number): Promise<RentInvoice | undefined>;
  getOverdueInvoices(): Promise<RentInvoice[]>;
  createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice>;
  updateRentInvoice(id: number, invoice: Partial<RentInvoice>): Promise<RentInvoice | undefined>;
  issueInvoice(id: number): Promise<RentInvoice | undefined>;
  recordInvoicePayment(invoiceId: number, amount: number, paymentId: number): Promise<RentInvoice | undefined>;
  deleteRentInvoice(id: number): Promise<void>;

  // =====================================================
  // PAYMENTS MODULE
  // =====================================================
  getPaymentsByPayerId(payerType: string, payerId: number): Promise<Payment[]>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment & { recordedByUserId: number }): Promise<Payment>;
  deletePayment(id: number): Promise<void>;

  // =====================================================
  // CHART OF ACCOUNTS MODULE
  // =====================================================
  getAllAccounts(): Promise<ChartOfAccount[]>;
  getAccountsByType(accountType: string): Promise<ChartOfAccount[]>;
  getAccountById(id: number): Promise<ChartOfAccount | undefined>;
  getAccountByCode(code: string): Promise<ChartOfAccount | undefined>;
  createAccount(account: InsertChartOfAccount & { createdByUserId?: number }): Promise<ChartOfAccount>;
  updateAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined>;
  deleteAccount(id: number): Promise<void>;
  seedDefaultAccounts(userId: number): Promise<void>;

  // =====================================================
  // LEDGER ENTRIES MODULE
  // =====================================================
  getLedgerEntriesByModule(module: string, propertyId?: number): Promise<LedgerEntryWithLines[]>;
  getLedgerEntryById(id: number): Promise<LedgerEntryWithLines | undefined>;
  createLedgerEntry(entry: InsertLedgerEntry & { createdByUserId: number }, lines: InsertLedgerLine[]): Promise<LedgerEntry>;
  reverseLedgerEntry(entryId: number, userId: number): Promise<LedgerEntry | undefined>;
  getAccountBalance(accountId: number, asOfDate?: Date): Promise<{ debit: number; credit: number; balance: number }>;

  // =====================================================
  // UTILITY METERS MODULE
  // =====================================================
  getAllMetersForUser(userId: number): Promise<(UtilityMeter & { propertyName?: string; assignedOwner?: Owner | null; assignedTenant?: Tenant | null })[]>;
  getMetersByPropertyId(propertyId: number): Promise<UtilityMeter[]>;
  getMeterById(id: number): Promise<UtilityMeter | undefined>;
  createMeter(meter: InsertUtilityMeter): Promise<UtilityMeter>;
  updateMeter(id: number, meter: Partial<InsertUtilityMeter>): Promise<UtilityMeter | undefined>;
  deleteMeter(id: number): Promise<void>;

  // Meter Readings
  getReadingsByMeterId(meterId: number): Promise<MeterReading[]>;
  getReadingById(id: number): Promise<MeterReading | undefined>;
  createMeterReading(reading: InsertMeterReading & { recordedByUserId: number }): Promise<MeterReading>;
  deleteMeterReading(id: number): Promise<void>;

  // Meter Assignment
  getMeterAssignmentHistory(meterId: number): Promise<MeterAssignmentHistory[]>;
  getMetersWithAssignmentsByPropertyId(propertyId: number): Promise<(UtilityMeter & { assignedOwner?: Owner | null; assignedTenant?: Tenant | null })[]>;
  getOutstandingBillsForMeter(meterId: number): Promise<UtilityBill[]>;
  transferMeterAssignment(
    meterId: number,
    newAssigneeType: "OWNER" | "TENANT",
    newOwnerId: number | null,
    newTenantId: number | null,
    userId: number,
    options?: {
      leaseId?: number;
      finalMeterReading?: string;
      settlementAmount?: string;
      transferReason?: string;
      notes?: string;
    }
  ): Promise<{ meter: UtilityMeter; history: MeterAssignmentHistory }>;

  // =====================================================
  // UTILITY BILLS MODULE
  // =====================================================
  getUtilityBillsByPropertyId(propertyId: number): Promise<UtilityBill[]>;
  getUtilityBillsByTenantId(tenantId: number): Promise<UtilityBill[]>;
  getUtilityBillById(id: number): Promise<UtilityBill | undefined>;
  createUtilityBill(bill: InsertUtilityBill & { recordedByUserId: number }): Promise<UtilityBill>;
  updateUtilityBill(id: number, bill: Partial<UtilityBill>): Promise<UtilityBill | undefined>;
  forwardBillToTenant(id: number, tenantId: number): Promise<UtilityBill | undefined>;
  markBillAsPaid(id: number, amountPaid: string, paymentReference?: string): Promise<UtilityBill | undefined>;
  deleteUtilityBill(id: number): Promise<void>;
  getPendingBillsByUserId(userId: number): Promise<UtilityBill[]>;

  // =====================================================
  // LOANS MODULE
  // =====================================================
  getLoansByOwnerId(ownerId: number): Promise<LoanWithSchedule[]>;
  getLoanById(id: number): Promise<LoanWithSchedule | undefined>;
  createLoan(loan: InsertLoan & { createdByUserId: number }): Promise<Loan>;
  updateLoan(id: number, loan: Partial<Loan>): Promise<Loan | undefined>;
  deleteLoan(id: number): Promise<void>;
  generateAmortizationSchedule(loanId: number): Promise<LoanScheduleEntry[]>;
  recordLoanPayment(payment: InsertLoanPayment & { recordedByUserId: number }): Promise<LoanPayment>;
  getLoanPaymentsByLoanId(loanId: number): Promise<LoanPayment[]>;

  // =====================================================
  // ASSETS MODULE
  // =====================================================
  getAssetsByOwnerId(ownerId: number): Promise<AssetWithDepreciation[]>;
  getAssetsByPropertyId(propertyId: number): Promise<AssetWithDepreciation[]>;
  getAssetById(id: number): Promise<AssetWithDepreciation | undefined>;
  createAsset(asset: InsertAsset & { createdByUserId: number }): Promise<Asset>;
  updateAsset(id: number, asset: Partial<Asset>): Promise<Asset | undefined>;
  disposeAsset(id: number, disposalDate: Date, disposalAmount: number): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<void>;

  // Depreciation
  getDepreciationRules(category?: string): Promise<DepreciationRule[]>;
  createDepreciationRule(rule: InsertDepreciationRule): Promise<DepreciationRule>;
  runDepreciation(assetId: number, runType: string, periodStart: Date, periodEnd: Date, userId: number): Promise<DepreciationRun>;
  getDepreciationRunsByAssetId(assetId: number): Promise<DepreciationRun[]>;

  // =====================================================
  // REPORTS MODULE
  // =====================================================
  getPropertyPnLReport(userId: number, startDate: Date, endDate: Date, propertyId?: number): Promise<PropertyPnLReport>;
  getOwnerPnLReport(userId: number, startDate: Date, endDate: Date, ownerId?: number): Promise<OwnerPnLReport>;
  getLoanScheduleReport(loanId: number): Promise<LoanScheduleReport>;
  getLoansSummaryReport(userId: number): Promise<LoansSummaryReport>;
  getDepreciationReport(userId: number, asOfDate: Date, ownerId?: number, propertyId?: number): Promise<DepreciationReportData>;
  getDashboardSummary(userId: number): Promise<DashboardSummary>;

  // =====================================================
  // DOCUMENTS MODULE
  // =====================================================
  getDocumentsByModule(module: string, moduleId: number): Promise<Document[]>;
  getDocumentsByPropertyId(propertyId: number): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  getDocumentByShareToken(shareToken: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument & { uploadedByUserId: number }): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;
  generateShareToken(documentId: number, expiresInHours?: number): Promise<string>;

  // =====================================================
  // COMPLIANCE DOCUMENTS MODULE
  // =====================================================
  getComplianceDocumentsByEntity(entityType: "OWNER" | "PROPERTY", entityId: number): Promise<ComplianceDocumentWithStatus[]>;
  getComplianceDocumentsByUser(userId: number): Promise<ComplianceDocumentWithStatus[]>;
  getComplianceDocumentById(id: number): Promise<ComplianceDocumentWithStatus | undefined>;
  getExpiringComplianceDocuments(userId: number, withinDays?: number): Promise<ComplianceDocumentWithStatus[]>;
  createComplianceDocument(doc: InsertComplianceDocument & { createdByUserId: number }): Promise<ComplianceDocument>;
  updateComplianceDocument(id: number, updates: Partial<InsertComplianceDocument>): Promise<ComplianceDocument | undefined>;
  deleteComplianceDocument(id: number): Promise<void>;

  // =====================================================
  // EXPENSES MODULE
  // =====================================================
  getExpensesByOwnerId(ownerId: number): Promise<ExpenseWithDetails[]>;
  getExpensesByPropertyId(propertyId: number): Promise<ExpenseWithDetails[]>;
  getExpensesByUser(userId: number): Promise<ExpenseWithDetails[]>;
  getExpenseById(id: number): Promise<ExpenseWithDetails | undefined>;
  getExpensesByMaintenanceIssue(issueId: number): Promise<Expense[]>;
  getExpensesByMaintenanceTask(taskId: number): Promise<Expense[]>;
  getExpensesByComplianceDocument(docId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense & { createdByUserId: number }): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined>;
  updateExpensePayment(id: number, paymentStatus: string, paymentMethod?: string, paymentDate?: Date, paymentReference?: string): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  getExpenseSummaryByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<{ category: string; total: number; count: number }[]>;
  getExpenseSummaryByProperty(propertyId: number, startDate?: Date, endDate?: Date): Promise<{ category: string; total: number; count: number }[]>;

  // =====================================================
  // DASHBOARD LAYOUTS MODULE
  // =====================================================
  getDashboardLayoutById(id: number): Promise<DashboardLayout | undefined>;
  getDashboardLayoutsByRole(roleId: number): Promise<DashboardLayout[]>;
  getDashboardLayoutByUser(userId: number): Promise<DashboardLayout | undefined>;
  getDefaultLayoutForRole(roleId: number): Promise<DashboardLayout | undefined>;
  getAllDashboardLayouts(): Promise<DashboardLayout[]>;
  createDashboardLayout(layout: InsertDashboardLayout): Promise<DashboardLayout>;
  updateDashboardLayout(id: number, layout: Partial<InsertDashboardLayout>): Promise<DashboardLayout | undefined>;
  deleteDashboardLayout(id: number): Promise<void>;
  getUserPrimaryRoleId(userId: number): Promise<number | undefined>;

  // =====================================================
  // EXCHANGE RATES MODULE
  // =====================================================
  getAllExchangeRates(): Promise<ExchangeRate[]>;
  getActiveExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRateById(id: number): Promise<ExchangeRate | undefined>;
  getExchangeRate(baseCurrency: string, quoteCurrency: string, date?: Date): Promise<ExchangeRate | undefined>;
  createExchangeRate(rate: InsertExchangeRate & { createdByUserId: number }): Promise<ExchangeRate>;
  updateExchangeRate(id: number, rate: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined>;
  deleteExchangeRate(id: number): Promise<void>;
  convertAmount(amount: number, fromCurrency: string, toCurrency: string, date?: Date): Promise<{ convertedAmount: number; rate: number } | undefined>;

  // =====================================================
  // INVENTORY MODULE
  // =====================================================
  // Categories
  getAllInventoryCategories(): Promise<InventoryCategory[]>;
  getInventoryCategoryById(id: number): Promise<InventoryCategory | undefined>;
  getInventoryCategoriesTree(): Promise<InventoryCategoryWithChildren[]>;
  createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory>;
  updateInventoryCategory(id: number, category: Partial<InsertInventoryCategory>): Promise<InventoryCategory | undefined>;
  deleteInventoryCategory(id: number): Promise<void>;

  // Warehouse Locations
  getAllWarehouseLocations(): Promise<WarehouseLocation[]>;
  getWarehouseLocationById(id: number): Promise<WarehouseLocation | undefined>;
  createWarehouseLocation(location: InsertWarehouseLocation): Promise<WarehouseLocation>;
  updateWarehouseLocation(id: number, location: Partial<InsertWarehouseLocation>): Promise<WarehouseLocation | undefined>;
  deleteWarehouseLocation(id: number): Promise<void>;

  // Inventory Items
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemWithDetails(id: number): Promise<InventoryItemWithDetails | undefined>;
  getInventoryItemsByProperty(propertyId: number): Promise<InventoryItem[]>;
  getInventoryItemsByWarehouse(warehouseId: number): Promise<InventoryItem[]>;
  getInventoryItemsByCategory(categoryId: number): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem & { createdByUserId: number }): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<void>;

  // Inventory Movements
  getInventoryMovementsByItem(itemId: number): Promise<InventoryMovement[]>;
  createInventoryMovement(movement: InsertInventoryMovement & { performedByUserId: number }): Promise<InventoryMovement>;
  issueInventoryItem(itemId: number, data: { propertyId?: number; unitId?: number; tenantId?: number; quantity: number; notes?: string; performedByUserId: number }): Promise<InventoryMovement>;
  returnInventoryItem(itemId: number, data: { warehouseId?: number; quantity: number; conditionAfter?: string; damageNotes?: string; notes?: string; performedByUserId: number }): Promise<InventoryMovement>;

  // Onboarding Processes
  getAllOnboardingProcesses(): Promise<OnboardingProcess[]>;
  getOnboardingProcessById(id: number): Promise<OnboardingProcess | undefined>;
  getOnboardingProcessWithDetails(id: number): Promise<OnboardingProcessWithDetails | undefined>;
  getOnboardingProcessByLease(leaseId: number): Promise<OnboardingProcess | undefined>;
  getOnboardingProcessesByTenant(tenantId: number): Promise<OnboardingProcess[]>;
  getOnboardingProcessesByProperty(propertyId: number): Promise<OnboardingProcess[]>;
  createOnboardingProcess(process: InsertOnboardingProcess & { createdByUserId: number }): Promise<OnboardingProcess>;
  updateOnboardingProcess(id: number, data: Partial<InsertOnboardingProcess>): Promise<OnboardingProcess | undefined>;
  updateOnboardingStage(id: number, stage: string, timestamp: Date): Promise<OnboardingProcess | undefined>;
  deleteOnboardingProcess(id: number): Promise<void>;

  // Condition Checklist Items
  getChecklistItemsByOnboarding(onboardingId: number): Promise<ConditionChecklistItem[]>;
  getChecklistItemById(id: number): Promise<ConditionChecklistItem | undefined>;
  createChecklistItem(item: InsertConditionChecklistItem & { inspectedByUserId: number }): Promise<ConditionChecklistItem>;
  updateChecklistItem(id: number, data: Partial<InsertConditionChecklistItem>): Promise<ConditionChecklistItem | undefined>;
  deleteChecklistItem(id: number): Promise<void>;

  // Handover Items
  getHandoverItemsByOnboarding(onboardingId: number): Promise<HandoverItem[]>;
  getHandoverItemById(id: number): Promise<HandoverItem | undefined>;
  createHandoverItem(item: InsertHandoverItem & { handedOverByUserId: number }): Promise<HandoverItem>;
  updateHandoverItem(id: number, data: Partial<InsertHandoverItem>): Promise<HandoverItem | undefined>;
  deleteHandoverItem(id: number): Promise<void>;
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

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password: newPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
    return true;
  }

  async getAccessiblePropertyIds(userId: number): Promise<number[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user?.isSuperAdmin === 1) {
      const allProps = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.isDeleted, 0));
      return allProps.map(p => p.id);
    }
    
    const ownedProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 0)));
    
    const sharedProperties = await db
      .select({ id: propertyCollaborators.propertyId })
      .from(propertyCollaborators)
      .innerJoin(properties, eq(properties.id, propertyCollaborators.propertyId))
      .where(and(
        eq(propertyCollaborators.userId, userId),
        eq(properties.isDeleted, 0)
      ));
    
    const globalRbacAssignment = await db
      .select()
      .from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, 1),
        isNull(userRoleAssignments.propertyId)
      ));
    
    if (globalRbacAssignment.length > 0) {
      const allProps = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.isDeleted, 0));
      return allProps.map(p => p.id);
    }
    
    const propertyRbacAssignments = await db
      .select({ propertyId: userRoleAssignments.propertyId })
      .from(userRoleAssignments)
      .innerJoin(properties, eq(properties.id, userRoleAssignments.propertyId))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, 1),
        eq(properties.isDeleted, 0),
        sql`${userRoleAssignments.propertyId} IS NOT NULL`
      ));
    
    const allIds = new Set([
      ...ownedProperties.map(p => p.id),
      ...sharedProperties.map(p => p.id),
      ...propertyRbacAssignments.filter(p => p.propertyId !== null).map(p => p.propertyId as number)
    ]);
    
    return Array.from(allIds);
  }

  async getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[]; role: string; ownerships: { ownerId: number; ownershipPercent: string }[] })[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    const globalRbacAssignment = await db
      .select()
      .from(userRoleAssignments)
      .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, 1),
        isNull(userRoleAssignments.propertyId)
      ));
    
    if (user?.isSuperAdmin === 1 || globalRbacAssignment.length > 0) {
      const allProps = await db
        .select()
        .from(properties)
        .where(eq(properties.isDeleted, 0))
        .orderBy(desc(properties.createdAt));
      
      const globalRole = user?.isSuperAdmin === 1 
        ? 'SUPER_ADMIN' 
        : globalRbacAssignment[0]?.roles.name || 'RBAC_ACCESS';
      
      const propertiesWithUnits = await Promise.all(
        allProps.map(async (property) => {
          const propertyUnits = await db
            .select()
            .from(units)
            .where(eq(units.propertyId, property.id))
            .orderBy(units.unitName);
          const propOwnerships = await db
            .select({ ownerId: propertyOwners.ownerId, ownershipPercent: propertyOwners.ownershipPercent })
            .from(propertyOwners)
            .where(eq(propertyOwners.propertyId, property.id));
          return { ...property, units: propertyUnits, role: globalRole, ownerships: propOwnerships };
        })
      );
      
      return propertiesWithUnits;
    }
    
    const ownedProperties = await db
      .select()
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 0)))
      .orderBy(desc(properties.createdAt));
    
    const collaborations = await db
      .select()
      .from(propertyCollaborators)
      .where(eq(propertyCollaborators.userId, userId));
    
    const sharedPropertyIds = collaborations.map(c => c.propertyId);
    const roleMap = new Map<number, string>(collaborations.map(c => [c.propertyId, c.role]));
    
    let sharedProperties: Property[] = [];
    if (sharedPropertyIds.length > 0) {
      sharedProperties = await db
        .select()
        .from(properties)
        .where(and(
          inArray(properties.id, sharedPropertyIds),
          eq(properties.isDeleted, 0)
        ))
        .orderBy(desc(properties.createdAt));
    }
    
    const propertyRbacAssignments = await db
      .select({
        propertyId: userRoleAssignments.propertyId,
        roleName: roles.name
      })
      .from(userRoleAssignments)
      .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .innerJoin(properties, eq(properties.id, userRoleAssignments.propertyId))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, 1),
        eq(properties.isDeleted, 0),
        sql`${userRoleAssignments.propertyId} IS NOT NULL`
      ));
    
    const rbacPropertyIds = propertyRbacAssignments
      .filter(a => a.propertyId !== null)
      .map(a => a.propertyId as number);
    
    const rbacRoleMap = new Map<number, string>(
      propertyRbacAssignments
        .filter(a => a.propertyId !== null)
        .map(a => [a.propertyId as number, a.roleName])
    );
    
    let rbacProperties: Property[] = [];
    if (rbacPropertyIds.length > 0) {
      const ownedAndSharedIds = new Set([
        ...ownedProperties.map(p => p.id),
        ...sharedProperties.map(p => p.id)
      ]);
      const uniqueRbacPropertyIds = rbacPropertyIds.filter(id => !ownedAndSharedIds.has(id));
      
      if (uniqueRbacPropertyIds.length > 0) {
        rbacProperties = await db
          .select()
          .from(properties)
          .where(and(
            inArray(properties.id, uniqueRbacPropertyIds),
            eq(properties.isDeleted, 0)
          ))
          .orderBy(desc(properties.createdAt));
      }
    }
    
    const allProperties = [
      ...ownedProperties.map(p => ({ ...p, role: 'OWNER' as string })),
      ...sharedProperties.map(p => ({ ...p, role: roleMap.get(p.id) || 'VIEWER' })),
      ...rbacProperties.map(p => ({ ...p, role: rbacRoleMap.get(p.id) || 'RBAC_ACCESS' }))
    ];
    
    const propertiesWithUnits = await Promise.all(
      allProperties.map(async (property) => {
        const propertyUnits = await db
          .select()
          .from(units)
          .where(eq(units.propertyId, property.id))
          .orderBy(units.unitName);
        const propOwnerships = await db
          .select({ ownerId: propertyOwners.ownerId, ownershipPercent: propertyOwners.ownershipPercent })
          .from(propertyOwners)
          .where(eq(propertyOwners.propertyId, property.id));
        return { ...property, units: propertyUnits, ownerships: propOwnerships };
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
    
    if (!property || property.isDeleted === 1) {
      return { canAccess: false, role: null, isOwner: false };
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.isSuperAdmin === 1) {
      return { canAccess: true, role: 'SUPER_ADMIN', isOwner: false };
    }
    
    if (property.ownerUserId === userId) {
      return { canAccess: true, role: 'OWNER', isOwner: true };
    }
    
    const rbacAssignments = await db
      .select()
      .from(userRoleAssignments)
      .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, 1),
        or(
          isNull(userRoleAssignments.propertyId),
          eq(userRoleAssignments.propertyId, propertyId)
        )
      ));
    
    if (rbacAssignments.length > 0) {
      const propertyScoped = rbacAssignments.find(a => a.user_role_assignments.propertyId === propertyId);
      const role = propertyScoped?.roles.name || rbacAssignments[0]?.roles.name || 'RBAC_ACCESS';
      return { canAccess: true, role, isOwner: false };
    }
    
    const collabRole = await this.getCollaboratorRole(propertyId, userId);
    return { canAccess: collabRole !== null, role: collabRole, isOwner: false };
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

  // =====================================================
  // OWNERS MODULE
  // =====================================================

  async getOwnersByUserId(userId: number): Promise<Owner[]> {
    return db
      .select()
      .from(owners)
      .where(eq(owners.userId, userId))
      .orderBy(desc(owners.createdAt));
  }

  async getOwnerById(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner || undefined;
  }

  async getOwnerWithProperties(id: number): Promise<OwnerWithProperties | undefined> {
    const owner = await this.getOwnerById(id);
    if (!owner) return undefined;

    const ownerships = await db
      .select()
      .from(propertyOwners)
      .where(eq(propertyOwners.ownerId, id));

    const ownershipWithProps = await Promise.all(
      ownerships.map(async (po) => {
        const [property] = await db.select().from(properties).where(eq(properties.id, po.propertyId));
        return { ...po, property };
      })
    );

    return { ...owner, propertyOwnerships: ownershipWithProps };
  }

  async createOwner(owner: InsertOwner & { userId: number }): Promise<Owner> {
    const [newOwner] = await db.insert(owners).values(owner).returning();
    return newOwner;
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const [updated] = await db
      .update(owners)
      .set({ ...owner, updatedAt: new Date() })
      .where(eq(owners.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOwner(id: number): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  async getPropertyOwnersByPropertyId(propertyId: number): Promise<(PropertyOwner & { owner: Owner })[]> {
    const pos = await db
      .select()
      .from(propertyOwners)
      .where(eq(propertyOwners.propertyId, propertyId));

    return Promise.all(
      pos.map(async (po) => {
        const [owner] = await db.select().from(owners).where(eq(owners.id, po.ownerId));
        return { ...po, owner };
      })
    );
  }

  async addPropertyOwner(data: InsertPropertyOwner): Promise<PropertyOwner> {
    const [po] = await db.insert(propertyOwners).values(data).returning();
    return po;
  }

  async updatePropertyOwner(id: number, data: Partial<InsertPropertyOwner>): Promise<PropertyOwner | undefined> {
    const [updated] = await db
      .update(propertyOwners)
      .set(data)
      .where(eq(propertyOwners.id, id))
      .returning();
    return updated || undefined;
  }

  async removePropertyOwner(id: number): Promise<void> {
    await db.delete(propertyOwners).where(eq(propertyOwners.id, id));
  }

  // =====================================================
  // OWNER TEAM MANAGEMENT MODULE
  // =====================================================

  async getTeamMembersByOwnerId(ownerId: number): Promise<(OwnerTeamMember & { user: User })[]> {
    const results = await db
      .select()
      .from(ownerTeamMembers)
      .innerJoin(users, eq(ownerTeamMembers.userId, users.id))
      .where(eq(ownerTeamMembers.ownerId, ownerId))
      .orderBy(desc(ownerTeamMembers.createdAt));
    
    return results.map(r => ({
      ...r.owner_team_members,
      user: r.users
    }));
  }

  async getTeamMemberById(id: number): Promise<OwnerTeamMember | undefined> {
    const [result] = await db
      .select()
      .from(ownerTeamMembers)
      .where(eq(ownerTeamMembers.id, id));
    return result;
  }

  async getTeamMemberByOwnerAndUser(ownerId: number, userId: number): Promise<OwnerTeamMember | undefined> {
    const [result] = await db
      .select()
      .from(ownerTeamMembers)
      .where(and(
        eq(ownerTeamMembers.ownerId, ownerId),
        eq(ownerTeamMembers.userId, userId)
      ));
    return result;
  }

  async getOwnersAccessibleByUser(userId: number): Promise<(Owner & { role: string })[]> {
    const ownedByUser = await db
      .select()
      .from(owners)
      .where(eq(owners.userId, userId));
    
    const ownedResults = ownedByUser.map(o => ({ ...o, role: "OWNER" as string }));
    
    const teamMemberships = await db
      .select()
      .from(ownerTeamMembers)
      .innerJoin(owners, eq(ownerTeamMembers.ownerId, owners.id))
      .where(and(
        eq(ownerTeamMembers.userId, userId),
        eq(ownerTeamMembers.isActive, 1)
      ));
    
    const teamResults = teamMemberships.map(r => ({
      ...r.owners,
      role: r.owner_team_members.role
    }));
    
    const ownedOwnerIds = new Set(ownedResults.map(o => o.id));
    const filteredTeamResults = teamResults.filter(r => !ownedOwnerIds.has(r.id));
    
    return [...ownedResults, ...filteredTeamResults];
  }

  async addOwnerTeamMember(member: InsertOwnerTeamMember & { addedByUserId: number }): Promise<OwnerTeamMember> {
    const [result] = await db
      .insert(ownerTeamMembers)
      .values(member)
      .returning();
    return result;
  }

  async updateOwnerTeamMember(id: number, data: Partial<InsertOwnerTeamMember>): Promise<OwnerTeamMember | undefined> {
    const [result] = await db
      .update(ownerTeamMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ownerTeamMembers.id, id))
      .returning();
    return result;
  }

  async removeOwnerTeamMember(id: number): Promise<void> {
    await db.delete(ownerTeamMembers).where(eq(ownerTeamMembers.id, id));
  }

  async canUserAccessOwner(ownerId: number, userId: number): Promise<{ canAccess: boolean; role: string | null; isOwner: boolean }> {
    const owner = await this.getOwnerById(ownerId);
    if (!owner) {
      return { canAccess: false, role: null, isOwner: false };
    }
    
    if (owner.userId === userId) {
      return { canAccess: true, role: "OWNER", isOwner: true };
    }
    
    const teamMember = await this.getTeamMemberByOwnerAndUser(ownerId, userId);
    if (teamMember && teamMember.isActive === 1) {
      return { canAccess: true, role: teamMember.role, isOwner: false };
    }
    
    return { canAccess: false, role: null, isOwner: false };
  }

  // Invitations
  async getInvitationsByOwnerId(ownerId: number): Promise<OwnerInvitation[]> {
    return db
      .select()
      .from(ownerInvitations)
      .where(eq(ownerInvitations.ownerId, ownerId))
      .orderBy(desc(ownerInvitations.createdAt));
  }

  async getInvitationById(id: number): Promise<OwnerInvitation | undefined> {
    const [result] = await db
      .select()
      .from(ownerInvitations)
      .where(eq(ownerInvitations.id, id));
    return result;
  }

  async getInvitationByToken(token: string): Promise<(OwnerInvitation & { owner: Owner }) | undefined> {
    const [result] = await db
      .select()
      .from(ownerInvitations)
      .innerJoin(owners, eq(ownerInvitations.ownerId, owners.id))
      .where(eq(ownerInvitations.inviteToken, token));
    
    if (!result) return undefined;
    
    return {
      ...result.owner_invitations,
      owner: result.owners
    };
  }

  async getPendingInvitationByEmail(ownerId: number, email: string): Promise<OwnerInvitation | undefined> {
    const [result] = await db
      .select()
      .from(ownerInvitations)
      .where(and(
        eq(ownerInvitations.ownerId, ownerId),
        eq(ownerInvitations.email, email.toLowerCase()),
        eq(ownerInvitations.status, "PENDING")
      ));
    return result;
  }

  async createInvitation(invitation: InsertOwnerInvitation & { invitedByUserId: number; inviteToken: string; expiresAt: Date }): Promise<OwnerInvitation> {
    const [result] = await db
      .insert(ownerInvitations)
      .values({
        ...invitation,
        email: invitation.email.toLowerCase(),
        status: "PENDING"
      })
      .returning();
    return result;
  }

  async acceptInvitation(token: string, userId: number): Promise<OwnerTeamMember> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    if (invitation.status !== "PENDING") {
      throw new Error("Invitation is no longer valid");
    }
    if (new Date() > invitation.expiresAt) {
      await db
        .update(ownerInvitations)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(ownerInvitations.id, invitation.id));
      throw new Error("Invitation has expired");
    }
    
    const existingMember = await this.getTeamMemberByOwnerAndUser(invitation.ownerId, userId);
    if (existingMember) {
      throw new Error("You are already a team member for this owner");
    }
    
    const [teamMember] = await db
      .insert(ownerTeamMembers)
      .values({
        ownerId: invitation.ownerId,
        userId: userId,
        role: invitation.role,
        isActive: 1,
        addedByUserId: invitation.invitedByUserId
      })
      .returning();
    
    await db
      .update(ownerInvitations)
      .set({ 
        status: "ACCEPTED", 
        acceptedByUserId: userId,
        updatedAt: new Date() 
      })
      .where(eq(ownerInvitations.id, invitation.id));
    
    return teamMember;
  }

  async declineInvitation(token: string): Promise<void> {
    await db
      .update(ownerInvitations)
      .set({ status: "DECLINED", updatedAt: new Date() })
      .where(eq(ownerInvitations.inviteToken, token));
  }

  async deleteInvitation(id: number): Promise<void> {
    await db.delete(ownerInvitations).where(eq(ownerInvitations.id, id));
  }

  // =====================================================
  // TENANTS MODULE
  // =====================================================

  async getTenantsByUserId(userId: number): Promise<Tenant[]> {
    const accessiblePropertyIds = await this.getAccessiblePropertyIds(userId);
    
    const ownedTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.createdByUserId, userId))
      .orderBy(desc(tenants.createdAt));
    
    if (accessiblePropertyIds.length === 0) return ownedTenants;
    
    const leaseTenantIds = await db
      .select({ tenantId: leases.tenantId })
      .from(leases)
      .where(inArray(leases.propertyId, accessiblePropertyIds));
    
    const tenantIdsFromLeases = leaseTenantIds.map(l => l.tenantId);
    const ownedTenantIds = new Set(ownedTenants.map(t => t.id));
    const additionalTenantIds = tenantIdsFromLeases.filter(id => !ownedTenantIds.has(id));
    
    if (additionalTenantIds.length === 0) return ownedTenants;
    
    const additionalTenants = await db
      .select()
      .from(tenants)
      .where(inArray(tenants.id, additionalTenantIds))
      .orderBy(desc(tenants.createdAt));
    
    return [...ownedTenants, ...additionalTenants];
  }

  async getTenantById(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(tenant: InsertTenant & { createdByUserId: number }): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db
      .update(tenants)
      .set({ ...tenant, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  // =====================================================
  // LEASES MODULE
  // =====================================================

  private async enrichLease(lease: Lease): Promise<LeaseWithDetails> {
    const [property] = await db.select().from(properties).where(eq(properties.id, lease.propertyId));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, lease.tenantId));
    let unit = null;
    if (lease.unitId) {
      const [u] = await db.select().from(units).where(eq(units.id, lease.unitId));
      unit = u || null;
    }
    return { ...lease, property, tenant, unit };
  }

  async getLeasesByUserId(userId: number): Promise<LeaseWithDetails[]> {
    const userProperties = await this.getPropertiesByUserId(userId);
    const propertyIds = userProperties.map(p => p.id);
    if (propertyIds.length === 0) return [];
    const leaseList = await db
      .select()
      .from(leases)
      .where(inArray(leases.propertyId, propertyIds))
      .orderBy(desc(leases.createdAt));
    return Promise.all(leaseList.map((l) => this.enrichLease(l)));
  }

  async getLeasesByPropertyId(propertyId: number): Promise<LeaseWithDetails[]> {
    const leaseList = await db
      .select()
      .from(leases)
      .where(eq(leases.propertyId, propertyId))
      .orderBy(desc(leases.createdAt));
    return Promise.all(leaseList.map((l) => this.enrichLease(l)));
  }

  async getLeasesByTenantId(tenantId: number): Promise<LeaseWithDetails[]> {
    const leaseList = await db
      .select()
      .from(leases)
      .where(eq(leases.tenantId, tenantId))
      .orderBy(desc(leases.createdAt));
    return Promise.all(leaseList.map((l) => this.enrichLease(l)));
  }

  async getLeaseById(id: number): Promise<LeaseWithDetails | undefined> {
    const [lease] = await db.select().from(leases).where(eq(leases.id, id));
    if (!lease) return undefined;
    return this.enrichLease(lease);
  }

  async getActiveLeasesByPropertyId(propertyId: number): Promise<LeaseWithDetails[]> {
    const leaseList = await db
      .select()
      .from(leases)
      .where(and(eq(leases.propertyId, propertyId), eq(leases.status, "ACTIVE")));
    return Promise.all(leaseList.map((l) => this.enrichLease(l)));
  }

  async getActiveLeasesDueForInvoicing(userId: number): Promise<Lease[]> {
    const now = new Date();
    const userProperties = await this.getPropertiesByUserId(userId);
    const propertyIds = userProperties.map(p => p.id);
    if (propertyIds.length === 0) return [];
    const activeLeases = await db
      .select()
      .from(leases)
      .where(and(
        eq(leases.status, "ACTIVE"),
        inArray(leases.propertyId, propertyIds),
        or(
          isNull(leases.nextInvoiceDate),
          lte(leases.nextInvoiceDate, now)
        )
      ));
    return activeLeases;
  }

  async createLease(lease: InsertLease & { createdByUserId: number }): Promise<Lease> {
    const [newLease] = await db.insert(leases).values(lease).returning();
    return newLease;
  }

  async updateLease(id: number, lease: Partial<Lease>): Promise<Lease | undefined> {
    const [updated] = await db
      .update(leases)
      .set({ ...lease, updatedAt: new Date() })
      .where(eq(leases.id, id))
      .returning();
    return updated || undefined;
  }

  async updateLeaseStatus(id: number, status: string): Promise<Lease | undefined> {
    const [updated] = await db
      .update(leases)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(leases.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLease(id: number): Promise<void> {
    await db.delete(leases).where(eq(leases.id, id));
  }

  // =====================================================
  // RENT INVOICES MODULE
  // =====================================================

  async getInvoicesByUserId(userId: number): Promise<RentInvoice[]> {
    const userProperties = await this.getPropertiesByUserId(userId);
    const propertyIds = userProperties.map(p => p.id);
    if (propertyIds.length === 0) return [];
    const userLeases = await db
      .select({ id: leases.id })
      .from(leases)
      .where(inArray(leases.propertyId, propertyIds));
    const leaseIds = userLeases.map(l => l.id);
    if (leaseIds.length === 0) return [];
    return db
      .select()
      .from(rentInvoices)
      .where(inArray(rentInvoices.leaseId, leaseIds))
      .orderBy(desc(rentInvoices.createdAt));
  }

  async getInvoicesByLeaseId(leaseId: number): Promise<RentInvoice[]> {
    return db
      .select()
      .from(rentInvoices)
      .where(eq(rentInvoices.leaseId, leaseId))
      .orderBy(desc(rentInvoices.createdAt));
  }

  async getInvoiceById(id: number): Promise<RentInvoice | undefined> {
    const [invoice] = await db.select().from(rentInvoices).where(eq(rentInvoices.id, id));
    return invoice || undefined;
  }

  async getOverdueInvoices(): Promise<RentInvoice[]> {
    const now = new Date();
    const allInvoices = await db.select().from(rentInvoices);
    return allInvoices.filter(
      (inv) =>
        inv.dueDate < now &&
        inv.status !== "PAID" &&
        inv.status !== "CANCELLED"
    );
  }

  async createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice> {
    const count = await db.select().from(rentInvoices);
    const invoiceNumber = `INV-${String(count.length + 1).padStart(6, "0")}`;
    const [newInvoice] = await db
      .insert(rentInvoices)
      .values({ ...invoice, invoiceNumber })
      .returning();
    return newInvoice;
  }

  async updateRentInvoice(id: number, invoice: Partial<RentInvoice>): Promise<RentInvoice | undefined> {
    const [updated] = await db
      .update(rentInvoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(rentInvoices.id, id))
      .returning();
    return updated || undefined;
  }

  async issueInvoice(id: number): Promise<RentInvoice | undefined> {
    const [updated] = await db
      .update(rentInvoices)
      .set({ status: "ISSUED", issuedAt: new Date(), updatedAt: new Date() })
      .where(eq(rentInvoices.id, id))
      .returning();
    return updated || undefined;
  }

  async recordInvoicePayment(invoiceId: number, amount: number, paymentId: number): Promise<RentInvoice | undefined> {
    const [invoice] = await db.select().from(rentInvoices).where(eq(rentInvoices.id, invoiceId));
    if (!invoice) return undefined;

    const newAmountPaid = parseFloat(invoice.amountPaid || "0") + amount;
    const totalAmount = parseFloat(invoice.totalAmount);
    let newStatus: "PAID" | "PARTIALLY_PAID" = newAmountPaid >= totalAmount ? "PAID" : "PARTIALLY_PAID";

    const [updated] = await db
      .update(rentInvoices)
      .set({
        amountPaid: String(newAmountPaid),
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(rentInvoices.id, invoiceId))
      .returning();
    return updated || undefined;
  }

  async deleteRentInvoice(id: number): Promise<void> {
    await db.delete(rentInvoices).where(eq(rentInvoices.id, id));
  }

  // =====================================================
  // PAYMENTS MODULE
  // =====================================================

  async getPaymentsByPayerId(payerType: string, payerId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(and(eq(payments.payerType, payerType as any), eq(payments.payerId, payerId)))
      .orderBy(desc(payments.paymentDate));
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment & { recordedByUserId: number }): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();

    if (payment.appliedToType === "RENT_INVOICE") {
      const [invoice] = await db.select().from(rentInvoices).where(eq(rentInvoices.id, payment.appliedToId));
      if (invoice) {
        const [lease] = await db.select().from(leases).where(eq(leases.id, invoice.leaseId));
        if (lease) {
          const rentalIncomeAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "4000")).limit(1);
          const cashAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "1000")).limit(1);
          
          if (rentalIncomeAccount.length > 0 && cashAccount.length > 0) {
            await this.createLedgerEntry(
              {
                entryDate: new Date(payment.paymentDate),
                propertyId: lease.propertyId,
                module: "RENT",
                referenceId: newPayment.id,
                memo: `Rent payment - Invoice #${invoice.invoiceNumber}`,
                createdByUserId: payment.recordedByUserId,
              },
              [
                { accountId: cashAccount[0].id, debit: payment.amount, credit: "0", memo: "Cash received" },
                { accountId: rentalIncomeAccount[0].id, debit: "0", credit: payment.amount, memo: "Rental income" },
              ]
            );
          }
        }
      }
    }

    return newPayment;
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // =====================================================
  // CHART OF ACCOUNTS MODULE
  // =====================================================

  async getAllAccounts(): Promise<ChartOfAccount[]> {
    return db.select().from(chartOfAccounts).orderBy(chartOfAccounts.code);
  }

  async getAccountsByType(accountType: string): Promise<ChartOfAccount[]> {
    return db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.accountType, accountType as any))
      .orderBy(chartOfAccounts.code);
  }

  async getAccountById(id: number): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, id));
    return account || undefined;
  }

  async getAccountByCode(code: string): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code));
    return account || undefined;
  }

  async createAccount(account: InsertChartOfAccount & { createdByUserId?: number }): Promise<ChartOfAccount> {
    const [newAccount] = await db.insert(chartOfAccounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined> {
    const [updated] = await db
      .update(chartOfAccounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(chartOfAccounts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, id));
  }

  async seedDefaultAccounts(userId: number): Promise<void> {
    const existingAccounts = await db.select().from(chartOfAccounts);
    if (existingAccounts.length > 0) return;

    const defaultAccounts = [
      { code: "1000", name: "Cash", accountType: "ASSET" as const, isSystem: 1 },
      { code: "1100", name: "Bank Account", accountType: "ASSET" as const, isSystem: 1 },
      { code: "1200", name: "Accounts Receivable", accountType: "ASSET" as const, isSystem: 1 },
      { code: "1300", name: "Prepaid Expenses", accountType: "ASSET" as const, isSystem: 1 },
      { code: "1500", name: "Fixed Assets", accountType: "ASSET" as const, isSystem: 1 },
      { code: "1550", name: "Accumulated Depreciation", accountType: "ASSET" as const, isSystem: 1 },
      { code: "2000", name: "Accounts Payable", accountType: "LIABILITY" as const, isSystem: 1 },
      { code: "2100", name: "Tenant Deposits", accountType: "LIABILITY" as const, isSystem: 1 },
      { code: "2200", name: "Loans Payable", accountType: "LIABILITY" as const, isSystem: 1 },
      { code: "3000", name: "Owner Equity", accountType: "EQUITY" as const, isSystem: 1 },
      { code: "3100", name: "Retained Earnings", accountType: "EQUITY" as const, isSystem: 1 },
      { code: "4000", name: "Rental Income", accountType: "INCOME" as const, isSystem: 1 },
      { code: "4100", name: "Utility Recovery", accountType: "INCOME" as const, isSystem: 1 },
      { code: "4200", name: "Other Income", accountType: "INCOME" as const, isSystem: 1 },
      { code: "5000", name: "Maintenance Expense", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5100", name: "Utilities Expense", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5200", name: "Insurance Expense", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5300", name: "Property Tax", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5400", name: "Depreciation Expense", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5500", name: "Interest Expense", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5600", name: "Professional Fees", accountType: "EXPENSE" as const, isSystem: 1 },
      { code: "5700", name: "Other Expenses", accountType: "EXPENSE" as const, isSystem: 1 },
    ];

    for (const acc of defaultAccounts) {
      await db.insert(chartOfAccounts).values({ ...acc, createdByUserId: userId });
    }
  }

  // =====================================================
  // LEDGER ENTRIES MODULE
  // =====================================================

  private async enrichLedgerEntry(entry: LedgerEntry): Promise<LedgerEntryWithLines> {
    const lines = await db.select().from(ledgerLines).where(eq(ledgerLines.entryId, entry.id));
    const linesWithAccounts = await Promise.all(
      lines.map(async (line) => {
        const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, line.accountId));
        return { ...line, account };
      })
    );
    return { ...entry, lines: linesWithAccounts };
  }

  async getLedgerEntriesByModule(module: string, propertyId?: number): Promise<LedgerEntryWithLines[]> {
    let entries;
    if (propertyId) {
      entries = await db
        .select()
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.module, module as any), eq(ledgerEntries.propertyId, propertyId)))
        .orderBy(desc(ledgerEntries.entryDate));
    } else {
      entries = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.module, module as any))
        .orderBy(desc(ledgerEntries.entryDate));
    }
    return Promise.all(entries.map((e) => this.enrichLedgerEntry(e)));
  }

  async getLedgerEntryById(id: number): Promise<LedgerEntryWithLines | undefined> {
    const [entry] = await db.select().from(ledgerEntries).where(eq(ledgerEntries.id, id));
    if (!entry) return undefined;
    return this.enrichLedgerEntry(entry);
  }

  async createLedgerEntry(
    entry: InsertLedgerEntry & { createdByUserId: number },
    lines: InsertLedgerLine[]
  ): Promise<LedgerEntry> {
    const count = await db.select().from(ledgerEntries);
    const entryNumber = `JE-${String(count.length + 1).padStart(6, "0")}`;

    const [newEntry] = await db
      .insert(ledgerEntries)
      .values({ ...entry, entryNumber })
      .returning();

    for (const line of lines) {
      await db.insert(ledgerLines).values({ ...line, entryId: newEntry.id });
    }

    return newEntry;
  }

  async reverseLedgerEntry(entryId: number, userId: number): Promise<LedgerEntry | undefined> {
    const original = await this.getLedgerEntryById(entryId);
    if (!original || original.isReversed) return undefined;

    const reversalEntry = await this.createLedgerEntry(
      {
        entryDate: new Date(),
        propertyId: original.propertyId,
        ownerId: original.ownerId,
        module: original.module,
        memo: `Reversal of ${original.entryNumber}`,
        createdByUserId: userId,
      },
      original.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        memo: `Reversal`,
      }))
    );

    await db
      .update(ledgerEntries)
      .set({ isReversed: 1, reversedByEntryId: reversalEntry.id })
      .where(eq(ledgerEntries.id, entryId));

    return reversalEntry;
  }

  async getAccountBalance(accountId: number, asOfDate?: Date): Promise<{ debit: number; credit: number; balance: number }> {
    let lines = await db.select().from(ledgerLines).where(eq(ledgerLines.accountId, accountId));

    if (asOfDate) {
      const entryIds = new Set(lines.map((l) => l.entryId));
      const entries = await db.select().from(ledgerEntries).where(inArray(ledgerEntries.id, Array.from(entryIds)));
      const validEntryIds = new Set(entries.filter((e) => e.entryDate <= asOfDate).map((e) => e.id));
      lines = lines.filter((l) => validEntryIds.has(l.entryId));
    }

    const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debit || "0"), 0);
    const totalCredit = lines.reduce((sum, l) => sum + parseFloat(l.credit || "0"), 0);

    return { debit: totalDebit, credit: totalCredit, balance: totalDebit - totalCredit };
  }

  // =====================================================
  // UTILITY METERS MODULE
  // =====================================================

  async getAllMetersForUser(userId: number): Promise<(UtilityMeter & { propertyName?: string; assignedOwner?: Owner | null; assignedTenant?: Tenant | null })[]> {
    const userProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 0)));
    
    const collaboratedPropertyIds = await db
      .select({ propertyId: propertyCollaborators.propertyId })
      .from(propertyCollaborators)
      .where(eq(propertyCollaborators.userId, userId));
    
    const allPropertyIds = [
      ...userProperties.map(p => p.id),
      ...collaboratedPropertyIds.map(c => c.propertyId)
    ];
    
    if (allPropertyIds.length === 0) {
      return [];
    }
    
    const meters = await db
      .select()
      .from(utilityMeters)
      .where(inArray(utilityMeters.propertyId, allPropertyIds));
    
    const result: (UtilityMeter & { propertyName?: string; assignedOwner?: Owner | null; assignedTenant?: Tenant | null })[] = [];
    
    for (const meter of meters) {
      const [property] = await db.select({ name: properties.name }).from(properties).where(eq(properties.id, meter.propertyId));
      let assignedOwner: Owner | null = null;
      let assignedTenant: Tenant | null = null;
      
      if (meter.assignedToType === "OWNER" && meter.assignedToOwnerId) {
        const [owner] = await db.select().from(owners).where(eq(owners.id, meter.assignedToOwnerId));
        assignedOwner = owner || null;
      } else if (meter.assignedToType === "TENANT" && meter.assignedToTenantId) {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, meter.assignedToTenantId));
        assignedTenant = tenant || null;
      }
      
      result.push({
        ...meter,
        propertyName: property?.name,
        assignedOwner,
        assignedTenant,
      });
    }
    
    return result;
  }

  async getMetersByPropertyId(propertyId: number): Promise<UtilityMeter[]> {
    return db.select().from(utilityMeters).where(eq(utilityMeters.propertyId, propertyId));
  }

  async getMeterById(id: number): Promise<UtilityMeter | undefined> {
    const [meter] = await db.select().from(utilityMeters).where(eq(utilityMeters.id, id));
    return meter || undefined;
  }

  async createMeter(meter: InsertUtilityMeter): Promise<UtilityMeter> {
    const [newMeter] = await db.insert(utilityMeters).values(meter).returning();
    return newMeter;
  }

  async updateMeter(id: number, meter: Partial<InsertUtilityMeter>): Promise<UtilityMeter | undefined> {
    const [updated] = await db
      .update(utilityMeters)
      .set({ ...meter, updatedAt: new Date() })
      .where(eq(utilityMeters.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMeter(id: number): Promise<void> {
    await db.delete(utilityMeters).where(eq(utilityMeters.id, id));
  }

  async getReadingsByMeterId(meterId: number): Promise<MeterReading[]> {
    return db
      .select()
      .from(meterReadings)
      .where(eq(meterReadings.meterId, meterId))
      .orderBy(desc(meterReadings.readingDate));
  }

  async getReadingById(id: number): Promise<MeterReading | undefined> {
    const [reading] = await db.select().from(meterReadings).where(eq(meterReadings.id, id));
    return reading || undefined;
  }

  async createMeterReading(reading: InsertMeterReading & { recordedByUserId: number }): Promise<MeterReading> {
    let consumption = null;
    if (reading.previousReading) {
      consumption = String(parseFloat(reading.currentReading) - parseFloat(reading.previousReading));
    }
    const [newReading] = await db
      .insert(meterReadings)
      .values({ ...reading, consumption })
      .returning();
    return newReading;
  }

  async deleteMeterReading(id: number): Promise<void> {
    await db.delete(meterReadings).where(eq(meterReadings.id, id));
  }

  // =====================================================
  // METER ASSIGNMENT MODULE
  // =====================================================

  async getMeterAssignmentHistory(meterId: number): Promise<MeterAssignmentHistory[]> {
    return db
      .select()
      .from(meterAssignmentHistory)
      .where(eq(meterAssignmentHistory.meterId, meterId))
      .orderBy(desc(meterAssignmentHistory.transferDate));
  }

  async getMetersWithAssignmentsByPropertyId(propertyId: number): Promise<(UtilityMeter & { assignedOwner?: Owner | null; assignedTenant?: Tenant | null })[]> {
    const meters = await db.select().from(utilityMeters).where(eq(utilityMeters.propertyId, propertyId));
    
    const metersWithAssignments = await Promise.all(
      meters.map(async (meter) => {
        let assignedOwner = null;
        let assignedTenant = null;
        
        if (meter.assignedToType === "OWNER" && meter.assignedToOwnerId) {
          const [owner] = await db.select().from(owners).where(eq(owners.id, meter.assignedToOwnerId));
          assignedOwner = owner || null;
        } else if (meter.assignedToType === "TENANT" && meter.assignedToTenantId) {
          const [tenant] = await db.select().from(tenants).where(eq(tenants.id, meter.assignedToTenantId));
          assignedTenant = tenant || null;
        }
        
        return { ...meter, assignedOwner, assignedTenant };
      })
    );
    
    return metersWithAssignments;
  }

  async getOutstandingBillsForMeter(meterId: number): Promise<UtilityBill[]> {
    return db
      .select()
      .from(utilityBills)
      .where(
        and(
          eq(utilityBills.meterId, meterId),
          inArray(utilityBills.status, ["PENDING", "OVERDUE", "PARTIALLY_PAID"])
        )
      )
      .orderBy(desc(utilityBills.dueDate));
  }

  async transferMeterAssignment(
    meterId: number,
    newAssigneeType: "OWNER" | "TENANT",
    newOwnerId: number | null,
    newTenantId: number | null,
    userId: number,
    options?: {
      leaseId?: number;
      finalMeterReading?: string;
      settlementAmount?: string;
      transferReason?: string;
      notes?: string;
    }
  ): Promise<{ meter: UtilityMeter; history: MeterAssignmentHistory }> {
    const meter = await this.getMeterById(meterId);
    if (!meter) {
      throw new Error("Meter not found");
    }

    const outstandingBills = await this.getOutstandingBillsForMeter(meterId);
    const hasOutstandingBills = outstandingBills.length > 0;

    const [history] = await db
      .insert(meterAssignmentHistory)
      .values({
        meterId,
        previousAssigneeType: meter.assignedToType,
        previousOwnerId: meter.assignedToOwnerId,
        previousTenantId: meter.assignedToTenantId,
        newAssigneeType,
        newOwnerId,
        newTenantId,
        leaseId: options?.leaseId,
        finalMeterReading: options?.finalMeterReading,
        outstandingBillsSettled: hasOutstandingBills ? 0 : 1,
        settlementAmount: options?.settlementAmount,
        transferReason: options?.transferReason,
        notes: options?.notes,
        recordedByUserId: userId,
      })
      .returning();

    const [updatedMeter] = await db
      .update(utilityMeters)
      .set({
        assignedToType: newAssigneeType,
        assignedToOwnerId: newOwnerId,
        assignedToTenantId: newTenantId,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(utilityMeters.id, meterId))
      .returning();

    return { meter: updatedMeter, history };
  }

  // =====================================================
  // UTILITY BILLS MODULE
  // =====================================================

  async getUtilityBillsByPropertyId(propertyId: number): Promise<UtilityBill[]> {
    return db
      .select()
      .from(utilityBills)
      .where(eq(utilityBills.propertyId, propertyId))
      .orderBy(desc(utilityBills.dueDate));
  }

  async getUtilityBillsByTenantId(tenantId: number): Promise<UtilityBill[]> {
    return db
      .select()
      .from(utilityBills)
      .where(eq(utilityBills.tenantId, tenantId))
      .orderBy(desc(utilityBills.dueDate));
  }

  async getUtilityBillById(id: number): Promise<UtilityBill | undefined> {
    const [bill] = await db.select().from(utilityBills).where(eq(utilityBills.id, id));
    return bill || undefined;
  }

  async createUtilityBill(bill: InsertUtilityBill & { recordedByUserId: number }): Promise<UtilityBill> {
    const [newBill] = await db.insert(utilityBills).values(bill).returning();
    return newBill;
  }

  async updateUtilityBill(id: number, bill: Partial<UtilityBill>): Promise<UtilityBill | undefined> {
    const [updated] = await db
      .update(utilityBills)
      .set({ ...bill, updatedAt: new Date() })
      .where(eq(utilityBills.id, id))
      .returning();
    return updated || undefined;
  }

  async forwardBillToTenant(id: number, tenantId: number): Promise<UtilityBill | undefined> {
    const [updated] = await db
      .update(utilityBills)
      .set({ 
        tenantId, 
        status: "FORWARDED", 
        forwardedToTenantAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(utilityBills.id, id))
      .returning();
    return updated || undefined;
  }

  async markBillAsPaid(id: number, amountPaid: string, paymentReference?: string, userId?: number): Promise<UtilityBill | undefined> {
    const bill = await this.getUtilityBillById(id);
    if (!bill) return undefined;

    const totalPaid = parseFloat(bill.amountPaid || "0") + parseFloat(amountPaid);
    const totalAmount = parseFloat(bill.totalAmount);
    const newStatus = totalPaid >= totalAmount ? "PAID" : "PARTIALLY_PAID";

    const [updated] = await db
      .update(utilityBills)
      .set({ 
        amountPaid: String(totalPaid),
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : bill.paidAt,
        paymentReference: paymentReference || bill.paymentReference,
        updatedAt: new Date() 
      })
      .where(eq(utilityBills.id, id))
      .returning();

    if (updated && userId) {
      const utilitiesExpenseAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "5100")).limit(1);
      const cashAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "1000")).limit(1);
      
      if (utilitiesExpenseAccount.length > 0 && cashAccount.length > 0) {
        await this.createLedgerEntry(
          {
            entryDate: new Date(),
            propertyId: bill.propertyId,
            module: "UTILITY",
            referenceId: bill.id,
            memo: `Utility bill payment - ${bill.utilityType}${paymentReference ? ` (Ref: ${paymentReference})` : ""}`,
            createdByUserId: userId,
          },
          [
            { accountId: utilitiesExpenseAccount[0].id, debit: amountPaid, credit: "0", memo: "Utility expense" },
            { accountId: cashAccount[0].id, debit: "0", credit: amountPaid, memo: "Cash payment" },
          ]
        );
      }
    }

    return updated || undefined;
  }

  async deleteUtilityBill(id: number): Promise<void> {
    await db.delete(utilityBills).where(eq(utilityBills.id, id));
  }

  async getPendingBillsByUserId(userId: number): Promise<UtilityBill[]> {
    const propertyIds = await this.getAccessiblePropertyIds(userId);
    
    if (propertyIds.length === 0) return [];
    
    return db
      .select()
      .from(utilityBills)
      .where(and(
        inArray(utilityBills.propertyId, propertyIds),
        or(eq(utilityBills.status, "PENDING"), eq(utilityBills.status, "FORWARDED"))
      ))
      .orderBy(utilityBills.dueDate);
  }

  // =====================================================
  // LOANS MODULE
  // =====================================================

  private async enrichLoan(loan: Loan): Promise<LoanWithSchedule> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, loan.ownerId));
    let property = null;
    if (loan.propertyId) {
      const [p] = await db.select().from(properties).where(eq(properties.id, loan.propertyId));
      property = p || null;
    }
    const schedule = await db
      .select()
      .from(loanSchedule)
      .where(eq(loanSchedule.loanId, loan.id))
      .orderBy(loanSchedule.periodNumber);
    const loanPaymentsList = await db
      .select()
      .from(loanPayments)
      .where(eq(loanPayments.loanId, loan.id))
      .orderBy(desc(loanPayments.paymentDate));
    return { ...loan, owner, property, schedule, payments: loanPaymentsList };
  }

  async getLoansByOwnerId(ownerId: number): Promise<LoanWithSchedule[]> {
    const loanList = await db
      .select()
      .from(loans)
      .where(eq(loans.ownerId, ownerId))
      .orderBy(desc(loans.createdAt));
    return Promise.all(loanList.map((l) => this.enrichLoan(l)));
  }

  async getLoanById(id: number): Promise<LoanWithSchedule | undefined> {
    const [loan] = await db.select().from(loans).where(eq(loans.id, id));
    if (!loan) return undefined;
    return this.enrichLoan(loan);
  }

  async createLoan(loan: InsertLoan & { createdByUserId: number }): Promise<Loan> {
    const endDate = new Date(loan.startDate);
    endDate.setMonth(endDate.getMonth() + loan.termMonths);

    const [newLoan] = await db
      .insert(loans)
      .values({ ...loan, endDate, outstandingBalance: loan.principal })
      .returning();
    return newLoan;
  }

  async updateLoan(id: number, loan: Partial<Loan>): Promise<Loan | undefined> {
    const [updated] = await db
      .update(loans)
      .set({ ...loan, updatedAt: new Date() })
      .where(eq(loans.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLoan(id: number): Promise<void> {
    await db.delete(loans).where(eq(loans.id, id));
  }

  async generateAmortizationSchedule(loanId: number): Promise<LoanScheduleEntry[]> {
    const loan = await this.getLoanById(loanId);
    if (!loan) return [];

    await db.delete(loanSchedule).where(eq(loanSchedule.loanId, loanId));

    const principal = parseFloat(loan.principal);
    const annualRate = parseFloat(loan.interestRate) / 100;
    const monthlyRate = annualRate / 12;
    const numPayments = loan.termMonths;

    const schedule: LoanScheduleEntry[] = [];
    let balance = principal;
    const monthlyPayment =
      loan.amortizationMethod === "REDUCING_BALANCE"
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)
        : principal / numPayments + balance * monthlyRate;

    for (let i = 1; i <= numPayments; i++) {
      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestDue = balance * monthlyRate;
      const principalDue =
        loan.amortizationMethod === "INTEREST_ONLY" && i < numPayments
          ? 0
          : loan.amortizationMethod === "REDUCING_BALANCE"
          ? monthlyPayment - interestDue
          : principal / numPayments;
      const totalDue = principalDue + interestDue;
      const closingBalance = balance - principalDue;

      const [entry] = await db
        .insert(loanSchedule)
        .values({
          loanId,
          periodNumber: i,
          dueDate,
          openingBalance: String(balance),
          principalDue: String(principalDue),
          interestDue: String(interestDue),
          totalDue: String(totalDue),
          closingBalance: String(Math.max(0, closingBalance)),
        })
        .returning();
      schedule.push(entry);
      balance = closingBalance;
    }

    return schedule;
  }

  async recordLoanPayment(payment: InsertLoanPayment & { recordedByUserId: number }): Promise<LoanPayment> {
    const [newPayment] = await db.insert(loanPayments).values(payment).returning();

    const loan = await this.getLoanById(payment.loanId);
    if (loan) {
      const newBalance =
        parseFloat(loan.outstandingBalance || "0") - parseFloat(payment.principalComponent);
      const newInterestPaid =
        parseFloat(loan.totalInterestPaid || "0") + parseFloat(payment.interestComponent);
      const newPrincipalPaid =
        parseFloat(loan.totalPrincipalPaid || "0") + parseFloat(payment.principalComponent);

      await db
        .update(loans)
        .set({
          outstandingBalance: String(Math.max(0, newBalance)),
          totalInterestPaid: String(newInterestPaid),
          totalPrincipalPaid: String(newPrincipalPaid),
          isActive: newBalance <= 0 ? 0 : 1,
          updatedAt: new Date(),
        })
        .where(eq(loans.id, payment.loanId));

      if (payment.scheduleId) {
        await db
          .update(loanSchedule)
          .set({ isPaid: 1, paidDate: payment.paymentDate })
          .where(eq(loanSchedule.id, payment.scheduleId));
      }

      const loansPayableAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "2200")).limit(1);
      const interestExpenseAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "5500")).limit(1);
      const cashAccount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "1000")).limit(1);

      if (loansPayableAccount.length > 0 && interestExpenseAccount.length > 0 && cashAccount.length > 0) {
        const totalPayment = parseFloat(payment.principalComponent) + parseFloat(payment.interestComponent);
        const lines: { accountId: number; debit: string; credit: string; memo?: string }[] = [];

        if (parseFloat(payment.principalComponent) > 0) {
          lines.push({ 
            accountId: loansPayableAccount[0].id, 
            debit: payment.principalComponent, 
            credit: "0", 
            memo: "Loan principal payment" 
          });
        }
        if (parseFloat(payment.interestComponent) > 0) {
          lines.push({ 
            accountId: interestExpenseAccount[0].id, 
            debit: payment.interestComponent, 
            credit: "0", 
            memo: "Loan interest payment" 
          });
        }
        lines.push({ 
          accountId: cashAccount[0].id, 
          debit: "0", 
          credit: String(totalPayment), 
          memo: "Cash payment" 
        });

        await this.createLedgerEntry(
          {
            entryDate: new Date(payment.paymentDate),
            propertyId: loan.propertyId,
            ownerId: loan.ownerId,
            module: "LOAN",
            referenceId: newPayment.id,
            memo: `Loan payment - ${loan.lenderName}`,
            createdByUserId: payment.recordedByUserId,
          },
          lines
        );
      }
    }

    return newPayment;
  }

  async getLoanPaymentsByLoanId(loanId: number): Promise<LoanPayment[]> {
    return db
      .select()
      .from(loanPayments)
      .where(eq(loanPayments.loanId, loanId))
      .orderBy(desc(loanPayments.paymentDate));
  }

  // =====================================================
  // ASSETS MODULE
  // =====================================================

  private async enrichAsset(asset: Asset): Promise<AssetWithDepreciation> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, asset.ownerId));
    let property = null;
    if (asset.propertyId) {
      const [p] = await db.select().from(properties).where(eq(properties.id, asset.propertyId));
      property = p || null;
    }
    const runs = await db
      .select()
      .from(depreciationRuns)
      .where(eq(depreciationRuns.assetId, asset.id))
      .orderBy(desc(depreciationRuns.periodEnd));
    return { ...asset, owner, property, depreciationRuns: runs };
  }

  async getAssetsByOwnerId(ownerId: number): Promise<AssetWithDepreciation[]> {
    const assetList = await db
      .select()
      .from(assets)
      .where(eq(assets.ownerId, ownerId))
      .orderBy(desc(assets.createdAt));
    return Promise.all(assetList.map((a) => this.enrichAsset(a)));
  }

  async getAssetsByPropertyId(propertyId: number): Promise<AssetWithDepreciation[]> {
    const assetList = await db
      .select()
      .from(assets)
      .where(eq(assets.propertyId, propertyId))
      .orderBy(desc(assets.createdAt));
    return Promise.all(assetList.map((a) => this.enrichAsset(a)));
  }

  async getAssetById(id: number): Promise<AssetWithDepreciation | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    if (!asset) return undefined;
    return this.enrichAsset(asset);
  }

  async createAsset(asset: InsertAsset & { createdByUserId: number }): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: number, asset: Partial<Asset>): Promise<Asset | undefined> {
    const [updated] = await db
      .update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updated || undefined;
  }

  async disposeAsset(id: number, disposalDate: Date, disposalAmount: number): Promise<Asset | undefined> {
    const [updated] = await db
      .update(assets)
      .set({
        status: "DISPOSED",
        disposalDate,
        disposalAmount: String(disposalAmount),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAsset(id: number): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id));
  }

  async getDepreciationRules(category?: string): Promise<DepreciationRule[]> {
    if (category) {
      return db
        .select()
        .from(depreciationRules)
        .where(eq(depreciationRules.assetCategory, category as any));
    }
    return db.select().from(depreciationRules);
  }

  async createDepreciationRule(rule: InsertDepreciationRule): Promise<DepreciationRule> {
    const [newRule] = await db.insert(depreciationRules).values(rule).returning();
    return newRule;
  }

  async runDepreciation(
    assetId: number,
    runType: string,
    periodStart: Date,
    periodEnd: Date,
    userId: number
  ): Promise<DepreciationRun> {
    const asset = await this.getAssetById(assetId);
    if (!asset) throw new Error("Asset not found");

    const cost = parseFloat(asset.cost);
    const salvage = parseFloat(asset.salvageValue || "0");
    const depreciableAmount = cost - salvage;
    const monthlyDepreciation = depreciableAmount / asset.usefulLifeMonths;

    const months =
      (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
      (periodEnd.getMonth() - periodStart.getMonth()) +
      1;
    const depreciationAmount = monthlyDepreciation * months;

    const currentAccumulated =
      runType === "BOOK"
        ? parseFloat(asset.bookAccumulatedDepreciation || "0")
        : parseFloat(asset.taxAccumulatedDepreciation || "0");
    const openingNBV = cost - currentAccumulated;
    const closingNBV = openingNBV - depreciationAmount;

    const [run] = await db
      .insert(depreciationRuns)
      .values({
        assetId,
        runType: runType as any,
        periodStart,
        periodEnd,
        depreciationAmount: String(depreciationAmount),
        openingNetBookValue: String(openingNBV),
        closingNetBookValue: String(Math.max(0, closingNBV)),
        createdByUserId: userId,
      })
      .returning();

    const newAccumulated = currentAccumulated + depreciationAmount;
    if (runType === "BOOK") {
      await db
        .update(assets)
        .set({
          bookAccumulatedDepreciation: String(newAccumulated),
          status: closingNBV <= 0 ? "FULLY_DEPRECIATED" : asset.status,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));
    } else {
      await db
        .update(assets)
        .set({ taxAccumulatedDepreciation: String(newAccumulated), updatedAt: new Date() })
        .where(eq(assets.id, assetId));
    }

    return run;
  }

  async getDepreciationRunsByAssetId(assetId: number): Promise<DepreciationRun[]> {
    return db
      .select()
      .from(depreciationRuns)
      .where(eq(depreciationRuns.assetId, assetId))
      .orderBy(desc(depreciationRuns.periodEnd));
  }

  // =====================================================
  // REPORTS MODULE
  // =====================================================

  async getPropertyPnLReport(
    userId: number,
    startDate: Date,
    endDate: Date,
    propertyId?: number
  ): Promise<PropertyPnLReport> {
    const propertyList = await this.getPropertiesByUserId(userId);
    const filteredProperties = propertyId
      ? propertyList.filter((p) => p.id === propertyId)
      : propertyList;

    const propertyEntries: PropertyPnLEntry[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const property of filteredProperties) {
      const entries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.propertyId, property.id),
            gte(ledgerEntries.entryDate, startDate),
            lte(ledgerEntries.entryDate, endDate),
            eq(ledgerEntries.isReversed, 0)
          )
        );

      let income = 0;
      let expenses = 0;
      const incomeBreakdown: { category: string; amount: number }[] = [];
      const expenseBreakdown: { category: string; amount: number }[] = [];

      for (const entry of entries) {
        const lines = await db
          .select()
          .from(ledgerLines)
          .where(eq(ledgerLines.entryId, entry.id));

        for (const line of lines) {
          const [account] = await db
            .select()
            .from(chartOfAccounts)
            .where(eq(chartOfAccounts.id, line.accountId));

          if (account) {
            const creditAmt = parseFloat(line.credit || "0");
            const debitAmt = parseFloat(line.debit || "0");

            if (account.accountType === "REVENUE") {
              const amt = creditAmt - debitAmt;
              income += amt;
              const existing = incomeBreakdown.find((i) => i.category === account.name);
              if (existing) existing.amount += amt;
              else incomeBreakdown.push({ category: account.name, amount: amt });
            } else if (account.accountType === "EXPENSE") {
              const amt = debitAmt - creditAmt;
              expenses += amt;
              const existing = expenseBreakdown.find((e) => e.category === account.name);
              if (existing) existing.amount += amt;
              else expenseBreakdown.push({ category: account.name, amount: amt });
            }
          }
        }
      }

      propertyEntries.push({
        propertyId: property.id,
        propertyName: property.name,
        income,
        expenses,
        netIncome: income - expenses,
        incomeBreakdown,
        expenseBreakdown,
      });

      totalIncome += income;
      totalExpenses += expenses;
    }

    return {
      startDate,
      endDate,
      properties: propertyEntries,
      totals: {
        income: totalIncome,
        expenses: totalExpenses,
        netIncome: totalIncome - totalExpenses,
      },
    };
  }

  async getOwnerPnLReport(
    userId: number,
    startDate: Date,
    endDate: Date,
    ownerId?: number
  ): Promise<OwnerPnLReport> {
    const ownerList = await this.getOwnersByUserId(userId);
    const filteredOwners = ownerId
      ? ownerList.filter((o) => o.id === ownerId)
      : ownerList;

    const ownerEntries: OwnerPnLEntry[] = [];
    let totalGrossIncome = 0;
    let totalExpenses = 0;

    for (const owner of filteredOwners) {
      const ownerWithProps = await this.getOwnerWithProperties(owner.id);
      if (!ownerWithProps) continue;

      const propertyData: { propertyId: number; propertyName: string; ownershipPercent: number }[] = [];
      let ownerGrossIncome = 0;
      let ownerExpenses = 0;

      for (const po of ownerWithProps.propertyOwnerships) {
        const ownershipPct = parseFloat(po.ownershipPercent) / 100;
        propertyData.push({
          propertyId: po.propertyId,
          propertyName: po.property.name,
          ownershipPercent: parseFloat(po.ownershipPercent),
        });

        const entries = await db
          .select()
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.propertyId, po.propertyId),
              gte(ledgerEntries.entryDate, startDate),
              lte(ledgerEntries.entryDate, endDate),
              eq(ledgerEntries.isReversed, 0)
            )
          );

        for (const entry of entries) {
          const lines = await db
            .select()
            .from(ledgerLines)
            .where(eq(ledgerLines.entryId, entry.id));

          for (const line of lines) {
            const [account] = await db
              .select()
              .from(chartOfAccounts)
              .where(eq(chartOfAccounts.id, line.accountId));

            if (account) {
              const creditAmt = parseFloat(line.credit || "0");
              const debitAmt = parseFloat(line.debit || "0");

              if (account.accountType === "REVENUE") {
                ownerGrossIncome += (creditAmt - debitAmt) * ownershipPct;
              } else if (account.accountType === "EXPENSE") {
                ownerExpenses += (debitAmt - creditAmt) * ownershipPct;
              }
            }
          }
        }
      }

      const avgOwnership =
        propertyData.length > 0
          ? propertyData.reduce((sum, p) => sum + p.ownershipPercent, 0) / propertyData.length
          : 0;

      ownerEntries.push({
        ownerId: owner.id,
        ownerName: owner.legalName,
        ownershipPercent: avgOwnership,
        properties: propertyData,
        grossIncome: ownerGrossIncome,
        ownerShare: ownerGrossIncome,
        expenses: ownerExpenses,
        netIncome: ownerGrossIncome - ownerExpenses,
      });

      totalGrossIncome += ownerGrossIncome;
      totalExpenses += ownerExpenses;
    }

    return {
      startDate,
      endDate,
      owners: ownerEntries,
      totals: {
        grossIncome: totalGrossIncome,
        expenses: totalExpenses,
        netIncome: totalGrossIncome - totalExpenses,
      },
    };
  }

  async getLoanScheduleReport(loanId: number): Promise<LoanScheduleReport> {
    const loan = await this.getLoanById(loanId);
    if (!loan) throw new Error("Loan not found");

    const schedule = loan.schedule || [];
    const paidPeriods = schedule.filter((s) => s.isPaid === 1).length;
    const remainingPeriods = schedule.length - paidPeriods;

    const totalInterest = schedule.reduce((sum, s) => sum + parseFloat(s.interestDue), 0);
    const totalPrincipal = schedule.reduce((sum, s) => sum + parseFloat(s.principalDue), 0);
    const totalPayments = totalInterest + totalPrincipal;

    const remainingBalance =
      schedule.length > 0
        ? parseFloat(schedule[schedule.length - 1].closingBalance)
        : parseFloat(loan.principal);

    return {
      loanId: loan.id,
      lenderName: loan.lenderName,
      principal: parseFloat(loan.principal),
      interestRate: parseFloat(loan.interestRate),
      termMonths: loan.termMonths,
      startDate: loan.startDate,
      schedule,
      summary: {
        totalPayments,
        totalInterest,
        totalPrincipal,
        remainingBalance: parseFloat(loan.outstandingBalance || loan.principal),
        paidPeriods,
        remainingPeriods,
      },
    };
  }

  async getLoansSummaryReport(userId: number): Promise<LoansSummaryReport> {
    const ownerList = await this.getOwnersByUserId(userId);
    const loanEntries: LoanSummaryEntry[] = [];
    let totalPrincipal = 0;
    let totalOutstanding = 0;
    let monthlyPayments = 0;

    for (const owner of ownerList) {
      const loanList = await this.getLoansByOwnerId(owner.id);
      for (const loan of loanList) {
        const principal = parseFloat(loan.principal);
        const outstanding = parseFloat(loan.outstandingBalance || loan.principal);
        totalPrincipal += principal;
        totalOutstanding += outstanding;

        const nextUnpaid = loan.schedule?.find((s) => s.isPaid === 0);
        const nextPaymentDate = nextUnpaid?.dueDate || null;
        const nextPaymentAmount = nextUnpaid ? parseFloat(nextUnpaid.totalDue) : null;

        if (nextPaymentAmount && loan.isActive === 1) {
          monthlyPayments += nextPaymentAmount;
        }

        let propertyName: string | null = null;
        if (loan.propertyId) {
          const [prop] = await db.select().from(properties).where(eq(properties.id, loan.propertyId));
          propertyName = prop?.name || null;
        }

        loanEntries.push({
          loanId: loan.id,
          lenderName: loan.lenderName,
          ownerName: owner.legalName,
          propertyName,
          principal,
          outstandingBalance: outstanding,
          interestRate: parseFloat(loan.interestRate),
          nextPaymentDate,
          nextPaymentAmount,
          status: loan.isActive === 1 ? "ACTIVE" : "PAID_OFF",
        });
      }
    }

    return {
      loans: loanEntries,
      totals: {
        totalPrincipal,
        totalOutstanding,
        monthlyPayments,
      },
    };
  }

  async getDepreciationReport(
    userId: number,
    asOfDate: Date,
    ownerId?: number,
    propertyId?: number
  ): Promise<DepreciationReportData> {
    const ownerList = await this.getOwnersByUserId(userId);
    const filteredOwners = ownerId ? ownerList.filter((o) => o.id === ownerId) : ownerList;

    const assetEntries: DepreciationAssetEntry[] = [];
    let totalCost = 0;
    let totalBookAccumulated = 0;
    let totalTaxAccumulated = 0;

    const yearStart = new Date(asOfDate.getFullYear(), 0, 1);

    for (const owner of filteredOwners) {
      let assetList = await this.getAssetsByOwnerId(owner.id);
      if (propertyId) {
        assetList = assetList.filter((a) => a.propertyId === propertyId);
      }

      for (const asset of assetList) {
        const cost = parseFloat(asset.cost);
        const salvage = parseFloat(asset.salvageValue || "0");
        const bookAccum = parseFloat(asset.bookAccumulatedDepreciation || "0");
        const taxAccum = parseFloat(asset.taxAccumulatedDepreciation || "0");

        const bookRuns = asset.depreciationRuns.filter(
          (r) => r.runType === "BOOK" && r.periodStart >= yearStart && r.periodEnd <= asOfDate
        );
        const taxRuns = asset.depreciationRuns.filter(
          (r) => r.runType === "TAX" && r.periodStart >= yearStart && r.periodEnd <= asOfDate
        );

        const bookYTD = bookRuns.reduce((sum, r) => sum + parseFloat(r.depreciationAmount), 0);
        const taxYTD = taxRuns.reduce((sum, r) => sum + parseFloat(r.depreciationAmount), 0);

        assetEntries.push({
          assetId: asset.id,
          assetName: asset.name,
          category: asset.assetCategory,
          ownerName: owner.legalName,
          propertyName: asset.property?.name || null,
          acquisitionDate: asset.acquisitionDate,
          cost,
          salvageValue: salvage,
          usefulLifeMonths: asset.usefulLifeMonths,
          bookMethod: asset.bookMethod,
          taxMethod: asset.taxMethod,
          bookAccumulatedDepreciation: bookAccum,
          taxAccumulatedDepreciation: taxAccum,
          bookNetValue: cost - bookAccum,
          taxNetValue: cost - taxAccum,
          bookDepreciationYTD: bookYTD,
          taxDepreciationYTD: taxYTD,
        });

        totalCost += cost;
        totalBookAccumulated += bookAccum;
        totalTaxAccumulated += taxAccum;
      }
    }

    return {
      asOfDate,
      assets: assetEntries,
      totals: {
        totalCost,
        totalBookAccumulated,
        totalTaxAccumulated,
        totalBookNetValue: totalCost - totalBookAccumulated,
        totalTaxNetValue: totalCost - totalTaxAccumulated,
      },
    };
  }

  async getDashboardSummary(userId: number): Promise<DashboardSummary> {
    const propertyList = await this.getPropertiesByUserId(userId);
    const totalProperties = propertyList.length;
    let occupiedUnits = 0;
    let vacantUnits = 0;

    for (const property of propertyList) {
      occupiedUnits += property.units.filter((u) => u.status === "OCCUPIED").length;
      vacantUnits += property.units.filter((u) => u.status === "VACANT").length;
    }

    const tenantList = await this.getTenantsByUserId(userId);
    const activeTenants = tenantList.filter((t) => t.isActive === 1).length;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const allLeases: any[] = [];
    for (const property of propertyList) {
      const propLeases = await this.getLeasesByPropertyId(property.id);
      allLeases.push(...propLeases);
    }

    const activeLeases = allLeases.filter((l) => l.status === "ACTIVE").length;
    const expiringSoon = allLeases.filter(
      (l) => l.status === "ACTIVE" && l.endDate <= thirtyDaysFromNow
    ).length;

    let monthlyRentDue = 0;
    let overdueAmount = 0;
    let receivedThisMonth = 0;

    for (const lease of allLeases.filter((l) => l.status === "ACTIVE")) {
      monthlyRentDue += parseFloat(lease.rentAmount);
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    for (const lease of allLeases) {
      const invoices = await this.getInvoicesByLeaseId(lease.id);
      for (const inv of invoices) {
        if (inv.status === "OVERDUE") {
          overdueAmount += parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid || "0");
        }
        if (inv.paidAt && inv.paidAt >= monthStart) {
          receivedThisMonth += parseFloat(inv.amountPaid || "0");
        }
      }
    }

    const ownerList = await this.getOwnersByUserId(userId);
    let totalLoans = 0;
    let loanOutstanding = 0;
    let totalAssets = 0;
    let assetsValue = 0;

    for (const owner of ownerList) {
      const loanList = await this.getLoansByOwnerId(owner.id);
      totalLoans += loanList.length;
      loanOutstanding += loanList.reduce(
        (sum, l) => sum + parseFloat(l.outstandingBalance || l.principal),
        0
      );

      const assetList = await this.getAssetsByOwnerId(owner.id);
      totalAssets += assetList.length;
      assetsValue += assetList.reduce(
        (sum, a) => sum + parseFloat(a.cost) - parseFloat(a.bookAccumulatedDepreciation || "0"),
        0
      );
    }

    return {
      properties: { total: totalProperties, occupied: occupiedUnits, vacant: vacantUnits },
      tenants: { total: tenantList.length, active: activeTenants },
      leases: { active: activeLeases, expiringSoon },
      financials: { monthlyRentDue, overdueAmount, receivedThisMonth },
      loans: { total: totalLoans, totalOutstanding: loanOutstanding },
      assets: { total: totalAssets, totalValue: assetsValue },
    };
  }

  // =====================================================
  // DOCUMENTS MODULE
  // =====================================================

  async getDocumentsByModule(module: string, moduleId: number): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(and(eq(documents.module, module as any), eq(documents.moduleId, moduleId)))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByPropertyId(propertyId: number): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(eq(documents.propertyId, propertyId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async getDocumentByShareToken(shareToken: string): Promise<Document | undefined> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.shareToken, shareToken), gte(documents.shareExpiresAt, new Date())));
    return doc || undefined;
  }

  async createDocument(doc: InsertDocument & { uploadedByUserId: number }): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async generateShareToken(documentId: number, expiresInHours: number = 24): Promise<string> {
    const token = `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    await db
      .update(documents)
      .set({ shareToken: token, shareExpiresAt: expiresAt })
      .where(eq(documents.id, documentId));
    return token;
  }

  // =====================================================
  // COMPLIANCE DOCUMENTS MODULE
  // =====================================================

  private computeComplianceStatus(doc: ComplianceDocument): ComplianceDocumentWithStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let computedStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_APPLICABLE" = "NOT_APPLICABLE";
    let daysUntilExpiry: number | null = null;
    
    if (doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const diffTime = expiryDate.getTime() - today.getTime();
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        computedStatus = "EXPIRED";
      } else if (daysUntilExpiry <= (doc.reminderDays || 30)) {
        computedStatus = "EXPIRING_SOON";
      } else {
        computedStatus = "ACTIVE";
      }
    }
    
    return { ...doc, computedStatus, daysUntilExpiry };
  }

  async getComplianceDocumentsByEntity(entityType: "OWNER" | "PROPERTY", entityId: number): Promise<ComplianceDocumentWithStatus[]> {
    const docs = await db
      .select()
      .from(complianceDocuments)
      .where(and(
        eq(complianceDocuments.entityType, entityType),
        eq(complianceDocuments.entityId, entityId)
      ))
      .orderBy(desc(complianceDocuments.createdAt));
    
    return docs.map(doc => this.computeComplianceStatus(doc));
  }

  async getComplianceDocumentsByUser(userId: number): Promise<ComplianceDocumentWithStatus[]> {
    const userOwners = await this.getOwnersByUserId(userId);
    const ownerIds = userOwners.map(o => o.id);
    
    const accessiblePropertyIds = await this.getAccessiblePropertyIds(userId);
    
    if (ownerIds.length === 0 && accessiblePropertyIds.length === 0) {
      return [];
    }
    
    const conditions = [];
    if (ownerIds.length > 0) {
      conditions.push(and(
        eq(complianceDocuments.entityType, "OWNER"),
        inArray(complianceDocuments.entityId, ownerIds)
      ));
    }
    if (accessiblePropertyIds.length > 0) {
      conditions.push(and(
        eq(complianceDocuments.entityType, "PROPERTY"),
        inArray(complianceDocuments.entityId, accessiblePropertyIds)
      ));
    }
    
    const docs = await db
      .select()
      .from(complianceDocuments)
      .where(or(...conditions))
      .orderBy(desc(complianceDocuments.createdAt));
    
    const result: ComplianceDocumentWithStatus[] = [];
    for (const doc of docs) {
      const withStatus = this.computeComplianceStatus(doc);
      if (doc.entityType === "OWNER") {
        const owner = userOwners.find(o => o.id === doc.entityId);
        withStatus.entityName = owner?.name || `Owner #${doc.entityId}`;
      } else if (doc.entityType === "PROPERTY") {
        const prop = await this.getPropertyById(doc.entityId);
        withStatus.entityName = prop?.name || `Property #${doc.entityId}`;
      }
      result.push(withStatus);
    }
    
    return result;
  }

  async getComplianceDocumentById(id: number): Promise<ComplianceDocumentWithStatus | undefined> {
    const [doc] = await db.select().from(complianceDocuments).where(eq(complianceDocuments.id, id));
    if (!doc) return undefined;
    return this.computeComplianceStatus(doc);
  }

  async getExpiringComplianceDocuments(userId: number, withinDays: number = 30): Promise<ComplianceDocumentWithStatus[]> {
    const allDocs = await this.getComplianceDocumentsByUser(userId);
    
    return allDocs.filter(doc => {
      if (doc.computedStatus === "EXPIRED") return true;
      if (doc.computedStatus === "EXPIRING_SOON") return true;
      if (doc.daysUntilExpiry !== null && doc.daysUntilExpiry <= withinDays) return true;
      return false;
    }).sort((a, b) => {
      if (a.daysUntilExpiry === null) return 1;
      if (b.daysUntilExpiry === null) return -1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }

  async createComplianceDocument(doc: InsertComplianceDocument & { createdByUserId: number }): Promise<ComplianceDocument> {
    const [newDoc] = await db.insert(complianceDocuments).values({
      ...doc,
      updatedAt: new Date(),
    }).returning();
    return newDoc;
  }

  async updateComplianceDocument(id: number, updates: Partial<InsertComplianceDocument>): Promise<ComplianceDocument | undefined> {
    const [updated] = await db
      .update(complianceDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceDocuments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteComplianceDocument(id: number): Promise<void> {
    await db.delete(complianceDocuments).where(eq(complianceDocuments.id, id));
  }

  // =====================================================
  // RBAC MANAGEMENT METHODS
  // =====================================================

  async getAllRoles(): Promise<RoleWithPermissions[]> {
    const allRoles = await db.select().from(roles).orderBy(roles.name);
    const result: RoleWithPermissions[] = [];
    
    for (const role of allRoles) {
      const perms = await db
        .select({ permission: permissions })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, role.id));
      
      result.push({
        ...role,
        permissions: perms.map(p => p.permission),
      });
    }
    
    return result;
  }

  async getRoleById(id: number): Promise<RoleWithPermissions | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) return undefined;
    
    const perms = await db
      .select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, role.id));
    
    return {
      ...role,
      permissions: perms.map(p => p.permission),
    };
  }

  async getAllPermissions(): Promise<Permission[]> {
    return db.select().from(permissions).orderBy(permissions.module, permissions.key);
  }

  async getPermissionsByModule(module: string): Promise<Permission[]> {
    return db.select().from(permissions).where(eq(permissions.module, module));
  }

  async getAllUsers(): Promise<UserWithRoles[]> {
    const allUsers = await db.select().from(users).orderBy(users.name);
    const result: UserWithRoles[] = [];
    
    for (const user of allUsers) {
      const assignments = await db
        .select()
        .from(userRoleAssignments)
        .where(eq(userRoleAssignments.userId, user.id));
      
      const rolesWithDetails: (UserRoleAssignment & { role: Role; property?: Property | null })[] = [];
      
      for (const assignment of assignments) {
        const [role] = await db.select().from(roles).where(eq(roles.id, assignment.roleId));
        let property = null;
        if (assignment.propertyId) {
          const [prop] = await db.select().from(properties).where(eq(properties.id, assignment.propertyId));
          property = prop || null;
        }
        rolesWithDetails.push({
          ...assignment,
          role,
          property,
        });
      }
      
      result.push({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        roles: rolesWithDetails,
      });
    }
    
    return result;
  }

  async getUserWithRoles(userId: number): Promise<UserWithRoles | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;
    
    const assignments = await db
      .select()
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.userId, userId));
    
    const rolesWithDetails: (UserRoleAssignment & { role: Role; property?: Property | null })[] = [];
    
    for (const assignment of assignments) {
      const [role] = await db.select().from(roles).where(eq(roles.id, assignment.roleId));
      let property = null;
      if (assignment.propertyId) {
        const [prop] = await db.select().from(properties).where(eq(properties.id, assignment.propertyId));
        property = prop || null;
      }
      rolesWithDetails.push({
        ...assignment,
        role,
        property,
      });
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      roles: rolesWithDetails,
    };
  }

  async createUserByAdmin(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    accountType?: string;
    organizationName?: string;
    organizationType?: string;
    createdByUserId: number;
  }): Promise<User> {
    const [newUser] = await db.insert(users).values({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      accountType: (userData.accountType as any) || "INDIVIDUAL",
      organizationName: userData.organizationName || "",
      organizationType: userData.organizationType || "",
      gstId: "",
      isSuperAdmin: 0,
      isActive: 1,
      createdByUserId: userData.createdByUserId,
    }).returning();
    return newUser;
  }

  async updateUserActiveStatus(userId: number, isActive: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async assignRoleToUser(userId: number, roleId: number, propertyId: number | null, assignedByUserId: number): Promise<UserRoleAssignment> {
    const existing = await db
      .select()
      .from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.roleId, roleId),
        propertyId ? eq(userRoleAssignments.propertyId, propertyId) : isNull(userRoleAssignments.propertyId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(userRoleAssignments)
        .set({ isActive: 1, updatedAt: new Date() })
        .where(eq(userRoleAssignments.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [assignment] = await db.insert(userRoleAssignments).values({
      userId,
      roleId,
      propertyId,
      assignedByUserId,
      isActive: 1,
    }).returning();
    return assignment;
  }

  async removeRoleFromUser(assignmentId: number): Promise<void> {
    await db.delete(userRoleAssignments).where(eq(userRoleAssignments.id, assignmentId));
  }

  async deactivateRoleAssignment(assignmentId: number): Promise<void> {
    await db
      .update(userRoleAssignments)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(eq(userRoleAssignments.id, assignmentId));
  }

  async getUserRoleAssignments(userId: number): Promise<UserRoleAssignment[]> {
    return db.select().from(userRoleAssignments).where(eq(userRoleAssignments.userId, userId));
  }

  // =====================================================
  // EXPENSES MODULE IMPLEMENTATION
  // =====================================================

  private async enrichExpenseWithDetails(expense: Expense): Promise<ExpenseWithDetails> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, expense.ownerId));
    let property = null;
    let unit = null;
    let maintenanceIssue = null;
    let maintenanceTask = null;
    let complianceDocument = null;

    if (expense.propertyId) {
      const [prop] = await db.select().from(properties).where(eq(properties.id, expense.propertyId));
      property = prop || null;
    }
    if (expense.unitId) {
      const [u] = await db.select().from(units).where(eq(units.id, expense.unitId));
      unit = u || null;
    }
    if (expense.maintenanceIssueId) {
      const [issue] = await db.select().from(maintenanceIssues).where(eq(maintenanceIssues.id, expense.maintenanceIssueId));
      maintenanceIssue = issue || null;
    }
    if (expense.maintenanceTaskId) {
      const [task] = await db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, expense.maintenanceTaskId));
      maintenanceTask = task || null;
    }
    if (expense.complianceDocumentId) {
      const [doc] = await db.select().from(complianceDocuments).where(eq(complianceDocuments.id, expense.complianceDocumentId));
      complianceDocument = doc || null;
    }

    return {
      ...expense,
      owner,
      property,
      unit,
      maintenanceIssue,
      maintenanceTask,
      complianceDocument,
    };
  }

  async getExpensesByOwnerId(ownerId: number): Promise<ExpenseWithDetails[]> {
    const expenseList = await db.select().from(expenses).where(eq(expenses.ownerId, ownerId)).orderBy(desc(expenses.expenseDate));
    return Promise.all(expenseList.map(e => this.enrichExpenseWithDetails(e)));
  }

  async getExpensesByPropertyId(propertyId: number): Promise<ExpenseWithDetails[]> {
    const expenseList = await db.select().from(expenses).where(eq(expenses.propertyId, propertyId)).orderBy(desc(expenses.expenseDate));
    return Promise.all(expenseList.map(e => this.enrichExpenseWithDetails(e)));
  }

  async getExpensesByUser(userId: number): Promise<ExpenseWithDetails[]> {
    // Get all property IDs the user has access to via RBAC
    const accessiblePropertyIds = await this.getAccessiblePropertyIds(userId);
    
    // Get expenses for accessible properties (including those with null propertyId if user owns the related owner entity)
    const userOwners = await db.select().from(owners).where(eq(owners.userId, userId));
    const userOwnerIds = userOwners.map(o => o.id);
    
    let expenseList: Expense[] = [];
    
    if (accessiblePropertyIds.length > 0 && userOwnerIds.length > 0) {
      // User has access to some properties and owns some entities - get expenses for either
      expenseList = await db.select().from(expenses).where(
        or(
          inArray(expenses.propertyId, accessiblePropertyIds),
          and(isNull(expenses.propertyId), inArray(expenses.ownerId, userOwnerIds))
        )
      ).orderBy(desc(expenses.expenseDate));
    } else if (accessiblePropertyIds.length > 0) {
      // User only has property access (e.g., super admin or RBAC role)
      expenseList = await db.select().from(expenses).where(
        inArray(expenses.propertyId, accessiblePropertyIds)
      ).orderBy(desc(expenses.expenseDate));
    } else if (userOwnerIds.length > 0) {
      // User only owns entities but no property access - get expenses for their owners
      expenseList = await db.select().from(expenses).where(
        inArray(expenses.ownerId, userOwnerIds)
      ).orderBy(desc(expenses.expenseDate));
    }
    
    return Promise.all(expenseList.map(e => this.enrichExpenseWithDetails(e)));
  }

  async getExpenseById(id: number): Promise<ExpenseWithDetails | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!expense) return undefined;
    return this.enrichExpenseWithDetails(expense);
  }

  async getExpensesByMaintenanceIssue(issueId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.maintenanceIssueId, issueId)).orderBy(desc(expenses.expenseDate));
  }

  async getExpensesByMaintenanceTask(taskId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.maintenanceTaskId, taskId)).orderBy(desc(expenses.expenseDate));
  }

  async getExpensesByComplianceDocument(docId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.complianceDocumentId, docId)).orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense & { createdByUserId: number }): Promise<Expense> {
    const [created] = await db.insert(expenses).values({
      ...expense,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateExpense(id: number, expenseData: Partial<Expense>): Promise<Expense | undefined> {
    // Fetch current expense to check for approval status change
    const [currentExpense] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!currentExpense) return undefined;

    const [updated] = await db
      .update(expenses)
      .set({ ...expenseData, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    
    if (!updated) return undefined;

    // Post to ledger when expense is approved (PENDING -> APPROVED)
    if (expenseData.approvalStatus === "APPROVED" && currentExpense.approvalStatus !== "APPROVED") {
      await this.postApprovedExpenseToLedger(updated);
    }

    return updated;
  }

  private getExpenseAccountCode(category: string): string {
    const categoryToAccountCode: Record<string, string> = {
      "MAINTENANCE": "5000",
      "REPAIRS": "5000",
      "UTILITIES": "5100",
      "INSURANCE": "5200",
      "PROPERTY_TAX": "5300",
      "PROFESSIONAL_FEES": "5600",
      "PROFESSIONAL_SERVICES": "5600",
      "LEGAL": "5600",
      "LEGAL_FEES": "5600",
      "DOCUMENT_FEES": "5600",
      "MANAGEMENT_FEES": "5600",
      "OFFICE_SUPPLIES": "5700",
      "TRAVEL": "5700",
      "MARKETING": "5700",
      "OTHER": "5700",
    };
    return categoryToAccountCode[category] || "5700";
  }

  private async postApprovedExpenseToLedger(expense: Expense): Promise<void> {
    // Check if this expense already has a ledger entry to prevent double-posting
    const existingEntries = await db.select().from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.module, "EXPENSE"),
        eq(ledgerEntries.referenceId, expense.id)
      ));
    
    // Only check for approval entries, not payment entries (which have different memo)
    const hasApprovalEntry = existingEntries.some(e => e.memo?.startsWith("Expense:"));
    if (hasApprovalEntry) {
      console.warn(`Expense ${expense.id} already has a ledger entry, skipping`);
      return;
    }

    const expenseAccountCode = this.getExpenseAccountCode(expense.category);
    const [expenseAccount] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, expenseAccountCode));
    const [accountsPayable] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "2000"));

    if (!expenseAccount || !accountsPayable) {
      console.warn("Could not find accounts for expense ledger posting");
      return;
    }

    const description = expense.description || `Expense #${expense.id}`;

    await this.createLedgerEntry(
      {
        entryDate: new Date(expense.expenseDate),
        propertyId: expense.propertyId || undefined,
        ownerId: expense.ownerId,
        module: "EXPENSE",
        referenceId: expense.id,
        memo: `Expense: ${description}`,
        createdByUserId: expense.createdByUserId,
      },
      [
        { accountId: expenseAccount.id, debit: expense.totalAmount, credit: "0", memo: description },
        { accountId: accountsPayable.id, debit: "0", credit: expense.totalAmount, memo: "Accounts payable" },
      ]
    );
  }

  async updateExpensePayment(
    id: number, 
    paymentStatus: string, 
    paymentMethod?: string, 
    paymentDate?: Date, 
    paymentReference?: string
  ): Promise<Expense | undefined> {
    // Fetch current expense to check for payment status change
    const [currentExpense] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!currentExpense) return undefined;

    const updateData: Partial<Expense> = {
      paymentStatus: paymentStatus as any,
      updatedAt: new Date(),
    };
    if (paymentMethod) updateData.paymentMethod = paymentMethod as any;
    if (paymentDate) updateData.paymentDate = paymentDate;
    if (paymentReference) updateData.paymentReference = paymentReference;

    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();
    
    if (!updated) return undefined;

    // Post payment to ledger when expense payment status changes to PAID
    // Only post if expense was previously approved
    if (paymentStatus === "PAID" && currentExpense.paymentStatus !== "PAID" && currentExpense.approvalStatus === "APPROVED") {
      await this.postExpensePaymentToLedger(updated, paymentDate || new Date());
    }

    return updated;
  }

  private async postExpensePaymentToLedger(expense: Expense, paymentDate: Date): Promise<void> {
    // Check if this expense already has a payment ledger entry to prevent double-posting
    const existingEntries = await db.select().from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.module, "EXPENSE"),
        eq(ledgerEntries.referenceId, expense.id)
      ));
    
    const hasPaymentEntry = existingEntries.some(e => e.memo?.startsWith("Payment:"));
    if (hasPaymentEntry) {
      console.warn(`Expense ${expense.id} already has a payment ledger entry, skipping`);
      return;
    }

    const [accountsPayable] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "2000"));
    const [cashAccount] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, "1000"));

    if (!accountsPayable || !cashAccount) {
      console.warn("Could not find accounts for expense payment ledger posting");
      return;
    }

    const description = expense.description || `Expense #${expense.id}`;

    await this.createLedgerEntry(
      {
        entryDate: paymentDate,
        propertyId: expense.propertyId || undefined,
        ownerId: expense.ownerId,
        module: "EXPENSE",
        referenceId: expense.id,
        memo: `Payment: ${description}`,
        createdByUserId: expense.createdByUserId,
      },
      [
        { accountId: accountsPayable.id, debit: expense.totalAmount, credit: "0", memo: "Clear accounts payable" },
        { accountId: cashAccount.id, debit: "0", credit: expense.totalAmount, memo: "Cash payment" },
      ]
    );
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getExpenseSummaryByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<{ category: string; total: number; count: number }[]> {
    let query = db.select({
      category: expenses.category,
      total: sql<number>`COALESCE(SUM(CAST(${expenses.totalAmount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(expenses).where(eq(expenses.ownerId, ownerId));
    
    if (startDate) {
      query = query.where(gte(expenses.expenseDate, startDate)) as any;
    }
    if (endDate) {
      query = query.where(lte(expenses.expenseDate, endDate)) as any;
    }
    
    const result = await (query as any).groupBy(expenses.category);
    return result.map((r: any) => ({
      category: r.category,
      total: Number(r.total),
      count: Number(r.count),
    }));
  }

  async getExpenseSummaryByProperty(propertyId: number, startDate?: Date, endDate?: Date): Promise<{ category: string; total: number; count: number }[]> {
    let query = db.select({
      category: expenses.category,
      total: sql<number>`COALESCE(SUM(CAST(${expenses.totalAmount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(expenses).where(eq(expenses.propertyId, propertyId));
    
    if (startDate) {
      query = query.where(gte(expenses.expenseDate, startDate)) as any;
    }
    if (endDate) {
      query = query.where(lte(expenses.expenseDate, endDate)) as any;
    }
    
    const result = await (query as any).groupBy(expenses.category);
    return result.map((r: any) => ({
      category: r.category,
      total: Number(r.total),
      count: Number(r.count),
    }));
  }

  // =====================================================
  // DASHBOARD LAYOUTS MODULE
  // =====================================================

  async getDashboardLayoutById(id: number): Promise<DashboardLayout | undefined> {
    const [layout] = await db.select().from(dashboardLayouts).where(eq(dashboardLayouts.id, id));
    return layout || undefined;
  }

  async getDashboardLayoutsByRole(roleId: number): Promise<DashboardLayout[]> {
    return db.select().from(dashboardLayouts).where(
      and(eq(dashboardLayouts.scope, "ROLE"), eq(dashboardLayouts.roleId, roleId))
    );
  }

  async getDashboardLayoutByUser(userId: number): Promise<DashboardLayout | undefined> {
    const [layout] = await db.select().from(dashboardLayouts).where(
      and(eq(dashboardLayouts.scope, "USER"), eq(dashboardLayouts.userId, userId))
    );
    return layout || undefined;
  }

  async getDefaultLayoutForRole(roleId: number): Promise<DashboardLayout | undefined> {
    const [layout] = await db.select().from(dashboardLayouts).where(
      and(
        eq(dashboardLayouts.scope, "ROLE"),
        eq(dashboardLayouts.roleId, roleId),
        eq(dashboardLayouts.isDefault, 1)
      )
    );
    return layout || undefined;
  }

  async getAllDashboardLayouts(): Promise<DashboardLayout[]> {
    return db.select().from(dashboardLayouts).orderBy(desc(dashboardLayouts.createdAt));
  }

  async createDashboardLayout(layout: InsertDashboardLayout): Promise<DashboardLayout> {
    const [created] = await db.insert(dashboardLayouts).values({
      name: layout.name,
      scope: layout.scope,
      roleId: layout.roleId || null,
      userId: layout.userId || null,
      widgets: layout.widgets,
      isDefault: layout.isDefault || 0,
      createdByUserId: layout.createdByUserId || null,
    }).returning();
    return created;
  }

  async updateDashboardLayout(id: number, layout: Partial<InsertDashboardLayout>): Promise<DashboardLayout | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (layout.name !== undefined) updateData.name = layout.name;
    if (layout.widgets !== undefined) updateData.widgets = layout.widgets;
    if (layout.isDefault !== undefined) updateData.isDefault = layout.isDefault;

    const [updated] = await db.update(dashboardLayouts)
      .set(updateData)
      .where(eq(dashboardLayouts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDashboardLayout(id: number): Promise<void> {
    await db.delete(dashboardLayouts).where(eq(dashboardLayouts.id, id));
  }

  async getUserPrimaryRoleId(userId: number): Promise<number | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user?.isSuperAdmin === 1) {
      const [superAdminRole] = await db.select().from(roles).where(eq(roles.name, "SUPER_ADMIN"));
      return superAdminRole?.id;
    }

    const [assignment] = await db.select()
      .from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, userId),
        eq(userRoleAssignments.isActive, 1)
      ))
      .orderBy(desc(userRoleAssignments.createdAt));

    return assignment?.roleId;
  }

  // =====================================================
  // EXCHANGE RATES MODULE
  // =====================================================

  async getAllExchangeRates(): Promise<ExchangeRate[]> {
    return db.select().from(exchangeRates).orderBy(desc(exchangeRates.effectiveDate));
  }

  async getActiveExchangeRates(): Promise<ExchangeRate[]> {
    return db.select()
      .from(exchangeRates)
      .where(eq(exchangeRates.isActive, 1))
      .orderBy(desc(exchangeRates.effectiveDate));
  }

  async getExchangeRateById(id: number): Promise<ExchangeRate | undefined> {
    const [rate] = await db.select().from(exchangeRates).where(eq(exchangeRates.id, id));
    return rate || undefined;
  }

  async getExchangeRate(baseCurrency: string, quoteCurrency: string, date?: Date): Promise<ExchangeRate | undefined> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const [rate] = await db.select()
      .from(exchangeRates)
      .where(and(
        eq(exchangeRates.baseCurrency, baseCurrency as any),
        eq(exchangeRates.quoteCurrency, quoteCurrency as any),
        eq(exchangeRates.isActive, 1),
        lte(exchangeRates.effectiveDate, dateStr)
      ))
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1);
    
    return rate || undefined;
  }

  async createExchangeRate(rate: InsertExchangeRate & { createdByUserId: number }): Promise<ExchangeRate> {
    const [created] = await db.insert(exchangeRates).values({
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rate: rate.rate,
      effectiveDate: rate.effectiveDate,
      source: rate.source || "MANUAL",
      isActive: rate.isActive ?? 1,
      createdByUserId: rate.createdByUserId,
    }).returning();
    return created;
  }

  async updateExchangeRate(id: number, rate: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (rate.rate !== undefined) updateData.rate = rate.rate;
    if (rate.effectiveDate !== undefined) updateData.effectiveDate = rate.effectiveDate;
    if (rate.source !== undefined) updateData.source = rate.source;
    if (rate.isActive !== undefined) updateData.isActive = rate.isActive;

    const [updated] = await db.update(exchangeRates)
      .set(updateData)
      .where(eq(exchangeRates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExchangeRate(id: number): Promise<void> {
    await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
  }

  async convertAmount(amount: number, fromCurrency: string, toCurrency: string, date?: Date): Promise<{ convertedAmount: number; rate: number } | undefined> {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1 };
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    if (exchangeRate) {
      const rate = parseFloat(exchangeRate.rate);
      return { convertedAmount: amount * rate, rate };
    }

    const reverseRate = await this.getExchangeRate(toCurrency, fromCurrency, date);
    if (reverseRate) {
      const rate = 1 / parseFloat(reverseRate.rate);
      return { convertedAmount: amount * rate, rate };
    }

    return undefined;
  }

  // =====================================================
  // INVENTORY MODULE IMPLEMENTATIONS
  // =====================================================

  async getAllInventoryCategories(): Promise<InventoryCategory[]> {
    return db.select().from(inventoryCategories).orderBy(inventoryCategories.sortOrder);
  }

  async getInventoryCategoryById(id: number): Promise<InventoryCategory | undefined> {
    const [category] = await db.select().from(inventoryCategories).where(eq(inventoryCategories.id, id));
    return category || undefined;
  }

  async getInventoryCategoriesTree(): Promise<InventoryCategoryWithChildren[]> {
    const allCategories = await this.getAllInventoryCategories();
    
    const buildTree = (parentId: number | null): InventoryCategoryWithChildren[] => {
      return allCategories
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id)
        }));
    };
    
    return buildTree(null);
  }

  async createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory> {
    const [created] = await db.insert(inventoryCategories).values(category).returning();
    return created;
  }

  async updateInventoryCategory(id: number, category: Partial<InsertInventoryCategory>): Promise<InventoryCategory | undefined> {
    const updateData: any = { ...category, updatedAt: new Date() };
    const [updated] = await db.update(inventoryCategories)
      .set(updateData)
      .where(eq(inventoryCategories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInventoryCategory(id: number): Promise<void> {
    await db.delete(inventoryCategories).where(eq(inventoryCategories.id, id));
  }

  // Warehouse Locations
  async getAllWarehouseLocations(): Promise<WarehouseLocation[]> {
    return db.select().from(warehouseLocations).orderBy(warehouseLocations.name);
  }

  async getWarehouseLocationById(id: number): Promise<WarehouseLocation | undefined> {
    const [location] = await db.select().from(warehouseLocations).where(eq(warehouseLocations.id, id));
    return location || undefined;
  }

  async createWarehouseLocation(location: InsertWarehouseLocation): Promise<WarehouseLocation> {
    const [created] = await db.insert(warehouseLocations).values(location).returning();
    return created;
  }

  async updateWarehouseLocation(id: number, location: Partial<InsertWarehouseLocation>): Promise<WarehouseLocation | undefined> {
    const updateData: any = { ...location, updatedAt: new Date() };
    const [updated] = await db.update(warehouseLocations)
      .set(updateData)
      .where(eq(warehouseLocations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWarehouseLocation(id: number): Promise<void> {
    await db.delete(warehouseLocations).where(eq(warehouseLocations.id, id));
  }

  // Inventory Items
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async getInventoryItemWithDetails(id: number): Promise<InventoryItemWithDetails | undefined> {
    const item = await this.getInventoryItemById(id);
    if (!item) return undefined;

    const category = item.categoryId ? await this.getInventoryCategoryById(item.categoryId) : undefined;
    const warehouse = item.warehouseId ? await this.getWarehouseLocationById(item.warehouseId) : undefined;
    const property = item.propertyId ? await this.getPropertyById(item.propertyId) : undefined;
    const tenant = item.tenantId ? await this.getTenantById(item.tenantId) : undefined;
    const movements = await this.getInventoryMovementsByItem(id);
    
    return {
      ...item,
      category,
      warehouse,
      property,
      tenant,
      movements
    };
  }

  async getInventoryItemsByProperty(propertyId: number): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.propertyId, propertyId));
  }

  async getInventoryItemsByWarehouse(warehouseId: number): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.warehouseId, warehouseId));
  }

  async getInventoryItemsByCategory(categoryId: number): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.categoryId, categoryId));
  }

  async createInventoryItem(item: InsertInventoryItem & { createdByUserId: number }): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values({
      ...item,
      createdByUserId: item.createdByUserId
    }).returning();
    return created;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const updateData: any = { ...item, updatedAt: new Date() };
    const [updated] = await db.update(inventoryItems)
      .set(updateData)
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  // Inventory Movements
  async getInventoryMovementsByItem(itemId: number): Promise<InventoryMovement[]> {
    return db.select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.itemId, itemId))
      .orderBy(desc(inventoryMovements.performedAt));
  }

  async createInventoryMovement(movement: InsertInventoryMovement & { performedByUserId: number }): Promise<InventoryMovement> {
    const [created] = await db.insert(inventoryMovements).values({
      ...movement,
      performedByUserId: movement.performedByUserId,
      performedAt: new Date()
    }).returning();
    return created;
  }

  async issueInventoryItem(itemId: number, data: { propertyId?: number; unitId?: number; tenantId?: number; quantity: number; notes?: string; performedByUserId: number }): Promise<InventoryMovement> {
    const item = await this.getInventoryItemById(itemId);
    if (!item) throw new Error('Item not found');

    // Update item assignment
    await this.updateInventoryItem(itemId, {
      status: 'ASSIGNED',
      propertyId: data.propertyId,
      unitId: data.unitId,
      tenantId: data.tenantId,
      assignedAt: new Date()
    } as any);

    // Create movement record
    return this.createInventoryMovement({
      itemId,
      movementType: 'ISSUED',
      quantity: data.quantity,
      fromWarehouseId: item.warehouseId,
      toPropertyId: data.propertyId,
      toUnitId: data.unitId,
      toTenantId: data.tenantId,
      notes: data.notes,
      performedByUserId: data.performedByUserId
    });
  }

  async returnInventoryItem(itemId: number, data: { warehouseId?: number; quantity: number; conditionAfter?: string; damageNotes?: string; notes?: string; performedByUserId: number }): Promise<InventoryMovement> {
    const item = await this.getInventoryItemById(itemId);
    if (!item) throw new Error('Item not found');

    // Determine new status based on condition
    const newStatus = data.damageNotes ? 'DAMAGED' : 'AVAILABLE';

    // Update item status
    await this.updateInventoryItem(itemId, {
      status: newStatus,
      warehouseId: data.warehouseId || item.warehouseId,
      propertyId: null,
      unitId: null,
      tenantId: null,
      assignedAt: null
    } as any);

    // Create movement record
    return this.createInventoryMovement({
      itemId,
      movementType: 'RETURNED',
      quantity: data.quantity,
      fromPropertyId: item.propertyId,
      toWarehouseId: data.warehouseId || item.warehouseId,
      conditionAfter: data.conditionAfter,
      damageNotes: data.damageNotes,
      notes: data.notes,
      performedByUserId: data.performedByUserId
    });
  }

  // =====================================================
  // ONBOARDING MODULE IMPLEMENTATIONS
  // =====================================================

  async getAllOnboardingProcesses(): Promise<OnboardingProcess[]> {
    return db.select().from(onboardingProcesses).orderBy(desc(onboardingProcesses.createdAt));
  }

  async getOnboardingProcessById(id: number): Promise<OnboardingProcess | undefined> {
    const [process] = await db.select().from(onboardingProcesses).where(eq(onboardingProcesses.id, id));
    return process || undefined;
  }

  async getOnboardingProcessWithDetails(id: number): Promise<OnboardingProcessWithDetails | undefined> {
    const process = await this.getOnboardingProcessById(id);
    if (!process) return undefined;

    const lease = await this.getLeaseById(process.leaseId);
    const tenant = await this.getTenantById(process.tenantId);
    const property = await this.getPropertyById(process.propertyId);
    const unit = process.unitId ? await this.getUnitById(process.unitId) : null;
    const checklistItems = await this.getChecklistItemsByOnboarding(id);
    const handoverItemsRaw = await this.getHandoverItemsByOnboarding(id);
    const createdBy = await this.getUser(process.createdByUserId);

    if (!lease || !tenant || !property || !createdBy) return undefined;

    const handoverItemsWithDetails = await Promise.all(
      handoverItemsRaw.map(async (hi) => {
        const inventoryItem = await this.getInventoryItemById(hi.inventoryItemId);
        return { ...hi, inventoryItem: inventoryItem! };
      })
    );

    return {
      ...process,
      lease,
      tenant,
      property,
      unit,
      checklistItems,
      handoverItems: handoverItemsWithDetails,
      createdBy
    };
  }

  async getOnboardingProcessByLease(leaseId: number): Promise<OnboardingProcess | undefined> {
    const [process] = await db.select().from(onboardingProcesses)
      .where(eq(onboardingProcesses.leaseId, leaseId));
    return process || undefined;
  }

  async getOnboardingProcessesByTenant(tenantId: number): Promise<OnboardingProcess[]> {
    return db.select().from(onboardingProcesses)
      .where(eq(onboardingProcesses.tenantId, tenantId))
      .orderBy(desc(onboardingProcesses.createdAt));
  }

  async getOnboardingProcessesByProperty(propertyId: number): Promise<OnboardingProcess[]> {
    return db.select().from(onboardingProcesses)
      .where(eq(onboardingProcesses.propertyId, propertyId))
      .orderBy(desc(onboardingProcesses.createdAt));
  }

  async createOnboardingProcess(process: InsertOnboardingProcess & { createdByUserId: number }): Promise<OnboardingProcess> {
    const [created] = await db.insert(onboardingProcesses).values(process).returning();
    return created;
  }

  async updateOnboardingProcess(id: number, data: Partial<InsertOnboardingProcess>): Promise<OnboardingProcess | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    const [updated] = await db.update(onboardingProcesses)
      .set(updateData)
      .where(eq(onboardingProcesses.id, id))
      .returning();
    return updated || undefined;
  }

  async updateOnboardingStage(id: number, stage: string, timestamp: Date): Promise<OnboardingProcess | undefined> {
    const stageFieldMap: Record<string, string> = {
      'CONTRACT_SIGNED': 'contractSignedAt',
      'DEPOSIT_PAID': 'depositPaidAt',
      'INSPECTION_SCHEDULED': 'inspectionScheduledAt',
      'INSPECTION_COMPLETED': 'inspectionCompletedAt',
      'HANDOVER_SCHEDULED': 'handoverScheduledAt',
      'HANDOVER_COMPLETED': 'handoverCompletedAt',
      'MOVE_IN_COMPLETED': 'moveInCompletedAt'
    };

    const timestampField = stageFieldMap[stage];
    if (!timestampField) throw new Error('Invalid stage');

    const updateData: any = {
      currentStage: stage,
      status: stage === 'MOVE_IN_COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      [timestampField]: timestamp,
      updatedAt: new Date()
    };

    const [updated] = await db.update(onboardingProcesses)
      .set(updateData)
      .where(eq(onboardingProcesses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOnboardingProcess(id: number): Promise<void> {
    await db.delete(onboardingProcesses).where(eq(onboardingProcesses.id, id));
  }

  // Condition Checklist Items
  async getChecklistItemsByOnboarding(onboardingId: number): Promise<ConditionChecklistItem[]> {
    return db.select().from(conditionChecklistItems)
      .where(eq(conditionChecklistItems.onboardingId, onboardingId))
      .orderBy(conditionChecklistItems.roomType);
  }

  async getChecklistItemById(id: number): Promise<ConditionChecklistItem | undefined> {
    const [item] = await db.select().from(conditionChecklistItems)
      .where(eq(conditionChecklistItems.id, id));
    return item || undefined;
  }

  async createChecklistItem(item: InsertConditionChecklistItem & { inspectedByUserId: number }): Promise<ConditionChecklistItem> {
    const [created] = await db.insert(conditionChecklistItems).values(item).returning();
    return created;
  }

  async updateChecklistItem(id: number, data: Partial<InsertConditionChecklistItem>): Promise<ConditionChecklistItem | undefined> {
    const [updated] = await db.update(conditionChecklistItems)
      .set(data)
      .where(eq(conditionChecklistItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteChecklistItem(id: number): Promise<void> {
    await db.delete(conditionChecklistItems).where(eq(conditionChecklistItems.id, id));
  }

  // Handover Items
  async getHandoverItemsByOnboarding(onboardingId: number): Promise<HandoverItem[]> {
    return db.select().from(handoverItems)
      .where(eq(handoverItems.onboardingId, onboardingId));
  }

  async getHandoverItemById(id: number): Promise<HandoverItem | undefined> {
    const [item] = await db.select().from(handoverItems)
      .where(eq(handoverItems.id, id));
    return item || undefined;
  }

  async createHandoverItem(item: InsertHandoverItem & { handedOverByUserId: number }): Promise<HandoverItem> {
    const [created] = await db.insert(handoverItems).values(item).returning();
    return created;
  }

  async updateHandoverItem(id: number, data: Partial<InsertHandoverItem>): Promise<HandoverItem | undefined> {
    const [updated] = await db.update(handoverItems)
      .set(data)
      .where(eq(handoverItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteHandoverItem(id: number): Promise<void> {
    await db.delete(handoverItems).where(eq(handoverItems.id, id));
  }
}

export const storage = new DatabaseStorage();
