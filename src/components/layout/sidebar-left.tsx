import { FilePlus, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function SidebarLeft() {
    return (
        <div className="flex h-full w-64 flex-col border-r bg-muted/10">
            <div className="p-4 flex gap-2">
                <Button className="flex-1 shadow-sm" variant="default" size="sm">
                    <FilePlus className="mr-2 h-4 w-4" />
                    New File
                </Button>
                <Button variant="outline" size="sm" className="px-3 shadow-sm">
                    <Upload className="h-4 w-4" />
                    <span className="sr-only">Import File</span>
                </Button>
            </div>
            <Separator className="opacity-50" />

            <ScrollArea className="flex-1">
                <div className="p-3 flex flex-col gap-1">
                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase px-2 py-2">
                        Local Documents
                    </div>

                    <Button variant="secondary" className="w-full justify-start font-medium bg-muted/50 hover:bg-muted" size="sm">
                        <FileText className="mr-2 h-4 w-4 text-primary" />
                        <span className="truncate">Untitled Document 1</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start font-normal text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors" size="sm">
                        <FileText className="mr-2 h-4 w-4 opacity-50" />
                        <span className="truncate">Story Draft - Feb 28</span>
                    </Button>
                </div>
            </ScrollArea>
        </div>
    );
}
