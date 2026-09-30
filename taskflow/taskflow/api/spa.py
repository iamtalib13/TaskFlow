import frappe
import json
from frappe import _


from taskflow.taskflow.service.team_hierarchy import (
	get_accessible_teams,
	get_user_team_memberships,
	can_write_team,
	_has_global_access,
)
from taskflow.taskflow.service.project_access import (
	get_user_accessible_projects,
	get_user_accessible_tasks,
	can_write_project,
	can_write_task,
)


def _require_login():
	if frappe.session.user == "Guest":
		frappe.throw(_("Authentication required"), frappe.AuthenticationError)


@frappe.whitelist(methods=["GET", "POST"])
def get_spa_bootstrap() -> dict:
	_require_login()
	current_user = frappe.session.user
	is_admin = _has_global_access(current_user)

	user_info = frappe.db.get_value(
		"User",
		current_user,
		["name", "full_name", "user_image"],
		as_dict=True,
	) or {"name": current_user, "full_name": current_user, "user_image": ""}

	user_emp = frappe.db.get_value("Employee", {"user_id": current_user}, ["name", "image"], as_dict=True)
	if not user_info.get("user_image") and user_emp and user_emp.get("image"):
		user_info["user_image"] = user_emp.get("image")
	user_emp_name = user_emp.get("name") if user_emp else None

	# 1. Accessible Teams & Writable Teams
	if is_admin:
		teams_data_raw = frappe.get_all(
			"Taskflow Team",
			filters={"is_active": 1},
			fields=["name", "team_name", "team_lead", "is_active"],
			order_by="team_name asc",
		)
		accessible_teams = [tm["name"] for tm in teams_data_raw]
		writable_teams = set(accessible_teams)
	else:
		accessible_teams = list(get_accessible_teams(current_user))
		teams_filter = {"name": ["in", accessible_teams], "is_active": 1} if accessible_teams else {"name": "__missing__"}
		teams_data_raw = frappe.get_all(
			"Taskflow Team",
			filters=teams_filter,
			fields=["name", "team_name", "team_lead", "is_active"],
			order_by="team_name asc",
		)
		writable_teams = set()
		if user_emp_name:
			for tm in teams_data_raw:
				if tm.get("team_lead") == user_emp_name:
					writable_teams.add(tm["name"])
		user_memberships = get_user_team_memberships(current_user)
		for m in user_memberships:
			if getattr(m, "write", 1) in (1, True, "1"):
				writable_teams.add(m.team)

	teams_data = [
		{
			"name": tm["name"],
			"team_name": tm["team_name"],
			"team_lead": tm.get("team_lead"),
			"is_active": tm.get("is_active"),
			"can_write": is_admin or (tm["name"] in writable_teams),
		}
		for tm in teams_data_raw
	]

	# 2. Accessible Projects & Members
	has_archived = frappe.db.has_column("Taskflow Project", "is_archived")
	project_filters = {"is_archived": 0} if has_archived else {}

	if not is_admin:
		accessible_project_names = get_user_accessible_projects(current_user)
		project_filters["name"] = ["in", list(accessible_project_names)] if accessible_project_names else "__missing__"

	projects = frappe.get_all(
		"Taskflow Project",
		fields=[
			"name",
			"project_name",
			"status",
			"priority",
			"team",
			"project_lead",
			"project_lead_user",
			"completion_percent",
			"start_date",
			"end_date",
			"parent_project",
			"modified",
			"creation",
		],
		filters=project_filters,
		order_by="modified desc",
	)

	proj_names = [p["name"] for p in projects]
	proj_members_map = {}
	if proj_names:
		pm_raw = frappe.get_all(
			"Taskflow Team Member",
			filters={"parent": ["in", proj_names], "parenttype": "Taskflow Project", "parentfield": "project_team_members"},
			fields=["parent", "employee", "user", "read", "write", "team_role", "access_level", "is_active"],
		)
		for pm in pm_raw:
			proj_members_map.setdefault(pm["parent"], []).append(pm)

	if is_admin:
		writable_projects = set(proj_names)
	else:
		writable_projects = set()
		for p in projects:
			p_name = p["name"]
			if (user_emp_name and p.get("project_lead") == user_emp_name) or p.get("project_lead_user") == current_user:
				writable_projects.add(p_name)
			elif p.get("team") and p["team"] in writable_teams:
				writable_projects.add(p_name)
			else:
				for r in proj_members_map.get(p_name, []):
					if (r.get("user") == current_user or (user_emp_name and r.get("employee") == user_emp_name)) and getattr(r, "write", 1) in (1, True, "1"):
						writable_projects.add(p_name)
						break

	lead_ids = list({p["project_lead"] for p in projects if p.get("project_lead")})
	lead_map = {}
	if lead_ids:
		emp_leads = frappe.get_all(
			"Employee",
			filters={"name": ["in", lead_ids]},
			fields=["name", "employee_name", "user_id", "image"],
		)
		for e in emp_leads:
			info = {"name": e["employee_name"] or e["name"], "image": e.get("image") or ""}
			lead_map[e["name"]] = info
			if e.get("user_id"):
				lead_map[e["user_id"]] = info

	# 3. Active system users for assignment
	users = frappe.get_all(
		"User",
		filters={"enabled": 1, "user_type": "System User"},
		fields=["name", "full_name", "user_image"],
		order_by="full_name asc",
		limit=200,
	)

	# 4. Fetch tasks accessible to user
	task_filters = {}
	if not is_admin:
		accessible_task_names = get_user_accessible_tasks(current_user)
		task_filters["name"] = ["in", list(accessible_task_names)] if accessible_task_names else "__missing__"

	tasks_raw = frappe.get_all(
		"Taskflow Task",
		fields=[
			"name",
			"task_title",
			"project",
			"team",
			"status",
			"priority",
			"task_type",
			"due_date",
			"owner",
			"description",
			"modified",
			"creation",
			"pending_with",
			"pending_from",
			"guided_by",
			"responsible_person",
			"start_date",
			"expected_resolution_date",
			"completed_on",
			"estimated_hours",
			"ticket_date",
			"toll_id",
			"ticket_id",
			"ticket_raised_by",
			"ticket_description",
		],
		filters=task_filters,
		order_by="modified desc",
	)

	task_names = [t["name"] for t in tasks_raw]
	assignments = []
	if task_names:
		if len(task_names) > 500:
			all_assignments = frappe.get_all(
				"Task Assignment",
				filters={"parenttype": "Taskflow Task", "parentfield": "table_gqbl"},
				fields=["parent", "user_id", "employee_name"],
			)
			task_names_set = set(task_names)
			assignments = [a for a in all_assignments if a.get("parent") in task_names_set]
		else:
			assignments = frappe.get_all(
				"Task Assignment",
				filters={"parent": ["in", task_names], "parenttype": "Taskflow Task", "parentfield": "table_gqbl"},
				fields=["parent", "user_id", "employee_name"],
			)

	all_user_ids = list({a["user_id"] for a in assignments if a.get("user_id")})
	user_image_map = {}
	if all_user_ids:
		users_data = frappe.get_all(
			"User",
			filters={"name": ["in", all_user_ids]},
			fields=["name", "user_image", "full_name"],
		)
		user_image_map = {u["name"]: u for u in users_data}

	assignment_map = {}
	for a in assignments:
		assignment_map.setdefault(a["parent"], []).append(a)

	tasks = []
	for t in tasks_raw:
		assignee_rows = assignment_map.get(t["name"], [])
		assignee_list = []
		for row in assignee_rows:
			uid = row.get("user_id")
			if not uid:
				continue
			u_info = user_image_map.get(uid, {})
			assignee_list.append({
				"user_id": uid,
				"name": u_info.get("full_name") or row.get("employee_name") or uid,
				"image": u_info.get("user_image") or "",
			})

		if is_admin:
			can_write = True
		else:
			can_write = (
				t.get("owner") == current_user
				or t.get("assigned_by") == current_user
				or t.get("guided_by") == current_user
				or (user_emp_name and t.get("assigned_to") == user_emp_name)
				or (t.get("project") and t["project"] in writable_projects)
				or (t.get("team") and t["team"] in writable_teams)
			)

		tasks.append({
			"id": t["name"],
			"title": t["task_title"] or t["name"],
			"project": t["project"] or "General",
			"team": t.get("team") or "",
			"status": t["status"] or "Open",
			"priority": t["priority"] or "Medium",
			"task_type": t.get("task_type") or "Task",
			"labels": [t["task_type"]] if t.get("task_type") else ["Task"],
			"assignees": assignee_list,
			"owner": t["owner"],
			"due": str(t["due_date"]) if t.get("due_date") else "",
			"creation": str(t["creation"]) if t.get("creation") else "",
			"age": frappe.utils.pretty_date(t["creation"]) if t.get("creation") else "",
			"modified": str(t["modified"]) if t.get("modified") else "",
			"modified_pretty": frappe.utils.pretty_date(t["modified"]) if t.get("modified") else "",
			"description": t.get("description") or "",
			"comments": [],
			"attachments": [],
			"pending_with": t.get("pending_with") or "",
			"pending_from": str(t["pending_from"]) if t.get("pending_from") else "",
			"guided_by": t.get("guided_by") or "",
			"responsible_person": t.get("responsible_person") or "",
			"start_date": str(t["start_date"]) if t.get("start_date") else "",
			"expected_resolution_date": str(t["expected_resolution_date"]) if t.get("expected_resolution_date") else "",
			"completed_on": str(t["completed_on"]) if t.get("completed_on") else "",
			"estimated_hours": float(t.get("estimated_hours") or 0),
			"ticket_date": str(t["ticket_date"]) if t.get("ticket_date") else "",
			"toll_id": t.get("toll_id") or "",
			"ticket_id": t.get("ticket_id") or "",
			"ticket_raised_by": t.get("ticket_raised_by") or "",
			"ticket_description": t.get("ticket_description") or "",
			"can_write": can_write,
		})

	# 5. Team Members and Dashboard Members aggregation
	team_members_filter = {"is_active": 1}
	if not is_admin:
		team_members_filter["parent"] = ["in", accessible_teams] if accessible_teams else {"parent": "__missing__"}

	team_members_raw = frappe.get_all(
		"Taskflow Team Member",
		filters=team_members_filter,
		fields=["name", "parent as team", "employee", "user", "read", "write", "team_role", "access_level", "is_active"],
	)

	emp_ids = list({m["employee"] for m in team_members_raw if m.get("employee")})
	emp_map = {}
	if emp_ids:
		emps = frappe.get_all(
			"Employee",
			filters={"name": ["in", emp_ids]},
			fields=["name", "employee_name", "user_id", "image", "designation", "department"],
		)
		emp_map = {e["name"]: e for e in emps}

	team_members = []
	dashboard_members_dict = {}
	for m in team_members_raw:
		e_info = emp_map.get(m["employee"], {})
		u_id = m.get("user") or e_info.get("user_id") or ""
		emp_name = e_info.get("employee_name") or m["employee"]
		team_members.append({
			"name": m["name"],
			"team": m["team"],
			"employee": m["employee"],
			"user": u_id,
			"employee_name": emp_name,
			"user_image": e_info.get("image") or "",
			"designation": e_info.get("designation") or "",
			"department": e_info.get("department") or "",
			"read": getattr(m, "read", 1),
			"write": getattr(m, "write", 1),
			"team_role": m.get("team_role") or "Team Member",
			"access_level": m.get("access_level") or "Operate",
			"is_active": m.get("is_active", 1),
		})

		key = (u_id or m["employee"] or "").lower()
		if key:
			dm = dashboard_members_dict.setdefault(key, {
				"value": u_id or m["employee"],
				"label": emp_name or u_id or m["employee"],
				"employee": m["employee"] or "",
				"user": u_id,
				"image": e_info.get("image") or None,
				"designation": e_info.get("designation") or "",
				"teams": [],
			})
			if m["team"] and m["team"] not in dm["teams"]:
				dm["teams"].append(m["team"])

	dashboard_members = sorted(dashboard_members_dict.values(), key=lambda x: (x["label"] or "").lower())

	# Taskflow Settings
	pending_from_options = []
	try:
		if frappe.db.exists("DocType", "Taskflow Settings"):
			settings_doc = frappe.db.get_singles_dict("Taskflow Settings")
			pf_raw = settings_doc.get("pending_from") or ""
			if pf_raw:
				pending_from_options = [s.strip() for s in pf_raw.split("\n") if s.strip()]
	except Exception:
		pass

	return {
		"me": {
			"email": user_info.get("name"),
			"name": user_info.get("full_name") or user_info.get("name"),
			"image": user_info.get("user_image") or "",
			"is_admin": is_admin,
			"is_system_manager": "System Manager" in frappe.get_roles(current_user),
		},
		"projects": [
			{
				"name": p["name"],
				"display_name": p.get("project_name") or p["name"],
				"project_name": p.get("project_name") or p["name"],
				"status": p.get("status") or "Draft",
				"priority": p.get("priority") or "Medium",
				"team": p.get("team") or "",
				"project_lead": p.get("project_lead") or "",
				"project_lead_name": lead_map.get(p.get("project_lead"), {}).get("name") or p.get("project_lead") or "",
				"project_lead_image": lead_map.get(p.get("project_lead"), {}).get("image") or "",
				"completion_percent": p.get("completion_percent") or 0,
				"start_date": str(p.get("start_date")) if p.get("start_date") else "",
				"end_date": str(p.get("end_date")) if p.get("end_date") else "",
				"parent_project": p.get("parent_project") or "",
				"project_team_members": proj_members_map.get(p["name"], []),
				"modified": str(p.get("modified")) if p.get("modified") else "",
				"modified_pretty": frappe.utils.pretty_date(p["modified"]) if p.get("modified") else "",
				"icon": "lucide-folder",
				"can_write": is_admin or (p["name"] in writable_projects),
			}
			for p in projects
		],
		"people": [
			{
				"email": u["name"],
				"name": u.get("full_name") or u["name"],
				"image": u.get("user_image") or "",
			}
			for u in users
		],
		"teams": teams_data,
		"team_members": team_members,
		"dashboard_members": dashboard_members,
		"statuses": ["Open", "In Progress", "Review", "On Hold", "Completed", "Overdue"],
		"priorities": ["Critical", "High", "Medium", "Low"],
		"pending_from_options": pending_from_options,
		"tasks": tasks,
	}


