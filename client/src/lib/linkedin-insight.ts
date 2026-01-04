// Google Tag Manager - Container ID: GTM-5G3WNT4G
// LinkedIn Insight Tag is configured within GTM

export function initLinkedInInsightTag() {
  // Check if already initialized
  if ((window as any).dataLayer) {
    return;
  }

  // Initialize GTM dataLayer
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  // Load GTM script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-5G3WNT4G';
  document.head.insertBefore(script, document.head.firstChild);

  // Add noscript iframe to body for non-JS fallback
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = 'https://www.googletagmanager.com/ns.html?id=GTM-5G3WNT4G';
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
}
