import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { CommandPaletteTrigger } from "@/components/command-palette";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface PageHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap min-h-14 py-2 items-center gap-2 sm:gap-4 border-b border-border px-2 sm:px-4 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="flex-1" />
      
      <div className="hidden sm:block">
        <CommandPaletteTrigger />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
