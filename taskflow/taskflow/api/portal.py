from __future__ import annotations

from collections import defaultdict
import json

import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, nowdate

from taskflow.permissions import (
    has_taskflow_project_permission,
    has_taskflow_task_permission,
    has_taskflow_team_permission,
)
from taskflow.taskflow.service.team_hierarchy import can_manage_team, can_operate_team
TASK_STATUSES = ["Open", "In Progress", "Review", "On Hold", "Completed", "Cancelled", "Overdue"]

_TASK_FIELDS = [
    "name",
    "task_title",
    "project",
    "team",
    "assigned_by",
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
    "pending_with",
    "guided_by",
    "ticket_date",
    "ticket_id",
    "ticket_raised_by",
    "ticket_description",
    "responsible_person",
    "toll_id",
    "expected_resolution_date",
    "creation",
    "owner",
    "modified_by",
    "modified",
]

_PROJECT_FIELDS = [
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
]

_ALLOWED_PROJECT_FIELDS = [
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
    "_attachment",
]

_ALLOWED_TASK_FIELDS = [
    "task_title",
    "project",
    "parent_task",
    "team",
    "assigned_to",
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
    "description",
    "is_milestone",
    "is_blocked",
    "sequence",
    "pending_with",
    "guided_by",
    "ticket_date",
    "ticket_id",
    "ticket_raised_by",
    "ticket_description",
    "responsible_person",
    "toll_id",
    "expected_resolution_date",
]


def _require_login() -> None:
    """Throw PermissionError for Guest users."""
    if frappe.session.user == "Guest":
        frappe.throw(_("Login required"), frappe.PermissionError)


def _bulk_employee_names(employee_ids: list[str]) -> dict[str, str]:
    """Return {employee_id: employee_name} map."""
    employee_ids = [employee_id for employee_id in employee_ids if employee_id]
    if not employee_ids:
        return {}

    rows = frappe.get_all(
        "Employee",
        filters={"name": ["in", list(dict.fromkeys(employee_ids))]},
        fields=["name", "employee_name"],
    )
    return {row.name: row.employee_name for row in rows}


def _bulk_employee_details(employee_ids: list[str]) -> dict[str, dict]:
    """Return {employee_id: {employee_name, user_id, company_email}} map."""
    employee_ids = [employee_id for employee_id in employee_ids if employee_id]
    if not employee_ids:
        return {}

    rows = frappe.get_all(
        "Employee",
        filters={"name": ["in", list(dict.fromkeys(employee_ids))]},
        fields=["name", "employee_name", "user_id", "company_email"],
    )
    return {
        row.name: {"employee_name": row.employee_name, "user_id": row.user_id, "company_email": row.company_email}
        for row in rows
    }


def _bulk_user_images(user_ids: list[str]) -> dict[str, str | None]:
    """Return {user_id: user_image} map."""
    user_ids = [user_id for user_id in user_ids if user_id]
    if not user_ids:
        return {}

    rows = frappe.get_all(
        "User",
        filters={"name": ["in", list(dict.fromkeys(user_ids))]},
        fields=["name", "user_image"],
    )
    return {row.name: row.user_image for row in rows}


def _get_user_profile() -> dict:
    """Return the current user's profile summary."""
    user = frappe.session.user
    details = (
        frappe.db.get_value("User", user, ["full_name", "user_image"], as_dict=True) or {}
    )
    return {
        "user": user,
        "full_name": details.get("full_name") or user,
        "user_image": details.get("user_image"),
        "roles": frappe.get_roles(user),
    }


def _get_accessible_teams() -> list[dict]:
    """Return all active teams with permission flags for the current user."""
    teams = frappe.get_list(
        "Taskflow Team",
        fields=["name", "team_name", "team_code", "team_lead", "visibility_scope", "is_active"],
        filters={"is_active": 1},
        order_by="team_name asc",
    )
    user = frappe.session.user

    return [
        {
            "name": team.name,
            "team_name": team.team_name,
            "team_code": team.team_code,
            "team_lead": team.team_lead,
            "visibility_scope": team.visibility_scope,
            "permissions": {
                "can_read": has_taskflow_team_permission(frappe.get_doc("Taskflow Team", team.name)),
                "can_manage": can_manage_team(user, team.name),
                "can_operate": can_operate_team(user, team.name),
            },
        }
        for team in teams
    ]


def _get_team_member_options(team_names: list[str]) -> list[dict]:
    """Bulk-fetch active members for the given teams."""
    if not team_names:
        return []

    rows = frappe.get_all(
        "Taskflow Team Member",
        filters={"parent": ["in", team_names], "is_active": 1},
        fields=["parent", "employee", "user", "team_role", "access_level"],
        order_by="idx asc",
    )

    employee_name_map = _bulk_employee_names([row.employee for row in rows if row.employee])
    user_image_map = _bulk_user_images([row.user for row in rows if row.user])

    return [
        {
            "team": row.parent,
            "employee": row.employee,
            "user": row.user,
            "user_image": user_image_map.get(row.user),
            "label": employee_name_map.get(row.employee) or row.user or row.employee,
            "team_role": row.team_role,
            "access_level": row.access_level,
        }
        for row in rows
    ]


def _get_project_task_counts(project_names: list[str]) -> dict[str, dict]:
    """Return {project: {total, open, completed}} in a single query."""
    if not project_names:
        return {}

    rows = frappe.get_all(
        "Taskflow Task",
        filters={"project": ["in", project_names]},
        fields=["project", "status"],
        limit_page_length=0,
    )
    counts: dict[str, dict] = defaultdict(lambda: {"total": 0, "open": 0, "completed": 0})
    for row in rows:
        counts[row.project]["total"] += 1
        if row.status == "Completed":
            counts[row.project]["completed"] += 1
        elif row.status != "Cancelled":
            counts[row.project]["open"] += 1
    return counts


