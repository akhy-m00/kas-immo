import { PageTransition } from "@/components/motion/PageTransition";

/**
 * `template.tsx` est remonté à chaque navigation par l'App Router, contrairement
 * à `layout.tsx`. La transition entre pages se joue donc sans rechargement et
 * sans duplicated layout.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
