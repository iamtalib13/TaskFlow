from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt

TEAM_FIELDS = [
    "name",
    "team_name",
    "team_code",
    "company",
    "is_active",
    "parent_team",
    "team_lead",
    "visibility_scope",
    "allow_cross_team_collaboration",
    "description",
]

PROJECT_FIELDS = [
    "name",
    "project_name",
    "project_code",
    "team",
    "status",
    "priority",
    "project_lead",
    "project_lead_user",
    "completion_percent",
    "start_date",
    "end_date",
    "expected_hours",
    "is_template",
    "is_archived",
    "description",
]

TEAM_WRITE_FIELDS = {
    "team_name",
    "team_code",
    "company",
    "is_active",
    "parent_team",
    "team_lead",
    "visibility_scope",
    "allow_cross_team_collaboration",
    "description",
}

PROJECT_WRITE_FIELDS = {
    "project_name",
    "project_code",
    "team",
    "parent_project",
    "status",
    "priority",
    "project_lead",
    "completion_percent",
    "start_date",
    "end_date",
    "expected_hours",
    "is_template",
    "is_archived",
    "description",
}

TASK_FIELDS = [
    "name",
    "task_title",
    "project",
    "team",
    "assigned_to",
    "assigned_to_user",
    "_assign",
    "status",
    "priority",
    "task_type",
    "start_date",
    "due_date",
    "estimated_completion_date",
    "completed_on",
    "progress_percent",
    "estimated_hours",
    "actual_hours",
    "is_milestone",
    "is_blocked",
    "sequence",
    "description",
    "creation",
    "modified",
]

TASK_WRITE_FIELDS = {
    "task_title",
    "project",
    "team",
    "parent_task",
    "assigned_by",
    "assigned_to",
    "_assign",
    "status",
    "priority",
    "task_type",
    "start_date",
    "due_date",
    "estimated_completion_date",
    "completed_on",
    "sequence",
    "progress_percent",
    "estimated_hours",
    "actual_hours",
    "is_milestone",
    "is_blocked",
    "description",
}


def _require_login() -> None:
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)


def _as_text(value: Any) -> str:
    return "" if value in (None, "") else str(value).strip()


def _parse_payload(payload: str) -> dict[str, Any]:
    data = frappe.parse_json(payload) if payload else {}
    if not isinstance(data, dict):
        frappe.throw(_("Invalid payload"), frappe.ValidationError)
    return data


def _project_counts() -> dict[str, dict[str, int]]:
    rows = frappe.db.sql(
        """
        SELECT
            project,
            COUNT(*) AS task_count,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
            SUM(CASE WHEN status NOT IN ('Completed', 'Cancelled') THEN 1 ELSE 0 END) AS open_count
        FROM `tabTaskflow Task`
        GROUP BY project
        """,
        as_dict=True,
    )
    return {
        row.project: {
            "task_count": frappe.utils.cint(row.task_count),
            "completed_count": frappe.utils.cint(row.completed_count),
            "open_count": frappe.utils.cint(row.open_count),
        }
        for row in rows
        if row.project
    }


def _team_member_counts() -> dict[str, int]:
    rows = frappe.db.sql(
        """
        SELECT parent AS team, COUNT(*) AS member_count
        FROM `tabTaskflow Team Member`
        WHERE is_active = 1
        GROUP BY parent
        """,
        as_dict=True,
    )
    return {row.team: frappe.utils.cint(row.member_count) for row in rows if row.team}


def _team_project_counts() -> dict[str, int]:
    rows = frappe.db.sql(
        """
        SELECT team, COUNT(*) AS project_count
        FROM `tabTaskflow Project`
        WHERE IFNULL(is_archived, 0) = 0
        GROUP BY team
        """,
        as_dict=True,
    )
    return {row.team: frappe.utils.cint(row.project_count) for row in rows if row.team}


def _project_member_counts() -> dict[str, int]:
    rows = frappe.db.sql(
        """
        SELECT parent AS project, COUNT(*) AS member_count
        FROM `tabTaskflow Team Member`
        WHERE parenttype = 'Taskflow Project'
        GROUP BY parent
        """,
        as_dict=True,
    )
    return {row.project: frappe.utils.cint(row.member_count) for row in rows if row.project}


