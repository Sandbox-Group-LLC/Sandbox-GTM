import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Clock,
  Users,
  Loader2,
  Star,
} from "lucide-react";
import type { SessionRoom } from "@shared/schema";

interface RoomOpenHour {
  id?: string;
  roomId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface RoomAssignment {
  id: string;
  roomId: string;
  userId?: string | null;
  meetingPortalMemberId?: string | null;
  isPrimary: boolean;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  meetingPortalMember?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

interface MeetingPortalMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface OrganizationMember {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

interface RoomSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: SessionRoom | null;
  eventId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function RoomSettingsDialog({
  open,
  onOpenChange,
  room,
  eventId,
}: RoomSettingsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hours");
  const [openHours, setOpenHours] = useState<RoomOpenHour[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    type: "portal" as "portal" | "admin",
    memberId: "",
    isPrimary: false,
  });

  const { data: fetchedOpenHours, isLoading: hoursLoading } = useQuery<RoomOpenHour[]>({
    queryKey: ["/api/events", eventId, "rooms", room?.id, "open-hours"],
    enabled: open && !!room?.id,
    queryFn: async () => {
      const res = await fetch(
        `/api/events/${eventId}/rooms/${room!.id}/open-hours`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch open hours");
      return res.json();
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/events", eventId, "rooms", room?.id, "assignments"],
    enabled: open && !!room?.id,
    queryFn: async () => {
      const res = await fetch(
        `/api/events/${eventId}/rooms/${room!.id}/assignments`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  const { data: portalMembers } = useQuery<MeetingPortalMember[]>({
    queryKey: ["/api/events", eventId, "meeting-portal", "members"],
    enabled: open && !!eventId,
    queryFn: async () => {
      const res = await fetch(
        `/api/events/${eventId}/meeting-portal/members`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch portal members");
      return res.json();
    },
  });

  const { data: orgMembers } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/organization/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organization members");
      return res.json();
    },
  });

  useEffect(() => {
    if (fetchedOpenHours) {
      setOpenHours(fetchedOpenHours);
    }
  }, [fetchedOpenHours]);

  useEffect(() => {
    if (!open) {
      setOpenHours([]);
      setNewAssignment({ type: "portal", memberId: "", isPrimary: false });
      setActiveTab("hours");
    }
  }, [open]);

  const saveHoursMutation = useMutation({
    mutationFn: async (hours: RoomOpenHour[]) => {
      const res = await apiRequest(
        "POST",
        `/api/events/${eventId}/rooms/${room!.id}/open-hours`,
        hours
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "rooms", room?.id, "open-hours"],
      });
      toast({ title: "Open hours saved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save open hours",
        variant: "destructive",
      });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: {
      roomId: string;
      userId?: string;
      meetingPortalMemberId?: string;
      isPrimary: boolean;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/events/${eventId}/room-assignments`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "rooms", room?.id, "assignments"],
      });
      setNewAssignment({ type: "portal", memberId: "", isPrimary: false });
      toast({ title: "Assignment created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiRequest(
        "DELETE",
        `/api/events/${eventId}/room-assignments/${assignmentId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "rooms", room?.id, "assignments"],
      });
      toast({ title: "Assignment removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove assignment",
        variant: "destructive",
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, isPrimary }: { id: string; isPrimary: boolean }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/events/${eventId}/room-assignments/${id}`,
        { isPrimary }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "rooms", room?.id, "assignments"],
      });
      toast({ title: "Assignment updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    },
  });

  const addHourEntry = () => {
    if (!room) return;
    setOpenHours([
      ...openHours,
      {
        roomId: room.id,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      },
    ]);
  };

  const removeHourEntry = (index: number) => {
    setOpenHours(openHours.filter((_, i) => i !== index));
  };

  const updateHourEntry = (index: number, field: keyof RoomOpenHour, value: any) => {
    setOpenHours(
      openHours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      )
    );
  };

  const handleSaveHours = () => {
    saveHoursMutation.mutate(openHours);
  };

  const handleAddAssignment = () => {
    if (!room || !newAssignment.memberId) return;

    const data: {
      roomId: string;
      userId?: string;
      meetingPortalMemberId?: string;
      isPrimary: boolean;
    } = {
      roomId: room.id,
      isPrimary: newAssignment.isPrimary,
    };

    if (newAssignment.type === "admin") {
      data.userId = newAssignment.memberId;
    } else {
      data.meetingPortalMemberId = newAssignment.memberId;
    }

    createAssignmentMutation.mutate(data);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    deleteAssignmentMutation.mutate(assignmentId);
  };

  const handleTogglePrimary = (assignment: RoomAssignment) => {
    updateAssignmentMutation.mutate({
      id: assignment.id,
      isPrimary: !assignment.isPrimary,
    });
  };

  const getAssignmentName = (assignment: RoomAssignment) => {
    if (assignment.user) {
      return `${assignment.user.firstName || ""} ${assignment.user.lastName || ""}`.trim() || assignment.user.email;
    }
    if (assignment.meetingPortalMember) {
      return `${assignment.meetingPortalMember.firstName || ""} ${assignment.meetingPortalMember.lastName || ""}`.trim() || assignment.meetingPortalMember.email;
    }
    return "Unknown";
  };

  const getAssignmentEmail = (assignment: RoomAssignment) => {
    return assignment.user?.email || assignment.meetingPortalMember?.email || "";
  };

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room Settings: {room.name}</DialogTitle>
          <DialogDescription>
            Configure open hours and team member assignments for this room.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2" data-testid="tabs-room-settings">
            <TabsTrigger value="hours" data-testid="tab-open-hours">
              <Clock className="h-4 w-4 mr-2" />
              Open Hours
            </TabsTrigger>
            <TabsTrigger value="assignments" data-testid="tab-assignments">
              <Users className="h-4 w-4 mr-2" />
              Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Room Availability</CardTitle>
                <CardDescription>
                  Define which days and times this room is available for meetings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hoursLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    {openHours.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>No open hours configured.</p>
                        <p className="text-sm">Add hours to specify when this room is available.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {openHours.map((hour, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 flex-wrap"
                            data-testid={`row-open-hour-${index}`}
                          >
                            <Select
                              value={String(hour.dayOfWeek)}
                              onValueChange={(val) =>
                                updateHourEntry(index, "dayOfWeek", parseInt(val))
                              }
                            >
                              <SelectTrigger className="w-[140px]" data-testid={`select-day-${index}`}>
                                <SelectValue placeholder="Day" />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_OF_WEEK.map((day) => (
                                  <SelectItem key={day.value} value={String(day.value)}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={hour.startTime}
                                onChange={(e) =>
                                  updateHourEntry(index, "startTime", e.target.value)
                                }
                                className="w-[130px]"
                                data-testid={`input-start-time-${index}`}
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={hour.endTime}
                                onChange={(e) =>
                                  updateHourEntry(index, "endTime", e.target.value)
                                }
                                className="w-[130px]"
                                data-testid={`input-end-time-${index}`}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeHourEntry(index)}
                              data-testid={`button-remove-hour-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addHourEntry}
                        data-testid="button-add-hour"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Slot
                      </Button>
                      <Button
                        onClick={handleSaveHours}
                        disabled={saveHoursMutation.isPending}
                        data-testid="button-save-hours"
                      >
                        {saveHoursMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save Hours
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Room Assignments</CardTitle>
                <CardDescription>
                  Assign team members to this room. Primary assignments mark their default room.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    {assignments && assignments.length > 0 ? (
                      <Table data-testid="table-assignments">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Primary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignments.map((assignment) => (
                            <TableRow
                              key={assignment.id}
                              data-testid={`row-assignment-${assignment.id}`}
                            >
                              <TableCell className="font-medium">
                                {getAssignmentName(assignment)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {getAssignmentEmail(assignment)}
                              </TableCell>
                              <TableCell>
                                {assignment.isPrimary ? (
                                  <Badge variant="default" className="gap-1">
                                    <Star className="h-3 w-3" />
                                    Primary
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTogglePrimary(assignment)}
                                    disabled={updateAssignmentMutation.isPending}
                                    data-testid={`button-set-primary-${assignment.id}`}
                                  >
                                    Set Primary
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  disabled={deleteAssignmentMutation.isPending}
                                  data-testid={`button-delete-assignment-${assignment.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>No assignments yet.</p>
                        <p className="text-sm">Add team members to this room.</p>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-sm font-medium">Add New Assignment</Label>
                      <div className="flex items-end gap-3 flex-wrap">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Member Type</Label>
                          <Select
                            value={newAssignment.type}
                            onValueChange={(val: "portal" | "admin") =>
                              setNewAssignment({ ...newAssignment, type: val, memberId: "" })
                            }
                          >
                            <SelectTrigger className="w-[150px]" data-testid="select-member-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portal">Portal Member</SelectItem>
                              <SelectItem value="admin">Admin User</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                          <Label className="text-xs text-muted-foreground">Select Member</Label>
                          <Select
                            value={newAssignment.memberId}
                            onValueChange={(val) =>
                              setNewAssignment({ ...newAssignment, memberId: val })
                            }
                          >
                            <SelectTrigger data-testid="select-member">
                              <SelectValue placeholder="Choose a member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {newAssignment.type === "portal" ? (
                                portalMembers && portalMembers.length > 0 ? (
                                  portalMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {`${member.firstName || ""} ${member.lastName || ""}`.trim() ||
                                        member.email ||
                                        member.id}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="_none" disabled>
                                    No portal members available
                                  </SelectItem>
                                )
                              ) : orgMembers && orgMembers.length > 0 ? (
                                orgMembers.map((member) => (
                                  <SelectItem key={member.userId} value={member.userId}>
                                    {member.user
                                      ? `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() ||
                                        member.user.email ||
                                        member.userId
                                      : member.userId}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="_none" disabled>
                                  No admin users available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="isPrimary"
                            checked={newAssignment.isPrimary}
                            onCheckedChange={(checked) =>
                              setNewAssignment({ ...newAssignment, isPrimary: checked })
                            }
                            data-testid="switch-is-primary"
                          />
                          <Label htmlFor="isPrimary" className="text-sm">
                            Primary
                          </Label>
                        </div>
                        <Button
                          onClick={handleAddAssignment}
                          disabled={!newAssignment.memberId || createAssignmentMutation.isPending}
                          data-testid="button-add-assignment"
                        >
                          {createAssignmentMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
