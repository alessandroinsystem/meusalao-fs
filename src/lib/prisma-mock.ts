/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs";
import { HORARIO_COMERCIAL, SALOES, CLIENTE, ADMIN } from "./dados-demo";

type IdRecord = { id: string; [key: string]: any };

let idCounter = 100;
function nextId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

const SENHA_HASH_DEFAULT = bcrypt.hashSync("Senha123", 10);

class InMemoryStore {
  usuarios: IdRecord[] = [];
  saloes: IdRecord[] = [];
  servicos: IdRecord[] = [];
  horarios: IdRecord[] = [];
  agendamentos: IdRecord[] = [];
  avaliacoes: IdRecord[] = [];
  tokensSenha: IdRecord[] = [];
  contas: IdRecord[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    // 1. Cliente
    const clienteId = "usr_cliente_1";
    this.usuarios.push({
      id: clienteId,
      nome: CLIENTE.nome,
      email: CLIENTE.email,
      telefone: CLIENTE.telefone,
      senhaHash: SENHA_HASH_DEFAULT,
      papel: "CLIENTE",
      imagem: null,
      criadoEm: new Date("2026-09-01T10:00:00Z"),
    });

    // 2. Admin
    const adminId = "usr_admin_1";
    this.usuarios.push({
      id: adminId,
      nome: ADMIN.nome,
      email: ADMIN.email,
      telefone: ADMIN.telefone,
      senhaHash: SENHA_HASH_DEFAULT,
      papel: "ADMIN",
      imagem: null,
      criadoEm: new Date("2026-09-01T10:00:00Z"),
    });

    // 3. Saloes & Donos
    SALOES.forEach((item, index) => {
      const donoId = `usr_dono_${index + 1}`;
      this.usuarios.push({
        id: donoId,
        nome: item.dono.nome,
        email: item.dono.email,
        telefone: item.dono.telefone,
        senhaHash: SENHA_HASH_DEFAULT,
        papel: "DONO_SALAO",
        imagem: null,
        criadoEm: new Date("2026-09-01T10:00:00Z"),
      });

      const salaoId = `salao_${index + 1}`;
      this.saloes.push({
        id: salaoId,
        donoId,
        nome: item.salao.nome,
        descricao: item.salao.descricao,
        endereco: item.salao.endereco,
        telefone: item.salao.telefone,
        latitude: item.salao.latitude,
        longitude: item.salao.longitude,
        tipo: item.salao.tipo,
        publicado: item.salao.publicado,
        criadoEm: new Date("2026-09-01T10:00:00Z"),
      });

      // Servicos
      item.servicos.forEach((s, sIndex) => {
        this.servicos.push({
          id: `srv_${salaoId}_${sIndex + 1}`,
          salaoId,
          nome: s.nome,
          preco: s.preco,
          duracaoMin: s.duracaoMin,
          criadoEm: new Date("2026-09-01T10:00:00Z"),
        });
      });

      // Horarios
      const horariosFonte = item.horarios || HORARIO_COMERCIAL;
      horariosFonte.forEach((h: any) => {
        this.horarios.push({
          id: `hor_${salaoId}_${h.diaSemana}`,
          salaoId,
          diaSemana: h.diaSemana,
          horaAbertura: h.horaAbertura,
          horaFechamento: h.horaFechamento,
          ativo: h.ativo,
        });
      });
    });

    // 4. Sample agendamentos
    const srv1 = this.servicos.find((s) => s.salaoId === "salao_1");
    if (srv1) {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const agId = "agend_past_1";
      this.agendamentos.push({
        id: agId,
        clienteId,
        salaoId: "salao_1",
        servicoId: srv1.id,
        dataHora: pastDate,
        duracaoMin: srv1.duracaoMin,
        status: "CONCLUIDO",
        criadoEm: pastDate,
      });

      this.avaliacoes.push({
        id: "aval_1",
        clienteId,
        salaoId: "salao_1",
        agendamentoId: agId,
        nota: 5,
        comentario: "Excelente atendimento! Recomendo a todos.",
        criadoEm: pastDate,
      });

      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      futureDate.setHours(14, 0, 0, 0);
      this.agendamentos.push({
        id: "agend_future_1",
        clienteId,
        salaoId: "salao_1",
        servicoId: srv1.id,
        dataHora: futureDate,
        duracaoMin: srv1.duracaoMin,
        status: "CONFIRMADO",
        criadoEm: new Date(),
      });
    }
  }
}

