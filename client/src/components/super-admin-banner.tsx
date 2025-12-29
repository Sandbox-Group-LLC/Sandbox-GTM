import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Eye, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SuperAdminSession {
  isSuperAdmin: boolean;
  activeOrganizationId: string | null;
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  homeOrganizationId: string | null;
  homeOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function SuperAdminBanner() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: session } = useQuery<SuperAdminSession>({
    queryKey: ["/api/super-admin/session"],
    enabled: !!user?.isSuperAdmin,
    staleTime: 30 * 1000,
  });

  const switchBackMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await apiRequest("POST", "/api/super-admin/session/organization", { organizationId });
      return res.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Switched back",
        description: `Returned to ${data.organization?.name || "your home organization"}`,
      });
      
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/organization'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/membership'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/super-admin/session'] });
      await queryClient.invalidateQueries({ 
        predicate: (query) => String(query.queryKey[0]).startsWith('/api/'),
        refetchType: 'active'
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to switch back",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user?.isSuperAdmin || !session?.activeOrganization) {
    return null;
  }

  const homeOrgId = session.homeOrganizationId;
  const isViewingDifferentOrg = homeOrgId && session.activeOrganizationId !== homeOrgId;

  if (!isViewingDifferentOrg) {
    return null;
  }

  return (
    <div 
      className="sticky top-0 z-50 w-full bg-amber-100 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800"
      data-testid="super-admin-banner"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Super Admin View:</span>{" "}
            Viewing as <span className="font-semibold">{session.activeOrganization.name}</span>
          </span>
        </div>
        {homeOrgId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => switchBackMutation.mutate(homeOrgId)}
            disabled={switchBackMutation.isPending}
            className="bg-white/50 dark:bg-black/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
            data-testid="button-switch-back"
          >
            {switchBackMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowLeft className="h-4 w-4 mr-2" />
            )}
            Switch back to {session.homeOrganization?.name || "home"}
          </Button>
        )}
      </div>
    </div>
  );
}
