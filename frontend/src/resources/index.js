import { createListResource, createResource } from 'frappe-ui'

// 1. Projects List
export const projectsResource = createListResource({
  doctype: 'Project',
  fields: ['*'],
  auto: true,
})

// 2. Dashboard Stats
export const dashboardStats = createResource({
  url: 'taskflow.taskflow.api.taskflow.get_manager_dashboard_stats',
  auto: true,
})

export const managerOverview = createResource({
  url: 'taskflow.taskflow.api.taskflow.get_project_manager_overview',
  auto: false,
})

let managerOverviewInitPromise = null

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function ensureManagerOverviewLoaded(options = {}) {
  const { force = false, retries = 2, delayMs = 250 } = options

  if (!force && managerOverview.data && !managerOverview.error) {
    return managerOverview.data
  }

  if (managerOverviewInitPromise) {
    return managerOverviewInitPromise
  }

  managerOverviewInitPromise = (async () => {
    let lastError = null
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await managerOverview.fetch()
        if (managerOverview.data || response) {
          return managerOverview.data || response
        }
      } catch (error) {
        lastError = error
      }

      if (attempt < retries) {
        await wait(delayMs * (attempt + 1))
      }
    }

    if (lastError) {
      throw lastError
    }
    throw new Error('Unable to load manager overview.')
  })().finally(() => {
    managerOverviewInitPromise = null
  })

  return managerOverviewInitPromise
}
