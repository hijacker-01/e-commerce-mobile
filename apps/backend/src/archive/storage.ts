import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  unlinkSync,
  existsSync,
} from 'fs';
import { join } from 'path';

export interface ArchiveFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
}

/**
 * Pluggable cold-storage for archive files. Local-folder implementation today;
 * a GoogleDriveArchiveStorage can implement this same interface later and be
 * selected by env (e.g. ARCHIVE_STORAGE=drive) with zero changes elsewhere.
 */
export interface ArchiveStorage {
  readonly kind: string;
  save(name: string, content: string): Promise<ArchiveFile>;
  list(): Promise<ArchiveFile[]>;
  read(id: string): Promise<string>;
  remove(id: string): Promise<void>;
}

const DIR = join(process.cwd(), 'archives');
const safe = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, '_');

export class LocalArchiveStorage implements ArchiveStorage {
  readonly kind = 'local';

  constructor() {
    mkdirSync(DIR, { recursive: true });
  }

  async save(name: string, content: string): Promise<ArchiveFile> {
    const file = safe(name);
    const path = join(DIR, file);
    writeFileSync(path, content, 'utf8');
    const s = statSync(path);
    return { id: file, name: file, size: s.size, createdAt: s.birthtime.toISOString() };
  }

  async list(): Promise<ArchiveFile[]> {
    if (!existsSync(DIR)) return [];
    return readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const s = statSync(join(DIR, f));
        return { id: f, name: f, size: s.size, createdAt: s.birthtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async read(id: string): Promise<string> {
    return readFileSync(join(DIR, safe(id)), 'utf8');
  }

  async remove(id: string): Promise<void> {
    const path = join(DIR, safe(id));
    if (existsSync(path)) unlinkSync(path);
  }
}
