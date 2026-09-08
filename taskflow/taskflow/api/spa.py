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
		fields=["name", "project_name", "status"],
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
			fields=["reference_name", "comment_by", "content", "creation"],
			order_by="creation asc",
		)

	comments_map = {}
	for c in comments_raw:
		u_detail = user_map.get(c["comment_by"], {})
		comments_map.setdefault(c["reference_name"], []).append({
			"author": u_detail.get("full_name") or c["comment_by"],
			"time": frappe.utils.pretty_date(c["creation"]),
			"text": frappe.utils.strip_html(c["content"]) if c["content"] else "",
		})

	tasks = []
	for t in tasks_raw:
		assignee_rows = assignment_map.get(t["name"], [])
		assignee_users = [row["user_id"] for row in assignee_rows if row.get("user_id")]

		tasks.append({
			"id": t["name"],
			"title": t["task_title"] or t["name"],
			"project": t["project"] or "General",
			"status": t["status"] or "Open",
			"priority": t["priority"] or "Medium",
			"labels": [t["task_type"]] if t.get("task_type") else ["Task"],
			"assignees": assignee_users,
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
		for user_id in (assignee_list or []):
			if user_id:
				emp_name = frappe.db.get_value("User", user_id, "full_name") or user_id
				doc.append("table_gqbl", {
					"user_id": user_id,
					"employee_name": emp_name,
					"assigned_by": current_employee or None,
				})

	if is_new:
		doc.insert(ignore_permissions=False)
	else:
		doc.save(ignore_permissions=False)

	return {
		"id": doc.name,
		"name": doc.name,
		"title": doc.task_title,
		"project": doc.project or "",
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
		"assignees": [r.user_id for r in doc.get("table_gqbl", []) if r.user_id],
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
	doc.check_permission("delete")
	frappe.delete_doc("Taskflow Task", task_id, ignore_permissions=False)
	return {"success": True, "id": task_id}


@frappe.whitelist(methods=["POST"])
def add_task_comment(task_id: str, text: str) -> dict:
	_require_login()
	if not text or not text.strip():
		frappe.throw(_("Comment text cannot be empty"))

	doc = frappe.get_doc("Taskflow Task", task_id)
	doc.check_permission("read")
	comment = doc.add_comment("Comment", text.strip())

	author_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

	return {
		"author": author_name,
		"time": "Just now",
		"text": frappe.utils.strip_html(comment.content) if comment.content else text.strip(),
	}
