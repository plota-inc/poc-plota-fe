import { create } from "zustand";
import {
  ConversationRecord,
  saveConversation,
  getAllConversations,
} from "@/lib/conversation-db";

export type GenerationStatus = "idle" | "generating" | "done" | "error";
export type ActiveMode = "rewrite" | "describe" | "expand" | "none";
export type RewriteOption = "rephrase" | "shorter" | "more_descriptive" | "show_not_tell" | "more_inner_conflict" | "more_intense" | "customize";
export type DescribeOption = "sight" | "smell" | "taste" | "sound" | "touch";

interface AIState {
  status: GenerationStatus;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  generatedText: string;
  error: string | null;
  activeMode: ActiveMode;
  rewriteOption: RewriteOption;
  describeOption: DescribeOption;

  conversations: ConversationRecord[];
  currentConversationIndex: number;
  currentConversationId: string | null;

  setSelectedText: (text: string) => void;
  setContext: (before: string, after: string) => void;
  setGeneratedText: (text: string) => void;
  appendToken: (token: string) => void;
  setStatus: (status: GenerationStatus) => void;
  setError: (error: string | null) => void;
  setActiveMode: (mode: ActiveMode) => void;
  setRewriteOption: (option: RewriteOption) => void;
  setDescribeOption: (option: DescribeOption) => void;
  reset: () => void;

  startNewConversation: (mode: ActiveMode) => void;
  saveCurrentConversation: (model: string, instruction?: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  navigateConversation: (direction: "prev" | "next") => void;
  setConversations: (convs: ConversationRecord[]) => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  status: "idle",
  selectedText: "",
  contextBefore: "",
  contextAfter: "",
  generatedText: "",
  error: null,
  activeMode: "none",
  rewriteOption: "rephrase",
  describeOption: "sight",

  conversations: [],
  currentConversationIndex: -1,
  currentConversationId: null,

  setSelectedText: (selectedText) => set({ selectedText }),
  setContext: (contextBefore, contextAfter) => set({ contextBefore, contextAfter }),
  setGeneratedText: (generatedText) => set({ generatedText }),
  appendToken: (token) =>
    set((state) => ({ generatedText: state.generatedText + token })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: "error" }),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setRewriteOption: (option) => set({ rewriteOption: option }),
  setDescribeOption: (option) => set({ describeOption: option }),
  reset: () =>
    set({ status: "idle", selectedText: "", contextBefore: "", contextAfter: "", generatedText: "", error: null, activeMode: "none", currentConversationId: null, currentConversationIndex: -1, conversations: [] }),

  startNewConversation: (mode) => {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { conversations } = get();
    set({
      currentConversationId: id,
      currentConversationIndex: conversations.length,
      activeMode: mode,
      generatedText: "",
      error: null,
      status: "idle",
    });
  },

  saveCurrentConversation: async (model, instruction) => {
    const state = get();
    if (!state.currentConversationId || !state.generatedText) return;

    const record: ConversationRecord = {
      id: state.currentConversationId,
      createdAt: Date.now(),
      mode: state.activeMode,
      rewriteOption: state.activeMode === "rewrite" ? state.rewriteOption : undefined,
      describeOption: state.activeMode === "describe" ? state.describeOption : undefined,
      selectedText: state.selectedText,
      generatedText: state.generatedText,
      model,
      instruction,
    };

    await saveConversation(record);

    const updated = [...state.conversations, record];
    set({
      conversations: updated,
      currentConversationIndex: updated.length - 1,
    });
  },

  loadConversations: async () => {
    const convs = await getAllConversations();
    set({ conversations: convs });
  },

  navigateConversation: (direction) => {
    const { conversations, currentConversationIndex } = get();
    if (conversations.length === 0) return;

    let newIndex: number;
    if (currentConversationIndex === -1) {
      newIndex = direction === "prev" ? conversations.length - 1 : 0;
    } else {
      newIndex = direction === "prev"
        ? currentConversationIndex - 1
        : currentConversationIndex + 1;
    }

    if (newIndex < 0 || newIndex >= conversations.length) return;

    const conv = conversations[newIndex];
    set({
      currentConversationIndex: newIndex,
      currentConversationId: conv.id,
      activeMode: conv.mode,
      selectedText: conv.selectedText,
      generatedText: conv.generatedText,
      rewriteOption: conv.rewriteOption ?? "rephrase",
      describeOption: conv.describeOption ?? "sight",
      status: "done",
      error: null,
    });
  },

  setConversations: (convs) => set({ conversations: convs }),
}));