def _team_name_map(team_rows: list[dict[str, Any]]) -> dict[str, str]:
    return {row["name"]: row["team_name"] or row["name"] for row in team_rows}


def _bulk_employee_details(employee_ids: list[str]) -> dict[str, dict[str, Any]]:
    employee_ids = [employee_id for employee_id in employee_ids if employee_id]
    if not employee_ids:
        return {}

    rows = frappe.get_all(
        "Employee",
        filters={"name": ["in", list(dict.fromkeys(employee_ids))]},
        fields=["name", "employee_name", "user_id"],
    )
    return {
        row.name: {"employee_name": row.employee_name, "user_id": row.user_id}
        for row in rows
    }


def _bulk_user_images(user_ids: list[str]) -> dict[str, str | None]:
    user_ids = [user_id for user_id in user_ids if user_id]
    if not user_ids:
        return {}

    rows = frappe.get_all(
        "User",
        filters={"name": ["in", list(dict.fromkeys(user_ids))]},
        fields=["name", "user_image"],
    )
    return {row.name: row.user_image for row in rows}


def _team_assignee_options(team_names: list[str]) -> list[dict[str, Any]]:
    team_names = [team_name for team_name in team_names if team_name]
    if not team_names:
        return []

    member_rows = frappe.get_all(
        "Taskflow Team Member",
        filters={"parent": ["in", list(dict.fromkeys(team_names))], "is_active": 1},
        fields=["parent as team", "employee", "team_role"],
        order_by="parent asc, idx asc",
    )
    employee_details = _bulk_employee_details([row.employee for row in member_rows if row.employee])
    user_images = _bulk_user_images(
        [details.get("user_id") for details in employee_details.values() if details.get("user_id")]
    )

    options = []
    seen_employees: set[str] = set()
    for row in member_rows:
        if not row.employee or row.employee in seen_employees:
            continue
        seen_employees.add(row.employee)
        details = employee_details.get(row.employee, {})
        user_id = details.get("user_id")
        options.append(
            {
                "value": row.employee,
                "label": details.get("employee_name") or row.employee,
                "team": row.team,
                "team_role": row.team_role,
                "user": user_id,
                "user_image": user_images.get(user_id),
            }
        )
    return options


def _serialize_team(row: dict[str, Any], member_counts: dict[str, int], project_counts: dict[str, int]) -> dict[str, Any]:
    return {
        "name": row["name"],
        "team_name": row["team_name"],
        "team_code": row["team_code"],
        "company": row.get("company"),
        "is_active": frappe.utils.cint(row.get("is_active")),
        "parent_team": row.get("parent_team"),
        "team_lead": row.get("team_lead"),
        "visibility_scope": row.get("visibility_scope"),
        "allow_cross_team_collaboration": frappe.utils.cint(row.get("allow_cross_team_collaboration")),
        "description": row.get("description"),
        "member_count": member_counts.get(row["name"], 0),
        "project_count": project_counts.get(row["name"], 0),
    }


def _serialize_task(
    row: dict[str, Any],
    project_map: dict[str, str],
    project_team_map: dict[str, str],
    employee_details_map: dict[str, dict[str, Any]],
    user_image_map: dict[str, str | None],
) -> dict[str, Any]:
    project_name = row.get("project")
    assigned_to = row.get("assigned_to")
    employee_details = employee_details_map.get(assigned_to, {})
    assigned_to_user = row.get("assigned_to_user") or employee_details.get("user_id")
    assigned_to_name = employee_details.get("employee_name") or assigned_to
    assigned_to_image = user_image_map.get(assigned_to_user)
    return {
        "name": row["name"],
        "task_title": row.get("task_title"),
        "project": project_name,
        "project_title": project_map.get(project_name, project_name),
        "team": row.get("team") or project_team_map.get(project_name),
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_to_name,
        "assigned_to_user": assigned_to_user,
        "assigned_to_image": assigned_to_image,
        "_assign": frappe.parse_json(row.get("_assign")) if row.get("_assign") else [],
        "status": row.get("status"),
        "priority": row.get("priority"),
        "task_type": row.get("task_type"),
        "start_date": row.get("start_date"),
        "due_date": row.get("due_date"),
        "estimated_completion_date": row.get("estimated_completion_date"),
        "completed_on": row.get("completed_on"),
        "progress_percent": frappe.utils.cint(row.get("progress_percent")),
        "estimated_hours": row.get("estimated_hours"),
        "actual_hours": row.get("actual_hours"),
        "is_milestone": frappe.utils.cint(row.get("is_milestone")),
        "is_blocked": frappe.utils.cint(row.get("is_blocked")),
        "sequence": row.get("sequence"),
        "description": row.get("description"),
        "creation": row.get("creation"),
        "modified": row.get("modified"),
    }


