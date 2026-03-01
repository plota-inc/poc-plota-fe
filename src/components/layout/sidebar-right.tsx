"use client";

import {
  Sparkles,
  RefreshCw,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Terminal,
  AlertCircle,
  ExternalLink,
  Copy,
  PenTool,
  Expand,
  ArrowLeftCircle,
  ThumbsDown,
  ThumbsUp,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIStore, RewriteOption, DescribeOption } from "@/stores/ai-store";
import { useModelStore } from "@/stores/model-store";
import { generate, checkHealth, listModels, abort } from "@/lib/ollama-client";
import { buildMessages } from "@/lib/agents";
import { openExternal } from "@/lib/utils";
import { useI18nStore } from "@/stores/i18n-store";
import { useState, useCallback, useEffect } from "react";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "warn" | "success" | "error";
}

function timestamp() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

export function SidebarRight() {
  const {
    selectedText,
    contextBefore,
    contextAfter,
    generatedText,
    status: aiStatus,
    activeMode,
    rewriteOption,
    describeOption,
    setGeneratedText,
    appendToken,
    setStatus,
    setError,
    setRewriteOption,
    setDescribeOption,
    conversations,
    currentConversationIndex,
    saveCurrentConversation,
    loadConversations,
    navigateConversation,
  } = useAIStore();
  const { t, language } = useI18nStore();
  const {
    selectedModels,
    availableModels,
    ollamaConnected,
    modelNotFound,
    setSelectedModel,
    setAvailableModels,
    setOllamaConnected,
    setModelNotFound,
  } = useModelStore();
  const [instruction, setInstruction] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const selectedModel = selectedModels[language] || "qwen2.5:7b";

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      setLogs((prev) => [...prev, { time: timestamp(), message, type }]);
    },
    [],
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function check() {
      const connected = await checkHealth();
      setOllamaConnected(connected);
    }

    check();
    interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [setOllamaConnected]);

  useEffect(() => {
    async function loadModels() {
      if (!ollamaConnected) return;
      try {
        const models = await listModels();
        setAvailableModels(
          models.map((m) => ({
            name: m.name,
            size: m.size,
            parameterSize: m.details?.parameter_size ?? "N/A",
            quantizationLevel: m.details?.quantization_level ?? "N/A",
          })),
        );
      } catch {
        // ignore
      }
    }
    loadModels();
  }, [ollamaConnected, setAvailableModels]);

  const hasSelection = selectedText.trim().length > 0;
  const isGenerating = aiStatus === "generating";

  const handleGenerate = async () => {
    if (!selectedText) return;

    if (!ollamaConnected) {
      setError("Ollama가 실행 중이 아닙니다. ollama.com에서 설치 후 실행해주세요.");
      return;
    }

    try {
      setStatus("generating");
      setGeneratedText("");
      setError(null);
      setModelNotFound(false);

      const { systemPrompt, userPrompt } = buildMessages(
        activeMode,
        selectedText,
        rewriteOption,
        describeOption,
        instruction,
        contextBefore,
        contextAfter,
      );

      addLog(`모델: ${selectedModel}`);
      addLog(`에이전트: ${activeMode} / 옵션: ${activeMode === "rewrite" ? rewriteOption : activeMode === "describe" ? describeOption : "-"}`);
      addLog(`[System Prompt] ${systemPrompt}`);
      addLog(`[User Prompt] ${userPrompt}`);
      addLog("텍스트 생성 시작...");

      const stats = await generate(
        userPrompt,
        systemPrompt,
        (token: string) => {
          appendToken(token);
        },
        selectedModel,
      );

      addLog(
        `생성 완료: ${stats.numTokens} tokens / ${(stats.elapsedMs / 1000).toFixed(1)}s (${stats.tokensPerSecond} tok/s)`,
        "success",
      );
      setLogsOpen(true);
      setStatus("done");

      await saveCurrentConversation(selectedModel, instruction);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        addLog("생성이 중단되었습니다.", "warn");
        setStatus("idle");
        return;
      }
      const rawMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("AI Generation Error:", err);

      let userMessage: string;
      if (rawMessage.includes("unable to load model")) {
        userMessage = t("sidebarRight.modelTooLarge");
      } else if (rawMessage.includes("not found") || rawMessage.includes("404")) {
        setModelNotFound(true);
        userMessage = rawMessage;
      } else {
        userMessage = rawMessage;
      }

      addLog(`에러: ${rawMessage}`, "error");
      setError(userMessage);
    }
  };

  const handleAbort = () => {
    abort();
  };

  const handleReplace = () => {
    if (generatedText) {
      window.dispatchEvent(
        new CustomEvent("editor:replace", { detail: { text: generatedText } }),
      );
    }
  };

  const handleInsertBelow = () => {
    if (generatedText) {
      window.dispatchEvent(
        new CustomEvent("editor:insert", { detail: { text: generatedText } }),
      );
    }
  };

  const handleCopy = () => {
    if (generatedText) {
      navigator.clipboard.writeText(generatedText);
      addLog("결과가 클립보드에 복사되었습니다.", "success");
    }
  };

  const renderModeHeader = () => {
    switch (activeMode) {
      case "rewrite":
        return (
          <div className="flex items-center gap-2 mb-4">
            <PenTool className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Rewrite</h3>
          </div>
        );
      case "describe":
        return (
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Describe</h3>
          </div>
        );
      case "expand":
        return (
          <div className="flex items-center gap-2 mb-4">
            <Expand className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Expand</h3>
          </div>
        );
      default:
        return null;
    }
  };

  const renderOptionSelector = () => {
    if (activeMode === "rewrite") {
      return (
        <div className="mb-4 space-y-2 relative z-10">
          <Select
            value={rewriteOption}
            onValueChange={(val: RewriteOption) => setRewriteOption(val)}
            disabled={isGenerating}
          >
            <SelectTrigger className="w-full bg-background border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder={t("sidebarRight.rewriteHolder")} />
            </SelectTrigger>
            <SelectContent className="bg-background border-zinc-200 dark:border-zinc-800">
              <SelectItem value="rephrase">{t("sidebarRight.rewrite.rephrase")}</SelectItem>
              <SelectItem value="shorter">{t("sidebarRight.rewrite.shorter")}</SelectItem>
              <SelectItem value="more_descriptive">{t("sidebarRight.rewrite.moreDescriptive")}</SelectItem>
              <SelectItem value="show_not_tell">{t("sidebarRight.rewrite.showNotTell")}</SelectItem>
              <SelectItem value="more_inner_conflict">{t("sidebarRight.rewrite.moreInnerConflict")}</SelectItem>
              <SelectItem value="more_intense">{t("sidebarRight.rewrite.moreIntense")}</SelectItem>
              <SelectItem value="customize">{t("sidebarRight.rewrite.customize")}</SelectItem>
            </SelectContent>
          </Select>

          {rewriteOption === "customize" && (
            <Textarea
              placeholder={t("sidebarRight.rewritePlaceholder")}
              className="h-20 resize-none text-sm bg-background transition-colors dark:border-zinc-800"
              disabled={isGenerating}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          )}
        </div>
      );
    }

    if (activeMode === "describe") {
      return (
        <div className="mb-4 space-y-2 relative z-10">
          <Select
            value={describeOption}
            onValueChange={(val: DescribeOption) => setDescribeOption(val)}
            disabled={isGenerating}
          >
            <SelectTrigger className="w-full bg-background border-zinc-200 dark:border-zinc-800">
              <SelectValue placeholder={t("sidebarRight.describeHolder")} />
            </SelectTrigger>
            <SelectContent className="bg-background border-zinc-200 dark:border-zinc-800">
              <SelectItem value="sight">{t("sidebarRight.describe.sight")}</SelectItem>
              <SelectItem value="smell">{t("sidebarRight.describe.smell")}</SelectItem>
              <SelectItem value="taste">{t("sidebarRight.describe.taste")}</SelectItem>
              <SelectItem value="sound">{t("sidebarRight.describe.sound")}</SelectItem>
              <SelectItem value="touch">{t("sidebarRight.describe.touch")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-muted/10">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">{t("sidebarRight.title")}</h2>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${ollamaConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span>{ollamaConnected ? t("sidebarRight.connected") : t("sidebarRight.disconnected")}</span>
        </div>
      </div>

      {ollamaConnected && availableModels.length > 0 && (
        <div className="px-4 py-2 border-b flex items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground shrink-0">Model</span>
          <Select
            value={selectedModel}
            onValueChange={(val) => setSelectedModel(language, val)}
          >
            <SelectTrigger className="h-7 text-xs flex-1 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <span className="font-mono">{model.name}</span>
                  <span className="text-muted-foreground ml-2">
                    ({model.parameterSize})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {conversations.length > 0 && (
        <div className="px-4 py-1.5 border-b flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentConversationIndex <= 0 || isGenerating}
            onClick={() => navigateConversation("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[11px] text-muted-foreground font-medium">
            {currentConversationIndex >= 0
              ? `${currentConversationIndex + 1} / ${conversations.length}`
              : `— / ${conversations.length}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={currentConversationIndex >= conversations.length - 1 || isGenerating}
            onClick={() => navigateConversation("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {(!ollamaConnected || modelNotFound) && (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-destructive">
              {modelNotFound && ollamaConnected
                ? t("sidebarRight.modelNotFound")
                : t("sidebarRight.ollamaNotRunning")}
            </p>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {modelNotFound && ollamaConnected ? t("sidebarRight.howToInstallModel") : t("sidebarRight.howToInstall")}
            </p>

            {!ollamaConnected && (
              <div className="space-y-1.5">
                <p className="font-medium">{t("sidebarRight.step1DownloadOllama")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 justify-start"
                  onClick={() => openExternal("https://ollama.com/download")}
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("sidebarRight.downloadFrom")}
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="font-medium">
                {!ollamaConnected ? t("sidebarRight.step2DownloadModel") : t("sidebarRight.downloadModelInTerminal")}
              </p>
              <button
                className="w-full text-left font-mono text-[11px] bg-zinc-900 text-zinc-300 px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(`ollama pull ${selectedModel}`);
                }}
              >
                <span>$ ollama pull {selectedModel}</span>
                <Copy className="h-3 w-3 text-zinc-500 shrink-0" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="font-medium">
                {!ollamaConnected ? t("sidebarRight.step3Check") : t("sidebarRight.afterDownload")}
              </p>
              <p className="text-muted-foreground/80">
                {modelNotFound && ollamaConnected
                  ? t("sidebarRight.pleasePressGenerate")
                  : t("sidebarRight.autoStartInfo")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log area */}
      {logs.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setLogsOpen(!logsOpen)}
            className="flex w-full items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {logsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <Terminal className="h-3 w-3" />
            <span>{t("sidebarRight.logs")} ({logs.length})</span>
          </button>

          {logsOpen && (
            <div className="max-h-40 overflow-y-auto bg-zinc-950 px-3 py-2 font-mono text-[10px] leading-relaxed">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "warn"
                        ? "text-yellow-400"
                        : log.type === "success"
                          ? "text-green-400"
                          : "text-zinc-400"
                  }
                >
                  <span className="text-zinc-600 mr-1.5">{log.time}</span>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {(!hasSelection || activeMode === "none") && (
          <div className="flex-1 p-4 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-20" />
            <div>
              <p className="text-sm font-medium mb-1">
                {t("sidebarRight.selectText")}
              </p>
              <p className="text-xs">
                {t("sidebarRight.highlightContent")}
              </p>
            </div>
          </div>
        )}

        {hasSelection && activeMode !== "none" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("sidebarRight.originalText")}
                </div>
                <div className="text-sm bg-muted/40 border-l-2 border-primary/20 p-3 rounded-r-md italic">
                  &ldquo;{selectedText}&rdquo;
                </div>
              </div>

              {renderModeHeader()}

              {renderOptionSelector()}

              {(generatedText || isGenerating) && (
                <div className="space-y-2">
                  <div className="text-[10px] flex items-center gap-2 font-bold text-primary uppercase tracking-wider">
                    {t("sidebarRight.aiSuggestion")}
                    {isGenerating && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                  </div>
                  <div className="text-sm border shadow-sm p-4 rounded-xl min-h-[120px] leading-relaxed whitespace-pre-wrap bg-background relative">
                    {generatedText}
                    {isGenerating && (
                      <span className="animate-pulse absolute bottom-4 right-4 text-primary text-xl leading-none">
                        ...
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {activeMode !== "none" && (
          <div className="p-4 border-t bg-background mt-auto space-y-3 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] relative z-20">
            {isGenerating ? (
              <Button
                className="w-full font-medium"
                variant="destructive"
                onClick={handleAbort}
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("sidebarRight.stopGenerating")}
              </Button>
            ) : !generatedText ? (
              <Button
                className="w-full font-medium"
                variant="default"
                disabled={!hasSelection || !ollamaConnected}
                onClick={handleGenerate}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t("sidebarRight.generateDraft")}
              </Button>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-medium text-foreground hover:bg-muted px-2"
                    onClick={handleInsertBelow}
                  >
                    <ArrowLeftCircle className="mr-1.5 h-5 w-5" />
                    <span className="text-sm">{t("sidebarRight.insert")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-medium text-foreground hover:bg-muted px-2"
                    onClick={handleCopy}
                  >
                    <Copy className="mr-1.5 h-5 w-5" />
                    <span className="text-sm">{t("sidebarRight.copy")}</span>
                  </Button>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <ThumbsDown className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <ThumbsUp className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Star className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
