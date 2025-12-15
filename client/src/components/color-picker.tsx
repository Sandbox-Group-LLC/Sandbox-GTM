import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Preset color grid matching typical color picker palettes
const presetColors = [
  // Row 1 - Grayscale
  "#000000", "#333333", "#555555", "#777777", "#999999", "#bbbbbb", "#dddddd", "#ffffff",
  // Row 2 - Dark reds/oranges/yellows
  "#800000", "#ff0000", "#ff6600", "#ffcc00", "#ffff00", "#ccff00", "#00ff00", "#00ff99",
  // Row 3 - Cyans/Blues
  "#00ffff", "#00ccff", "#0099ff", "#0066ff", "#0033ff", "#0000ff", "#6600ff", "#9900ff",
  // Row 4 - Purples/Pinks
  "#cc00ff", "#ff00ff", "#ff0099", "#ff0066", "#ff3366", "#ff6699", "#ff99cc", "#ffccff",
  // Row 5 - Muted colors
  "#996633", "#cc9966", "#ffcc99", "#ffffcc", "#ccffcc", "#99ffcc", "#66ffcc", "#33ffcc",
  // Row 6 - Light pastels
  "#ccffff", "#99ccff", "#9999ff", "#cc99ff", "#ff99ff", "#ff99cc", "#ffcccc", "#ffeedd",
  // Row 7 - Medium tones
  "#663300", "#996600", "#cc9900", "#999933", "#669933", "#339966", "#009999", "#006699",
  // Row 8 - Dark tones
  "#003366", "#003399", "#330066", "#660066", "#990066", "#cc0066", "#993333", "#663333",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// Convert HSV to RGB hex
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert hex to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 1, v: 1 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return { h, s, v };
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(value);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingGradient = useRef(false);
  const isDraggingHue = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setTempColor(value);
      setHsv(hexToHsv(value));
    }
  }, [isOpen, value]);

  const handleGradientInteraction = useCallback((clientX: number, clientY: number) => {
    if (!gradientRef.current) return;
    const rect = gradientRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const newHsv = { ...hsv, s: x, v: 1 - y };
    setHsv(newHsv);
    setTempColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [hsv]);

  const handleHueInteraction = useCallback((clientY: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const newHue = y * 360;
    const newHsv = { ...hsv, h: newHue };
    setHsv(newHsv);
    setTempColor(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [hsv]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGradient.current) {
        handleGradientInteraction(e.clientX, e.clientY);
      }
      if (isDraggingHue.current) {
        handleHueInteraction(e.clientY);
      }
    };

    const handleMouseUp = () => {
      isDraggingGradient.current = false;
      isDraggingHue.current = false;
    };

    if (isOpen) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOpen, handleGradientInteraction, handleHueInteraction]);

  const handlePresetClick = (color: string) => {
    setTempColor(color);
    setHsv(hexToHsv(color));
  };

  const handleConfirm = () => {
    onChange(tempColor);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  // Get base hue color for gradient background
  const hueColor = hsvToHex(hsv.h, 1, 1);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-md border-2 border-border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring"
        style={{ backgroundColor: value }}
        data-testid="button-open-color-picker"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Color</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4">
            {/* Preset color grid */}
            <div className="flex-shrink-0">
              <div className="grid grid-cols-8 gap-0.5">
                {presetColors.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className={`w-5 h-5 transition-transform hover:scale-110 focus:outline-none ${
                      tempColor.toLowerCase() === color.toLowerCase() ? "ring-2 ring-foreground ring-offset-1" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    data-testid={`button-preset-color-${index}`}
                  />
                ))}
              </div>
            </div>

            {/* Advanced picker */}
            <div className="flex gap-2">
              {/* Saturation/Brightness gradient */}
              <div
                ref={gradientRef}
                className="w-32 h-32 rounded-sm cursor-crosshair relative"
                style={{
                  background: `linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, ${hueColor})`,
                }}
                onMouseDown={(e) => {
                  isDraggingGradient.current = true;
                  handleGradientInteraction(e.clientX, e.clientY);
                }}
                data-testid="gradient-picker"
              >
                {/* Crosshair indicator */}
                <div
                  className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none"
                  style={{
                    left: `${hsv.s * 100}%`,
                    top: `${(1 - hsv.v) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </div>

              {/* Hue slider */}
              <div
                ref={hueRef}
                className="w-5 h-32 rounded-sm cursor-pointer relative"
                style={{
                  background: "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                }}
                onMouseDown={(e) => {
                  isDraggingHue.current = true;
                  handleHueInteraction(e.clientY);
                }}
                data-testid="hue-slider"
              >
                {/* Hue indicator */}
                <div
                  className="absolute w-full h-2 border-2 border-white rounded-sm shadow-md pointer-events-none"
                  style={{
                    top: `${(hsv.h / 360) * 100}%`,
                    transform: "translateY(-50%)",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Color preview */}
          <div className="flex items-center gap-3 mt-2">
            <div
              className="w-10 h-10 rounded-md border border-border"
              style={{ backgroundColor: tempColor }}
            />
            <span className="font-mono text-sm text-muted-foreground uppercase">
              {tempColor}
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-color-cancel">
              Cancel
            </Button>
            <Button onClick={handleConfirm} data-testid="button-color-choose">
              Choose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
