import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertProtocolSchema, 
  insertTicketSchema, 
  insertCostCenterSchema, 
  insertPayerEntitySchema,
  insertUserSchema
} from "@shared/schema";
import { 
  notifyNewProtocol, 
  notifyProtocolStatusChange, 
  notifyNewTicket, 
  notifyTicketStatusChange 
} from "./services/email";
import { generateCnabFile } from "./services/cnab";

// Configuração para upload de arquivos
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage$ = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage$,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Apenas PDF e JPG são permitidos.'));
    }
  }
});

// Middleware para verificar autenticação
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Acesso não autorizado" });
}

// Middleware para verificar perfil
function hasRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Acesso não autorizado" });
    }
    
    if (roles.includes(req.user.perfil)) {
      return next();
    }
    
    res.status(403).json({ message: "Você não tem permissão para acessar este recurso" });
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticação
  setupAuth(app);
  
  // Rotas de usuários (apenas admin)
  app.get("/api/usuarios", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.post("/api/usuarios", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.put("/api/usuarios/:id", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/usuarios/:id", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Rotas de centros de custo
  app.get("/api/centros-custo", isAuthenticated, async (req, res) => {
    try {
      const centers = await storage.getAllCostCenters();
      res.json(centers);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar centros de custo" });
    }
  });

  app.post("/api/centros-custo", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const validatedData = insertCostCenterSchema.parse(req.body);
      const center = await storage.createCostCenter(validatedData);
      res.status(201).json(center);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  // Rotas de entidades pagadoras
  app.get("/api/entidades-pagadoras", isAuthenticated, async (req, res) => {
    try {
      const entities = await storage.getAllPayerEntities();
      res.json(entities);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar entidades pagadoras" });
    }
  });

  app.post("/api/entidades-pagadoras", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const validatedData = insertPayerEntitySchema.parse(req.body);
      const entity = await storage.createPayerEntity(validatedData);
      res.status(201).json(entity);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  // Rotas de protocolos
  app.get("/api/protocolos", isAuthenticated, async (req, res) => {
    try {
      const { status, cadastrador_id } = req.query;
      let protocols;
      
      if (req.user.perfil === "CADASTRADOR") {
        // Cadastrador só vê seus próprios protocolos
        protocols = await storage.getProtocolsByUser(req.user.id, status as string | undefined);
      } else if (status) {
        // Filtrar por status para admin e operador
        protocols = await storage.getProtocolsByStatus(status as string);
      } else if (cadastrador_id) {
        // Filtrar por cadastrador para admin
        protocols = await storage.getProtocolsByUser(Number(cadastrador_id), status as string | undefined);
      } else {
        // Sem filtro para admin e operador
        protocols = await storage.getAllProtocols();
      }
      
      res.json(protocols);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar protocolos" });
    }
  });

  app.get("/api/protocolos/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const protocol = await storage.getProtocolById(id);
      
      if (!protocol) {
        return res.status(404).json({ message: "Protocolo não encontrado" });
      }
      
      // Verificar permissão (cadastrador só vê os próprios)
      if (req.user.perfil === "CADASTRADOR" && protocol.cadastrador_id !== req.user.id) {
        return res.status(403).json({ message: "Acesso negado a este protocolo" });
      }
      
      res.json(protocol);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar protocolo" });
    }
  });

  // Criação de protocolo (apenas cadastrador)
  app.post("/api/protocolos", isAuthenticated, hasRole(["CADASTRADOR"]), upload.fields([
    { name: 'nota_fiscal', maxCount: 1 },
    { name: 'ordem_compra', maxCount: 1 },
    { name: 'boleto_pix', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.nota_fiscal || !files.ordem_compra || !files.boleto_pix) {
        return res.status(400).json({ message: "Todos os documentos são obrigatórios" });
      }
      
      // Parse e valide os dados do formulário
      const protocolData = {
        ...req.body,
        cadastrador_id: req.user.id,
        centro_custo_id: parseInt(req.body.centro_custo_id),
        entidade_pagadora_id: parseInt(req.body.entidade_pagadora_id),
        faturamento_direto: req.body.faturamento_direto === 'true',
        valor: parseFloat(req.body.valor),
        data_vencimento: new Date(req.body.data_vencimento),
        tipo_pagamento: req.body.tipo_pagamento,
      };
      
      const validatedData = insertProtocolSchema.parse(protocolData);
      
      // Crie o protocolo
      const protocol = await storage.createProtocol({
        ...validatedData,
        status: "PENDENTE",
      });
      
      // Salve os documentos
      const documentPromises = [
        storage.createDocument({
          protocolo_id: protocol.id,
          tipo: "NOTA_FISCAL",
          caminho_arquivo: files.nota_fiscal[0].path,
        }),
        storage.createDocument({
          protocolo_id: protocol.id,
          tipo: "ORDEM_COMPRA",
          caminho_arquivo: files.ordem_compra[0].path,
        }),
        storage.createDocument({
          protocolo_id: protocol.id,
          tipo: "BOLETO_PIX",
          caminho_arquivo: files.boleto_pix[0].path,
        }),
      ];
      
      await Promise.all(documentPromises);
      
      // Notificar administradores sobre o novo protocolo
      await notifyNewProtocol(protocol.id, req.user);
      
      res.status(201).json(protocol);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  // Aprovar/Reprovar protocolo (apenas admin)
  app.put("/api/protocolos/:id/status", isAuthenticated, hasRole(["ADMINISTRADOR"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, justificativa_reprovacao } = req.body;
      
      if (status !== "APROVADO" && status !== "REPROVADO") {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      if (status === "REPROVADO" && !justificativa_reprovacao) {
        return res.status(400).json({ message: "Justificativa obrigatória para reprova" });
      }
      
      const protocol = await storage.updateProtocolStatus(id, status, justificativa_reprovacao);
      
      // Notificar o cadastrador sobre a aprovação/reprovação
      await notifyProtocolStatusChange(
        id, 
        status === "APROVADO", 
        justificativa_reprovacao
      );
      
      res.json(protocol);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar status do protocolo" });
    }
  });

  // Gerar arquivo remessa (protocolos aprovados)
  app.post("/api/remessas/gerar", isAuthenticated, hasRole(["OPERADOR", "ADMINISTRADOR"]), async (req, res) => {
    try {
      const { protocoloIds } = req.body;
      
      if (!protocoloIds || !Array.isArray(protocoloIds) || protocoloIds.length === 0) {
        return res.status(400).json({ message: "Lista de protocolos inválida" });
      }
      
      // Gerar arquivo CNAB 240
      const cnabFileName = `remessa_${Date.now()}.txt`;
      const cnabFilePath = path.join(uploadsDir, cnabFileName);
      
      // Aqui geraria o arquivo CNAB 240 real baseado nos protocolos
      // Dummy implementation - creates an empty file for the MVP
      fs.writeFileSync(cnabFilePath, "");
      
      // Salvar registro da remessa para cada protocolo
      const remessas = [];
      for (const protocoloId of protocoloIds) {
        const remessa = await storage.createRemittanceFile({
          protocolo_id: protocoloId,
          caminho_arquivo: cnabFilePath,
          data_entrada_banco: null,
        });
        remessas.push(remessa);
      }
      
      res.json({
        filePath: cnabFilePath,
        fileName: cnabFileName,
        remessas,
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao gerar arquivo de remessa" });
    }
  });

  // Marcar remessa como enviada ao banco
  app.put("/api/remessas/:id/enviar", isAuthenticated, hasRole(["OPERADOR"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const remessa = await storage.updateRemittanceStatus(id, new Date());
      res.json(remessa);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar status da remessa" });
    }
  });

  // Chamados
  app.get("/api/chamados", isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar chamados" });
    }
  });

  app.post("/api/chamados", isAuthenticated, hasRole(["OPERADOR"]), async (req, res) => {
    try {
      const ticketData = {
        ...req.body,
        operador_id: req.user.id,
        status: "ABERTO",
      };
      
      const validatedData = insertTicketSchema.parse(ticketData);
      const ticket = await storage.createTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.put("/api/chamados/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (status !== "ABERTO" && status !== "EM_ANDAMENTO" && status !== "RESOLVIDO") {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      const ticket = await storage.updateTicketStatus(id, status);
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar status do chamado" });
    }
  });

  // Estatísticas para o dashboard
  app.get("/api/dashboard/estatisticas", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.id, req.user.perfil);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Criar HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
