import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold font-mono">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
            {trend && description && " "}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
