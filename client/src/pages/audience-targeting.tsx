import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { titleCase } from "@/lib/utils";
import { Target, Save, Info } from "lucide-react";
import type { Event, AudienceTargeting } from "@shared/schema";
import { DEFAULT_AUDIENCE_TARGETING } from "@shared/schema";

const COMPANY_TYPES = ['enterprise', 'mid-market', 'smb', 'open'] as const;
const ROLES = ['executive', 'vp', 'director', 'manager', 'open'] as const;
const FUNCTIONS = ['marketing', 'sales', 'product', 'engineering', 'operations', 'open'] as const;
const ACCOUNT_FOCUS = ['strategic', 'open'] as const;

export default function AudienceTargeting() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [targeting, setTargeting] = useState<AudienceTargeting>(DEFAULT_AUDIENCE_TARGETING);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: selectedEvent, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", selectedEventId],
    enabled: !!selectedEventId,
  });

  useEffect(() => {
    if (selectedEvent?.audienceTargeting) {
      setTargeting(selectedEvent.audienceTargeting as AudienceTargeting);
    } else {
      setTargeting(DEFAULT_AUDIENCE_TARGETING);
    }
  }, [selectedEvent]);

  const saveMutation = useMutation({
    mutationFn: async (data: { audienceTargeting: AudienceTargeting }) => {
      return await apiRequest("PATCH", `/api/events/${selectedEventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/icp-match"] });
      toast({ title: "Audience targeting saved successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    },
  });

  const handleCheckboxChange = (
    field: 'companyTypes' | 'roles' | 'functions',
    value: string,
    checked: boolean
  ) => {
    setTargeting((prev) => {
      const currentValues = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentValues, value] };
      } else {
        return { ...prev, [field]: currentValues.filter((v) => v !== value) };
      }
    });
  };

  const handleAccountFocusChange = (value: 'strategic' | 'open') => {
    setTargeting((prev) => ({ ...prev, accountFocus: value }));
  };

  const handleSave = () => {
    saveMutation.mutate({ audienceTargeting: targeting });
  };

  const isChecked = (field: 'companyTypes' | 'roles' | 'functions', value: string) => {
    return (targeting[field] as string[]).includes(value);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Audience Targeting"
        breadcrumbs={[{ label: "Performance" }, { label: "Audience Targeting" }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[180px] sm:w-[240px]" data-testid="select-event">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} data-testid={`select-event-option-${event.id}`}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEventId && (
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <p className="text-muted-foreground text-sm">
            Define your ideal customer profile (ICP) to measure audience quality and match rate.
          </p>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md text-sm">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              These ICP factors are only tracked when the corresponding properties (company type, role, function) are captured in your registration form. Configure your registration fields in Acquisition to collect this data.
            </p>
          </div>

          {eventsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !selectedEventId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a program to configure audience targeting</p>
              </CardContent>
            </Card>
          ) : eventLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Types</CardTitle>
                  <CardDescription>
                    Select target company segments. Choosing "Open" means any company type matches.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {COMPANY_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`company-type-${type}`}
                          checked={isChecked('companyTypes', type)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange('companyTypes', type, checked as boolean)
                          }
                          data-testid={`checkbox-company-type-${type}`}
                        />
                        <Label
                          htmlFor={`company-type-${type}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {titleCase(type)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>
                    Select target seniority levels. Choosing "Open" means any role matches.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {ROLES.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={isChecked('roles', role)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange('roles', role, checked as boolean)
                          }
                          data-testid={`checkbox-role-${role}`}
                        />
                        <Label
                          htmlFor={`role-${role}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {titleCase(role)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Functions</CardTitle>
                  <CardDescription>
                    Select target business functions. Choosing "Open" means any function matches.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {FUNCTIONS.map((func) => (
                      <div key={func} className="flex items-center space-x-2">
                        <Checkbox
                          id={`function-${func}`}
                          checked={isChecked('functions', func)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange('functions', func, checked as boolean)
                          }
                          data-testid={`checkbox-function-${func}`}
                        />
                        <Label
                          htmlFor={`function-${func}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {titleCase(func)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Focus</CardTitle>
                  <CardDescription>
                    Define whether to target strategic accounts only or all accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={targeting.accountFocus}
                    onValueChange={(value) => handleAccountFocusChange(value as 'strategic' | 'open')}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    {ACCOUNT_FOCUS.map((focus) => (
                      <div key={focus} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={focus}
                          id={`account-focus-${focus}`}
                          data-testid={`radio-account-focus-${focus}`}
                        />
                        <Label
                          htmlFor={`account-focus-${focus}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {titleCase(focus)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