def _serialize_project(
    project,
    task_counts: dict[str, dict] | None = None,
    employee_name_map: dict[str, str] | None = None,
) -> dict:
    """Serialize a Taskflow Project document."""
    members = project.get("project_team_members", [])
    if employee_name_map is None:
        employee_name_map = _bulk_employee_names([member.employee for member in members if member.employee])

    task_count = (task_counts or {}).get(project.name, {})
    user = frappe.session.user

    return {
        "name": project.name,
        "project_name": project.project_name,
        "project_code": getattr(project, "project_code", None),
        "team": project.team,
        "status": project.status,
        "priority": project.priority,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "expected_hours": project.expected_hours,
        "completion_percent": project.completion_percent,
        "project_lead": project.project_lead,
        "project_lead_user": project.project_lead_user,
        "description": project.description,
        "_attachment": getattr(project, "_attachment", None),
        "project_team_members": [
            {
                "employee": member.employee,
                "employee_name": employee_name_map.get(member.employee, member.employee),
                "team_role": member.team_role,
            }
            for member in members
        ],
        "total_tasks": task_count.get("total", 0),
        "open_tasks": task_count.get("open", 0),
        "completed_tasks": task_count.get("completed", 0),
        "permissions": {
            "can_read": has_taskflow_project_permission(project, user, "read"),
            "can_write": has_taskflow_project_permission(project, user, "write"),
            "can_manage_team": can_manage_team(user, project.team),
            "can_operate_team": can_operate_team(user, project.team),
        },
    }


_USER_DETAILS_CACHE = {}

def _get_user_details(user_id: str) -> tuple[str, str | None]:
    if not user_id:
        return "", None
    if user_id not in _USER_DETAILS_CACHE:
        try:
            row = frappe.db.get_value("User", user_id, ["full_name", "user_image"], as_dict=True)
            if row:
                _USER_DETAILS_CACHE[user_id] = (row.full_name or user_id, row.user_image)
            else:
                _USER_DETAILS_CACHE[user_id] = (user_id, None)
        except Exception:
            _USER_DETAILS_CACHE[user_id] = (user_id, None)
    return _USER_DETAILS_CACHE[user_id]


