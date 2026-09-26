import { Activity, Briefcase, HeartPulse, Microscope, Plane, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Icons are Lucide outlines that fill solid blue on group hover. Icons whose
 * outline is built from open strokes (Users, Brain, Stethoscope, Droplets) don't
 * fill cleanly, so they're redrawn below from Lucide's geometry with separate
 * layers: FILL shapes that trace the outline, and DETAIL strokes that turn white
 * so interior lines stay visible once filled.
 */

const FILL = "fill-transparent stroke-none transition-[fill] duration-300 group-hover:fill-current";
const DETAIL = "transition-[stroke] duration-300 group-hover:stroke-white";

function Svg({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function UsersIcon({ className }: { className: string }) {
  return (
    <Svg className={className}>
      <g className={FILL}>
        <circle cx="9" cy="7" r="4" />
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2z" />
        <path d="M16 3.128a4 4 0 0 1 0 7.744z" />
        <path d="M19 15.13a4 4 0 0 1 3 3.87v2h-3z" />
      </g>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
    </Svg>
  );
}

function BrainIcon({ className }: { className: string }) {
  return (
    <Svg className={className}>
      {/* Silhouette: the circles each outline arc is drawn from, plus the core. */}
      <g className={FILL}>
        <circle cx="9" cy="5" r="3" />
        <circle cx="15" cy="5" r="3" />
        <circle cx="7" cy="9" r="4" />
        <circle cx="17" cy="9" r="4" />
        <circle cx="6" cy="14" r="4" />
        <circle cx="18" cy="14" r="4" />
        <circle cx="8" cy="18" r="4" />
        <circle cx="16" cy="18" r="4" />
        <rect x="8" y="5" width="8" height="13" />
      </g>
      <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
      <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
      <path d="M18 18a4 4 0 0 0 2-7.464" />
      <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
      <path d="M6 18a4 4 0 0 1-2-7.464" />
      <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
      <path className={DETAIL} d="M12 18V5" />
      <path className={DETAIL} d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
    </Svg>
  );
}

function StethoscopeIcon({ className }: { className: string }) {
  return (
    <Svg className={className}>
      {/* Tubing is line art, so on hover it thickens rather than fills. */}
      <g className="transition-[stroke-width] duration-300 group-hover:[stroke-width:2.25]">
        <path d="M11 2v2" />
        <path d="M5 2v2" />
        <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 0 0 12 0v-3" />
        <circle
          cx="20"
          cy="10"
          r="2"
          className="fill-transparent transition-[fill] duration-300 group-hover:fill-current"
        />
      </g>
    </Svg>
  );
}

function DropletsIcon({ className }: { className: string }) {
  const small =
    "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z";
  const large =
    "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97";
  return (
    <Svg className={className}>
      <g className={FILL}>
        {/* The large drop is only visible to the right of the small one; close it along that edge. */}
        <path d={`${large}C10.9 18.6 12.6 16.4 12.6 13.2C12.6 11 12.3 8.8 12.56 6.6z`} />
        <path d={small} />
      </g>
      <path d={small} />
      <path d={large} />
    </Svg>
  );
}

type IconComponent = LucideIcon | ((props: { className: string }) => ReactNode);

const ICONS: Record<string, { Icon: IconComponent; custom?: boolean }> = {
  activity: { Icon: Activity },
  brain: { Icon: BrainIcon, custom: true },
  briefcase: { Icon: Briefcase },
  droplets: { Icon: DropletsIcon, custom: true },
  "heart-pulse": { Icon: HeartPulse },
  microscope: { Icon: Microscope },
  plane: { Icon: Plane },
  stethoscope: { Icon: StethoscopeIcon, custom: true },
  users: { Icon: UsersIcon, custom: true },
};

const SIZES = {
  sm: "h-7 w-7",
  lg: "h-10 w-10",
} as const;

/** Thin-line service icon; its shape fills blue on group hover. */
export function ServiceIcon({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { Icon, custom } = ICONS[name] ?? ICONS["stethoscope"]!;
  const classes = cn("shrink-0 text-blue", SIZES[size], className);
  if (custom) return <Icon className={classes} />;
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.5}
      className={cn(
        classes,
        "fill-transparent transition-[fill] duration-300 group-hover:fill-blue",
      )}
    />
  );
}
