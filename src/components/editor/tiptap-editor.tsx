"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { useAIStore } from "@/stores/ai-store";
import { saveDocument, getDocument } from "@/lib/db";

const DOC_ID = "default-doc";

export function TiptapEditor() {
    const [isLoaded, setIsLoaded] = useState(false);
    const setSelectedText = useAIStore((state) => state.setSelectedText);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: "Start writing your story here...",
            }),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
            },
        },
        onUpdate: ({ editor }) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(async () => {
                try {
                    const existing = await getDocument(DOC_ID);
                    const now = Date.now();

                    await saveDocument({
                        id: DOC_ID,
                        title: existing?.title || "Untitled Document",
                        content: editor.getJSON(),
                        updatedAt: now,
                        createdAt: existing ? existing.createdAt : now,
                    });
                } catch (error) {
                    console.error("Failed to save document:", error);
                }
            }, 1000);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;

            if (empty) {
                setSelectedText("");
                return;
            }

            const text = editor.state.doc.textBetween(from, to, " ");
            setSelectedText(text);
        },
    });

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                const doc = await getDocument(DOC_ID);
                if (doc && isMounted && editor) {
                    editor.commands.setContent(doc.content as any);
                }
            } catch (err) {
                console.error("Error loading document:", err);
            } finally {
                if (isMounted) {
                    setIsLoaded(true);
                }
            }
        }

        if (editor && !isLoaded) {
            loadData();
        }

        const handleReplace = (e: any) => {
            if (!editor || !e.detail?.text) return;
            const currentSelection = editor.state.selection;
            if (!currentSelection.empty) {
                editor.commands.insertContentAt(
                    { from: currentSelection.from, to: currentSelection.to },
                    e.detail.text
                );
            }
        };

        const handleInsert = (e: any) => {
            if (!editor || !e.detail?.text) return;
            const currentSelection = editor.state.selection;
            if (!currentSelection.empty) {
                editor.commands.insertContentAt(
                    currentSelection.to,
                    `\n\n${e.detail.text}`
                );
            }
        };

        window.addEventListener('editor:replace', handleReplace);
        window.addEventListener('editor:insert', handleInsert);

        return () => {
            isMounted = false;
            window.removeEventListener('editor:replace', handleReplace);
            window.removeEventListener('editor:insert', handleInsert);
        };
    }, [editor, isLoaded]);

    if (!editor || !isLoaded) {
        return <div className="animate-pulse bg-muted/20 h-96 w-full rounded-md" />;
    }

    return (
        <div className="tiptap-editor-wrapper">
            <EditorContent editor={editor} />
        </div>
    );
}
