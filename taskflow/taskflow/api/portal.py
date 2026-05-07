from __future__ import annotations

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import cint, getdate

from taskflow.permissions import (
	has_taskflow_project_permission,
	has_taskflow_task_permission,
	has_taskflow_team_permission,
)
from taskflow.taskflow.service.team_hierarchy import can_manage_team, can_operate_team


PROJECT_MANAGER_ROLES = {"System Manager", "Taskflow Admin", "Project Manager", "Projects Manager"}
TASK_STATUSES = ["Open", "In Progress", "Review", "Blocked", "Completed", "Cancelled"]


def _require_login():
	if frappe.session.user == "Guest":
		frappe.throw(_("Login required"), frappe.PermissionError)


def _get_user_profile() -> dict:
	user = frappe.session.user
	details = frappe.db.get_value("User", user, ["full_name", "user_image"], as_dict=True) or {}
	return {
		"user": user,
		"full_name": details.get("full_name") or user,
		"user_image": details.get("user_image"),
		"roles": frappe.get_roles(user),
	}


def _get_accessible_teams() -> list[dict]:
	teams = frappe.get_list(
		"Taskflow Team",
		fields=["name", "team_name", "team_code", "team_lead", "visibility_scope", "is_active"],
		filters={"is_active": 1},
		order_by="team_name asc",
	)
	return [
		{
			"name": team.name,
			"team_name": team.team_name,
			"team_code": team.team_code,
			"team_lead": team.team_lead,
			"visibility_scope": team.visibility_scope,
			"permissions": {
				"can_read": has_taskflow_team_permission(frappe.get_doc("Taskflow Team", team.name)),
				"can_manage": can_manage_team(frappe.session.user, team.name),
				"can_operate": can_operate_team(frappe.session.user, team.name),
			},
		}
		for team in teams
	]


def _get_team_member_options(team_names: list[str]) -> list[dict]:
	if not team_names:
		return []

	rows = frappe.get_all(
		"Taskflow Team Member",
		filters={"parent": ["in", team_names], "is_active": 1},
		fields=["parent", "employee", "user", "team_role", "access_level"],
		order_by="idx asc",
	)
	employees = {row.employee for row in rows if row.employee}
	employee_names = {
		row.name: row.employee_name
		for row in frappe.get_all(
			"Employee",
			filters={"name": ["in", list(employees)]} if employees else {"name": "__missing__"},
			fields=["name", "employee_name"],
		)
	}
	member_options = []
	for row in rows:
		member_options.append(
			{
				"team": row.parent,
				"employee": row.employee,
				"user": row.user,
				"label": employee_names.get(row.employee) or row.user or row.employee,
				"team_role": row.team_role,
				"access_level": row.access_level,
			}
		)
	return member_options


def _serialize_project(project, task_counts: dict[str, dict] | None = None) -> dict:
	task_count = (task_counts or {}).get(project.name, {})
	return {
		"name": project.name,
		"project_name": project.project_name,
		"project_code": project.project_code,
		"team": project.team,
		"status": project.status,
		"priority": project.priority,
		"start_date": project.start_date,
		"end_date": project.end_date,
		"expected_hours": project.expected_hours,
		"completion_percent": project.completion_percent,
		"project_lead": project.project_lead,
		"project_lead_user": project.project_lead_user,
		"total_tasks": task_count.get("total", 0),
		"open_tasks": task_count.get("open", 0),
		"completed_tasks": task_count.get("completed", 0),
		"permissions": {
			"can_read": has_taskflow_project_permission(project, frappe.session.user, "read"),
			"can_write": has_taskflow_project_permission(project, frappe.session.user, "write"),
			"can_manage_team": can_manage_team(frappe.session.user, project.team),
			"can_operate_team": can_operate_team(frappe.session.user, project.team),
		},
	}


def _serialize_task(task) -> dict:
	return {
		"name": task.name,
		"task_title": task.task_title,
		"project": task.project,
		"team": task.team,
		"assigned_by": task.assigned_by,
		"assigned_to": task.assigned_to,
		"assigned_to_user": task.assigned_to_user,
		"status": task.status,
		"priority": task.priority,
		"task_type": task.task_type,
		"start_date": task.start_date,
		"due_date": task.due_date,
		"completed_on": task.completed_on,
		"progress_percent": task.progress_percent,
		"estimated_hours": task.estimated_hours,
		"actual_hours": task.actual_hours,
		"is_milestone": task.is_milestone,
		"is_blocked": task.is_blocked,
		"sequence": task.sequence,
		"description": task.description,
		"permissions": {
			"can_read": has_taskflow_task_permission(task, frappe.session.user, "read"),
			"can_write": has_taskflow_task_permission(task, frappe.session.user, "write"),
		},
	}


def _get_project_task_counts(project_names: list[str]) -> dict[str, dict]:
	if not project_names:
		return {}

	rows = frappe.get_all(
		"Taskflow Task",
		filters={"project": ["in", project_names]},
		fields=["project", "status"],
		limit_page_length=0,
	)
	counts = defaultdict(lambda: {"total": 0, "open": 0, "completed": 0})
	for row in rows:
		counts[row.project]["total"] += 1
		if row.status == "Completed":
			counts[row.project]["completed"] += 1
		elif row.status != "Cancelled":
			counts[row.project]["open"] += 1
	return counts


