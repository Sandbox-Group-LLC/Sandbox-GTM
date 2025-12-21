import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@shared/schema";

interface LanguageSwitcherProps {
  currentLocale: string;
  supportedLanguages: string[];
  onLocaleChange: (locale: string) => void;
  className?: string;
}

export function LanguageSwitcher({
  currentLocale,
  supportedLanguages,
  onLocaleChange,
  className,
}: LanguageSwitcherProps) {
  if (supportedLanguages.length <= 1) {
    return null;
  }

  const languageMap = Object.fromEntries(
    SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang.name])
  );

  const currentLanguageName = languageMap[currentLocale] || currentLocale.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={className}
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4 mr-2" />
          {currentLanguageName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => onLocaleChange(code)}
            className={currentLocale === code ? "bg-accent" : ""}
            data-testid={`menuitem-lang-${code}`}
          >
            {languageMap[code] || code.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
