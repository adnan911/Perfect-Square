import { users, type User, type InsertUser, scores, type Score, type InsertScore } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Score operations
  createScore(score: InsertScore): Promise<Score>;
  getScores(limit?: number): Promise<Score[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createScore(score: InsertScore): Promise<Score> {
    if (!db) throw new Error("Database not initialized");
    const [newScore] = await db.insert(scores).values(score).returning();
    return newScore;
  }

  async getScores(limit = 10): Promise<Score[]> {
    if (!db) throw new Error("Database not initialized");
    return await db.select()
      .from(scores)
      .orderBy(desc(scores.score))
      .limit(limit);
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private scores: Score[] = [];
  private currentUserId = 1;
  private currentScoreId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { id: this.currentUserId++, ...insertUser };
    this.users.set(user.id, user);
    return user;
  }

  async createScore(score: InsertScore): Promise<Score> {
    const newScore: Score = {
      id: this.currentScoreId++,
      score: score.score,
      metrics: score.metrics,
      createdAt: new Date(),
    };
    this.scores.push(newScore);
    return newScore;
  }

  async getScores(limit = 10): Promise<Score[]> {
    return [...this.scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const storage = db ? new DatabaseStorage() : new MemStorage();

