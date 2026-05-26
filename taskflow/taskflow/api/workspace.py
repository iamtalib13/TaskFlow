from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

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
    doc.insert(ignore_permissions=False)
    return {"name": doc.name}


@frappe.whitelist(methods=["POST"])
def update_team(name: str, payload: str) -> dict[str, Any]:
    _require_login()
    doc = frappe.get_doc("Taskflow Team", name)
    data = _parse_payload(payload)
    _apply_fields(doc, data, TEAM_WRITE_FIELDS)
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
    return {"name": doc.name}
