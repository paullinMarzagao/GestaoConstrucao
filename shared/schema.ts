import { pgTable, text, serial, integer, boolean, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Usuários
export const users = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  perfil: text("perfil").notNull().$type<"ADMINISTRADOR" | "OPERADOR" | "CADASTRADOR">(),
  criado_em: timestamp("criado_em").defaultNow(),
  atualizado_em: timestamp("atualizado_em").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  protocolos: many(protocols),
  chamados: many(tickets),
}));

// Centros de Custo
export const costCenters = pgTable("centros_custo", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  codigo: text("codigo").notNull().unique(),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const costCentersRelations = relations(costCenters, ({ many }) => ({
  protocolos: many(protocols),
}));

// Entidades Pagadoras
export const payerEntities = pgTable("entidades_pagadoras", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const payerEntitiesRelations = relations(payerEntities, ({ many }) => ({
  protocolos: many(protocols),
}));

// Protocolos
export const protocols = pgTable("protocolos", {
  id: serial("id").primaryKey(),
  cadastrador_id: integer("cadastrador_id").references(() => users.id),
  centro_custo_id: integer("centro_custo_id").references(() => costCenters.id),
  entidade_pagadora_id: integer("entidade_pagadora_id").references(() => payerEntities.id),
  faturamento_direto: boolean("faturamento_direto").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  data_vencimento: date("data_vencimento").notNull(),
  tipo_pagamento: text("tipo_pagamento").notNull().$type<"BOLETO" | "PIX">(),
  status: text("status").notNull().$type<"PENDENTE" | "APROVADO" | "REPROVADO">(),
  justificativa_reprovacao: text("justificativa_reprovacao"),
  criado_em: timestamp("criado_em").defaultNow(),
  atualizado_em: timestamp("atualizado_em").defaultNow(),
});

export const protocolsRelations = relations(protocols, ({ one, many }) => ({
  cadastrador: one(users, {
    fields: [protocols.cadastrador_id],
    references: [users.id],
  }),
  centroCusto: one(costCenters, {
    fields: [protocols.centro_custo_id],
    references: [costCenters.id],
  }),
  entidadePagadora: one(payerEntities, {
    fields: [protocols.entidade_pagadora_id],
    references: [payerEntities.id],
  }),
  documentos: many(documents),
  chamados: many(tickets),
  arquivoRemessa: many(remittanceFiles),
}));

// Documentos
export const documents = pgTable("documentos", {
  id: serial("id").primaryKey(),
  protocolo_id: integer("protocolo_id").references(() => protocols.id),
  tipo: text("tipo").notNull().$type<"NOTA_FISCAL" | "ORDEM_COMPRA" | "BOLETO_PIX">(),
  caminho_arquivo: text("caminho_arquivo").notNull(),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  protocolo: one(protocols, {
    fields: [documents.protocolo_id],
    references: [protocols.id],
  }),
}));

// Chamados
export const tickets = pgTable("chamados", {
  id: serial("id").primaryKey(),
  protocolo_id: integer("protocolo_id").references(() => protocols.id),
  operador_id: integer("operador_id").references(() => users.id),
  descricao: text("descricao").notNull(),
  status: text("status").notNull().$type<"ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO">(),
  criado_em: timestamp("criado_em").defaultNow(),
  atualizado_em: timestamp("atualizado_em").defaultNow(),
});

export const ticketsRelations = relations(tickets, ({ one }) => ({
  protocolo: one(protocols, {
    fields: [tickets.protocolo_id],
    references: [protocols.id],
  }),
  operador: one(users, {
    fields: [tickets.operador_id],
    references: [users.id],
  }),
}));

// Arquivos Remessa
export const remittanceFiles = pgTable("arquivos_remessa", {
  id: serial("id").primaryKey(),
  protocolo_id: integer("protocolo_id").references(() => protocols.id),
  caminho_arquivo: text("caminho_arquivo").notNull(),
  data_entrada_banco: timestamp("data_entrada_banco"),
  criado_em: timestamp("criado_em").defaultNow(),
});

export const remittanceFilesRelations = relations(remittanceFiles, ({ one }) => ({
  protocolo: one(protocols, {
    fields: [remittanceFiles.protocolo_id],
    references: [protocols.id],
  }),
}));

// Schemas de Inserção
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  criado_em: true,
  atualizado_em: true,
});

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({
  id: true,
  criado_em: true,
});

export const insertPayerEntitySchema = createInsertSchema(payerEntities).omit({
  id: true,
  criado_em: true,
});

export const insertProtocolSchema = createInsertSchema(protocols).omit({
  id: true,
  criado_em: true,
  atualizado_em: true,
  status: true,
  justificativa_reprovacao: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  criado_em: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  criado_em: true,
  atualizado_em: true,
});

export const insertRemittanceFileSchema = createInsertSchema(remittanceFiles).omit({
  id: true,
  criado_em: true,
});

// Tipos de Inserção
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type InsertPayerEntity = z.infer<typeof insertPayerEntitySchema>;
export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type InsertRemittanceFile = z.infer<typeof insertRemittanceFileSchema>;

// Tipos de Seleção
export type User = typeof users.$inferSelect;
export type CostCenter = typeof costCenters.$inferSelect;
export type PayerEntity = typeof payerEntities.$inferSelect;
export type Protocol = typeof protocols.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type RemittanceFile = typeof remittanceFiles.$inferSelect;

// Schemas de Login
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export type LoginData = z.infer<typeof loginSchema>;
