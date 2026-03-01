"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SettingsDialog } from "./settings-dialog";
import { ModelSelectionDialog } from "./model-selection-dialog";
import { useI18nStore } from "@/stores/i18n-store";

export function Header() {
    const { t } = useI18nStore();

    return (
        <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
            <div className="flex items-center gap-3">
                <Image
                    src="/logo_plota.png"
                    alt="Plota Logo"
                    width={96}
                    height={26}
                    className="object-contain"
                />
            </div>

            <div className="flex items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4 text-green-600 dark:text-green-500 font-medium">
                            <ShieldCheck className="h-4 w-4" />
                            <span>{t("header.secureOfflineMode")}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t("header.secureOfflineModeDesc")}</p>
                    </TooltipContent>
                </Tooltip>

                <ModelSelectionDialog />
                <SettingsDialog />
            </div>
        </header>
    );
}