// Global store to persist in-memory across hot reloads
const globalStore = globalThis as unknown as { __meusalao_db?: InMemoryStore };
export const db = globalStore.__meusalao_db ?? new InMemoryStore();
if (process.env.NODE_ENV !== "production") {
  globalStore.__meusalao_db = db;
}

function matchesCondition(actualValue: any, expected: any): boolean {
  if (expected === null || expected === undefined) {
    return actualValue === expected;
  }
  if (typeof expected === "object") {
    if ("equals" in expected) {
      if (expected.mode === "insensitive" && typeof actualValue === "string") {
        return actualValue.toLowerCase() === String(expected.equals).toLowerCase();
      }
      return actualValue === expected.equals;
    }
    if ("contains" in expected) {
      if (expected.mode === "insensitive" && typeof actualValue === "string") {
        return actualValue.toLowerCase().includes(String(expected.contains).toLowerCase());
      }
      return String(actualValue).includes(String(expected.contains));
    }
    if ("not" in expected) {
      if (expected.not === null) {
        return actualValue !== null && actualValue !== undefined;
      }
      return actualValue !== expected.not;
    }
    if ("in" in expected && Array.isArray(expected.in)) {
      return expected.in.includes(actualValue);
    }
    if ("gte" in expected || "lte" in expected || "gt" in expected || "lt" in expected) {
      const act = actualValue instanceof Date ? actualValue.getTime() : actualValue;
      if ("gte" in expected) {
        const exp = expected.gte instanceof Date ? expected.gte.getTime() : expected.gte;
        if (act < exp) return false;
      }
      if ("lte" in expected) {
        const exp = expected.lte instanceof Date ? expected.lte.getTime() : expected.lte;
        if (act > exp) return false;
      }
      if ("gt" in expected) {
        const exp = expected.gt instanceof Date ? expected.gt.getTime() : expected.gt;
        if (act <= exp) return false;
      }
      if ("lt" in expected) {
        const exp = expected.lt instanceof Date ? expected.lt.getTime() : expected.lt;
        if (act >= exp) return false;
      }
      return true;
    }
    return actualValue === expected;
  }
  return actualValue === expected;
}

function filterRecords(records: IdRecord[], where?: any): IdRecord[] {
  if (!where || Object.keys(where).length === 0) return [...records];
  return records.filter((rec) => {
    for (const [key, val] of Object.entries(where)) {
      if (key === "OR" && Array.isArray(val)) {
        const orMatches = val.some((cond) => filterRecords([rec], cond).length > 0);
        if (!orMatches) return false;
        continue;
      }
      if (key === "AND" && Array.isArray(val)) {
        const andMatches = val.every((cond) => filterRecords([rec], cond).length > 0);
        if (!andMatches) return false;
        continue;
      }
      if (key === "NOT") {
        const notMatches = filterRecords([rec], val).length === 0;
        if (!notMatches) return false;
        continue;
      }

      if (!matchesCondition(rec[key], val)) {
        return false;
      }
    }
    return true;
  });
}

function projectRecord(rec: IdRecord, select?: any, include?: any, relations?: any): any {
  const result: any = { ...rec };

  if (relations) {
    for (const [relKey, getRel] of Object.entries(relations)) {
      if (include && include[relKey]) {
        result[relKey] = (getRel as (r: IdRecord, incOrSel: any) => any)(rec, include[relKey]);
      } else if (select && select[relKey]) {
        result[relKey] = (getRel as (r: IdRecord, incOrSel: any) => any)(rec, select[relKey]);
      }
    }
  }

  if (select && typeof select === "object") {
    const projected: any = {};
    for (const [k, v] of Object.entries(select)) {
      if (v) {
        projected[k] = result[k];
      }
    }
    return projected;
  }

  return result;
}

