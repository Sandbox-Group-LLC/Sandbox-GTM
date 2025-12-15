import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, DoorOpen, Trash2, Pencil, X } from "lucide-react";
import type { SessionRoom } from "@shared/schema";

const roomFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional(),
  capacity: z.coerce.number().min(0, "Capacity must be 0 or greater").optional(),
  amenities: z.array(z.string()).default([]),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

const commonAmenities = [
  "Projector",
  "Whiteboard",
  "Video Conferencing",
  "Microphone",
  "Screen",
  "WiFi",
  "Power Outlets",
  "Air Conditioning",
];

export default function Rooms() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<SessionRoom | null>(null);
  const [newAmenity, setNewAmenity] = useState("");

  const { data: rooms = [], isLoading } = useQuery<SessionRoom[]>({
    queryKey: ["/api/session-rooms"],
  });

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      location: "",
      capacity: 0,
      amenities: [],
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
      name: room.name,
      location: room.location || "",
      capacity: room.capacity || 0,
      amenities: room.amenities || [],
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
    setNewAmenity("");
    form.reset();
  };

  const addAmenity = (amenity: string) => {
    const currentAmenities = form.getValues("amenities") || [];
    if (amenity.trim() && !currentAmenities.includes(amenity.trim())) {
      form.setValue("amenities", [...currentAmenities, amenity.trim()]);
    }
    setNewAmenity("");
  };

  const removeAmenity = (index: number) => {
    const currentAmenities = form.getValues("amenities") || [];
    form.setValue("amenities", currentAmenities.filter((_, i) => i !== index));
  };

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
        title="Session Rooms"
        description="Manage venues and locations for your sessions"
        action={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-room">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRoom ? "Edit Room" : "Add Room"}</DialogTitle>
                <DialogDescription>
                  {editingRoom ? "Update the room details below" : "Create a new room for hosting sessions"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Building A, 2nd Floor" {...field} data-testid="input-room-location" />
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
                  <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amenities</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {commonAmenities.map((amenity) => {
                                const isSelected = field.value?.includes(amenity);
                                return (
                                  <Badge
                                    key={amenity}
                                    variant={isSelected ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      if (isSelected) {
                                        const idx = field.value?.indexOf(amenity);
                                        if (idx !== undefined && idx >= 0) removeAmenity(idx);
                                      } else {
                                        addAmenity(amenity);
                                      }
                                    }}
                                    data-testid={`badge-amenity-${amenity.toLowerCase().replace(/\s+/g, "-")}`}
                                  >
                                    {amenity}
                                  </Badge>
                                );
                              })}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add custom amenity"
                                value={newAmenity}
                                onChange={(e) => setNewAmenity(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addAmenity(newAmenity);
                                  }
                                }}
                                data-testid="input-custom-amenity"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addAmenity(newAmenity)}
                                data-testid="button-add-amenity"
                              >
                                Add
                              </Button>
                            </div>
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {field.value.map((amenity, index) => (
                                  <Badge key={index} variant="secondary" className="gap-1">
                                    {amenity}
                                    <button
                                      type="button"
                                      onClick={() => removeAmenity(index)}
                                      className="ml-1"
                                      data-testid={`button-remove-amenity-${index}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
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
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No rooms yet"
            description="Create your first room to define where sessions will take place"
            action={
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-room">
                <Plus className="mr-2 h-4 w-4" />
                Create Room
              </Button>
            }
          />
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
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Amenities</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id} data-testid={`row-room-${room.id}`}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {room.location || "-"}
                      </TableCell>
                      <TableCell>
                        {room.capacity ? room.capacity.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {room.amenities && room.amenities.length > 0 ? (
                            room.amenities.slice(0, 3).map((amenity, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          {room.amenities && room.amenities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{room.amenities.length - 3}
                            </Badge>
                          )}
                        </div>
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
  );
}
