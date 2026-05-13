// Admin email — only the user signed in with this exact Gmail can access /admin
// or read contact/submission data.
export const ADMIN_EMAIL = "mediroutehealth@gmail.com";

export const isAdmin = (email?: string | null) =>
  !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
