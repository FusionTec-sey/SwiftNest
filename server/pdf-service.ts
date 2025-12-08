import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { Lease, RentInvoice, Payment, Property, Tenant, Owner } from "@shared/schema";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "documents");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface InvoiceData {
  invoice: RentInvoice;
  lease: Lease;
  property: Property;
  tenant: Tenant;
  owner?: Owner;
}

interface ReceiptData {
  payment: Payment;
  invoice: RentInvoice;
  lease: Lease;
  property: Property;
  tenant: Tenant;
  owner?: Owner;
}

function formatCurrency(amount: string | number | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  const { invoice, lease, property, tenant, owner } = data;
  const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    doc.fontSize(24).text("RENT INVOICE", { align: "center" });
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor("#666666");
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: "right" });
    doc.text(`Date: ${formatDate(invoice.createdAt)}`, { align: "right" });
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, { align: "right" });
    doc.moveDown(1.5);

    doc.fillColor("#000000").fontSize(12).text("FROM:", { underline: true });
    doc.fontSize(10).text(owner?.legalName || property.ownerOrgName || "Property Owner");
    doc.text(property.addressLine1);
    if (property.addressLine2) doc.text(property.addressLine2);
    doc.text(`${property.city}, ${property.state} ${property.pincode}`);
    doc.text(property.country);
    doc.moveDown(1);

    doc.fontSize(12).text("TO:", { underline: true });
    doc.fontSize(10).text(tenant.legalName);
    if (tenant.email) doc.text(tenant.email);
    if (tenant.phone) doc.text(tenant.phone);
    doc.moveDown(1);

    doc.fontSize(12).text("PROPERTY:", { underline: true });
    doc.fontSize(10).text(property.name);
    doc.text(property.addressLine1);
    doc.moveDown(1.5);

    doc.fontSize(12).text("BILLING PERIOD:", { underline: true });
    doc.fontSize(10).text(`${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`);
    doc.moveDown(1.5);

    doc.fontSize(12).text("CHARGES:", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 400;

    doc.fontSize(10);
    doc.text("Description", col1, tableTop, { width: 300 });
    doc.text("Amount", col2, tableTop, { width: 100, align: "right" });

    doc.moveTo(col1, doc.y + 5).lineTo(500, doc.y + 5).stroke();
    doc.moveDown(0.5);

    let y = doc.y;

    doc.text("Rent", col1, y, { width: 300 });
    doc.text(formatCurrency(invoice.rentAmount), col2, y, { width: 100, align: "right" });
    y += 20;

    if (parseFloat(invoice.utilityCharges || "0") > 0) {
      doc.text("Utility Charges", col1, y, { width: 300 });
      doc.text(formatCurrency(invoice.utilityCharges), col2, y, { width: 100, align: "right" });
      y += 20;
    }

    if (parseFloat(invoice.maintenanceCharges || "0") > 0) {
      doc.text("Maintenance Charges", col1, y, { width: 300 });
      doc.text(formatCurrency(invoice.maintenanceCharges), col2, y, { width: 100, align: "right" });
      y += 20;
    }

    if (parseFloat(invoice.lateFees || "0") > 0) {
      doc.text("Late Fees", col1, y, { width: 300 });
      doc.text(formatCurrency(invoice.lateFees), col2, y, { width: 100, align: "right" });
      y += 20;
    }

    if (parseFloat(invoice.otherCharges || "0") > 0) {
      doc.text("Other Charges", col1, y, { width: 300 });
      doc.text(formatCurrency(invoice.otherCharges), col2, y, { width: 100, align: "right" });
      y += 20;
    }

    doc.moveTo(col1, y + 5).lineTo(500, y + 5).stroke();
    y += 15;

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("TOTAL DUE", col1, y, { width: 300 });
    doc.text(formatCurrency(invoice.totalAmount), col2, y, { width: 100, align: "right" });
    y += 25;

    if (parseFloat(invoice.amountPaid || "0") > 0) {
      doc.font("Helvetica").fontSize(10);
      doc.text("Amount Paid", col1, y, { width: 300 });
      doc.text(formatCurrency(invoice.amountPaid), col2, y, { width: 100, align: "right" });
      y += 20;

      const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid || "0");
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("BALANCE DUE", col1, y, { width: 300 });
      doc.text(formatCurrency(balance), col2, y, { width: 100, align: "right" });
    }

    doc.moveDown(3);
    doc.font("Helvetica").fontSize(9).fillColor("#666666");
    doc.text("Payment is due by the date shown above. Thank you for your prompt payment.", { align: "center" });

    if (invoice.notes) {
      doc.moveDown(1);
      doc.fontSize(10).fillColor("#000000");
      doc.text("Notes: " + invoice.notes);
    }

    doc.end();

    writeStream.on("finish", () => resolve(fileName));
    writeStream.on("error", reject);
  });
}

