import type { Metadata } from "next";
import { Suspense } from "react";

import { SectionBadge } from "@/components/SectionBadge";
import { immobilierLogo } from "@/lib/site";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Espace client Keur Anta Services.",
};

export default function ConnexionPage() {
  return (
    <div>
      <section className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionBadge
            logo={immobilierLogo}
            titre="Connexion"
            sousTitre="Espace client"
            surface="carte"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          {/* `useSearchParams` force un rendu dynamique : le Suspense est
              obligatoire, sinon toute la route ne pourrait pas être prérendue. */}
          <Suspense
            fallback={
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
