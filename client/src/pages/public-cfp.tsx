import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Calendar, AlertCircle, CheckCircle, FileText, Clock, Loader2, Send } from "lucide-react";
import { format } from "date-fns";

interface CfpTopic {
  id: number;
  name: string;
  description: string | null;
}

interface CfpData {
  title: string;
  description: string | null;
  topics: CfpTopic[];
  submissionDeadline: string | null;
  isOpen: boolean;
  eventName: string;
  guidelines: string | null;
  maxAbstractLength: number | null;
  allowMultipleSubmissions: boolean | null;
}

const submissionTypes = [
  { value: "paper", label: "Paper" },
  { value: "poster", label: "Poster" },
  { value: "workshop", label: "Workshop" },
  { value: "panel", label: "Panel" },
];

export default function PublicCfp() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");

  const { data: cfpData, isLoading, error } = useQuery<CfpData>({
    queryKey: ["/api/public/cfp", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/cfp/${slug}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "CFP not found" }));
        throw new Error(errorData.message || "Failed to fetch CFP");
      }
      return res.json();
    },
    enabled: !!slug,
  });

  const maxAbstractLength = cfpData?.maxAbstractLength || 500;

  const formSchema = z.object({
    title: z.string().min(1, "Title is required").max(255, "Title must be 255 characters or less"),
    abstract: z.string().min(1, "Abstract is required").max(maxAbstractLength, `Abstract must be ${maxAbstractLength} characters or less`),
    authorName: z.string().min(1, "Author name is required").max(255, "Author name must be 255 characters or less"),
    authorEmail: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    authorAffiliation: z.string().max(255, "Affiliation must be 255 characters or less").optional(),
    coAuthors: z.string().optional(),
    keywords: z.string().max(500, "Keywords must be 500 characters or less").optional(),
    topicId: z.string().optional(),
    submissionType: z.string().default("paper"),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      abstract: "",
      authorName: "",
      authorEmail: "",
      authorAffiliation: "",
      coAuthors: "",
      keywords: "",
      topicId: "",
      submissionType: "paper",
    },
  });

  const abstractValue = form.watch("abstract") || "";

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const submitData = {
        ...values,
        topicId: values.topicId ? parseInt(values.topicId, 10) : null,
        authorAffiliation: values.authorAffiliation || null,
        coAuthors: values.coAuthors || null,
        keywords: values.keywords || null,
      };
      const res = await apiRequest("POST", `/api/public/cfp/${slug}/submit`, submitData);
      return res.json();
    },
    onSuccess: (_, variables) => {
      setSubmittedTitle(variables.title);
      setSubmitted(true);
      toast({
        title: "Submission received",
        description: "Your paper has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your paper. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: FormValues) => {
    submitMutation.mutate(values);
  };

  const handleSubmitAnother = () => {
    form.reset();
    setSubmitted(false);
    setSubmittedTitle("");
  };

  const isDeadlinePassed = cfpData?.submissionDeadline
    ? new Date(cfpData.submissionDeadline) < new Date()
    : false;

  const canSubmit = cfpData?.isOpen && !isDeadlinePassed;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !cfpData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-cfp-error-title">
              Call for Papers Not Found
            </h2>
            <p className="text-muted-foreground" data-testid="text-cfp-error-message">
              {error instanceof Error ? error.message : "This call for papers doesn't exist or is not currently accepting submissions."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-submission-success-title">
              Submission Received
            </h2>
            <p className="text-muted-foreground mb-4" data-testid="text-submission-success-message">
              Your paper "{submittedTitle}" has been successfully submitted to {cfpData.eventName}.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You will receive a confirmation at the email address you provided.
            </p>
            {cfpData.allowMultipleSubmissions && (
              <Button onClick={handleSubmitAnother} data-testid="button-submit-another">
                Submit Another Paper
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground" data-testid="text-event-name">
            {cfpData.eventName}
          </p>
          <h1 className="text-3xl font-bold" data-testid="text-cfp-title">
            {cfpData.title || "Call for Papers"}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant={canSubmit ? "default" : "secondary"} data-testid="badge-cfp-status">
              {canSubmit ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>

        {cfpData.submissionDeadline && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 text-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Submission Deadline:</span>
                <span
                  className={isDeadlinePassed ? "text-destructive" : ""}
                  data-testid="text-submission-deadline"
                >
                  {format(new Date(cfpData.submissionDeadline), "MMMM d, yyyy 'at' h:mm a")}
                </span>
                {isDeadlinePassed && (
                  <Badge variant="destructive">
                    Passed
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {cfpData.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-cfp-description">
                {cfpData.description}
              </p>
            </CardContent>
          </Card>
        )}

        {cfpData.guidelines && (
          <Card>
            <CardHeader>
              <CardTitle>Submission Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-muted-foreground whitespace-pre-wrap"
                data-testid="text-cfp-guidelines"
              >
                {cfpData.guidelines}
              </div>
            </CardContent>
          </Card>
        )}

        {!canSubmit ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Submissions Closed</h3>
              <p className="text-muted-foreground" data-testid="text-cfp-closed-message">
                {isDeadlinePassed
                  ? "The submission deadline has passed."
                  : "This call for papers is not currently accepting submissions."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Paper</CardTitle>
              <CardDescription>
                Fill out the form below to submit your paper or abstract.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter the title of your paper"
                            data-testid="input-title"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="abstract"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Abstract *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your abstract"
                            className="min-h-32"
                            data-testid="input-abstract"
                            {...field}
                          />
                        </FormControl>
                        <div className="flex justify-between items-center text-sm">
                          <FormMessage />
                          <span
                            className={
                              abstractValue.length > maxAbstractLength
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                            data-testid="text-abstract-counter"
                          >
                            {abstractValue.length} / {maxAbstractLength}
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="authorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your full name"
                              data-testid="input-author-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="authorEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your.email@example.com"
                              data-testid="input-author-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="authorAffiliation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affiliation</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Organization or University"
                            data-testid="input-author-affiliation"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="coAuthors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Co-Authors</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="John Doe, Jane Smith"
                            className="min-h-20"
                            data-testid="input-co-authors"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional - Enter comma-separated names
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keywords</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="machine learning, AI, neural networks"
                            data-testid="input-keywords"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cfpData.topics.length > 0 && (
                      <FormField
                        control={form.control}
                        name="topicId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Topic</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-topic">
                                  <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cfpData.topics.map((topic) => (
                                  <SelectItem
                                    key={topic.id}
                                    value={topic.id.toString()}
                                    data-testid={`select-topic-option-${topic.id}`}
                                  >
                                    {topic.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Optional</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="submissionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Submission Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-submission-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {submissionTypes.map((type) => (
                                <SelectItem
                                  key={type.value}
                                  value={type.value}
                                  data-testid={`select-submission-type-option-${type.value}`}
                                >
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Paper
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
