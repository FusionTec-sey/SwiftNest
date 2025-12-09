import cron from "node-cron";
import { storage } from "./storage";
import { generateInvoicePDF } from "./pdf-service";

interface ScheduledJobResult {
  success: boolean;
  processedCount: number;
  errors: string[];
}

export const schedulerJobs = {
  dailyInvoiceGeneration: async (): Promise<ScheduledJobResult> => {
    const result: ScheduledJobResult = { success: true, processedCount: 0, errors: [] };
    try {
      const today = new Date();
      const activeLeases = await storage.getAllActiveLeasesForScheduler();
      
      for (const lease of activeLeases) {
        try {
          const shouldGenerate = shouldGenerateInvoice(lease, today);
          if (!shouldGenerate) continue;

          const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          const dueDate = new Date(today.getFullYear(), today.getMonth(), lease.paymentDueDay || 1);
          
          // Compare dates only (not timestamps) to avoid advancing the due date incorrectly
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          if (dueDateOnly < todayDateOnly) {
            dueDate.setMonth(dueDate.getMonth() + 1);
          }
          
          const invoiceNumber = `INV-${lease.id}-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}`;
          
          const existingInvoice = await storage.getInvoiceByInvoiceNumber(invoiceNumber);
          if (existingInvoice) {
            continue;
          }

          const invoice = await storage.createRentInvoice({
            leaseId: lease.id,
            invoiceNumber,
            periodStart,
            periodEnd,
            rentAmount: lease.rentAmount,
            utilityCharges: "0",
            maintenanceCharges: "0",
            lateFees: "0",
            otherCharges: "0",
            totalAmount: lease.rentAmount,
            dueDate,
            notes: null,
          });

          const property = await storage.getPropertyById(lease.propertyId);
          const tenant = await storage.getTenantById(lease.tenantId);
          
          if (property && tenant) {
            try {
              const pdfFileName = await generateInvoicePDF({ invoice, lease, property, tenant });
              const document = await storage.createDocumentForScheduler({
                documentType: "INVOICE",
                module: "LEASE",
                moduleId: lease.id,
                propertyId: lease.propertyId,
                fileName: pdfFileName,
                originalName: `Invoice_${invoiceNumber}.pdf`,
                fileSize: 0,
                mimeType: "application/pdf",
                storagePath: `uploads/documents/${pdfFileName}`,
              }, property.ownerUserId);
              await storage.updateRentInvoice(invoice.id, { invoiceDocumentId: document.id });
            } catch (pdfError) {
              console.error(`[Scheduler] PDF generation failed for invoice ${invoiceNumber}:`, pdfError);
            }
          }

          await storage.updateLease(lease.id, {
            nextInvoiceDate: new Date(today.getFullYear(), today.getMonth() + 1, lease.paymentDueDay || 1),
            lastInvoiceGeneratedAt: today,
          });

          result.processedCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`Lease ${lease.id}: ${message}`);
        }
      }
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(message);
    }
    return result;
  },

  dailyLateFeeCalculation: async (): Promise<ScheduledJobResult> => {
    const result: ScheduledJobResult = { success: true, processedCount: 0, errors: [] };
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      const today = new Date();

      for (const invoice of overdueInvoices) {
        try {
          const lease = await storage.getLeaseById(invoice.leaseId);
          if (!lease) continue;

          const lateFeePercent = parseFloat(lease.lateFeePercent || "0");
          const graceDays = lease.lateFeeGraceDays || 5;

          if (lateFeePercent <= 0) continue;

          const dueDate = new Date(invoice.dueDate);
          const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysPastDue <= graceDays) continue;

          const rentAmount = parseFloat(invoice.rentAmount);
          const calculatedLateFee = rentAmount * lateFeePercent / 100;
          const currentLateFee = parseFloat(invoice.lateFees || "0");

          if (calculatedLateFee > currentLateFee) {
            const newTotal =
              parseFloat(invoice.rentAmount) +
              parseFloat(invoice.utilityCharges || "0") +
              parseFloat(invoice.maintenanceCharges || "0") +
              calculatedLateFee +
              parseFloat(invoice.otherCharges || "0");

            await storage.updateRentInvoice(invoice.id, {
              lateFees: calculatedLateFee.toFixed(2),
              totalAmount: newTotal.toFixed(2),
            });

            result.processedCount++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`Invoice ${invoice.id}: ${message}`);
        }
      }
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(message);
    }
    return result;
  },

  checkLeaseExpiry: async (): Promise<ScheduledJobResult> => {
    const result: ScheduledJobResult = { success: true, processedCount: 0, errors: [] };
    try {
      const expiringLeases = await storage.getExpiringLeasesForScheduler(30);
      result.processedCount = expiringLeases.length;
      console.log(`[Scheduler] Found ${expiringLeases.length} leases expiring within 30 days`);
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(message);
    }
    return result;
  },

  checkMaintenanceReminders: async (): Promise<ScheduledJobResult> => {
    const result: ScheduledJobResult = { success: true, processedCount: 0, errors: [] };
    try {
      const upcomingSchedules = await storage.getUpcomingMaintenanceSchedulesForScheduler(14);
      result.processedCount = upcomingSchedules.length;
      console.log(`[Scheduler] Found ${upcomingSchedules.length} maintenance schedules due within 14 days`);
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(message);
    }
    return result;
  },

  markOverdueInvoices: async (): Promise<ScheduledJobResult> => {
    const result: ScheduledJobResult = { success: true, processedCount: 0, errors: [] };
    try {
      const today = new Date();
      const unpaidInvoices = await storage.getUnpaidInvoicesForScheduler();

      for (const invoice of unpaidInvoices) {
        const dueDate = new Date(invoice.dueDate);
        if (dueDate < today && invoice.status !== "OVERDUE") {
          await storage.updateRentInvoice(invoice.id, { status: "OVERDUE" });
          result.processedCount++;
        }
      }
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(message);
    }
    return result;
  },
};

