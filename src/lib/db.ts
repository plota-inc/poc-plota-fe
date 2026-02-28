import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface PlotaDB extends DBSchema {
  documents: {
    key: string;
    value: {
      id: string;
      title: string;
      content: unknown;
      updatedAt: number;
      createdAt: number;
    };
    indexes: {
      "by-modified": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PlotaDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PlotaDB>("plota-db", 1, {
      upgrade(db) {
        const store = db.createObjectStore("documents", { keyPath: "id" });
        store.createIndex("by-modified", "updatedAt");
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(doc: PlotaDB["documents"]["value"]) {
  const db = await getDB();
  await db.put("documents", doc);
}

export async function getDocument(id: string) {
  const db = await getDB();
  return db.get("documents", id);
}

export async function getAllDocuments() {
  const db = await getDB();
  return db.getAllFromIndex("documents", "by-modified");
}

export async function deleteDocument(id: string) {
  const db = await getDB();
  await db.delete("documents", id);
}

export async function deleteAllDocuments() {
  const db = await getDB();
  await db.clear("documents");
}

export async function getDocumentStats() {
  const docs = await getAllDocuments();
  const blob = new Blob([JSON.stringify(docs)]);
  return { count: docs.length, sizeBytes: blob.size };
}

export async function getModelCacheStats() {
  let totalBytes = 0;
  let fileCount = 0;
  const names = await caches.keys();
  for (const name of names) {
    if (name.includes("transformers")) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      fileCount += keys.length;
      for (const req of keys) {
        const res = await cache.match(req);
        if (res) {
          const buf = await res.clone().arrayBuffer();
          totalBytes += buf.byteLength;
        }
      }
    }
  }
  return { fileCount, sizeBytes: totalBytes };
}
