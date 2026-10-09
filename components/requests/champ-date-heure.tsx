import { aujourdhuiAuSite } from "@/lib/requests";

/**
 * Champ natif `date` ou `time`, avec un libellé fixe au-dessus.
 *
 * Extrait de `components/immobilier/request-visit-dialog.tsx`, qui le déclarait
 * en privé. Les deux formulaires du site — demande de visite d'un bien et demande
 * de rendez-vous Cleaning — demandent exactement le même couple de champs, avec
 * les mêmes bornes. Le dupliquer aurait créé deux champs date/heure qui
 * divergeraient : une correction de style ou d'accessibilité dans l'un laisserait
 * l'autre derrière.
 *
 * `FloatingField` n'est pas réutilisé ici, volontairement : les sélecteurs
 * natifs affichent déjà leur propre format de date (« 05/10/2026 »), et un
 * libellé flottant qui viendrait se superposer dessus rendrait la saisie
 * ambiguë. Un libellé fixe laisse le champ lisible.
 *
 * `[color-scheme:dark]` suit le thème : sans cela, le calendrier natif reste
 * blanc sur fond sombre, et le texte y devient quasi illisible.
 */
export function ChampDateHeure({
  id,
  name,
  label,
  type,
  value,
  onValueChange,
  min,
  max,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type: "date" | "time";
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        required
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erreur` : undefined}
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none [color-scheme:light] focus-visible:border-brand-text focus-visible:ring-3 focus-visible:ring-brand-text/20 dark:[color-scheme:dark] aria-invalid:border-destructive"
      />

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

/**
 * Dernier jour sélectionnable dans un champ `<input type="date">`.
 *
 * La borne est calculée à Dakar, comme `aujourdhuiAuSite()` côté serveur : les
 * deux extrémités de la plage doivent tomber sur le même jour, sinon le
 * navigateur proposerait des dates que la validation refuse.
 */
export function limiteDeSelection(joursMax: number): string {
  const limite = new Date(`${aujourdhuiAuSite()}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + joursMax);

  return aujourdhuiAuSite(limite);
}