import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'
import AuthGate from './components/AuthGate'
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
  priorities,
} from './data/defaultData'

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

const clampAssignee = (assignee, teamMembers) =>
  teamMembers.includes(assignee) ? assignee : 'Unassigned'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState(defaultTeamMembers)
  const [theme, setTheme] = useState(defaultTheme)
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [newTask, setNewTask] = useState(emptyTaskForm)
  const [editingTask, setEditingTask] = useState(null)
  const [newMember, setNewMember] = useState('')
  const [newProject, setNewProject] = useState(emptyProjectForm)

  // ── Auth listener ──
useEffect(() => {
  // Check for existing session on mount
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    if (session) {
      loadAllData(session.user.id)
    } else {
      setLoading(false) // No session — show login
    }
  })

  // Listen for sign in / sign out events
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    setSession(session)
    if (event === 'SIGNED_IN' && session) {
      loadAllData(session.user.id)
    } else if (event === 'SIGNED_OUT') {
      setProjects([])
      setTasks([])
      setTeamMembers(defaultTeamMembers)
      setCurrentProjectId(null)
      setLoading(false) // ← this is the critical line that was missing
    }
  })

  return () => subscription.unsubscribe()
}, [])

  // ── Theme CSS vars ──
  useEffect(() => {
    Object.entries({
      '--accent': theme.accent,
      '--accent-secondary': theme.accentSecondary,
      '--surface-custom': theme.surface,
      '--background-custom': theme.background,
    }).forEach(([key, value]) => document.documentElement.style.setProperty(key, value))
  }, [theme])

  // ── Load everything from Supabase ──
  const loadAllData = async (userId) => {
    setLoading(true)

    const [{ data: projectData }, { data: taskData }, { data: memberData }] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('tasks').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('team_members').select('*').eq('user_id', userId),
    ])

    const loadedProjects = projectData?.length ? projectData.map(dbToProject) : []
    const loadedTasks = taskData?.length ? taskData.map(dbToTask) : []
    const loadedMembers = memberData?.length
      ? memberData.map((m) => m.name)
      : defaultTeamMembers

    // Seed defaults for new users
    if (!projectData?.length) {
      await seedDefaults(userId)
      const [{ data: p }, { data: t }, { data: m }] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('tasks').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('team_members').select('*').eq('user_id', userId),
      ])
      setProjects(p?.map(dbToProject) ?? [])
      setTasks(t?.map(dbToTask) ?? [])
      setTeamMembers(m?.map((item) => item.name) ?? defaultTeamMembers)
      setCurrentProjectId(p?.[0]?.id ?? null)
    } else {
      setProjects(loadedProjects)
      setTasks(loadedTasks)
      setTeamMembers(loadedMembers)
      setCurrentProjectId(loadedProjects[0]?.id ?? null)
    }

    setLoading(false)
  }

  // ── Seed default data for new accounts ──
