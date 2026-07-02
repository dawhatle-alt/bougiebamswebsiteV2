// Escape a string for safe interpolation into HTML (e.g. transactional email
// bodies). Prevents attacker-supplied form values from injecting markup, links,
// or styling into the recipient's inbox.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
