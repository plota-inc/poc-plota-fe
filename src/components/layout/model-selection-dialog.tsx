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
import { Brain, RefreshCw, ExternalLink } from "lucide-react";
import { listModels, checkHealth } from "@/lib/ollama-client";
import { useModelStore } from "@/stores/model-store";
import { openExternal } from "@/lib/utils";
import { useI18nStore } from "@/stores/i18n-store";
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

interface OllamaModelDisplay {
    name: string;
    size: number;
    parameterSize: string;
    quantizationLevel: string;
}

export function ModelSelectionDialog() {
    const [open, setOpen] = useState(false);
    const [models, setModels] = useState<OllamaModelDisplay[]>([]);
    const [loading, setLoading] = useState(false);
    const [ollamaOnline, setOllamaOnline] = useState(false);

    const { selectedModels, setSelectedModel, setAvailableModels } = useModelStore();
    const { t, language } = useI18nStore();

    const selectedModel = selectedModels[language] || "qwen2.5:7b";

    const loadModelsInfo = useCallback(async () => {
        setLoading(true);
        try {
            const isOnline = await checkHealth();
            setOllamaOnline(isOnline);

            let loadedModels: OllamaModelDisplay[] = [];
            if (isOnline) {
                const ollamaModels = await listModels();
                loadedModels = ollamaModels.map((m) => ({
                    name: m.name,
                    size: m.size,
                    parameterSize: m.details?.parameter_size ?? "N/A",
                    quantizationLevel: m.details?.quantization_level ?? "N/A",
                }));
                setAvailableModels(loadedModels);
            }
            setModels(loadedModels);
        } catch {
            setOllamaOnline(false);
        } finally {
            setLoading(false);
        }
    }, [setAvailableModels]);

    useEffect(() => {
        if (open) loadModelsInfo();
    }, [open, loadModelsInfo]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Brain className="h-4 w-4" />
                    <span className="sr-only">{t("settings.ollamaModels")}</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        {t("settings.ollamaModels")}
                    </DialogTitle>
                    <DialogDescription>
                        {/* Using a static or basic description here as it might not be translated, but you can add settings.ollamaModelsDesc later */}
                        Manage local AI models for offline inference.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Ollama models section */}
                    <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{t("settings.ollamaModels")}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={loadModelsInfo}
                                disabled={loading}
                            >
                                <RefreshCw
                                    className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                                />
                                {t("settings.refresh")}
                            </Button>
                        </div>

                        {!ollamaOnline ? (
                            <div className="text-xs text-muted-foreground space-y-2">
                                <p>{t("settings.ollamaNotRunning")}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5"
                                    onClick={() => openExternal("https://ollama.com")}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {t("settings.installFromOllama")}
                                </Button>
                            </div>
                        ) : models.length === 0 ? (
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>{t("settings.noModelsInstalled")}</p>
                                <p className="font-mono text-[10px] bg-muted p-2 rounded">
                                    {t("settings.terminalCommand")}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {t("settings.currentModel")}
                                    </span>
                                    <Select
                                        value={selectedModel}
                                        onValueChange={(val) => setSelectedModel(language, val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {models.map((model) => (
                                                <SelectItem key={model.name} value={model.name}>
                                                    <span className="font-mono">{model.name}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                                    {models.map((model) => (
                                        <div
                                            key={model.name}
                                            className={`rounded-md border p-2.5 text-xs transition-colors mb-1.5 ${selectedModel === model.name
                                                    ? "border-primary bg-primary/5"
                                                    : "border-transparent bg-muted/30"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium font-mono">
                                                    {model.name}
                                                </span>
                                                {selectedModel === model.name && (
                                                    <span className="text-[10px] text-primary font-medium">
                                                        {t("settings.inUse")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-3 mt-1 text-muted-foreground">
                                                <span>{model.parameterSize}</span>
                                                <span>{model.quantizationLevel}</span>
                                                <span>{formatBytes(model.size)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
