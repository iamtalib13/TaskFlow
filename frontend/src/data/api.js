// API client for Taskflow SPA
export const mockBootstrap = {
  me: {
    name: 'Administrator',
    email: 'admin@example.com',
    image: '',
  },
  projects: [
    { name: 'drishti Core', display_name: 'drishti Core', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'ERPNext Impl', display_name: 'ERPNext Impl', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'CRM Revamp', display_name: 'CRM Revamp', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Core Platform 2.0', display_name: 'Core Platform 2.0', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    { name: 'Mobile App', display_name: 'Mobile App', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  ],
  people: [
    { name: 'Talib Sheikh', email: 'talibsheikh16@gmail.com', initials: 'TS', color: 'bg-blue-500' },
    { name: 'Sarah Chen', email: 'sarah.chen@example.com', initials: 'SC', color: 'bg-purple-500' },
    { name: 'Marcus Brody', email: 'marcus.brody@example.com', initials: 'MB', color: 'bg-emerald-500' },
    { name: 'Elena Rostova', email: 'elena.rostova@example.com', initials: 'ER', color: 'bg-amber-500' },
    { name: 'Devon Vance', email: 'devon.vance@example.com', initials: 'DV', color: 'bg-rose-500' },
  ],
  statuses: ['Open', 'In Progress', 'Review', 'On Hold', 'Completed', 'Cancelled', 'Overdue'],
  priorities: ['Critical', 'High', 'Medium', 'Low'],
  tasks: [
    {
      id: 'TASK-135459',
      title: 'Display Branch and District in a Single Row in the New UI',
      badge: 'Active Target',
      project: 'drishti Core',
      status: 'In Progress',
      priority: 'High',
      assigned_to: 'Talib Sheikh',
      reporter: 'Marcus Brody',
      pending_with: 'Internal Team',
      due_date: '2026-09-15',
      estimated_hours: 12,
      logged_hours: 8,
      starred: false,
      description: 'Align branch and district fields in a two-column responsive grid on the main form view to save vertical space.',
      comments: [
        { author: 'Marcus Brody', time: '2 hours ago', text: 'Please ensure responsive mobile wrapping works smoothly.' },
        { author: 'Talib Sheikh', time: '1 hour ago', text: 'Implemented grid layout, testing on tablet breakpoint.' },
      ],
      modified: '2026-09-08 15:42:00',
      modified_pretty: 'Just now',
    },
    {
      id: 'ERP-104',
      title: 'Design Project Dashboard UI Components',
      badge: '',
      project: 'ERPNext Impl',
      status: 'In Progress',
      priority: 'High',
      assigned_to: 'Talib Sheikh',
      reporter: 'Elena Rostova',
      pending_with: 'Reviewer',
      due_date: '2026-09-18',
      estimated_hours: 24,
      logged_hours: 16,
      starred: true,
      description: 'Create KPI summary tiles, burndown chart container, and task activity feed widgets.',
      comments: [],
      modified: '2026-09-08 14:15:00',
      modified_pretty: '1h ago',
    },
    {
      id: 'CRM-88',
      title: 'Postgres Migration Script Audit & Index Optimization',
      badge: '',
      project: 'CRM Revamp',
      status: 'Review',
      priority: 'Critical',
      assigned_to: 'Sarah Chen',
      reporter: 'Devon Vance',
      pending_with: 'DBA',
      due_date: '2026-09-12',
      estimated_hours: 18,
      logged_hours: 15,
      starred: false,
      description: 'Review B-tree index coverage on leads, opportunities, and interactions tables.',
      comments: [],
      modified: '2026-09-08 12:30:00',
      modified_pretty: '3h ago',
    },
    {
      id: 'CORE-42',
      title: 'Auth0 SAML SSO Pipeline Configuration',
      badge: '',
      project: 'Core Platform 2.0',
      status: 'Open',
      priority: 'Medium',
      assigned_to: 'Marcus Brody',
      reporter: 'Sarah Chen',
      pending_with: 'Client',
      due_date: '2026-09-20',
      estimated_hours: 16,
      logged_hours: 0,
      starred: false,
      description: 'Setup SAML identity provider handshake and role mapping assertions.',
      comments: [],
      modified: '2026-09-08 09:00:00',
      modified_pretty: '7h ago',
    },
    {
      id: 'ERP-112',
      title: 'GraphQL Gateway Cache Layer Implementation',
      badge: '',
      project: 'ERPNext Impl',
      status: 'In Progress',
      priority: 'High',
      assigned_to: 'Elena Rostova',
      reporter: 'Talib Sheikh',
      pending_with: 'Internal Team',
      due_date: '2026-09-19',
      estimated_hours: 32,
      logged_hours: 20,
      starred: false,
      description: 'Deploy Redis caching middleware with stale-while-revalidate invalidation pattern.',
      comments: [],
      modified: '2026-09-07 18:20:00',
      modified_pretty: 'Yesterday',
    },
    {
      id: 'CORE-59',
      title: 'Deadlock Recovery in PubSub Cluster',
      badge: '',
      project: 'Core Platform 2.0',
      status: 'Review',
      priority: 'Critical',
      assigned_to: 'Devon Vance',
      reporter: 'Elena Rostova',
      pending_with: 'Tech Lead',
      due_date: '2026-09-11',
      estimated_hours: 14,
      logged_hours: 14,
      starred: false,
      description: 'Resolve worker node distributed locking race condition during partition rebalances.',
      comments: [],
      modified: '2026-09-07 11:15:00',
      modified_pretty: 'Yesterday',
    },
    {
      id: 'TASK-135460',
      title: 'Standardize Form Validation Error Banners',
      badge: '',
      project: 'drishti Core',
      status: 'Open',
      priority: 'Medium',
      assigned_to: 'Sarah Chen',
      reporter: 'Talib Sheikh',
      pending_with: 'Design',
      due_date: '2026-09-22',
      estimated_hours: 8,
      logged_hours: 2,
      starred: false,
      description: 'Harmonize toast notifications and inline field validation states across all doctype forms.',
      comments: [],
      modified: '2026-09-06 16:40:00',
      modified_pretty: '2d ago',
    },
    {
      id: 'MOB-205',
      title: 'Offline Database Sync Engine for iOS & Android',
      badge: '',
      project: 'Mobile App',
      status: 'In Progress',
      priority: 'High',
      assigned_to: 'Elena Rostova',
      reporter: 'Marcus Brody',
      pending_with: 'Mobile Team',
      due_date: '2026-09-25',
      estimated_hours: 40,
      logged_hours: 28,
      starred: false,
      description: 'Implement SQLite local change queue with conflict resolution vector clocks.',
      comments: [],
      modified: '2026-09-05 10:20:00',
      modified_pretty: '3d ago',
    },
    {
      id: 'SEC-301',
      title: 'Audit Trail Event Stream to Datadog / Splunk Forwarder',
      badge: '',
      project: 'Core Platform 2.0',
      status: 'On Hold',
      priority: 'Medium',
      assigned_to: 'Devon Vance',
      reporter: 'Sarah Chen',
      pending_with: 'DevOps',
      due_date: '2026-09-30',
      estimated_hours: 20,
      logged_hours: 4,
      starred: false,
      description: 'Stream structured JSON security event telemetry to centralized SIEM collector.',
      comments: [],
      modified: '2026-09-04 14:10:00',
      modified_pretty: '4d ago',
    },
    {
      id: 'TASK-135468',
      title: 'Legacy Redis Cache Eviction Policy Update',
      badge: 'Urgent',
      project: 'drishti Core',
      status: 'Overdue',
      priority: 'Critical',
      assigned_to: 'Talib Sheikh',
      reporter: 'Marcus Brody',
      pending_with: 'Infrastructure',
      due_date: '2026-09-01',
      estimated_hours: 10,
      logged_hours: 6,
      starred: true,
      description: 'Prevent OOM exceptions during peak transaction windows by tweaking maxmemory-policy.',
      comments: [],
      modified: '2026-09-03 09:30:00',
      modified_pretty: '5d ago',
    },
    {
      id: 'ERP-119',
      title: 'Multi-Currency Ledger Revaluation Script Fix',
      badge: '',
      project: 'ERPNext Impl',
      status: 'Completed',
      priority: 'High',
      assigned_to: 'Sarah Chen',
      reporter: 'Talib Sheikh',
      pending_with: 'Finance',
      due_date: '2026-09-05',
      estimated_hours: 10,
      logged_hours: 10,
      starred: true,
      description: 'Fix forex currency gain/loss calculation on partially reconciled foreign currency invoices.',
      comments: [],
      modified: '2026-09-02 17:00:00',
      modified_pretty: '6d ago',
    },
    {
      id: 'TASK-135465',
      title: 'Customer Ledger Aging Report Export to XLSX / PDF',
      badge: '',
      project: 'drishti Core',
      status: 'Completed',
      priority: 'Low',
      assigned_to: 'Talib Sheikh',
      reporter: 'Marcus Brody',
      pending_with: 'QA',
      due_date: '2026-09-02',
      estimated_hours: 8,
      logged_hours: 8,
      starred: false,
      description: 'Format aged trial balance output with custom branding header and currency symbols.',
      comments: [],
      modified: '2026-08-28 11:00:00',
      modified_pretty: '11d ago',
    },
  ],
}

// Fetch bootstrap data
export async function fetchBootstrap() {
  if (typeof window !== 'undefined' && window.frappe && window.frappe.call) {
    try {
      const res = await window.frappe.call({
        method: 'taskflow.taskflow.api.spa.get_spa_bootstrap',
      })
      if (res && res.message && res.message.tasks && res.message.tasks.length > 0) {
        return res.message
      }
    } catch (e) {
      console.warn('Frappe API unavailable, falling back to local dataset', e)
    }
  }

  // Also check window.fetch if frappe.call is not directly attached
  try {
    const csrfToken = window.csrf_token || ''
    const resp = await fetch('/api/method/taskflow.taskflow.api.spa.get_spa_bootstrap', {
      headers: {
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': csrfToken,
      },
    })
    if (resp.ok) {
      const data = await resp.json()
      if (data && data.message && data.message.tasks && data.message.tasks.length > 0) {
        return data.message
      }
    }
  } catch (e) {
    // Standalone / offline mode
  }

  return mockBootstrap
}

// Save or create task
export async function saveTask(taskData) {
  if (typeof window !== 'undefined' && window.frappe && window.frappe.call) {
    try {
      const res = await window.frappe.call({
        method: 'taskflow.taskflow.api.spa.save_task',
        args: { payload: JSON.stringify(taskData) },
      })
      if (res && res.message) return res.message
    } catch (e) {
      console.error('Failed to save task via Frappe API', e)
    }
  }

  try {
    const csrfToken = window.csrf_token || ''
    const resp = await fetch('/api/method/taskflow.taskflow.api.spa.save_task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ payload: JSON.stringify(taskData) }),
    })
    if (resp.ok) {
      const json = await resp.json()
      return json.message
    }
  } catch (e) {
    // Fallback local save
  }

  return { ok: true, task: taskData }
}
