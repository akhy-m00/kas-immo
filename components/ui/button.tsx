"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import { motion, useReducedMotion, type Transition } from "motion/react";

import { DURATION, EASE_PRO } from "@/lib/animations";

type MotionTransition = Transition;

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-heading text-sm font-semibold tracking-tight whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type Ripple = { id: number; x: number; y: number };

/** Transition unique partagée par le survol et l'appui. */
const BTN_TRANSITION: MotionTransition = {
  duration: DURATION.fast,
  ease: EASE_PRO,
};

const HOVER_SCALE = 1.03;
const TAP_SCALE = 0.96;

/**
 * Sépare les classes de largeur de l'appelant (`w-full sm:w-auto`) du reste de
 * sa `className`.
 *
 * Sur un bouton `asChild`, la coque d'animation doit partager la largeur du
 * lien sans la dupliquer : le fond et le `padding` vont sur le lien, les
 * classes de largeur sur la coque. Sans cette séparation, un `w-full` resterait
 * sur le lien et se résoudrait contre la coque au lieu de la colonne, et le
 * `sm:w-auto` de l'appelant ne pourrait plus jamais reprendre le dessus.
 */
function splitWidthClasses(className?: string) {
  if (!className) return { width: undefined, rest: undefined };
  const width = className
    .split(/\s+/)
    .filter((token) => /^(?:\w+:)*w-/.test(token))
    .join(" ");
  const rest = className
    .split(/\s+/)
    .filter((token) => token && !/^(?:\w+:)*w-/.test(token))
    .join(" ");
  return { width: width || undefined, rest: rest || undefined };
}

/**
 * `motion` redéfinit `onAnimationStart` et quelques handlers de drag avec une
 * signature différente de celle du DOM. Ces props sont donc retirés du type
 * d'entrée : aucun appelant du site ne les utilise, et les laisser créerait une
 * incompatibilité de types à chaque rendu.
 */
type NativeButtonProps = Omit<
  React.ComponentProps<"button">,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"
>;

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  onClick,
  children,
  ...props
}: NativeButtonProps &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const counter = React.useRef(0);

  // L'onde n'est ajoutée qu'aux boutons de la couleur de marque, là où elle se
  // voit, et jamais en `asChild` : `Slot` n'accepte qu'un enfant, il serait donc
  // impossible d'y insérer l'élément de l'onde.
  const withRipple = !asChild && variant === "default";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (withRipple && !reduced && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const id = ++counter.current;
      setRipples((current) => [
        ...current,
        {
          id,
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        },
      ]);
      window.setTimeout(() => {
        setRipples((current) => current.filter((item) => item.id !== id));
      }, 620);
    }
    onClick?.(event);
  };

  const classNames = cn(
    buttonVariants({ variant, size, className }),
    withRipple && "relative overflow-hidden",
  );

  // `ease` est annoté en tableau à 4 nombres : `EASE_PRO` est `as const`,
  // mais l'inférence du spread lerait en `number[]`, que `motion` refuse.
  const animation = reduced
    ? {}
    : {
        whileHover: { scale: HOVER_SCALE },
        whileTap: { scale: TAP_SCALE },
        transition: BTN_TRANSITION,
      };

  if (asChild) {
    /**
     * Un bouton `asChild` doit rendre l'enfant (un `Link` → un `<a>`) et rien
     * d'autre. `motion.create(Slot.Root)` ne peut pas l'animer : `motion`
     * poserait sa transformation sur le `Slot`, qui ne rend aucun nœud DOM,
     * donc la cible de l'animation n'existe pas et rien ne bouge.
     *
     * Le `motion.span` ci-dessous n'est donc qu'une coque d'animation, sans
     * aucune apparence : fond, bordure et `padding` restent sur le lien, pour
     * que la totalité de la surface visible soit cliquable. Répartir le
     * padding sur la coque aurait laissé une bande morte de part et d'autre du
     * lien.
     *
     * Les classes de largeur de l'appelant (`w-full sm:w-auto`) sont transférées
     * à la coque : c'est elle qui donne sa largeur au bouton, le lien occupant
     * toute cette largeur. Le `sm:w-auto` de l'appelant reste donc libre de
     * reprendre la main au-dessus du palier.
     *
     * Elle est écartée du parcours de tabulation (`tabIndex={-1}`) : `motion`
     * rend tout élément qu'il anime focusable, ce qui créerait un arrêt clavier
     * fantôme devant le lien. Les deux chemins partagent la même transition
     * (`BTN_TRANSITION`), donc survol et appui sont identiques.
     */
    const { width, rest } = splitWidthClasses(className);

    return (
      <motion.span
        data-slot="button"
        data-variant={variant ?? "default"}
        data-size={size ?? "default"}
        className={cn("block", width ?? "w-fit")}
        tabIndex={-1}
        {...animation}
      >
        <Slot.Root {...props} className={cn(classNames, rest, "w-full")}>
          {children}
        </Slot.Root>
      </motion.span>
    );
  }

  return (
    <motion.button
      ref={ref}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={classNames}
      onClick={handleClick}
      {...animation}
      {...props}
    >
      {children}
      {ripples.map((item) => (
        <motion.span
          key={item.id}
          aria-hidden="true"
          className="pointer-events-none absolute size-[220%] rounded-full bg-current opacity-20"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            translate: "-50% -50%",
          }}
          initial={{ scale: 0, opacity: 0.18 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.62, ease: "easeOut" }}
        />
      ))}
    </motion.button>
  );
}

export { Button, buttonVariants };
