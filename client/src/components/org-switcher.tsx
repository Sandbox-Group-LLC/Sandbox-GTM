import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface SuperAdminOrgsResponse {
  organizations: Organization[];
  currentOrganizationId: string | null;
}

interface SuperAdminSession {
  isSuperAdmin: boolean;
  activeOrganizationId: string | null;
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function OrgSwitcher() {
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const { toast } = useToast();

  const { data: sessionData } = useQuery<SuperAdminSession>({
    queryKey: ["/api/super-admin/session"],
    staleTime: 30 * 1000,
  });

  const { data, isLoading } = useQuery<SuperAdminOrgsResponse>({
    queryKey: ["/api/super-admin/organizations"],
    staleTime: 30 * 1000,
  });

  const switchOrgMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await apiRequest("POST", "/api/super-admin/session/organization", { organizationId });
      return res.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Organization switched",
        description: `Now viewing as ${data.organization?.name || "selected organization"}`,
      });
      setOpen(false);
      setIsSwitching(true);
      
      // Clear entire cache to ensure clean slate for new org context
      queryClient.clear();
      
      // Refetch critical auth queries and wait for them to complete
      await Promise.all([
        queryClient.fetchQuery({ queryKey: ['/api/auth/user'] }),
        queryClient.fetchQuery({ queryKey: ['/api/auth/organization'] }),
        queryClient.fetchQuery({ queryKey: ['/api/auth/membership'] }),
        queryClient.fetchQuery({ queryKey: ['/api/super-admin/session'] }),
      ]);
      
      setIsSwitching(false);
    },
    onError: (error: Error) => {
      setIsSwitching(false);
      toast({
        title: "Failed to switch organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const organizations = data?.organizations || [];
  const currentOrganizationId = sessionData?.activeOrganizationId || null;
  const currentOrganizationName = sessionData?.activeOrganization?.name || null;
  
  const isProcessing = switchOrgMutation.isPending || isSwitching;

  return (
    <>
      {isSwitching && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          data-testid="org-switching-overlay"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Switching organization...</span>
          </div>
        </div>
      )}
      <Popover open={open} onOpenChange={(isOpen) => !isProcessing && setOpen(isOpen)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between gap-2 min-w-[200px] max-w-[300px]"
            disabled={isProcessing}
            data-testid="button-super-admin-org-switcher"
          >
            <div className="flex items-center gap-2 truncate">
              {isProcessing ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">
                {isProcessing ? "Switching..." : (currentOrganizationName || "Select organization...")}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search organizations..." 
              data-testid="input-org-search"
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No organizations found."}
              </CommandEmpty>
              <CommandGroup>
                {organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => {
                      if (org.id !== currentOrganizationId) {
                        switchOrgMutation.mutate(org.id);
                      } else {
                        setOpen(false);
                      }
                    }}
                    disabled={switchOrgMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid={`org-option-${org.id}`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{org.name}</span>
                    {org.id === currentOrganizationId && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                    {switchOrgMutation.isPending && switchOrgMutation.variables === org.id && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
