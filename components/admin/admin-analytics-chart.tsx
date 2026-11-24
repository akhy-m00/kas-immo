"use client";

import { useId, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Home,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { AdminAnalyticsData, AnalyticsPoint } from "@/lib/requests-admin";
import { cn } from "@/lib/utils";

type Period = "7j" | "30j" | "6m";

export function AdminAnalyticsChart({ data }: { data: AdminAnalyticsData }) {
  const [period, setPeriod] = useState<Period>("30j");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showImmo, setShowImmo] = useState(true);
  const [showClean, setShowClean] = useState(true);
  const chartId = useId();

  // Sélection des points selon la période
  const points: AnalyticsPoint[] = useMemo(() => {
    switch (period) {
      case "7j":
        return data.last7Days;
      case "30j":
        return data.last30Days;
      case "6m":
        return data.last6Months;
      default:
        return data.last30Days;
    }
  }, [period, data]);

  // Totaux sur la période sélectionnée
  const periodTotalImmo = useMemo(
    () => points.reduce((acc, p) => acc + p.immobilier, 0),
    [points],
  );
  const periodTotalClean = useMemo(
    () => points.reduce((acc, p) => acc + p.cleaning, 0),
    [points],
  );
  const periodTotal = periodTotalImmo + periodTotalClean;

  // Calcul du max pour l'échelle Y
  const rawMax = useMemo(() => {
    const max = Math.max(
      ...points.map((p) =>
        Math.max(
          showImmo ? p.immobilier : 0,
          showClean ? p.cleaning : 0,
        ),
      ),
      0,
    );
    if (max === 0) return 3; // Échelle propre par défaut quand 0 demande
    if (max <= 4) return max + 1;
    return Math.ceil(max * 1.15);
  }, [points, showImmo, showClean]);

  // Ticks entiers pour l'axe Y
  const yTicks = useMemo(() => {
    if (rawMax <= 3) return [0, 1, 2, 3];
    if (rawMax <= 6) return [0, 2, 4, 6];
    const mid = Math.round(rawMax / 2);
    return [0, mid, rawMax];
  }, [rawMax]);

  const maxVal = yTicks[yTicks.length - 1];

  // Dimensions SVG
  const width = 760;
  const height = 280;
  const paddingLeft = 42;
  const paddingRight = 24;
  const paddingTop = 32;
  const paddingBottom = 46;

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const plotBottom = paddingTop + plotHeight;
  const plotTop = paddingTop;

  // Coordonnées calculées pour chaque point
  const coords = useMemo(() => {
    const n = points.length;
    return points.map((p, i) => {
      const x =
        n <= 1
          ? paddingLeft + plotWidth / 2
          : paddingLeft + (i / (n - 1)) * plotWidth;

      const yImmo =
        plotBottom - (p.immobilier / maxVal) * plotHeight;
      const yClean =
        plotBottom - (p.cleaning / maxVal) * plotHeight;

      return {
        point: p,
        index: i,
        x,
        yImmo,
        yClean,
      };
    });
  }, [points, maxVal, plotBottom, plotHeight, plotWidth]);

  // Génération de la courbe de Bézier lissée
  const immoPath = useMemo(() => {
    if (!showImmo || coords.length === 0) return "";
    return getSmoothPath(coords.map((c) => ({ x: c.x, y: c.yImmo })), plotTop, plotBottom);
  }, [coords, showImmo, plotTop, plotBottom]);

  const cleanPath = useMemo(() => {
    if (!showClean || coords.length === 0) return "";
    return getSmoothPath(coords.map((c) => ({ x: c.x, y: c.yClean })), plotTop, plotBottom);
  }, [coords, showClean, plotTop, plotBottom]);

  // Aires sous les courbes (Area Chart)
  const immoAreaPath = useMemo(() => {
    if (!showImmo || coords.length === 0 || !immoPath) return "";
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${immoPath} L ${last.x.toFixed(1)} ${plotBottom} L ${first.x.toFixed(1)} ${plotBottom} Z`;
  }, [immoPath, coords, plotBottom, showImmo]);

  const cleanAreaPath = useMemo(() => {
    if (!showClean || coords.length === 0 || !cleanPath) return "";
    const first = coords[0];
    const last = coords[coords.length - 1];
    return `${cleanPath} L ${last.x.toFixed(1)} ${plotBottom} L ${first.x.toFixed(1)} ${plotBottom} Z`;
  }, [cleanPath, coords, plotBottom, showClean]);

  const activeCoord =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < coords.length
      ? coords[hoveredIndex]
      : null;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
      {/* En-tête : Titre & Sélecteur temporel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-text">
              <TrendingUp className="size-4" aria-hidden="true" />
            </span>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Analytique chronologique des demandes
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Évolution des visites immobilières vs demandes de nettoyage
          </p>
        </div>

        {/* Sélecteur de période */}
        <div className="inline-flex items-center rounded-xl border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setPeriod("7j");
              setHoveredIndex(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              period === "7j"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            7 jours
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriod("30j");
              setHoveredIndex(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              period === "30j"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className="size-3.5" aria-hidden="true" />
            30 jours
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriod("6m");
              setHoveredIndex(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              period === "6m"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Calendar className="size-3.5" aria-hidden="true" />
            6 mois
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-muted/40 p-3.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total demandes</span>
            <BarChart3 className="size-3.5" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-heading text-2xl font-bold text-foreground">
            {data.totalDemandes}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {periodTotal} sur cette période
          </p>
        </div>

        <div className="rounded-2xl border border-brand-200/50 bg-brand-50/50 p-3.5 dark:border-brand-900/40 dark:bg-brand-950/20">
          <div className="flex items-center justify-between text-brand-700 dark:text-brand-300">
            <span className="text-xs font-medium">Immobilier</span>
            <Home className="size-3.5" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-heading text-2xl font-bold text-brand-900 dark:text-brand-100">
            {data.demandesImmobilier}
          </p>
          <p className="mt-0.5 text-[11px] text-brand-700/80 dark:text-brand-300/80">
            {periodTotalImmo} sur cette période
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200/60 bg-sky-50/50 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/20">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-300">
            <span className="text-xs font-medium">Cleaning</span>
            <Sparkles className="size-3.5" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-heading text-2xl font-bold text-sky-950 dark:text-sky-100">
            {data.demandesCleaning}
          </p>
          <p className="mt-0.5 text-[11px] text-sky-700/80 dark:text-sky-300/80">
            {periodTotalClean} sur cette période
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-xs font-medium">Traitées</span>
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
          </div>
          <p className="mt-1.5 font-heading text-2xl font-bold text-emerald-950 dark:text-emerald-100">
            {data.tauxTraitement}%
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
            {data.demandesTraitees} acceptées / finies
          </p>
        </div>
      </div>

      {/* Légende interactive et filtres de courbe */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setShowImmo(!showImmo)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-opacity",
              !showImmo && "opacity-40 line-through",
            )}
            title="Afficher/masquer la courbe Immobilier"
          >
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: "#8E0B3F" }}
            />
            <span className="text-foreground">Immobilier (visites)</span>
            {showImmo ? (
              <Eye className="size-3 text-muted-foreground" />
            ) : (
              <EyeOff className="size-3 text-muted-foreground" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowClean(!showClean)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-opacity",
              !showClean && "opacity-40 line-through",
            )}
            title="Afficher/masquer la courbe Cleaning"
          >
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: "#0284C7" }}
            />
            <span className="text-foreground">Cleaning (rendez-vous)</span>
            {showClean ? (
              <Eye className="size-3 text-muted-foreground" />
            ) : (
              <EyeOff className="size-3 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Info-bulle textuelle récapitulative au survol */}
        {activeCoord ? (
          <div className="text-xs font-medium text-foreground animate-in fade-in duration-150">
            <span className="font-semibold text-muted-foreground">
              {activeCoord.point.fullDate} :
            </span>{" "}
            <span className="font-bold text-[#8E0B3F] dark:text-[#E06B9A]">
              {activeCoord.point.immobilier} immo
            </span>
            {" · "}
            <span className="font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {activeCoord.point.cleaning} cleaning
            </span>{" "}
            (Total {activeCoord.point.total})
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Survolez la courbe pour voir le détail par date
          </div>
        )}
      </div>

      {/* Zone du graphique Line / Area SVG */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full select-none overflow-visible"
          aria-label="Graphique d'évolution des demandes"
        >
          <defs>
            {/* Dégradé Immobilier (Area Chart) */}
            <linearGradient
              id={`${chartId}-area-immo`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#8E0B3F" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#8E0B3F" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8E0B3F" stopOpacity="0.00" />
            </linearGradient>

            {/* Dégradé Cleaning (Area Chart) */}
            <linearGradient
              id={`${chartId}-area-clean`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.30" />
              <stop offset="70%" stopColor="#0284C7" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Lignes de grille horizontales Y et labels */}
          {yTicks.map((tick) => {
            const y = plotBottom - (tick / maxVal) * plotHeight;
            return (
              <g key={tick} className="text-muted-foreground/30">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray={tick === 0 ? "none" : "3 3"}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-medium"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Aires dégradées sous les courbes */}
          {cleanAreaPath && (
            <path
              d={cleanAreaPath}
              fill={`url(#${chartId}-area-clean)`}
              className="transition-all duration-300"
            />
          )}

          {immoAreaPath && (
            <path
              d={immoAreaPath}
              fill={`url(#${chartId}-area-immo)`}
              className="transition-all duration-300"
            />
          )}

          {/* Courbes SVG lissées */}
          {cleanPath && (
            <path
              d={cleanPath}
              fill="none"
              stroke="#0284C7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {immoPath && (
            <path
              d={immoPath}
              fill="none"
              stroke="#8E0B3F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Ligne guide verticale (Crosshair) au survol */}
          {activeCoord && (
            <line
              x1={activeCoord.x}
              y1={plotTop}
              x2={activeCoord.x}
              y2={plotBottom}
              stroke="currentColor"
              strokeDasharray="4 4"
              strokeWidth="1.5"
              className="text-muted-foreground/60 transition-all duration-100"
            />
          )}

          {/* Points sur la courbe et zones interactives */}
          {coords.map((c) => {
            const isHovered = hoveredIndex === c.index;
            const showPointDot =
              period !== "30j" ||
              c.point.total > 0 ||
              isHovered;

            return (
              <g key={c.point.key}>
                {/* Point Cleaning */}
                {showClean && showPointDot && (
                  <circle
                    cx={c.x}
                    cy={c.yClean}
                    r={isHovered ? 5 : 3}
                    fill="#0284C7"
                    stroke="currentColor"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="text-card transition-all duration-150"
                  />
                )}

                {/* Point Immobilier */}
                {showImmo && showPointDot && (
                  <circle
                    cx={c.x}
                    cy={c.yImmo}
                    r={isHovered ? 5 : 3}
                    fill="#8E0B3F"
                    stroke="currentColor"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="text-card transition-all duration-150"
                  />
                )}
              </g>
            );
          })}

          {/* Zones invisibles élargies pour capturer le survol de chaque date */}
          {coords.map((c, i) => {
            const step =
              coords.length > 1
                ? plotWidth / (coords.length - 1)
                : plotWidth;
            const captureWidth = Math.max(step, 14);

            return (
              <rect
                key={`hit-${c.point.key}`}
                x={c.x - captureWidth / 2}
                y={plotTop}
                width={captureWidth}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}

          {/* Labels Axe X */}
          {coords.map((c, i) => {
            // Sur 30 jours, afficher 1 label sur 5 pour la lisibilité
            const shouldShowLabel =
              period === "7j" ||
              period === "6m" ||
              i % 5 === 0 ||
              i === coords.length - 1;

            if (!shouldShowLabel) return null;

            const isHovered = hoveredIndex === i;

            return (
              <text
                key={`label-${c.point.key}`}
                x={c.x}
                y={plotBottom + 18}
                textAnchor="middle"
                className={cn(
                  "text-[10px] font-medium transition-colors select-none",
                  isHovered
                    ? "fill-foreground font-semibold"
                    : "fill-muted-foreground",
                )}
              >
                {c.point.label}
              </text>
            );
          })}
        </svg>

        {/* Message informatif si 0 activité sur la période sélectionnée */}
        {periodTotal === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-border/80 bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-xs">
              Aucune demande enregistrée sur cette période
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Calcule un tracé SVG fluide passant par les points via des courbes cubiques de Bézier.
 */
function getSmoothPath(
  pts: { x: number; y: number }[],
  topLimit: number,
  bottomLimit: number,
): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const tension = 0.18;
    const dx1 = (p2.x - p0.x) * tension;
    const dy1 = (p2.y - p0.y) * tension;
    const dx2 = (p3.x - p1.x) * tension;
    const dy2 = (p3.y - p1.y) * tension;

    const cp1x = p1.x + dx1;
    const cp1y = Math.min(bottomLimit, Math.max(topLimit, p1.y + dy1));
    const cp2x = p2.x - dx2;
    const cp2y = Math.min(bottomLimit, Math.max(topLimit, p2.y - dy2));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}
