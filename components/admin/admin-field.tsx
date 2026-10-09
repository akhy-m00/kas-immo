"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";

import { DURATION, EASE_PRO } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Champs de formulaire de l'espace admin.
 *
 * `AdminInput` reprend exactement le label flottant de
 * `components/motion/FloatingField.tsx` (même durée, même courbe, mêmes
 * hauteurs) pour que le formulaire ressemble au reste du site. Ce composant
 * est recréé ici plutôt que modifié parce qu'un champ de bien a besoin
 * d'attributs que `FloatingField` n'expose pas encore (`min`, `max`, `inputMode`,
 * suffixe) : le prix est numérique et doit pouvoir porter « FCFA » à côté de la
 * saisie.
 *
 * `AdminTextarea` et `AdminSelect` gardent un libellé fixe au-dessus du champ :
 * leur contenu occupe toute la hauteur, un libellé qui flotterait n'apporterait
 * rien.
 */

/** Message d'erreur d'un champ, relié à son champ par `aria-describedby`. */
function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className="px-1 text-sm font-medium text-destructive"
    >
      {message}
    </p>
  );
}

type AdminInputProps = {
  id: string;
  label: string;
  name: string;
  type?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Rendu en suffixe discret à droite du champ (ex. « FCFA »). */
  suffix?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  min?: number;
  max?: number;
  maxLength?: number;
  required?: boolean;
  error?: string;
  className?: string;
};

/** Champ texte à label flottant, aligné sur l'apparence de `FloatingField`. */
export function AdminInput({
  id,
  label,
  name,
  type = "text",
  value,
  onValueChange,
  suffix,
  placeholder,
  inputMode,
  min,
  max,
  maxLength,
  required,
  error,
  className,
}: AdminInputProps) {
  const [focused, setFocused] = useState(false);
  const filled = focused || value.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-background transition-colors duration-200 focus-within:ring-3",
          error
            ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
            : "border-input focus-within:border-brand-text focus-within:ring-brand-text/20",
          className,
        )}
      >
        <div className="relative flex-1">
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            placeholder={placeholder ?? " "}
            inputMode={inputMode}
            min={min}
            max={max}
            maxLength={maxLength}
            required={required}
            onChange={(event) => onValueChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              // Le label ne redescend que si le champ est réellement vide :
              // sinon il masquerait la valeur qu'il vient de faire saisir.
              if (!event.currentTarget.value) setFocused(false);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-erreur` : undefined}
            className="h-14 w-full rounded-lg bg-transparent px-4 pt-5 pb-1 text-base outline-none placeholder:text-transparent disabled:opacity-60"
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

        {suffix ? (
          <span className="pr-4 text-sm font-medium whitespace-nowrap text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>

      <FieldError id={error ? `${id}-erreur` : undefined} message={error} />
    </div>
  );
}

type AdminTextareaProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  error?: string;
};

export function AdminTextarea({
  id,
  label,
  name,
  value,
  onValueChange,
  rows = 5,
  placeholder,
  maxLength,
  hint,
  error,
}: AdminTextareaProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {maxLength ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {value.length} / {maxLength}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "relative rounded-lg border transition-colors duration-200",
          error
            ? "border-destructive focus-within:border-destructive focus-within:ring-3 focus-within:ring-destructive/20"
            : "border-input focus-within:border-brand-text focus-within:ring-3 focus-within:ring-brand-text/20",
        )}
      >
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className="w-full resize-y rounded-lg bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
        />
      </div>

      {hint && !error ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <FieldError id={error ? `${id}-erreur` : undefined} message={error} />
    </div>
  );
}

type AdminSelectOption = { value: string; label: string };

type AdminSelectProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  options: AdminSelectOption[];
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
};

export function AdminSelect({
  id,
  label,
  name,
  value,
  options,
  onValueChange,
  hint,
  error,
}: AdminSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      <div
        className={cn(
          "relative rounded-lg border transition-colors duration-200",
          error
            ? "border-destructive focus-within:border-destructive focus-within:ring-3 focus-within:ring-destructive/20"
            : "border-input focus-within:border-brand-text focus-within:ring-3 focus-within:ring-brand-text/20",
        )}
      >
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className="h-12 w-full appearance-none rounded-lg bg-background px-4 pr-10 text-base outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      {hint && !error ? (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <FieldError id={error ? `${id}-erreur` : undefined} message={error} />
    </div>
  );
}
