import { Questionnaire } from "@/components/questionnaire/Questionnaire";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-24 pb-16 sm:justify-center sm:py-24">
      <Questionnaire />
    </main>
  );
}
