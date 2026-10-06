/** Shown for a chart cast without a birth time (a solar chart): house-based detail is left out. */
export function UnknownTimeNote() {
  return (
    <p className="border-t border-hairline pt-6 text-lg text-muted text-pretty">
      Without your birth time, this is drawn from the day you were born, not the hour. Most of what
      it says about who you are holds. Where in your life it plays out, we&apos;ve left out rather
      than guess. If you can find the time (it&apos;s often on the birth certificate), change your
      answers.
    </p>
  );
}
