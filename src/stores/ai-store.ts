import { create } from "zustand";

export type GenerationStatus = "idle" | "generating" | "done" | "error";

interface AIState {
  status: GenerationStatus;
  selectedText: string;
  generatedText: string;
  error: string | null;
  setSelectedText: (text: string) => void;
  setGeneratedText: (text: string) => void;
  appendToken: (token: string) => void;
  setStatus: (status: GenerationStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  status: "idle",
  selectedText: "",
  generatedText: "",
  error: null,
  setSelectedText: (selectedText) => set({ selectedText }),
  setGeneratedText: (generatedText) => set({ generatedText }),
  appendToken: (token) =>
    set((state) => ({ generatedText: state.generatedText + token })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
  reset: () =>
    set({ status: "idle", selectedText: "", generatedText: "", error: null }),
}));
