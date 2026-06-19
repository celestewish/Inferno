import { useEffect, useMemo, useState } from 'react'
import './App.css'
import ProjectSidebar from './components/ProjectSidebar'
import ProjectHeader from './components/ProjectHeader'
import TaskBoard from './components/TaskBoard'
import DetailsPanel from './components/DetailsPanel'
import TaskModal from './components/TaskModal'
import {
  columns,
  createActivity,
  defaultProjects,
  defaultTasks,
  defaultTeamMembers,
  defaultTheme,
  disciplines,
  gameCategories,
  labelPool,
  methodologies,
  priorities
} from './data/defaultData'

const STORAGE_KEYS = {
  tasks: 'gdtb_tasks_v3',
  team: 'gdtb_team_v3',
  theme: 'gdtb_theme_v3',
  projects: 'gdtb_projects_v3',
}

const emptyTaskForm = {
  title: '',
  description: '',
  discipline: 'Programming',
  priority: 'Medium',
  assignee: 'Unassigned',
  sprint: 'Next Sprint',
  estimate: '1 pt',
  due: '',
}

const emptyProjectForm = {
  name: '',
  tagline: '',
  category: 'Educational',
  methodology: 'Agile Sprint',
}

const safeLoad = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const clampAssignee = (assignee, teamMembers) => (teamMembers.includes(assignee) ? assignee : 'Unassigned')

