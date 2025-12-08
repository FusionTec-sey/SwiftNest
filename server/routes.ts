import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { insertPropertySchema, insertUnitSchema } from "@shared/schema";

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

      if (property.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(property);
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

      if (existing.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
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

      if (property.ownerUserId !== req.user!.id) {
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

      const property = await storage.getPropertyById(unit.propertyId);
      if (!property || property.ownerUserId !== req.user!.id) {
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

      const property = await storage.getPropertyById(unit.propertyId);
      if (!property || property.ownerUserId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteUnit(id);
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
