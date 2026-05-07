### Taskflow

Taskflow is a metadata-driven project and task management app for the Frappe Framework. It is being structured as an ERPNext-style application with custom DocTypes for team hierarchy, projects, tasks, checklist execution, and permission-aware reporting.

### Current Scope

The app now includes the first backend foundation for:

- `Taskflow Team` with parent-child hierarchy and embedded team membership
- `Taskflow Project` scoped to teams
- `Taskflow Task` with checklist and dependency child tables
- Service-layer permission helpers for team, project, and task visibility
- A metadata registry DocType for configurable Taskflow role behavior

Dashboards, reports, workspaces, workflow definitions, and notification automation still need to be layered on top of this data model.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app taskflow
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/taskflow
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
