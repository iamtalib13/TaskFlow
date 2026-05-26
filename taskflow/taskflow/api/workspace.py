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


@frappe.whitelist(methods=["GET"])
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

    project_filters = _build_project_filters(resolved_team, project, search)
    project_rows = frappe.get_all(
        "Taskflow Project",
        fields=PROJECT_FIELDS,
        filters=project_filters,
        order_by="modified desc",
    )

    task_counts = _project_counts()
    project_member_counts = _project_member_counts()

    projects = [
        _serialize_project(row, task_counts, project_member_counts, team_map)
        for row in project_rows
    ]
    teams = [
        _serialize_team(row, team_member_counts, team_project_counts)
        for row in team_rows
    ]

    resolved_project = _as_text(project)
    if resolved_project and not any(item["name"] == resolved_project for item in projects):
        resolved_project = ""

    return {
        "teams": teams,
        "projects": projects,
        "selected_team": resolved_team,
        "selected_project": resolved_project,
        "summary": {
            "team_count": len(teams),
            "project_count": len(projects),
            "active_project_count": sum(1 for item in projects if not item["is_archived"]),
            "task_count": sum(item["task_count"] for item in projects),
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
