import { PrismaClient } from "@prisma/client";
import { createMockPrisma } from "./prisma-mock";

// Em dev, o hot reload recria módulos: guardamos o client no global para não
// abrir uma conexão nova a cada recarga.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaInstance(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    console.warn("[MeuSalão] DATABASE_URL não informada — operando com armazenamento em memória e dados de demonstração.");
    return createMockPrisma() as unknown as PrismaClient;
  }

  try {
    return new PrismaClient();
  } catch (erro) {
    console.warn("[MeuSalão] Falha ao conectar ao banco de dados — operando com armazenamento em memória:", erro);
    return createMockPrisma() as unknown as PrismaClient;
  }
}

export const prisma = globalParaPrisma.prisma ?? getPrismaInstance();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