export function createMockPrisma(): any {
  const usuarioRelations = {
    saloes: (u: IdRecord) => db.saloes.filter((s) => s.donoId === u.id),
    agendamentos: (u: IdRecord) => db.agendamentos.filter((a) => a.clienteId === u.id),
  };

  const salaoRelations = {
    dono: (s: IdRecord, opt: any) => {
      const u = db.usuarios.find((u) => u.id === s.donoId);
      return u ? projectRecord(u, typeof opt === "object" ? opt.select : undefined) : null;
    },
    servicos: (s: IdRecord, opt: any) => {
      let list = db.servicos.filter((srv) => srv.salaoId === s.id);
      if (typeof opt === "object" && opt?.orderBy?.criadoEm === "asc") {
        list = [...list].sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());
      }
      return list.map((item) => projectRecord(item, typeof opt === "object" ? opt.select : undefined));
    },
    horarios: (s: IdRecord) => db.horarios.filter((h) => h.salaoId === s.id),
    agendamentos: (s: IdRecord) => db.agendamentos.filter((a) => a.salaoId === s.id),
    avaliacoes: (s: IdRecord) => db.avaliacoes.filter((a) => a.salaoId === s.id),
  };

  const agendamentoRelations = {
    cliente: (a: IdRecord, opt: any) => {
      const u = db.usuarios.find((u) => u.id === a.clienteId);
      return u ? projectRecord(u, typeof opt === "object" ? opt.select : undefined) : null;
    },
    salao: (a: IdRecord, opt: any) => {
      const s = db.saloes.find((s) => s.id === a.salaoId);
      return s ? projectRecord(s, typeof opt === "object" ? opt.select : undefined) : null;
    },
    servico: (a: IdRecord, opt: any) => {
      const srv = db.servicos.find((srv) => srv.id === a.servicoId);
      return srv ? projectRecord(srv, typeof opt === "object" ? opt.select : undefined) : null;
    },
    avaliacao: (a: IdRecord) => db.avaliacoes.find((av) => av.agendamentoId === a.id) ?? null,
  };

  const avaliacaoRelations = {
    cliente: (av: IdRecord, opt: any) => {
      const u = db.usuarios.find((u) => u.id === av.clienteId);
      return u ? projectRecord(u, typeof opt === "object" ? opt.select : undefined) : null;
    },
    salao: (av: IdRecord, opt: any) => {
      const s = db.saloes.find((s) => s.id === av.salaoId);
      return s ? projectRecord(s, typeof opt === "object" ? opt.select : undefined) : null;
    },
    servico: (av: IdRecord, opt: any) => {
      const ag = db.agendamentos.find((a) => a.id === av.agendamentoId);
      const srv = ag ? db.servicos.find((s) => s.id === ag.servicoId) : null;
      return srv ? projectRecord(srv, typeof opt === "object" ? opt.select : undefined) : null;
    },
    agendamento: (av: IdRecord) => db.agendamentos.find((a) => a.id === av.agendamentoId) ?? null,
  };

  const mock = {
    usuario: {
      findUnique: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.usuarios, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, usuarioRelations);
      },
      findFirst: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.usuarios, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, usuarioRelations);
      },
      findMany: async ({ where, select, include, orderBy }: any) => {
        const list = filterRecords(db.usuarios, where);
        if (orderBy?.nome) {
          list.sort((a, b) =>
            orderBy.nome === "desc" ? b.nome.localeCompare(a.nome) : a.nome.localeCompare(b.nome),
          );
        }
        return list.map((u) => projectRecord(u, select, include, usuarioRelations));
      },
      create: async ({ data, select }: any) => {
        const record = {
          id: nextId("usr"),
          papel: "CLIENTE",
          imagem: null,
          telefone: null,
          criadoEm: new Date(),
          ...data,
        };
        db.usuarios.push(record);
        return projectRecord(record, select, null, usuarioRelations);
      },
      update: async ({ where, data, select }: any) => {
        const record = filterRecords(db.usuarios, where)[0];
        if (record) {
          Object.assign(record, data);
          return projectRecord(record, select, null, usuarioRelations);
        }
        return null;
      },
      upsert: async ({ where, update, create, select }: any) => {
        const existing = filterRecords(db.usuarios, where)[0];
        if (existing) {
          Object.assign(existing, update);
          return projectRecord(existing, select, null, usuarioRelations);
        }
        const created: IdRecord = {
          id: nextId("usr"),
          papel: "CLIENTE",
          imagem: null,
          telefone: null,
          criadoEm: new Date(),
          ...create,
        };
        db.usuarios.push(created);
        return projectRecord(created, select, null, usuarioRelations);
      },
      count: async ({ where }: any = {}) => {
        return filterRecords(db.usuarios, where).length;
      },
    },

    salao: {
      findUnique: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.saloes, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, salaoRelations);
      },
      findFirst: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.saloes, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, salaoRelations);
      },
      findMany: async ({ where, select, include, orderBy, take, distinct }: any = {}) => {
        let list = filterRecords(db.saloes, where);
        if (orderBy?.nome) {
          list.sort((a, b) =>
            orderBy.nome === "desc" ? b.nome.localeCompare(a.nome) : a.nome.localeCompare(b.nome),
          );
        }
        if (take && typeof take === "number") {
          list = list.slice(0, take);
        }
        if (distinct && Array.isArray(distinct)) {
          const seen = new Set();
          list = list.filter((item) => {
            const key = distinct.map((d) => item[d]).join("|");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        return list.map((s) => projectRecord(s, select, include, salaoRelations));
      },
      create: async ({ data, select, include }: any) => {
        const { servicos, horarios, ...salaoData } = data;
        const salaoId = nextId("salao");
        const record = {
          id: salaoId,
          publicado: false,
          criadoEm: new Date(),
          ...salaoData,
        };
        db.saloes.push(record);

        if (servicos?.create) {
          const toCreate = Array.isArray(servicos.create) ? servicos.create : [servicos.create];
          for (const s of toCreate) {
            db.servicos.push({
              id: nextId("srv"),
              salaoId,
              criadoEm: new Date(),
              ...s,
            });
          }
        }

        if (horarios?.create) {
          const toCreate = Array.isArray(horarios.create) ? horarios.create : [horarios.create];
          for (const h of toCreate) {
            db.horarios.push({
              id: nextId("hor"),
              salaoId,
              ...h,
            });
          }
        }

        return projectRecord(record, select, include, salaoRelations);
      },
      update: async ({ where, data, select }: any) => {
        const record = filterRecords(db.saloes, where)[0];
        if (record) {
          Object.assign(record, data);
          return projectRecord(record, select, null, salaoRelations);
        }
        return null;
      },
      updateMany: async ({ where, data }: any) => {
        const records = filterRecords(db.saloes, where);
        for (const r of records) {
          Object.assign(r, data);
        }
        return { count: records.length };
      },
      deleteMany: async ({ where }: any) => {
        const initial = db.saloes.length;
        db.saloes = db.saloes.filter((s) => !filterRecords([s], where).length);
        return { count: initial - db.saloes.length };
      },
      count: async ({ where }: any = {}) => {
        return filterRecords(db.saloes, where).length;
      },
    },

    servico: {
      findUnique: async ({ where, select }: any) => {
        const filtered = filterRecords(db.servicos, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select);
      },
      findFirst: async ({ where, select }: any) => {
        const filtered = filterRecords(db.servicos, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select);
      },
      findMany: async ({ where, select, orderBy }: any = {}) => {
        const list = filterRecords(db.servicos, where);
        if (orderBy?.criadoEm) {
          list.sort((a, b) =>
            orderBy.criadoEm === "desc"
              ? new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
              : new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
          );
        }
        return list.map((s) => projectRecord(s, select));
      },
      create: async ({ data, select }: any) => {
        const record = {
          id: nextId("srv"),
          criadoEm: new Date(),
          ...data,
        };
        db.servicos.push(record);
        return projectRecord(record, select);
      },
      createMany: async ({ data }: any) => {
        const arr = Array.isArray(data) ? data : [data];
        for (const item of arr) {
          db.servicos.push({
            id: nextId("srv"),
            criadoEm: new Date(),
            ...item,
          });
        }
        return { count: arr.length };
      },
      update: async ({ where, data, select }: any) => {
        const record = filterRecords(db.servicos, where)[0];
        if (record) {
          Object.assign(record, data);
          return projectRecord(record, select);
        }
        return null;
      },
      delete: async ({ where }: any) => {
        const record = filterRecords(db.servicos, where)[0];
        if (record) {
          db.servicos = db.servicos.filter((s) => s.id !== record.id);
        }
        return record;
      },
    },

    horarioFuncionamento: {
      findUnique: async ({ where }: any) => {
        if (where?.salaoId_diaSemana) {
          const { salaoId, diaSemana } = where.salaoId_diaSemana;
          return (
            db.horarios.find((h) => h.salaoId === salaoId && h.diaSemana === diaSemana) ?? null
          );
        }
        const filtered = filterRecords(db.horarios, where);
        return filtered[0] ?? null;
      },
      findMany: async ({ where }: any = {}) => {
        const list = filterRecords(db.horarios, where);
        return list.map((h) => ({ ...h }));
      },
      create: async ({ data }: any) => {
        const record = { id: nextId("hor"), ...data };
        db.horarios.push(record);
        return { ...record };
      },
      createMany: async ({ data }: any) => {
        const arr = Array.isArray(data) ? data : [data];
        for (const item of arr) {
          db.horarios.push({ id: nextId("hor"), ...item });
        }
        return { count: arr.length };
      },
      deleteMany: async ({ where }: any) => {
        const initial = db.horarios.length;
        db.horarios = db.horarios.filter((h) => !filterRecords([h], where).length);
        return { count: initial - db.horarios.length };
      },
    },

    agendamento: {
      findUnique: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.agendamentos, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, agendamentoRelations);
      },
      findFirst: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.agendamentos, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, agendamentoRelations);
      },
      findMany: async ({ where, select, include, orderBy }: any = {}) => {
        const list = filterRecords(db.agendamentos, where);
        if (orderBy?.dataHora) {
          list.sort((a, b) =>
            orderBy.dataHora === "desc"
              ? new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
              : new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
          );
        }
        return list.map((a) => projectRecord(a, select, include, agendamentoRelations));
      },
      create: async ({ data, select, include }: any) => {
        const record = {
          id: nextId("agend"),
          status: "PENDENTE",
          criadoEm: new Date(),
          ...data,
          dataHora: data.dataHora instanceof Date ? data.dataHora : new Date(data.dataHora),
        };
        db.agendamentos.push(record);
        return projectRecord(record, select, include, agendamentoRelations);
      },
      update: async ({ where, data, select, include }: any) => {
        const record = filterRecords(db.agendamentos, where)[0];
        if (record) {
          Object.assign(record, data);
          return projectRecord(record, select, include, agendamentoRelations);
        }
        return null;
      },
      count: async ({ where }: any = {}) => {
        return filterRecords(db.agendamentos, where).length;
      },
      groupBy: async ({ by, where }: any = {}) => {
        const list = filterRecords(db.agendamentos, where);
        const map = new Map<string, number>();
        for (const item of list) {
          const key = by.map((b: string) => item[b]).join("|");
          map.set(key, (map.get(key) || 0) + 1);
        }
        return Array.from(map.entries()).map(([key, count]) => {
          const obj: any = { _count: { _all: count } };
          by.forEach((b: string, i: number) => {
            obj[b] = key.split("|")[i];
          });
          return obj;
        });
      },
    },

    avaliacao: {
      findUnique: async ({ where, select, include }: any) => {
        const filtered = filterRecords(db.avaliacoes, where);
        if (filtered.length === 0) return null;
        return projectRecord(filtered[0], select, include, avaliacaoRelations);
      },
      findMany: async ({ where, select, include, orderBy }: any = {}) => {
        const list = filterRecords(db.avaliacoes, where);
        if (orderBy?.criadoEm) {
          list.sort((a, b) =>
            orderBy.criadoEm === "desc"
              ? new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
              : new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
          );
        }
        return list.map((av) => projectRecord(av, select, include, avaliacaoRelations));
      },
      create: async ({ data, select, include }: any) => {
        const record = {
          id: nextId("aval"),
          criadoEm: new Date(),
          ...data,
        };
        db.avaliacoes.push(record);
        return projectRecord(record, select, include, avaliacaoRelations);
      },
      update: async ({ where, data, select }: any) => {
        const record = filterRecords(db.avaliacoes, where)[0];
        if (record) {
          Object.assign(record, data);
          return projectRecord(record, select, null, avaliacaoRelations);
        }
        return null;
      },
      count: async ({ where }: any = {}) => {
        return filterRecords(db.avaliacoes, where).length;
      },
      aggregate: async ({ where }: any = {}) => {
        const list = filterRecords(db.avaliacoes, where);
        const count = list.length;
        const sum = list.reduce((acc, curr) => acc + (curr.nota || 0), 0);
        return {
          _count: { nota: count },
          _avg: { nota: count > 0 ? sum / count : null },
        };
      },
    },

    tokenSenha: {
      findUnique: async ({ where }: any) => {
        const filtered = filterRecords(db.tokensSenha, where);
        return filtered[0] ?? null;
      },
      create: async ({ data }: any) => {
        const record = {
          id: nextId("tok"),
          usadoEm: null,
          criadoEm: new Date(),
          ...data,
        };
        db.tokensSenha.push(record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const record = filterRecords(db.tokensSenha, where)[0];
        if (record) {
          Object.assign(record, data);
        }
        return record;
      },
      deleteMany: async ({ where }: any) => {
        const initial = db.tokensSenha.length;
        db.tokensSenha = db.tokensSenha.filter((t) => !filterRecords([t], where).length);
        return { count: initial - db.tokensSenha.length };
      },
    },

    conta: {
      upsert: async ({ where, update, create }: any) => {
        const existing = db.contas.find((c) => {
          if (where?.provedor_idNoProvedor) {
            return (
              c.provedor === where.provedor_idNoProvedor.provedor &&
              c.idNoProvedor === where.provedor_idNoProvedor.idNoProvedor
            );
          }
          return false;
        });
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const created: IdRecord = { id: nextId("cnt"), ...create };
        db.contas.push(created);
        return created;
      },
    },

    $transaction: async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === "function") {
        return arg(mock);
      }
      return arg;
    },

    $disconnect: async () => {},
  };

  return mock;
}
