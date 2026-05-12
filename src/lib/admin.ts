// Placeholder admin email — change this to your own Gmail to take ownership of the admin panel.
// Only the user signed in with this exact email can access /admin or read contact/submission data.
export const ADMIN_EMAIL = "admin@example.com";

export const isAdmin = (email?: string | null) =>
  !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
