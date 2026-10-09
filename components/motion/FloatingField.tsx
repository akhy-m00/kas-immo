"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { DURATION, EASE_PRO } from "@/lib/animations";
import { cn } from "@/lib/utils";

type FloatingFieldProps = {
  id: string;
  label: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  className?: string;
  /**
   * Mode contrôlé : fourni avec `onValueChange`, le champ reflète la valeur
   * du parent au lieu de la gérer seul. Sans `value`, le comportement
   * historique est conservé tel quel.
   */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Rend le champ obligatoire et expose les messages du navigateur. */
  required?: boolean;
  minLength?: number;
  /**
   * Longueur maximale.
   *
   * Ajoutée pour le formulaire de demande de visite : sans elle, un message
   * trop long était accepté par le navigateur puis refusé par la validation
   * serveur, ce qui est exactement le décalage qu'un `maxLength` évite.
   */
  maxLength?: number;
  /**
   * Clavier virtuel souhaité sur mobile.
   *
   * Un champ téléphone sans `inputMode="tel"` affiche un clavier alphabétique
   * plein écran sur un téléphone : la saisie devient inutilement pénible.
   */
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  /**
   * Aide non obligatoire affichée sous le champ.
   *
   * Masquée dès qu'une erreur est présente : l'utilisateur a alors un problème
   * à corriger, et deux lignes de texte sous le même champ l'en détourneroient.
   */
  hint?: string;
  /** Message d'erreur affiché sous le champ, sur la teinte `destructive`. */
  error?: string;
};

/**
 * Champ de formulaire à label flottant.
 *
 * Le label démarre au centre du champ et monte de 4 px quand le champ reçoit
 * le focus ou du texte. Le mouvement se fait en `transform` sur un élément
 * absolutely positionné : la hauteur du champ ne bouge jamais, donc le
 * formulaire ne se décale pas pendant la saisie.
 */
export function FloatingField({
  id,
  label,
  type = "text",
  name,
  autoComplete,
  className,
  value,
  onValueChange,
  required,
  minLength,
  maxLength,
  inputMode,
  hint,
  error,
}: FloatingFieldProps) {
  const [active, setActive] = useState(false);
  const controlled = onValueChange !== undefined;

  // En mode contrôlé, l'état visuel du label tient compte de la valeur et du
  // focus : c'est ce qui permet d'afficher une valeur pré-remplie sans que le
  // label reste centré dessus, tout en conservant le comportement historique
  // (le label monte dès le focus, même sur un champ encore vide).
  const filled = active || Boolean(value);

  // `aria-describedby` pointe vers la seule ligne réellement affichée, pour
  // qu'un lecteur d'écran n'annonce pas une aide invisible.
  const showHint = Boolean(hint) && !error;
  const describedBy =
    [showHint ? `${id}-indice` : null, error ? `${id}-erreur` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border border-input bg-background transition-colors duration-200 focus-within:border-brand-text focus-within:ring-3 focus-within:ring-brand-text/20",
        error &&
          "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        className,
      )}
    >
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder=" "
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          value={controlled ? value : undefined}
          onChange={(event) => {
            if (controlled) onValueChange(event.target.value);
            setActive(true);
          }}
          onFocus={() => setActive(true)}
          onBlur={(event) => {
            if (!event.currentTarget.value) setActive(false);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-14 w-full rounded-lg bg-transparent px-4 pt-5 pb-1 text-base outline-none placeholder:text-transparent"
        />
        <motion.label
          htmlFor={id}
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-base text-muted-foreground"
          animate={
            filled
              ? { y: "-1.05rem", scale: 0.78, transformOrigin: "0% 0%" }
              : { y: "-50%", scale: 1, transformOrigin: "0% 50%" }
          }
          transition={{ duration: DURATION.fast, ease: EASE_PRO }}
        >
          {label}
        </motion.label>
      </div>
      {showHint ? (
        <p id={`${id}-indice`} className="px-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-erreur`}
          role="alert"
          className="px-1 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
