import { 
  users, 
  properties, 
  units,
  type User, 
  type InsertUser, 
  type Property,
  type InsertProperty,
  type Unit,
  type InsertUnit 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getPropertiesByUserId(userId: number): Promise<(Property & { units: Unit[] })[]>;
  getPropertyById(id: number): Promise<(Property & { units: Unit[] }) | undefined>;
  createProperty(property: InsertProperty & { ownerUserId: number; ownerOrgName?: string | null }): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<void>;
  
  getUnitsByPropertyId(propertyId: number): Promise<Unit[]>;
  getUnitById(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<void>;
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

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property | undefined> {
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
}

export const storage = new DatabaseStorage();
