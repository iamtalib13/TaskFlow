from __future__ import annotations

import frappe

from taskflow.taskflow.service.team_hierarchy import build_name_filter_condition, get_accessible_teams


def get_project_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_teams = get_accessible_teams(user)
	conditions = []
	if accessible_teams:
		conditions.append(build_name_filter_condition("Taskflow Project", "team", accessible_teams))

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

	conditions.append(f"`tabTaskflow Task`.`assigned_to_user` = {frappe.db.escape(user)}")
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
