import { createResource } from 'frappe-ui/src/resources'
import { frappeRequest } from 'frappe-ui/src/utils/frappeRequest'

export const workspaceBootstrap = createResource({
  url: 'taskflow.taskflow.api.workspace.get_workspace_bootstrap',
  auto: false,
  resourceFetcher: frappeRequest,
})