def _parse_date(val):
	if not val:
		return None
	try:
		return frappe.utils.getdate(val)
	except Exception:
		return None

@frappe.whitelist(methods=["POST"])
@frappe.whitelist()
def save_project(payload: str = None, **kwargs) -> dict:
	_require_login()
	current_user = frappe.session.user
	if payload:
		data = json.loads(payload)
	else:
		data = frappe._dict(kwargs)

	existing_name = data.get("name")

	if existing_name and frappe.db.exists("Taskflow Project", existing_name):
		if not can_write_project(current_user, existing_name):
			frappe.throw(_("Not permitted to update project {0}").format(existing_name), frappe.PermissionError)
		doc = frappe.get_doc("Taskflow Project", existing_name)
		if "project_name" in data:
			doc.project_name = data["project_name"]
		if "team" in data:
			doc.team = data["team"]
		if "status" in data:
			doc.status = data["status"]
		if "priority" in data:
			doc.priority = data["priority"]
		if "project_lead" in data:
			doc.project_lead = data["project_lead"]
		if "start_date" in data:
			doc.start_date = _parse_date(data["start_date"])
		if "end_date" in data:
			doc.end_date = _parse_date(data["end_date"])
		if "parent_project" in data:
			doc.parent_project = data["parent_project"]
		if "project_team_members" in data:
			doc.project_team_members = []
			for m in data["project_team_members"]:
				doc.append("project_team_members", m)
		doc.save(ignore_permissions=True)
	else:
		candidate_team = data.get("team")
		if candidate_team and not can_write_team(current_user, candidate_team) and not _has_global_access(current_user):
			frappe.throw(_("Not permitted to create project under team {0}").format(candidate_team), frappe.PermissionError)
		doc = frappe.new_doc("Taskflow Project")
		if "start_date" in data:
			data["start_date"] = _parse_date(data["start_date"])
		if "end_date" in data:
			data["end_date"] = _parse_date(data["end_date"])
		doc.update(data)
		doc.save(ignore_permissions=True)

	if "child_projects" in data and doc.name:
		selected_children = set(data.get("child_projects") or [])
		curr_children = frappe.get_all("Taskflow Project", filters={"parent_project": doc.name}, pluck="name")
		for child_name in curr_children:
			if child_name not in selected_children:
				frappe.db.set_value("Taskflow Project", child_name, "parent_project", None)
		for child_name in selected_children:
			if child_name and child_name != doc.name and frappe.db.exists("Taskflow Project", child_name):
				frappe.db.set_value("Taskflow Project", child_name, "parent_project", doc.name)

	res = doc.as_dict()
	res["modified"] = str(doc.modified) if getattr(doc, "modified", None) else ""
	res["modified_pretty"] = frappe.utils.pretty_date(doc.modified) if getattr(doc, "modified", None) else "Just now"
	return res

