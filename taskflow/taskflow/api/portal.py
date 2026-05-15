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
TASK_STATUSES = ["Open", "In Progress", "Review", "On Hold", "Completed", "Cancelled"]


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
	
	# Fetch images
	user_ids = [row.user for row in rows if row.user]
	user_images = {}
	if user_ids:
		user_images = {
			u.name: u.user_image
			for u in frappe.get_all("User", filters={"name": ["in", user_ids]}, fields=["name", "user_image"])
		}

	for row in rows:
		member_options.append(
			{
				"team": row.parent,
				"employee": row.employee,
				"user": row.user,
				"user_image": user_images.get(row.user),
				"label": employee_names.get(row.employee) or row.user or row.employee,
				"team_role": row.team_role,
				"access_level": row.access_level,
			}
		)
	return member_options


def _serialize_project(project, task_counts: dict[str, dict] | None = None) -> dict:
	task_count = (task_counts or {}).get(project.name, {})
	
	# Fetch employee names
	employee_ids = [member.employee for member in project.get("project_team_members", []) if member.employee]
	employee_names = {}
	if employee_ids:
		rows = frappe.get_all("Employee", filters={"name": ["in", employee_ids]}, fields=["name", "employee_name"])
		employee_names = {row.name: row.employee_name for row in rows}

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
		"project_team_members": [
			{
				"employee": member.employee, 
				"employee_name": employee_names.get(member.employee, member.employee),
				"team_role": member.team_role
			}
			for member in project.get("project_team_members", [])
		],
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


