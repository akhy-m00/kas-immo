/**
 * Filtre une destination de redirection reçue dans l'URL (`?suite=`).
 *
 * La valeur est sous le contrôle du visiteur : sans ce filtre, un lien
 * `/connexion?suite=...` piégé enverrait l'utilisateur sur un site tiers juste
 * après une connexion légitime (redirection ouverte, utile au phishing).
 *
 * Tester `startsWith("/")` ne suffit pas : les navigateurs lisent `\` comme
 * `/` et suppriment tabulations et retours à la ligne, donc `/\evil.com` ou
 * `/\t/evil.com` deviennent `//evil.com`, une URL vers un autre domaine. La
 * valeur est donc résolue comme le ferait le navigateur, et refusée si elle
 * quitte le site.
 *
 * Renvoie un chemin interne (`/chemin?requete#ancre`), ou `null`.
 */
export function cheminInterneSur(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (/[\u0000-\u001F\u007F]/.test(value)) return null;

  const base = "https://interne.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    // La normalisation peut elle-même produire `//` : `/..//evil.com` devient
    // `//evil.com`. Le résultat est donc revérifié, pas seulement l'entrée.
    const chemin = `${url.pathname}${url.search}${url.hash}`;
    if (!chemin.startsWith("/") || chemin.startsWith("//")) return null;
    return chemin;
  } catch {
    return null;
  }
}
