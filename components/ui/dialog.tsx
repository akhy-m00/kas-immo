"use client";

import * as React from "react";
import { cn } from "cn";
import { Dialog as DialogPrimitive } from "radix-ui";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

/**
 * Fenêtre modale.
 *
 * Complément de `sheet.tsx`, qui coulisse depuis un bord de l'écran : la feuille
 * latérale sert à la navigation, la modale sert à une tâche courte qui doit
 * masquer le reste de la page — un formulaire de demande de visite, par
 * exemple. Les deux s'appuient sur le même paquet `radix-ui`, donc le même
 * gestionnaire de focus, la même piège de focus, `Escape` et le même verrou de
 * défilement de l'arrière-plan.
 */

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/** Voile assombri, fondué par `motion` pour rester piloté en JS. */
const MotionOverlay = motion.create(
  DialogPrimitive.Overlay as React.ComponentType<
    NativeOverlayProps & PropsAvecRefs
  >,
);

function DialogOverlay({
  className,
  ...props
}: NativeOverlayProps & PropsAvecRefs) {
  return (
    <MotionOverlay
      data-slot="dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-xs dark:bg-black/70",
        className,
      )}
      {...props}
    />
  );
}

/**
 * `motion` redéfinit les handlers de drag et d'animation avec une signature
 * différente de celle du DOM : sans cette exclusion de type, un `<Dialog>` ne
 * pourrait pas recevoir les props de son `Overlay` ni de son `Content`. Aucun
 * appelant du site ne les utilise, et ils sont donc retirés du type d'entrée.
 */
type PropsAvecRefs = { ref?: React.Ref<HTMLDivElement> };

type MotionPropsIncompatibles =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd";

type NativeContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  MotionPropsIncompatibles
>;

type NativeOverlayProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Overlay>,
  MotionPropsIncompatibles
>;

const CONTENT_SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.8,
} as const;

/** Panneau de la modale : apparition par un léger zoom. */
const MotionContent = motion.create(
  DialogPrimitive.Content as React.ComponentType<
    NativeContentProps & PropsAvecRefs
  >,
);

/**
 * Le centrage est porté par un conteneur `grid` et NON par des classes
 * `-translate-x-1/2 -translate-y-1/2` sur le panneau : `motion` écrirait son
 * propre `transform` inline pour l'animation et écraserait ces classes, qui
 * disparaîtraient à l'ouverture.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: NativeContentProps & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />

      {/* `p-4` plutôt que des marges sur le panneau : sur un téléphone étroit,
          la modale reste entièrement visible, et c'est ce débordement interne
          qui défile. */}
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 pointer-events-none">
        <MotionContent
          data-slot="dialog-content"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={CONTENT_SPRING}
          className={cn(
            "pointer-events-auto relative flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-border bg-popover bg-clip-padding p-5 text-popover-foreground shadow-lift outline-none sm:p-6",
            className,
          )}
          {...props}
        >
          {children}

          {showCloseButton && (
            <DialogPrimitive.Close data-slot="dialog-close" asChild>
              <Button
                variant="ghost"
                className="absolute top-3 right-3 size-11"
                size="icon"
              >
                <XIcon />
                <span className="sr-only">Fermer</span>
              </Button>
            </DialogPrimitive.Close>
          )}
        </MotionContent>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-11", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg font-bold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