def _serialize_project(
    row: dict[str, Any],
    task_counts: dict[str, dict[str, int]],
    project_member_counts: dict[str, int],
    team_map: dict[str, str],
) -> dict[str, Any]:
    stats = task_counts.get(row["name"], {})
    return {
        "name": row["name"],
        "project_name": row["project_name"],
        "project_code": row["project_code"],
        "team": row.get("team"),
        "team_name": team_map.get(row.get("team"), row.get("team")),
        "status": row.get("status"),
        "priority": row.get("priority"),
        "project_lead": row.get("project_lead"),
        "project_lead_user": row.get("project_lead_user"),
        "completion_percent": frappe.utils.cint(row.get("completion_percent")),
        "start_date": row.get("start_date"),
        "end_date": row.get("end_date"),
        "expected_hours": row.get("expected_hours"),
        "is_template": frappe.utils.cint(row.get("is_template")),
        "is_archived": frappe.utils.cint(row.get("is_archived")),
        "description": row.get("description"),
        "task_count": stats.get("task_count", 0),
        "pending_task_count": stats.get("open_count", 0),
        "open_task_count": stats.get("open_count", 0),
        "completed_task_count": stats.get("completed_count", 0),
        "member_count": project_member_counts.get(row["name"], 0),
    }


def _build_project_filters(team: str | None, project: str | None, search: str | None) -> dict[str, Any]:
    filters: dict[str, Any] = {}
    team_name = _as_text(team)
    project_name = _as_text(project)
    search_text = _as_text(search)

    if team_name:
        filters["team"] = team_name
    if project_name:
        filters["name"] = project_name
    if search_text:
        filters["or_filters"] = [
            ["project_name", "like", f"%{search_text}%"],
            ["project_code", "like", f"%{search_text}%"],
        ]
    return filters


def _apply_fields(doc, payload: dict[str, Any], allowed_fields: set[str]) -> None:
    for field in allowed_fields:
        if field in payload:
            if field != "_assign":
                setattr(doc, field, payload[field])


def _current_user_info() -> dict[str, Any]:
    user = frappe.session.user
    details = frappe.db.get_value("User", user, ["full_name", "user_image", "email"], as_dict=True) or {}
    return {
        "name": user,
        "full_name": details.get("full_name") or user,
        "user_image": details.get("user_image"),
        "email": details.get("email") or user,
    }


