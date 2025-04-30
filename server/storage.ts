import { 
  User, InsertUser, 
  CostCenter, InsertCostCenter, 
  PayerEntity, InsertPayerEntity, 
  Protocol, InsertProtocol, 
  Document, InsertDocument, 
  Ticket, InsertTicket, 
  RemittanceFile, InsertRemittanceFile,
  users, costCenters, payerEntities, protocols, documents, tickets, remittanceFiles
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface para operações de banco de dados
export interface IStorage {
  // Usuários
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Centros de Custo
  getAllCostCenters(): Promise<CostCenter[]>;
  createCostCenter(center: InsertCostCenter): Promise<CostCenter>;

  // Entidades Pagadoras
  getAllPayerEntities(): Promise<PayerEntity[]>;
  createPayerEntity(entity: InsertPayerEntity): Promise<PayerEntity>;

  // Protocolos
  getAllProtocols(): Promise<Protocol[]>;
  getProtocolById(id: number): Promise<Protocol | undefined>;
  getProtocolsByUser(userId: number, status?: string): Promise<Protocol[]>;
  getProtocolsByStatus(status: string): Promise<Protocol[]>;
  createProtocol(protocol: InsertProtocol & { status: string }): Promise<Protocol>;
  updateProtocolStatus(id: number, status: string, justificativa_reprovacao?: string): Promise<Protocol>;

  // Documentos
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByProtocolId(protocolId: number): Promise<Document[]>;

  // Chamados
  getAllTickets(): Promise<Ticket[]>;
  getTicketsByProtocolId(protocolId: number): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicketStatus(id: number, status: string): Promise<Ticket>;

  // Remessas
  createRemittanceFile(file: InsertRemittanceFile): Promise<RemittanceFile>;
  updateRemittanceStatus(id: number, date: Date): Promise<RemittanceFile>;

  // Dashboard
  getDashboardStats(userId: number, userRole: string): Promise<any>;

  // Sessão
  sessionStore: session.SessionStore;
}

// Implementação com banco de dados
export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 horas
    });
  }

  // Usuários
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData, 
        atualizado_em: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Centros de Custo
  async getAllCostCenters(): Promise<CostCenter[]> {
    return db.select().from(costCenters);
  }

  async createCostCenter(center: InsertCostCenter): Promise<CostCenter> {
    const [createdCenter] = await db.insert(costCenters).values(center).returning();
    return createdCenter;
  }

  // Entidades Pagadoras
  async getAllPayerEntities(): Promise<PayerEntity[]> {
    return db.select().from(payerEntities);
  }

  async createPayerEntity(entity: InsertPayerEntity): Promise<PayerEntity> {
    const [createdEntity] = await db.insert(payerEntities).values(entity).returning();
    return createdEntity;
  }

  // Protocolos
  async getAllProtocols(): Promise<Protocol[]> {
    return db.select().from(protocols).orderBy(desc(protocols.criado_em));
  }

  async getProtocolById(id: number): Promise<Protocol | undefined> {
    const [protocol] = await db.select().from(protocols).where(eq(protocols.id, id));
    return protocol;
  }

  async getProtocolsByUser(userId: number, status?: string): Promise<Protocol[]> {
    let query = db
      .select()
      .from(protocols)
      .where(eq(protocols.cadastrador_id, userId))
      .orderBy(desc(protocols.criado_em));
      
    if (status) {
      query = query.where(eq(protocols.status, status));
    }
    
    return query;
  }

  async getProtocolsByStatus(status: string): Promise<Protocol[]> {
    return db
      .select()
      .from(protocols)
      .where(eq(protocols.status, status))
      .orderBy(desc(protocols.criado_em));
  }

  async createProtocol(protocol: InsertProtocol & { status: string }): Promise<Protocol> {
    const [createdProtocol] = await db.insert(protocols).values(protocol).returning();
    return createdProtocol;
  }

  async updateProtocolStatus(id: number, status: string, justificativa_reprovacao?: string): Promise<Protocol> {
    const [updatedProtocol] = await db
      .update(protocols)
      .set({
        status,
        justificativa_reprovacao,
        atualizado_em: new Date()
      })
      .where(eq(protocols.id, id))
      .returning();
    return updatedProtocol;
  }

  // Documentos
  async createDocument(document: InsertDocument): Promise<Document> {
    const [createdDocument] = await db.insert(documents).values(document).returning();
    return createdDocument;
  }

  async getDocumentsByProtocolId(protocolId: number): Promise<Document[]> {
    return db
      .select()
      .from(documents)
      .where(eq(documents.protocolo_id, protocolId));
  }

  // Chamados
  async getAllTickets(): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.criado_em));
  }

  async getTicketsByProtocolId(protocolId: number): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.protocolo_id, protocolId))
      .orderBy(desc(tickets.criado_em));
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [createdTicket] = await db.insert(tickets).values(ticket).returning();
    return createdTicket;
  }

  async updateTicketStatus(id: number, status: string): Promise<Ticket> {
    const [updatedTicket] = await db
      .update(tickets)
      .set({
        status,
        atualizado_em: new Date()
      })
      .where(eq(tickets.id, id))
      .returning();
    return updatedTicket;
  }

  // Remessas
  async createRemittanceFile(file: InsertRemittanceFile): Promise<RemittanceFile> {
    const [createdFile] = await db.insert(remittanceFiles).values(file).returning();
    return createdFile;
  }

  async updateRemittanceStatus(id: number, date: Date): Promise<RemittanceFile> {
    const [updatedFile] = await db
      .update(remittanceFiles)
      .set({ data_entrada_banco: date })
      .where(eq(remittanceFiles.id, id))
      .returning();
    return updatedFile;
  }

  // Dashboard
  async getDashboardStats(userId: number, userRole: string): Promise<any> {
    const pendingProtocolsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(protocols)
      .where(eq(protocols.status, "PENDENTE"));
      
    const approvedProtocolsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(protocols)
      .where(eq(protocols.status, "APROVADO"));
      
    const remittancesQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(remittanceFiles);
      
    const activeTicketsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(
        sql`${tickets.status} != 'RESOLVIDO'`
      );
      
    // Filtrar por cadastrador se for CADASTRADOR
    if (userRole === "CADASTRADOR") {
      pendingProtocolsQuery.where(eq(protocols.cadastrador_id, userId));
      approvedProtocolsQuery.where(eq(protocols.cadastrador_id, userId));
    }
    
    const [
      pendingProtocolsResult,
      approvedProtocolsResult,
      remittancesResult,
      activeTicketsResult
    ] = await Promise.all([
      pendingProtocolsQuery,
      approvedProtocolsQuery,
      remittancesQuery,
      activeTicketsQuery
    ]);
    
    return {
      protocolosPendentes: pendingProtocolsResult[0]?.count || 0,
      protocolosAprovados: approvedProtocolsResult[0]?.count || 0,
      remessasGeradas: remittancesResult[0]?.count || 0,
      chamadosAtivos: activeTicketsResult[0]?.count || 0
    };
  }
}

export const storage = new DatabaseStorage();
