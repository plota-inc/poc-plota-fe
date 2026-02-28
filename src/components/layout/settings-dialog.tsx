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
  Brain,
  FileText,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getDocumentStats, getModelCacheStats, deleteAllDocuments } from "@/lib/db";
import { getLLMProxy, terminateWorker } from "@/lib/llm-client";
import { useModelStore } from "@/stores/model-store";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface StorageInfo {
  model: { fileCount: number; sizeBytes: number } | null;
  docs: { count: number; sizeBytes: number } | null;
  loading: boolean;
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [storage, setStorage] = useState<StorageInfo>({
    model: null,
    docs: null,
    loading: false,
  });
  const [clearing, setClearing] = useState<"model" | "docs" | null>(null);
  const { setStatus: setModelStatus } = useModelStore();

  const loadStorageInfo = useCallback(async () => {
    setStorage((s) => ({ ...s, loading: true }));
    try {
      const [model, docs] = await Promise.all([
        getModelCacheStats(),
        getDocumentStats(),
      ]);
      setStorage({ model, docs, loading: false });
    } catch {
      setStorage((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (open) loadStorageInfo();
  }, [open, loadStorageInfo]);

  const handleClearModel = async () => {
    setClearing("model");
    try {
      const llm = getLLMProxy();
      await llm.clearCache();
      terminateWorker();
      setModelStatus("idle");
      await loadStorageInfo();
    } catch (e) {
      console.error("Failed to clear model cache:", e);
    }
    setClearing(null);
  };

  const handleClearDocs = async () => {
    if (!confirm("모든 문서가 삭제됩니다. 계속하시겠습니까?")) return;
    setClearing("docs");
    try {
      await deleteAllDocuments();
      await loadStorageInfo();
    } catch (e) {
      console.error("Failed to clear documents:", e);
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
            로컬 저장소 관리
          </DialogTitle>
          <DialogDescription>
            브라우저에 저장된 AI 모델과 문서 데이터를 관리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Model cache section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI 모델 캐시</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={loadStorageInfo}
                disabled={storage.loading}
              >
                <RefreshCw
                  className={`h-3 w-3 ${storage.loading ? "animate-spin" : ""}`}
                />
                새로고침
              </Button>
            </div>

            {storage.loading && !storage.model ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                조회 중...
              </div>
            ) : storage.model ? (
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>파일 수</span>
                  <span className="font-mono">
                    {storage.model.fileCount}개
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>총 용량</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatBytes(storage.model.sizeBytes)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                저장된 모델이 없습니다.
              </p>
            )}

            <Button
              variant="destructive"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleClearModel}
              disabled={
                clearing !== null ||
                !storage.model ||
                storage.model.sizeBytes === 0
              }
            >
              {clearing === "model" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              모델 캐시 삭제
            </Button>
          </div>

          <Separator />

          {/* Documents section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">내 문서</span>
            </div>

            {storage.loading && !storage.docs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                조회 중...
              </div>
            ) : storage.docs ? (
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>문서 수</span>
                  <span className="font-mono">{storage.docs.count}개</span>
                </div>
                <div className="flex justify-between">
                  <span>총 용량</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatBytes(storage.docs.sizeBytes)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                저장된 문서가 없습니다.
              </p>
            )}

            <Button
              variant="destructive"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleClearDocs}
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
              모든 문서 삭제
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
