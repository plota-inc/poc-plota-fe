import type { ActiveMode, RewriteOption, DescribeOption } from "@/stores/ai-store";

export interface ConversationRecord {
  id: string;
  createdAt: number;
  mode: ActiveMode;
  rewriteOption?: RewriteOption;
  describeOption?: DescribeOption;
  selectedText: string;
  generatedText: string;
  model: string;
  instruction?: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const CONV_DIR = "plota/conversations";
const LS_PREFIX = "plota-conv-";

async function ensureDir() {
  if (!isTauri()) return;
  const { exists, mkdir, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const dirExists = await exists(CONV_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (!dirExists) {
    await mkdir(CONV_DIR, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }
}

export async function saveConversation(conv: ConversationRecord) {
  if (!isTauri()) {
    localStorage.setItem(`${LS_PREFIX}${conv.id}`, JSON.stringify(conv));
    return;
  }
  const { writeTextFile, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  await ensureDir();
  await writeTextFile(
    `${CONV_DIR}/${conv.id}.json`,
    JSON.stringify(conv),
    { baseDir: BaseDirectory.AppData },
  );
}

export async function getAllConversations(): Promise<ConversationRecord[]> {
  if (!isTauri()) {
    const convs: ConversationRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) convs.push(JSON.parse(raw));
      }
    }
    return convs.sort((a, b) => a.createdAt - b.createdAt);
  }

  const { readDir, readTextFile, exists, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const dirExists = await exists(CONV_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (!dirExists) return [];

  const entries = await readDir(CONV_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  const convs: ConversationRecord[] = [];
  for (const entry of entries) {
    if (entry.name?.endsWith(".json")) {
      const content = await readTextFile(`${CONV_DIR}/${entry.name}`, {
        baseDir: BaseDirectory.AppData,
      });
      convs.push(JSON.parse(content));
    }
  }
  return convs.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteAllConversations() {
  if (!isTauri()) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    return;
  }

  const { readDir, remove, exists, BaseDirectory } = await import(
    "@tauri-apps/plugin-fs"
  );
  const dirExists = await exists(CONV_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  if (!dirExists) return;

  const entries = await readDir(CONV_DIR, {
    baseDir: BaseDirectory.AppData,
  });
  for (const entry of entries) {
    if (entry.name?.endsWith(".json")) {
      await remove(`${CONV_DIR}/${entry.name}`, {
        baseDir: BaseDirectory.AppData,
      });
    }
  }
}

export async function getConversationStats() {
  const convs = await getAllConversations();
  const blob = new Blob([JSON.stringify(convs)]);
  return { count: convs.length, sizeBytes: blob.size };
}
