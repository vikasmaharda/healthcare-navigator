import { Link, useLocation, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Stethoscope, CalendarCheck, Siren, Bot, Droplet, Pill, Landmark, FileHeart, LogIn, LogOut, Menu, X, Moon, Sun, Languages, MapPin, Plus, LifeBuoy, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { I18nContext, dict, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin";

const NAV = [
  { to: "/", labelKey: "home", icon: Activity },
  { to: "/hospitals", labelKey: "hospitals", icon: Stethoscope },
  { to: "/nearby", labelKey: "nearby", icon: MapPin },
  { to: "/doctors", labelKey: "doctors", icon: Stethoscope },
  { to: "/appointments", labelKey: "appointments", icon: CalendarCheck },
  { to: "/ai-assistant", labelKey: "ai", icon: Bot },
  { to: "/blood-bank", labelKey: "blood", icon: Droplet },
  { to: "/pharmacy", labelKey: "pharmacy", icon: Pill },
  { to: "/schemes", labelKey: "schemes", icon: Landmark },
  { to: "/records", labelKey: "records", icon: FileHeart },
  { to: "/help", labelKey: "help", icon: LifeBuoy },
] as const;

export function AppLayout() {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("mr-theme") : null;
    if (stored === "dark") { setDark(true); document.documentElement.classList.add("dark"); }
    const l = (typeof window !== "undefined" && localStorage.getItem("mr-lang")) as Lang | null;
    if (l) setLang(l);
  }, []);
  const toggleTheme = () => {
    setDark(d => {
      const nd = !d;
      document.documentElement.classList.toggle("dark", nd);
      localStorage.setItem("mr-theme", nd ? "dark" : "light");
      return nd;
    });
  };
  const setLangP = (l: Lang) => { setLang(l); localStorage.setItem("mr-lang", l); };

  const t = useMemo(() => (k: string) => dict[lang][k] ?? k, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangP, t }}>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="size-9 rounded-xl gradient-primary grid place-items-center shadow-soft">
                <Activity className="size-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">MediRoute</span>
            </Link>

            <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center min-w-0">
              {NAV.map(n => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="px-2.5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  activeProps={{ className: "px-2.5 py-2 rounded-md text-sm font-medium text-foreground bg-muted whitespace-nowrap" }}
                  activeOptions={{ exact: n.to === "/" }}
                >
                  {t(n.labelKey)}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link to="/emergency" className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg gradient-emergency text-emergency-foreground text-sm font-semibold shadow-soft hover:opacity-90">
                <Siren className="size-4" /> SOS
              </Link>
              <button onClick={() => setLangP(lang === "en" ? "hi" : "en")} className="p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Language">
                <Languages className="size-4" />
              </button>
              <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Theme">
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              {isAdmin(user?.email) && (
                <Link to="/admin" className="hidden md:inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25">
                  <Shield className="size-3.5" /> Admin
                </Link>
              )}
              {user ? (
                <Button variant="outline" size="sm" onClick={signOut}><LogOut className="size-4 mr-1" />{t("logout")}</Button>
              ) : (
                <Link to="/login"><Button size="sm"><LogIn className="size-4 mr-1" />{t("login")}</Button></Link>
              )}
              <button className="lg:hidden p-2 rounded-md hover:bg-muted" onClick={() => setOpen(o => !o)} aria-label="Menu">
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {open && (
            <div className="lg:hidden border-t border-border bg-card">
              <div className="px-4 py-3 grid grid-cols-2 gap-1">
                {NAV.map(n => {
                  const Icon = n.icon;
                  return (
                    <Link key={n.to} to={n.to} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted">
                      <Icon className="size-4 text-primary" />{t(n.labelKey)}
                    </Link>
                  );
                })}
                <Link to="/submit-hospital" className="col-span-2 mt-1 flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-card text-sm">
                  <Plus className="size-4 text-primary" /> Add a hospital
                </Link>
                {isAdmin(user?.email) && (
                  <Link to="/admin" className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-md bg-primary/15 text-primary text-sm font-semibold">
                    <Shield className="size-4" /> Admin
                  </Link>
                )}
                <Link to="/emergency" className="col-span-2 mt-1 flex items-center gap-2 px-3 py-2 rounded-md gradient-emergency text-emergency-foreground font-semibold">
                  <Siren className="size-4" /> Emergency SOS
                </Link>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <footer className="border-t border-border mt-12">
          <div className="max-w-7xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="size-7 rounded-lg gradient-primary grid place-items-center"><Activity className="size-4 text-primary-foreground" /></div>
                <span className="font-display font-bold">MediRoute</span>
              </div>
              <p className="text-muted-foreground">A healthcare navigation platform for finding hospitals, doctors, beds, blood, and emergency help fast.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Quick links</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><Link to="/hospitals" className="hover:text-foreground">Hospitals</Link></li>
                <li><Link to="/doctors" className="hover:text-foreground">Doctors</Link></li>
                <li><Link to="/ai-assistant" className="hover:text-foreground">AI Symptom Assistant</Link></li>
                <li><Link to="/schemes" className="hover:text-foreground">Govt Schemes</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Disclaimer</h4>
              <p className="text-muted-foreground">MediRoute provides general guidance only and is not a substitute for professional medical advice. In emergencies, call 102 immediately.</p>
            </div>
          </div>
          <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MediRoute</div>
        </footer>
      </div>
    </I18nContext.Provider>
  );
}
