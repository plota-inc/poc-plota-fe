import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModelStatus = "idle" | "downloading" | "ready" | "error";

interface OllamaModelInfo {
  name: string;
  size: number;
  parameterSize: string;
  quantizationLevel: string;
}

interface ModelState {
  status: ModelStatus;
  progress: number;
  error: string | null;
  // Map of language code to selected model name
  selectedModels: Record<string, string>;
  availableModels: OllamaModelInfo[];
  ollamaConnected: boolean;
  modelNotFound: boolean;
  setStatus: (status: ModelStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setSelectedModel: (language: string, model: string) => void;
  setAvailableModels: (models: OllamaModelInfo[]) => void;
  setOllamaConnected: (connected: boolean) => void;
  setModelNotFound: (notFound: boolean) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      status: "idle",
      progress: 0,
      error: null,
      selectedModels: {
        ko: "qwen2.5:7b",
        en: "qwen2.5:7b",
        zh: "qwen2.5:7b",
        ja: "qwen2.5:7b",
      },
      availableModels: [],
      ollamaConnected: false,
      modelNotFound: false,
      setStatus: (status) => set({ status }),
      setProgress: (progress) => set({ progress }),
      setError: (error) => set({ error, status: "error" }),
      setSelectedModel: (language, model) =>
        set((state) => ({
          selectedModels: { ...state.selectedModels, [language]: model },
          modelNotFound: false,
        })),
      setAvailableModels: (availableModels) => set({ availableModels }),
      setOllamaConnected: (ollamaConnected) => set({ ollamaConnected }),
      setModelNotFound: (modelNotFound) => set({ modelNotFound }),
    }),
    {
      name: "model-storage",
      partialize: (state) => ({ selectedModels: state.selectedModels }),
    }
  )
);
