"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { LayoutDashboard, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURATION, EASE_PRO } from "@/lib/animations";
import { getClientSession } from "@/lib/supabase/browser-session";
import type { UserRole } from "@/lib/supabase/database.types";
import { signOut } from "@/lib/supabase/auth-client";
import { cn } from "@/lib/utils";

type SessionUser = {
  fullName: string;
  role: UserRole;
};

type UserMenuProps = {
  /**
   * `dropdown` : bouton déclencheur avec panneau déroulant (header desktop).
   * `inline`   : simple lien « Mon compte » + bouton déconnexion, pour les
   *              pages /mon-compte et /admin où le menu n'a rien à cacher.
   */
  variant?: "dropdown" | "inline";
  /** `button` (header) ou `block` (liste du menu mobile). */
  width?: "button" | "block";
  className?: string;
};

/**
 * Menu utilisateur.
 *
 * L'état de session est lu côté client : le header reste ainsi un composant
 * serveur, et les pages publiques continuent d'être prérendues. Le rendu
 * initial est un espace réservé de la taille du bouton, ce qui évite à la
 * fois d'afficher brièvement « Connexion » à un utilisateur connecté et de
 * décaler la mise en page au moment de la bascule.
 */
export function UserMenu({
  variant = "dropdown",
  width = "button",
  className,
}: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    let active = true;

    void getClientSession().then((session) => {
      if (!active) return;
      setUser(session);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open || variant !== "dropdown") return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, variant]);

  async function handleSignOut() {
    setPending(true);
    await signOut();
    // `replace` plutôt que `push` : la page courante ne doit pas rester dans
    // l'historique, sinon le bouton « retour » rouvrirait une page privée.
    router.replace("/");
    router.refresh();
  }

  // Tant que la session n'est pas connue, on réserve la place sans afficher
  // le contenu : afficher le bouton « Connexion » puis le remplacer créerait un
  // clignotement visible pour un utilisateur déjà connecté.
  if (!loaded) {
    return (
      <div
        className={cn(
          width === "block" ? "h-12 w-full" : "h-11 w-24 shrink-0",
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  if (!user) return null;

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <Button asChild variant="outline" size="lg" className="h-11 w-full">
          <Link href="/mon-compte">
            <User className="size-4" />
            Mon compte
          </Link>
        </Button>
        {user.role === "admin" ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            <Link href="/admin">
              <LayoutDashboard className="size-4" />
              Administration
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleSignOut}
          disabled={pending}
          className="h-11 w-full"
        >
          <LogOut className="size-4" />
          {pending ? "Déconnexion…" : "Déconnexion"}
        </Button>
      </div>
    );
  }

  // En variante `block` (menu mobile), le panneau s'insère dans le flux : le
  // sheet est déjà une surcouche, un absolu y sortirait du cadre visible.
  const inPanel = width === "block";

  return (
    <div
      ref={containerRef}
      className={cn(inPanel ? "relative w-full" : "relative", className)}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "justify-start border-border bg-background px-4 font-semibold text-brand-text hover:bg-brand-soft hover:text-brand-text",
          width === "block" ? "h-12 w-full text-base" : "h-11",
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
          {initialOf(user.fullName)}
        </span>
        <span className="max-w-24 truncate">{user.fullName}</span>
      </Button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: DURATION.slow, ease: EASE_PRO },
              opacity: { duration: DURATION.fast, ease: EASE_PRO },
            }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "z-50 mt-2 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-lift",
                inPanel ? "w-full" : "absolute top-full right-0 w-56",
              )}
            >
              <MenuLink href="/mon-compte" onSelect={() => setOpen(false)}>
                <User className="size-4" />
                Mon compte
              </MenuLink>

              {user.role === "admin" ? (
                <MenuLink href="/admin" onSelect={() => setOpen(false)}>
                  <LayoutDashboard className="size-4" />
                  Administration
                </MenuLink>
              ) : null}

              <div className="my-1.5 h-px bg-border" aria-hidden="true" />

              <motion.button
                type="button"
                onClick={handleSignOut}
                disabled={pending}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: DURATION.fast, ease: EASE_PRO }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-semibold text-foreground transition-colors hover:bg-brand-soft hover:text-brand-text focus-visible:bg-brand-soft focus-visible:text-brand-text focus-visible:outline-none"
              >
                <LogOut className="size-4" />
                {pending ? "Déconnexion…" : "Déconnexion"}
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  onSelect,
  children,
}: {
  href: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.a
      href={href}
      onClick={onSelect}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: DURATION.fast, ease: EASE_PRO }}
      className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-semibold text-foreground transition-colors hover:bg-brand-soft hover:text-brand-text focus-visible:bg-brand-soft focus-visible:text-brand-text focus-visible:outline-none"
    >
      {children}
    </motion.a>
  );
}

/** Initiale affichée dans la pastille du bouton. */
function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}
