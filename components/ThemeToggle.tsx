"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

type ThemeToggleProps = {
  size?: "sm" | "icon";
  className?: string;
};

export function ThemeToggle({ size = "icon", className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  // `false` côté serveur, `true` après hydratation : évite tout écart de rendu
  // entre le HTML servi et le client, sans setState dans un effet.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "sm" ? "default" : "icon-lg"}
      aria-label={
        mounted
          ? isDark
            ? "Passer en mode clair"
            : "Passer en mode sombre"
          : "Changer de thème"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "border-border bg-background text-foreground hover:bg-muted hover:text-foreground",
        size === "sm"
          ? "h-12 w-full justify-start gap-2.5 px-4 text-base"
          : "size-11",
        className,
      )}
    >
      {/* Les deux icônes sont superposées : seule celle du thème actif est
            visible, l'autre tourne et s'efface à chaque bascule. `relative`
            sur le parent et `grid` sur l'icône évitent tout décalage. */}
      <span className="relative grid size-5 place-items-center">
        <motion.span
          aria-hidden="true"
          className="col-start-1 row-start-1 grid place-items-center"
          initial={false}
          animate={
            mounted
              ? {
                  rotate: isDark ? 0 : 90,
                  opacity: isDark ? 1 : 0,
                  scale: isDark ? 1 : 0.6,
                }
              : { rotate: 90, opacity: 0, scale: 0.6 }
          }
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Moon className="size-5" />
        </motion.span>
        <motion.span
          aria-hidden="true"
          className="col-start-1 row-start-1 grid place-items-center"
          initial={false}
          animate={
            mounted
              ? {
                  rotate: isDark ? -90 : 0,
                  opacity: isDark ? 0 : 1,
                  scale: isDark ? 0.6 : 1,
                }
              : { rotate: 0, opacity: 1, scale: 1 }
          }
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Sun className="size-5" />
        </motion.span>
      </span>
      {size === "sm" && (
        <span className="font-semibold">
          {mounted && isDark ? "Mode sombre" : "Mode clair"}
        </span>
      )}
    </Button>
  );
}