@frappe.whitelist(methods=["GET", "POST"])
def get_workspace_bootstrap(team: str | None = None, project: str | None = None, search: str | None = None) -> dict[str, Any]:
    _require_login()

    team_rows = frappe.get_all(
        "Taskflow Team",
        fields=TEAM_FIELDS,
        filters={"is_active": 1},
        order_by="team_name asc",
    )
    team_member_counts = _team_member_counts()
    team_project_counts = _team_project_counts()
    team_map = _team_name_map(team_rows)

    resolved_team = _as_text(team)
    if resolved_team and resolved_team not in team_map:
        resolved_team = ""

    # Fetch all projects for sidebar navigation
    all_project_rows = frappe.get_all(
        "Taskflow Project",
        fields=PROJECT_FIELDS,
        filters={"is_archived": 0},
        order_by="modified desc",
    )
    
    # Filter projects for the specific workspace view
    project_filters = _build_project_filters(resolved_team, project, search)
    project_rows = frappe.get_all(
        "Taskflow Project",
        fields=PROJECT_FIELDS,
        filters=project_filters,
        order_by="modified desc",
    )

    task_counts = _project_counts()
    project_member_counts = _project_member_counts()

    tasks_filters: dict[str, Any] = {}
    if resolved_team:
        tasks_filters["team"] = resolved_team

    task_rows = frappe.get_all(
        "Taskflow Task",
        fields=TASK_FIELDS,
        filters=tasks_filters,
        order_by="sequence asc, modified desc",
    )

    project_map = {row["name"]: row["project_name"] or row["name"] for row in project_rows}
    all_project_map = {row["name"]: row["project_name"] or row["name"] for row in all_project_rows}
    
    project_team_map = {row["name"]: row.get("team") for row in project_rows}
    task_employee_details_map = _bulk_employee_details(
        [row.get("assigned_to") for row in task_rows if row.get("assigned_to")]
    )
    task_user_image_map = _bulk_user_images(
        [
            row.get("assigned_to_user") or task_employee_details_map.get(row.get("assigned_to"), {}).get("user_id")
            for row in task_rows
            if row.get("assigned_to") or row.get("assigned_to_user")
        ]
    )

    # All projects for sidebar
    all_projects = [
        _serialize_project(row, task_counts, project_member_counts, team_map)
        for row in all_project_rows
    ]
    all_projects.sort(
        key=lambda item: (-int(item.get("pending_task_count") or 0), item.get("project_name") or item.get("name") or ""),
    )

    # Filtered projects for workspace view
    projects = [
        _serialize_project(row, task_counts, project_member_counts, team_map)
        for row in project_rows
    ]
    projects.sort(
        key=lambda item: (-int(item.get("pending_task_count") or 0), item.get("project_name") or item.get("name") or ""),
    )
    teams = [
        _serialize_team(row, team_member_counts, team_project_counts)
        for row in team_rows
    ]

    resolved_project = _as_text(project)
    if resolved_project and not any(item["name"] == resolved_project for item in all_projects):
        resolved_project = ""

    selected_project_team = ""
    if resolved_project:
        selected_project_team = next(
            (row.get("team") for row in all_project_rows if row.get("name") == resolved_project),
            "",
        ) or ""

    assignee_team_names = [resolved_team or selected_project_team] if (resolved_team or selected_project_team) else [row["name"] for row in team_rows]
    assignee_options = _team_assignee_options(assignee_team_names)

    tasks = [
        _serialize_task(row, all_project_map, project_team_map, task_employee_details_map, task_user_image_map)
        for row in task_rows
    ]

    return {
        "teams": teams,
        "projects": all_projects, # Send all projects to sidebar
        "tasks": tasks,
        "task_assignee_options": assignee_options,
        "current_user": _current_user_info(),
        "selected_team": resolved_team,
        "selected_project": resolved_project,
        "summary": {
            "team_count": len(teams),
            "project_count": len(all_projects),
            "active_project_count": sum(1 for item in all_projects if not item["is_archived"]),
            "task_count": sum(item["task_count"] for item in all_projects),
        },
    }


@frappe.whitelist(methods=["POST"])
def create_team(payload: str) -> dict[str, Any]:
    _require_login()
    data = _parse_payload(payload)
    doc = frappe.new_doc("Taskflow Team")
    _apply_fields(doc, data, TEAM_WRITE_FIELDS)
    
    # Handle team_members child table
    team_members = data.get("team_members") or []
    for member in team_members:
        if member.get("user"):
            doc.append("team_members", {
                "user": member.get("user"),
                "team_role": member.get("team_role", "Team Member"),
                "access_level": member.get("access_level", "Operate"),
                "is_active": member.get("is_active", 1),
            })
    
    doc.insert(ignore_permissions=False)
    return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def update_team(name: str, payload: str) -> dict[str, Any]:
    _require_login()
    doc = frappe.get_doc("Taskflow Team", name)
    data = _parse_payload(payload)
    _apply_fields(doc, data, TEAM_WRITE_FIELDS)
    
    # Handle team_members child table
    team_members = data.get("team_members")
    if team_members is not None:
        doc.set("team_members", [])
        for member in team_members:
            if member.get("user"):
                doc.append("team_members", {
                    "user": member.get("user"),
                    "team_role": member.get("team_role", "Team Member"),
                    "access_level": member.get("access_level", "Operate"),
                    "is_active": member.get("is_active", 1),
                })
    
    doc.save(ignore_permissions=False)
    return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def delete_team(name: str) -> dict[str, Any]:
    _require_login()
    frappe.delete_doc("Taskflow Team", name, ignore_permissions=False)
    return {"name": name}


