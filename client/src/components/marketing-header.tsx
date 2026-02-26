import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import sandboxIcon from "@assets/Orange_bug_-_no_background_1768254114237.png";
import sandboxLogo from "@assets/Sandbox-GTM_1768253990902.png";

interface MarketingHeaderProps {
  currentPage?: "landing" | "pricing" | "blog" | "book-demo" | "signup" | "article";
}

export function MarketingHeader({ currentPage }: MarketingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/pricing", label: "Pricing", id: "pricing" },
    { href: "/the-sandbox", label: "The Sandbox", id: "blog" },
    { href: "/book-demo", label: "Book a Demo", id: "book-demo" },
  ];

  return (
    <header className="border-b border-border relative">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home-logo">
          <img src={sandboxIcon} alt="Sandbox" className="h-6 w-6" />
          <img src={sandboxLogo} alt="Sandbox GTM" className="h-5 invert" />
        </a>

        <nav className="hidden md:flex items-center gap-2" data-testid="nav-desktop">
          {navLinks.map((link) => (
            <Button
              key={link.id}
              variant="ghost"
              asChild
              data-testid={`button-${link.id}-header`}
              className={currentPage === link.id ? "text-white" : "text-[#b8b8b8]"}
            >
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
          <Button asChild data-testid="button-login-header" className="ml-2">
            <a href="/api/login">Sign In</a>
          </Button>
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <Button asChild size="sm" data-testid="button-login-header-mobile">
            <a href="/api/login">Sign In</a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
            className="text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background" data-testid="nav-mobile">
          <div className="container mx-auto px-6 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === link.id ? "text-white bg-muted" : "text-[#b8b8b8] hover:text-white hover:bg-muted"
                }`}
                data-testid={`button-${link.id}-mobile`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}