@frappe.whitelist(methods=["POST"])
def delete_project(name: str = None, **kwargs) -> dict:
	_require_login()
	project_name = name or kwargs.get("name")
	if not project_name:
		frappe.throw(_("Project name is required"))
	if not frappe.db.exists("Taskflow Project", project_name):
		frappe.throw(_("Project not found"))
	if not can_write_project(frappe.session.user, project_name):
		frappe.throw(_("Not permitted to delete project {0}").format(project_name), frappe.PermissionError)
	frappe.delete_doc("Taskflow Project", project_name, ignore_permissions=True)
	return {"status": "ok", "deleted": project_name}

def _extract_str(val):
	if isinstance(val, dict):
		return val.get("value") or val.get("label") or ""
	return str(val).strip() if val is not None else ""


def _normalize_date(val):
	if not val:
		return None
	val_str = str(val).strip()
	if not val_str:
		return None
	try:
		from frappe.utils import getdate
		return getdate(val_str)
	except Exception:
		try:
			parts = val_str.replace("/", "-").split("-")
			if len(parts) == 3:
				if len(parts[0]) == 2 and len(parts[2]) == 4:
					return f"{parts[2]}-{parts[1]}-{parts[0]}"
				elif len(parts[0]) == 4:
					return f"{parts[0]}-{parts[1]}-{parts[2]}"
		except Exception:
			pass
		return None

