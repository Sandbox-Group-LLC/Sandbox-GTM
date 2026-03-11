import { useEffect } from "react";

const HS_SCRIPT_ID = "hs-script-loader";
const HS_SCRIPT_SRC = "//js-na2.hs-scripts.com/244954048.js";

/**
 * Dynamically loads the HubSpot tracking script.
 * Call this hook only on marketing pages (landing, pricing, book-demo, thought-leadership).
 * Do NOT call it on authenticated pages or sign-in/sign-up to prevent Clerk form
 * inputs from being captured as HubSpot leads.
 */
export function useHubSpot() {
  useEffect(() => {
    if (document.getElementById(HS_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = HS_SCRIPT_ID;
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;
    script.src = HS_SCRIPT_SRC;
    document.body.appendChild(script);

    return () => {
      const existing = document.getElementById(HS_SCRIPT_ID);
      if (existing) existing.remove();
    };
  }, []);
}
