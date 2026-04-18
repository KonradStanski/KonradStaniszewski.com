import React, { useMemo, useState } from "react";
import * as d3 from "d3";
import { useTheme } from "next-themes";
import quizData from "@/data/politicalQuiz.json";
import { cx } from "@/lib/utils";

type Axis = {
  id: string;
  label: string;
  poleA: string;
  poleB: string;
  description: string;
};

type Question = {
  id: string;
  axis: string;
  direction: number;
  text: string;
};

type AxisScore = {
  axis: Axis;
  score: number;
  leaningPole: "A" | "B" | "neutral";
};

const OPTIONS: { value: number; label: string; short: string }[] = [
  { value: -2, label: "Strongly disagree", short: "SD" },
  { value: -1, label: "Mildly disagree", short: "MD" },
  { value: 0, label: "Neutral", short: "N" },
  { value: 1, label: "Mildly agree", short: "MA" },
  { value: 2, label: "Strongly agree", short: "SA" },
];

const POLE_A_COLOR = "#0ea5e9"; // sky-500
const POLE_B_COLOR = "#f59e0b"; // amber-500

export default function PoliticalQuiz() {
  const axes = quizData.axes as Axis[];
  const questions = quizData.questions as Question[];

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const scores: AxisScore[] = useMemo(() => {
    return axes.map((axis) => {
      const axisQs = questions.filter((q) => q.axis === axis.id);
      const denom = 2 * axisQs.length;
      const raw = axisQs.reduce(
        (acc, q) => acc + (answers[q.id] ?? 0) * q.direction,
        0
      );
      const score = denom ? raw / denom : 0;
      const leaningPole =
        score > 0.05 ? "A" : score < -0.05 ? "B" : "neutral";
      return { axis, score, leaningPole };
    });
  }, [axes, questions, answers]);

  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined
  ).length;
  const allAnswered = answeredCount === questions.length;

  const handleSelect = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!allAnswered) return;
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <div className="space-y-8">
        <ResultsChart scores={scores} />
        <ScoresTable scores={scores} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleReset}
            className="border-2 rounded-md border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {answeredCount} / {questions.length} answered
          </p>
          <div className="w-1/2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{
                width: `${(answeredCount / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <ol className="space-y-4">
        {questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            index={i + 1}
            question={q}
            value={answers[q.id]}
            onSelect={(v) => handleSelect(q.id, v)}
          />
        ))}
      </ol>

      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={!allAnswered}
          className={cx(
            "border-2 rounded-md px-6 py-3 font-semibold transition",
            allAnswered
              ? "border-sky-500 text-white bg-sky-500 hover:bg-sky-600"
              : "border-gray-300 dark:border-gray-600 text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
          )}
        >
          {allAnswered
            ? "Calculate my alignment"
            : `Answer all ${questions.length} questions to submit`}
        </button>
      </div>
    </form>
  );
}

const QuestionRow: React.FC<{
  index: number;
  question: Question;
  value: number | undefined;
  onSelect: (v: number) => void;
}> = ({ index, question, value, onSelect }) => {
  return (
    <li className="p-4 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
      <p className="mb-3">
        <span className="text-gray-500 dark:text-gray-400 mr-2">{index}.</span>
        {question.text}
      </p>
      <div className="grid grid-cols-5 gap-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cx(
                "flex flex-col items-center justify-center text-center cursor-pointer rounded-md border py-2 px-1 text-xs transition",
                selected
                  ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "border-gray-300 dark:border-gray-600 hover:border-sky-400"
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={selected}
                onChange={() => onSelect(opt.value)}
                className="sr-only"
              />
              <span className="font-semibold sm:hidden">{opt.short}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </li>
  );
};

const ResultsChart: React.FC<{ scores: AxisScore[] }> = ({ scores }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const size = 860;
  const centerX = size / 2;
  const centerY = size / 2;
  const innerR = 65;
  const zeroR = 170;
  const outerR = 255;
  const labelR = outerR + 26;
  const labelFontSize = 14;
  const labelLineHeight = 16;

  const N = scores.length;
  const anglePer = (2 * Math.PI) / N;
  const padRatio = 0.12;
  const padAngle = anglePer * padRatio;

  const arcBuilder = d3.arc<{
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
  }>();

  const gridColor = isDark ? "#374151" : "#e5e7eb"; // gray-700 / gray-200
  const zeroColor = isDark ? "#6b7280" : "#9ca3af"; // gray-500 / gray-400
  const textColor = isDark ? "#e5e7eb" : "#1f2937"; // gray-200 / gray-800
  const mutedTextColor = isDark ? "#9ca3af" : "#6b7280";

  const gridCircles = [0.5, 1.0].flatMap((t) => [
    zeroR + t * (outerR - zeroR),
    zeroR - t * (zeroR - innerR),
  ]);

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[780px] h-auto"
        role="img"
        aria-label="Political alignment circular bar plot"
      >
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Outer boundary */}
          <circle
            r={outerR}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
          {/* Inner boundary */}
          <circle
            r={innerR}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
          {/* Grid circles */}
          {gridCircles.map((r, i) => (
            <circle
              key={i}
              r={r}
              fill="none"
              stroke={gridColor}
              strokeWidth={0.5}
              strokeDasharray="2 3"
            />
          ))}
          {/* Zero baseline */}
          <circle
            r={zeroR}
            fill="none"
            stroke={zeroColor}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          {/* Radial separators */}
          {scores.map((_, i) => {
            const a = i * anglePer;
            const x1 = Math.sin(a) * innerR;
            const y1 = -Math.cos(a) * innerR;
            const x2 = Math.sin(a) * outerR;
            const y2 = -Math.cos(a) * outerR;
            return (
              <line
                key={`sep-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={gridColor}
                strokeWidth={0.5}
              />
            );
          })}

          {/* Bars */}
          {scores.map((s, i) => {
            const startAngle = i * anglePer + padAngle / 2;
            const endAngle = (i + 1) * anglePer - padAngle / 2;
            const clamped = Math.max(-1, Math.min(1, s.score));
            const isPos = clamped >= 0;
            const innerRadius = isPos
              ? zeroR
              : zeroR + clamped * (zeroR - innerR);
            const outerRadius = isPos
              ? zeroR + clamped * (outerR - zeroR)
              : zeroR;
            const d =
              arcBuilder({ startAngle, endAngle, innerRadius, outerRadius }) ||
              "";
            const fill =
              s.leaningPole === "neutral"
                ? mutedTextColor
                : isPos
                ? POLE_A_COLOR
                : POLE_B_COLOR;
            return (
              <path
                key={`bar-${s.axis.id}`}
                d={d}
                fill={fill}
                fillOpacity={0.85}
                stroke={fill}
                strokeWidth={0.5}
              >
                <title>
                  {`${s.axis.label}: ${s.score.toFixed(2)} — leaning ${
                    s.leaningPole === "A"
                      ? s.axis.poleA
                      : s.leaningPole === "B"
                      ? s.axis.poleB
                      : "neutral"
                  }`}
                </title>
              </path>
            );
          })}

          {/* Axis labels */}
          {scores.map((s, i) => {
            const mid = (i + 0.5) * anglePer;
            const lx = Math.sin(mid) * labelR;
            const ly = -Math.cos(mid) * labelR;
            const anchor =
              Math.abs(Math.sin(mid)) < 0.05
                ? "middle"
                : Math.sin(mid) > 0
                ? "start"
                : "end";
            const words = s.axis.label.split(" ");
            const nLines = words.length;
            const firstDy = -((nLines - 1) * labelLineHeight) / 2;
            return (
              <text
                key={`lbl-${s.axis.id}`}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={labelFontSize}
                fontWeight={600}
                fill={textColor}
              >
                {words.map((word, wi) => (
                  <tspan
                    key={wi}
                    x={lx}
                    dy={wi === 0 ? firstDy : labelLineHeight}
                  >
                    {word}
                  </tspan>
                ))}
              </text>
            );
          })}

          {/* Center legend */}
          <text
            x={0}
            y={-8}
            textAnchor="middle"
            fontSize={11}
            fill={mutedTextColor}
          >
            outward → pole A
          </text>
          <text
            x={0}
            y={8}
            textAnchor="middle"
            fontSize={11}
            fill={mutedTextColor}
          >
            inward → pole B
          </text>
        </g>
      </svg>

      <div className="flex gap-6 text-sm mt-2 text-gray-700 dark:text-gray-300">
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: POLE_A_COLOR }}
          />
          Pole A (outward)
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: POLE_B_COLOR }}
          />
          Pole B (inward)
        </span>
      </div>
    </div>
  );
};

