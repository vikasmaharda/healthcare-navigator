import { Link, useLocation, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Stethoscope, CalendarCheck, Siren, Bot, Landmark, FileHeart, LogIn, LogOut, Menu, X, Moon, Sun, Languages, MapPin, Plus, LifeBuoy, Shield, Building2, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/roles.functions";

import { useAuth } from "@/hooks/use-auth";
import { I18nContext, dict, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAdmin } from "@/lib/admin";

const NAV = [
  { to: "/", labelKey: "home", icon: Activity },
  { to: "/hospitals", labelKey: "hospitals", icon: Stethoscope },
  { to: "/nearby", labelKey: "nearby", icon: MapPin },
  { to: "/ai-assistant", labelKey: "ai", icon: Bot },
  { to: "/schemes", labelKey: "schemes", icon: Landmark },
  { to: "/records", labelKey: "records", icon: FileHeart },
  { to: "/help", labelKey: "help", icon: LifeBuoy },
] as const;

const PRIMARY_NAV = NAV.slice(0, 5);
const SECONDARY_NAV = NAV.slice(5);



export function AppLayout() {
  const { user, signOut } = useAuth();
  const fetchRole = useServerFn(getMyRole);
  const role = useQuery({ queryKey: ["me", "role"], queryFn: () => fetchRole(), enabled: !!user, retry: false, staleTime: 60_000 });

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
          <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center gap-2 sm:gap-3">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="size-9 rounded-xl gradient-primary grid place-items-center shadow-soft shrink-0">
                <Activity className="size-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight">MediRoute</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 justify-center overflow-hidden">
              {PRIMARY_NAV.map(n => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="px-2 xl:px-2.5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  activeProps={{ className: "px-2 xl:px-2.5 py-2 rounded-md text-sm font-medium text-foreground bg-muted whitespace-nowrap" }}
                  activeOptions={{ exact: n.to === "/" }}
                >
                  {t(n.labelKey)}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="px-2 xl:px-2.5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap inline-flex items-center gap-1">
                  More <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 z-50 bg-popover">
                  {SECONDARY_NAV.map(n => {
                    const Icon = n.icon;
                    return (
                      <DropdownMenuItem key={n.to} asChild>
                        <Link to={n.to} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="size-4 text-primary" /> {t(n.labelKey)}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
              <Link to="/emergency" className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg gradient-emergency text-emergency-foreground text-xs font-semibold shadow-soft hover:opacity-90 whitespace-nowrap">
                <Siren className="size-4" /> SOS
              </Link>
              <button onClick={() => setLangP(lang === "en" ? "hi" : "en")} className="hidden sm:inline-flex p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Language">
                <Languages className="size-4" />
              </button>
              <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Theme">
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-border hover:bg-muted max-w-[190px]">
                    <span className="size-7 rounded-full gradient-primary grid place-items-center text-primary-foreground text-xs font-bold shrink-0">
                      {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden md:block text-sm truncate max-w-[110px]">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 z-50 bg-popover">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/records" className="flex items-center gap-2 cursor-pointer"><FileHeart className="size-4" /> {t("records")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/appointments" className="flex items-center gap-2 cursor-pointer"><CalendarCheck className="size-4" /> {t("appointments")}</Link>
                    </DropdownMenuItem>
                    {role.data?.role === "hospital_admin" && (
                      <DropdownMenuItem asChild>
                        <Link to="/hospital-dashboard" className="flex items-center gap-2 cursor-pointer text-primary"><Building2 className="size-4" /> Hospital dashboard</Link>
                      </DropdownMenuItem>
                    )}
                    {(role.data?.role === "super_admin" || isAdmin(user?.email)) && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-primary"><Shield className="size-4" /> Admin</Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer">
                      <LogOut className="size-4" /> {t("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="whitespace-nowrap"><LogIn className="size-4 sm:mr-1" /><span className="hidden sm:inline">{t("login")}</span></Button>
                </Link>
              )}

              <button className="lg:hidden p-2 rounded-md hover:bg-muted" onClick={() => setOpen(o => !o)} aria-label="Menu">
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>


          {open && (
            <div className="xl:hidden border-t border-border bg-card">
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
                {role.data?.role === "hospital_admin" && (
                  <Link to="/hospital-dashboard" className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-md bg-primary/15 text-primary text-sm font-semibold">
                    <Building2 className="size-4" /> Hospital dashboard
                  </Link>
                )}
                {(role.data?.role === "super_admin" || isAdmin(user?.email)) && (
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