@frappe.whitelist()
def save_task(payload: str = None, **kwargs) -> dict:
	_require_login()
	current_user = frappe.session.user
	data = frappe.parse_json(payload) if payload else kwargs
	if not data:
		frappe.throw(_("No data provided"))

	task_id = data.get("id") or data.get("name")
	is_new = not task_id or task_id == "new"

	if is_new:
		target_project = _extract_str(data.get("project")) or None
		target_team = _extract_str(data.get("team")) or None

		if not target_team:
			frappe.throw(_("Team is required to create a task"))
		if not target_project:
			frappe.throw(_("Project is required to create a task"))

		if frappe.db.exists("Taskflow Project", target_project):
			if not can_write_project(current_user, target_project):
				frappe.throw(_("Not permitted to create task in project {0}").format(target_project), frappe.PermissionError)
		elif frappe.db.exists("Taskflow Team", target_team):
			if not can_write_team(current_user, target_team):
				frappe.throw(_("Not permitted to create task in team {0}").format(target_team), frappe.PermissionError)
		elif not _has_global_access(current_user):
			user_projects = get_user_accessible_projects(current_user)
			user_teams = get_accessible_teams(current_user)
			writable_projects = [p for p in user_projects if can_write_project(current_user, p)]
			writable_teams = [t for t in user_teams if can_write_team(current_user, t)]
			if not writable_projects and not writable_teams:
				frappe.throw(_("You do not have write access to any Project or Team to create a task"), frappe.PermissionError)

		doc = frappe.new_doc("Taskflow Task")
		title = data.get("title") or data.get("task_title")
		if not title:
			frappe.throw(_("Task Title is required"))
		doc.task_title = title
		doc.project = target_project
		doc.status = _extract_str(data.get("status")) or "Open"
		doc.priority = _extract_str(data.get("priority")) or "Medium"
		raw_task_type = data.get("task_type") or (data.get("labels")[0] if data.get("labels") else "Task")
		doc.task_type = _extract_str(raw_task_type) or "Task"
		doc.due_date = _normalize_date(data.get("due") or data.get("due_date"))
		doc.description = data.get("description") or ""
	else:
		if not can_write_task(current_user, task_id):
			frappe.throw(_("Not permitted to edit task {0}").format(task_id), frappe.PermissionError)
		doc = frappe.get_doc("Taskflow Task", task_id)

		if "title" in data or "task_title" in data:
			doc.task_title = data.get("title") or data.get("task_title")
		if "project" in data:
			doc.project = _extract_str(data.get("project")) or None
		if "status" in data:
			doc.status = _extract_str(data.get("status")) or doc.status
		if "priority" in data:
			doc.priority = _extract_str(data.get("priority")) or doc.priority
		if "task_type" in data:
			doc.task_type = _extract_str(data.get("task_type")) or doc.task_type
		elif "labels" in data and data.get("labels"):
			doc.task_type = _extract_str(data.get("labels")[0])
		if "due" in data or "due_date" in data:
			doc.due_date = _normalize_date(data.get("due") or data.get("due_date"))
		if "description" in data:
			doc.description = data.get("description")

	# Ensure valid team is assigned (mandatory for non-admin permission rules)
	candidate_team = _extract_str(data.get("team")) or None
	if candidate_team and not frappe.db.exists("Taskflow Team", candidate_team):
		candidate_team = None

	if not candidate_team and doc.project:
		proj_team = frappe.db.get_value("Taskflow Project", doc.project, "team")
		if proj_team and frappe.db.exists("Taskflow Team", proj_team):
			candidate_team = proj_team

	if not candidate_team:
		user_teams = [t for t in get_accessible_teams(current_user) if frappe.db.exists("Taskflow Team", t)]
		if user_teams:
			candidate_team = user_teams[0]
		else:
			candidate_team = frappe.db.get_value("Taskflow Team", {"is_active": 1}, "name")

	doc.team = candidate_team

	# Save additional assignment, schedule, and ticket fields
	direct_fields = [
		"pending_with",
		"pending_from",
		"guided_by",
		"responsible_person",
		"start_date",
		"expected_resolution_date",
		"completed_on",
		"estimated_hours",
		"ticket_date",
		"toll_id",
		"ticket_id",
		"ticket_raised_by",
		"ticket_description",
	]
	date_fields = {"start_date", "due_date", "ticket_date", "expected_resolution_date"}
	for f in direct_fields:
		if f in data:
			val = data[f]
			if f == "estimated_hours":
				val = float(val or 0)
			elif f == "completed_on":
				if val:
					try:
						from frappe.utils import get_datetime
						val = get_datetime(val)
					except Exception:
						val = _normalize_date(val)
				else:
					val = None
			elif f in date_fields:
				val = _normalize_date(val)
			elif f == "guided_by" and val:
				user_id = None
				if isinstance(val, dict):
					val = val.get("value") or val.get("name") or val.get("user")
				val_str = str(val).strip()
				if val_str:
					if frappe.db.exists("User", val_str):
						user_id = val_str
					elif frappe.db.exists("Employee", val_str):
						user_id = frappe.db.get_value("Employee", val_str, "user_id")
					else:
						emp_user = frappe.db.get_value("Employee", {"employee_name": val_str}, "user_id")
						if emp_user and frappe.db.exists("User", emp_user):
							user_id = emp_user
						else:
							u_name = frappe.db.get_value("User", {"full_name": val_str}, "name")
							if u_name:
								user_id = u_name
				val = user_id
			elif not val:
				val = None
			doc.set(f, val)

	if doc.status == "Completed" and not doc.completed_on:
		doc.completed_on = frappe.utils.now_datetime()

	# Update multiple user assignment in table_gqbl
	if "assignees" in data:
		assignee_list = data.get("assignees")
		if isinstance(assignee_list, str):
			assignee_list = frappe.parse_json(assignee_list)

		current_employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
		doc.set("table_gqbl", [])
		first_emp = None
		for user_id in (assignee_list or []):
			if user_id:
				emp = None
				if frappe.db.exists("Employee", user_id):
					emp_recs = frappe.get_all("Employee", filters={"name": user_id}, fields=["name", "employee_name", "user_id"])
					if emp_recs:
						emp = emp_recs[0]
					actual_user = (emp.get("user_id") if emp else None) or user_id
					emp_name = (emp.get("employee_name") if emp else None) or user_id
				else:
					actual_user = user_id
					emp_records = frappe.get_all("Employee", filters={"user_id": user_id}, fields=["name", "employee_name", "user_id"])
					if emp_records:
						emp = emp_records[0]
						emp_name = emp.get("employee_name") or frappe.db.get_value("User", user_id, "full_name") or user_id
					else:
						emp_name = frappe.db.get_value("User", user_id, "full_name") or user_id

				doc.append("table_gqbl", {
					"user_id": actual_user,
					"employee_name": emp_name,
					"assigned_by": current_employee or None,
				})
				if not first_emp:
					first_emp = emp.get("name") if emp else frappe.db.get_value("Employee", {"user_id": actual_user}, "name")

		if doc.meta.has_field("assigned_to"):
			doc.assigned_to = first_emp

	if is_new:
		doc.insert(ignore_permissions=False)
	else:
		doc.save(ignore_permissions=False)

	doc_rows = doc.get("table_gqbl", [])
	doc_user_ids = [r.user_id for r in doc_rows if r.user_id]
	doc_user_image_map = {}
	if doc_user_ids:
		doc_users = frappe.get_all(
			"User",
			filters={"name": ["in", doc_user_ids]},
			fields=["name", "user_image", "full_name"],
		)
		doc_user_image_map = {u["name"]: u for u in doc_users}

	return {
		"id": doc.name,
		"name": doc.name,
		"title": doc.task_title,
		"project": doc.project or "",
		"team": doc.team or "",
		"status": doc.status,
		"priority": doc.priority,
		"task_type": doc.task_type or "Task",
		"labels": [doc.task_type] if doc.task_type else ["Task"],
		"due": str(doc.due_date) if doc.due_date else "",
		"creation": str(doc.creation) if getattr(doc, "creation", None) else "",
		"age": frappe.utils.pretty_date(doc.creation) if getattr(doc, "creation", None) else "Just now",
		"modified": str(doc.modified) if getattr(doc, "modified", None) else "",
		"modified_pretty": frappe.utils.pretty_date(doc.modified) if getattr(doc, "modified", None) else "Just now",
		"description": doc.description or "",
		"assignees": [
			{
				"user_id": r.user_id,
				"name": (doc_user_image_map.get(r.user_id, {}).get("full_name") or r.employee_name or r.user_id),
				"image": doc_user_image_map.get(r.user_id, {}).get("user_image") or "",
			}
			for r in doc_rows if r.user_id
		],
		"pending_with": doc.pending_with or "",
		"pending_from": str(doc.pending_from) if getattr(doc, "pending_from", None) else "",
		"guided_by": doc.guided_by or "",
		"responsible_person": doc.responsible_person or "",
		"start_date": str(doc.start_date) if getattr(doc, "start_date", None) else "",
		"expected_resolution_date": str(doc.expected_resolution_date) if getattr(doc, "expected_resolution_date", None) else "",
		"completed_on": str(doc.completed_on) if getattr(doc, "completed_on", None) else "",
		"estimated_hours": float(doc.estimated_hours or 0),
		"ticket_date": str(doc.ticket_date) if getattr(doc, "ticket_date", None) else "",
		"toll_id": doc.toll_id or "",
		"ticket_id": doc.ticket_id or "",
		"ticket_raised_by": doc.ticket_raised_by or "",
		"ticket_description": doc.ticket_description or "",
	}


