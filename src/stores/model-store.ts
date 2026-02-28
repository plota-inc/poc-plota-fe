import { create } from "zustand";

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
  selectedModel: string;
  availableModels: OllamaModelInfo[];
  ollamaConnected: boolean;
  modelNotFound: boolean;
  setStatus: (status: ModelStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (models: OllamaModelInfo[]) => void;
  setOllamaConnected: (connected: boolean) => void;
  setModelNotFound: (notFound: boolean) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  status: "idle",
  progress: 0,
  error: null,
  selectedModel: "qwen2.5:7b",
  availableModels: [],
  ollamaConnected: false,
  modelNotFound: false,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, status: "error" }),
  setSelectedModel: (selectedModel) => set({ selectedModel, modelNotFound: false }),
  setAvailableModels: (availableModels) => set({ availableModels }),
  setOllamaConnected: (ollamaConnected) => set({ ollamaConnected }),
  setModelNotFound: (modelNotFound) => set({ modelNotFound }),
}));
