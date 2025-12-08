import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
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
  insertDepreciationRuleSchema
} from "@shared/schema";

const uploadDir = path.join(process.cwd(), "uploads", "properties");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const documentsDir = path.join(process.cwd(), "uploads", "documents");
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
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
      const bill = await storage.markBillAsPaid(id, amountPaid, paymentReference);
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

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return httpServer;
}