def _serialize_task(
    task,
    project_map: dict[str, str] | None = None,
    user_image_map: dict[str, str | None] | None = None,
    employee_name_map: dict[str, str] | None = None,
) -> dict:
    """Serialize a Taskflow Task document."""
    task_team = task.team
    if not task_team and task.project:
        task_team = frappe.db.get_value("Taskflow Project", task.project, "team")

    project_title = (project_map or {}).get(task.project)
    if not project_title and task.project:
        project_title = frappe.db.get_value("Taskflow Project", task.project, "project_name")

    assigned_to_image = (user_image_map or {}).get(task.assigned_to_user)
    if not assigned_to_image and task.assigned_to_user:
        assigned_to_image = frappe.db.get_value("User", task.assigned_to_user, "user_image")

    assigned_to_name = (employee_name_map or {}).get(task.assigned_to)
    if not assigned_to_name and task.assigned_to:
        assigned_to_name = frappe.db.get_value("Employee", task.assigned_to, "employee_name")

    owner_name, owner_image = _get_user_details(task.owner)
    modified_by_name, modified_by_image = _get_user_details(task.modified_by)
    guided_by_name, guided_by_image = _get_user_details(task.guided_by)

    return {
        "name": task.name,
        "task_title": task.task_title,
        "project": task.project,
        "project_title": project_title,
        "team": task_team,
        "assigned_by": task.assigned_by,
        "assigned_to": task.assigned_to,
        "assigned_to_name": assigned_to_name,
        "assigned_to_user": task.assigned_to_user,
        "assigned_to_image": assigned_to_image,
        "_assign": [row.user_id for row in task.get("table_gqbl", []) if row.user_id],
        "assignees": [
            {"user": row.user_id, "label": row.employee_name or row.user_id}
            for row in task.get("table_gqbl", [])
            if row.user_id
        ],
        "status": task.status,
        "priority": task.priority,
        "task_type": task.task_type,
        "start_date": task.start_date,
        "due_date": task.due_date,
        "estimated_completion_date": task.estimated_completion_date,
        "completed_on": task.completed_on,
        "completed_date": task.completed_on,
        "progress_percent": task.progress_percent,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "is_milestone": task.is_milestone,
        "is_blocked": task.is_blocked,
        "sequence": task.sequence,
        "description": task.description,
        "modified": task.modified,
        "creation": task.creation,
        "owner": task.owner,
        "owner_name": owner_name,
        "owner_image": owner_image,
        "modified_by": task.modified_by,
        "modified_by_name": modified_by_name,
        "modified_by_image": modified_by_image,
        "pending_with": task.pending_with,
        "guided_by": task.guided_by,
        "guided_by_name": guided_by_name,
        "ticket_date": task.ticket_date,
        "ticket_id": task.ticket_id,
        "ticket_raised_by": task.ticket_raised_by,
        "ticket_description": task.ticket_description,
        "responsible_person": task.responsible_person,
        "toll_id": task.toll_id,
        "expected_resolution_date": task.expected_resolution_date,
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


def _append_checklist_to_doc(doc, checklist_items: list[dict]) -> None:
    """Replace a task document's checklist child table."""
    doc.set("checklist", [])
    for item in checklist_items:
        doc.append(
            "checklist",
            {
                "checklist_item": item.get("checklist_item"),
                "is_completed": 1 if item.get("is_completed") else 0,
                "sequence": item.get("sequence"),
            },
        )


def _log_save_task_error(data: dict, error: Exception) -> None:
    """Log task save failures with enough context for checklist debugging."""
    error_context = {
        "user": frappe.session.user,
        "task": data.get("name"),
        "project": data.get("project"),
        "status": data.get("status"),
        "checklist_count": len(data.get("checklist") or []),
        "checklist": data.get("checklist"),
        "error": str(error),
    }
    frappe.log_error(
        message=f"{frappe.get_traceback()}\n\nChecklist save context:\n{json.dumps(error_context, default=str, indent=2)}",
        title="save_task error",
    )


@frappe.whitelist()
def get_portal_bootstrap() -> dict:
    """Return the Taskflow portal bootstrap payload."""
    _require_login()

    projects = frappe.get_list(
        "Taskflow Project",
        fields=_PROJECT_FIELDS,
        order_by="modified desc",
    )
    project_names = [project.name for project in projects]
    project_map = {project.name: project.project_name for project in projects}
    task_counts = _get_project_task_counts(project_names)

    teams = _get_accessible_teams()
    team_names = [team["name"] for team in teams]

    tasks = frappe.get_list(
        "Taskflow Task",
        fields=_TASK_FIELDS,
        filters={"project": ["in", project_names]} if project_names else {"name": "__missing__"},
        order_by="modified desc",
        limit_page_length=100,
    )

    task_docs = [frappe.get_doc("Taskflow Task", task.name) for task in tasks]
    project_docs = [frappe.get_doc("Taskflow Project", project.name) for project in projects]

    task_employee_name_map = _bulk_employee_names([task.assigned_to for task in tasks if task.assigned_to])
    task_user_image_map = _bulk_user_images([task.assigned_to_user for task in tasks if task.assigned_to_user])
    project_employee_name_map = _bulk_employee_names(
        [
            member.employee
            for project_doc in project_docs
            for member in project_doc.get("project_team_members", [])
            if member.employee
        ]
    )

    return {
        "user": _get_user_profile(),
        "teams": teams,
        "team_members": _get_team_member_options(team_names),
        "projects": [
            _serialize_project(project_doc, task_counts, project_employee_name_map)
            for project_doc in project_docs
        ],
        "tasks": [
            _serialize_task(task_doc, project_map, task_user_image_map, task_employee_name_map)
            for task_doc in task_docs
        ],
        "status_options": TASK_STATUSES,
        "priority_options": ["Low", "Medium", "High", "Critical"],
        "task_type_options": ["Task", "Bug", "Customization Request"],
        "can_create_project": bool(can_manage_team(frappe.session.user)),
    }


@frappe.whitelist()
def get_work_history_tasks(project=None, member=None, start=0, page_length=20) -> dict:
    """Return paginated completed tasks for work history view."""
    _require_login()
    filters = {"completed_on": ["is", "set"]}
    if project and isinstance(project, str):
        filters["project"] = project
    if member and isinstance(member, str) and member != "all":
        filters["assigned_to"] = member

    tasks = frappe.get_list(
        "Taskflow Task",
        fields=_TASK_FIELDS,
        filters=filters,
        order_by="completed_on desc",
        start=int(start),
        page_length=int(page_length),
    )

    task_docs = [frappe.get_doc("Taskflow Task", task.name) for task in tasks]

    project_names = list({task.project for task in task_docs if task.project})
    project_map = {}
    if project_names:
        for pname in project_names:
            project_map[pname] = frappe.db.get_value("Taskflow Project", pname, "project_name") or pname

    task_employee_name_map = _bulk_employee_names([task.assigned_to for task in task_docs if task.assigned_to])
    task_user_image_map = _bulk_user_images([task.assigned_to_user for task in task_docs if task.assigned_to_user])

    total = frappe.db.count("Taskflow Task", filters)

    return {
        "tasks": [
            _serialize_task(task_doc, project_map, task_user_image_map, task_employee_name_map)
            for task_doc in task_docs
        ],
        "has_more": int(start) + int(page_length) < total,
        "total": total,
    }


@frappe.whitelist()
def get_project_workspace(project: str) -> dict:
    """Return full workspace data for a single project."""
    _require_login()
    if not isinstance(project, str):
        frappe.throw(_("Invalid project identifier"), frappe.ValidationError)

    project_doc = frappe.get_doc("Taskflow Project", project)
    project_doc.check_permission("read")

    tasks = frappe.get_list(
        "Taskflow Task",
        fields=_TASK_FIELDS,
        filters={"project": project},
        order_by="sequence asc, modified desc",
        limit_page_length=200,
    )
    task_docs = [frappe.get_doc("Taskflow Task", task.name) for task in tasks]

    task_employee_name_map = _bulk_employee_names([task.assigned_to for task in tasks if task.assigned_to])
    task_user_image_map = _bulk_user_images([task.assigned_to_user for task in tasks if task.assigned_to_user])

    project_members = project_doc.get("project_team_members", [])
    employee_details = _bulk_employee_details([member.employee for member in project_members if member.employee])
    member_user_image_map = _bulk_user_images(
        [details["user_id"] for details in employee_details.values() if details.get("user_id")]
    )

    team_member_data = [
        {
            "employee": member.employee,
            "user": employee_details.get(member.employee, {}).get("user_id"),
            "user_image": member_user_image_map.get(employee_details.get(member.employee, {}).get("user_id")),
            "label": employee_details.get(member.employee, {}).get("employee_name") or member.employee,
            "team_role": member.team_role,
        }
        for member in project_members
    ]

    return {
        "project": _serialize_project(
            project_doc,
            _get_project_task_counts([project]),
            _bulk_employee_names([member.employee for member in project_members if member.employee]),
        ),
        "tasks": [
            _serialize_task(
                task_doc,
                {project_doc.name: project_doc.project_name},
                task_user_image_map,
                task_employee_name_map,
            )
            for task_doc in task_docs
        ],
        "team_members": team_member_data,
    }


@frappe.whitelist()
def get_employees() -> dict:
    """Return list of active employees for selection."""
    _require_login()
    
    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "designation", "department", "user_id"],
        order_by="employee_name asc"
    )
    
    return {"employees": employees}


