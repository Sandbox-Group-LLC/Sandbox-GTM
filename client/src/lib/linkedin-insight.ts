// LinkedIn Insight Tag - Partner ID: 8484364
// Injects the exact LinkedIn-provided script at runtime

export function initLinkedInInsightTag() {
  // Check if already initialized
  if ((window as any)._linkedin_partner_id) {
    return;
  }

  // First script - Partner ID setup
  (window as any)._linkedin_partner_id = "8484364";
  (window as any)._linkedin_data_partner_ids = (window as any)._linkedin_data_partner_ids || [];
  (window as any)._linkedin_data_partner_ids.push((window as any)._linkedin_partner_id);

  // Second script - Load the LinkedIn analytics library
  (function(l: any) {
    if (!l) {
      (window as any).lintrk = function(a: any, b: any) {
        (window as any).lintrk.q.push([a, b]);
      };
      (window as any).lintrk.q = [];
    }
    var s = document.getElementsByTagName("script")[0];
    var b = document.createElement("script");
    b.type = "text/javascript";
    b.async = true;
    b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
    s.parentNode?.insertBefore(b, s);
  })((window as any).lintrk);
}
