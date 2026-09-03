# MediRoute roadmap

## Done
- DB-based roles (patient / hospital_admin / super_admin) via `getMyRole`
- Hospital dashboard server functions (RLS-scoped) + `/hospital-dashboard` UI
- Role-aware login chooser (Patient / Hospital) and post-login routing (patients -> Home)
- Trimmed patient navigation to Home, Hospitals, Nearby, AI Assistant, Schemes, My Records, Help
- Hospital PDF import (51 hospitals)

## Open
- Email OTP verification on signup
- Age auto-calculation surfaced to AI + profile
- AI assistant quality upgrade (age/gender aware, safety tiers)
- 22-language centralized i18n selector + saved preference
- Remove static homepage stats, replace with DB-backed numbers
- My Records: search / hospital / AI history with delete
- Emergency SOS: contacts CRUD, saved default message, Resend email alerts, SMS later
- Admin: hospital account approval / admin linking UI
