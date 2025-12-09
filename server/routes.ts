import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { hasPermission, getAccessiblePropertyIds, requirePermission, hasAnyPermission, requireSuperAdmin, requireAnyPermission, getUserPermissions } from "./rbac";
import { 
  insertPropertySchema, 
  insertUnitSchema, 
  sharePropertySchema, 
  insertPropertyNodeSchema, 
  updatePropertyNodeSchema, 
  movePropertyNodeSchema,
  insertMaintenanceTeamMemberSchema,
  insertMaintenanceMaterialSchema,
  insertMaintenanceIssueSchema,
  insertMaintenanceTaskSchema,
  insertMaintenanceScheduleSchema,
  insertOwnerSchema,
  insertPropertyOwnerSchema,
  insertOwnerTeamMemberSchema,
  insertOwnerInvitationSchema,
  insertTenantSchema,
  insertLeaseSchema,
  insertRentInvoiceSchema,
  insertPaymentSchema,
  insertChartOfAccountSchema,
  insertLedgerEntrySchema,
  insertLedgerLineSchema,
  insertUtilityMeterSchema,
  insertMeterReadingSchema,
  insertUtilityBillSchema,
  insertLoanSchema,
  insertLoanPaymentSchema,
  insertAssetSchema,
  insertDepreciationRuleSchema,
  insertComplianceDocumentSchema,
  insertExpenseSchema
} from "@shared/schema";
import { generateInvoicePDF, generateReceiptPDF, getInvoicePDFPath, getReceiptPDFPath } from "./pdf-service";

const uploadDir = path.join(process.cwd(), "uploads", "properties");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const documentsDir = path.join(process.cwd(), "uploads", "documents");
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const expenseAttachmentsDir = path.join(process.cwd(), "uploads", "expense-attachments");
if (!fs.existsSync(expenseAttachmentsDir)) {
  fs.mkdirSync(expenseAttachmentsDir, { recursive: true });
}

const onboardingPhotosDir = path.join(process.cwd(), "uploads", "onboarding-photos");
if (!fs.existsSync(onboardingPhotosDir)) {
  fs.mkdirSync(onboardingPhotosDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

const expenseAttachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, expenseAttachmentsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const expenseAttachmentUpload = multer({
  storage: expenseAttachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed"));
    }
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimes = /image\/(jpeg|jpg|png|gif|webp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/;
    const mimetype = allowedMimes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (JPG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX) are allowed"));
  },
});

const onboardingPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, onboardingPhotosDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const onboardingPhotoUpload = multer({
  storage: onboardingPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"));
  },
});

async function requirePropertyEditAccess(propertyId: number, userId: number): Promise<{ allowed: boolean; message?: string }> {
  const access = await storage.canUserAccessProperty(propertyId, userId);
  if (!access.canAccess) {
    return { allowed: false, message: "Access denied" };
  }
  if (access.role === "VIEWER") {
    return { allowed: false, message: "View-only access - editing not permitted" };
  }
  return { allowed: true };
}

