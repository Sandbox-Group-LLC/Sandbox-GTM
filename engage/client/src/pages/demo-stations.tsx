import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { AppHeader } from "./dashboard";
import { queryClient, apiRequest, fetchJSON } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { Skeleton } from "../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { ArrowLeft, Monitor, Plus, MoreVertical, Pencil, Trash2, MapPin, User, Tag, X } from "lucide-react";

const stationSchema = z.object({
  stationName: z.string().min(1, "Station name is required"),
  stationLocation: z.string().min(1, "Location is required"),
  stationPresenter: z.string().optional(),
  productFocus: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});
type StationForm = z.infer<typeof stationSchema>;

export default function DemoStations() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<any>(null);
  const [deletingStation, setDeletingStation] = useState<any>(null);
  const [tagInput, setTagInput] = useState("");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetchJSON("/api/events"),
  });

  const { data: stations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stations", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/stations`),
    enabled: !!selectedEventId,
  });

  const form = useForm<StationForm>({
    resolver: zodResolver(stationSchema),
    defaultValues: { stationName: "", stationLocation: "", stationPresenter: "", productFocus: [], isActive: true },
  });
  const productFocus = form.watch("productFocus");

  useEffect(() => {
    if (editingStation) {
      form.reset({
        stationName: editingStation.stationName,
        stationLocation: editingStation.stationLocation,
        stationPresenter: editingStation.stationPresenter || "",
        productFocus: editingStation.productFocus || [],
        isActive: editingStation.isActive ?? true,
      });
    } else {
      form.reset({ stationName: "", stationLocation: "", stationPresenter: "", productFocus: [], isActive: true });
    }
    setTagInput("");
  }, [editingStation]);

  const createMutation = useMutation({
    mutationFn: async (data: StationForm) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/stations`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations", selectedEventId] });
      toast({ title: "Station created" });
      setCreateOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StationForm> }) => {
      const res = await apiRequest("PATCH", `/api/stations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations", selectedEventId] });
      toast({ title: "Station updated" });
      setEditingStation(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/stations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations", selectedEventId] });
      toast({ title: "Station deleted" });
      setDeletingStation(null);
    },
  });

  const onSubmit = (data: StationForm) => {
    if (editingStation) updateMutation.mutate({ id: editingStation.id, data });
    else createMutation.mutate(data);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !productFocus.includes(t)) { form.setValue("productFocus", [...productFocus, t]); setTagInput(""); }
  };

  const dialogOpen = createOpen || !!editingStation;
  const closeDialog = () => { setCreateOpen(false); setEditingStation(null); form.reset(); setTagInput(""); };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {!selectedEventId ? (
          <Card><CardContent className="flex flex-col items-center py-16"><Monitor className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">Select an event to manage stations</p></CardContent></Card>
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        ) : stations.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-16"><Monitor className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground mb-4">No stations yet</p><Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add First Station</Button></CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station: any) => (
              <Card key={station.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={station.isActive ? "default" : "secondary"} className="text-xs">{station.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{station.stationName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><MapPin className="h-3 w-3" /><span className="truncate">{station.stationLocation}</span></div>
                      {station.stationPresenter && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><User className="h-3 w-3" /><span className="truncate">{station.stationPresenter}</span></div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingStation(station)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingStation(station)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {station.productFocus?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {station.productFocus.map((f: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{f}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStation ? "Edit Station" : "New Demo Station"}</DialogTitle>
            <DialogDescription>{editingStation ? "Update station details." : "Add a new demo station for this event."}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="stationName" render={({ field }) => (
                <FormItem><FormLabel>Station Name</FormLabel><FormControl><Input placeholder="e.g. Product Demo A" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="stationLocation" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g. Booth A, Demo Table 3" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="stationPresenter" render={({ field }) => (
                <FormItem><FormLabel>Presenter</FormLabel><FormControl><Input placeholder="e.g. Jane Smith" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="productFocus" render={() => (
                <FormItem>
                  <FormLabel>Product Focus Areas</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Add a focus area" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
                      <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                    </div>
                    {productFocus.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {productFocus.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">{tag}
                            <button type="button" onClick={() => form.setValue("productFocus", productFocus.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormDescription>Press Enter or click Add</FormDescription>
                </FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Active</FormLabel><FormDescription>Enable this station for the event</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingStation ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingStation} onOpenChange={open => !open && setDeletingStation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Station</AlertDialogTitle><AlertDialogDescription>Delete "{deletingStation?.stationName}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingStation && deleteMutation.mutate(deletingStation.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