@frappe.whitelist(methods=["POST"])
def create_project(payload: str) -> dict[str, Any]:
    _require_login()
    data = _parse_payload(payload)
    doc = frappe.new_doc("Taskflow Project")
    _apply_fields(doc, data, PROJECT_WRITE_FIELDS)
    doc.insert(ignore_permissions=False)
    return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def update_project(name: str, payload: str) -> dict[str, Any]:
    _require_login()
    doc = frappe.get_doc("Taskflow Project", name)
    data = _parse_payload(payload)
    _apply_fields(doc, data, PROJECT_WRITE_FIELDS)
    doc.save(ignore_permissions=False)
    return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def delete_project(name: str) -> dict[str, Any]:
    _require_login()
    frappe.delete_doc("Taskflow Project", name, ignore_permissions=False)
    return {"name": name}


@frappe.whitelist(methods=["POST"])
def save_task(payload: str) -> dict[str, Any]:
    _require_login()
    data = _parse_payload(payload)
    name = _as_text(data.get("name"))
    if name:
        doc = frappe.get_doc("Taskflow Task", name)
        doc.check_permission("write")
    else:
        doc = frappe.new_doc("Taskflow Task")
        if not data.get("assigned_by"):
            data["assigned_by"] = frappe.session.user

    _apply_fields(doc, data, TASK_WRITE_FIELDS)
    if doc.is_new():
        doc.insert(ignore_permissions=False)
    else:
        doc.save(ignore_permissions=False)
        
    if "_assign" in data:
        _sync_assignments(doc, data.get("_assign"))

    return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def save_project(payload: str) -> dict[str, Any]:
    _require_login()
    data = _parse_payload(payload)
    name = _as_text(data.get("name"))
    if name:
        doc = frappe.get_doc("Taskflow Project", name)
        doc.check_permission("write")
    else:
        doc = frappe.new_doc("Taskflow Project")

    _apply_fields(doc, data, PROJECT_WRITE_FIELDS)
    if doc.is_new():
        doc.insert(ignore_permissions=False)
    else:
        doc.save(ignore_permissions=False)
    return {"name": doc.name}


def _sync_assignments(doc, new_assignees):
    if new_assignees is None:
        return
    if isinstance(new_assignees, str):
        new_assignees = frappe.parse_json(new_assignees)
    
    current_assignees = frappe.parse_json(doc._assign) if getattr(doc, "_assign", None) else []
    
    current_assignees = [u for u in current_assignees if u]
    new_assignees = [u for u in new_assignees if u]
    
    users_to_add = [u for u in new_assignees if u not in current_assignees]
    users_to_remove = [u for u in current_assignees if u not in new_assignees]
    
    from frappe.desk.form.assign_to import add as assign_to_add, remove as assign_to_remove
    
    for user in users_to_remove:
        try:
            assign_to_remove(doc.doctype, doc.name, user)
        except Exception:
            pass
            
    for user in users_to_add:
        try:
            assign_to_add({
                "assign_to": [user],
                "doctype": doc.doctype,
                "name": doc.name,
                "description": doc.task_title or doc.name,
            })
        except Exception:
            pass


