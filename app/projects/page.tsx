'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'in-review' | 'completed';
  assignedTo?: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'in-review' | 'completed';
  tasks: ProjectTask[];
  createdAt?: string;
}

const emptyProject = {
  name: '',
  description: '',
  status: 'active' as Project['status'],
};

const emptyTask: Omit<ProjectTask, 'id'> = {
  title: '',
  description: '',
  status: 'todo',
};

export default function ProjectsPage() {
  const { user, token, loading } = useAuth({ requireAuth: true, redirectTo: '/login' });
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProject, setNewProject] = useState(emptyProject);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newTask, setNewTask] = useState(emptyTask);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin' ;

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    if (!token) return;

    const fetchProjects = async () => {
      setIsRefreshing(true);
      try {
        const response = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load projects');
        const normalized = (data.projects || []).map((project: Project) => ({
          ...project,
          tasks: project.tasks || [],
        }));
        setProjects(normalized);
        if (!selectedProjectId && normalized.length > 0) {
          setSelectedProjectId(normalized[0]._id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load projects';
        showToast({ title: 'Project error', description: message, variant: 'error' });
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchProjects();
  }, [token, showToast, selectedProjectId]);

  const refreshProjects = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reload projects');
      const normalized = (data.projects || []).map((project: Project) => ({
        ...project,
        tasks: project.tasks || [],
      }));
      setProjects(normalized);
      if (selectedProjectId && !normalized.find((project: Project) => project._id === selectedProjectId)) {
        setSelectedProjectId(normalized[0]?._id ?? '');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh projects';
      showToast({ title: 'Project error', description: message, variant: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    setIsCreatingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create project');

      showToast({ title: 'Project created', description: `${data.project.name} was added successfully.`, variant: 'success' });
      setNewProject(emptyProject);
      await refreshProjects();
      if (data.project?._id) {
        setSelectedProjectId(data.project._id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create project';
      showToast({ title: 'Project error', description: message, variant: 'error' });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const addTask = async () => {
    if (!token || !selectedProject || !newTask.title.trim()) {
      showToast({
        title: 'Missing information',
        description: 'Provide a title for the task before saving.',
        variant: 'error',
      });
      return;
    }

    setIsAddingTask(true);
    try {
      const task: ProjectTask = {
        id: crypto.randomUUID(),
        ...newTask,
        assignedTo: user?._id || user?.id,
      } as ProjectTask;

      const response = await fetch(`/api/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: [...selectedProject.tasks, task] }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save task');

      showToast({ title: 'Task added', variant: 'success', description: 'The task has been added to the project.' });
      setNewTask(emptyTask);
      await refreshProjects();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add task';
      showToast({ title: 'Task error', description: message, variant: 'error' });
    } finally {
      setIsAddingTask(false);
    }
  };

  const moveTask = async (taskId: string, status: ProjectTask['status']) => {
    if (!token || !selectedProject) return;

    const updatedTasks = selectedProject.tasks.map((task) =>
      task.id === taskId ? { ...task, status } : task,
    );

    try {
      const response = await fetch(`/api/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: updatedTasks }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update task');
      }

      await refreshProjects();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update task';
      showToast({ title: 'Task error', description: message, variant: 'error' });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!token || !selectedProject) return;

    const updatedTasks = selectedProject.tasks.filter((task) => task.id !== taskId);
    try {
      const response = await fetch(`/api/projects/${selectedProject._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks: updatedTasks }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete task');
      }

      await refreshProjects();
      showToast({ title: 'Task removed', variant: 'info', description: 'The task has been deleted.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete task';
      showToast({ title: 'Task error', description: message, variant: 'error' });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      showToast({ title: 'Project deleted', variant: 'success', description: 'The project has been permanently removed.' });
      await refreshProjects();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete project';
      showToast({ title: 'Delete error', description: message, variant: 'error' });
    }
  };

  const getTasks = (status: ProjectTask['status']) => selectedProject?.tasks.filter((task) => task.status === status) ?? [];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Projects & Delivery"
      description="Create, update, and track project execution with a collaborative Kanban board."
      actions={
        <div className="flex items-center gap-3">
          {isAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-200">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin
            </span>
          )}
          <button
            type="button"
            onClick={refreshProjects}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-gray-50 hover:border-slate-300 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">➕ Add Project</h2>
              <p className="mt-1 text-sm text-slate-600">Create a new project</p>
            </div>
            <div className="p-6">
              <form onSubmit={createProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Project Name</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50"
                    placeholder="Enter project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50 resize-none"
                    placeholder="Describe the project objectives"
                    rows={3}
                    value={newProject.description}
                    onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-blue-300"
                  disabled={isCreatingProject}
                >
                  {isCreatingProject ? 'Creating...' : '➕ Add Project'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Project Overview</h2>
                    <p className="mt-1 text-sm text-slate-600">Select and manage projects</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {projects.length}
                    </span>
                  </div>
                </div>
              </div>

              {selectedProject ? (
                <div className="p-6 space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">{selectedProject.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{selectedProject.description || 'No description'}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap border ${
                        selectedProject.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        selectedProject.status === 'completed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        selectedProject.status === 'in-review' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-gray-100 text-slate-700 border-slate-200'
                      }`}>
                        {selectedProject.status === 'in-review' ? 'In Review' : selectedProject.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200">
                      {!isAdmin ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={async () => {
                            try {
                              showToast({ title: '✅ Submitted to E-Office', description: 'Your work has been submitted successfully', variant: 'success' });
                            } catch (err) {
                              showToast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' });
                            }
                          }} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
                            ✅ Submit to E-Office
                          </button>
                          <button type="button" onClick={() => deleteProject(selectedProject._id)}
                            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 ml-auto">
                            🗑️ Delete Project
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => deleteProject(selectedProject._id)}
                            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
                            🗑️ Delete Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="rounded-lg border-2 border-dashed border-slate-300 bg-gray-50 p-12 text-center">
                    <p className="text-sm font-medium text-slate-500">No project selected</p>
                  </div>
                </div>
              )}
        </div>

        {selectedProject && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Add New Task</h3>
                <p className="mt-1 text-sm text-slate-600">Create tasks and assign them</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Task Title</label>
                    <input className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                      placeholder="Enter task title" value={newTask.title}
                      onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))} />
                  </div>
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                    <input className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                      placeholder="Brief description" value={newTask.description}
                      onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                    <select className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                      value={newTask.status}
                      onChange={(e) => setNewTask((t) => ({ ...t, status: e.target.value as ProjectTask['status'] }))}>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="in-review">In Review</option>
                      {isAdmin && <option value="completed">Completed</option>}
                    </select>
                  </div>
                  <div className="lg:col-span-2 flex items-end">
                    <button type="button" onClick={addTask} disabled={isAddingTask}
                      className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:bg-emerald-300">
                      {isAddingTask ? 'Adding...' : 'Add Task'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {(['todo', 'in-progress', 'in-review', 'completed'] as ProjectTask['status'][]).map((status) => {
                const cfg = {
                  'todo': { label: 'To Do', color: 'slate' },
                  'in-progress': { label: 'In Progress', color: 'blue' },
                  'in-review': { label: 'In Review', color: 'amber' },
                  'completed': { label: 'Completed', color: 'emerald' }
                }[status];
                const tasks = getTasks(status);
                return (
                  <div key={status} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className={`border-b px-5 py-4 bg-${cfg.color}-50`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900">{cfg.label}</h4>
                        <span className={`rounded-full bg-${cfg.color}-100 px-2.5 py-0.5 text-xs font-bold text-${cfg.color}-700`}>
                          {tasks.length}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto">
                      {tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300">
                          <h5 className="text-sm font-semibold text-slate-900">{task.title}</h5>
                          {task.description && (
                            <p className="mt-2 text-xs text-slate-600">{task.description}</p>
                          )}
                          
                          {status === 'in-review' && (
                            <div className={`mt-3 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                              isAdmin ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isAdmin ? '👀 Ready for review' : '⏳ Pending review'}
                            </div>
                          )}
                          
                          {status === 'completed' && (
                            <div className="mt-3 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                              ✓ Verified by admin
                            </div>
                          )}
                          
                          <div className="mt-4 flex flex-wrap gap-2">
                            {!isAdmin && (
                              <>
                                {status === 'in-progress' && (
                                  <>
                                    <button type="button" onClick={() => moveTask(task.id, 'todo')}
                                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-200">
                                      ← Back
                                    </button>
                                    <button type="button" onClick={() => moveTask(task.id, 'in-review')}
                                      className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">
                                      Submit →
                                    </button>
                                  </>
                                )}
                                {status === 'todo' && (
                                  <button type="button" onClick={() => moveTask(task.id, 'in-progress')}
                                    className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600">
                                    Start →
                                  </button>
                                )}
                                {status === 'in-review' && (
                                  <button type="button" onClick={() => moveTask(task.id, 'in-progress')}
                                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-200">
                                    ← Back
                                  </button>
                                )}
                              </>
                            )}

                            {isAdmin && (
                              <>
                                {status !== 'todo' && (
                                  <button type="button" onClick={() => {
                                    const prev = status === 'completed' ? 'in-review' : status === 'in-review' ? 'in-progress' : 'todo';
                                    moveTask(task.id, prev);
                                  }} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-200">
                                    ← Back
                                  </button>
                                )}
                                {status !== 'completed' && (
                                  <button type="button" onClick={() => {
                                    const next = status === 'todo' ? 'in-progress' : status === 'in-progress' ? 'in-review' : 'completed';
                                    moveTask(task.id, next);
                                  }} className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
                                    status === 'in-review' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'
                                  }`}>
                                    {status === 'in-review' ? '✓ Approve' : 'Next →'}
                                  </button>
                                )}
                              </>
                            )}
                            
                            <button type="button" onClick={() => deleteTask(task.id)}
                              className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 ml-auto">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                          <div className="rounded-full bg-gray-100 p-3">
                            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                          <p className="mt-3 text-xs font-medium text-slate-500">No tasks yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
