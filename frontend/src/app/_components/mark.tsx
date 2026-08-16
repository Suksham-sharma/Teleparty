/**
 * The watchparty mark — an aperture with one blade lit.
 *
 * A hairline hexagonal body with the opening left empty, and the single blade
 * that would have been cut out of it filled with the accent. The wedge's apex
 * sits exactly on centre, so the eye still finds a middle even though nothing
 * is drawn there.
 *
 * The three tiers are optical corrections, not a scale. A 1.7px hairline at
 * 16px disappears on black, so the small variants thicken *and lighten* the
 * body and open the wedge slightly rather than scaling the large one down.
 * These greys are deliberately not palette tokens — they exist only to keep
 * one shape legible across sizes. See docs/DESIGN.md §6.
 */

type Tier = {
  body: string;
  width: number;
  hex: string;
  wedge: string;
};

const LARGE: Tier = {
  body: "#3D3D3D", // hair-strong
  width: 1.7,
  hex: "16,3 27.26,9.5 27.26,22.5 16,29 4.74,22.5 4.74,9.5",
  wedge: "16,16 16,7 23.79,11.5",
};

const MEDIUM: Tier = {
  body: "#565656",
  width: 2.4,
  hex: "16,3 27.26,9.5 27.26,22.5 16,29 4.74,22.5 4.74,9.5",
  wedge: "16,16 16,6.8 23.95,11.4",
};

const SMALL: Tier = {
  body: "#6B6B6B",
  width: 3,
  // Inset so the thicker stroke still sits inside the box.
  hex: "16,3.5 26.8,9.75 26.8,22.25 16,28.5 5.2,22.25 5.2,9.75",
  wedge: "16,16.4 16,6.6 24.2,11.3",
};

const tierFor = (size: number) =>
  size >= 32 ? LARGE : size >= 20 ? MEDIUM : SMALL;

export function Mark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const t = tierFor(size);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <polygon
        points={t.hex}
        stroke={t.body}
        strokeWidth={t.width}
        strokeLinejoin="round"
      />
      <polygon points={t.wedge} fill="hsl(var(--butter))" />
    </svg>
  );
}