@frappe.whitelist(methods=["POST"])
def delete_task(task_id: str) -> dict:
	_require_login()
	if not task_id:
		frappe.throw(_("Task ID is required"))
	user = frappe.session.user
	if not can_write_task(user, task_id):
		frappe.throw(_("Not permitted to delete this task"), frappe.PermissionError)

	frappe.delete_doc("Taskflow Task", task_id, ignore_permissions=True)
	return {"success": True, "id": task_id}


@frappe.whitelist(methods=["GET", "POST"])
def get_task_comments(task_id: str) -> list:
	_require_login()
	if not task_id:
		return []

	comments_raw = frappe.get_all(
		"Comment",
		filters={
			"reference_doctype": "Taskflow Task",
			"reference_name": task_id,
			"comment_type": "Comment",
		},
		fields=["name", "comment_by", "content", "creation", "owner"],
		order_by="creation asc",
	)

	current_user = frappe.session.user
	user_ids = list({c["comment_by"] for c in comments_raw if c.get("comment_by")})
	user_map = {}
	if user_ids:
		users = frappe.get_all("User", filters={"name": ["in", user_ids]}, fields=["name", "full_name", "user_image"])
		user_map = {u["name"]: u for u in users}

	comments = []
	for c in comments_raw:
		u = user_map.get(c["comment_by"], {})
		comments.append({
			"id": c["name"],
			"author": u.get("full_name") or c["comment_by"],
			"author_email": c["comment_by"],
			"time": frappe.utils.pretty_date(c["creation"]),
			"creation": str(c["creation"]),
			"text": frappe.utils.strip_html(c["content"]) if c["content"] else "",
			"can_delete": (c.get("owner") == current_user or current_user == "Administrator"),
			"can_edit": (c.get("owner") == current_user or current_user == "Administrator"),
			"is_current_user": (c["comment_by"] == current_user or c.get("owner") == current_user),
		})

	return comments


