"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Phone } from "lucide-react";

import { DURATION, EASE_PRO } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { cleaningContact } from "@/lib/site";
import { cn } from "@/lib/utils";

type CleaningPhoneButtonProps = {
  /**
   * `accordion` : le choix s'ouvre sous le bouton (mobile, listes empilées).
   * `dropdown` : le choix s'ouvre en menu déroulant (header ordinateur).
   */
  placement?: "accordion" | "dropdown";
  /** Taille du bouton : `lg` pleine largeur dans les listes, `sm` dans le header. */
  size?: "sm" | "lg";
  /** Texte du bouton déclencheur. */
  label?: string;
  /** Appelé après sélection d'un numéro (utile pour refermer le menu mobile). */
  onSelect?: () => void;
  className?: string;
};

export function CleaningPhoneButton({
  placement = "accordion",
  size = "sm",
  label = "Cleaning",
  onSelect,
  className,
}: CleaningPhoneButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "border-border bg-background font-semibold text-brand-text hover:bg-brand-soft hover:text-brand-text",
          size === "lg"
            ? "h-12 w-full justify-start px-4 text-base"
            : "h-11 justify-start px-3 text-sm sm:px-4",
        )}
      >
        <Phone className="size-4" />
        {label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
          className="grid place-items-center"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </motion.span>
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
                "z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-lift",
                placement === "dropdown" &&
                  "absolute top-full right-0 mt-2 w-64 sm:w-56",
              )}
            >
              {cleaningContact.phones.map((phone) => (
                <motion.a
                  key={phone.href}
                  href={phone.href}
                  onClick={() => {
                    setOpen(false);
                    onSelect?.();
                  }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: DURATION.fast, ease: EASE_PRO }}
                  className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-semibold text-foreground transition-colors hover:bg-brand-soft hover:text-brand-text focus-visible:bg-brand-soft focus-visible:text-brand-text focus-visible:outline-none"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
                    <Phone className="size-3.5" />
                  </span>
                  {phone.display}
                </motion.a>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
