import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Organization } from "@shared/schema";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255, "Name is too long"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function MyOrganization() {
  const { toast } = useToast();

  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ["/api/auth/organization"],
  });

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({ name: organization.name });
    }
  }, [organization, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await apiRequest("PATCH", "/api/auth/organization", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      toast({
        title: "Organization updated",
        description: "Your organization name has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="My Organization" breadcrumbs={[{ label: "My Organization" }]} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="My Organization" breadcrumbs={[{ label: "My Organization" }]} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>Manage your organization information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter organization name"
                            data-testid="input-organization-name"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the name that will appear throughout the application.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                    <span>Organization ID:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs" data-testid="text-organization-id">
                      {organization?.id}
                    </code>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !form.formState.isDirty}
                    data-testid="button-save-organization"
                  >
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
