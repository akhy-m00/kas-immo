"use client";

import { useEffect } from "react";
import Lenis from "lenis";

import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Défilement fluide et inertiel sur tout le site.
 *
 * Désactivé si `prefers-reduced-motion` est actif : le scroll natif est
 * conservé, car une inertie piloted par l'utilisateur est précisément ce que
 * ce réglage demande d'éviter.
 *
 * `data-lenis-prevent` empêche Lenis d'intercepter le défilement d'un
 * conteneur qui le demande (zones à défilement propre).
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.05,
      // Léger dépassement en fin de course, amorti par l'easing exponentiel.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      // Le défilement au doigt reste natif : l'inertie de Lenis y bringue.
      syncTouch: false,
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Les ancres internes doivent passer par Lenis, sinon le scroll natif et
    // le scroll lissé se marchent dessus et le saut devient brutal.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}
