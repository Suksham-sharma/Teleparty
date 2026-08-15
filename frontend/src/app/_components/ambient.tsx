import Image from "next/image";

/**
 * A dark room with a film running somewhere in it.
 *
 * Used behind the join gate and auth so those screens read as a doorway into
 * the product rather than a form on a slab. The plate is pushed well down so
 * nothing on top of it drops below the contrast floor (docs/DESIGN.md §5).
 */
export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Image
        src="/still.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        // Blurred and biased left: atmosphere behind the type, not a picture
        // competing with it, and the window's highlight stays off the form.
        className="scale-110 object-cover object-[28%_50%] opacity-[0.22] blur-[3px]"
      />
      {/* Pull the centre down hard so text sits on near-black, not on the frame. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 58% at 50% 46%, rgba(0,0,0,.94) 0%, rgba(0,0,0,.82) 45%, rgba(0,0,0,.62) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
    </div>
  );
}