@frappe.whitelist()
def get_portal_bootstrap():
	_require_login()

	projects = frappe.get_list(
		"Taskflow Project",
		fields=[
			"name",
			"project_name",
			"project_code",
			"team",
			"status",
			"priority",
			"start_date",
			"end_date",
			"expected_hours",
			"completion_percent",
			"project_lead",
			"project_lead_user",
		],
		order_by="modified desc",
	)
	project_names = [project.name for project in projects]
	task_counts = _get_project_task_counts(project_names)
	teams = _get_accessible_teams()
	team_names = [team["name"] for team in teams]
	task_filters = {"project": ["in", project_names]} if project_names else {"name": "__missing__"}
	tasks = frappe.get_list(
		"Taskflow Task",
		fields=[
			"name",
			"task_title",
			"project",
			"team",
			"assigned_by",
			"assigned_to",
			"assigned_to_user",
			"status",
			"priority",
			"task_type",
			"start_date",
			"due_date",
			"completed_on",
			"progress_percent",
			"estimated_hours",
			"actual_hours",
			"is_milestone",
			"is_blocked",
			"sequence",
			"description",
		],
		filters=task_filters,
		order_by="modified desc",
		limit_page_length=100,
	)
	project_docs = [frappe.get_doc("Taskflow Project", project.name) for project in projects]
	task_docs = [frappe.get_doc("Taskflow Task", task.name) for task in tasks]

	return {
		"user": _get_user_profile(),
		"teams": teams,
		"team_members": _get_team_member_options(team_names),
		"projects": [_serialize_project(project_doc, task_counts) for project_doc in project_docs],
		"tasks": [_serialize_task(task_doc) for task_doc in task_docs],
		"status_options": TASK_STATUSES,
		"priority_options": ["Low", "Medium", "High", "Critical"],
		"task_type_options": ["Task", "Bug", "Story", "Approval", "Research", "Meeting"],
		"can_create_project": bool(PROJECT_MANAGER_ROLES & set(frappe.get_roles(frappe.session.user))),
	}


@frappe.whitelist()
def get_project_workspace(project: str):
	_require_login()
	project_doc = frappe.get_doc("Taskflow Project", project)
	project_doc.check_permission("read")
	tasks = frappe.get_list(
		"Taskflow Task",
		fields=[
			"name",
			"task_title",
			"project",
			"team",
			"assigned_by",
			"assigned_to",
			"assigned_to_user",
			"status",
			"priority",
			"task_type",
			"start_date",
			"due_date",
			"completed_on",
			"progress_percent",
			"estimated_hours",
			"actual_hours",
			"is_milestone",
			"is_blocked",
			"sequence",
			"description",
		],
		filters={"project": project},
		order_by="sequence asc, modified desc",
		limit_page_length=200,
	)
	return {
		"project": _serialize_project(project_doc, _get_project_task_counts([project])),
		"tasks": [_serialize_task(frappe.get_doc("Taskflow Task", task.name)) for task in tasks],
		"team_members": _get_team_member_options([project_doc.team]),
	}


@frappe.whitelist()
def save_project(payload: str):
	_require_login()
	data = frappe.parse_json(payload)
	name = data.get("name")
	team = data.get("team")

	if not team:
		frappe.throw(_("Team is required"))

	if not can_manage_team(frappe.session.user, team):
		frappe.throw(_("You are not allowed to manage projects for this team"), frappe.PermissionError)

	doc = frappe.get_doc("Taskflow Project", name) if name else frappe.new_doc("Taskflow Project")
	if name:
		doc.check_permission("write")

	for fieldname in [
		"project_name",
		"project_code",
		"team",
		"parent_project",
		"status",
		"priority",
		"start_date",
		"end_date",
		"expected_hours",
		"completion_percent",
		"project_lead",
		"description",
		"is_template",
		"is_archived",
	]:
		if fieldname in data:
			doc.set(fieldname, data.get(fieldname))

	doc.save(ignore_permissions=False)
	return {"name": doc.name}


@frappe.whitelist()
def save_task(payload: str):
	_require_login()
	data = frappe.parse_json(payload)
	name = data.get("name")

	doc = frappe.get_doc("Taskflow Task", name) if name else frappe.new_doc("Taskflow Task")
	if name:
		doc.check_permission("write")

	for fieldname in [
		"task_title",
		"project",
		"parent_task",
		"team",
		"assigned_to",
		"status",
		"priority",
		"task_type",
		"start_date",
		"due_date",
		"progress_percent",
		"estimated_hours",
		"actual_hours",
		"description",
		"is_milestone",
		"is_blocked",
		"sequence",
	]:
		if fieldname in data:
			doc.set(fieldname, data.get(fieldname))

	doc.save(ignore_permissions=False)
	return {"name": doc.name}
