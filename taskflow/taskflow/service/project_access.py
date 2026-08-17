from __future__ import annotations

import frappe

from taskflow.taskflow.service.team_hierarchy import build_name_filter_condition, get_accessible_teams


def get_project_member_projects(user: str | None = None) -> set[str]:
    """Return names of projects where the user is listed in project_team_members."""
    if not user:
        user = frappe.session.user

    user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    rows = frappe.get_all(
        "Taskflow Team Member",
        filters={"parenttype": "Taskflow Project"},
        fields=["parent", "user", "employee"],
        ignore_permissions=True,
    )
    return {
        row.parent
        for row in rows
        if row.user == user or (user_employee and row.employee == user_employee)
    }


def is_project_member(user: str, project_name: str | None) -> bool:
    if not project_name:
        return False
    return project_name in get_project_member_projects(user)


def get_project_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_teams = get_accessible_teams(user)
	conditions = []
	if accessible_teams:
		conditions.append(build_name_filter_condition("Taskflow Project", "team", accessible_teams))

	member_projects = get_project_member_projects(user)
	if member_projects:
		conditions.append(build_name_filter_condition("Taskflow Project", "name", member_projects))

	conditions.append(f"`tabTaskflow Project`.`project_lead_user` = {frappe.db.escape(user)}")
	return " or ".join(f"({condition})" for condition in conditions if condition) or "1=0"


def get_task_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_teams = get_accessible_teams(user)
	conditions = []
	if accessible_teams:
		conditions.append(build_name_filter_condition("Taskflow Task", "team", accessible_teams))
		project_names = frappe.get_all(
			"Taskflow Project",
			filters={"team": ["in", list(accessible_teams)]},
			pluck="name",
		)
		if project_names:
			conditions.append(build_name_filter_condition("Taskflow Task", "project", set(project_names)))

	member_projects = get_project_member_projects(user)
	if member_projects:
		conditions.append(build_name_filter_condition("Taskflow Task", "project", member_projects))

	user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if user_employee:
		conditions.append(
			f"`tabTaskflow Task`.`name` IN ("
			f"SELECT `parent` FROM `tabTask Assignment` WHERE `user_id` = {frappe.db.escape(user_employee)}"
			f")"
		)
	conditions.append(f"`tabTaskflow Task`.`assigned_by` = {frappe.db.escape(user)}")
	conditions.append(f"`tabTaskflow Task`.`owner` = {frappe.db.escape(user)}")
	return " or ".join(f"({condition})" for condition in conditions if condition) or "1=0"


def get_team_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_teams = get_accessible_teams(user)
	return build_name_filter_condition("Taskflow Team", "name", accessible_teams)


def _is_privileged_user(user: str) -> bool:
	user_roles = set(frappe.get_roles(user))
	return bool({"System Manager", "Taskflow Admin"} & user_roles)
