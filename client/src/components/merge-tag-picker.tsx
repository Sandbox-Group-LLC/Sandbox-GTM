import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Code2 } from "lucide-react";
import { MERGE_TAGS } from "@shared/mergeTags";
import { useMediaQuery } from "@/hooks/use-media-query";

interface MergeTagPickerProps {
  onInsert: (tag: string) => void;
  categories?: string[];
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value?: string;
  onChange?: (value: string) => void;
}

export function MergeTagPicker({ onInsert, categories, inputRef, value, onChange }: MergeTagPickerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const filteredCategories = categories
    ? MERGE_TAGS.filter((c) => categories.includes(c.category))
    : MERGE_TAGS;

  const handleInsert = (tag: string) => {
    if (inputRef?.current && value !== undefined && onChange) {
      const input = inputRef.current;
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const newValue = value.substring(0, start) + tag + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        const newPosition = start + tag.length;
        input.setSelectionRange(newPosition, newPosition);
        input.focus();
      }, 0);
    } else {
      onInsert(tag);
    }
    setOpen(false);
  };

  const TagList = () => (
    <>
      {filteredCategories.map((category) => (
        <div key={category.category} className="mb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
            {category.label}
          </div>
          <div className="space-y-1">
            {category.tags.map((tag) => (
              <button
                key={tag.tag}
                type="button"
                className="w-full flex items-center gap-2 p-2 rounded-md text-left hover-elevate"
                onClick={() => handleInsert(tag.tag)}
                data-testid={`button-insert-tag-${tag.tag.replace(/[{}\.]/g, "-")}`}
              >
                <Badge variant="secondary" className="font-mono text-xs shrink-0 no-default-hover-elevate no-default-active-elevate">
                  {tag.tag.replace(/\{\{|\}\}/g, "")}
                </Badge>
                <span className="text-sm text-muted-foreground">{tag.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  // Use Drawer on mobile for better touch scrolling
  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Insert Property"
            data-testid="button-merge-tag-picker"
          >
            <Code2 className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Insert Property</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
            <TagList />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Use Popover on desktop
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Insert Property"
          data-testid="button-merge-tag-picker"
        >
          <Code2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0" 
        align="end" 
        side="bottom"
        collisionPadding={16}
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Insert Property</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Click to insert at cursor
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <TagList />
        </div>
      </PopoverContent>
    </Popover>
  );
}
