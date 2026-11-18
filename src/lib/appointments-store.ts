/**
 * TK Dent — appointment persistence.
 *
 * Two backends behind one interface:
 *  - GitHubStore (production/Vercel): a private GitHub repo acts as the
 *    database (GITHUB_DATA_TOKEN + GITHUB_DATA_REPO). Survives serverless
 *    cold starts and is visible in the doctors dashboard everywhere.
 *  - PrismaStore (sandbox/local dev): SQLite via Prisma.
 *
 * GitHubStore is chosen automatically when both env vars exist; Prisma
 * when DATABASE_URL is set. In-memory cache keeps reads fast (the voice
 * agent reads availability every turn).
 */

import type { ApptRecord } from "./clinic";

export interface NewAppointment {
  name: string;
  phone: string;
  service: string;
  type: string;
  date: string;
  timeSlot: string;
  notes?: string | null;
  source: string;
}

export interface AppointmentStore {
  list(): Promise<ApptRecord[]>;
  create(input: NewAppointment): Promise<ApptRecord>;
  updateStatus(id: string, status: string): Promise<ApptRecord | null>;
}

/* ------------------------------------------------------------------ */
/* shared helpers                                                      */
/* ------------------------------------------------------------------ */

function normalize(r: {
  id: string;
  name: string;
  phone: string;
  service: string;
  type: string;
  date: string;
  timeSlot: string;
  notes?: string | null;
  status: string;
  source: string;
  createdAt: Date | string;
}): ApptRecord {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    service: r.service,
    type: r.type,
    date: r.date,
    timeSlot: r.timeSlot,
    notes: r.notes ?? null,
    status: r.status,
    source: r.source,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
  };
}

function shortId(): string {
  return `KD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/* Prisma store (sandbox / local dev)                                  */
/* ------------------------------------------------------------------ */

class PrismaStore implements AppointmentStore {
  async list(): Promise<ApptRecord[]> {
    const { db } = await import("@/lib/db");
    const rows = await db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    return rows.map(normalize);
  }

  async create(input: NewAppointment): Promise<ApptRecord> {
    const { db } = await import("@/lib/db");
    const row = await db.booking.create({
      data: {
        name: input.name,
        phone: input.phone,
        service: input.service,
        type: input.type,
        date: input.date,
        timeSlot: input.timeSlot,
        notes: input.notes ?? null,
        source: input.source,
      },
    });
    return normalize(row);
  }

  async updateStatus(id: string, status: string): Promise<ApptRecord | null> {
    const { db } = await import("@/lib/db");
    const row = await db.booking.update({ where: { id }, data: { status } }).catch(() => null);
    return row ? normalize(row) : null;
  }
}

/* ------------------------------------------------------------------ */
/* GitHub store (Vercel / serverless production)                       */
/* ------------------------------------------------------------------ */

interface GhFile {
  sha: string | null;
  content: string;
}

class GitHubStore implements AppointmentStore {
  private token: string;
  private repo: string;
  private branch = "main";
  private cache: { at: number; data: ApptRecord[]; sha: string | null } | null = null;
  private static TTL = 8000;

  constructor(token: string, repo: string) {
    this.token = token;
    this.repo = repo;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private url(path: string): string {
    return `https://api.github.com/repos/${this.repo}/contents/${path}`;
  }

  private async readFile(): Promise<GhFile> {
    const res = await fetch(this.url("data/appointments.json") + `?ref=${this.branch}`, {
      headers: this.headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return { sha: null, content: "" };
    if (!res.ok) throw new Error(`github read ${res.status}`);
    const json = (await res.json()) as { sha: string; content: string };
    const decoded = Buffer.from(json.content, "base64").toString("utf8");
    return { sha: json.sha, content: decoded };
  }

  private async writeFile(content: string, sha: string | null): Promise<void> {
    const res = await fetch(this.url("data/appointments.json"), {
      method: "PUT",
      headers: this.headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        message: `appointment data update (${new Date().toISOString()})`,
        content: Buffer.from(content, "utf8").toString("base64"),
        sha,
        branch: this.branch,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`github write ${res.status}: ${body.slice(0, 160)}`);
    }
  }

  private parse(content: string): ApptRecord[] {
    if (!content.trim()) return [];
    try {
      const json = JSON.parse(content) as { appointments?: ApptRecord[] };
      return Array.isArray(json.appointments) ? json.appointments : [];
    } catch {
      return [];
    }
  }

  async list(): Promise<ApptRecord[]> {
    if (this.cache && Date.now() - this.cache.at < GitHubStore.TTL) return this.cache.data;
    const file = await this.readFile();
    const data = this.parse(file.content);
    this.cache = { at: Date.now(), data, sha: file.sha };
    return data;
  }

  async create(input: NewAppointment): Promise<ApptRecord> {
    const file = await this.readFile();
    const rows = this.parse(file.content);
    const rec: ApptRecord = {
      id: shortId(),
      name: input.name,
      phone: input.phone,
      service: input.service,
      type: input.type,
      date: input.date,
      timeSlot: input.timeSlot,
      notes: input.notes ?? null,
      status: "pending",
      source: input.source,
      createdAt: new Date().toISOString(),
    };
    rows.unshift(rec);
    if (rows.length > 1000) rows.length = 1000;
    await this.writeFile(JSON.stringify({ appointments: rows }, null, 1), file.sha);
    this.cache = { at: Date.now(), data: rows, sha: null };
    return rec;
  }

  async updateStatus(id: string, status: string): Promise<ApptRecord | null> {
    const file = await this.readFile();
    const rows = this.parse(file.content);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], status };
    await this.writeFile(JSON.stringify({ appointments: rows }, null, 1), file.sha);
    this.cache = { at: Date.now(), data: rows, sha: null };
    return rows[idx];
  }
}

/* ------------------------------------------------------------------ */
/* resolver                                                            */
/* ------------------------------------------------------------------ */

let cached: AppointmentStore | null = null;

export function getStore(): AppointmentStore | null {
  if (cached) return cached;
  const ghToken = process.env.GITHUB_DATA_TOKEN;
  const ghRepo = process.env.GITHUB_DATA_REPO;
  if (ghToken && ghRepo) {
    cached = new GitHubStore(ghToken, ghRepo);
    return cached;
  }
  if (process.env.DATABASE_URL) {
    cached = new PrismaStore();
    return cached;
  }
  return null;
}

/** Does the active store persist across restarts? (dashboard warning chip) */
export function isPersistentStore(): boolean {
  return Boolean(process.env.GITHUB_DATA_TOKEN && process.env.GITHUB_DATA_REPO);
}