@frappe.whitelist(methods=["POST"])
def bulk_insert_tasks() -> dict[str, Any]:
    """Bulk insert tasks from uploaded CSV or Excel file."""
    _require_login()
    
    files = frappe.request.files
    if not files:
        frappe.throw("No file uploaded. Please select a file.")
    
    if "file" not in files:
        frappe.throw("Invalid upload. Please try again.")
    
    file = files["file"]
    if not file.filename:
        frappe.throw("File has no name. Please try again.")
    
    filename = file.filename.lower()
    print(f"[Bulk Insert] Processing file: {filename}")
    
    if not (filename.endswith(".csv") or filename.endswith(".xlsx")):
        frappe.throw("Invalid file type. Please upload a CSV or Excel (.xlsx) file.")
    
    try:
        if filename.endswith(".csv"):
            rows = _parse_csv(file)
        else:
            rows = _parse_excel(file)
    except Exception as e:
        frappe.throw(f"Error parsing file: {str(e)}")
    
    if not rows:
        frappe.throw("No data found in the file.")
    
    # Debug: return raw data to see what's happening
    debug_info = {
        "total_rows": len(rows),
        "first_row_raw": [repr(h) for h in rows[0]] if rows else [],
        "all_rows_count": len(rows),
        "sample_rows": [[repr(v) for v in row[:3]] for row in rows[:5]],  # First 5 rows, first 3 cols
    }
    
    # Get header row and map to field names
    # Clean headers: strip whitespace, lowercase, replace spaces with underscores
    headers = []
    for h in rows[0]:
        # Convert to string and handle different types
        header_str = str(h) if h is not None else ""
        # Remove single quotes if present
        header_str = header_str.strip("'\"")
        cleaned = header_str.strip().lower()
        
        # Fix Quoted-Printable encoding: +AF8 = _, +AC0 = -
        import re
        cleaned = _decode_qp(cleaned)
        
        # Handle child table notation: table_gqbl.user_id → keep table_gqbl prefix
        if "." in cleaned:
            parts = cleaned.split(".", 1)
            table_name = parts[0].replace(" ", "_")
            field_name = parts[1].replace(" ", "_")
            cleaned = f"{table_name}.{field_name}"
        else:
            # Replace spaces and hyphens with underscores
            cleaned = cleaned.replace(" ", "_").replace("-", "_")
            # Remove any remaining special characters except underscore and dot
            cleaned = re.sub(r'[^a-z0-9_.]', '', cleaned)
            # Fix double underscores
            cleaned = re.sub(r'_+', '_', cleaned)
        headers.append(cleaned)
    
    debug_info["cleaned_headers"] = headers
    
    data_rows = rows[1:]
    
    # Valid fields for Taskflow Task
    valid_fields = {
        "task_title", "project", "team", "status", "priority", "task_type",
        "assigned_to", "start_date", "due_date", "completed_on", "description",
        "pending_from", "pending_with", "guided_by", "responsible_person",
        "estimated_hours", "actual_hours", "progress_percent", "is_milestone",
        "is_blocked", "sequence", "toll_id", "ticket_date", "ticket_id",
        "ticket_raised_by", "ticket_description", "expected_resolution_date",
        "estimated_completion_date", "parent_task",
    }
    
    # Map headers to valid field names
    # Handle table_gqbl.* prefixed headers (child table fields)
    field_map = []
    for header in headers:
        mapped = None
        # Direct match
        if header in valid_fields:
            mapped = header
        # Handle table_gqbl.user_id → assigned_to
        elif header.startswith("table_gqbl"):
            mapped = "assigned_to"
        # Handle child table notation: table_gqbl.user_id (before cleaning)
        field_map.append(mapped)
    
    debug_info["field_map"] = field_map
    
    created_tasks = []
    errors = []
    
    print(f"[Bulk Insert] Processing {len(data_rows)} data rows")
    print(f"[Bulk Insert] Header count: {len(headers)}")
    
    for idx, row in enumerate(data_rows, start=2):
        print(f"[Bulk Insert] Processing row {idx}: col_count={len(row)}, values={row}")
        try:
            task_data = {}
            for col_idx, field_name in enumerate(field_map):
                if field_name and col_idx < len(row):
                    value = str(row[col_idx]).strip() if row[col_idx] else ""
                    # Remove any remaining quotes
                    value = value.strip("'\"")
                    # Fix Quoted-Printable in values (dates, etc.)
                    value = _decode_qp(value)
                    if value:
                        task_data[field_name] = value
            
            print(f"[Bulk Insert] Row {idx} task_data: {task_data}")
            print(f"[Bulk Insert] Row {idx} all values by position:")
            for col_idx, val in enumerate(row):
                print(f"  col {col_idx}: {repr(val)}")
            
            if not task_data.get("task_title"):
                print(f"[Bulk Insert] Row {idx}: No task_title found!")
                errors.append(f"Row {idx}: Task title is required.")
                continue
            
            # Create task
            doc = frappe.new_doc("Taskflow Task")
            
            # Set basic fields
            for field in ["task_title", "project", "team", "status", "priority", "task_type",
                         "pending_from", "pending_with", "toll_id", "ticket_id", 
                         "ticket_raised_by", "ticket_description"]:
                if field in task_data:
                    doc.set(field, task_data[field])
            
            # Set date fields
            for field in ["start_date", "due_date", "completed_on", "expected_resolution_date", 
                         "estimated_completion_date", "ticket_date"]:
                if field in task_data:
                    doc.set(field, task_data[field])
            
            # Set numeric fields
            if "estimated_hours" in task_data:
                doc.estimated_hours = flt(task_data["estimated_hours"])
            if "actual_hours" in task_data:
                doc.actual_hours = flt(task_data["actual_hours"])
            if "progress_percent" in task_data:
                doc.progress_percent = flt(task_data["progress_percent"])
            if "sequence" in task_data:
                doc.sequence = int(task_data["sequence"])
            
            # Set check fields
            if "is_milestone" in task_data:
                doc.is_milestone = 1 if task_data["is_milestone"] in ["1", "Yes", "yes", "true"] else 0
            if "is_blocked" in task_data:
                doc.is_blocked = 1 if task_data["is_blocked"] in ["1", "Yes", "yes", "true"] else 0
            
            # Set description (handle HTML content)
            if "description" in task_data:
                doc.description = task_data["description"]
            
            # Handle assigned_to - save ALL values to table_gqbl child table
            if "assigned_to" in task_data:
                assigned_to_str = task_data["assigned_to"]
                # Split by comma and handle multiple users
                assigned_users = [u.strip() for u in assigned_to_str.split(",") if u.strip()]
                
                if assigned_users:
                    # Add all users to table_gqbl child table (NOT to assigned_to)
                    for user_id in assigned_users:
                        # Append @sahayog.com if not already an email
                        if "@" not in user_id:
                            user_id = f"{user_id}@sahayog.com"
                        doc.append("table_gqbl", {
                            "user_id": user_id,
                        })
            
            # Set default status if not provided
            if not doc.status:
                doc.status = "Open"
            if not doc.priority:
                doc.priority = "Medium"
            
            print(f"[Bulk Insert] Row {idx}: Inserting task: {task_data.get('task_title')}")
            doc.insert(ignore_permissions=True)
            print(f"[Bulk Insert] Row {idx}: Created task {doc.name}")
            created_tasks.append(doc.name)
            
        except Exception as e:
            print(f"[Bulk Insert] Row {idx}: ERROR - {str(e)}")
            errors.append(f"Row {idx}: {str(e)}")
    
    # Commit all created tasks
    if created_tasks:
        frappe.db.commit()
    
    message = f"Successfully created {len(created_tasks)} task(s)."
    if errors:
        message += f" {len(errors)} row(s) had errors."
    
    return {
        "message": message,
        "created_count": len(created_tasks),
        "error_count": len(errors),
        "created_tasks": created_tasks,
        "errors": errors,
        "debug": debug_info,
    }