async function requirePropertyOwnerAccess(propertyId: number, userId: number): Promise<{ allowed: boolean; message?: string }> {
  const access = await storage.canUserAccessProperty(propertyId, userId);
  if (!access.canAccess) {
    return { allowed: false, message: "Access denied" };
  }
  if (!access.isOwner) {
    return { allowed: false, message: "Only property owners can perform this action" };
  }
  return { allowed: true };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.get("/api/properties", requireAuth, async (req, res, next) => {
    try {
      const properties = await storage.getPropertiesByUserId(req.user!.id);
      res.json(properties);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getPropertyById(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const access = await storage.canUserAccessProperty(id, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ ...property, userRole: access.role, isOwner: access.isOwner });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties", requireAuth, async (req, res, next) => {
    try {
      const validation = insertPropertySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const user = req.user!;
      const property = await storage.createProperty({
        ...validation.data,
        ownerUserId: user.id,
        ownerOrgName: user.accountType === "ORGANIZATION" ? user.organizationName : null,
      });

      res.status(201).json(property);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/properties/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const existing = await storage.getPropertyById(id);
      if (!existing) {
        return res.status(404).json({ message: "Property not found" });
      }

      const access = await storage.canUserAccessProperty(id, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can modify properties" });
      }

      const validation = insertPropertySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const updated = await storage.updateProperty(id, validation.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/properties/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const existing = await storage.getPropertyById(id);
      if (!existing) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (existing.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProperty(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/deleted", requireAuth, async (req, res, next) => {
    try {
      const deleted = await storage.getDeletedPropertiesByUserId(req.user!.id);
      res.json(deleted);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:id/restore", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const existing = await storage.getDeletedPropertyById(id);
      if (!existing) {
        return res.status(404).json({ message: "Deleted property not found" });
      }

      if (existing.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const restored = await storage.restoreProperty(id);
      res.json(restored);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/properties/:id/permanent", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const existing = await storage.getDeletedPropertyById(id);
      if (!existing) {
        return res.status(404).json({ message: "Deleted property not found" });
      }

      if (existing.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.permanentlyDeleteProperty(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.post("/api/properties/:id/images", requireAuth, upload.array("images", 10), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getPropertyById(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const access = await storage.canUserAccessProperty(id, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const newImageUrls = files.map((file) => `/uploads/properties/${file.filename}`);
      const updatedImages = [...(property.images || []), ...newImageUrls];

      const updated = await storage.updateProperty(id, { images: updatedImages });
      res.json({ images: updated?.images || [] });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/properties/:id/images", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      const property = await storage.getPropertyById(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const access = await storage.canUserAccessProperty(id, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedImages = (property.images || []).filter((img) => img !== imageUrl);
      
      const filename = path.basename(imageUrl);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const updated = await storage.updateProperty(id, { images: updatedImages });
      res.json({ images: updated?.images || [] });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:id/units", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validation = insertUnitSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const unit = await storage.createUnit(validation.data);
      res.status(201).json(unit);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/units/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      const unit = await storage.getUnitById(id);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      const access = await storage.canUserAccessProperty(unit.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validation = insertUnitSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const updated = await storage.updateUnit(id, validation.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/units/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }

      const unit = await storage.getUnitById(id);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }

      const access = await storage.canUserAccessProperty(unit.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteUnit(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/shared-properties", requireAuth, async (req, res, next) => {
    try {
      const sharedProperties = await storage.getSharedPropertiesForUser(req.user!.id);
      res.json(sharedProperties);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/:id/collaborators", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getPropertyById(id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (property.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can view collaborators" });
      }

      const collaborators = await storage.getCollaboratorsByPropertyId(id);
      res.json(collaborators);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:id/share", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (property.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can share this property" });
      }

      const validation = sharePropertySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const { email, role } = validation.data;

      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found. They need to register first." });
      }

      if (targetUser.id === req.user!.id) {
        return res.status(400).json({ message: "You cannot share a property with yourself" });
      }

      const collaborator = await storage.addCollaborator(
        propertyId,
        targetUser.id,
        role,
        req.user!.id
      );

      res.status(201).json({
        ...collaborator,
        user: { id: targetUser.id, name: targetUser.name, email: targetUser.email }
      });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/properties/:id/collaborators/:userId", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);

      if (isNaN(propertyId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (property.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can remove collaborators" });
      }

      await storage.removeCollaborator(propertyId, userId);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Tree management routes
  app.get("/api/properties/:propertyId/tree", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tree = await storage.getPropertyTree(propertyId);
      res.json(tree);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/nodes", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can add nodes" });
      }

      const validation = insertPropertyNodeSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const node = await storage.createPropertyNode(validation.data);
      res.status(201).json(node);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/nodes/:nodeId", requireAuth, async (req, res, next) => {
    try {
      const nodeId = parseInt(req.params.nodeId);
      if (isNaN(nodeId)) {
        return res.status(400).json({ message: "Invalid node ID" });
      }

      const existingNode = await storage.getNodeById(nodeId);
      if (!existingNode) {
        return res.status(404).json({ message: "Node not found" });
      }

      const access = await storage.canUserAccessProperty(existingNode.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update nodes" });
      }

      const validation = updatePropertyNodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const updated = await storage.updatePropertyNode(nodeId, validation.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/nodes/:nodeId/move", requireAuth, async (req, res, next) => {
    try {
      const nodeId = parseInt(req.params.nodeId);
      if (isNaN(nodeId)) {
        return res.status(400).json({ message: "Invalid node ID" });
      }

      const existingNode = await storage.getNodeById(nodeId);
      if (!existingNode) {
        return res.status(404).json({ message: "Node not found" });
      }

      const access = await storage.canUserAccessProperty(existingNode.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can move nodes" });
      }

      const validation = movePropertyNodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const { parentId, sortOrder } = validation.data;
      const updated = await storage.movePropertyNode(nodeId, parentId, sortOrder);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/nodes/:nodeId", requireAuth, async (req, res, next) => {
    try {
      const nodeId = parseInt(req.params.nodeId);
      if (isNaN(nodeId)) {
        return res.status(400).json({ message: "Invalid node ID" });
      }

      const existingNode = await storage.getNodeById(nodeId);
      if (!existingNode) {
        return res.status(404).json({ message: "Node not found" });
      }

      const access = await storage.canUserAccessProperty(existingNode.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can delete nodes" });
      }

      await storage.deletePropertyNode(nodeId);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // MAINTENANCE TEAM MEMBERS
  // =====================================================

  app.get("/api/properties/:propertyId/maintenance/team", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const team = await storage.getTeamMembersByPropertyId(propertyId);
      res.json(team);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/team/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team member ID" });
      }

      const member = await storage.getTeamMemberById(id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const access = await storage.canUserAccessProperty(member.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(member);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/maintenance/team", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can add team members" });
      }

      const { skills, ...memberData } = req.body;
      const validation = insertMaintenanceTeamMemberSchema.safeParse({ ...memberData, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const member = await storage.createTeamMember(validation.data, skills || []);
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/maintenance/team/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team member ID" });
      }

      const existing = await storage.getTeamMemberById(id);
      if (!existing) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update team members" });
      }

      const { skills, ...memberData } = req.body;
      const member = await storage.updateTeamMember(id, memberData, skills);
      res.json(member);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/maintenance/team/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team member ID" });
      }

      const existing = await storage.getTeamMemberById(id);
      if (!existing) {
        return res.status(404).json({ message: "Team member not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can delete team members" });
      }

      await storage.deleteTeamMember(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // MAINTENANCE MATERIALS
  // =====================================================

  app.get("/api/properties/:propertyId/maintenance/materials", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const materials = await storage.getMaterialsByPropertyId(propertyId);
      res.json(materials);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/:propertyId/maintenance/materials/low-stock", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const materials = await storage.getLowStockMaterials(propertyId);
      res.json(materials);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/materials/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }

      const material = await storage.getMaterialById(id);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }

      const access = await storage.canUserAccessProperty(material.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(material);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/maintenance/materials", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can add materials" });
      }

      const validation = insertMaintenanceMaterialSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const material = await storage.createMaterial(validation.data);
      res.status(201).json(material);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/maintenance/materials/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }

      const existing = await storage.getMaterialById(id);
      if (!existing) {
        return res.status(404).json({ message: "Material not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update materials" });
      }

      const material = await storage.updateMaterial(id, req.body);
      res.json(material);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/materials/:id/adjust-stock", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }

      const existing = await storage.getMaterialById(id);
      if (!existing) {
        return res.status(404).json({ message: "Material not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can adjust stock" });
      }

      const { quantityChange } = req.body;
      if (typeof quantityChange !== "number") {
        return res.status(400).json({ message: "quantityChange must be a number" });
      }

      const material = await storage.adjustMaterialStock(id, quantityChange);
      res.json(material);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/maintenance/materials/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid material ID" });
      }

      const existing = await storage.getMaterialById(id);
      if (!existing) {
        return res.status(404).json({ message: "Material not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can delete materials" });
      }

      await storage.deleteMaterial(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // MAINTENANCE ISSUES
  // =====================================================

  app.get("/api/properties/:propertyId/maintenance/issues", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const issues = await storage.getIssuesByPropertyId(propertyId);
      res.json(issues);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/issues/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }

      const issue = await storage.getIssueById(id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      const access = await storage.canUserAccessProperty(issue.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(issue);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/maintenance/issues", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validation = insertMaintenanceIssueSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const issue = await storage.createIssue({ ...validation.data, reportedByUserId: req.user!.id });
      res.status(201).json(issue);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/maintenance/issues/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }

      const existing = await storage.getIssueById(id);
      if (!existing) {
        return res.status(404).json({ message: "Issue not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update issues" });
      }

      const issue = await storage.updateIssue(id, req.body);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/issues/:id/assign", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }

      const existing = await storage.getIssueById(id);
      if (!existing) {
        return res.status(404).json({ message: "Issue not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can assign issues" });
      }

      const { memberId } = req.body;
      const issue = await storage.assignIssue(id, memberId || null);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/issues/:id/status", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }

      const existing = await storage.getIssueById(id);
      if (!existing) {
        return res.status(404).json({ message: "Issue not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update issue status" });
      }

      const { status, resolutionNotes } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const issue = await storage.updateIssueStatus(id, status, resolutionNotes);
      res.json(issue);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/maintenance/issues/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }

      const existing = await storage.getIssueById(id);
      if (!existing) {
        return res.status(404).json({ message: "Issue not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can delete issues" });
      }

      await storage.deleteIssue(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // MAINTENANCE TASKS
  // =====================================================

  app.get("/api/properties/:propertyId/maintenance/tasks", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tasks = await storage.getTasksByPropertyId(propertyId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(task.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/tasks/:id/activities", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(task.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const activities = await storage.getTaskActivities(id);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/maintenance/tasks", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can create tasks" });
      }

      const validation = insertMaintenanceTaskSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const task = await storage.createTask({ ...validation.data, requestedByUserId: req.user!.id });
      await storage.addTaskActivity(task.id, req.user!.id, "CREATED", { title: task.title });
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/maintenance/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const existing = await storage.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update tasks" });
      }

      const task = await storage.updateTask(id, req.body);
      await storage.addTaskActivity(id, req.user!.id, "UPDATED", req.body);
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/tasks/:id/assign", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const existing = await storage.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can assign tasks" });
      }

      const { memberId } = req.body;
      const task = await storage.assignTask(id, memberId || null);
      await storage.addTaskActivity(id, req.user!.id, "ASSIGNED", { memberId });
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/tasks/:id/status", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const existing = await storage.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update task status" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const task = await storage.updateTaskStatus(id, status, req.user!.id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/tasks/:id/approve", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const existing = await storage.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner) {
        return res.status(403).json({ message: "Only owners can approve tasks" });
      }

      const task = await storage.approveTask(id, req.user!.id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/maintenance/tasks/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const existing = await storage.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ message: "Task not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can delete tasks" });
      }

      await storage.deleteTask(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // MAINTENANCE SCHEDULES
  // =====================================================

  app.get("/api/properties/:propertyId/maintenance/schedules", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const schedules = await storage.getSchedulesByPropertyId(propertyId);
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/schedules/upcoming", requireAuth, async (req, res, next) => {
    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      
      if (propertyId) {
        const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const schedules = await storage.getUpcomingSchedules(propertyId);
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/maintenance/schedules/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const schedule = await storage.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const access = await storage.canUserAccessProperty(schedule.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/maintenance/schedules", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can create schedules" });
      }

      const validation = insertMaintenanceScheduleSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({
          message: validation.error.errors[0]?.message || "Invalid input",
        });
      }

      const schedule = await storage.createSchedule(validation.data);
      res.status(201).json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/maintenance/schedules/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const existing = await storage.getScheduleById(id);
      if (!existing) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can update schedules" });
      }

      const schedule = await storage.updateSchedule(id, req.body);
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/maintenance/schedules/:id/run", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const existing = await storage.getScheduleById(id);
      if (!existing) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can run schedules" });
      }

      const task = await storage.runSchedule(id, req.user!.id);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/maintenance/schedules/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const existing = await storage.getScheduleById(id);
      if (!existing) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (!access.isOwner && access.role !== "EDITOR") {
        return res.status(403).json({ message: "Only owners and editors can delete schedules" });
      }

      await storage.deleteSchedule(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // MAINTENANCE STATS/DASHBOARD
  // =====================================================

  app.get("/api/properties/:propertyId/maintenance/stats", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getMaintenanceStats(propertyId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // OWNERS MODULE
  // =====================================================

  app.get("/api/owners", requireAuth, async (req, res, next) => {
    try {
      const owners = await storage.getOwnersByUserId(req.user!.id);
      res.json(owners);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/owners/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const owner = await storage.getOwnerWithProperties(id);
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      if (owner.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(owner);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/owners", requireAuth, async (req, res, next) => {
    try {
      const validation = insertOwnerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const owner = await storage.createOwner({ ...validation.data, userId: req.user!.id });
      res.status(201).json(owner);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/owners/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const existing = await storage.getOwnerById(id);
      if (!existing) {
        return res.status(404).json({ message: "Owner not found" });
      }
      if (existing.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateOwner(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/owners/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const existing = await storage.getOwnerById(id);
      if (!existing) {
        return res.status(404).json({ message: "Owner not found" });
      }
      if (existing.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteOwner(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Property Owners (linking owners to properties)
  app.get("/api/properties/:propertyId/owners", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const propertyOwners = await storage.getPropertyOwnersByPropertyId(propertyId);
      res.json(propertyOwners);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/properties/:propertyId/owners", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const validation = insertPropertyOwnerSchema.safeParse({ ...req.body, propertyId });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const propertyOwner = await storage.addPropertyOwner(validation.data);
      res.status(201).json(propertyOwner);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/property-owners/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      await storage.removePropertyOwner(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // OWNER TEAM MANAGEMENT MODULE
  // =====================================================

  // Get all owners accessible by the current user (owned + team memberships)
  app.get("/api/accessible-owners", requireAuth, async (req, res, next) => {
    try {
      const accessibleOwners = await storage.getOwnersAccessibleByUser(req.user!.id);
      res.json(accessibleOwners);
    } catch (error) {
      next(error);
    }
  });

  // Get team members for an owner
  app.get("/api/owners/:ownerId/team", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const access = await storage.canUserAccessOwner(ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can view team members." });
      }
      const teamMembers = await storage.getTeamMembersByOwnerId(ownerId);
      res.json(teamMembers);
    } catch (error) {
      next(error);
    }
  });

  // Add a team member directly (skip invitation if user already exists)
  app.post("/api/owners/:ownerId/team", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const access = await storage.canUserAccessOwner(ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can add team members." });
      }
      if (req.body.role === "OWNER") {
        return res.status(400).json({ message: "Cannot assign OWNER role. OWNER role is reserved for the entity creator." });
      }
      const validation = insertOwnerTeamMemberSchema.safeParse({ ...req.body, ownerId });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const existingMember = await storage.getTeamMemberByOwnerAndUser(ownerId, validation.data.userId);
      if (existingMember) {
        return res.status(400).json({ message: "User is already a team member" });
      }
      const teamMember = await storage.addOwnerTeamMember({
        ...validation.data,
        addedByUserId: req.user!.id
      });
      res.status(201).json(teamMember);
    } catch (error) {
      next(error);
    }
  });

  // Update a team member's role or status
  app.patch("/api/owner-team/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const member = await storage.getTeamMemberById(id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      const access = await storage.canUserAccessOwner(member.ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can update team members." });
      }
      if (req.body.ownerId !== undefined || req.body.userId !== undefined) {
        return res.status(400).json({ message: "Cannot change ownerId or userId" });
      }
      if (req.body.role === "OWNER") {
        return res.status(400).json({ message: "Cannot assign OWNER role. OWNER role is reserved for the entity creator." });
      }
      const allowedUpdates: { role?: string; isActive?: number } = {};
      if (req.body.role !== undefined) allowedUpdates.role = req.body.role;
      if (req.body.isActive !== undefined) allowedUpdates.isActive = req.body.isActive;
      const updated = await storage.updateOwnerTeamMember(id, allowedUpdates);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Remove a team member
  app.delete("/api/owner-team/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const member = await storage.getTeamMemberById(id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      const access = await storage.canUserAccessOwner(member.ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can remove team members." });
      }
      await storage.removeOwnerTeamMember(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Get invitations for an owner
  app.get("/api/owners/:ownerId/invitations", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const access = await storage.canUserAccessOwner(ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can view invitations." });
      }
      const invitations = await storage.getInvitationsByOwnerId(ownerId);
      res.json(invitations);
    } catch (error) {
      next(error);
    }
  });

  // Create a new invitation
  app.post("/api/owners/:ownerId/invitations", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const access = await storage.canUserAccessOwner(ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can send invitations." });
      }
      if (req.body.role === "OWNER") {
        return res.status(400).json({ message: "Cannot invite with OWNER role. OWNER role is reserved for the entity creator." });
      }
      const validation = insertOwnerInvitationSchema.safeParse({ ...req.body, ownerId });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const existingInvitation = await storage.getPendingInvitationByEmail(ownerId, validation.data.email);
      if (existingInvitation) {
        return res.status(400).json({ message: "An invitation has already been sent to this email" });
      }
      const existingUser = await storage.getUserByEmail(validation.data.email.toLowerCase());
      if (existingUser) {
        const existingMember = await storage.getTeamMemberByOwnerAndUser(ownerId, existingUser.id);
        if (existingMember) {
          return res.status(400).json({ message: "This user is already a team member" });
        }
      }
      const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const invitation = await storage.createInvitation({
        ...validation.data,
        invitedByUserId: req.user!.id,
        inviteToken,
        expiresAt
      });
      res.status(201).json(invitation);
    } catch (error) {
      next(error);
    }
  });

  // Get invitation by token (public endpoint for invite links)
  app.get("/api/invitations/:token", async (req, res, next) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      if (invitation.status !== "PENDING") {
        return res.status(400).json({ message: "This invitation is no longer valid", status: invitation.status });
      }
      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "This invitation has expired", status: "EXPIRED" });
      }
      res.json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        ownerName: invitation.owner.legalName,
        ownerTradingName: invitation.owner.tradingName,
        expiresAt: invitation.expiresAt
      });
    } catch (error) {
      next(error);
    }
  });

  // Accept an invitation
  app.post("/api/invitations/:token/accept", requireAuth, async (req, res, next) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      if (invitation.email.toLowerCase() !== req.user!.email.toLowerCase()) {
        return res.status(403).json({ message: "This invitation was sent to a different email address" });
      }
      const teamMember = await storage.acceptInvitation(req.params.token, req.user!.id);
      res.json(teamMember);
    } catch (error: any) {
      if (error.message) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  // Decline an invitation
  app.post("/api/invitations/:token/decline", async (req, res, next) => {
    try {
      await storage.declineInvitation(req.params.token);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Delete an invitation (cancel it)
  app.delete("/api/invitations/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const invitation = await storage.getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      const access = await storage.canUserAccessOwner(invitation.ownerId, req.user!.id);
      if (!access.isOwner) {
        return res.status(403).json({ message: "Access denied. Only the owner can cancel invitations." });
      }
      await storage.deleteInvitation(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // TENANTS MODULE
  // =====================================================

  app.get("/api/tenants", requireAuth, async (req, res, next) => {
    try {
      const tenants = await storage.getTenantsByUserId(req.user!.id);
      res.json(tenants);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tenants/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }
      const tenant = await storage.getTenantById(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      if (tenant.createdByUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tenants", requireAuth, async (req, res, next) => {
    try {
      const validation = insertTenantSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const tenant = await storage.createTenant({ ...validation.data, createdByUserId: req.user!.id });
      res.status(201).json(tenant);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/tenants/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }
      const existing = await storage.getTenantById(id);
      if (!existing) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      if (existing.createdByUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateTenant(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tenants/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }
      const existing = await storage.getTenantById(id);
      if (!existing) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      if (existing.createdByUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteTenant(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // LEASES MODULE
  // =====================================================

  app.get("/api/properties/:propertyId/leases", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const leases = await storage.getLeasesByPropertyId(propertyId);
      res.json(leases);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tenants/:tenantId/leases", requireAuth, async (req, res, next) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }
      const leases = await storage.getLeasesByTenantId(tenantId);
      res.json(leases);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leases", requireAuth, async (req, res, next) => {
    try {
      const leases = await storage.getLeasesByUserId(req.user!.id);
      res.json(leases);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leases/expiring", requireAuth, async (req, res, next) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const expiringLeases = await storage.getExpiringLeases(req.user!.id, days);
      res.json(expiringLeases);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leases/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const lease = await storage.getLeaseById(id);
      if (!lease) {
        return res.status(404).json({ message: "Lease not found" });
      }
      const access = await storage.canUserAccessProperty(lease.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(lease);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/leases", requireAuth, async (req, res, next) => {
    try {
      const validation = insertLeaseSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const access = await storage.canUserAccessProperty(validation.data.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const lease = await storage.createLease({ ...validation.data, createdByUserId: req.user!.id });
      res.status(201).json(lease);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/leases/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const existing = await storage.getLeaseById(id);
      if (!existing) {
        return res.status(404).json({ message: "Lease not found" });
      }
      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateLease(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/leases/:id/status", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const existing = await storage.getLeaseById(id);
      if (!existing) {
        return res.status(404).json({ message: "Lease not found" });
      }
      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateLeaseStatus(id, req.body.status);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/leases/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const existing = await storage.getLeaseById(id);
      if (!existing) {
        return res.status(404).json({ message: "Lease not found" });
      }
      const access = await storage.canUserAccessProperty(existing.propertyId, req.user!.id);
      if (!access.canAccess || !access.isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteLease(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // RENT INVOICES MODULE
  // =====================================================

  app.get("/api/invoices", requireAuth, async (req, res, next) => {
    try {
      const invoices = await storage.getInvoicesByUserId(req.user!.id);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leases/:leaseId/invoices", requireAuth, async (req, res, next) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      if (isNaN(leaseId)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const invoices = await storage.getInvoicesByLeaseId(leaseId);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/invoices/overdue", requireAuth, async (req, res, next) => {
    try {
      const invoices = await storage.getOverdueInvoices();
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res, next) => {
    try {
      const validation = insertRentInvoiceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const invoice = await storage.createRentInvoice(validation.data);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/invoices/:id/issue", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      const invoice = await storage.issueInvoice(id);
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      await storage.deleteRentInvoice(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/leases/:leaseId/generate-invoice", requireAuth, async (req, res, next) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      if (isNaN(leaseId)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const lease = await storage.getLeaseById(leaseId);
      if (!lease) {
        return res.status(404).json({ message: "Lease not found" });
      }
      const access = await storage.canUserAccessProperty(lease.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const dueDate = new Date(now.getFullYear(), now.getMonth(), lease.paymentDueDay || 1);
      if (dueDate < now) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      const invoiceNumber = `INV-${leaseId}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
      const invoice = await storage.createRentInvoice({
        leaseId,
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
        const pdfFileName = await generateInvoicePDF({
          invoice,
          lease,
          property,
          tenant,
        });
        const document = await storage.createDocument({
          documentType: "INVOICE",
          module: "LEASE",
          moduleId: leaseId,
          propertyId: lease.propertyId,
          fileName: pdfFileName,
          originalName: `Invoice_${invoiceNumber}.pdf`,
          fileSize: 0,
          mimeType: "application/pdf",
          storagePath: `uploads/documents/${pdfFileName}`,
          uploadedByUserId: req.user!.id,
        });
        await storage.updateRentInvoice(invoice.id, { invoiceDocumentId: document.id });
      }
      await storage.updateLease(leaseId, { 
        nextInvoiceDate: new Date(now.getFullYear(), now.getMonth() + 1, lease.paymentDueDay || 1),
        lastInvoiceGeneratedAt: now 
      });
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/invoices/:id/pdf", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const lease = await storage.getLeaseById(invoice.leaseId);
      if (!lease) {
        return res.status(404).json({ message: "Lease not found" });
      }
      const access = await storage.canUserAccessProperty(lease.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (invoice.invoiceDocumentId) {
        const document = await storage.getDocumentById(invoice.invoiceDocumentId);
        if (document) {
          const filePath = getInvoicePDFPath(document.fileName);
          if (fs.existsSync(filePath)) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
            return res.sendFile(filePath);
          }
        }
      }
      const property = await storage.getPropertyById(lease.propertyId);
      const tenant = await storage.getTenantById(lease.tenantId);
      if (!property || !tenant) {
        return res.status(404).json({ message: "Property or tenant not found" });
      }
      const pdfFileName = await generateInvoicePDF({ invoice, lease, property, tenant });
      const filePath = getInvoicePDFPath(pdfFileName);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/leases/generate-all-invoices", requireAuth, async (req, res, next) => {
    try {
      const activeLeases = await storage.getActiveLeasesDueForInvoicing(req.user!.id);
      const generatedInvoices = [];
      for (const lease of activeLeases) {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const dueDate = new Date(now.getFullYear(), now.getMonth(), lease.paymentDueDay || 1);
        if (dueDate < now) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        const invoiceNumber = `INV-${lease.id}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
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
          const pdfFileName = await generateInvoicePDF({ invoice, lease, property, tenant });
          const document = await storage.createDocument({
            documentType: "INVOICE",
            module: "LEASE",
            moduleId: lease.id,
            propertyId: lease.propertyId,
            fileName: pdfFileName,
            originalName: `Invoice_${invoiceNumber}.pdf`,
            fileSize: 0,
            mimeType: "application/pdf",
            storagePath: `uploads/documents/${pdfFileName}`,
            uploadedByUserId: req.user!.id,
          });
          await storage.updateRentInvoice(invoice.id, { invoiceDocumentId: document.id });
        }
        await storage.updateLease(lease.id, { 
          nextInvoiceDate: new Date(now.getFullYear(), now.getMonth() + 1, lease.paymentDueDay || 1),
          lastInvoiceGeneratedAt: now 
        });
        generatedInvoices.push(invoice);
      }
      res.status(201).json({ 
        message: `Generated ${generatedInvoices.length} invoices`,
        invoices: generatedInvoices 
      });
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // PAYMENTS MODULE
  // =====================================================

  app.get("/api/payments/:payerType/:payerId", requireAuth, async (req, res, next) => {
    try {
      const payerId = parseInt(req.params.payerId);
      if (isNaN(payerId)) {
        return res.status(400).json({ message: "Invalid payer ID" });
      }
      const payments = await storage.getPaymentsByPayerId(req.params.payerType, payerId);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/payments", requireAuth, async (req, res, next) => {
    try {
      const validation = insertPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const payment = await storage.createPayment({ ...validation.data, recordedByUserId: req.user!.id });
      
      if (validation.data.appliedToType === "RENT_INVOICE") {
        await storage.recordInvoicePayment(
          validation.data.appliedToId,
          parseFloat(validation.data.amount),
          payment.id
        );
      }
      
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payments/:id/receipt", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      const payment = await storage.getPaymentById(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (payment.appliedToType === "RENT_INVOICE") {
        const invoice = await storage.getInvoiceById(payment.appliedToId);
        if (invoice) {
          const lease = await storage.getLeaseById(invoice.leaseId);
          if (lease) {
            const access = await storage.canUserAccessProperty(lease.propertyId, req.user!.id);
            if (!access.canAccess) {
              return res.status(403).json({ message: "Access denied" });
            }
            const property = await storage.getPropertyById(lease.propertyId);
            const tenant = await storage.getTenantById(lease.tenantId);
            if (property && tenant) {
              const pdfFileName = await generateReceiptPDF({ payment, invoice, property, tenant });
              const filePath = getReceiptPDFPath(pdfFileName);
              res.setHeader("Content-Type", "application/pdf");
              res.setHeader("Content-Disposition", `inline; filename="Receipt_${payment.id}.pdf"`);
              return res.sendFile(filePath);
            }
          }
        }
      }
      res.status(400).json({ message: "Cannot generate receipt for this payment type" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/payments/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }
      await storage.deletePayment(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // CHART OF ACCOUNTS MODULE
  // =====================================================

  app.get("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const accounts = await storage.getAllAccounts();
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/accounts/type/:type", requireAuth, async (req, res, next) => {
    try {
      const accounts = await storage.getAccountsByType(req.params.type);
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/accounts", requireAuth, async (req, res, next) => {
    try {
      const validation = insertChartOfAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const account = await storage.createAccount({ ...validation.data, createdByUserId: req.user!.id });
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/accounts/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      const updated = await storage.updateAccount(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/accounts/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      await storage.deleteAccount(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/accounts/seed", requireAuth, async (req, res, next) => {
    try {
      await storage.seedDefaultAccounts(req.user!.id);
      res.json({ message: "Default accounts seeded successfully" });
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // LEDGER ENTRIES MODULE
  // =====================================================

  app.get("/api/ledger/:module", requireAuth, async (req, res, next) => {
    try {
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      const entries = await storage.getLedgerEntriesByModule(req.params.module, propertyId);
      res.json(entries);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/ledger/entry/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      const entry = await storage.getLedgerEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Ledger entry not found" });
      }
      res.json(entry);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ledger", requireAuth, async (req, res, next) => {
    try {
      const { entry, lines } = req.body;
      const validatedEntry = insertLedgerEntrySchema.safeParse(entry);
      if (!validatedEntry.success) {
        return res.status(400).json({ message: validatedEntry.error.errors[0]?.message || "Invalid entry" });
      }
      const newEntry = await storage.createLedgerEntry(
        { ...validatedEntry.data, createdByUserId: req.user!.id },
        lines
      );
      res.status(201).json(newEntry);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ledger/:id/reverse", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }
      const reversed = await storage.reverseLedgerEntry(id, req.user!.id);
      if (!reversed) {
        return res.status(400).json({ message: "Cannot reverse this entry" });
      }
      res.json(reversed);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/accounts/:id/balance", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      const asOfDate = req.query.asOf ? new Date(req.query.asOf as string) : undefined;
      const balance = await storage.getAccountBalance(id, asOfDate);
      res.json(balance);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // UTILITY METERS MODULE
  // =====================================================

  app.get("/api/utility-meters", requireAuth, async (req, res, next) => {
    try {
      const meters = await storage.getAllMetersForUser(req.user!.id);
      res.json(meters);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/:propertyId/meters", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const meters = await storage.getMetersByPropertyId(propertyId);
      res.json(meters);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/meters/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const meter = await storage.getMeterById(id);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      res.json(meter);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/meters", requireAuth, async (req, res, next) => {
    try {
      const validation = insertUtilityMeterSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const access = await storage.canUserAccessProperty(validation.data.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const meter = await storage.createMeter(validation.data);
      res.status(201).json(meter);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/meters/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const updated = await storage.updateMeter(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/meters/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      await storage.deleteMeter(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Meter Readings
  app.get("/api/meters/:meterId/readings", requireAuth, async (req, res, next) => {
    try {
      const meterId = parseInt(req.params.meterId);
      if (isNaN(meterId)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const readings = await storage.getReadingsByMeterId(meterId);
      res.json(readings);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/meters/:meterId/readings", requireAuth, async (req, res, next) => {
    try {
      const meterId = parseInt(req.params.meterId);
      if (isNaN(meterId)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const validation = insertMeterReadingSchema.safeParse({ ...req.body, meterId });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const reading = await storage.createMeterReading({ ...validation.data, recordedByUserId: req.user!.id });
      res.status(201).json(reading);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // METER ASSIGNMENT MODULE
  // =====================================================

  app.get("/api/properties/:propertyId/meters-with-assignments", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const meters = await storage.getMetersWithAssignmentsByPropertyId(propertyId);
      res.json(meters);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/meters/:meterId/assignment-history", requireAuth, async (req, res, next) => {
    try {
      const meterId = parseInt(req.params.meterId);
      if (isNaN(meterId)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const meter = await storage.getMeterById(meterId);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      const access = await storage.canUserAccessProperty(meter.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const history = await storage.getMeterAssignmentHistory(meterId);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/meters/:meterId/outstanding-bills", requireAuth, async (req, res, next) => {
    try {
      const meterId = parseInt(req.params.meterId);
      if (isNaN(meterId)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const meter = await storage.getMeterById(meterId);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      const access = await storage.canUserAccessProperty(meter.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bills = await storage.getOutstandingBillsForMeter(meterId);
      res.json(bills);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/meters/:meterId/transfer", requireAuth, async (req, res, next) => {
    try {
      const meterId = parseInt(req.params.meterId);
      if (isNaN(meterId)) {
        return res.status(400).json({ message: "Invalid meter ID" });
      }
      const meter = await storage.getMeterById(meterId);
      if (!meter) {
        return res.status(404).json({ message: "Meter not found" });
      }
      const access = await storage.canUserAccessProperty(meter.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { newAssigneeType, newOwnerId, newTenantId, leaseId, finalMeterReading, settlementAmount, transferReason, notes, forceTran } = req.body;
      
      if (!newAssigneeType || !["OWNER", "TENANT"].includes(newAssigneeType)) {
        return res.status(400).json({ message: "Invalid assignee type" });
      }
      
      if (newAssigneeType === "OWNER" && !newOwnerId) {
        return res.status(400).json({ message: "Owner ID is required when assigning to owner" });
      }
      
      if (newAssigneeType === "TENANT" && !newTenantId) {
        return res.status(400).json({ message: "Tenant ID is required when assigning to tenant" });
      }
      
      const outstandingBills = await storage.getOutstandingBillsForMeter(meterId);
      if (outstandingBills.length > 0 && !forceTran) {
        return res.status(400).json({ 
          message: "Cannot transfer meter with outstanding bills. Settle all bills first or use forceTran=true.",
          outstandingBills,
          outstandingAmount: outstandingBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || "0") - parseFloat(bill.amountPaid || "0"), 0)
        });
      }
      
      const result = await storage.transferMeterAssignment(
        meterId,
        newAssigneeType,
        newAssigneeType === "OWNER" ? newOwnerId : null,
        newAssigneeType === "TENANT" ? newTenantId : null,
        req.user!.id,
        { leaseId, finalMeterReading, settlementAmount, transferReason, notes }
      );
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // UTILITY BILLS MODULE
  // =====================================================

  app.get("/api/properties/:propertyId/utility-bills", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bills = await storage.getUtilityBillsByPropertyId(propertyId);
      res.json(bills);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/utility-bills/pending", requireAuth, async (req, res, next) => {
    try {
      const bills = await storage.getPendingBillsByUserId(req.user!.id);
      res.json(bills);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/utility-bills/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      const bill = await storage.getUtilityBillById(id);
      if (!bill) {
        return res.status(404).json({ message: "Utility bill not found" });
      }
      const access = await storage.canUserAccessProperty(bill.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/utility-bills", requireAuth, async (req, res, next) => {
    try {
      const validation = insertUtilityBillSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const access = await storage.canUserAccessProperty(validation.data.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bill = await storage.createUtilityBill({ ...validation.data, recordedByUserId: req.user!.id });
      res.status(201).json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/utility-bills/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      const existingBill = await storage.getUtilityBillById(id);
      if (!existingBill) {
        return res.status(404).json({ message: "Utility bill not found" });
      }
      const access = await storage.canUserAccessProperty(existingBill.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateUtilityBill(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/utility-bills/:id/forward", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { tenantId } = req.body;
      if (isNaN(id) || !tenantId) {
        return res.status(400).json({ message: "Invalid bill ID or tenant ID" });
      }
      const existingBill = await storage.getUtilityBillById(id);
      if (!existingBill) {
        return res.status(404).json({ message: "Utility bill not found" });
      }
      const access = await storage.canUserAccessProperty(existingBill.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bill = await storage.forwardBillToTenant(id, tenantId);
      res.json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/utility-bills/:id/pay", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { amountPaid, paymentReference } = req.body;
      if (isNaN(id) || !amountPaid) {
        return res.status(400).json({ message: "Invalid bill ID or amount" });
      }
      const existingBill = await storage.getUtilityBillById(id);
      if (!existingBill) {
        return res.status(404).json({ message: "Utility bill not found" });
      }
      const access = await storage.canUserAccessProperty(existingBill.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bill = await storage.markBillAsPaid(id, amountPaid, paymentReference, req.user!.id);
      res.json(bill);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/utility-bills/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }
      const existingBill = await storage.getUtilityBillById(id);
      if (!existingBill) {
        return res.status(404).json({ message: "Utility bill not found" });
      }
      const access = await storage.canUserAccessProperty(existingBill.propertyId, req.user!.id);
      if (!access.canAccess || (!access.isOwner && access.role !== "EDITOR")) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteUtilityBill(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // LOANS MODULE
  // =====================================================

  app.get("/api/owners/:ownerId/loans", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const loans = await storage.getLoansByOwnerId(ownerId);
      res.json(loans);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/loans/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }
      const loan = await storage.getLoanById(id);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      res.json(loan);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loans", requireAuth, async (req, res, next) => {
    try {
      const validation = insertLoanSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const loan = await storage.createLoan({ ...validation.data, createdByUserId: req.user!.id });
      res.status(201).json(loan);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/loans/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }
      const updated = await storage.updateLoan(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/loans/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }
      await storage.deleteLoan(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loans/:id/schedule", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }
      const schedule = await storage.generateAmortizationSchedule(id);
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loans/:loanId/payments", requireAuth, async (req, res, next) => {
    try {
      const loanId = parseInt(req.params.loanId);
      if (isNaN(loanId)) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }
      const validation = insertLoanPaymentSchema.safeParse({ ...req.body, loanId });
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const payment = await storage.recordLoanPayment({ ...validation.data, recordedByUserId: req.user!.id });
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // ASSETS MODULE
  // =====================================================

  app.get("/api/owners/:ownerId/assets", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      const assets = await storage.getAssetsByOwnerId(ownerId);
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/:propertyId/assets", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const assets = await storage.getAssetsByPropertyId(propertyId);
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/assets/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      const asset = await storage.getAssetById(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/assets", requireAuth, async (req, res, next) => {
    try {
      const validation = insertAssetSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const asset = await storage.createAsset({ ...validation.data, createdByUserId: req.user!.id });
      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/assets/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      const updated = await storage.updateAsset(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/assets/:id/dispose", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      const { disposalDate, disposalAmount } = req.body;
      const disposed = await storage.disposeAsset(id, new Date(disposalDate), disposalAmount);
      res.json(disposed);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/assets/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      await storage.deleteAsset(id);
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  // Depreciation
  app.get("/api/depreciation-rules", requireAuth, async (req, res, next) => {
    try {
      const category = req.query.category as string | undefined;
      const rules = await storage.getDepreciationRules(category);
      res.json(rules);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/depreciation-rules", requireAuth, async (req, res, next) => {
    try {
      const validation = insertDepreciationRuleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0]?.message || "Invalid input" });
      }
      const rule = await storage.createDepreciationRule(validation.data);
      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/assets/:id/depreciate", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      const { runType, periodStart, periodEnd } = req.body;
      const run = await storage.runDepreciation(
        id,
        runType,
        new Date(periodStart),
        new Date(periodEnd),
        req.user!.id
      );
      res.status(201).json(run);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/assets/:id/depreciation-runs", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }
      const runs = await storage.getDepreciationRunsByAssetId(id);
      res.json(runs);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // REPORTS API
  // =====================================================

  // Property P&L Report
  app.get("/api/reports/property-pnl", requireAuth, async (req, res, next) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      
      const report = await storage.getPropertyPnLReport(req.user!.id, startDate, endDate, propertyId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  // Owner P&L Report
  app.get("/api/reports/owner-pnl", requireAuth, async (req, res, next) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined;
      
      const report = await storage.getOwnerPnLReport(req.user!.id, startDate, endDate, ownerId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  // Loan Amortization Schedule Report
  app.get("/api/reports/loan-schedule/:loanId", requireAuth, async (req, res, next) => {
    try {
      const loanId = parseInt(req.params.loanId);
      if (isNaN(loanId)) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }
      const schedule = await storage.getLoanScheduleReport(loanId);
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  // All Loans Summary Report
  app.get("/api/reports/loans-summary", requireAuth, async (req, res, next) => {
    try {
      const report = await storage.getLoansSummaryReport(req.user!.id);
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  // Depreciation Report
  app.get("/api/reports/depreciation", requireAuth, async (req, res, next) => {
    try {
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();
      const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined;
      const propertyId = req.query.propertyId ? parseInt(req.query.propertyId as string) : undefined;
      
      const report = await storage.getDepreciationReport(req.user!.id, asOfDate, ownerId, propertyId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard Summary Report
  app.get("/api/reports/dashboard-summary", requireAuth, async (req, res, next) => {
    try {
      const summary = await storage.getDashboardSummary(req.user!.id);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard Summary (alias for widgets)
  app.get("/api/dashboard/summary", requireAuth, async (req, res, next) => {
    try {
      const summary = await storage.getDashboardSummary(req.user!.id);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard Pending Tasks - aggregates actionable items across properties
  app.get("/api/dashboard/pending-tasks", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const propertyIds = await storage.getAccessiblePropertyIds(userId);
      
      const maintenanceIssues: any[] = [];
      const maintenanceTasks: any[] = [];
      
      for (const propertyId of propertyIds) {
        const issues = await storage.getIssuesByPropertyId(propertyId);
        const openIssues = issues.filter((i: any) => 
          i.status === "OPEN" || i.status === "IN_PROGRESS"
        );
        maintenanceIssues.push(...openIssues);
        
        const tasks = await storage.getTasksByPropertyId(propertyId);
        const pendingTasks = tasks.filter((t: any) => 
          t.status === "TODO" || t.status === "IN_PROGRESS"
        );
        maintenanceTasks.push(...pendingTasks);
      }
      
      const overdueInvoices: any[] = [];
      for (const propertyId of propertyIds) {
        const leases = await storage.getLeasesByPropertyId(propertyId);
        for (const lease of leases) {
          const invoices = await storage.getInvoicesByLeaseId(lease.id);
          const overdue = invoices.filter((inv: any) => inv.status === "OVERDUE");
          overdueInvoices.push(...overdue.map((inv: any) => ({
            ...inv,
            tenantName: lease.tenant?.legalName,
            propertyName: lease.property?.name,
          })));
        }
      }
      
      const complianceAlerts = await storage.getExpiringComplianceDocuments(userId, 30);
      
      res.json({
        maintenanceIssues: maintenanceIssues.slice(0, 10),
        maintenanceTasks: maintenanceTasks.slice(0, 10),
        overdueInvoices: overdueInvoices.slice(0, 10),
        complianceAlerts: complianceAlerts.slice(0, 10),
        counts: {
          openIssues: maintenanceIssues.length,
          pendingTasks: maintenanceTasks.length,
          overdueInvoices: overdueInvoices.length,
          complianceAlerts: complianceAlerts.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // DOCUMENTS API
  // =====================================================

  // Map frontend module names to database enum values for document queries
  const documentModuleMap: Record<string, string> = {
    "PROPERTY": "PROPERTY",
    "UNIT": "UNIT",
    "LEASE": "LEASE",
    "TENANT": "TENANT",
    "METER": "UTILITY_METER",
    "BILL": "UTILITY_BILL",
    "INVOICE": "PAYMENT",
    "PAYMENT": "PAYMENT",
    "MAINTENANCE_ISSUE": "MAINTENANCE_ISSUE",
    "MAINTENANCE_TASK": "MAINTENANCE_TASK",
    "LOAN": "LOAN",
    "ASSET": "ASSET",
    "OWNER": "OWNER",
    "REPORT": "REPORT",
  };

  // Helper function to verify user has access to a module's associated property
  async function verifyModuleAccess(module: string, moduleId: number, userId: number): Promise<{ hasAccess: boolean; propertyId: number | null; message?: string }> {
    try {
      switch (module) {
        case "PROPERTY": {
          const access = await storage.canUserAccessProperty(moduleId, userId);
          return { hasAccess: access.canAccess, propertyId: moduleId };
        }
        case "UNIT": {
          const unit = await storage.getUnitById(moduleId);
          if (!unit) return { hasAccess: false, propertyId: null, message: "Unit not found" };
          const access = await storage.canUserAccessProperty(unit.propertyId, userId);
          return { hasAccess: access.canAccess, propertyId: unit.propertyId };
        }
        case "LEASE": {
          const lease = await storage.getLeaseById(moduleId);
          if (!lease) return { hasAccess: false, propertyId: null, message: "Lease not found" };
          const access = await storage.canUserAccessProperty(lease.propertyId, userId);
          return { hasAccess: access.canAccess, propertyId: lease.propertyId };
        }
        case "TENANT": {
          const tenant = await storage.getTenantById(moduleId);
          if (!tenant) return { hasAccess: false, propertyId: null, message: "Tenant not found" };
          // Tenants belong to user directly
          if (tenant.userId !== userId) return { hasAccess: false, propertyId: null, message: "Access denied" };
          return { hasAccess: true, propertyId: null };
        }
        case "UTILITY_METER": {
          const meter = await storage.getMeterById(moduleId);
          if (!meter) return { hasAccess: false, propertyId: null, message: "Meter not found" };
          const access = await storage.canUserAccessProperty(meter.propertyId, userId);
          return { hasAccess: access.canAccess, propertyId: meter.propertyId };
        }
        case "UTILITY_BILL": {
          const bill = await storage.getUtilityBillById(moduleId);
          if (!bill) return { hasAccess: false, propertyId: null, message: "Bill not found" };
          const meter = await storage.getMeterById(bill.meterId);
          if (!meter) return { hasAccess: false, propertyId: null, message: "Meter not found" };
          const access = await storage.canUserAccessProperty(meter.propertyId, userId);
          return { hasAccess: access.canAccess, propertyId: meter.propertyId };
        }
        case "PAYMENT": {
          const payment = await storage.getPaymentById(moduleId);
          if (!payment) return { hasAccess: false, propertyId: null, message: "Payment not found" };
          // Payment uses polymorphic association with appliedToType and appliedToId
          // Check ownership based on what the payment is applied to
          if (payment.appliedToType === "RENT_INVOICE") {
            const invoice = await storage.getInvoiceById(payment.appliedToId);
            if (!invoice) return { hasAccess: false, propertyId: null, message: "Invoice not found" };
            const lease = await storage.getLeaseById(invoice.leaseId);
            if (!lease) return { hasAccess: false, propertyId: null, message: "Lease not found" };
            const access = await storage.canUserAccessProperty(lease.propertyId, userId);
            return { hasAccess: access.canAccess, propertyId: lease.propertyId };
          } else if (payment.appliedToType === "UTILITY_BILL") {
            const bill = await storage.getUtilityBillById(payment.appliedToId);
            if (!bill) return { hasAccess: false, propertyId: null, message: "Bill not found" };
            const meter = await storage.getMeterById(bill.meterId);
            if (!meter) return { hasAccess: false, propertyId: null, message: "Meter not found" };
            const access = await storage.canUserAccessProperty(meter.propertyId, userId);
            return { hasAccess: access.canAccess, propertyId: meter.propertyId };
          } else if (payment.appliedToType === "LOAN") {
            const loan = await storage.getLoanById(payment.appliedToId);
            if (!loan) return { hasAccess: false, propertyId: null, message: "Loan not found" };
            if (loan.propertyId) {
              const access = await storage.canUserAccessProperty(loan.propertyId, userId);
              return { hasAccess: access.canAccess, propertyId: loan.propertyId };
            }
            if (loan.userId !== userId) return { hasAccess: false, propertyId: null, message: "Access denied" };
            return { hasAccess: true, propertyId: null };
          }
          // For other payment types, check if user recorded the payment
          if (payment.recordedByUserId !== userId) return { hasAccess: false, propertyId: null, message: "Access denied" };
          return { hasAccess: true, propertyId: null };
        }
        case "MAINTENANCE_ISSUE": {
          const issue = await storage.getIssueById(moduleId);
          if (!issue) return { hasAccess: false, propertyId: null, message: "Issue not found" };
          const access = await storage.canUserAccessProperty(issue.propertyId, userId);
          return { hasAccess: access.canAccess, propertyId: issue.propertyId };
        }
        case "MAINTENANCE_TASK": {
          const task = await storage.getTaskById(moduleId);
          if (!task) return { hasAccess: false, propertyId: null, message: "Task not found" };
          const access = await storage.canUserAccessProperty(task.propertyId, userId);
          return { hasAccess: access.canAccess, propertyId: task.propertyId };
        }
        case "LOAN": {
          const loan = await storage.getLoanById(moduleId);
          if (!loan) return { hasAccess: false, propertyId: null, message: "Loan not found" };
          if (loan.propertyId) {
            const access = await storage.canUserAccessProperty(loan.propertyId, userId);
            return { hasAccess: access.canAccess, propertyId: loan.propertyId };
          }
          // Loan not linked to property - check if user owns it
          if (loan.userId !== userId) return { hasAccess: false, propertyId: null, message: "Access denied" };
          return { hasAccess: true, propertyId: null };
        }
        case "ASSET": {
          const asset = await storage.getAssetById(moduleId);
          if (!asset) return { hasAccess: false, propertyId: null, message: "Asset not found" };
          if (asset.propertyId) {
            const access = await storage.canUserAccessProperty(asset.propertyId, userId);
            return { hasAccess: access.canAccess, propertyId: asset.propertyId };
          }
          // Asset not linked to property - check if user owns it
          if (asset.userId !== userId) return { hasAccess: false, propertyId: null, message: "Access denied" };
          return { hasAccess: true, propertyId: null };
        }
        case "OWNER": {
          const owner = await storage.getOwnerById(moduleId);
          if (!owner) return { hasAccess: false, propertyId: null, message: "Owner not found" };
          if (owner.userId !== userId) return { hasAccess: false, propertyId: null, message: "Access denied" };
          return { hasAccess: true, propertyId: null };
        }
        default:
          return { hasAccess: false, propertyId: null, message: "Unknown module type" };
      }
    } catch (error) {
      console.error("Error verifying module access:", error);
      return { hasAccess: false, propertyId: null, message: "Error verifying access" };
    }
  }

  // Get documents by module and module ID
  app.get("/api/documents/:module/:moduleId", requireAuth, async (req, res, next) => {
    try {
      const { module, moduleId } = req.params;
      const mappedModule = documentModuleMap[module.toUpperCase()];
      if (!mappedModule) {
        return res.status(400).json({ message: "Invalid module type" });
      }
      const id = parseInt(moduleId);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      // Verify user has access to this module's property
      const access = await verifyModuleAccess(mappedModule, id, req.user!.id);
      if (!access.hasAccess) {
        return res.status(403).json({ message: access.message || "Access denied" });
      }

      const documents = await storage.getDocumentsByModule(mappedModule, id);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Get all documents for a property
  app.get("/api/properties/:propertyId/documents", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }
      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const documents = await storage.getDocumentsByPropertyId(propertyId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Get single document by ID
  app.get("/api/documents/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user has access to this document's module
      const access = await verifyModuleAccess(document.module, document.moduleId, req.user!.id);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(document);
    } catch (error) {
      next(error);
    }
  });

  // Map frontend module names to database enum values
  const moduleMap: Record<string, string> = {
    "PROPERTY": "PROPERTY",
    "UNIT": "UNIT",
    "LEASE": "LEASE",
    "TENANT": "TENANT",
    "METER": "UTILITY_METER",
    "BILL": "UTILITY_BILL",
    "INVOICE": "PAYMENT",
    "PAYMENT": "PAYMENT",
    "MAINTENANCE_ISSUE": "MAINTENANCE_ISSUE",
    "MAINTENANCE_TASK": "MAINTENANCE_TASK",
    "LOAN": "LOAN",
    "ASSET": "ASSET",
    "OWNER": "OWNER",
    "REPORT": "REPORT",
  };

  // Upload document
  app.post("/api/documents", requireAuth, documentUpload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { title, description, documentType, module, moduleId, propertyId } = req.body;

      if (!title || !documentType || !module || !moduleId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Missing required fields: title, documentType, module, moduleId" });
      }

      const validDocTypes = ["INVOICE", "RECEIPT", "PAYMENT_PROOF", "CONTRACT", "LEASE_AGREEMENT", "UTILITY_BILL_IMAGE", "MAINTENANCE_PHOTO", "ID_DOCUMENT", "PROPERTY_IMAGE", "WORK_ORDER", "QUOTE", "COMPLETION_CERTIFICATE", "REPORT", "OTHER"];
      if (!validDocTypes.includes(documentType.toUpperCase())) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Invalid document type" });
      }

      const mappedModule = moduleMap[module.toUpperCase()];
      if (!mappedModule) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Invalid module type" });
      }

      // Verify user has access to the module they're uploading to
      const moduleIdInt = parseInt(moduleId);
      const access = await verifyModuleAccess(mappedModule, moduleIdInt, req.user!.id);
      if (!access.hasAccess) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: access.message || "Access denied" });
      }

      // Use the resolved propertyId from access check, or the one provided if valid
      const resolvedPropertyId = access.propertyId || (propertyId ? parseInt(propertyId) : null);

      const document = await storage.createDocument({
        documentType: documentType.toUpperCase() as any,
        module: mappedModule as any,
        moduleId: moduleIdInt,
        propertyId: resolvedPropertyId,
        storagePath: req.file.path,
        fileName: req.file.filename,
        originalName: title,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        description: description || null,
        uploadedByUserId: req.user!.id,
      });

      res.status(201).json(document);
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });

  // Update document metadata
  app.patch("/api/documents/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user has access to this document's module
      const access = await verifyModuleAccess(document.module, document.moduleId, req.user!.id);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { title, description } = req.body;
      const updates: any = {};
      if (title !== undefined) updates.originalName = title;
      if (description !== undefined) updates.description = description;

      const updated = await storage.updateDocument(id, updates);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete document
  app.delete("/api/documents/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user has access to this document's module
      const access = await verifyModuleAccess(document.module, document.moduleId, req.user!.id);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete file from disk
      if (fs.existsSync(document.storagePath)) {
        fs.unlinkSync(document.storagePath);
      }

      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Generate share link for document
  app.post("/api/documents/:id/share", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user has access to this document's module
      const access = await verifyModuleAccess(document.module, document.moduleId, req.user!.id);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expiresInHours = req.body.expiresInHours || 24;
      const token = await storage.generateShareToken(id, expiresInHours);
      
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const shareUrl = `${baseUrl}/api/documents/shared/${token}`;
      
      res.json({ shareUrl, expiresInHours });
    } catch (error) {
      next(error);
    }
  });

  // Access shared document (public endpoint)
  app.get("/api/documents/shared/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      const document = await storage.getDocumentByShareToken(token);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found or link expired" });
      }

      // Send the file
      res.download(document.storagePath, document.originalName);
    } catch (error) {
      next(error);
    }
  });

  // Download document (authenticated)
  app.get("/api/documents/:id/download", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user has access to this document's module
      const access = await verifyModuleAccess(document.module, document.moduleId, req.user!.id);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!fs.existsSync(document.storagePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      res.download(document.storagePath, document.originalName);
    } catch (error) {
      next(error);
    }
  });

  // Serve uploaded documents (for inline viewing)
  app.use("/uploads/documents", express.static(documentsDir));

  // =====================================================
  // COMPLIANCE DOCUMENTS API
  // =====================================================

  // Get all compliance documents for user
  app.get("/api/compliance-documents", requireAuth, async (req, res, next) => {
    try {
      const documents = await storage.getComplianceDocumentsByUser(req.user!.id);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Get expiring documents
  app.get("/api/compliance-documents/expiring", requireAuth, async (req, res, next) => {
    try {
      const withinDays = req.query.days ? parseInt(req.query.days as string) : 30;
      const documents = await storage.getExpiringComplianceDocuments(req.user!.id, withinDays);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Get compliance documents by entity
  app.get("/api/compliance-documents/entity/:type/:id", requireAuth, async (req, res, next) => {
    try {
      const { type, id } = req.params;
      const entityId = parseInt(id);
      
      if (!["OWNER", "PROPERTY"].includes(type) || isNaN(entityId)) {
        return res.status(400).json({ message: "Invalid entity type or ID" });
      }

      // Verify access
      if (type === "OWNER") {
        const access = await storage.canUserAccessOwner(entityId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const access = await storage.canUserAccessProperty(entityId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const documents = await storage.getComplianceDocumentsByEntity(type as "OWNER" | "PROPERTY", entityId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Get single compliance document
  app.get("/api/compliance-documents/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getComplianceDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Compliance document not found" });
      }

      // Verify access based on entity
      if (document.entityType === "OWNER") {
        const access = await storage.canUserAccessOwner(document.entityId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const access = await storage.canUserAccessProperty(document.entityId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(document);
    } catch (error) {
      next(error);
    }
  });

  // Create compliance document
  app.post("/api/compliance-documents", requireAuth, async (req, res, next) => {
    try {
      // Preprocess date fields - convert empty strings to null
      const body = { ...req.body };
      if (body.issueDate === "") body.issueDate = null;
      if (body.expiryDate === "") body.expiryDate = null;

      const parseResult = insertComplianceDocumentSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.errors 
        });
      }

      const data = parseResult.data;

      // Verify access based on entity
      if (data.entityType === "OWNER") {
        const access = await storage.canUserAccessOwner(data.entityId, req.user!.id);
        if (!access.canAccess || access.role === "VIEWER") {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const access = await storage.canUserAccessProperty(data.entityId, req.user!.id);
        if (!access.canAccess || (access.role === "VIEWER" && !access.isOwner)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const document = await storage.createComplianceDocument({
        ...data,
        createdByUserId: req.user!.id,
      });
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  });

  // Update compliance document
  app.patch("/api/compliance-documents/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const existingDoc = await storage.getComplianceDocumentById(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Compliance document not found" });
      }

      // Verify access based on entity
      if (existingDoc.entityType === "OWNER") {
        const access = await storage.canUserAccessOwner(existingDoc.entityId, req.user!.id);
        if (!access.canAccess || access.role === "VIEWER") {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const access = await storage.canUserAccessProperty(existingDoc.entityId, req.user!.id);
        if (!access.canAccess || (access.role === "VIEWER" && !access.isOwner)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Preprocess date fields - convert empty strings to null
      const body = { ...req.body };
      if (body.issueDate === "") body.issueDate = null;
      if (body.expiryDate === "") body.expiryDate = null;

      const partialSchema = insertComplianceDocumentSchema.partial();
      const parseResult = partialSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.errors 
        });
      }

      const updated = await storage.updateComplianceDocument(id, parseResult.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete compliance document
  app.delete("/api/compliance-documents/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const existingDoc = await storage.getComplianceDocumentById(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Compliance document not found" });
      }

      // Verify access based on entity
      if (existingDoc.entityType === "OWNER") {
        const access = await storage.canUserAccessOwner(existingDoc.entityId, req.user!.id);
        if (!access.canAccess || access.role === "VIEWER") {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const access = await storage.canUserAccessProperty(existingDoc.entityId, req.user!.id);
        if (!access.canAccess || (access.role === "VIEWER" && !access.isOwner)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteComplianceDocument(id);
      res.json({ message: "Compliance document deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // ADMIN / RBAC API
  // =====================================================

  const superAdminMiddleware = requireSuperAdmin();

  // Get all roles with their permissions
  app.get("/api/admin/roles", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const allRoles = await storage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      next(error);
    }
  });

  // Get all permissions
  app.get("/api/admin/permissions", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const allPermissions = await storage.getAllPermissions();
      res.json(allPermissions);
    } catch (error) {
      next(error);
    }
  });

  // Get all users with their roles
  app.get("/api/admin/users", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      next(error);
    }
  });

  // Get a specific user with their roles
  app.get("/api/admin/users/:id", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const targetUser = await storage.getUserWithRoles(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(targetUser);
    } catch (error) {
      next(error);
    }
  });

  // Create a new user (admin only)
  app.post("/api/admin/users", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const { name, email, phone, password, accountType, organizationName, organizationType, roleAssignments } = req.body;
      
      if (!name || !email || !phone || !password) {
        return res.status(400).json({ message: "Name, email, phone, and password are required" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash the password
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(password);
      
      // Create the user
      const newUser = await storage.createUserByAdmin({
        name,
        email,
        phone,
        password: hashedPassword,
        accountType,
        organizationName,
        organizationType,
        createdByUserId: req.user!.id,
      });
      
      // Assign roles if provided
      if (roleAssignments && Array.isArray(roleAssignments)) {
        for (const assignment of roleAssignments) {
          if (assignment.roleId) {
            await storage.assignRoleToUser(
              newUser.id,
              assignment.roleId,
              assignment.propertyId || null,
              req.user!.id
            );
          }
        }
      }
      
      // Get the user with roles
      const userWithRoles = await storage.getUserWithRoles(newUser.id);
      res.status(201).json(userWithRoles);
    } catch (error) {
      next(error);
    }
  });

  // Update user active status (activate/deactivate)
  app.patch("/api/admin/users/:id/status", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Don't allow deactivating yourself
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot change your own status" });
      }
      
      const { isActive } = req.body;
      if (typeof isActive !== "number" || (isActive !== 0 && isActive !== 1)) {
        return res.status(400).json({ message: "isActive must be 0 or 1" });
      }
      
      const updated = await storage.updateUserActiveStatus(userId, isActive);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: `User ${isActive ? "activated" : "deactivated"} successfully` });
    } catch (error) {
      next(error);
    }
  });

  // Assign a role to a user
  app.post("/api/admin/users/:id/roles", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { roleId, propertyId } = req.body;
      if (!roleId || typeof roleId !== "number") {
        return res.status(400).json({ message: "roleId is required" });
      }
      
      // Verify the role exists
      const role = await storage.getRoleById(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // Verify the property exists if provided
      if (propertyId) {
        const property = await storage.getPropertyById(propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }
      }
      
      const assignment = await storage.assignRoleToUser(
        userId,
        roleId,
        propertyId || null,
        req.user!.id
      );
      
      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  });

  // Remove a role assignment from a user
  app.delete("/api/admin/role-assignments/:id", requireAuth, superAdminMiddleware, async (req, res, next) => {
    try {
      const assignmentId = parseInt(req.params.id);
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: "Invalid assignment ID" });
      }
      
      await storage.removeRoleFromUser(assignmentId);
      res.json({ message: "Role assignment removed successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Get current user's permissions
  app.get("/api/user/permissions", requireAuth, async (req, res, next) => {
    try {
      const { getUserPermissions } = await import("./rbac");
      const permissions = await getUserPermissions(req.user!.id);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // EXPENSES API
  // =====================================================

  // Get all expenses for current user
  app.get("/api/expenses", requireAuth, requirePermission("expense.view"), async (req, res, next) => {
    try {
      const expenses = await storage.getExpensesByUser(req.user!.id);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Get expenses by owner
  app.get("/api/expenses/owner/:ownerId", requireAuth, requirePermission("expense.view"), async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }

      const access = await storage.canUserAccessOwner(ownerId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expenses = await storage.getExpensesByOwnerId(ownerId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Get expenses by property
  app.get("/api/expenses/property/:propertyId", requireAuth, requirePermission("expense.view"), async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expenses = await storage.getExpensesByPropertyId(propertyId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Get expense summary by owner
  app.get("/api/expenses/summary/owner/:ownerId", requireAuth, async (req, res, next) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }

      const access = await storage.canUserAccessOwner(ownerId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const summary = await storage.getExpenseSummaryByOwner(ownerId, startDate, endDate);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // Get expense summary by property
  app.get("/api/expenses/summary/property/:propertyId", requireAuth, async (req, res, next) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ message: "Invalid property ID" });
      }

      const access = await storage.canUserAccessProperty(propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const summary = await storage.getExpenseSummaryByProperty(propertyId, startDate, endDate);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // Get single expense by ID
  app.get("/api/expenses/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }

      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const access = await storage.canUserAccessOwner(expense.ownerId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(expense);
    } catch (error) {
      next(error);
    }
  });

  // Get expenses linked to a maintenance issue
  app.get("/api/expenses/maintenance-issue/:issueId", requireAuth, async (req, res, next) => {
    try {
      const issueId = parseInt(req.params.issueId);
      if (isNaN(issueId)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }

      const issue = await storage.getIssueById(issueId);
      if (!issue) {
        return res.status(404).json({ message: "Maintenance issue not found" });
      }

      const access = await storage.canUserAccessProperty(issue.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expenses = await storage.getExpensesByMaintenanceIssue(issueId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Get expenses linked to a maintenance task
  app.get("/api/expenses/maintenance-task/:taskId", requireAuth, async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ message: "Maintenance task not found" });
      }

      const issue = await storage.getIssueById(task.issueId);
      if (!issue) {
        return res.status(404).json({ message: "Related maintenance issue not found" });
      }

      const access = await storage.canUserAccessProperty(issue.propertyId, req.user!.id);
      if (!access.canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expenses = await storage.getExpensesByMaintenanceTask(taskId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Get expenses linked to a compliance document
  app.get("/api/expenses/compliance-document/:docId", requireAuth, async (req, res, next) => {
    try {
      const docId = parseInt(req.params.docId);
      if (isNaN(docId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const doc = await storage.getComplianceDocumentById(docId);
      if (!doc) {
        return res.status(404).json({ message: "Compliance document not found" });
      }

      if (doc.entityType === "OWNER") {
        const access = await storage.canUserAccessOwner(doc.entityId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const access = await storage.canUserAccessProperty(doc.entityId, req.user!.id);
        if (!access.canAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const expenses = await storage.getExpensesByComplianceDocument(docId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  // Create a new expense
  app.post("/api/expenses", requireAuth, requirePermission("expense.create"), async (req, res, next) => {
    try {
      const body = { ...req.body };
      if (body.expenseDate) body.expenseDate = new Date(body.expenseDate);
      if (body.dueDate === "") body.dueDate = null;
      if (body.dueDate) body.dueDate = new Date(body.dueDate);
      if (body.paymentDate === "") body.paymentDate = null;
      if (body.paymentDate) body.paymentDate = new Date(body.paymentDate);

      const parseResult = insertExpenseSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.errors 
        });
      }

      const data = parseResult.data;

      const access = await storage.canUserAccessOwner(data.ownerId, req.user!.id);
      if (!access.canAccess || access.role === "VIEWER") {
        return res.status(403).json({ message: "Access denied" });
      }

      if (data.propertyId) {
        const propAccess = await storage.canUserAccessProperty(data.propertyId, req.user!.id);
        if (!propAccess.canAccess) {
          return res.status(403).json({ message: "Access denied to the specified property" });
        }
      }

      const expense = await storage.createExpense({
        ...data,
        createdByUserId: req.user!.id,
      });
      res.status(201).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // Update an expense
  app.patch("/api/expenses/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }

      const existingExpense = await storage.getExpenseById(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const access = await storage.canUserAccessOwner(existingExpense.ownerId, req.user!.id);
      if (!access.canAccess || access.role === "VIEWER") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check for approval status change - requires expense.approve permission
      const userPerms = await getUserPermissions(req.user!.id);
      const isApprovalChange = req.body.approvalStatus && req.body.approvalStatus !== existingExpense.approvalStatus;
      
      if (isApprovalChange) {
        if (!hasPermission(userPerms, "expense.approve")) {
          return res.status(403).json({ message: "You don't have permission to approve or reject expenses" });
        }
      } else {
        // Regular edit requires expense.edit permission
        if (!hasPermission(userPerms, "expense.edit") && !hasPermission(userPerms, "expense.create")) {
          return res.status(403).json({ message: "You don't have permission to edit expenses" });
        }
      }

      const body = { ...req.body };
      if (body.expenseDate) body.expenseDate = new Date(body.expenseDate);
      if (body.dueDate === "") body.dueDate = null;
      if (body.dueDate) body.dueDate = new Date(body.dueDate);
      if (body.paymentDate === "") body.paymentDate = null;
      if (body.paymentDate) body.paymentDate = new Date(body.paymentDate);

      const partialSchema = insertExpenseSchema.partial();
      const parseResult = partialSchema.safeParse(body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.errors 
        });
      }

      const updated = await storage.updateExpense(id, parseResult.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Update expense payment status
  app.post("/api/expenses/:id/payment", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }

      const existingExpense = await storage.getExpenseById(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const access = await storage.canUserAccessOwner(existingExpense.ownerId, req.user!.id);
      if (!access.canAccess || access.role === "VIEWER") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { paymentStatus, paymentMethod, paymentDate, paymentReference } = req.body;
      
      if (!paymentStatus) {
        return res.status(400).json({ message: "paymentStatus is required" });
      }

      const updated = await storage.updateExpensePayment(
        id, 
        paymentStatus, 
        paymentMethod, 
        paymentDate ? new Date(paymentDate) : undefined, 
        paymentReference
      );
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete an expense
  app.delete("/api/expenses/:id", requireAuth, requirePermission("expense.delete"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }

      const existingExpense = await storage.getExpenseById(id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const access = await storage.canUserAccessOwner(existingExpense.ownerId, req.user!.id);
      if (!access.canAccess || access.role === "VIEWER") {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteExpense(id);
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Expense attachments upload
  app.post("/api/expenses/:id/attachments", requireAuth, expenseAttachmentUpload.array("files", 10), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }

      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const access = await storage.canUserAccessOwner(expense.ownerId, req.user!.id);
      if (!access.canAccess || access.role === "VIEWER") {
        return res.status(403).json({ message: "Access denied" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const newAttachmentUrls = files.map((file) => `/uploads/expense-attachments/${file.filename}`);
      const updatedAttachments = [...(expense.attachments || []), ...newAttachmentUrls];

      const updated = await storage.updateExpense(id, { attachments: updatedAttachments });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete expense attachment
  app.delete("/api/expenses/:id/attachments", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { url } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }

      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const access = await storage.canUserAccessOwner(expense.ownerId, req.user!.id);
      if (!access.canAccess || access.role === "VIEWER") {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedAttachments = (expense.attachments || []).filter(a => a !== url);
      
      // Delete file from disk
      if (url.startsWith("/uploads/expense-attachments/")) {
        const filename = url.replace("/uploads/expense-attachments/", "");
        const filePath = path.join(expenseAttachmentsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const updated = await storage.updateExpense(id, { attachments: updatedAttachments });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Serve expense attachments
  app.use("/uploads/expense-attachments", express.static(expenseAttachmentsDir));

  // =====================================================
  // DASHBOARD LAYOUT API
  // =====================================================

  // Get effective dashboard layout for current user
  app.get("/api/dashboard/layout", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      
      // Check for user-specific layout first
      const userLayout = await storage.getDashboardLayoutByUser(userId);
      if (userLayout) {
        return res.json({
          layoutId: userLayout.id,
          layoutName: userLayout.name,
          source: "USER",
          widgets: userLayout.widgets,
        });
      }

      // Fall back to role-based layout
      const userRoleId = await storage.getUserPrimaryRoleId(userId);
      if (userRoleId) {
        const roleLayout = await storage.getDefaultLayoutForRole(userRoleId);
        if (roleLayout) {
          return res.json({
            layoutId: roleLayout.id,
            layoutName: roleLayout.name,
            source: "ROLE",
            widgets: roleLayout.widgets,
          });
        }
      }

      // Return default layout (computed on client based on permissions)
      res.json({
        layoutId: null,
        layoutName: "Default Layout",
        source: "DEFAULT",
        widgets: [],
      });
    } catch (error) {
      next(error);
    }
  });

  // Get all dashboard layouts (admin only)
  app.get("/api/dashboard/layouts", requireAuth, requirePermission("dashboard.manage"), async (req, res, next) => {
    try {
      const layouts = await storage.getAllDashboardLayouts();
      res.json(layouts);
    } catch (error) {
      next(error);
    }
  });

  // Get dashboard layout by ID
  app.get("/api/dashboard/layouts/:id", requireAuth, requirePermission("dashboard.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid layout ID" });
      }

      const layout = await storage.getDashboardLayoutById(id);
      if (!layout) {
        return res.status(404).json({ message: "Layout not found" });
      }

      res.json(layout);
    } catch (error) {
      next(error);
    }
  });

  // Create dashboard layout (admin only)
  app.post("/api/dashboard/layouts", requireAuth, requirePermission("dashboard.manage"), async (req, res, next) => {
    try {
      const { name, scope, roleId, userId, widgets, isDefault } = req.body;

      if (!name || !scope || !widgets) {
        return res.status(400).json({ message: "Name, scope, and widgets are required" });
      }

      if (scope === "ROLE" && !roleId) {
        return res.status(400).json({ message: "Role ID is required for role-scoped layouts" });
      }

      if (scope === "USER" && !userId) {
        return res.status(400).json({ message: "User ID is required for user-scoped layouts" });
      }

      const layout = await storage.createDashboardLayout({
        name,
        scope,
        roleId: scope === "ROLE" ? roleId : null,
        userId: scope === "USER" ? userId : null,
        widgets,
        isDefault: isDefault ? 1 : 0,
        createdByUserId: req.user!.id,
      });

      res.status(201).json(layout);
    } catch (error) {
      next(error);
    }
  });

  // Update dashboard layout (admin only)
  app.patch("/api/dashboard/layouts/:id", requireAuth, requirePermission("dashboard.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid layout ID" });
      }

      const existing = await storage.getDashboardLayoutById(id);
      if (!existing) {
        return res.status(404).json({ message: "Layout not found" });
      }

      const { name, widgets, isDefault } = req.body;
      const updated = await storage.updateDashboardLayout(id, {
        name,
        widgets,
        isDefault: isDefault !== undefined ? (isDefault ? 1 : 0) : undefined,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete dashboard layout (admin only)
  app.delete("/api/dashboard/layouts/:id", requireAuth, requirePermission("dashboard.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid layout ID" });
      }

      const existing = await storage.getDashboardLayoutById(id);
      if (!existing) {
        return res.status(404).json({ message: "Layout not found" });
      }

      await storage.deleteDashboardLayout(id);
      res.json({ message: "Layout deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Get all roles (for admin to assign layouts)
  app.get("/api/dashboard/roles", requireAuth, requirePermission("dashboard.manage"), async (req, res, next) => {
    try {
      const allRoles = await storage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // EXCHANGE RATES API
  // =====================================================

  // Get all exchange rates
  app.get("/api/exchange-rates", requireAuth, async (req, res, next) => {
    try {
      const rates = await storage.getAllExchangeRates();
      res.json(rates);
    } catch (error) {
      next(error);
    }
  });

  // Get active exchange rates
  app.get("/api/exchange-rates/active", requireAuth, async (req, res, next) => {
    try {
      const rates = await storage.getActiveExchangeRates();
      res.json(rates);
    } catch (error) {
      next(error);
    }
  });

  // Get specific exchange rate for conversion
  app.get("/api/exchange-rates/convert", requireAuth, async (req, res, next) => {
    try {
      const { from, to, amount, date } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({ message: "from and to currencies are required" });
      }

      const targetDate = date ? new Date(date as string) : new Date();
      const amountNum = amount ? parseFloat(amount as string) : 1;

      const result = await storage.convertAmount(amountNum, from as string, to as string, targetDate);
      
      if (!result) {
        return res.status(404).json({ message: "Exchange rate not found for the given currency pair" });
      }

      res.json({
        from,
        to,
        amount: amountNum,
        convertedAmount: result.convertedAmount,
        rate: result.rate,
        date: targetDate.toISOString().split('T')[0]
      });
    } catch (error) {
      next(error);
    }
  });

  // Get exchange rate by ID
  app.get("/api/exchange-rates/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid exchange rate ID" });
      }

      const rate = await storage.getExchangeRateById(id);
      if (!rate) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }

      res.json(rate);
    } catch (error) {
      next(error);
    }
  });

  // Create exchange rate (admin only)
  app.post("/api/exchange-rates", requireAuth, requirePermission("finance.manage_accounts"), async (req, res, next) => {
    try {
      const { baseCurrency, quoteCurrency, rate, effectiveDate, source, isActive } = req.body;

      if (!baseCurrency || !quoteCurrency || !rate || !effectiveDate) {
        return res.status(400).json({ message: "baseCurrency, quoteCurrency, rate, and effectiveDate are required" });
      }

      const created = await storage.createExchangeRate({
        baseCurrency,
        quoteCurrency,
        rate: rate.toString(),
        effectiveDate,
        source: source || "MANUAL",
        isActive: isActive ?? 1,
        createdByUserId: req.user!.id
      });

      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  // Update exchange rate
  app.patch("/api/exchange-rates/:id", requireAuth, requirePermission("finance.manage_accounts"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid exchange rate ID" });
      }

      const existing = await storage.getExchangeRateById(id);
      if (!existing) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }

      const { rate, effectiveDate, source, isActive } = req.body;
      const updated = await storage.updateExchangeRate(id, {
        rate: rate?.toString(),
        effectiveDate,
        source,
        isActive
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete exchange rate
  app.delete("/api/exchange-rates/:id", requireAuth, requirePermission("finance.manage_accounts"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid exchange rate ID" });
      }

      const existing = await storage.getExchangeRateById(id);
      if (!existing) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }

      await storage.deleteExchangeRate(id);
      res.json({ message: "Exchange rate deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Get supported currencies list
  app.get("/api/currencies", requireAuth, async (req, res, next) => {
    try {
      const currencies = [
        { code: "USD", name: "US Dollar", symbol: "$" },
        { code: "EUR", name: "Euro", symbol: "€" },
        { code: "GBP", name: "British Pound", symbol: "£" },
        { code: "INR", name: "Indian Rupee", symbol: "₹" },
        { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
        { code: "SCR", name: "Seychellois Rupee", symbol: "₨" },
        { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
        { code: "AUD", name: "Australian Dollar", symbol: "A$" },
        { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
        { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
        { code: "JPY", name: "Japanese Yen", symbol: "¥" },
        { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
        { code: "ZAR", name: "South African Rand", symbol: "R" },
        { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
        { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
        { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
        { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
        { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
        { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
        { code: "OMR", name: "Omani Rial", symbol: "﷼" },
        { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
        { code: "THB", name: "Thai Baht", symbol: "฿" },
        { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
        { code: "PHP", name: "Philippine Peso", symbol: "₱" },
        { code: "MXN", name: "Mexican Peso", symbol: "$" },
        { code: "BRL", name: "Brazilian Real", symbol: "R$" },
        { code: "RUB", name: "Russian Ruble", symbol: "₽" },
        { code: "KRW", name: "South Korean Won", symbol: "₩" },
        { code: "TRY", name: "Turkish Lira", symbol: "₺" },
        { code: "PKR", name: "Pakistani Rupee", symbol: "₨" }
      ];
      res.json(currencies);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // INVENTORY MODULE ROUTES
  // =====================================================

  // Inventory Categories
  app.get("/api/inventory/categories", requireAuth, async (req, res, next) => {
    try {
      const categories = await storage.getAllInventoryCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inventory/categories/tree", requireAuth, async (req, res, next) => {
    try {
      const tree = await storage.getInventoryCategoriesTree();
      res.json(tree);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inventory/categories/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const category = await storage.getInventoryCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/inventory/categories", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const { name, description, parentId, itemType, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }
      const category = await storage.createInventoryCategory({
        name,
        description,
        parentId: parentId || null,
        itemType: itemType && itemType !== "" ? itemType : undefined,
        sortOrder: sortOrder ?? 0
      });
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/inventory/categories/:id", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const existing = await storage.getInventoryCategoryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Category not found" });
      }
      const { name, description, parentId, itemType, sortOrder } = req.body;
      const updated = await storage.updateInventoryCategory(id, {
        name,
        description,
        parentId,
        itemType: itemType === "" ? null : itemType,
        sortOrder
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/inventory/categories/:id", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const existing = await storage.getInventoryCategoryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Category not found" });
      }
      await storage.deleteInventoryCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Warehouse Locations
  app.get("/api/inventory/warehouses", requireAuth, async (req, res, next) => {
    try {
      const warehouses = await storage.getAllWarehouseLocations();
      res.json(warehouses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inventory/warehouses/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid warehouse ID" });
      }
      const warehouse = await storage.getWarehouseLocationById(id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/inventory/warehouses", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const { name, address, description, isActive } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Warehouse name is required" });
      }
      const warehouse = await storage.createWarehouseLocation({
        name,
        address,
        description,
        isActive: isActive ?? 1
      });
      res.status(201).json(warehouse);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/inventory/warehouses/:id", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid warehouse ID" });
      }
      const existing = await storage.getWarehouseLocationById(id);
      if (!existing) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      const { name, address, description, isActive } = req.body;
      const updated = await storage.updateWarehouseLocation(id, {
        name,
        address,
        description,
        isActive
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/inventory/warehouses/:id", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid warehouse ID" });
      }
      const existing = await storage.getWarehouseLocationById(id);
      if (!existing) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      await storage.deleteWarehouseLocation(id);
      res.json({ message: "Warehouse deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Inventory Items
  app.get("/api/inventory/items", requireAuth, async (req, res, next) => {
    try {
      const { propertyId, warehouseId, categoryId } = req.query;
      let items;
      if (propertyId) {
        items = await storage.getInventoryItemsByProperty(parseInt(propertyId as string));
      } else if (warehouseId) {
        items = await storage.getInventoryItemsByWarehouse(parseInt(warehouseId as string));
      } else if (categoryId) {
        items = await storage.getInventoryItemsByCategory(parseInt(categoryId as string));
      } else {
        items = await storage.getAllInventoryItems();
      }
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/inventory/items/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const item = await storage.getInventoryItemWithDetails(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/inventory/items", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const user = req.user as any;
      const { itemType, name, description, sku, serialNumber, unitCost, reorderLevel, status, warehouseId, propertyId, categoryId, quantity, notes } = req.body;
      
      if (!itemType || !name) {
        return res.status(400).json({ message: "Item type and name are required" });
      }
      
      const item = await storage.createInventoryItem({
        itemType,
        name,
        description: description || undefined,
        sku: sku || undefined,
        serialNumber: serialNumber || undefined,
        unitCost: unitCost && unitCost !== "" ? unitCost.toString() : undefined,
        reorderLevel: reorderLevel ?? 0,
        status: status || "AVAILABLE",
        warehouseId: warehouseId || undefined,
        propertyId: propertyId || undefined,
        categoryId: categoryId || undefined,
        quantity: quantity ?? 1,
        notes: notes || undefined,
        createdByUserId: user.id
      });
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/inventory/items/:id", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const existing = await storage.getInventoryItemById(id);
      if (!existing) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      const { itemType, name, description, sku, serialNumber, unitCost, reorderLevel, status, warehouseId, propertyId, categoryId, quantity, notes } = req.body;
      const updated = await storage.updateInventoryItem(id, {
        itemType,
        name,
        description,
        sku,
        serialNumber,
        unitCost: unitCost?.toString(),
        reorderLevel,
        status,
        warehouseId,
        propertyId,
        categoryId,
        quantity,
        notes
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/inventory/items/:id", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const existing = await storage.getInventoryItemById(id);
      if (!existing) {
        return res.status(404).json({ message: "Item not found" });
      }
      await storage.deleteInventoryItem(id);
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Issue inventory item (assign to property/tenant)
  app.post("/api/inventory/items/:id/issue", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const user = req.user as any;
      const { propertyId, unitId, tenantId, quantity, notes } = req.body;
      
      const movement = await storage.issueInventoryItem(id, {
        propertyId,
        unitId,
        tenantId,
        quantity: quantity || 1,
        notes,
        performedByUserId: user.id
      });
      res.status(201).json(movement);
    } catch (error) {
      next(error);
    }
  });

  // Return inventory item (back to warehouse)
  app.post("/api/inventory/items/:id/return", requireAuth, requirePermission("maintenance.manage_materials"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const user = req.user as any;
      const { warehouseId, quantity, conditionAfter, damageNotes, notes } = req.body;
      
      const movement = await storage.returnInventoryItem(id, {
        warehouseId,
        quantity: quantity || 1,
        conditionAfter,
        damageNotes,
        notes,
        performedByUserId: user.id
      });
      res.status(201).json(movement);
    } catch (error) {
      next(error);
    }
  });

  // Get inventory movements for an item
  app.get("/api/inventory/items/:id/movements", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const movements = await storage.getInventoryMovementsByItem(id);
      res.json(movements);
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // TENANT ONBOARDING ROUTES
  // =====================================================

  // Get all onboarding processes
  app.get("/api/onboarding", requireAuth, async (req, res, next) => {
    try {
      const processes = await storage.getAllOnboardingProcesses();
      res.json(processes);
    } catch (error) {
      next(error);
    }
  });

  // Get onboarding process by ID
  app.get("/api/onboarding/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const process = await storage.getOnboardingProcessWithDetails(id);
      if (!process) {
        return res.status(404).json({ message: "Onboarding process not found" });
      }
      res.json(process);
    } catch (error) {
      next(error);
    }
  });

  // Get onboarding by lease
  app.get("/api/leases/:leaseId/onboarding", requireAuth, async (req, res, next) => {
    try {
      const leaseId = parseInt(req.params.leaseId);
      if (isNaN(leaseId)) {
        return res.status(400).json({ message: "Invalid lease ID" });
      }
      const process = await storage.getOnboardingProcessByLease(leaseId);
      res.json(process || null);
    } catch (error) {
      next(error);
    }
  });

  // Get onboarding processes by tenant
  app.get("/api/tenants/:tenantId/onboarding", requireAuth, async (req, res, next) => {
    try {
      const tenantId = parseInt(req.params.tenantId);
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: "Invalid tenant ID" });
      }
      const processes = await storage.getOnboardingProcessesByTenant(tenantId);
      res.json(processes);
    } catch (error) {
      next(error);
    }
  });

  // Create onboarding process
  app.post("/api/onboarding", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const user = req.user as any;
      const { leaseId, tenantId, propertyId, unitId, notes } = req.body;
      
      if (!leaseId || !tenantId || !propertyId) {
        return res.status(400).json({ message: "Lease ID, tenant ID, and property ID are required" });
      }

      // Check if onboarding already exists for this lease
      const existing = await storage.getOnboardingProcessByLease(leaseId);
      if (existing) {
        return res.status(400).json({ message: "Onboarding process already exists for this lease" });
      }

      const process = await storage.createOnboardingProcess({
        leaseId,
        tenantId,
        propertyId,
        unitId: unitId || undefined,
        notes: notes || undefined,
        createdByUserId: user.id
      });
      res.status(201).json(process);
    } catch (error) {
      next(error);
    }
  });

  // Update onboarding process
  app.patch("/api/onboarding/:id", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const existing = await storage.getOnboardingProcessById(id);
      if (!existing) {
        return res.status(404).json({ message: "Onboarding process not found" });
      }
      const updated = await storage.updateOnboardingProcess(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Update onboarding stage (advance to next stage)
  app.post("/api/onboarding/:id/stage", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const { stage } = req.body;
      if (!stage) {
        return res.status(400).json({ message: "Stage is required" });
      }
      const updated = await storage.updateOnboardingStage(id, stage, new Date());
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete onboarding process
  app.delete("/api/onboarding/:id", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      await storage.deleteOnboardingProcess(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Check and auto-advance onboarding stage
  app.post("/api/onboarding/:id/auto-advance", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      
      const process = await storage.getOnboardingProcessById(id);
      if (!process) {
        return res.status(404).json({ message: "Onboarding process not found" });
      }

      let advanced = false;
      let newStage = process.currentStage;

      // Auto-advance logic based on current stage
      if (process.currentStage === 'INSPECTION_SCHEDULED') {
        // Check if inspection is complete (has checklist items and no pending items)
        const checklistItems = await storage.getChecklistItemsByOnboarding(id);
        if (checklistItems.length > 0) {
          // All items have been inspected
          await storage.updateOnboardingStage(id, 'INSPECTION_COMPLETED', new Date());
          advanced = true;
          newStage = 'INSPECTION_COMPLETED';
        }
      } else if (process.currentStage === 'HANDOVER_SCHEDULED') {
        // Check if handover is complete (all items acknowledged by tenant)
        const handoverItems = await storage.getHandoverItemsByOnboarding(id);
        if (handoverItems.length > 0) {
          const allAcknowledged = handoverItems.every((item: any) => item.acknowledgedByTenant === 1);
          if (allAcknowledged) {
            await storage.updateOnboardingStage(id, 'HANDOVER_COMPLETED', new Date());
            advanced = true;
            newStage = 'HANDOVER_COMPLETED';
          }
        }
      }

      const updated = await storage.getOnboardingProcessById(id);
      res.json({ 
        advanced, 
        previousStage: process.currentStage, 
        currentStage: newStage,
        process: updated 
      });
    } catch (error) {
      next(error);
    }
  });

  // =====================================================
  // CONDITION CHECKLIST ROUTES
  // =====================================================

  // Get checklist items for onboarding
  app.get("/api/onboarding/:id/checklist", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const items = await storage.getChecklistItemsByOnboarding(id);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  // Create checklist item
  app.post("/api/onboarding/:id/checklist", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const onboardingId = parseInt(req.params.id);
      if (isNaN(onboardingId)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const user = req.user as any;
      const { roomType, roomName, itemName, itemDescription, conditionRating, conditionNotes, photos, hasDamage, damageDescription, estimatedRepairCost } = req.body;
      
      if (!roomType || !itemName || !conditionRating) {
        return res.status(400).json({ message: "Room type, item name, and condition rating are required" });
      }

      const item = await storage.createChecklistItem({
        onboardingId,
        roomType,
        roomName: roomName || undefined,
        itemName,
        itemDescription: itemDescription || undefined,
        conditionRating,
        conditionNotes: conditionNotes || undefined,
        photos: photos || [],
        hasDamage: hasDamage || 0,
        damageDescription: damageDescription || undefined,
        estimatedRepairCost: estimatedRepairCost ? String(estimatedRepairCost) : undefined,
        inspectedByUserId: user.id
      });
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  // Update checklist item
  app.patch("/api/onboarding/checklist/:itemId", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const updated = await storage.updateChecklistItem(itemId, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete checklist item
  app.delete("/api/onboarding/checklist/:itemId", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      await storage.deleteChecklistItem(itemId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Upload photos to checklist item
  app.post("/api/onboarding/checklist/:itemId/photos", requireAuth, requirePermission("tenant.manage"), onboardingPhotoUpload.array("photos", 10), async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const item = await storage.getChecklistItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const newPhotoUrls = files.map((file) => `/uploads/onboarding-photos/${file.filename}`);
      const updatedPhotos = [...(item.photos || []), ...newPhotoUrls];

      const updated = await storage.updateChecklistItem(itemId, { photos: updatedPhotos });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete a photo from checklist item
  app.delete("/api/onboarding/checklist/:itemId/photos", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { url } = req.body;
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      if (!url) {
        return res.status(400).json({ message: "Photo URL is required" });
      }

      const item = await storage.getChecklistItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }

      const updatedPhotos = (item.photos || []).filter((p) => p !== url);
      
      // Delete file from disk
      if (url.startsWith("/uploads/onboarding-photos/")) {
        const filename = url.replace("/uploads/onboarding-photos/", "");
        const filePath = path.join(onboardingPhotosDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const updated = await storage.updateChecklistItem(itemId, { photos: updatedPhotos });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Serve onboarding photos
  app.use("/uploads/onboarding-photos", express.static(onboardingPhotosDir));

  // =====================================================
  // HANDOVER ITEMS ROUTES
  // =====================================================

  // Get handover items for onboarding
  app.get("/api/onboarding/:id/handover", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const items = await storage.getHandoverItemsByOnboarding(id);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  // Create handover item
  app.post("/api/onboarding/:id/handover", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const onboardingId = parseInt(req.params.id);
      if (isNaN(onboardingId)) {
        return res.status(400).json({ message: "Invalid onboarding ID" });
      }
      const user = req.user as any;
      const { inventoryItemId, quantity, conditionAtHandover, conditionNotes, photos } = req.body;
      
      if (!inventoryItemId || !conditionAtHandover) {
        return res.status(400).json({ message: "Inventory item ID and condition at handover are required" });
      }

      const item = await storage.createHandoverItem({
        onboardingId,
        inventoryItemId,
        quantity: quantity || 1,
        conditionAtHandover,
        conditionNotes: conditionNotes || undefined,
        photos: photos || [],
        handedOverByUserId: user.id
      });
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  // Update handover item (e.g., mark as acknowledged or returned)
  app.patch("/api/onboarding/handover/:itemId", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      const updated = await storage.updateHandoverItem(itemId, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Delete handover item
  app.delete("/api/onboarding/handover/:itemId", requireAuth, requirePermission("tenant.manage"), async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      await storage.deleteHandoverItem(itemId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return httpServer;
}
