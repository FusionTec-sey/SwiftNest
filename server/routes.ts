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
  insertMaintenanceScheduleSchema
} from "@shared/schema";

const uploadDir = path.join(process.cwd(), "uploads", "properties");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return httpServer;
}
