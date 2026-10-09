import type { Metadata } from "next";

import { SectionBadge } from "@/components/SectionBadge";
import { cleaningLogo } from "@/lib/site";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  description: "Définissez un nouveau mot de passe Keur Anta Services.",
  robots: { index: false, follow: false },
};

export default function ReinitialiserMotDePassePage() {
  return (
    <div>
      <section className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionBadge
            logo={cleaningLogo}
            titre="Nouveau mot de passe"
            sousTitre="Réinitialisation"
            surface="carte"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <ResetPasswordForm />
        </div>
      </section>
    </div>
  );
}