export async function generateReceiptPDF(data: ReceiptData): Promise<string> {
  const { payment, invoice, lease, property, tenant, owner } = data;
  const receiptNumber = `REC-${payment.id.toString().padStart(6, "0")}`;
  const fileName = `receipt_${receiptNumber}_${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    doc.fontSize(24).text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor("#666666");
    doc.text(`Receipt #: ${receiptNumber}`, { align: "right" });
    doc.text(`Date: ${formatDate(payment.paymentDate)}`, { align: "right" });
    doc.moveDown(1.5);

    doc.fillColor("#000000").fontSize(12).text("RECEIVED FROM:", { underline: true });
    doc.fontSize(10).text(tenant.legalName);
    if (tenant.email) doc.text(tenant.email);
    if (tenant.phone) doc.text(tenant.phone);
    doc.moveDown(1);

    doc.fontSize(12).text("RECEIVED BY:", { underline: true });
    doc.fontSize(10).text(owner?.legalName || property.ownerOrgName || "Property Owner");
    doc.text(property.addressLine1);
    doc.text(`${property.city}, ${property.state} ${property.pincode}`);
    doc.moveDown(1);

    doc.fontSize(12).text("PROPERTY:", { underline: true });
    doc.fontSize(10).text(property.name);
    doc.text(property.addressLine1);
    doc.moveDown(1.5);

    doc.fontSize(12).text("PAYMENT DETAILS:", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 400;

    doc.fontSize(10);
    doc.text("Description", col1, tableTop, { width: 300 });
    doc.text("Amount", col2, tableTop, { width: 100, align: "right" });

    doc.moveTo(col1, doc.y + 5).lineTo(500, doc.y + 5).stroke();
    doc.moveDown(0.5);

    let y = doc.y;

    doc.text(`Payment for Invoice #${invoice.invoiceNumber}`, col1, y, { width: 300 });
    doc.text(formatCurrency(payment.amount), col2, y, { width: 100, align: "right" });
    y += 20;

    doc.text(`Billing Period: ${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`, col1, y, { width: 300 });
    y += 20;

    doc.text(`Payment Method: ${payment.paymentMethod.replace(/_/g, " ")}`, col1, y, { width: 300 });
    y += 20;

    if (payment.reference) {
      doc.text(`Reference: ${payment.reference}`, col1, y, { width: 300 });
      y += 20;
    }

    doc.moveTo(col1, y + 5).lineTo(500, y + 5).stroke();
    y += 15;

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("AMOUNT RECEIVED", col1, y, { width: 300 });
    doc.text(formatCurrency(payment.amount), col2, y, { width: 100, align: "right" });

    doc.moveDown(3);
    doc.font("Helvetica").fontSize(9).fillColor("#666666");
    doc.text("Thank you for your payment. This receipt confirms the payment has been received.", { align: "center" });

    if (payment.notes) {
      doc.moveDown(1);
      doc.fontSize(10).fillColor("#000000");
      doc.text("Notes: " + payment.notes);
    }

    doc.end();

    writeStream.on("finish", () => resolve(fileName));
    writeStream.on("error", reject);
  });
}

export function getInvoicePDFPath(fileName: string): string {
  return path.join(UPLOADS_DIR, fileName);
}

export function getReceiptPDFPath(fileName: string): string {
  return path.join(UPLOADS_DIR, fileName);
}
