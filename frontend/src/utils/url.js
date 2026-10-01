// Canonical URL helpers for the Taskflow SPA.
//
// The SPA is served from a Frappe `www` page, so it always runs under a base
// path (`/taskflow`, `/mytasks`, `/tasks`, ...). Following the Frappe
// convention, everything lives in the path and the URL carries no query string:
//
//   /taskflow                    Task list
//   /taskflow/task/TFT-00330     Task form
//   /taskflow/timesheet          Timesheet
//   /taskflow/project            Project
//   /taskflow/team               Team
//
// These helpers are the only place allowed to build a path, so the base can
// never keep a trailing slash (which used to produce `/taskflow//task/<id>`)
// and a rewrite can never accumulate stray slashes.

export const SECTIONS = ['Dashboard', 'Task', 'Timesheet', 'Project', 'Team']

// URL segment -> section id. `task` maps to the task form/list, so it is both
// a section path and the form prefix.
const SEGMENT_TO_SECTION = {
  dashboard: 'Dashboard',
  task: 'Task',
  timesheet: 'Timesheet',
  project: 'Project',
  team: 'Team',
}

// Section id -> URL segment. Task owns the bare base, keeping the list URL short.
const SECTION_TO_SEGMENT = {
  Dashboard: 'dashboard',
  Task: '',
  Timesheet: 'timesheet',
  Project: 'project',
  Team: 'team',
}

// Mount points shipped by this app. Used as a fallback so that an unknown
// sub-path (e.g. `/taskflow/whatever`) still resolves to the real base.
const APP_BASES = ['/tasks', '/mytasks', '/taskflow', '/frontend']

// Matches the task form tail: `/task/<task_id>` with an optional trailing slash.
const TASK_PATH_RE = /\/task\/([^/?#]+)\/?$/

/**
 * Collapse repeated slashes and drop the trailing one. `/` stays `/`.
 * @param {string} path
 * @returns {string}
 */
export function cleanPath(path) {
  return `/${String(path || '').split('/').filter(Boolean).join('/')}`
}

// The site root has no segment to keep, so its base is an empty string.
const stripTrailingSlash = (path) => (path === '/' ? '' : path.replace(/\/+$/, ''))

/**
 * Base path the SPA is mounted on, never ending with a slash (`''` at the root).
 * Falls back to the whole path so the app also works under an unknown mount point.
 * @param {string} path
 * @returns {string}
 */
export function getAppBase(path) {
  const clean = cleanPath(path)
  // form view: strip the `/task/<task_id>` tail to get back to the base
  const taskMatch = clean.match(TASK_PATH_RE)
  if (taskMatch) return stripTrailingSlash(clean.slice(0, taskMatch.index))

  // section view: drop a trailing section segment (`/taskflow/timesheet` -> `/taskflow`)
  const segments = clean.split('/').filter(Boolean)
  if (segments.length && SEGMENT_TO_SECTION[segments[segments.length - 1].toLowerCase()]) {
    segments.pop()
  }
  const base = `/${segments.join('/')}`
  const known = APP_BASES.find((b) => base === b || base.startsWith(`${b}/`))
  return stripTrailingSlash(known || base)
}

/**
 * Read the current view out of a path.
 * @param {string} path
 * @returns {{section: string, taskId: string}} `taskId` is `''` unless the form is open
 */
export function parseView(path) {
  const clean = cleanPath(path)
  const segments = clean.slice(getAppBase(clean).length).split('/').filter(Boolean)
  const section = SEGMENT_TO_SECTION[(segments[0] || '').toLowerCase()]
  if (!section) return { section: 'Task', taskId: '' }
  const taskId = section === 'Task' && segments[1] ? decodeURIComponent(segments[1]) : ''
  return { section, taskId }
}

/**
 * Build the canonical path for a view. `taskId` implies the Task section.
 * Idempotent: re-applying it to its own output never changes the path.
 * @param {string} section one of SECTIONS
 * @param {string} taskId task id, or `''` for any list view
 * @param {string} currentPath current `location.pathname`, used to resolve the base
 * @returns {string}
 */
export function buildViewPath(section, taskId, currentPath) {
  const base = getAppBase(currentPath)
  if (taskId) return `${base}/task/${encodeURIComponent(taskId)}`
  const segment = SECTION_TO_SEGMENT[section]
  return (segment ? `${base}/${segment}` : base) || '/'
}

/**
 * Extract array of project filters from URL search query.
 * Supports ?project=PROJ-1,PROJ-2 or ?project=PROJ-1 or ?projects=...
 * @param {string} search window.location.search or query string
 * @returns {string[]}
 */
export function getProjectsFromSearch(search) {
  try {
    const params = new URLSearchParams(search || '')
    const val = params.get('project') || params.get('projects') || ''
    if (val) {
      return val.split(',').map((p) => decodeURIComponent(p.trim())).filter(Boolean)
    }
    const all = params.getAll('project')
    if (all && all.length > 1) {
      return all.map((p) => decodeURIComponent(p.trim())).filter(Boolean)
    }
  } catch {}
  return []
}

/**
 * Extract array of team filters from URL search query.
 * Supports ?team=Team-A,Team-B or ?team=Team-A or ?teams=...
 * @param {string} search window.location.search or query string
 * @returns {string[]}
 */
export function getTeamsFromSearch(search) {
  try {
    const params = new URLSearchParams(search || '')
    const val = params.get('team') || params.get('teams') || ''
    if (val) {
      return val.split(',').map((t) => decodeURIComponent(t.trim())).filter(Boolean)
    }
    const all = params.getAll('team')
    if (all && all.length > 1) {
      return all.map((t) => decodeURIComponent(t.trim())).filter(Boolean)
    }
  } catch {}
  return []
}

/**
 * Extract array of member filters from URL search query.
 * Supports ?member=user1,user2 or ?member=user1 or ?members=... or ?assignee=...
 * @param {string} search window.location.search or query string
 * @returns {string[]}
 */
export function getMembersFromSearch(search) {
  try {
    const params = new URLSearchParams(search || '')
    const val = params.get('member') || params.get('members') || params.get('assignee') || ''
    if (val) {
      return val.split(',').map((m) => decodeURIComponent(m.trim())).filter(Boolean)
    }
    const all = params.getAll('member')
    if (all && all.length > 1) {
      return all.map((m) => decodeURIComponent(m.trim())).filter(Boolean)
    }
  } catch {}
  return []
}

