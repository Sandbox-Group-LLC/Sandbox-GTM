import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Zap, CheckCircle, Lock, Clock } from "lucide-react";

export default function MomentLive() {
  const { momentId } = useParams<{ momentId: string }>();
  const [answer, setAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: moment, isLoading, error } = useQuery<any>({
    queryKey: ["/api/moment/public", momentId],
    queryFn: () => fetch(`/api/moments/${momentId}/public`).then(async r => {
      if (!r.ok) throw new Error((await r.json()).error || "Not found");
      return r.json();
    }),
    refetchInterval: 5000, // poll every 5s so status changes surface quickly
  });

  const { data: results } = useQuery<any>({
    queryKey: ["/api/moment/results", momentId],
    queryFn: () => fetch(`/api/moments/${momentId}/results`).then(r => r.json()),
    enabled: submitted && moment?.showResults,
    refetchInterval: 3000,
  });

  const respondMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/moments/${momentId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) return <FullPageState><Zap className="h-8 w-8 animate-pulse text-muted-foreground" /><p className="text-muted-foreground mt-3">Loading...</p></FullPageState>;

  if (error || !moment) return (
    <FullPageState>
      <Clock className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium mt-3">Moment not available</p>
      <p className="text-sm text-muted-foreground">It may have ended or the link is invalid.</p>
    </FullPageState>
  );

  if (moment.status === "ended") return (
    <FullPageState>
      <CheckCircle className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium mt-3">This moment has ended</p>
      <p className="text-sm text-muted-foreground">Thanks for participating!</p>
    </FullPageState>
  );

  if (moment.status === "locked") return (
    <FullPageState>
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium mt-3">Responses are locked</p>
      <p className="text-sm text-muted-foreground">The presenter has paused new submissions.</p>
    </FullPageState>
  );

  if (moment.status !== "live") return (
    <FullPageState>
      <Zap className="h-8 w-8 text-muted-foreground" />
      <p className="font-medium mt-3">Not live yet</p>
      <p className="text-sm text-muted-foreground">This moment hasn't been launched yet.</p>
    </FullPageState>
  );

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">Response recorded!</h2>
            <p className="text-muted-foreground text-sm mt-1">{moment.title}</p>
          </div>
          {results && results.totalResponses > 0 && moment.showResults && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Live Results</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{results.totalResponses} response{results.totalResponses !== 1 ? "s" : ""}</p>
                <ResultsDisplay moment={moment} responses={results.responses} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center"><Badge className="gap-1"><Zap className="h-3 w-3" />Live</Badge></div>
          <h2 className="text-xl font-semibold mt-2">{moment.title}</h2>
          {moment.prompt && <p className="text-muted-foreground text-sm">{moment.prompt}</p>}
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <MomentInput moment={moment} answer={answer} setAnswer={setAnswer} />
            <Button
              className="w-full"
              disabled={answer === null || answer === "" || respondMutation.isPending}
              onClick={() => respondMutation.mutate(answer)}
            >
              {respondMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
            {respondMutation.isError && (
              <p className="text-xs text-destructive text-center">{(respondMutation.error as any)?.message}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MomentInput({ moment, answer, setAnswer }: { moment: any; answer: any; setAnswer: (v: any) => void }) {
  const options = moment.optionsJson?.options || [];

  switch (moment.type) {
    case "poll_single":
      return (
        <RadioGroup value={answer || ""} onValueChange={setAnswer}>
          {options.map((opt: string, i: number) => (
            <div key={i} className="flex items-center space-x-2">
              <RadioGroupItem value={opt} id={`opt-${i}`} />
              <Label htmlFor={`opt-${i}`} className="cursor-pointer">{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "poll_multi":
      return (
        <div className="space-y-2">
          {options.map((opt: string, i: number) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox
                id={`opt-${i}`}
                checked={(answer || []).includes(opt)}
                onCheckedChange={checked => {
                  const current = answer || [];
                  setAnswer(checked ? [...current, opt] : current.filter((v: string) => v !== opt));
                }}
              />
              <Label htmlFor={`opt-${i}`} className="cursor-pointer">{opt}</Label>
            </div>
          ))}
        </div>
      );

    case "rating": {
      const min = moment.optionsJson?.minValue ?? 1;
      const max = moment.optionsJson?.maxValue ?? 5;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="space-y-2">
          <div className="flex justify-between gap-1">
            {nums.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setAnswer(n)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${answer === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}</span><span>{max}</span>
          </div>
        </div>
      );
    }

    case "open_text":
    case "qa":
      return (
        <Textarea
          placeholder={moment.type === "qa" ? "Type your question..." : "Share your thoughts..."}
          value={answer || ""}
          onChange={e => setAnswer(e.target.value)}
          rows={4}
        />
      );

    case "pulse":
      return (
        <div className="grid grid-cols-3 gap-2">
          {[{ v: "great", emoji: "🙌" }, { v: "okay", emoji: "👍" }, { v: "struggling", emoji: "😐" }].map(({ v, emoji }) => (
            <button key={v} type="button" onClick={() => setAnswer(v)}
              className={`py-4 rounded-lg border text-2xl transition-colors ${answer === v ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}
            >{emoji}</button>
          ))}
        </div>
      );

    case "cta":
      return (
        <a href={moment.optionsJson?.ctaUrl || "#"} target="_blank" rel="noopener noreferrer" onClick={() => setAnswer("clicked")}
          className="block w-full py-2 px-4 rounded-md bg-primary text-primary-foreground text-center font-medium hover:bg-primary/90 transition-colors"
        >
          {moment.optionsJson?.ctaLabel || "Learn More"}
        </a>
      );

    default:
      return null;
  }
}

function ResultsDisplay({ moment, responses }: { moment: any; responses: any[] }) {
  if (!responses.length) return <p className="text-xs text-muted-foreground">No results to display yet.</p>;
  // Simple tally for polls
  if (moment.type === "poll_single" || moment.type === "poll_multi") {
    const tally: Record<string, number> = {};
    for (const r of responses) {
      const val = r.payloadJson;
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) tally[v] = (tally[v] || 0) + 1;
    }
    return (
      <div className="space-y-2">
        {Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([opt, count]) => (
          <div key={opt}>
            <div className="flex justify-between text-xs mb-1"><span>{opt}</span><span>{count}</span></div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(count / responses.length) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-muted-foreground">{responses.length} response{responses.length !== 1 ? "s" : ""} received.</p>;
}

function FullPageState({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {children}
    </div>
  );
}
