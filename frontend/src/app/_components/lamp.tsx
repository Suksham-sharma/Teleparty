import Image from "next/image";

/**
 * The lamp on /auth.
 *
 * The page had the join gate's skeleton with half its content — the gate fills
 * its upper half with the room you're walking into (code, live dot, who's
 * already there) and auth had a heading and one paragraph, so two thirds of a
 * desktop viewport was dead. This fills it with the system's own metaphor
 * rather than a decorative graphic, which docs/DESIGN.md §5 rule 6 rules out.
 *
 * `mix-blend-screen` is load-bearing. The source is an opaque rectangle on
 * pure black; under screen, black contributes nothing, so it composites onto
 * `Ambient` with no visible edge instead of punching a hole in it. That is
 * also why the file must stay true black — a #050505 ground would grey the
 * whole rectangle back up.
 */
export function Lamp() {
  return (
    <div
      aria-hidden
      // Pulled up so the cord reads as descending from above the fold rather
      // than beginning in mid-air.
      className="pointer-events-none relative mx-auto -mt-20 w-full max-w-[430px]"
    >
      <Image
        src="/lamp.webp"
        alt=""
        width={1023}
        height={1279}
        priority
        // Already a hand-graded 11.8 KB WebP at exactly the size it renders
        // (430px CSS, 860px at dpr 2). Running it through next/image only
        // makes the optimizer upscale a 1023px source toward w=3840 — larger
        // output, and in dev it blocks the single-threaded optimizer queue.
        unoptimized
        className="h-auto w-full mix-blend-screen"
        style={{
          // Soften the 4:5 crop line so the shelf doesn't end on a hard edge.
          // Kept below the shelf: the cases and reel are the on-message part
          // of the picture and must not be faded out.
          maskImage: "linear-gradient(to bottom, black 93%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 93%, transparent 100%)",
        }}
      />
    </div>
  );
}
