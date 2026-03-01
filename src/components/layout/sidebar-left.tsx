"use client";

import { FilePlus, Upload, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18nStore } from "@/stores/i18n-store";
import { useDocumentStore } from "@/stores/document-store";
import { useEffect, useState } from "react";

export function SidebarLeft() {
    const { t } = useI18nStore();
    const {
        documents,
        currentDocId,
        loadDocuments,
        createDocument,
        selectDocument,
        deleteDocument,
    } = useDocumentStore();
    const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleCreateDocument = async () => {
        await createDocument();
    };

    const handleDelete = async (id: string) => {
        await deleteDocument(id);
        setDeleteConfirmId(null);
    };

    return (
        <div className="flex h-full w-64 flex-col border-r bg-muted/10">
            <div className="p-4 flex gap-2">
                <Button
                    className="flex-1 shadow-sm"
                    variant="default"
                    size="sm"
                    onClick={handleCreateDocument}
                >
                    <FilePlus className="mr-2 h-4 w-4" />
                    {t("sidebarLeft.newFile")}
                </Button>
                <Button variant="outline" size="sm" className="px-3 shadow-sm">
                    <Upload className="h-4 w-4" />
                    <span className="sr-only">{t("sidebarLeft.importFile")}</span>
                </Button>
            </div>
            <Separator className="opacity-50" />

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 flex flex-col gap-1">
                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase px-2 py-2">
                        {t("sidebarLeft.localDocuments")}
                    </div>

                    {documents.length === 0 && (
                        <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                            {t("sidebarLeft.noDocuments")}
                        </div>
                    )}

                    {documents.map((doc) => {
                        const isActive = doc.id === currentDocId;
                        const isHovered = hoveredDocId === doc.id;
                        const displayTitle = doc.title || t("sidebarLeft.untitledDocument");

                        return (
                            <div
                                key={doc.id}
                                className="relative group"
                                onMouseEnter={() => setHoveredDocId(doc.id)}
                                onMouseLeave={() => setHoveredDocId(null)}
                            >
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={`w-full justify-start pr-8 ${
                                        isActive
                                            ? "font-medium bg-muted/50 hover:bg-muted"
                                            : "font-normal text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                    }`}
                                    size="sm"
                                    onClick={() => selectDocument(doc.id)}
                                >
                                    <FileText
                                        className={`mr-2 h-4 w-4 flex-shrink-0 ${
                                            isActive ? "text-primary" : "opacity-50"
                                        }`}
                                    />
                                    <span className="truncate">{displayTitle}</span>
                                </Button>

                                {(isActive || isHovered || deleteConfirmId === doc.id) && (
                                    <DropdownMenu
                                        onOpenChange={(open) => {
                                            if (!open) setDeleteConfirmId(null);
                                        }}
                                    >
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            {deleteConfirmId === doc.id ? (
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(doc.id);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {t("sidebarLeft.confirmDelete")}
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setDeleteConfirmId(doc.id);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {t("sidebarLeft.delete")}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
