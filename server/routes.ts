import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { insertPropertySchema, insertUnitSchema, sharePropertySchema } from "@shared/schema";

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

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  return httpServer;
}
