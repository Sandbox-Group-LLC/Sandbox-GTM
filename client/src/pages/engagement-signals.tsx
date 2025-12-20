import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, Flame } from "lucide-react";

export default function EngagementSignals() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Engagement Signals" 
        breadcrumbs={[{ label: "Performance" }, { label: "Engagement Signals" }]}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <p className="text-muted-foreground text-sm">Who is showing buying intent, and how?</p>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-blue-500" />
                Engagement Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">--%</p>
                  <p className="text-sm text-muted-foreground mt-1">Active participation level</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-amber-500" />
                Intent Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">--</p>
                  <p className="text-sm text-muted-foreground mt-1">Behavioral signals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="w-5 h-5 text-orange-500" />
                Hot Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">--</p>
                  <p className="text-sm text-muted-foreground mt-1">Sales-ready contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Activity</CardTitle>
              <CardDescription>Live engagement across all active programs</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Live activity feed coming soon</p>
                <p className="text-sm mt-2">Track audience behavior in real-time</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High-Intent Audience</CardTitle>
              <CardDescription>Contacts showing buying signals ready for follow-up</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Flame className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Intent scoring coming soon</p>
                <p className="text-sm mt-2">AI-powered engagement analysis</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
