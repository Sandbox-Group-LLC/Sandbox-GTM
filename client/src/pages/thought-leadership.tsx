import { useHubSpot } from "@/hooks/useHubSpot";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { MarketingHeader } from "@/components/marketing-header";
import type { ThoughtLeadershipArticle } from "@shared/schema";

export default function ThoughtLeadership() {
  useHubSpot();
  const { data: articles, isLoading } = useQuery<ThoughtLeadershipArticle[]>({
    queryKey: ["/api/public/thought-leadership/articles"],
  });

  return (
    <div className="dark min-h-screen bg-background">
      <MarketingHeader currentPage="blog" />

      <main className="container mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4" data-testid="text-page-title">
            The Sandbox
          </h1>
          <p className="text-lg text-[#b8b8b8] max-w-2xl mx-auto" data-testid="text-page-subtitle">
            A thought leadership atelier. Ideas on event marketing, moved from theory into practice.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" data-testid="container-articles-loading">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" data-testid="container-articles-grid">
            {articles.map((article) => (
              <a
                key={article.id}
                href={`/the-sandbox/${article.slug}`}
                className="group block"
                data-testid={`link-article-${article.slug}`}
              >
                <Card className="bg-[#1a1a1a] border-[#2a2a2a] overflow-hidden transition-all duration-200 group-hover:border-[#3a3a3a] group-hover:shadow-lg h-full">
                  <CardContent className="p-0 flex flex-col h-full">
                    {article.heroImageUrl && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={article.heroImageUrl}
                          alt={article.heroImageAlt || article.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          data-testid={`img-article-hero-${article.slug}`}
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {article.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs text-[#999] border-[#333]" data-testid={`badge-tag-${tag}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors" data-testid={`text-article-title-${article.slug}`}>
                        {article.title}
                      </h2>
                      {article.metaDescription && (
                        <p className="text-sm text-[#999] line-clamp-3 mb-4 flex-1" data-testid={`text-article-desc-${article.slug}`}>
                          {article.metaDescription}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-[#666] mt-auto pt-3 border-t border-[#2a2a2a]">
                        <div className="flex items-center gap-3">
                          {article.publishedAt && (
                            <span className="flex items-center gap-1" data-testid={`text-article-date-${article.slug}`}>
                              <Calendar className="h-3 w-3" />
                              {format(new Date(article.publishedAt), "MMM d, yyyy")}
                            </span>
                          )}
                          {article.readTimeMinutes && (
                            <span className="flex items-center gap-1" data-testid={`text-article-readtime-${article.slug}`}>
                              <Clock className="h-3 w-3" />
                              {article.readTimeMinutes} min read
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-20" data-testid="container-no-articles">
            <p className="text-[#999] text-lg mb-2">No articles published yet.</p>
            <p className="text-[#666] text-sm">Check back soon for insights on event-led growth strategies.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-[#222] py-8">
        <div className="container mx-auto px-6 text-center text-[#666] text-sm">
          &copy; {new Date().getFullYear()} Sandbox. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
