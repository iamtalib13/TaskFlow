from __future__ import annotations

import frappe
from taskflow.taskflow.service.team_hierarchy import (
	build_name_filter_condition,
	get_accessible_teams,
	can_write_team,
	_has_global_access,
)


def _is_privileged_user(user: str) -> bool:
	return _has_global_access(user)


def get_project_member_projects(user: str | None = None) -> set[str]:
	"""Return names of projects where the user is explicitly listed in project_team_members with active read/write permission."""
	if not user:
		user = frappe.session.user

	user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	rows = frappe.get_all(
		"Taskflow Team Member",
		filters={"parenttype": "Taskflow Project", "is_active": 1},
		fields=["parent", "user", "employee", "read", "write"],
		ignore_permissions=True,
	)
	return {
		row.parent
		for row in rows
		if (row.user == user or (user_employee and row.employee == user_employee))
		and (getattr(row, "read", 1) in (1, True, "1", None) or getattr(row, "write", 1) in (1, True, "1", None))
	}


def is_project_member(user: str, project_name: str | None) -> bool:
	if not project_name:
		return False
	return project_name in get_user_accessible_projects(user)


def get_user_accessible_projects(user: str | None = None) -> set[str]:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return set(frappe.get_all("Taskflow Project", filters={"is_archived": 0}, pluck="name"))

	user_teams = get_accessible_teams(user)
	projects = set()

	# Rule 1: All Projects belonging to user's accessible Teams
	if user_teams:
		team_projects = frappe.get_all(
			"Taskflow Project",
			filters={"team": ["in", list(user_teams)], "is_archived": 0},
			pluck="name",
		)
		projects.update(team_projects)

	# Rule 2: Projects where user is directly added in project_team_members
	direct_projects = get_project_member_projects(user)
	if direct_projects:
		projects.update(direct_projects)

	# Rule 3: Projects where user is project_lead or project_lead_user
	user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if user_employee:
		lead_projects = frappe.get_all(
			"Taskflow Project",
			filters={"project_lead": user_employee, "is_archived": 0},
			pluck="name",
		)
		projects.update(lead_projects)

	lead_user_projects = frappe.get_all(
		"Taskflow Project",
		filters={"project_lead_user": user, "is_archived": 0},
		pluck="name",
	)
	projects.update(lead_user_projects)

	return projects


def get_user_accessible_tasks(user: str | None = None) -> set[str]:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return set(frappe.get_all("Taskflow Task", pluck="name"))

	user_teams = get_accessible_teams(user)
	user_projects = get_user_accessible_projects(user)
	tasks = set()

	# Rule 1: Tasks belonging to user's accessible Teams
	if user_teams:
		team_tasks = frappe.get_all(
			"Taskflow Task",
			filters={"team": ["in", list(user_teams)]},
			pluck="name",
		)
		tasks.update(team_tasks)

	# Rule 2: Tasks belonging to user's accessible Projects
	if user_projects:
		proj_tasks = frappe.get_all(
			"Taskflow Task",
			filters={"project": ["in", list(user_projects)]},
			pluck="name",
		)
		tasks.update(proj_tasks)

	# Rule 3: Directly assigned, created, or guided tasks
	user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if user_employee:
		assigned_rows = frappe.get_all(
			"Task Assignment",
			filters={"user_id": user_employee},
			pluck="parent",
		)
		tasks.update(assigned_rows)

	assignee_user_rows = frappe.get_all(
		"Task Assignment",
		filters={"user_id": user},
		pluck="parent",
	)
	tasks.update(assignee_user_rows)

	direct_tasks = frappe.get_all(
		"Taskflow Task",
		filters={"owner": user},
		pluck="name",
	)
	tasks.update(direct_tasks)

	guided_tasks = frappe.get_all(
		"Taskflow Task",
		filters={"guided_by": user},
		pluck="name",
	)
	tasks.update(guided_tasks)

	if user_employee:
		assigned_emp_tasks = frappe.get_all(
			"Taskflow Task",
			filters={"assigned_to": user_employee},
			pluck="name",
		)
		tasks.update(assigned_emp_tasks)

	return tasks


def can_write_project(user: str, project_name: str | None) -> bool:
	if not user or user == "Guest" or not project_name:
		return False

	if _is_privileged_user(user):
		return True

	proj = frappe.db.get_value("Taskflow Project", project_name, ["team", "project_lead", "project_lead_user"], as_dict=True)
	if not proj:
		return False

	user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if (user_employee and proj.project_lead == user_employee) or proj.project_lead_user == user:
		return True

	if proj.team and can_write_team(user, proj.team):
		return True

	pm_rows = frappe.get_all(
		"Taskflow Team Member",
		filters={"parent": project_name, "parenttype": "Taskflow Project", "is_active": 1},
		fields=["user", "employee", "write"],
	)
	for r in pm_rows:
		if (r.user == user or (user_employee and r.employee == user_employee)) and getattr(r, "write", 1) in (1, True, "1"):
			return True

	return False


def can_write_task(user: str, task_name: str | None) -> bool:
	if not user or user == "Guest" or not task_name:
		return False

	if _is_privileged_user(user):
		return True

	task_doc = frappe.db.get_value("Taskflow Task", task_name, ["team", "project", "owner", "assigned_to", "assigned_by", "guided_by"], as_dict=True)
	if not task_doc:
		return False

	user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")

	if task_doc.owner == user or task_doc.assigned_by == user or task_doc.guided_by == user:
		return True
	if user_employee and task_doc.assigned_to == user_employee:
		return True

	if task_doc.project and can_write_project(user, task_doc.project):
		return True
	if task_doc.team and can_write_team(user, task_doc.team):
		return True

	return False


def get_project_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_projects = get_user_accessible_projects(user)
	return build_name_filter_condition("Taskflow Project", "name", accessible_projects)


def get_task_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_tasks = get_user_accessible_tasks(user)
	return build_name_filter_condition("Taskflow Task", "name", accessible_tasks)


def get_team_permission_condition(user: str) -> str:
	if not user:
		user = frappe.session.user

	if _is_privileged_user(user):
		return ""

	accessible_teams = get_accessible_teams(user)
	return build_name_filter_condition("Taskflow Team", "name", accessible_teams)
