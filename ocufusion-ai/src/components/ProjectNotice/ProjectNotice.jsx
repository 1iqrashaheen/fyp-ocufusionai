import { ANALYSIS_UNAVAILABLE, SOURCE_URL } from "../../project";
import "./ProjectNotice.css";

export default function ProjectNotice() {
  if (!ANALYSIS_UNAVAILABLE) return null;

  return (
    <aside className="project-notice" aria-label="Project availability">
      <div className="project-notice__inner">
        <div>
          <strong>Project preview · AI analysis unavailable</strong>
          <p>
            The trained model checkpoints are not currently available, so the AI
            backend has not been deployed. You can explore the interface and
            reference library. Image analysis will be enabled once the
            checkpoints are available and the backend is deployed.
          </p>
        </div>
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          View source on GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
    </aside>
  );
}
