export interface DocumentData {
  id: string;
  title: string;
  content: unknown;
  updatedAt: number;
  createdAt: number;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const DOCS_DIR = "plota/documents";

async function ensureDir() {
  if (!isTauri()) return;
  const { exists, mkdir, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const dirExists = await exists(DOCS_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (!dirExists) {
    await mkdir(DOCS_DIR, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }
}

export async function saveDocument(doc: DocumentData) {
  if (!isTauri()) {
    localStorage.setItem(`plota-doc-${doc.id}`, JSON.stringify(doc));
    return;
  }
  const { writeTextFile, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  await ensureDir();
  await writeTextFile(`${DOCS_DIR}/${doc.id}.json`, JSON.stringify(doc), {
    baseDir: BaseDirectory.AppData,
  });
}

export async function getDocument(id: string): Promise<DocumentData | undefined> {
  if (!isTauri()) {
    const raw = localStorage.getItem(`plota-doc-${id}`);
    return raw ? JSON.parse(raw) : undefined;
  }
  const { readTextFile, exists, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const path = `${DOCS_DIR}/${id}.json`;
  const fileExists = await exists(path, {
    baseDir: BaseDirectory.AppData,
  });
  if (!fileExists) return undefined;
  const content = await readTextFile(path, {
    baseDir: BaseDirectory.AppData,
  });
  return JSON.parse(content);
}

export async function getAllDocuments(): Promise<DocumentData[]> {
  if (!isTauri()) {
    const docs: DocumentData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("plota-doc-")) {
        const raw = localStorage.getItem(key);
        if (raw) docs.push(JSON.parse(raw));
      }
    }
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  const { readDir, readTextFile, exists, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const dirExists = await exists(DOCS_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (!dirExists) return [];

  const entries = await readDir(DOCS_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  const docs: DocumentData[] = [];
  for (const entry of entries) {
    if (entry.name?.endsWith(".json")) {
      const content = await readTextFile(`${DOCS_DIR}/${entry.name}`, {
        baseDir: BaseDirectory.AppData,
      });
      docs.push(JSON.parse(content));
    }
  }
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDocument(id: string) {
  if (!isTauri()) {
    localStorage.removeItem(`plota-doc-${id}`);
    return;
  }
  const { remove, exists, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const path = `${DOCS_DIR}/${id}.json`;
  const fileExists = await exists(path, {
    baseDir: BaseDirectory.AppData,
  });
  if (fileExists) {
    await remove(path, { baseDir: BaseDirectory.AppData });
  }
}

export async function deleteAllDocuments() {
  if (!isTauri()) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("plota-doc-")) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    return;
  }
  const { readDir, remove, exists, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const dirExists = await exists(DOCS_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (!dirExists) return;

  const entries = await readDir(DOCS_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  for (const entry of entries) {
    if (entry.name?.endsWith(".json")) {
      await remove(`${DOCS_DIR}/${entry.name}`, {
        baseDir: BaseDirectory.AppData,
      });
    }
  }
}

export async function getDocumentStats() {
  const docs = await getAllDocuments();
  const blob = new Blob([JSON.stringify(docs)]);
  return { count: docs.length, sizeBytes: blob.size };
}
