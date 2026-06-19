import InlineText from './InlineText'

export default function ProjectHeader({
  project,
  updateProjectField,
  methodologies,
  gameCategories,
  deleteProject,
}) {
  if (!project) return null
  return (
    <section className="hero-panel panel">
      <div className="hero-copy">
        <p className="eyebrow">Project view</p>
        <InlineText
          className="hero-title"
          value={project.name}
          onSave={(value) => updateProjectField('name', value)}
        />
        <InlineText
          className="hero-tagline"
          value={project.tagline}
          onSave={(value) => updateProjectField('tagline', value)}
        />
      </div>

      <div className="hero-metadata">
        <label>
          Category
          <select
            value={project.category}
            onChange={(e) => updateProjectField('category', e.target.value)}
          >
            {gameCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Methodology
          <select
            value={project.methodology}
            onChange={(e) => updateProjectField('methodology', e.target.value)}
          >
            {methodologies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Target platform
          <input
            value={project.targetPlatform}
            onChange={(e) => updateProjectField('targetPlatform', e.target.value)}
          />
        </label>

        <label>
          Phase
          <input
            value={project.phase}
            onChange={(e) => updateProjectField('phase', e.target.value)}
          />
        </label>

        <button
          type="button"
          className="danger-btn project-delete-btn"
          onClick={() => deleteProject(project.id)}
        >
          Delete project
        </button>
      </div>
    </section>
  )
}