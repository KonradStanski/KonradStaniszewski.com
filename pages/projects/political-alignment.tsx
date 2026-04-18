import type { NextPage } from "next";
import dynamic from "next/dynamic";
import { Page } from "@/components/Page";
import quizData from "@/data/politicalQuiz.json";

const PoliticalQuiz = dynamic(() => import("@/components/PoliticalQuiz"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
      </div>
    </div>
  ),
});

const PoliticalAlignmentPage: NextPage = () => {
  const axes = quizData.axes;
  const totalQuestions = quizData.questions.length;

  return (
    <Page
      title="Political Alignment Quiz"
      description="A personality-flavoured political quiz that scores you on ten axes and plots the result as a circular bar chart instead of a 2D compass."
    >
      <div className="space-y-6">
        <section className="text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            Traditional political tests collapse belief into two or three broad
            buckets (economic, social, cultural). This one tries something
            different: ten narrower axes drawn more from personality and
            epistemology than partisanship — time preference, sovereignty
            scope, resource metaphysics, risk epistemology, and so on.
          </p>
          <p>
            Answer each statement honestly. Your result is rendered as a
            circular bar plot: each slice is one axis, bars extending outward
            lean toward pole A, bars extending inward lean toward pole B.
          </p>
        </section>

        <section>
          <details className="group border border-gray-300 dark:border-gray-600 rounded-lg">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg list-none flex items-center justify-between">
              <span>What each axis measures ({axes.length} axes)</span>
              <span className="text-gray-400 group-open:rotate-90 transition-transform">
                ▶
              </span>
            </summary>
            <dl className="px-4 pb-4 space-y-4 text-sm">
              {axes.map((axis) => (
                <div key={axis.id}>
                  <dt className="font-semibold text-gray-900 dark:text-gray-100">
                    {axis.label}
                    <span className="ml-2 font-normal text-xs text-gray-500 dark:text-gray-400">
                      {axis.poleA} ↔ {axis.poleB}
                    </span>
                  </dt>
                  <dd className="mt-1 text-gray-700 dark:text-gray-300">
                    {axis.description}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <section>
          <PoliticalQuiz />
        </section>

        <section className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
          This is an initial draft with {totalQuestions} statements across{" "}
          {axes.length} axes — scoring is illustrative and not psychometrically
          validated.
        </section>
      </div>
    </Page>
  );
};

export default PoliticalAlignmentPage;