@frappe.whitelist()
def add_team_member(team: str, employee: str, team_role: str, access_level: str, is_active: int = 1) -> dict:
    """Add a new member to a team."""
    _require_login()
    
    if not team or team == "all":
        frappe.throw(_("Please select a specific team"))
    
    # Check if user has permission to manage this team
    from taskflow.taskflow.service.team_hierarchy import can_manage_team
    if not can_manage_team(frappe.session.user, team):
        frappe.throw(_("You don't have permission to add members to this team"))
    
    # Check if member already exists
    existing = frappe.db.exists("Taskflow Team Member", {
        "parent": team,
        "employee": employee
    })
    
    if existing:
        frappe.throw(_("This employee is already a member of the team"))
    
    # Get the team document
    team_doc = frappe.get_doc("Taskflow Team", team)
    
    # Get user_id from employee
    user_id = frappe.db.get_value("Employee", employee, "user_id")
    
    # Add new member to child table
    team_doc.append("team_members", {
        "employee": employee,
        "user": user_id,
        "team_role": team_role,
        "access_level": access_level,
        "is_active": is_active
    })
    
    # Save the team document
    team_doc.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "message": _("Team member added successfully"),
        "member": {
            "employee": employee,
            "team_role": team_role,
            "access_level": access_level
        }
    }