@frappe.whitelist(methods=["POST"])
def add_task_comment(task_id: str, text: str) -> dict:
	_require_login()
	if not text or not text.strip():
		frappe.throw(_("Comment text cannot be empty"))
	if not task_id:
		frappe.throw(_("Task ID is required"))

	doc = frappe.get_doc("Taskflow Task", task_id)
	doc.check_permission("read")
	comment = doc.add_comment("Comment", text.strip())

	author_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

	return {
		"id": comment.name,
		"author": author_name,
		"author_email": frappe.session.user,
		"time": "Just now",
		"creation": str(comment.creation) if getattr(comment, "creation", None) else "",
		"text": frappe.utils.strip_html(comment.content) if comment.content else text.strip(),
		"can_delete": True,
		"can_edit": True,
		"is_current_user": True,
	}


@frappe.whitelist(methods=["POST"])
def update_task_comment(comment_id: str, text: str) -> dict:
	_require_login()
	if not comment_id:
		frappe.throw(_("Comment ID is required"))
	if not text or not text.strip():
		frappe.throw(_("Comment text cannot be empty"))

	comment = frappe.get_doc("Comment", comment_id)
	current_user = frappe.session.user
	if comment.owner != current_user and current_user != "Administrator" and not frappe.has_permission("Comment", "write"):
		frappe.throw(_("Not permitted to update this comment"), frappe.PermissionError)

	comment.content = text.strip()
	comment.save(ignore_permissions=True)

	return {
		"success": True,
		"id": comment_id,
		"text": frappe.utils.strip_html(comment.content) if comment.content else text.strip(),
	}


