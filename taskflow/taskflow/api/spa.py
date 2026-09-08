import frappe
from frappe import _


def _require_login():
	if frappe.session.user == "Guest":
		frappe.throw(_("Authentication required"), frappe.AuthenticationError)


@frappe.whitelist(methods=["GET", "POST"])
def get_spa_bootstrap() -> dict:
	_require_login()
	current_user = frappe.session.user
	user_info = frappe.db.get_value(
		"User",
		current_user,
		["name", "full_name", "user_image"],
		as_dict=True,
	) or {"name": current_user, "full_name": current_user, "user_image": ""}

	# All active projects
	has_archived = frappe.db.has_column("Taskflow Project", "is_archived")
	project_filters = {"is_archived": 0} if has_archived else {}
	projects = frappe.get_all(
		"Taskflow Project",
		fields=["name", "project_name", "status", "team"],
		filters=project_filters,
		order_by="project_name asc",
	)

	# Active system users for assignment
	users = frappe.get_all(
		"User",
		filters={"enabled": 1, "user_type": "System User"},
		fields=["name", "full_name", "user_image"],
		order_by="full_name asc",
		limit=200,
	)
	user_map = {u["name"]: u for u in users}

	# Fetch tasks
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
		order_by="modified desc",
		limit=500,
	)

	# Fetch all child assignments from table_gqbl in one batch query
	task_names = [t["name"] for t in tasks_raw]
	assignments = []
	if task_names:
		assignments = frappe.get_all(
			"Task Assignment",
			filters={"parent": ["in", task_names], "parenttype": "Taskflow Task", "parentfield": "table_gqbl"},
			fields=["parent", "user_id", "employee_name"],
		)

	# Fetch user images for all assignees in one batch
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

	# Fetch comments
	comments_raw = []
	if task_names:
		comments_raw = frappe.get_all(
			"Comment",
			filters={
				"reference_doctype": "Taskflow Task",
				"reference_name": ["in", task_names],
				"comment_type": "Comment",
			},
			fields=["name", "reference_name", "comment_by", "content", "creation", "owner"],
			order_by="creation asc",
		)

	comments_map = {}
	for c in comments_raw:
		u_detail = user_map.get(c["comment_by"], {})
		comments_map.setdefault(c["reference_name"], []).append({
			"id": c["name"],
			"author": u_detail.get("full_name") or c["comment_by"],
			"author_email": c["comment_by"],
			"time": frappe.utils.pretty_date(c["creation"]),
			"creation": str(c["creation"]),
			"text": frappe.utils.strip_html(c["content"]) if c["content"] else "",
			"can_delete": (c.get("owner") == current_user or current_user == "Administrator"),
		})

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

		tasks.append({
			"id": t["name"],
			"title": t["task_title"] or t["name"],
			"project": t["project"] or "General",
			"team": t.get("team") or "",
			"status": t["status"] or "Open",
			"priority": t["priority"] or "Medium",
			"labels": [t["task_type"]] if t.get("task_type") else ["Task"],
			"assignees": assignee_list,
			"owner": t["owner"],
			"due": str(t["due_date"]) if t.get("due_date") else "",
			"creation": str(t["creation"]) if t.get("creation") else "",
			"age": frappe.utils.pretty_date(t["creation"]) if t.get("creation") else "",
			"modified": str(t["modified"]) if t.get("modified") else "",
			"modified_pretty": frappe.utils.pretty_date(t["modified"]) if t.get("modified") else "",
			"description": t.get("description") or "",
			"comments": comments_map.get(t["name"], []),
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
		})

	# Accessible teams and team members
	from taskflow.taskflow.service.team_hierarchy import get_accessible_teams
	accessible_teams = list(get_accessible_teams(current_user))
	teams_filter = {"name": ["in", accessible_teams]} if accessible_teams else {}
	teams_data = frappe.get_all(
		"Taskflow Team",
		filters=teams_filter,
		fields=["name", "team_name", "team_lead", "is_active"],
		order_by="team_name asc",
	)

	team_members_filter = {"is_active": 1}
	if accessible_teams:
		team_members_filter["parent"] = ["in", accessible_teams]

	team_members_raw = frappe.get_all(
		"Taskflow Team Member",
		filters=team_members_filter,
		fields=["name", "parent as team", "employee", "user", "team_role", "access_level", "is_active"],
	)
	emp_ids = [m["employee"] for m in team_members_raw if m.get("employee")]
	emp_map = {}
	if emp_ids:
		emps = frappe.get_all(
			"Employee",
			filters={"name": ["in", emp_ids]},
			fields=["name", "employee_name", "user_id", "image", "designation", "department"],
		)
		emp_map = {e["name"]: e for e in emps}

	team_members = []
	for m in team_members_raw:
		e_info = emp_map.get(m["employee"], {})
		team_members.append({
			"name": m["name"],
			"team": m["team"],
			"employee": m["employee"],
			"user": m.get("user") or e_info.get("user_id") or "",
			"employee_name": e_info.get("employee_name") or m["employee"],
			"user_image": e_info.get("image") or "",
			"designation": e_info.get("designation") or "",
			"department": e_info.get("department") or "",
			"team_role": m.get("team_role") or "Team Member",
			"access_level": m.get("access_level") or "Operate",
			"is_active": m.get("is_active", 1),
		})

	return {
		"me": {
			"email": user_info.get("name"),
			"name": user_info.get("full_name") or user_info.get("name"),
			"image": user_info.get("user_image") or "",
		},
		"projects": [
			{
				"name": p["name"],
				"display_name": p.get("project_name") or p["name"],
				"team": p.get("team") or "",
				"icon": "lucide-folder",
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
		"statuses": ["Open", "In Progress", "Review", "On Hold", "Completed", "Cancelled", "Overdue"],
		"priorities": ["Critical", "High", "Medium", "Low"],
		"tasks": tasks,
	}


@frappe.whitelist(methods=["POST"])
def save_task(payload: str = None, **kwargs) -> dict:
	_require_login()
	data = frappe.parse_json(payload) if payload else kwargs
	if not data:
		frappe.throw(_("No data provided"))

	task_id = data.get("id") or data.get("name")
	is_new = not task_id or task_id == "new"

	if is_new:
		doc = frappe.new_doc("Taskflow Task")
		title = data.get("title") or data.get("task_title")
		if not title:
			frappe.throw(_("Task Title is required"))
		doc.task_title = title
		doc.project = data.get("project") or None
		doc.status = data.get("status") or "Open"
		doc.priority = data.get("priority") or "Medium"
		doc.task_type = data.get("task_type") or (data.get("labels")[0] if data.get("labels") else "Task")
		doc.due_date = data.get("due") or data.get("due_date") or None
		doc.description = data.get("description") or ""
	else:
		doc = frappe.get_doc("Taskflow Task", task_id)
		doc.check_permission("write")

		if "title" in data or "task_title" in data:
			doc.task_title = data.get("title") or data.get("task_title")
		if "project" in data:
			doc.project = data.get("project") or None
		if "status" in data:
			doc.status = data.get("status")
		if "priority" in data:
			doc.priority = data.get("priority")
		if "task_type" in data:
			doc.task_type = data.get("task_type")
		elif "labels" in data and data.get("labels"):
			doc.task_type = data.get("labels")[0]
		if "due" in data or "due_date" in data:
			doc.due_date = data.get("due") or data.get("due_date") or None
		if "description" in data:
			doc.description = data.get("description")

	# Ensure valid team is assigned (mandatory for non-admin permission rules)
	candidate_team = data.get("team")
	if candidate_team and not frappe.db.exists("Taskflow Team", candidate_team):
		candidate_team = None

	if not candidate_team and doc.project:
		proj_team = frappe.db.get_value("Taskflow Project", doc.project, "team")
		if proj_team and frappe.db.exists("Taskflow Team", proj_team):
			candidate_team = proj_team

	if not candidate_team:
		from taskflow.taskflow.service.team_hierarchy import get_accessible_teams
		user_teams = [t for t in get_accessible_teams(frappe.session.user) if frappe.db.exists("Taskflow Team", t)]
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
	for f in direct_fields:
		if f in data:
			val = data[f]
			if f == "estimated_hours":
				val = float(val or 0)
			elif not val:
				val = None
			doc.set(f, val)

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
	doc = frappe.get_doc("Taskflow Task", task_id)
	user = frappe.session.user
	is_admin = user == "Administrator" or bool({"System Manager", "Taskflow Admin"} & set(frappe.get_roles(user)))
	if not is_admin:
		from taskflow.taskflow.service.team_hierarchy import can_manage_team
		if doc.owner != user and not can_manage_team(user, doc.team):
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