@frappe.whitelist()
def get_team_members(team: str | None = None) -> dict:
    """Return team members from the team_members child table of Taskflow Team."""
    _require_login()
    
    if not team or team == "all":
        # Get all teams accessible to the user
        from taskflow.taskflow.service.team_hierarchy import get_accessible_teams
        accessible_teams = list(get_accessible_teams(frappe.session.user))
        
        if not accessible_teams:
            return {"team_members": []}
        
        # Get all team members from accessible teams
        team_members = frappe.get_all(
            "Taskflow Team Member",
            filters={
                "parent": ["in", accessible_teams],
                "is_active": 1
            },
            fields=[
                "name",
                "parent as team",
                "employee",
                "user",
                "team_role",
                "access_level",
                "is_active"
            ]
        )
    else:
        # Get members for specific team
        team_members = frappe.get_all(
            "Taskflow Team Member",
            filters={
                "parent": team,
                "is_active": 1
            },
            fields=[
                "name",
                "parent as team",
                "employee",
                "user",
                "team_role",
                "access_level",
                "is_active"
            ]
        )
    
    # Enrich with employee details
    employee_ids = [m.employee for m in team_members if m.employee]
    employee_map = {}
    
    if employee_ids:
        employees = frappe.get_all(
            "Employee",
            filters={"name": ["in", employee_ids]},
            fields=["name", "employee_name", "user_id", "image", "designation", "department"]
        )
        employee_map = {e.name: e for e in employees}
    
    # Get task counts for each member
    for member in team_members:
        emp_data = employee_map.get(member.employee, {})
        member.employee_name = emp_data.get("employee_name", member.employee)
        member.user_image = emp_data.get("image")
        member.designation = emp_data.get("designation", "")
        member.department = emp_data.get("department", "")
        
        # Get task counts
        if member.user:
            task_counts = frappe.db.sql("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status != 'Completed' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue
                FROM `tabTaskflow Task`
                WHERE _assign LIKE %s
            """, ('%"' + member.user + '"%',), as_dict=True)
            
            if task_counts:
                member.total_tasks = task_counts[0].total or 0
                member.pending_tasks = task_counts[0].pending or 0
                member.completed_tasks = task_counts[0].completed or 0
                member.overdue_tasks = task_counts[0].overdue or 0
            else:
                member.total_tasks = 0
                member.pending_tasks = 0
                member.completed_tasks = 0
                member.overdue_tasks = 0
        else:
            member.total_tasks = 0
            member.pending_tasks = 0
            member.completed_tasks = 0
            member.overdue_tasks = 0
    
    return {"team_members": team_members}


@frappe.whitelist()
def get_dashboard_data(team: str | None = None) -> dict:
    """Return workload statistics per employee, optionally filtered by team."""
    _require_login()

    project_filters = {"is_archived": 0}
    if team and team != "all":
        project_filters["team"] = team

    projects = frappe.get_all("Taskflow Project", fields=["name"], filters=project_filters)
    project_names = [project.name for project in projects]
    if not project_names:
        return {"global_team_data": []}

    member_rows = frappe.get_all(
        "Taskflow Team Member",
        fields=["parent as project", "employee"],
        filters={"parent": ["in", project_names]},
    )

    assignments_by_employee: dict[str, list[str]] = defaultdict(list)
    employee_ids: set[str] = set()
    for row in member_rows:
        if row.employee:
            assignments_by_employee[row.employee].append(row.project)
            employee_ids.add(row.employee)

    employees = (
        frappe.get_all(
            "Employee",
            fields=["name", "employee_name"],
            filters={"name": ["in", list(employee_ids)], "status": "Active"},
        )
        if employee_ids
        else []
    )

    tasks = frappe.get_all(
        "Taskflow Task",
        fields=["assigned_to", "project", "status", "due_date"],
        filters={
            "project": ["in", project_names],
            "status": ["!=", "Completed"],
            "assigned_to": ["!=", ""],
        },
        limit_page_length=0,
    )

    today = getdate(nowdate())
    stats_by_employee_project: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"assigned": 0, "pending": 0, "overdue": 0}
    )
    for task_row in tasks:
        if not task_row.assigned_to or not task_row.project:
            continue
        key = (task_row.assigned_to, task_row.project)
        stats_by_employee_project[key]["assigned"] += 1
        stats_by_employee_project[key]["pending"] += 1
        if task_row.due_date and getdate(task_row.due_date) < today:
            stats_by_employee_project[key]["overdue"] += 1

    global_team_data = []
    for employee in employees:
        project_names_for_employee = list(dict.fromkeys(assignments_by_employee[employee.name]))
        project_stats = [
            {
                "name": project_name,
                "assigned": stats_by_employee_project[(employee.name, project_name)]["assigned"],
                "pending": stats_by_employee_project[(employee.name, project_name)]["pending"],
                "overdue": stats_by_employee_project[(employee.name, project_name)]["overdue"],
                "status": "Active",
            }
            for project_name in project_names_for_employee
        ]
        global_team_data.append(
            {
                "full_name": employee.employee_name,
                "employee": employee.name,
                "projects": project_names_for_employee,
                "project_stats": project_stats,
                "pending_tasks": sum(stat["assigned"] for stat in project_stats),
                "completed_tasks": 0,
            }
        )

    return {"global_team_data": global_team_data}


@frappe.whitelist()
def save_project(payload: str) -> dict:
    """Create or update a Taskflow Project."""
    _require_login()
    data = frappe.parse_json(payload)
    team = data.get("team")
    name = data.get("name")

    if not team:
        frappe.throw(_("Team is required"))
    if not can_manage_team(frappe.session.user, team):
        frappe.throw(
            _("You are not allowed to manage projects for this team"),
            frappe.PermissionError,
        )

    doc = frappe.get_doc("Taskflow Project", name) if name else frappe.new_doc("Taskflow Project")
    if name:
        doc.check_permission("write")

    for fieldname in _ALLOWED_PROJECT_FIELDS:
        if fieldname in data:
            doc.set(fieldname, data.get(fieldname))

    if "project_team_members" in data:
        doc.set("project_team_members", data.get("project_team_members"))

    doc.save(ignore_permissions=False)
    return {"name": doc.name}


@frappe.whitelist()
def save_task(payload: str) -> dict:
    """Create or update a Taskflow Task, including checklist rows."""
    _require_login()
    data = frappe.parse_json(payload)

    try:
        name = data.get("name")
        is_new = not name or name == "undefined"
        doc = frappe.new_doc("Taskflow Task") if is_new else frappe.get_doc("Taskflow Task", name)
        if not is_new:
            doc.check_permission("write")

        if "completed_date" in data and "completed_on" not in data:
            data["completed_on"] = data["completed_date"]

        for fieldname in _ALLOWED_TASK_FIELDS:
            if fieldname in data:
                doc.set(fieldname, data.get(fieldname))

        assignee_users = []
        newly_added_users = []

        # Sync _assign (user IDs/emails) into table_gqbl — insert only new rows
        if "_assign" in data:
            assignee_users = data.get("_assign") or []
            if isinstance(assignee_users, str):
                assignee_users = frappe.parse_json(assignee_users)
            assignee_users = [u for u in assignee_users if u]

            existing_user_ids = {row.user_id for row in doc.get("table_gqbl", [])}

            for user_id in assignee_users:
                if user_id not in existing_user_ids:
                    newly_added_users.append(user_id)
                    doc.append("table_gqbl", {"user_id": user_id})

        if "checklist" in data:
            checklist_items = data.get("checklist") or []
            new_status = data.get("status") or doc.status
            if new_status == "Completed" and (is_new or doc.status != "Completed"):
                pending_items = [item for item in checklist_items if not item.get("is_completed")]
                if pending_items:
                    frappe.throw(_("Cannot complete task while checklist items are pending."))
            _append_checklist_to_doc(doc, checklist_items)

        doc.save(ignore_permissions=False, ignore_version=not is_new)

        if newly_added_users:
            current_user = frappe.session.user
            emailed = set()
            project_name_val = doc.project and frappe.db.get_value("Taskflow Project", doc.project, "project_name") or ""
            for user_id in newly_added_users:
                if user_id == current_user or user_id in emailed:
                    continue
                emailed.add(user_id)
                employee_name = frappe.db.get_value("Employee", {"user_id": user_id}, "name")
                if not employee_name:
                    continue
                company_email = frappe.db.get_value("Employee", employee_name, "company_email")
                if not company_email:
                    continue
                creator_name = frappe.db.get_value("User", current_user, "full_name") or current_user
                description_html = doc.description or "No description provided."
                task_title_esc = frappe.utils.escape_html(doc.task_title or "")
                project_esc = frappe.utils.escape_html(project_name_val or "Not set")
                priority_esc = frappe.utils.escape_html(doc.priority or "Medium")
                start_date_esc = frappe.utils.escape_html(str(doc.start_date or "Not set"))
                due_date_esc = frappe.utils.escape_html(str(doc.due_date or "Not set"))
                assigned_by_esc = frappe.utils.escape_html(creator_name)
                status_esc = frappe.utils.escape_html(doc.status or "Open")
                task_name_esc = frappe.utils.escape_html(doc.name or "")
                project_id_esc = frappe.utils.escape_html(doc.project or "")
                try:
                    frappe.sendmail(
                        recipients=[company_email],
                        subject="New Task Assigned: " + (doc.task_title or "") if is_new else "Added to Task: " + (doc.task_title or ""),
                        message="""
                            <p>You have been assigned to a task:</p>
                            <h3 style="margin: 12px 0 4px;">""" + task_title_esc + """</h3>
                            <table style="border-collapse: collapse; font-size: 13px; margin: 12px 0;">
                                <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Project:</td><td style="padding: 4px 0;">""" + project_esc + """</td></tr>
                                <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Priority:</td><td style="padding: 4px 0;">""" + priority_esc + """</td></tr>
                                <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Start Date:</td><td style="padding: 4px 0;">""" + start_date_esc + """</td></tr>
                                <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Due Date:</td><td style="padding: 4px 0;">""" + due_date_esc + """</td></tr>
                                <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Assigned by:</td><td style="padding: 4px 0;">""" + assigned_by_esc + """</td></tr>
                                <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Status:</td><td style="padding: 4px 0;">""" + status_esc + """</td></tr>
                            </table>
                            <p style="font-weight: 600;">Description:</p>
                            <div style="border-left: 3px solid #4f6ef7; padding: 8px 12px; margin: 8px 0; background: #f8fafc; color: #334155;">""" + description_html + """</div>
                            <p><a href="/taskflow?mode=dashboard&project=""" + project_id_esc + """&view=task&task=""" + task_name_esc + """">View Task</a></p>
                        """,
                        now=True,
                    )
                except Exception as e:
                    frappe.log_error(f"Task assignment email failed: {e}", "Taskflow Email")

        return {"name": doc.name}
    except Exception as error:
        _log_save_task_error(data if isinstance(data, dict) else {}, error)
        raise


