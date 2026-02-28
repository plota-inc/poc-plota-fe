import { create } from "zustand";

export type ModelStatus = "idle" | "downloading" | "compiling" | "ready" | "error";

interface ModelState {
  status: ModelStatus;
  progress: number;
  error: string | null;
  setStatus: (status: ModelStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  status: "idle",
  progress: 0,
  error: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, status: "error" }),
}));