function App() {
  const [tasks, setTasks] = useState(() => safeLoad(STORAGE_KEYS.tasks, defaultTasks))
  const [projects, setProjects] = useState(() => safeLoad(STORAGE_KEYS.projects, defaultProjects))
  const [teamMembers, setTeamMembers] = useState(() => safeLoad(STORAGE_KEYS.team, defaultTeamMembers))
  const [theme, setTheme] = useState(() => safeLoad(STORAGE_KEYS.theme, defaultTheme))
  const [currentProjectId, setCurrentProjectId] = useState(() => safeLoad(STORAGE_KEYS.projects, defaultProjects)[0]?.id ?? defaultProjects[0].id)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [newTask, setNewTask] = useState(emptyTaskForm)
  const [editingTask, setEditingTask] = useState(null)
  const [newMember, setNewMember] = useState('')
  const [newProject, setNewProject] = useState(emptyProjectForm)

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects)) }, [projects])
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.team, JSON.stringify(teamMembers)) }, [teamMembers])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme))
    Object.entries({
      '--accent': theme.accent,
      '--accent-secondary': theme.accentSecondary,
      '--surface-custom': theme.surface,
      '--background-custom': theme.background,
    }).forEach(([key, value]) => document.documentElement.style.setProperty(key, value))
  }, [theme])

  const currentProject = projects.find((project) => project.id === currentProjectId) || projects[0]

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const projectMatch = task.projectId === currentProject.id
      const disciplineMatch = filter === 'All' || task.discipline === filter
      const searchMatch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase()) ||
        task.assignee.toLowerCase().includes(search.toLowerCase())
      return projectMatch && disciplineMatch && searchMatch
    })
  }, [tasks, currentProject, filter, search])

  const stats = useMemo(() => ({
    done: tasks.filter((task) => task.completed).length,
    inFlight: tasks.filter((task) => ['inprogress', 'review'].includes(task.status) && !task.completed).length,
    projects: projects.length,
  }), [tasks, projects])

  const logProjectActivity = (projectId, type, text) => {
    setProjects((current) => current.map((project) => project.id === projectId ? { ...project, activity: [createActivity(type, text), ...(project.activity || [])] } : project))
  }

  const updateTask = (taskId, updates) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task
        const nextTask = { ...task, ...updates }
        if (nextTask.completed) nextTask.status = 'done'
        if (!nextTask.completed && nextTask.status === 'done') nextTask.status = 'todo'
        nextTask.activity = [createActivity('update', 'Updated task details.'), ...(nextTask.activity || [])]
        return nextTask
      }),
    )
  }

  const deleteTask = (taskId) => {
    const removed = tasks.find((task) => task.id === taskId)
    setTasks((current) => current.filter((task) => task.id !== taskId))
    if (removed) logProjectActivity(removed.projectId, 'delete', `Deleted task ${removed.title}.`)
    setEditingTask((current) => (current?.id === taskId ? null : current))
  }

  const moveTask = (taskId, nextStatus) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: nextStatus,
              completed: nextStatus === 'done',
              activity: [createActivity('status', `Moved task to ${nextStatus}.`), ...(task.activity || [])],
            }
          : task,
      ),
    )
  }

  const shiftTask = (taskId, direction) => {
    setTasks((current) => {
      const task = current.find((item) => item.id === taskId)
      if (!task) return current
      const sameProject = current.filter((item) => item.projectId === task.projectId)
      const siblings = sameProject.filter((item) => item.status === task.status)
      const index = siblings.findIndex((item) => item.id === taskId)
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= siblings.length) return current
      const reordered = [...siblings]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)
      const otherProjectTasks = current.filter((item) => item.projectId !== task.projectId)
      const sameProjectWithoutColumn = sameProject.filter((item) => item.status !== task.status)
      return [...otherProjectTasks, ...sameProjectWithoutColumn, ...reordered]
    })
  }

  const handleCreateTask = (event) => {
    event.preventDefault()
    if (!newTask.title.trim()) return
    const task = {
      id: crypto.randomUUID(),
      projectId: currentProject.id,
      title: newTask.title.trim(),
      description: newTask.description.trim() || 'New production task ready for breakdown.',
      status: 'backlog',
      priority: newTask.priority,
      discipline: newTask.discipline,
      assignee: clampAssignee(newTask.assignee, teamMembers),
      sprint: newTask.sprint.trim() || currentProject.phase,
      estimate: newTask.estimate.trim() || '1 pt',
      due: newTask.due.trim() || 'TBD',
      completed: false,
      labels: currentProject.labels?.slice(0, 2) || [],
      subtasks: [],
      activity: [createActivity('task', 'Task created and added to backlog.')],
    }
    setTasks((current) => [task, ...current])
    logProjectActivity(currentProject.id, 'task', `Created task ${task.title}.`)
    setNewTask(emptyTaskForm)
  }

  const toggleComplete = (task) => {
    updateTask(task.id, {
      completed: !task.completed,
      status: task.completed ? 'todo' : 'done',
      activity: [createActivity('complete', task.completed ? 'Reopened task.' : 'Marked task complete.'), ...(task.activity || [])],
    })
  }

  const handleEditSave = (event) => {
    event.preventDefault()
    if (!editingTask?.title.trim()) return
    updateTask(editingTask.id, {
      ...editingTask,
      assignee: clampAssignee(editingTask.assignee, teamMembers),
      title: editingTask.title.trim(),
      description: editingTask.description.trim(),
      sprint: editingTask.sprint.trim() || currentProject.phase,
      estimate: editingTask.estimate.trim() || '1 pt',
      due: editingTask.due.trim() || 'TBD',
    })
    setEditingTask(null)
  }

  const addSubtaskToEditing = () => {
    setEditingTask((current) => ({
      ...current,
      subtasks: [...(current.subtasks || []), { id: crypto.randomUUID(), title: `New subtask ${current.subtasks.length + 1}`, done: false }],
    }))
  }

  const addTeamMember = (event) => {
    event.preventDefault()
    const member = newMember.trim()
    if (!member || teamMembers.includes(member)) return
    setTeamMembers((current) => [...current.filter((item) => item !== 'Unassigned'), member, 'Unassigned'])
    setNewMember('')
  }

  const removeTeamMember = (member) => {
    if (member === 'Unassigned') return
    setTeamMembers((current) => current.filter((item) => item !== member))
    setTasks((current) => current.map((task) => ({ ...task, assignee: task.assignee === member ? 'Unassigned' : task.assignee })))
  }

