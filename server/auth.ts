import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Função para hash da senha
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`; // Retorna o hash da senha + salt
}

// Função para comparar a senha fornecida com o hash armazenado
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf); // Compara as senhas
}

// Configuração de autenticação
export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "segredo-temp-do-sistema-financeiro-construtora",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Estratégia de autenticação com passport-local
  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'senha'
    },
    async (email, senha, done) => {
      try {
        // Buscar o usuário no banco de dados
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(senha, user.senha))) {
          return done(null, false, { message: "Email ou senha incorretos" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Serializar e desserializar o usuário na sessão
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Endpoint para registro de usuário
  app.post("/api/register", async (req, res, next) => {
    try {
      // Verificar se o email já está em uso
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).send("Este email já está em uso");
      }

      // Hash da senha antes de salvar no banco
      const hashedPassword = await hashPassword(req.body.senha);

      // Criando o usuário com a senha hasheada
      const user = await storage.createUser({
        ...req.body,
        senha: hashedPassword, // Senha hasheada
      });

      // Realizar o login do usuário após o registro
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user); // Retorna o usuário após o registro
      });
    } catch (error) {
      next(error); // Trata qualquer erro que ocorra
    }
  });

  // Endpoint para login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Falha na autenticação" });

      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user); // Retorna o usuário após o login bem-sucedido
      });
    })(req, res, next);
  });

  // Endpoint para logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Endpoint para retornar o usuário autenticado
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}