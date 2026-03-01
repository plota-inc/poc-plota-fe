"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  HardDrive,
  FileText,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";
import { getDocumentStats, deleteAllDocuments } from "@/lib/db";
import {
  getConversationStats,
  deleteAllConversations,
} from "@/lib/conversation-db";
import { useAIStore } from "@/stores/ai-store";
import { useI18nStore } from "@/stores/i18n-store";
import { Language } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface StorageInfo {
  docs: { count: number; sizeBytes: number } | null;
  convs: { count: number; sizeBytes: number } | null;
  loading: boolean;
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [storage, setStorage] = useState<StorageInfo>({
    docs: null,
    convs: null,
    loading: false,
  });
  const [clearing, setClearing] = useState<"docs" | "convs" | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<"docs" | "convs" | null>(null);
  const { t, language, setLanguage } = useI18nStore();

  const loadStorageInfo = useCallback(async () => {
    setStorage((s) => ({ ...s, loading: true }));

    let docs: { count: number; sizeBytes: number } | null = null;
    let convs: { count: number; sizeBytes: number } | null = null;

    try {
      docs = await getDocumentStats();
    } catch (e) {
      console.error("Failed to load document stats:", e);
    }

    try {
      convs = await getConversationStats();
    } catch (e) {
      console.error("Failed to load conversation stats:", e);
    }

    setStorage({ docs, convs, loading: false });
  }, []);

  useEffect(() => {
    if (open) loadStorageInfo();
  }, [open, loadStorageInfo]);

  const { reset: resetAI } = useAIStore();
  const conversations = useAIStore((s) => s.conversations);

  const convCount = storage.convs?.count ?? conversations.length;

  const handleClearDocs = async () => {
    setConfirmTarget(null);
    setClearing("docs");
    try {
      await deleteAllDocuments();
      await loadStorageInfo();
    } catch (e) {
      console.error("Failed to clear documents:", e);
    }
    setClearing(null);
  };

  const handleClearConversations = async () => {
    setConfirmTarget(null);
    setClearing("convs");
    try {
      await deleteAllConversations();
    } catch (e) {
      console.error("Failed to clear conversations from DB:", e);
    }
    resetAI();
    try {
      await loadStorageInfo();
    } catch (e) {
      console.error("Failed to reload storage info:", e);
    }
    setClearing(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t("settings.title")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Language section */}
          <div className="rounded-lg border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("settings.language")}</span>
            </div>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>



          {/* Documents section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("settings.myDocuments")}</span>
            </div>

            {storage.loading && !storage.docs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("settings.loading")}
              </div>
            ) : storage.docs ? (
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("settings.documentCount")}</span>
                  <span className="font-mono">{storage.docs.count}{t("settings.countUnit")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("settings.totalSize")}</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatBytes(storage.docs.sizeBytes)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("settings.noDocuments")}
              </p>
            )}

            {confirmTarget === "docs" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive flex-1">{t("settings.confirmDeleteAll")}</span>
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleClearDocs}>
                  {t("settings.confirmYes")}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmTarget(null)}>
                  {t("settings.confirmNo")}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={() => setConfirmTarget("docs")}
                disabled={
                  clearing !== null ||
                  !storage.docs ||
                  storage.docs.count === 0
                }
              >
                {clearing === "docs" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {t("settings.deleteAllDocuments")}
              </Button>
            )}
          </div>

          <Separator />

          {/* Conversations section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("settings.aiConversations")}</span>
            </div>

            {storage.loading && !storage.convs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("settings.loading")}
              </div>
            ) : storage.convs ? (
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("settings.conversationCount")}</span>
                  <span className="font-mono">{storage.convs.count}{t("settings.countUnit")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("settings.totalSize")}</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatBytes(storage.convs.sizeBytes)}
                  </span>
                </div>
              </div>
            ) : conversations.length > 0 ? (
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("settings.conversationCount")}</span>
                  <span className="font-mono">{conversations.length}{t("settings.countUnit")}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("settings.noConversations")}
              </p>
            )}

            {confirmTarget === "convs" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive flex-1">{t("settings.confirmDeleteConversations")}</span>
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={handleClearConversations}>
                  {t("settings.confirmYes")}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmTarget(null)}>
                  {t("settings.confirmNo")}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={() => setConfirmTarget("convs")}
                disabled={clearing !== null || convCount === 0}
              >
                {clearing === "convs" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {t("settings.deleteAllConversations")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
