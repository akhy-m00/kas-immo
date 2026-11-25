"use client";

import { cn } from "@/lib/utils";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  name?: string;
  autoComplete?: string;
  /** Exemple discret affiché dans la case vide (ex. `Ex : 77 123 45 67`). */
  placeholder?: string;
  className?: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Clavier virtuel souhaité sur mobile (`tel` pour un numéro). */
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  /** Aide affichée SOUS la case, masquée tant qu'une erreur est présente. */
  hint?: string;
  /** Message d'erreur affiché sous la case. */
  error?: string;
};

/**
 * Champ des pages d'authentification (`/connexion`, `/inscription`).
 *
 * Structure classique, de haut en bas : libellé, case, puis aide ou erreur.
 * Rien n'est dessiné à l'intérieur de la bordure en dehors de la saisie : le
 * libellé flottant de `FloatingField` laissait le texte d'aide enfermé dans la
 * case et collait la saisie au libellé.
 *
 * Volontairement distinct de `FloatingField`, qui reste utilisé par les autres
 * formulaires du site (cleaning, demande de visite, admin) : ce changement de
 * style ne concerne que l'authentification.
 *
 * Mêmes props que `FloatingField` (mode contrôlé), pour un remplacement sans
 * aucun changement de logique dans les formulaires.
 */
export function AuthField({
  id,
  label,
  type = "text",
  name,
  autoComplete,
  placeholder,
  className,
  value,
  onValueChange,
  required,
  minLength,
  maxLength,
  inputMode,
  hint,
  error,
}: AuthFieldProps) {
  // `aria-describedby` ne pointe que vers la ligne réellement affichée.
  const showHint = Boolean(hint) && !error;
  const describedBy =
    [showHint ? `${id}-indice` : null, error ? `${id}-erreur` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          // `text-base` (16 px) : en dessous, Safari iOS zoome sur le champ.
          "h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-base text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-200",
          "placeholder:text-muted-foreground/60",
          "focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20",
          // Le bordeaux de la marque est trop sombre sur le fond noir : la
          // teinte claire garde un focus visible en mode sombre.
          "dark:bg-input/30 dark:focus:border-brand-400 dark:focus:ring-brand-400/25",
          error &&
            "border-destructive focus:border-destructive focus:ring-destructive/20 dark:focus:border-destructive dark:focus:ring-destructive/25",
        )}
      />

      {showHint ? (
        <p id={`${id}-indice`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-erreur`}
          role="alert"
          className="mt-1.5 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
