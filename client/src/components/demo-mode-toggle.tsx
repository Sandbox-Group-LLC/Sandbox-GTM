import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDemoMode } from "@/contexts/demo-mode-context";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

export function DemoModeToggle() {
  const { isDemoMode, setDemoMode } = useDemoMode();

  return (
    <div className="flex items-center gap-2">
      {isDemoMode && (
        <Badge variant="secondary" className="gap-1">
          <FlaskConical className="h-3 w-3" />
          Demo
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <Switch
          id="demo-mode"
          checked={isDemoMode}
          onCheckedChange={setDemoMode}
          data-testid="switch-demo-mode"
        />
        <Label htmlFor="demo-mode" className="text-xs text-muted-foreground cursor-pointer">
          Demo Data
        </Label>
      </div>
    </div>
  );
}