const seedDefaults = async (userId) => {
  // Insert projects first, let Supabase generate the IDs
  const projectInserts = defaultProjects.map((p) => ({
    user_id: userId,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    methodology: p.methodology,
    target_platform: p.targetPlatform,
    phase: p.phase,
    pillars: p.pillars ?? [],
    labels: p.labels ?? [],
    activity: p.activity ?? [],
  }))

  const { data: insertedProjects, error: projectError } = await supabase
    .from('projects')
    .insert(projectInserts)
    .select()

  if (projectError) {
    console.error('Project seed error:', projectError)
    return
  }

  // Map old default IDs to the new Supabase-generated IDs
  const idMap = {}
  defaultProjects.forEach((p, i) => {
    if (insertedProjects[i]) idMap[p.id] = insertedProjects[i].id
  })

  // Insert tasks using the new project IDs
  const taskInserts = defaultTasks.map((t, i) => ({
    user_id: userId,
    project_id: idMap[t.projectId] ?? insertedProjects[0].id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    discipline: t.discipline,
    assignee: t.assignee,
    sprint: t.sprint,
    estimate: t.estimate,
    due: t.due,
    completed: t.completed,
    labels: t.labels ?? [],
    subtasks: t.subtasks ?? [],
    activity: t.activity ?? [],
    sort_order: i,
  }))

  const { error: taskError } = await supabase.from('tasks').insert(taskInserts)
  if (taskError) console.error('Task seed error:', taskError)

  const memberInserts = defaultTeamMembers.map((name) => ({ user_id: userId, name }))
  const { error: memberError } = await supabase.from('team_members').insert(memberInserts)
  if (memberError) console.error('Member seed error:', memberError)
}

  // ── Shape converters ──
  const dbToProject = (row) => ({
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    category: row.category,
    methodology: row.methodology,
    targetPlatform: row.target_platform,
    phase: row.phase,
    pillars: row.pillars ?? [],
    labels: row.labels ?? [],
    activity: row.activity ?? [],
  })

  const dbToTask = (row) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    discipline: row.discipline,
    assignee: row.assignee,
    sprint: row.sprint,
    estimate: row.estimate,
    due: row.due,
    completed: row.completed,
    labels: row.labels ?? [],
    subtasks: row.subtasks ?? [],
    activity: row.activity ?? [],
  })

  const projectToDb = (p, userId) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    methodology: p.methodology,
    target_platform: p.targetPlatform,
    phase: p.phase,
    pillars: p.pillars ?? [],
    labels: p.labels ?? [],
    activity: p.activity ?? [],
  })

  const taskToDb = (t, userId, order = 0) => ({
    id: t.id,
    user_id: userId,
    project_id: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    discipline: t.discipline,
    assignee: t.assignee,
    sprint: t.sprint,
    estimate: t.estimate,
    due: t.due,
    completed: t.completed,
    labels: t.labels ?? [],
    subtasks: t.subtasks ?? [],
    activity: t.activity ?? [],
    sort_order: order,
  })

  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0]
  const userId = session?.user?.id

  // ── Filtered tasks ──
  const filteredTasks = useMemo(() => {
    if (!currentProject) return []
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
    done: tasks.filter((t) => t.completed).length,
    inFlight: tasks.filter((t) => ['inprogress', 'review'].includes(t.status) && !t.completed).length,
    projects: projects.length,
  }), [tasks, projects])

  // ── Project actions ──
  const logProjectActivity = (projectId, type, text) => {
    setProjects((current) =>
      current.map((p) => p.id === projectId
        ? { ...p, activity: [createActivity(type, text), ...(p.activity || [])] }
        : p
      )
    )
  }

  const updateProjectField = (field, value) => {
    setProjects((current) =>
      current.map((p) => p.id === currentProject.id ? { ...p, [field]: value } : p)
    )
    logProjectActivity(currentProject.id, 'settings', `Updated project ${field}.`)
    supabase.from('projects').update({ [field === 'targetPlatform' ? 'target_platform' : field]: value })
      .eq('id', currentProject.id).then()
  }

  const createProject = async (event) => {
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
    await supabase.from('projects').insert([projectToDb(project, userId)])
  }

  const deleteProject = async (projectId) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project || projects.length <= 1) return
    const confirmed = window.confirm(`Delete project "${project.name}" and all of its tasks?`)
    if (!confirmed) return
    const remaining = projects.filter((p) => p.id !== projectId)
    setProjects(remaining)
    setTasks((current) => current.filter((t) => t.projectId !== projectId))
    if (currentProjectId === projectId) setCurrentProjectId(remaining[0].id)
    await supabase.from('projects').delete().eq('id', projectId)
  }

  // ── Task actions ──
  const updateTask = async (taskId, updates) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task
        const next = { ...task, ...updates }
        if (next.completed) next.status = 'done'
        if (!next.completed && next.status === 'done') next.status = 'todo'
        next.activity = [createActivity('update', 'Updated task details.'), ...(next.activity || [])]
        return next
      })
    )
    const { subtasks, labels, activity, projectId, ...rest } = updates
    await supabase.from('tasks').update({
      ...rest,
      ...(subtasks !== undefined && { subtasks }),
      ...(labels !== undefined && { labels }),
      ...(activity !== undefined && { activity }),
      ...(projectId !== undefined && { project_id: projectId }),
    }).eq('id', taskId)
  }

  const deleteTask = async (taskId) => {
    const removed = tasks.find((t) => t.id === taskId)
    setTasks((current) => current.filter((t) => t.id !== taskId))
    if (removed) logProjectActivity(removed.projectId, 'delete', `Deleted task ${removed.title}.`)
    setEditingTask((current) => (current?.id === taskId ? null : current))
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  const moveTask = async (taskId, nextStatus) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatus, completed: nextStatus === 'done', activity: [createActivity('status', `Moved task to ${nextStatus}.`), ...(task.activity || [])] }
          : task
      )
    )
    await supabase.from('tasks').update({ status: nextStatus, completed: nextStatus === 'done' }).eq('id', taskId)
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
      const sameWithoutColumn = sameProject.filter((item) => item.status !== task.status)
      return [...otherProjectTasks, ...sameWithoutColumn, ...reordered]
    })
  }

  const handleCreateTask = async (event) => {
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
    await supabase.from('tasks').insert([taskToDb(task, userId)])
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

  const addTeamMember = async (event) => {
    event.preventDefault()
    const member = newMember.trim()
    if (!member || teamMembers.includes(member)) return
    setTeamMembers((current) => [...current.filter((m) => m !== 'Unassigned'), member, 'Unassigned'])
    setNewMember('')
    await supabase.from('team_members').insert([{ user_id: userId, name: member }])
  }

  const removeTeamMember = async (member) => {
    if (member === 'Unassigned') return
    setTeamMembers((current) => current.filter((m) => m !== member))
    setTasks((current) => current.map((t) => ({ ...t, assignee: t.assignee === member ? 'Unassigned' : t.assignee })))
    await supabase.from('team_members').delete().eq('user_id', userId).eq('name', member)
  }

if (loading) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#aeb8dd' }}>
      Loading your board…
    </div>
  )
}

// Guard: if auth is done but projects haven't resolved yet
if (!loading && session && !currentProject) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#aeb8dd' }}>
      Setting up your board…
    </div>
  )
}

  return (
    <AuthGate session={session}>
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
                <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks or assignees" />
                <div className="filter-chips">
                  {['All', ...disciplines].map((item) => (
                    <button key={item} className={filter === item ? 'chip active' : 'chip'} onClick={() => setFilter(item)} type="button">{item}</button>
                  ))}
                </div>
                <div className="quick-create-grid">
                  <input value={newTask.title} onChange={(e) => setNewTask((c) => ({ ...c, title: e.target.value }))} placeholder="Add a new feature or task" />
                  <select value={newTask.assignee} onChange={(e) => setNewTask((c) => ({ ...c, assignee: e.target.value }))}>{teamMembers.map((m) => <option key={m}>{m}</option>)}</select>
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
    </AuthGate>
  )
}

export default App