def _serialize_task(task, project_map=None, user_image_map=None) -> dict:
	project_title = (project_map or {}).get(task.project)
	if not project_title and task.project:
		project_title = frappe.db.get_value("Taskflow Project", task.project, "project_name")

	assigned_to_image = (user_image_map or {}).get(task.assigned_to_user)
	if not assigned_to_image and task.assigned_to_user:
		assigned_to_image = frappe.db.get_value("User", task.assigned_to_user, "user_image")
		
	assigned_to_name = None
	if task.assigned_to:
		assigned_to_name = frappe.db.get_value("Employee", task.assigned_to, "employee_name")

	return {
		"name": task.name,
		"task_title": task.task_title,
		"project": task.project,
		"project_title": project_title,
		"team": task.team,
		"assigned_by": task.assigned_by,
		"assigned_to": task.assigned_to,
		"assigned_to_name": assigned_to_name,
		"assigned_to_user": task.assigned_to_user,
		"assigned_to_image": assigned_to_image,
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
		"modified": task.modified,
		"checklist": [
			{
				"name": item.name,
				"checklist_item": item.checklist_item,
				"is_completed": item.is_completed,
				"completed_by": item.completed_by,
				"completed_on": item.completed_on,
				"sequence": item.sequence,
			}
			for item in task.get("checklist", [])
		],
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
	project_map = {p.name: p.project_name for p in projects}
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
	
	user_ids = list(set([t.assigned_to_user for t in tasks if t.assigned_to_user]))
	user_images = frappe.get_all("User", filters={"name": ["in", user_ids]}, fields=["name", "user_image"])
	user_image_map = {u.name: u.user_image for u in user_images}

	project_docs = [frappe.get_doc("Taskflow Project", project.name) for project in projects]
	task_docs = [frappe.get_doc("Taskflow Task", task.name) for task in tasks]

	return {
		"user": _get_user_profile(),
		"teams": teams,
		"team_members": _get_team_member_options(team_names),
		"projects": [_serialize_project(project_doc, task_counts) for project_doc in project_docs],
		"tasks": [_serialize_task(task_doc, project_map, user_image_map) for task_doc in task_docs],
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
	
	user_ids = list(set([t.assigned_to_user for t in tasks if t.assigned_to_user]))
	user_images = frappe.get_all("User", filters={"name": ["in", user_ids]}, fields=["name", "user_image"])
	user_image_map = {u.name: u.user_image for u in user_images}
	project_map = {project_doc.name: project_doc.project_name}

	# Get project-specific members
	project_members = project_doc.project_team_members
	employees = {row.employee for row in project_members if row.employee}
	employee_data = {
		row.name: {"name": row.employee_name, "user": row.user_id}
		for row in frappe.get_all(
			"Employee",
			filters={"name": ["in", list(employees)]} if employees else {"name": "__missing__"},
			fields=["name", "employee_name", "user_id"],
		)
	}

	user_ids = [data["user"] for data in employee_data.values() if data["user"]]
	user_images = {}
	if user_ids:
		user_images = {
			u.name: u.user_image
			for u in frappe.get_all("User", filters={"name": ["in", user_ids]}, fields=["name", "user_image"])
		}

	team_member_data = []
	for member in project_members:
		emp_info = employee_data.get(member.employee, {})
		user_id = emp_info.get("user")
		team_member_data.append({
			"employee": member.employee,
			"user": user_id,
			"user_image": user_images.get(user_id) if user_id else None,
			"label": emp_info.get("name") or member.employee,
			"team_role": member.team_role,
		})

	return {
		"project": _serialize_project(project_doc, _get_project_task_counts([project])),
		"tasks": [_serialize_task(frappe.get_doc("Taskflow Task", task.name), project_map, user_image_map) for task in tasks],
		"team_members": team_member_data,
	}



@frappe.whitelist()
def get_dashboard_data(team: str = None):
	_require_login()
	
	# 1. Fetch projects for the team
	project_filters = {"is_archived": 0}
	if team and team != "all":
		project_filters["team"] = team
	projects = frappe.get_all("Taskflow Project", fields=["name"], filters=project_filters)
	project_names = [p.name for p in projects]
	
	# 2. Fetch members explicitly assigned to these projects
	member_assignments = []
	if project_names:
		member_assignments = frappe.get_all(
			"Taskflow Team Member",
			fields=["parent as project", "employee"],
			filters={"parent": ["in", project_names]}
		)
	
	assignments_by_emp = defaultdict(list)
	emp_ids = set()
	for row in member_assignments:
		assignments_by_emp[row.employee].append(row.project)
		emp_ids.add(row.employee)
	
	# 3. Fetch only those employees
	employees = []
	if emp_ids:
		employees = frappe.get_all(
			"Employee", 
			fields=["name", "employee_name"], 
			filters={"name": ["in", list(emp_ids)], "status": "Active"}
		)

	# 4. Fetch tasks
	tasks = frappe.get_all(
		"Taskflow Task",
		fields=["assigned_to", "project", "status", "due_date"],
		filters={"status": ["!=", "Completed"], "assigned_to": ["!=", ""]}
	)
	
	stats_by_emp_project = defaultdict(lambda: {"assigned": 0, "pending": 0, "overdue": 0})
	today = frappe.utils.nowdate()
	for t in tasks:
		if t.assigned_to and t.project:
			key = (t.assigned_to, t.project)
			stats_by_emp_project[key]["assigned"] += 1
			stats_by_emp_project[key]["pending"] += 1
			if t.due_date and frappe.utils.getdate(t.due_date) < frappe.utils.getdate(today):
				stats_by_emp_project[key]["overdue"] += 1

	global_team_data = []
	for emp in employees:
		projects_assigned = assignments_by_emp.get(emp.name, [])
		project_stats = []
		for p_name in projects_assigned:
			stats = stats_by_emp_project[(emp.name, p_name)]
			project_stats.append({
				"name": p_name,
				"assigned": stats["assigned"],
				"pending": stats["pending"],
				"overdue": stats["overdue"],
				"status": "Active"
			})

		global_team_data.append({
			"full_name": emp.employee_name,
			"employee": emp.name,
			"projects": projects_assigned,
			"project_stats": project_stats,
			"pending_tasks": sum(s["assigned"] for s in project_stats),
			"completed_tasks": 0,
		})

	return {"global_team_data": global_team_data}




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

	if "project_team_members" in data:
		doc.set("project_team_members", data.get("project_team_members"))

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

	if "checklist" in data:
		doc.set("checklist", data.get("checklist"))

	doc.save(ignore_permissions=False)
	return {"name": doc.name}


@frappe.whitelist()
def get_task_details(task: str):
	_require_login()
	doc = frappe.get_doc("Taskflow Task", task)
	doc.check_permission("read")
	
	comments = frappe.get_all(
		"Comment",
		filters={
			"reference_doctype": "Taskflow Task",
			"reference_name": task,
			"comment_type": "Comment"
		},
		fields=["name", "content", "owner", "comment_by", "creation"],
		order_by="creation desc"
	)
	
	# Fetch author full names
	author_ids = list(set([c.owner for c in comments]))
	authors = frappe.get_all("User", filters={"name": ["in", author_ids]}, fields=["name", "full_name", "user_image"])
	author_map = {a.name: a for a in authors}
	
	for c in comments:
		author = author_map.get(c.owner)
		c.author_name = author.full_name if author else c.comment_by or c.owner
		c.author_image = author.user_image if author else None

	return {
		"task": _serialize_task(doc),
		"comments": comments
	}


@frappe.whitelist()
def add_task_comment(task: str, content: str):
	_require_login()
	if not content:
		frappe.throw(_("Comment content is required"))
		
	doc = frappe.get_doc("Taskflow Task", task)
	doc.check_permission("read")
	
	comment = frappe.get_doc({
		"doctype": "Comment",
		"comment_type": "Comment",
		"reference_doctype": "Taskflow Task",
		"reference_name": task,
		"content": content,
		"comment_by": frappe.session.user
	}).insert(ignore_permissions=True)
	
	user_details = frappe.db.get_value("User", frappe.session.user, ["full_name", "user_image"], as_dict=True)
	
	return {
		"name": comment.name,
		"content": comment.content,
		"owner": comment.owner,
		"author_name": (user_details and user_details.full_name) or frappe.session.user,
		"author_image": (user_details and user_details.user_image),
		"creation": comment.creation
	}


@frappe.whitelist()
def get_team_workload_planner(team: str = None):
	_require_login()
	
	project_filters = {"is_archived": 0}
	if team and team != "all":
		project_filters["team"] = team
	
	projects = frappe.get_all("Taskflow Project", fields=["name", "project_name"], filters=project_filters)
	project_names = [p.name for p in projects]
	
	# Fetch only members belonging to the team if team is provided
	member_filters = {}
	if team and team != "all":
		member_filters = {"parent": team}
	
	team_members = frappe.get_all("Taskflow Team Member", filters=member_filters, fields=["employee"])
	employee_ids = list(set([m.employee for m in team_members]))
	
	employees = frappe.get_all("Employee", fields=["name", "employee_name"], filters={"name": ["in", employee_ids], "status": "Active"})
	
	member_assignments = frappe.get_all(
		"Taskflow Team Member",
		fields=["parent as project", "employee"],
		filters={"parent": ["in", project_names]} if project_names else {}
	)
	
	assignments_by_member = defaultdict(set)
	for row in member_assignments:
		if frappe.db.exists("Taskflow Project", row.project):
			assignments_by_member[row.employee].add(row.project)
		
	members_data = []
	for emp in employees:
		assignments = list(assignments_by_member[emp.name])
		workload = (len(assignments) / max(len(projects), 1)) * 100
		members_data.append({
			"employee": emp.name,
			"full_name": emp.employee_name,
			"workload": int(workload),
			"assignments": assignments
		})
		
	return {"members": members_data, "projects": [{"name": p.name, "project_name": p.project_name} for p in projects]}

@frappe.whitelist()
def update_task_sequences(sequences: str):
	_require_login()
	data = frappe.parse_json(sequences)
	for name, sequence in data.items():
		doc = frappe.get_doc("Taskflow Task", name)
		doc.check_permission("write")
		frappe.db.set_value("Taskflow Task", name, "sequence", sequence, update_modified=False)
	
	frappe.db.commit()
	return "ok"

@frappe.whitelist()
def search_employees(q: str):
	_require_login()
	filters = {}
	if q:
		filters = {"employee_name": ["like", f"%{q}%"]}
	
	employees = frappe.get_all(
		"Employee",
		filters=filters,
		fields=["name", "employee_name"],
		limit=10,
	)
	return [{"value": e.name, "label": e.employee_name} for e in employees]

@frappe.whitelist()
def toggle_team_member_assignment(employee: str, project: str):
	_require_login()
	doc = frappe.get_doc("Taskflow Project", project)
	
	# Check if assigned
	exists = False
	for m in doc.project_team_members:
		if m.employee == employee:
			doc.project_team_members.remove(m)
			exists = True
			break
	
	if not exists:
		doc.append("project_team_members", {"employee": employee, "team_role": "Team Member"})
	
	doc.save()
	return "ok"