@frappe.whitelist()
def remove_task_assignee(payload: str) -> dict:
    """Remove a user from table_gqbl of a Taskflow Task."""
    _require_login()
    data = frappe.parse_json(payload)
    task_name = data.get("task")
    user_id = data.get("user_id")

    if not task_name or not user_id:
        frappe.throw(_("Task and user_id are required."))

    doc = frappe.get_doc("Taskflow Task", task_name)
    doc.check_permission("write")

    original_len = len(doc.get("table_gqbl", []))
    doc.set("table_gqbl", [row for row in doc.get("table_gqbl", []) if row.user_id != user_id])

    if len(doc.get("table_gqbl", [])) < original_len:
        doc.save(ignore_permissions=False, ignore_version=True)

    return {"name": doc.name}


@frappe.whitelist()
def save_task_checklist(payload: str) -> dict:
    """Save only the checklist child table for an existing task."""
    _require_login()
    data = frappe.parse_json(payload)
    task_name = data.get("task")
    checklist_items = data.get("checklist") or []

    if not task_name or not isinstance(task_name, str):
        frappe.throw(_("Task is required to save checklist."))

    doc = frappe.get_doc("Taskflow Task", task_name)
    doc.check_permission("write")

    task_status = data.get("status") or doc.status
    if task_status == "Completed":
        pending_items = [item for item in checklist_items if not item.get("is_completed")]
        if pending_items:
            frappe.throw(_("Cannot complete task while checklist items are pending."))

    current_time = now_datetime()
    doc.set("checklist", [])

    for index, item in enumerate(checklist_items, start=1):
        checklist_text = (item.get("checklist_item") or "").strip()
        if not checklist_text:
            frappe.throw(_("Checklist item cannot be empty."))

        is_completed = 1 if item.get("is_completed") else 0
        doc.append(
            "checklist",
            {
                "checklist_item": checklist_text,
                "is_completed": is_completed,
                "completed_by": frappe.session.user if is_completed else None,
                "completed_on": current_time if is_completed else None,
                "sequence": item.get("sequence") or index * 10,
            },
        )

    doc.save(ignore_permissions=False)
    doc.reload()
    return {
        "name": doc.name,
        "checklist_count": len(checklist_items),
        "task": _serialize_task(doc),
    }


@frappe.whitelist()
def toggle_task_checklist_item(payload: str) -> dict:
    """Toggle one checklist row using the Taskflow Task document controller save path."""
    _require_login()
    data = frappe.parse_json(payload)
    task_name = data.get("task")
    row_name = data.get("row_name")
    checked = 1 if data.get("checked") else 0
    row_index = data.get("index")

    if not task_name or not isinstance(task_name, str):
        frappe.throw(_("Task is required to update checklist."))

    doc = frappe.get_doc("Taskflow Task", task_name)
    doc.check_permission("write")

    checklist_row = None
    if row_name:
        checklist_row = next((row for row in doc.get("checklist", []) if row.name == row_name), None)
    elif isinstance(row_index, int) and 0 <= row_index < len(doc.get("checklist", [])):
        checklist_row = doc.get("checklist", [])[row_index]

    if not checklist_row:
        frappe.throw(_("Checklist item not found."), frappe.DoesNotExistError)

    checklist_row.is_completed = checked
    checklist_row.completed_by = frappe.session.user if checked else None
    checklist_row.completed_on = now_datetime() if checked else None

    doc.save(ignore_permissions=False)
    doc.reload()
    return {"name": doc.name, "task": _serialize_task(doc)}


@frappe.whitelist()
def get_task_details(task: str) -> dict:
    """Return full task data plus its comment thread."""
    _require_login()
    if not isinstance(task, str):
        frappe.throw(_("Invalid task identifier"), frappe.ValidationError)

    doc = frappe.get_doc("Taskflow Task", task)
    doc.check_permission("read")

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Taskflow Task",
            "reference_name": task,
            "comment_type": "Comment",
        },
        fields=["name", "content", "owner", "comment_by", "creation"],
        order_by="creation desc",
    )

    author_ids = list({comment.owner for comment in comments if comment.owner})
    authors = (
        frappe.get_all(
            "User",
            filters={"name": ["in", author_ids]},
            fields=["name", "full_name", "user_image"],
        )
        if author_ids
        else []
    )
    author_map = {author.name: author for author in authors}

    for comment in comments:
        author = author_map.get(comment.owner)
        comment.author_name = (author.full_name if author else None) or comment.comment_by or comment.owner
        comment.author_image = author.user_image if author else None

    attachments = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "Taskflow Task",
            "attached_to_name": task,
        },
        fields=["name", "file_name", "file_url", "is_private", "creation"],
        order_by="creation desc",
    )

    return {"task": _serialize_task(doc), "comments": comments, "attachments": attachments}


@frappe.whitelist()
def add_task_comment(payload: str) -> dict:
    """Add a comment to a Taskflow Task and email @mentioned members."""
    _require_login()
    data = frappe.parse_json(payload)
    task = data.get("task")
    content = (data.get("content") or "").strip()

    if not content:
        frappe.throw(_("Comment content is required"))
    if not isinstance(task, str):
        frappe.throw(_("Invalid task identifier"), frappe.ValidationError)

    task_doc = frappe.get_doc("Taskflow Task", task)
    task_doc.check_permission("read")

    comment = frappe.get_doc(
        {
            "doctype": "Comment",
            "comment_type": "Comment",
            "reference_doctype": "Taskflow Task",
            "reference_name": task,
            "content": content,
            "comment_by": frappe.session.user,
        }
    ).insert(ignore_permissions=True)
    frappe.db.commit()

    user_details = frappe.db.get_value(
        "User",
        frappe.session.user,
        ["full_name", "user_image"],
        as_dict=True,
    )
    sender_name = (user_details and user_details.full_name) or frappe.session.user

    _send_task_mention_emails(task_doc, content, sender_name, frappe.session.user)

    return {
        "name": comment.name,
        "content": comment.content,
        "owner": comment.owner,
        "author_name": sender_name,
        "author_image": user_details and user_details.user_image,
        "creation": comment.creation,
    }


