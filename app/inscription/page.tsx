import type { Metadata } from "next";

import { SectionBadge } from "@/components/SectionBadge";
import { cleaningLogo } from "@/lib/site";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Créez votre compte client Keur Anta Services.",
};

export default function InscriptionPage() {
  return (
    <div>
      <section className="border-b border-border bg-muted">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <SectionBadge
            logo={cleaningLogo}
            titre="Inscription"
            sousTitre="Créer un compte client"
            surface="carte"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <SignupForm />
        </div>
      </section>
    </div>
  );
}
