import type { NextPage } from "next";
import { Page } from "@/components/Page";
import { cx } from "@/lib/utils";

interface Project {
  title: string;
  description: string;
  liveUrl?: string;
  githubUrl?: string;
}

const projects: Project[] = [
  {
    title: "UofA GPA Calculator",
    description: "Calculate your University of Alberta GPA from your transcript with interactive charts",
    liveUrl: "/projects/gpa-calculator",
    githubUrl: "https://github.com/KonradStanski/KonradStaniszewski.com/tree/master/components/gpaCalculator",
  },
  {
    title: "ANET RSU ACB Calculator",
    description: "Calculate the adjusted cost base for Arista Networks RSU grants with automatic exchange rate lookups",
    liveUrl: "/anet-acb",
    githubUrl: "https://github.com/KonradStanski/KonradStaniszewski.com/tree/master/pages/anet-acb",
  },
  {
    title: "Political Alignment Quiz",
    description: "A personality-flavoured political quiz scored across ten axes and rendered as a d3 circular bar plot instead of a 2D compass",
    liveUrl: "/projects/political-alignment",
    githubUrl: "https://github.com/KonradStanski/KonradStaniszewski.com/tree/master/components/PoliticalQuiz.tsx",
  },
  {
    title: "Giduru",
    description: "",
    liveUrl: "https://app.giduru.com",
  },
  {
    title: "ASCII Diagram",
    description: "",
    liveUrl: "https://app.asciidiagram.com",
  },
];

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <div
      className={cx(
        "p-6 border rounded-lg",
        "border-gray-300 dark:border-gray-600",
        "bg-white dark:bg-gray-800"
      )}
    >
      <h3 className="text-xl font-bold text-sky-600 dark:text-sky-400">
        {project.title}
      </h3>
      <p className="mt-2 text-gray-700 dark:text-gray-300">
        {project.description}
      </p>
      <div className="mt-4 flex gap-3">
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1 rounded border border-sky-500 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition"
          >
            Live Demo
          </a>
        )}
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1 rounded border border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            GitHub
          </a>
        )}
      </div>
    </div>
  );
};

const Projects: NextPage = () => {
  return (
    <Page
      title="Projects"
      description="Things I've built"
    >
      <div className="space-y-6">
        {projects.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2">
            {projects.map((project, index) => (
              <ProjectCard key={index} project={project} />
            ))}
          </section>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            Projects coming soon.
          </p>
        )}
      </div>
    </Page>
  );
};

export default Projects;