@frappe.whitelist(methods=["POST"])
def delete_task_comment(comment_id: str) -> dict:
	_require_login()
	if not comment_id:
		frappe.throw(_("Comment ID is required"))

	comment = frappe.get_doc("Comment", comment_id)
	current_user = frappe.session.user
	if comment.owner != current_user and current_user != "Administrator" and not frappe.has_permission("Comment", "delete"):
		frappe.throw(_("Not permitted to delete this comment"), frappe.PermissionError)

	frappe.delete_doc("Comment", comment_id, ignore_permissions=True)
	return {"success": True, "id": comment_id}


@frappe.whitelist()
def get_task_attachments(task_id: str) -> list:
	_require_login()
	if not task_id:
		return []

	files = frappe.get_all(
		"File",
		filters={
			"attached_to_doctype": "Taskflow Task",
			"attached_to_name": task_id,
		},
		fields=["name", "file_name", "file_url", "file_size", "creation", "owner"],
		order_by="creation desc",
	)
	res = []
	for f in files:
		f_size = f.get("file_size") or 0
		if f_size > 1024 * 1024:
			size_str = f"{round(f_size / (1024 * 1024), 1)} MB"
		elif f_size > 1024:
			size_str = f"{round(f_size / 1024)} KB"
		elif f_size > 0:
			size_str = f"{f_size} B"
		else:
			size_str = ""

		fname = f.get("file_name") or f["name"]
		ext = fname.split(".")[-1].lower() if "." in fname else ""
		ftype = "Image" if ext in ["png", "jpg", "jpeg", "gif", "svg", "webp"] else ("PDF" if ext == "pdf" else "Document")
		res.append({
			"id": f["name"],
			"name": fname,
			"file_url": f.get("file_url") or "",
			"url": f.get("file_url") or "",
			"size": size_str,
			"type": ftype,
		})
	return res


@frappe.whitelist(methods=["POST"])
def delete_task_attachment(file_id: str) -> dict:
	_require_login()
	if not file_id:
		frappe.throw(_("File ID is required"))

	if frappe.db.exists("File", file_id):
		file_doc = frappe.get_doc("File", file_id)
		current_user = frappe.session.user
		is_admin = current_user == "Administrator" or bool({"System Manager", "Taskflow Admin"} & set(frappe.get_roles(current_user)))
		if not is_admin and file_doc.owner != current_user:
			if file_doc.attached_to_doctype == "Taskflow Task" and file_doc.attached_to_name:
				task_team = frappe.db.get_value("Taskflow Task", file_doc.attached_to_name, "team")
				from taskflow.taskflow.service.team_hierarchy import can_manage_team
				if not can_manage_team(current_user, task_team):
					frappe.throw(_("Not permitted to delete this attachment"), frappe.PermissionError)

		frappe.delete_doc("File", file_id, ignore_permissions=True)
	return {"success": True, "id": file_id}


