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
  ExternalLink,
} from "lucide-react";
import { getDocumentStats, deleteAllDocuments } from "@/lib/db";
import { listModels, checkHealth } from "@/lib/ollama-client";
import { useModelStore } from "@/stores/model-store";
import { openExternal } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface OllamaModelDisplay {
  name: string;
  size: number;
  parameterSize: string;
  quantizationLevel: string;
}

interface StorageInfo {
  models: OllamaModelDisplay[];
  docs: { count: number; sizeBytes: number } | null;
  loading: boolean;
  ollamaOnline: boolean;
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [storage, setStorage] = useState<StorageInfo>({
    models: [],
    docs: null,
    loading: false,
    ollamaOnline: false,
  });
  const [clearing, setClearing] = useState<"docs" | null>(null);
  const { selectedModel, setSelectedModel, setAvailableModels } =
    useModelStore();

  const loadStorageInfo = useCallback(async () => {
    setStorage((s) => ({ ...s, loading: true }));
    try {
      const [ollamaOnline, docs] = await Promise.all([
        checkHealth(),
        getDocumentStats(),
      ]);

      let models: OllamaModelDisplay[] = [];
      if (ollamaOnline) {
        const ollamaModels = await listModels();
        models = ollamaModels.map((m) => ({
          name: m.name,
          size: m.size,
          parameterSize: m.details?.parameter_size ?? "N/A",
          quantizationLevel: m.details?.quantization_level ?? "N/A",
        }));
        setAvailableModels(models);
      }

      setStorage({ models, docs, loading: false, ollamaOnline });
    } catch {
      setStorage((s) => ({ ...s, loading: false }));
    }
  }, [setAvailableModels]);

  useEffect(() => {
    if (open) loadStorageInfo();
  }, [open, loadStorageInfo]);

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
            설정
          </DialogTitle>
          <DialogDescription>
            Ollama 모델과 로컬 문서를 관리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ollama models section */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Ollama 모델</span>
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

            {!storage.ollamaOnline ? (
              <div className="text-xs text-muted-foreground space-y-2">
                <p>Ollama가 실행되고 있지 않습니다.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => openExternal("https://ollama.com")}
                >
                  <ExternalLink className="h-3 w-3" />
                  ollama.com에서 설치
                </Button>
              </div>
            ) : storage.models.length === 0 ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>설치된 모델이 없습니다.</p>
                <p className="font-mono text-[10px] bg-muted p-2 rounded">
                  터미널에서: ollama pull qwen2.5:7b
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {storage.models.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => setSelectedModel(model.name)}
                    className={`w-full text-left rounded-md border p-2.5 transition-colors text-xs ${
                      selectedModel === model.name
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium font-mono">
                        {model.name}
                      </span>
                      {selectedModel === model.name && (
                        <span className="text-[10px] text-primary font-medium">
                          사용 중
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-muted-foreground">
                      <span>{model.parameterSize}</span>
                      <span>{model.quantizationLevel}</span>
                      <span>{formatBytes(model.size)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
