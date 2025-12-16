import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LogIn, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import type { Event } from "@shared/schema";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface EventData {
  event: Event;
}

export default function AttendeeLogin() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery<EventData>({
    queryKey: ["/api/public/event", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}`);
      if (!res.ok) throw new Error("Event not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await apiRequest("POST", "/api/public/attendee/login", {
        email: data.email,
        password: data.password,
        eventSlug: slug,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back! Redirecting to your portal...",
      });
      setLocation(`/event/${slug}/portal`);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventError || !eventData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground mb-4">The event you are looking for does not exist or is not available.</p>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event } = eventData;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" data-testid="text-login-title">Attendee Login</CardTitle>
          <CardDescription data-testid="text-event-name">
            Sign in to access your portal for {event.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        data-testid="input-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your password"
                        data-testid="input-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href={`/event/${slug}/register`} className="text-primary hover:underline" data-testid="link-register">
                Register here
              </Link>
            </p>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/event/${slug}`} data-testid="link-back-to-event">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
