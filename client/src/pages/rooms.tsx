import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, DoorOpen, Trash2, Pencil, Search } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { SessionRoom, Event } from "@shared/schema";

const roomFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(1, "Name is required"),
  capacity: z.coerce.number().min(0, "Capacity must be 0 or greater").optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

export default function Rooms() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SessionRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEventId, setFilterEventId] = useState<string>("all");

  const { data: rooms = [], isLoading } = useQuery<SessionRoom[]>({
    queryKey: ["/api/session-rooms"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      eventId: "",
      name: "",
      capacity: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      return await apiRequest("POST", "/api/session-rooms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-rooms"] });
      toast({ title: "Room created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoomFormData }) => {
      return await apiRequest("PATCH", `/api/session-rooms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-rooms"] });
      toast({ title: "Room updated successfully" });
      setIsDialogOpen(false);
      setEditingRoom(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/session-rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-rooms"] });
      toast({ title: "Room deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: RoomFormData) => {
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (room: SessionRoom) => {
    setEditingRoom(room);
    form.reset({
      eventId: room.eventId,
      name: room.name,
      capacity: room.capacity || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this room?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
    form.reset();
  };

  const openAddDialog = () => {
    setEditingRoom(null);
    form.reset({
      eventId: "",
      name: "",
      capacity: 0,
    });
    setIsDialogOpen(true);
  };

  const filteredRooms = rooms.filter((room) => {
    if (filterEventId && filterEventId !== "all" && room.eventId !== filterEventId) {
      return false;
    }
    const searchLower = searchQuery.toLowerCase();
    return room.name.toLowerCase().includes(searchLower);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Rooms"
        breadcrumbs={[{ label: "Sessions", href: "/sessions" }, { label: "Rooms" }]}
        actions={
          <Button size="sm" onClick={openAddDialog} data-testid="button-add-room">
            <Plus className="h-4 w-4 mr-2" />
            Room
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={filterEventId} onValueChange={setFilterEventId}>
              <SelectTrigger className="w-[250px]" data-testid="select-filter-event">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>

          {rooms.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="No rooms yet"
              description="Create your first room to define where sessions will take place"
              action={{
                label: "Create Room",
                onClick: openAddDialog
              }}
            />
          ) : filteredRooms.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No rooms match your search</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.map((room) => (
                      <TableRow key={room.id} data-testid={`row-room-${room.id}`}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>
                          {room.capacity ? room.capacity.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(room)}
                              data-testid={`button-edit-room-${room.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(room.id)}
                              data-testid={`button-delete-room-${room.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Edit Room" : "Add Room"}</DialogTitle>
            <DialogDescription>
              {editingRoom ? "Update the room details below" : "Create a new room for hosting sessions"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <EventSelectField control={form.control} />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Hall, Room A, Breakout 1" {...field} data-testid="input-room-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} data-testid="input-room-capacity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRoom ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
