from __future__ import annotations

import frappe


VIEWER_TEAM_ROLES = {"Viewer", "Auditor"}
MANAGER_TEAM_ROLES = {"Team Lead", "Project Manager", "Coordinator"}
MANAGER_ACCESS_LEVELS = {"Manage", "Admin"}
OPERATOR_ACCESS_LEVELS = {"Operate", "Manage", "Admin"}
TASKFLOW_DYNAMIC_ROLES = {"Project Manager", "Viewer"}


def sync_taskflow_roles_for_users(users: list[str]) -> None:
	for user in users:
		if not user or user in {"Administrator", "Guest"}:
			continue

		_sync_taskflow_roles_for_user(user)


def _sync_taskflow_roles_for_user(user: str) -> None:
	memberships = frappe.get_all(
		"Taskflow Team Member",
		filters={"user": user, "is_active": 1},
		fields=["team_role", "access_level"],
	)

	desired_roles = _get_desired_roles(memberships)
	user_doc = frappe.get_doc("User", user)
	current_roles = set(frappe.get_roles(user))

	missing_roles = sorted(desired_roles - current_roles)
	roles_to_remove = sorted((current_roles & TASKFLOW_DYNAMIC_ROLES) - desired_roles)

	if missing_roles:
		user_doc.add_roles(*missing_roles)

	if roles_to_remove:
		user_doc.remove_roles(*roles_to_remove)


def _get_desired_roles(memberships: list[dict]) -> set[str]:
	desired_roles = set()

	if any(_needs_employee_role(row) for row in memberships):
		desired_roles.add("Employee")

	if any(_needs_viewer_role(row) for row in memberships):
		desired_roles.add("Viewer")

	if any(_needs_project_manager_role(row) for row in memberships):
		desired_roles.add("Project Manager")

	return desired_roles


def _needs_employee_role(row: dict) -> bool:
	return row.team_role not in VIEWER_TEAM_ROLES or row.access_level in OPERATOR_ACCESS_LEVELS


def _needs_viewer_role(row: dict) -> bool:
	return row.team_role in VIEWER_TEAM_ROLES or row.access_level == "View"


def _needs_project_manager_role(row: dict) -> bool:
	return row.team_role in MANAGER_TEAM_ROLES or row.access_level in MANAGER_ACCESS_LEVELS
