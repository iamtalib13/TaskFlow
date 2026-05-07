from __future__ import annotations

import frappe

from taskflow.taskflow.service.project_access import (
	get_project_permission_condition,
	get_task_permission_condition,
	get_team_permission_condition,
)
from taskflow.taskflow.service.team_hierarchy import can_manage_team, can_operate_team, can_view_team


PROJECT_MANAGER_ROLES = {"System Manager", "Taskflow Admin", "Project Manager", "Projects Manager"}


def get_task_permission(user=None):
	"""Legacy permission hook for the standard ERPNext Task DocType."""
	if not user:
		user = frappe.session.user

	allowed_roles = {"System Manager", "Task Manager", "Project Manager"}
	if allowed_roles & set(frappe.get_roles(user)):
		return ""

	return f"""(`tabTask`.`_assign` LIKE '%"{user}"%')"""


def get_taskflow_team_permission(user=None):
	return get_team_permission_condition(user or frappe.session.user)


def get_taskflow_project_permission(user=None):
	return get_project_permission_condition(user or frappe.session.user)


def get_taskflow_task_permission(user=None):
	return get_task_permission_condition(user or frappe.session.user)


def has_taskflow_team_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if PROJECT_MANAGER_ROLES & set(frappe.get_roles(user)):
		return True

	if permission_type == "read":
		return can_view_team(user, doc.name)

	return False


def has_taskflow_project_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if PROJECT_MANAGER_ROLES & set(frappe.get_roles(user)):
		return True

	if permission_type == "read":
		return can_view_team(user, doc.team) or doc.project_lead_user == user

	return False


def has_taskflow_task_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if PROJECT_MANAGER_ROLES & set(frappe.get_roles(user)):
		return True

	if permission_type == "create":
		return can_operate_team(user, doc.team)

	if permission_type in {"read", "write"}:
		if permission_type == "read" and can_view_team(user, doc.team):
			return True

		if can_manage_team(user, doc.team):
			return True

		return (
			can_operate_team(user, doc.team)
			and (doc.assigned_to_user in (None, "", user) or doc.assigned_by == user or doc.owner == user)
		)

	return False