function shouldGenerateInvoice(lease: any, today: Date): boolean {
  if (lease.status !== "ACTIVE") return false;
  if (!lease.autoGenerateRentInvoices) return false;

  const nextInvoiceDate = lease.nextInvoiceDate ? new Date(lease.nextInvoiceDate) : null;
  if (nextInvoiceDate && nextInvoiceDate > today) return false;

  return true;
}

export function initializeScheduler() {
  console.log("[Scheduler] Initializing scheduled jobs...");

  cron.schedule("0 6 * * *", async () => {
    console.log("[Scheduler] Running daily invoice generation...");
    const result = await schedulerJobs.dailyInvoiceGeneration();
    console.log(`[Scheduler] Invoice generation complete: ${result.processedCount} invoices created, ${result.errors.length} errors`);
    if (result.errors.length > 0) {
      console.error("[Scheduler] Invoice generation errors:", result.errors);
    }
  });

  cron.schedule("0 7 * * *", async () => {
    console.log("[Scheduler] Marking overdue invoices...");
    const result = await schedulerJobs.markOverdueInvoices();
    console.log(`[Scheduler] Overdue marking complete: ${result.processedCount} invoices marked`);
  });

  cron.schedule("0 8 * * *", async () => {
    console.log("[Scheduler] Calculating late fees...");
    const result = await schedulerJobs.dailyLateFeeCalculation();
    console.log(`[Scheduler] Late fee calculation complete: ${result.processedCount} invoices updated, ${result.errors.length} errors`);
  });

  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Checking lease expiry...");
    const result = await schedulerJobs.checkLeaseExpiry();
    console.log(`[Scheduler] Lease expiry check complete: ${result.processedCount} expiring leases found`);
  });

  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Checking home maintenance reminders...");
    const result = await schedulerJobs.checkMaintenanceReminders();
    console.log(`[Scheduler] Maintenance reminder check complete: ${result.processedCount} upcoming schedules found`);
  });

  console.log("[Scheduler] Scheduled jobs initialized:");
  console.log("  - Daily invoice generation: 6:00 AM");
  console.log("  - Mark overdue invoices: 7:00 AM");
  console.log("  - Late fee calculation: 8:00 AM");
  console.log("  - Lease expiry check: 9:00 AM");
  console.log("  - Maintenance reminders: 9:00 AM");
}
