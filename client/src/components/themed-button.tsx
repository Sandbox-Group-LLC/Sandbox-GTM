import { Button, ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

export interface EventPageTheme {
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  buttonStyle?: 'filled' | 'outline';
  borderRadius?: string;
  headingFont?: string;
  bodyFont?: string;
  textColor?: string;
  textSecondaryColor?: string;
}

interface ThemedButtonProps extends Omit<ButtonProps, 'style'> {
  theme?: EventPageTheme | null;
  style?: React.CSSProperties;
}

const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ theme, style, children, ...props }, ref) => {
    const borderRadiusMap: Record<string, string> = {
      none: "0px",
      small: "4px",
      medium: "8px",
      large: "16px",
      pill: "9999px",
    };
    const themeRadius = borderRadiusMap[theme?.borderRadius || "medium"];
    const isOutlineButton = theme?.buttonStyle === "outline";

    const buttonStyles: React.CSSProperties = isOutlineButton
      ? {
          backgroundColor: "transparent",
          color: theme?.buttonColor || "#3b82f6",
          border: `2px solid ${theme?.buttonBorderColor || theme?.buttonColor || "#3b82f6"}`,
          borderRadius: themeRadius,
          fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
        }
      : {
          backgroundColor: theme?.buttonColor || undefined,
          color: theme?.buttonTextColor || undefined,
          borderRadius: themeRadius,
          fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
        };

    return (
      <Button
        ref={ref}
        style={{ ...buttonStyles, ...style }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ThemedButton.displayName = "ThemedButton";

export { ThemedButton };
