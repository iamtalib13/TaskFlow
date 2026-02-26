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
  auto: true,
})
