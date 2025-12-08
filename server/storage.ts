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
  tenants,
  leases,
  rentInvoices,
  payments,
  chartOfAccounts,
  ledgerEntries,
  ledgerLines,
  utilityMeters,
  meterReadings,
  utilityBills,
  loans,
  loanSchedule,
  loanPayments,
  assets,
  depreciationRules,
  depreciationRuns,
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
  type OwnerWithProperties
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
  
  getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]>;
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
  createOwner(owner: InsertOwner & { createdByUserId: number }): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<void>;

  // Property Owners
  getPropertyOwnersByPropertyId(propertyId: number): Promise<(PropertyOwner & { owner: Owner })[]>;
  addPropertyOwner(data: InsertPropertyOwner): Promise<PropertyOwner>;
  updatePropertyOwner(id: number, data: Partial<InsertPropertyOwner>): Promise<PropertyOwner | undefined>;
  removePropertyOwner(id: number): Promise<void>;

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
  getLeasesByPropertyId(propertyId: number): Promise<LeaseWithDetails[]>;
  getLeasesByTenantId(tenantId: number): Promise<LeaseWithDetails[]>;
  getLeaseById(id: number): Promise<LeaseWithDetails | undefined>;
  getActiveLeasesByPropertyId(propertyId: number): Promise<LeaseWithDetails[]>;
  createLease(lease: InsertLease & { createdByUserId: number }): Promise<Lease>;
  updateLease(id: number, lease: Partial<Lease>): Promise<Lease | undefined>;
  updateLeaseStatus(id: number, status: string): Promise<Lease | undefined>;
  deleteLease(id: number): Promise<void>;

  // =====================================================
  // RENT INVOICES MODULE
  // =====================================================
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

  async getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]> {
    const propertyList = await db
      .select()
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 0)))
      .orderBy(desc(properties.createdAt));
    
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
    
    if (!property) {
      return { canAccess: false, role: null, isOwner: false };
    }
    
    if (property.ownerUserId === userId) {
      return { canAccess: true, role: 'OWNER', isOwner: true };
    }
    
    const role = await this.getCollaboratorRole(propertyId, userId);
    return { canAccess: role !== null, role, isOwner: false };
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
      .where(eq(owners.createdByUserId, userId))
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

  async createOwner(owner: InsertOwner & { createdByUserId: number }): Promise<Owner> {
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
  // TENANTS MODULE
  // =====================================================

  async getTenantsByUserId(userId: number): Promise<Tenant[]> {
    return db
      .select()
      .from(tenants)
      .where(eq(tenants.createdByUserId, userId))
      .orderBy(desc(tenants.createdAt));
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

  async markBillAsPaid(id: number, amountPaid: string, paymentReference?: string): Promise<UtilityBill | undefined> {
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
    return updated || undefined;
  }

  async deleteUtilityBill(id: number): Promise<void> {
    await db.delete(utilityBills).where(eq(utilityBills.id, id));
  }

  async getPendingBillsByUserId(userId: number): Promise<UtilityBill[]> {
    const userProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.ownerUserId, userId), eq(properties.isDeleted, 0)));
    
    if (userProperties.length === 0) return [];
    
    const propertyIds = userProperties.map(p => p.id);
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
          overdueAmount += parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount || "0");
        }
        if (inv.paidAt && inv.paidAt >= monthStart) {
          receivedThisMonth += parseFloat(inv.paidAmount || "0");
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
}

export const storage = new DatabaseStorage();