def _decode_qp(text: str) -> str:
    """Decode Quoted-Printable-like encoding used in the CSV.
    Handles +AF8- → _, +AC0- → -, +ACI- → \", +IB0- → comma, +IBw- → \\, etc.
    """
    # Order matters: decode longer patterns first
    text = text.replace("+AF8-", "_").replace("+AF8_", "_")
    text = text.replace("+AC0-", "-").replace("+AC0_", "-")
    text = text.replace("+IB0-", ",").replace("+IB0_", ",")
    text = text.replace("+IBw-", "\\").replace("+IBw_", "\\")
    text = text.replace("+ACI-", '"').replace("+ACI_", '"')
    # Clean up: remove stray quote/backslash artifacts
    text = text.replace('\\"', '"').replace('"', '')
    text = text.replace("\\,", ",")
    return text


def _parse_csv(file) -> list[list[str]]:
    """Parse CSV file and return list of rows.
    
    Handles the file format where:
    - Each cell is individually wrapped in single quotes: 'val1','val2','val3'
    - Cells may contain commas inside quotes: '3130,3131' should stay as one cell
    - Values may have Quoted-Printable encoding: +AF8- → _, +AC0- → -
    """
    import re
    
    content = file.read()
    print(f"[Bulk Insert] File size: {len(content)} bytes")
    
    for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
        try:
            decoded = content.decode(encoding)
            print(f"[Bulk Insert] Decoded with {encoding}")
            break
        except (UnicodeDecodeError, AttributeError):
            continue
    else:
        decoded = content.decode("utf-8", errors="ignore")
    
    if decoded.startswith("\ufeff"):
        decoded = decoded[1:]
    
    decoded = decoded.replace("\r\n", "\n").replace("\r", "\n")
    
    print(f"[Bulk Insert] First 500 chars: {repr(decoded[:500])}")
    
    # Detect separator from first non-empty line
    lines = [l for l in decoded.split("\n") if l.strip()]
    if not lines:
        return []
    
    first_line = lines[0]
    tab_count = first_line.count("\t")
    comma_count = first_line.count(",")
    
    if tab_count > comma_count:
        separator = "\t"
        print(f"[Bulk Insert] Detected TAB separator ({tab_count} tabs)")
    else:
        separator = ","
        print(f"[Bulk Insert] Detected COMMA separator ({comma_count} commas)")
    
    rows = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Remove surrounding single quotes from entire line
        if line.startswith("'") and line.endswith("'"):
            line = line[1:-1]
        
        # Split by separator
        raw_cells = line.split(separator)
        
        # Merge cells that are inside single quotes (e.g., '3130,3131' split into '3130 and 3131')
        cells = []
        current_cell = None
        for cell in raw_cells:
            cell = cell.strip()
            if current_cell is not None:
                # We're inside a quoted value, keep appending
                current_cell += separator + cell
                if cell.endswith("'"):
                    # End of quoted value
                    current_cell = current_cell.rstrip("'").lstrip("'")
                    cells.append(current_cell)
                    current_cell = None
            elif cell.startswith("'") and not cell.endswith("'"):
                # Start of quoted value that contains separator
                current_cell = cell
            else:
                # Normal cell, strip quotes
                cell = cell.strip("'\"")
                cells.append(cell)
        
        # If we ended while inside a quoted value, add it
        if current_cell is not None:
            current_cell = current_cell.rstrip("'").lstrip("'")
            cells.append(current_cell)
        
        # Decode QP encoding in each cell
        cells = [_decode_qp(c) for c in cells]
        
        rows.append(cells)
    
    print(f"[Bulk Insert] Parsed {len(rows)} rows, {len(rows[0]) if rows else 0} cols")
    for i, row in enumerate(rows[:5]):
        print(f"[Bulk Insert] Row {i}: col_count={len(row)}, data={row}")
    
    return rows


