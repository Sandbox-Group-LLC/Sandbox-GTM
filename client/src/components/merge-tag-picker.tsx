import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Code2 } from "lucide-react";
import { MERGE_TAGS } from "@shared/mergeTags";

interface MergeTagPickerProps {
  onInsert: (tag: string) => void;
  categories?: string[];
}

export function MergeTagPicker({ onInsert, categories }: MergeTagPickerProps) {
  const filteredCategories = categories
    ? MERGE_TAGS.filter((c) => categories.includes(c.category))
    : MERGE_TAGS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Insert merge tag"
          data-testid="button-merge-tag-picker"
        >
          <Code2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Insert Merge Tag</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Click a tag to insert it at cursor position
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filteredCategories.map((category) => (
            <div key={category.category} className="p-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
                {category.label}
              </div>
              <div className="space-y-1">
                {category.tags.map((tag) => (
                  <button
                    key={tag.tag}
                    type="button"
                    className="w-full flex items-start gap-2 p-2 rounded-md text-left hover-elevate"
                    onClick={() => onInsert(tag.tag)}
                    data-testid={`button-insert-tag-${tag.tag.replace(/[{}\.]/g, "-")}`}
                  >
                    <Badge variant="secondary" className="font-mono text-xs shrink-0">
                      {tag.tag}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{tag.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tag.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
