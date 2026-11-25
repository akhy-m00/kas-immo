"use client";

import { ChevronDown } from "lucide-react";

import {
  CLASSE_AIDE,
  CLASSE_CHAMP,
  CLASSE_ERREUR,
  CLASSE_GROUPE,
  CLASSE_LIBELLE,
  CLASSE_LISTE,
  CLASSE_ZONE_TEXTE,
} from "@/components/forms/styles";
import { cn } from "@/lib/utils";

/**
 * Champs de formulaire de l'espace admin.
 *
 * Même structure et mêmes styles que les formulaires publics
 * (`components/forms/styles.ts`) : libellé au-dessus, case de 48 px, aide ou
 * erreur en dessous. Ces composants restent séparés de `Champ` parce qu'un
 * champ de bien a besoin d'attributs propres à l'admin (`min`, `max`,
 * suffixe « FCFA », compteur de caractères, liste d'options).
 */

/** Message d'erreur d'un champ, relié à son champ par `aria-describedby`. */
function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className={CLASSE_ERREUR}>
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
  /** Rendu en suffixe discret à droite de la saisie (ex. « FCFA »). */
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
  return (
    <div className={cn(CLASSE_GROUPE, className)}>
      <label htmlFor={id} className={CLASSE_LIBELLE}>
        {label}
      </label>

      <div className="relative min-w-0">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          min={min}
          max={max}
          maxLength={maxLength}
          required={required}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className={cn(CLASSE_CHAMP, suffix && "pr-16")}
        />

        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-medium whitespace-nowrap text-muted-foreground"
          >
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
    <div className={CLASSE_GROUPE}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {maxLength ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {value.length} / {maxLength}
          </span>
        ) : null}
      </div>

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
        className={CLASSE_ZONE_TEXTE}
      />

      {hint && !error ? <p className={CLASSE_AIDE}>{hint}</p> : null}
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
    <div className={CLASSE_GROUPE}>
      <label htmlFor={id} className={CLASSE_LIBELLE}>
        {label}
      </label>

      <div className="relative min-w-0">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className={CLASSE_LISTE}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      {hint && !error ? <p className={CLASSE_AIDE}>{hint}</p> : null}
      <FieldError id={error ? `${id}-erreur` : undefined} message={error} />
    </div>
  );
}