def _parse_excel(file) -> list[list[str]]:
    """Parse Excel file and return list of rows."""
    try:
        import openpyxl
    except ImportError:
        frappe.throw("openpyxl is required to read Excel files.")
    
    wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
    ws = wb.active
    
    rows = []
    for row in ws.iter_rows(values_only=True):
        rows.append([str(cell) if cell is not None else "" for cell in row])
    
    wb.close()
    return rows


@frappe.whitelist(methods=["GET"])
def get_completed_tasks_by_date(user_id: str | None = None, date: str = "", date_type: str = "today") -> list[dict]:
    """Get completed tasks for a specific date.
    
    Args:
        user_id: Employee ID or User ID (optional - if empty, returns all)
        date: Date string (YYYY-MM-DD) for custom, ignored for today/yesterday
        date_type: 'today', 'yesterday', or 'custom'
    """
    from frappe.utils import today, add_to_date, getdate
    
    _require_login()
    
    if date_type == "today":
        target_date = getdate(today())
    elif date_type == "yesterday":
        target_date = getdate(add_to_date(today(), days=-1))
    else:
        target_date = getdate(date)
    
    filters = {
        "status": "Completed",
        "completed_on": ["between", [target_date, add_to_date(target_date, days=1)]],
    }
    
    if user_id:
        # Find tasks assigned to this user
        todo_task_names = frappe.get_all(
            "ToDo",
            filters={
                "allocated_to": user_id,
                "reference_type": "Taskflow Task",
                "status": ["!=", "Cancelled"],
            },
            pluck="reference_name",
        )
        child_task_names = frappe.get_all(
            "Task Assignment",
            filters={
                "user_id": user_id,
                "parenttype": "Taskflow Task",
            },
            pluck="parent",
        )
        task_names = list(set(todo_task_names + child_task_names))
        
        if not task_names:
            return []
        
        filters["name"] = ["in", task_names]
    
    tasks = frappe.get_list(
        "Taskflow Task",
        fields=[
            "name", "task_title", "project", "team", "status",
            "priority", "completed_on", "description",
        ],
        filters=filters,
        order_by="completed_on desc",
    )
    
    return tasks

