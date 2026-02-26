import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import sandboxIcon from "@assets/Orange_bug_-_no_background_1768254114237.png";
import sandboxLogo from "@assets/Sandbox-GTM_1768253990902.png";
import type { ThoughtLeadershipArticle } from "@shared/schema";

export default function ThoughtLeadershipArticlePage() {
  const [, params] = useRoute("/thought-leadership/:slug");
  const slug = params?.slug;

  const { data: article, isLoading, error } = useQuery<ThoughtLeadershipArticle>({
    queryKey: ["/api/public/thought-leadership/articles", slug],
    enabled: !!slug,
  });

  return (
    <div className="dark min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2" data-testid="link-home-logo">
            <img src={sandboxIcon} alt="Sandbox" className="h-6 w-6" />
            <img src={sandboxLogo} alt="Sandbox" className="h-5 invert" />
          </a>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild data-testid="button-pricing-header" className="text-white">
              <a href="/pricing">Pricing</a>
            </Button>
            <Button asChild data-testid="button-login-header">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <Button
          variant="ghost"
          asChild
          className="mb-8 text-muted-foreground"
          data-testid="button-back-articles"
        >
          <a href="/thought-leadership">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Articles
          </a>
        </Button>

        {isLoading ? (
          <div className="space-y-6" data-testid="container-article-loading">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : error || !article ? (
          <div className="text-center py-20" data-testid="container-article-not-found">
            <h2 className="text-2xl font-semibold text-white mb-2">Article not found</h2>
            <p className="text-[#999] mb-6">This article may have been removed or the URL is incorrect.</p>
            <Button asChild data-testid="button-browse-articles">
              <a href="/thought-leadership">Browse Articles</a>
            </Button>
          </div>
        ) : (
          <article data-testid="container-article-content">
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs text-[#999] border-[#333]" data-testid={`badge-tag-${tag}`}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight" data-testid="text-article-title">
              {article.title}
            </h1>

            {article.metaDescription && (
              <p className="text-lg text-[#b8b8b8] mb-6" data-testid="text-article-description">
                {article.metaDescription}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-[#888] mb-8 pb-8 border-b border-[#2a2a2a]">
              {article.author && (
                <span className="flex items-center gap-1.5" data-testid="text-article-author">
                  <User className="h-4 w-4" />
                  {article.author}
                </span>
              )}
              {article.publishedAt && (
                <span className="flex items-center gap-1.5" data-testid="text-article-date">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(article.publishedAt), "MMMM d, yyyy")}
                </span>
              )}
              {article.readTimeMinutes && (
                <span className="flex items-center gap-1.5" data-testid="text-article-readtime">
                  <Clock className="h-4 w-4" />
                  {article.readTimeMinutes} min read
                </span>
              )}
            </div>

            {article.heroImageUrl && (
              <div className="mb-10 rounded-lg overflow-hidden">
                <img
                  src={article.heroImageUrl}
                  alt={article.heroImageAlt || article.title}
                  className="w-full object-cover max-h-[400px]"
                  data-testid="img-article-hero"
                />
              </div>
            )}

            <div
              className="prose prose-invert prose-lg max-w-none
                prose-headings:text-white prose-headings:font-semibold
                prose-p:text-[#ccc] prose-p:leading-relaxed
                prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white
                prose-li:text-[#ccc]
                prose-blockquote:border-l-orange-400 prose-blockquote:text-[#aaa]
                prose-code:text-orange-300 prose-code:bg-[#1a1a1a] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#2a2a2a]
                prose-img:rounded-lg"
              data-testid="container-article-body"
              dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
            />

            <div className="mt-16 pt-8 border-t border-[#2a2a2a] text-center">
              <h3 className="text-xl font-semibold text-white mb-3" data-testid="text-cta-title">
                Ready to turn events into revenue?
              </h3>
              <p className="text-[#999] mb-6">See how Sandbox helps teams measure and maximize event ROI.</p>
              <div className="flex items-center justify-center gap-3">
                <Button asChild data-testid="button-cta-demo">
                  <a href="/book-demo">Book a Demo</a>
                </Button>
                <Button variant="outline" asChild className="text-white" data-testid="button-cta-pricing">
                  <a href="/pricing">View Pricing</a>
                </Button>
              </div>
            </div>
          </article>
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