def _send_task_mention_emails(task_doc, content: str, sender_name: str, sender_email: str):
    """Parse @mentions from task comment and send emails to mentioned team members."""
    import re

    mentioned_raw = re.findall(r"@(\w+(?:\s+\w+)*)", content)
    if not mentioned_raw:
        return

    project_name = task_doc.project
    if not project_name:
        return

    project_doc = frappe.get_doc("Taskflow Project", project_name)
    members = project_doc.get("project_team_members", [])
    if not members:
        return

    employee_ids = [m.employee for m in members if m.employee]
    employee_details = _bulk_employee_details(employee_ids)

    label_to_email = {}
    for emp_id, details in employee_details.items():
        label = details.get("employee_name") or emp_id
        email = details.get("company_email") or details.get("user_id")
        if email:
            label_to_email[label.lower().strip()] = email

    task_title_esc = frappe.utils.escape_html(task_doc.task_title or "")
    project_name_esc = frappe.utils.escape_html(project_name)
    task_name_esc = frappe.utils.escape_html(task_doc.name or "")
    sender_name_esc = frappe.utils.escape_html(sender_name)

    emailed = set()
    for raw in mentioned_raw:
        raw_lower = raw.lower().strip()
        matched_email = label_to_email.get(raw_lower)
        if not matched_email:
            for label, email in label_to_email.items():
                if label in raw_lower or raw_lower in label:
                    matched_email = email
                    break
        if matched_email and matched_email not in emailed and matched_email != sender_email:
            emailed.add(matched_email)
            try:
                frappe.sendmail(
                    recipients=[matched_email],
                    subject="Mentioned in Task Comment: " + (task_doc.task_title or ""),
                    message=(
                        "<p><strong>" + sender_name_esc + "</strong> mentioned you in a comment on task <strong>" + task_title_esc + "</strong> (Project: " + project_name_esc + "):</p>"
                        "<blockquote style='border-left: 3px solid #4f6ef7; padding: 8px 12px; margin: 8px 0; background: #f8fafc; color: #334155;'>"
                        + frappe.utils.escape_html(content)
                        + "</blockquote>"
                        "<p><a href='/taskflow?mode=dashboard&project=" + project_name_esc + "&view=task&task=" + task_name_esc + "'>View Task</a></p>"
                    ),
                    now=True,
                )
            except Exception:
                pass


@frappe.whitelist()
def get_project_comments(project: str) -> dict:
    """Return comments for a Taskflow Project."""
    _require_login()
    if not isinstance(project, str):
        frappe.throw(_("Invalid project identifier"), frappe.ValidationError)

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Taskflow Project",
            "reference_name": project,
            "comment_type": "Comment",
        },
        fields=["name", "content", "owner", "comment_by", "creation"],
        order_by="creation asc",
        limit_page_length=100,
    )

    author_map = {}
    for comment in comments:
        if comment.owner and comment.owner not in author_map:
            author_map[comment.owner] = _get_user_details(comment.owner)

    for comment in comments:
        author_details = author_map.get(comment.owner)
        if author_details:
            full_name, user_image = author_details
            comment.author_name = full_name or comment.comment_by or comment.owner
            comment.author_image = user_image
        else:
            comment.author_name = comment.comment_by or comment.owner
            comment.author_image = None

    return {"comments": comments}


@frappe.whitelist()
def add_project_comment(payload: str) -> dict:
    """Add a comment to a Taskflow Project and email @mentioned members."""
    _require_login()
    data = json.loads(payload) if isinstance(payload, str) else payload
    project_name = data.get("project")
    content = (data.get("content") or "").strip()

    if not project_name:
        frappe.throw(_("Project name is required"))
    if not content:
        frappe.throw(_("Comment content is required"))

    doc = frappe.get_doc("Taskflow Project", project_name)
    doc.check_permission("write")

    existing = frappe.db.exists(
        "Comment",
        {
            "reference_doctype": "Taskflow Project",
            "reference_name": project_name,
            "comment_type": "Comment",
            "content": content,
            "owner": frappe.session.user,
            "creation": (">", frappe.utils.add_to_date(frappe.utils.now_datetime(), seconds=-5)),
        },
    )
    if existing:
        return {"name": existing}

    comment = frappe.get_doc(
        {
            "doctype": "Comment",
            "comment_type": "Comment",
            "reference_doctype": "Taskflow Project",
            "reference_name": project_name,
            "content": content,
            "comment_by": frappe.session.user,
        }
    )
    comment.insert(ignore_permissions=True)
    frappe.db.commit()

    full_name, user_image = _get_user_details(frappe.session.user)
    sender_name = full_name or frappe.session.user

    # Extract @mentions and send emails
    _send_mention_emails(project_name, content, sender_name, frappe.session.user)

    return {
        "name": comment.name,
        "content": comment.content,
        "owner": comment.owner,
        "author_name": sender_name,
        "author_image": user_image,
        "creation": comment.creation,
    }


def _send_mention_emails(project_name: str, content: str, sender_name: str, sender_email: str):
    """Parse @mentions from content and send emails to mentioned team members."""
    import re

    mentioned_raw = re.findall(r"@(\w+(?:\s+\w+)*)", content)
    if not mentioned_raw:
        return

    project_doc = frappe.get_doc("Taskflow Project", project_name)
    members = project_doc.get("project_team_members", [])
    if not members:
        return

    employee_ids = [m.employee for m in members if m.employee]
    employee_details = _bulk_employee_details(employee_ids)

    # Build label -> company_email map
    label_to_email = {}
    for emp_id, details in employee_details.items():
        label = details.get("employee_name") or emp_id
        email = details.get("company_email") or details.get("user_id")
        if email:
            label_to_email[label.lower().strip()] = email

    emailed = set()
    for raw in mentioned_raw:
        raw_lower = raw.lower().strip()
        # Check for exact match first, then check if any known name is contained in the raw text
        matched_email = label_to_email.get(raw_lower)
        if not matched_email:
            for label, email in label_to_email.items():
                if label in raw_lower or raw_lower in label:
                    matched_email = email
                    break
        if matched_email and matched_email not in emailed and matched_email != sender_email:
            emailed.add(matched_email)
            try:
                frappe.sendmail(
                    recipients=[matched_email],
                    subject=f"Comment on Project: {project_name}",
                    message=f"""
                        <p><strong>{frappe.utils.escape_html(sender_name)}</strong> mentioned you in a comment on project <strong>{frappe.utils.escape_html(project_name)}</strong>:</p>
                        <blockquote style="border-left: 3px solid #4f6ef7; padding: 8px 12px; margin: 8px 0; background: #f8fafc; color: #334155;">
                            {content}
                        </blockquote>
                        <p><a href="/taskflow?mode=dashboard&project={frappe.utils.escape_html(project_name)}&view=files">View Comment</a></p>
                    """,
                    now=True,
                )
            except Exception:
                pass