const ScoresTable: React.FC<{ scores: AxisScore[] }> = ({ scores }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-300 dark:border-gray-600">
            <th className="py-2 pr-4">Axis</th>
            <th className="py-2 pr-4">Leaning</th>
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Description</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => {
            const pct = Math.round(Math.abs(s.score) * 100);
            const leaningLabel =
              s.leaningPole === "A"
                ? s.axis.poleA
                : s.leaningPole === "B"
                ? s.axis.poleB
                : "neutral";
            const color =
              s.leaningPole === "A"
                ? POLE_A_COLOR
                : s.leaningPole === "B"
                ? POLE_B_COLOR
                : undefined;
            return (
              <tr
                key={s.axis.id}
                className="border-b border-gray-200 dark:border-gray-700 align-top"
              >
                <td className="py-2 pr-4 font-semibold">{s.axis.label}</td>
                <td className="py-2 pr-4">
                  <span style={{ color }}>{leaningLabel}</span>
                  {s.leaningPole !== "neutral" && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      ({pct}%)
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 tabular-nums">
                  {s.score.toFixed(2)}
                </td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                  <span className="block">
                    <span style={{ color: POLE_A_COLOR }}>{s.axis.poleA}</span>
                    {" ↔ "}
                    <span style={{ color: POLE_B_COLOR }}>{s.axis.poleB}</span>
                  </span>
                  <span className="block mt-1">{s.axis.description}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
