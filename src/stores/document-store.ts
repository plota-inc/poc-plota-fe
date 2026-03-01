import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DocumentData,
  saveDocument,
  getDocument,
  getAllDocuments,
  deleteDocument as dbDeleteDocument,
} from "@/lib/db";

interface DocumentState {
  currentDocId: string | null;
  documents: DocumentData[];

  loadDocuments: () => Promise<void>;
  createDocument: () => Promise<string>;
  selectDocument: (id: string) => void;
  deleteDocument: (id: string) => Promise<void>;
  updateTitle: (title: string) => void;
  refreshDocumentInList: (doc: DocumentData) => void;
}

let titleSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      currentDocId: null,
      documents: [],

      loadDocuments: async () => {
        const docs = await getAllDocuments();
        set({ documents: docs });

        const { currentDocId } = get();
        if (currentDocId && !docs.find((d) => d.id === currentDocId)) {
          set({ currentDocId: docs.length > 0 ? docs[0].id : null });
        }
      },

      createDocument: async () => {
        const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = Date.now();
        const doc: DocumentData = {
          id,
          title: "",
          content: null,
          createdAt: now,
          updatedAt: now,
        };
        await saveDocument(doc);
        const docs = await getAllDocuments();
        set({ documents: docs, currentDocId: id });
        return id;
      },

      selectDocument: (id: string) => {
        set({ currentDocId: id });
      },

      deleteDocument: async (id: string) => {
        await dbDeleteDocument(id);
        const { currentDocId } = get();
        const docs = await getAllDocuments();
        set({ documents: docs });

        if (currentDocId === id) {
          set({ currentDocId: docs.length > 0 ? docs[0].id : null });
        }
      },

      updateTitle: (title: string) => {
        const { currentDocId, documents } = get();
        if (!currentDocId) return;

        const updated = documents.map((d) =>
          d.id === currentDocId ? { ...d, title, updatedAt: Date.now() } : d
        );
        set({ documents: updated });

        if (titleSaveTimeout) clearTimeout(titleSaveTimeout);
        titleSaveTimeout = setTimeout(async () => {
          const existing = await getDocument(currentDocId);
          if (existing) {
            await saveDocument({ ...existing, title, updatedAt: Date.now() });
          }
        }, 500);
      },

      refreshDocumentInList: (doc: DocumentData) => {
        const { documents } = get();
        const idx = documents.findIndex((d) => d.id === doc.id);
        if (idx >= 0) {
          const updated = [...documents];
          updated[idx] = doc;
          set({ documents: updated });
        } else {
          set({ documents: [doc, ...documents] });
        }
      },
    }),
    {
      name: "document-storage",
      partialize: (state) => ({ currentDocId: state.currentDocId }),
    }
  )
);