@frappe.whitelist()
def get_team_workload_planner(team: str | None = None) -> dict:
    """Return per-member workload across project assignments."""
    _require_login()

    project_filters = {"is_archived": 0}
    if team and team != "all":
        project_filters["team"] = team

    projects = frappe.get_all(
        "Taskflow Project",
        fields=["name", "project_name"],
        filters=project_filters,
    )
    project_names = [project.name for project in projects]
    project_name_set = set(project_names)

    member_filters = {"parent": team} if (team and team != "all") else {}
    team_members = frappe.get_all(
        "Taskflow Team Member",
        filters=member_filters,
        fields=["employee"],
    )
    employee_ids = list({member.employee for member in team_members if member.employee})
    employees = (
        frappe.get_all(
            "Employee",
            fields=["name", "employee_name"],
            filters={"name": ["in", employee_ids], "status": "Active"},
        )
        if employee_ids
        else []
    )

    assignment_rows = (
        frappe.get_all(
            "Taskflow Team Member",
            fields=["parent as project", "employee"],
            filters={"parent": ["in", project_names]},
        )
        if project_names
        else []
    )

    assignments_by_member: dict[str, set[str]] = defaultdict(set)
    for row in assignment_rows:
        if row.project in project_name_set and row.employee:
            assignments_by_member[row.employee].add(row.project)

    total_projects = max(len(projects), 1)
    members = [
        {
            "employee": employee.name,
            "full_name": employee.employee_name,
            "workload": int(len(assignments_by_member[employee.name]) / total_projects * 100),
            "assignments": list(assignments_by_member[employee.name]),
        }
        for employee in employees
    ]

    return {
        "members": members,
        "projects": [{"name": project.name, "project_name": project.project_name} for project in projects],
    }


@frappe.whitelist()
def update_task_sequences(sequences: str) -> str:
    """Bulk-update task sequence values."""
    _require_login()
    data = frappe.parse_json(sequences)
    if not isinstance(data, dict):
        frappe.throw(_("Invalid sequences payload"), frappe.ValidationError)

    for name, sequence in data.items():
        if not isinstance(name, str) or not isinstance(sequence, (int, float)):
            frappe.throw(_("Invalid sequence data"), frappe.ValidationError)

        doc = frappe.get_doc("Taskflow Task", name)
        doc.check_permission("write")
        frappe.db.set_value("Taskflow Task", name, "sequence", sequence, update_modified=False)

    return "ok"


@frappe.whitelist()
def search_employees(q: str = "") -> list[dict]:
    """Search employees by display name."""
    _require_login()
    query = q if isinstance(q, str) else ""
    filters = {"employee_name": ["like", f"%{query}%"]} if query.strip() else {}

    employees = frappe.get_all(
        "Employee",
        filters=filters,
        fields=["name", "employee_name"],
        limit=10,
    )
    return [{"value": employee.name, "label": employee.employee_name} for employee in employees]


@frappe.whitelist()
def toggle_team_member_assignment(employee: str, project: str) -> str:
    """Toggle an employee's membership on a project's team member table."""
    _require_login()
    if not isinstance(employee, str) or not isinstance(project, str):
        frappe.throw(_("Invalid parameters"), frappe.ValidationError)

    doc = frappe.get_doc("Taskflow Project", project)
    doc.check_permission("write")

    existing = next(
        (member for member in doc.get("project_team_members", []) if member.employee == employee),
        None,
    )
    if existing:
        doc.get("project_team_members").remove(existing)
    else:
        doc.append("project_team_members", {"employee": employee, "team_role": "Team Member"})

    doc.save(ignore_permissions=False)
    return "ok"


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


@frappe.whitelist()
def get_assigned_tasks(user_id: str | None = None, project: str | None = None, team: str | None = None) -> list[dict]:
    """Return Taskflow Task records assigned to the user or filtered by project/team."""
    _require_login()

    filters = {}
    if user_id and user_id != "all":
        # Find tasks via ToDo table
        todo_task_names = frappe.get_all(
            "ToDo",
            filters={
                "allocated_to": user_id,
                "reference_type": "Taskflow Task",
                "status": ["!=", "Cancelled"],
            },
            pluck="reference_name",
        )
        # Also find tasks via Task Assignment child table (table_gqbl)
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

    if project and project != "all":
        filters["project"] = project
    if team and team != "all":
        filters["team"] = team

    if not filters:
        # If no filters at all, limit to accessible projects
        teams = _get_accessible_teams()
        team_names = [t["name"] for t in teams]
        projects = frappe.get_all("Taskflow Project", fields=["name"], filters={"team": ["in", team_names]})
        if projects:
            filters["project"] = ["in", [p.name for p in projects]]
        else:
            return []

    tasks = frappe.get_list(
        "Taskflow Task",
        fields=_TASK_FIELDS,
        filters=filters,
        order_by="modified desc",
        limit_page_length=200,
    )

    task_docs = [frappe.get_doc("Taskflow Task", task.name) for task in tasks]
    
    projects = frappe.get_list("Taskflow Project", fields=["name", "project_name"])
    project_map = {p.name: p.project_name for p in projects}
    
    task_employee_name_map = _bulk_employee_names([task.assigned_to for task in tasks if task.assigned_to])
    task_user_image_map = _bulk_user_images([task.assigned_to_user for task in tasks if task.assigned_to_user])

    return [
        _serialize_task(task_doc, project_map, task_user_image_map, task_employee_name_map)
        for task_doc in task_docs
    ]