const createProject = (event) => {
  event.preventDefault()
  if (!newProject.name.trim()) return

  const project = {
    id: crypto.randomUUID(),
    name: newProject.name.trim(),
    tagline: newProject.tagline.trim() || 'New game project ready for planning.',
    category: newProject.category,
    methodology: newProject.methodology,
    targetPlatform: 'PC',
    phase: 'Pre-production',
    pillars: ['Clear fantasy', 'Scoped systems', 'Playtest-driven iteration'],
    labels: ['UI', 'Playtest'],
    activity: [createActivity('project', `Created project ${newProject.name.trim()}.`)],
  }

  setProjects((current) => [project, ...current])
  setCurrentProjectId(project.id)
  setNewProject(emptyProjectForm)
}

const deleteProject = (projectId) => {
  const project = projects.find((item) => item.id === projectId)

  if (!project || projects.length <= 1) return

  const confirmed = window.confirm(
    `Delete project "${project.name}" and all of its tasks?`
  )

  if (!confirmed) return

  const remainingProjects = projects.filter((item) => item.id !== projectId)

  setProjects(remainingProjects)
  setTasks((current) => current.filter((task) => task.projectId !== projectId))

  if (currentProjectId === projectId) {
    setCurrentProjectId(remainingProjects[0].id)
  }
}

  const updateProjectField = (field, value) => {
    setProjects((current) => current.map((project) => project.id === currentProject.id ? { ...project, [field]: value } : project))
    logProjectActivity(currentProject.id, 'settings', `Updated project ${field}.`)
  }

  return (
    <>
      <div className="app-shell">
        <ProjectSidebar
          stats={stats}
          project={currentProject}
          projects={projects}
          setCurrentProjectId={setCurrentProjectId}
          newProject={newProject}
          setNewProject={setNewProject}
          createProject={createProject}
          teamMembers={teamMembers}
          newMember={newMember}
          setNewMember={setNewMember}
          addTeamMember={addTeamMember}
          removeTeamMember={removeTeamMember}
          theme={theme}
          setTheme={setTheme}
          methodologies={methodologies}
          gameCategories={gameCategories}
          deleteProject={deleteProject}
        />

        <main className="board-area">
          <ProjectHeader
            project={currentProject}
            updateProjectField={updateProjectField}
            methodologies={methodologies}
            gameCategories={gameCategories}
            deleteProject={deleteProject}
          />

          <section className="toolbar panel">
            <form className="toolbar-group" onSubmit={handleCreateTask}>
              <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or assignees" />
              <div className="filter-chips">
                {['All', ...disciplines].map((item) => (
                  <button key={item} className={filter === item ? 'chip active' : 'chip'} onClick={() => setFilter(item)} type="button">{item}</button>
                ))}
              </div>
              <div className="quick-create-grid">
                <input value={newTask.title} onChange={(e) => setNewTask((c) => ({ ...c, title: e.target.value }))} placeholder="Add a new feature or task" />
                <select value={newTask.assignee} onChange={(e) => setNewTask((c) => ({ ...c, assignee: e.target.value }))}>{teamMembers.map((member) => <option key={member}>{member}</option>)}</select>
                <select value={newTask.discipline} onChange={(e) => setNewTask((c) => ({ ...c, discipline: e.target.value }))}>{disciplines.map((item) => <option key={item}>{item}</option>)}</select>
                <button type="submit" className="primary-btn">Create task</button>
              </div>
            </form>
          </section>

          <DetailsPanel project={currentProject} tasks={tasks} labelPool={labelPool} />

          <TaskBoard
            columns={columns}
            tasks={filteredTasks}
            teamMembers={teamMembers}
            updateTask={updateTask}
            toggleComplete={toggleComplete}
            deleteTask={deleteTask}
            shiftTask={shiftTask}
            setEditingTask={setEditingTask}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            moveTask={moveTask}
          />
        </main>
      </div>

      <TaskModal
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        handleEditSave={handleEditSave}
        teamMembers={teamMembers}
        columns={columns}
        disciplines={disciplines}
        priorities={priorities}
        labelPool={labelPool}
        deleteTask={deleteTask}
        addSubtaskToEditing={addSubtaskToEditing}
      />
    </>
  )
}

export default App
