import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressSuggestion {
  formatted: string;
  housenumber?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  lat: number;
  lon: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  disabled = false,
  className,
  testId,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/geocode/autocomplete?text=${encodeURIComponent(text)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      console.error("Failed to fetch address suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    const streetAddress = [suggestion.housenumber, suggestion.street]
      .filter(Boolean)
      .join(" ");
    
    onChange(streetAddress || suggestion.formatted);
    setShowSuggestions(false);
    setSuggestions([]);

    if (onAddressSelect) {
      onAddressSelect({
        address: streetAddress || "",
        city: suggestion.city || "",
        state: suggestion.state || "",
        country: suggestion.country || "",
        postalCode: suggestion.postcode || "",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectAddress(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-8", className)}
          data-testid={testId}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-start gap-2 hover-elevate",
                highlightedIndex === index && "bg-accent"
              )}
              onClick={() => handleSelectAddress(suggestion)}
              data-testid={testId ? `${testId}-suggestion-${index}` : undefined}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{suggestion.formatted}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
