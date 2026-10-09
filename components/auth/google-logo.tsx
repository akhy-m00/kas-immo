/**
 * Logo officiel Google, aux couleurs de la marque.
 *
 * Les quatre chemins reprennent le "G" multicolore de Google. Les couleurs
 * ne sont pas thémables : un logo de fournisseur s'affiche toujours tel quel,
 * dans les deux modes du site.
 */
export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 18 18"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H1v2.33A8.99 8.99 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H1a9 9 0 0 0 0 8.1l2.97-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 1 4.95l2.97 2.33C4.68 5.17 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
