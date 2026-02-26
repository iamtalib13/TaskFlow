import frappe
from frappe.utils import getdate, today, date_diff

@frappe.whitelist()
def get_dashboard_data(project=None):
    # Existing Projects fetch logic (Unchanged)
    raw_projects = frappe.get_all("Project", fields=["name", "project_name", "status", "expected_start_date", "expected_end_date"])
    projects_with_counts = []
    selected_project_info = None
    all_project_ids = []

    for p in raw_projects:
        all_project_ids.append(p.name)
        p_pending = frappe.db.count("Task", {"project": p.name, "status": ["not in", ["Completed", "Cancelled"]]})
        project_data = {"name": p.name, "project_name": p.project_name, "status": p.status, "pending_count": p_pending, "start": p.expected_start_date, "end": p.expected_end_date}
        projects_with_counts.append(project_data)
        if project and p.name == project:
            selected_project_info = project_data

    # --- NAYA LOGIC FOR TASK VIEW (GLOBAL DATA) ---
    # Saare projects ke users fetch karein
    all_project_users = frappe.get_all("Project User", filters={"parent": ["in", all_project_ids]}, fields=["parent", "user"])
    
    # User wise grouping taaki pata chale kaun kis project mein hai
    user_map = {}
    for pu in all_project_users:
        if pu.user not in user_map:
            user_map[pu.user] = {"projects": []}
        # Project ka naam nikaalna
        p_name = next((proj['project_name'] for proj in projects_with_counts if proj['name'] == pu.parent), pu.parent)
        user_map[pu.user]["projects"].append(p_name)

    global_team_data = []
    for user_id, info in user_map.items():
        full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
        g_total = frappe.db.count("Task", {"owner": user_id, "project": ["!=", ""]})
        g_pending = frappe.db.count("Task", {"owner": user_id, "project": ["!=", ""], "status": ["not in", ["Completed", "Cancelled"]]})
        
        global_team_data.append({
            "full_name": full_name,
            "total_tasks": g_total,
            "pending_tasks": g_pending,
            "completed_tasks": g_total - g_pending,
            "projects": ", ".join(info["projects"]) # Kaun-kaun se project mein hai
        })
    # ---------------------------------------------

    # Aapka existing members data logic (Project specific)
    user_filters = {"parenttype": "Project"}
    if project: user_filters["parent"] = project
    else: user_filters["parent"] = ["in", all_project_ids]
    
    project_users = frappe.get_all("Project User", filters=user_filters, fields=["user"])
    unique_users = list(set([d.user for d in project_users]))

    members_data = []
    for user_id in unique_users:
        m_task_filters = {"owner": user_id, "project": ["!=", ""]}
        if project: m_task_filters["project"] = project
        m_total = frappe.db.count("Task", m_task_filters)
        m_pending = frappe.db.count("Task", {**m_task_filters, "status": ["not in", ["Completed", "Cancelled"]]})
        members_data.append({
            "full_name": frappe.db.get_value("User", user_id, "full_name") or user_id,
            "total_tasks": m_total,
            "pending_tasks": m_pending,
            "user_id": user_id
        })

    return {
        "projects": projects_with_counts,
        "selected_project_info": selected_project_info,
        "stats": [
            {"label": "Total Tasks", "value": frappe.db.count("Task", {"project": project} if project else {"project": ["!=", ""]})},
            {"label": "Pending", "value": frappe.db.count("Task", {"project": project, "status": ["not in", ["Completed", "Cancelled"]]} if project else {"project": ["!=", ""], "status": ["not in", ["Completed", "Cancelled"]]})},
            {"label": "Completed", "value": frappe.db.count("Task", {"project": project, "status": "Completed"} if project else {"project": ["!=", ""], "status": "Completed"})}
        ],
        "members": members_data,
        "global_team_data": global_team_data # Naya key bheja
    }

@frappe.whitelist()
def get_task_list(project=None, start=0, page_length=10, only_my_tasks=False, focus_filter=None, long_pending_days=7):
    filters = {"project": ["!=", ""]}
    only_my_tasks = frappe.utils.cint(only_my_tasks) == 1
    long_pending_days = frappe.utils.cint(long_pending_days) or 7

    if only_my_tasks:
        filters["owner"] = frappe.session.user

    if project:
        filters["project"] = project

    focus_filter = (focus_filter or "").strip().lower()
    open_status_filter = ["not in", ["Completed", "Cancelled"]]
    today_date = frappe.utils.today()
    if focus_filter == "overdue":
        filters["status"] = open_status_filter
        filters["exp_end_date"] = ["<", today_date]
    elif focus_filter == "due_today":
        filters["status"] = open_status_filter
        filters["exp_end_date"] = today_date
    elif focus_filter == "blocked":
        filters["status"] = ["in", ["Blocked", "On Hold"]]
    elif focus_filter == "long_pending":
        filters["status"] = open_status_filter
        filters["creation"] = ["<", frappe.utils.add_days(today_date, -long_pending_days)]

    tasks = frappe.get_list(
        "Task",
        filters=filters,
        fields=["name", "subject", "status", "owner", "priority", "exp_start_date", "exp_end_date", "project"],
        start=start,
        page_length=page_length,
        order_by="creation desc",
        ignore_permissions=True,
    )

    current_date = getdate(today())

    # 2. Har task ke liye owner ka first_name fetch karein aur days_left calculate karein
    for task in tasks:
        user_info = frappe.db.get_value("User", task.owner, ["first_name"], as_dict=True)
        task["owner_name"] = user_info.get("first_name") if user_info else task.owner
        # Fetch Project Name for display if showing all projects
        if not project:
            task["project_title"] = frappe.db.get_value("Project", task.project, "project_name")
        
        # Calculate Days Left
        if task.exp_end_date:
            diff = date_diff(task.exp_end_date, current_date)
            task["days_left"] = int(diff)
        else:
            task["days_left"] = None

    total_count = frappe.db.count("Task", filters)
    return {"tasks": tasks, "has_more": int(start) + int(page_length) < total_count}

@frappe.whitelist()
def get_user_overview_data():
    user = frappe.session.user
    
    stats = [
        {"label": "My Total Tasks", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""]})},
        {"label": "My Pending", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""], "status": ["not in", ["Completed", "Cancelled"]]})},
        {"label": "My Completed", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""], "status": "Completed"})}
    ]

    insights = None
    has_team_config = False
    has_projects = False

    # Manager Insights Logic
    roles = frappe.get_roles(user)
    if "Projects Manager" in roles:
        # Check if config exists
        config_doc = None
        config_list = frappe.get_all("Project Manager Configuration", filters={"user": user}, fields=["name", "team_setup", "project_setup"])
        
        team_users = []
        if config_list:
            config_doc = frappe.get_doc("Project Manager Configuration", config_list[0].name)
            has_team_config = bool(config_doc.team_setup)
            has_projects = bool(config_doc.project_setup)
            
            team_items = frappe.get_all("Configuration Item", filters={"parent": config_doc.name, "enabled": 1}, fields=["user"])
            team_users = [d.user for d in team_items]
            
            # Auto-update flags if criteria met but not set
            updated = False
            if not config_doc.team_setup and team_users:
                config_doc.team_setup = 1
                has_team_config = True
                updated = True
            
            project_count = frappe.db.count("Project", {"status": "Open"})
            if not config_doc.project_setup and project_count > 0:
                config_doc.project_setup = 1
                has_projects = True
                updated = True
            
            if updated:
                config_doc.save(ignore_permissions=True)
        
        # Fallback to users in their projects if no config
        if not team_users:
            projects = frappe.get_all("Project", filters={"status": "Open"}, fields=["name"])
            if projects:
                p_users = frappe.get_all("Project User", filters={"parent": ["in", [p.name for p in projects]]}, fields=["user"])
                team_users = list(set([d.user for d in p_users]))

        # 2. Workload calculation
        workload = []
        for u in team_users[:10]: # Limit for performance
            count = frappe.db.count("Task", {"owner": u, "status": ["not in", ["Completed", "Cancelled"]]})
            full_name = frappe.db.get_value("User", u, "full_name") or u
            workload.append({"user": u, "full_name": full_name, "count": count})
        
        workload = sorted(workload, key=lambda x: x['count'], reverse=True)[:5]

        # 3. Project Health (Based on team's tasks)
        today_date = getdate(today())
        three_days_later = frappe.utils.add_days(today_date, 3)
        
        team_tasks = frappe.get_all("Task", 
            filters={"owner": ["in", team_users], "status": ["not in", ["Completed", "Cancelled"]]},
            fields=["exp_end_date", "priority"]
        )

        health = {"on_track": 0, "at_risk": 0, "delayed": 0}
        priorities = []

        for t in team_tasks:
            if t.exp_end_date:
                end_date = getdate(t.exp_end_date)
                if end_date < today_date: health["delayed"] += 1
                elif end_date <= three_days_later: health["at_risk"] += 1
                else: health["on_track"] += 1
            
            if t.priority == "Urgent":
                priorities.append(t)

        three_days_ago = frappe.utils.add_days(today_date, -3)
        stuck_count = frappe.db.count("Task", {
            "owner": ["in", team_users],
            "status": ["not in", ["Completed", "Cancelled"]],
            "modified": ["<", three_days_ago]
        })

        insights = {
            "workload": workload,
            "health": health,
            "stuck_count": stuck_count,
            "priorities": priorities[:3]
        }
    
    return {
        "stats": stats, 
        "insights": insights,
        "has_team_config": has_team_config,
        "has_projects": has_projects
    }

@frappe.whitelist()
def get_user_info():
    user = frappe.session.user
    user_details = frappe.db.get_value("User", user, ["full_name", "user_image", "email"], as_dict=True)
    
    # Fetch linked Employee
    employee_details = frappe.db.get_value("Employee", {"user_id": user}, ["name", "company_email", "first_name", "last_name"], as_dict=True)

    roles = frappe.get_roles(user)
    role_label = "Guest"
    is_manager = False

    if "Projects Manager" in roles:
        role_label = "Projects Manager"
        is_manager = True
    elif "Employee" in roles:
        role_label = "Employee"

    return {
        "full_name": user_details.full_name, # Fallback/Display
        "user_image": user_details.user_image,
        "email": user_details.email,
        "employee": employee_details.name if employee_details else None,
        "company_email": employee_details.company_email if employee_details else None,
        "first_name": employee_details.first_name if employee_details else None,
        "last_name": employee_details.last_name if employee_details else None,
        "role_label": role_label,
        "is_manager": is_manager
    }

@frappe.whitelist()
def update_user_profile(user_image=None, company_email=None, first_name=None, last_name=None):
    user = frappe.session.user
    
    # Update User Image
    if user_image:
        frappe.db.set_value("User", user, "user_image", user_image)
    
    # Update Employee Details
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if employee:
        emp_updates = {}
        if company_email: emp_updates["company_email"] = company_email
        if first_name: emp_updates["first_name"] = first_name
        if last_name: emp_updates["last_name"] = last_name
        
        if emp_updates:
            frappe.db.set_value("Employee", employee, emp_updates)
    else:
        if company_email or first_name or last_name:
             frappe.throw("No Employee record found linked to this user. Cannot update Employee details.")

    return get_user_info()

@frappe.whitelist()
def get_task_details(task):
    if not frappe.db.exists("Task", task):
        frappe.throw("Task not found")
        
    doc = frappe.get_doc("Task", task)
    
    # Fetch Comments
    comments = frappe.get_all("Comment", 
        filters={"reference_doctype": "Task", "reference_name": task},
        fields=["content", "owner", "creation", "comment_type", "comment_by"],
        order_by="creation desc"
    )
    
    # Fetch Attachments
    attachments = frappe.get_all("File",
        filters={"attached_to_doctype": "Task", "attached_to_name": task},
        fields=["file_name", "file_url", "is_private", "creation"],
        order_by="creation desc"
    )
    
    return {
        "doc": doc,
        "comments": comments,
        "attachments": attachments
    }

@frappe.whitelist()
def update_task_details(task_name, values):
    if isinstance(values, str):
        values = frappe.parse_json(values)
        
    doc = frappe.get_doc("Task", task_name)
    doc.update(values)
    doc.save()
    return doc

@frappe.whitelist()
def get_manager_dashboard_stats():
    """Project Manager dashboard ke liye single-call stats"""
    return {
        "active_projects": frappe.db.count("Project", {"status": ["!=", "Completed"]}),
        "pending_tasks": frappe.db.count("Task", {"status": ["not in", ["Completed", "Cancelled"]]}),
        "overdue_tasks": frappe.db.count("Task", {
            "status": ["not in", ["Completed", "Cancelled"]],
            "exp_end_date": ["<", frappe.utils.today()]
        })
    }

@frappe.whitelist()
def update_task_status(task_name, status):
    """Kanban Drag-n-Drop support ke liye status update API"""
    doc = frappe.get_doc("Task", task_name)
    doc.status = status
    doc.save()
    return frappe._("Task updated successfully")

@frappe.whitelist()
def add_comment(task_name, content):
    doc = frappe.get_doc("Task", task_name)
    comment = doc.add_comment("Comment", content)
    return {
        "content": comment.content,
        "owner": comment.owner,
        "creation": comment.creation,
        "comment_by": comment.comment_by
    }

@frappe.whitelist()
def get_pm_team():
    user = frappe.session.user
    config = frappe.get_all("Project Manager Configuration", filters={"user": user}, fields=["name"])
    if not config:
        return []
    
    team = frappe.get_all("Configuration Item", 
        filters={"parent": config[0].name, "enabled": 1}, 
        fields=["user"]
    )
    return [d.user for d in team]

@frappe.whitelist()
def get_project_data(project):
    # Check if user is Projects Manager or a member of the project
    roles = frappe.get_roles(frappe.session.user)
    if "Projects Manager" in roles or "System Manager" in roles:
        return frappe.get_doc("Project", project)
    
    # Check if user is in project team
    if frappe.db.exists("Project User", {"parent": project, "user": frappe.session.user}):
        return frappe.get_doc("Project", project)
    
    frappe.throw("You do not have permission to access this Project.")

@frappe.whitelist()
def update_project(project_name, values):
    if isinstance(values, str):
        values = frappe.parse_json(values)
    
    doc = frappe.get_doc("Project", project_name)
    
    if not _can_manage_project_team(project_name):
        frappe.throw("You do not have permission to update this Project.")

    # Update basic fields
    doc.project_name = values.get("project_name")
    doc.status = values.get("status")
    doc.expected_start_date = values.get("expected_start_date")
    doc.expected_end_date = values.get("expected_end_date")
    doc.notes = values.get("notes")
    
    # Update Team Members (Child Table)
    # We clear and re-add to ensure the list exactly matches what was sent
    has_role_field = frappe.get_meta("Project User").has_field("role")
    doc.set("users", [])
    if values.get("users"):
        for u in values.get("users"):
            payload = {"user": u.get("user")}
            if has_role_field:
                payload["role"] = u.get("role")
            doc.append("users", payload)
    
    doc.save()
    return doc


def _is_system_project_manager():
    roles = frappe.get_roles(frappe.session.user)
    return "Projects Manager" in roles or "System Manager" in roles


def _get_or_create_pm_configuration():
    config_name = frappe.session.user
    if frappe.db.exists("Project Manager Configuration", config_name):
        return frappe.get_doc("Project Manager Configuration", config_name)
    doc = frappe.get_doc({"doctype": "Project Manager Configuration", "user": frappe.session.user})
    doc.insert(ignore_permissions=True)
    return doc


def _get_configured_team_users(pm_user=None):
    pm_user = pm_user or frappe.session.user
    if not frappe.db.exists("Project Manager Configuration", pm_user):
        return []
    rows = frappe.get_all(
        "Configuration Item",
        filters={
            "parent": pm_user,
            "parenttype": "Project Manager Configuration",
            "parentfield": "team_details",
            "enabled": 1,
        },
        fields=["user"],
    )
    return [d.user for d in rows]


def _get_user_project_role(project_name):
    has_role_field = frappe.get_meta("Project User").has_field("role")
    fields = ["role"] if has_role_field else ["user"]
    member = frappe.db.get_value(
        "Project User",
        {"parent": project_name, "parenttype": "Project", "parentfield": "users", "user": frappe.session.user},
        fields,
        as_dict=True,
    )
    if not member:
        return None
    return (member.get("role") or "Team Member").strip() if has_role_field else "Team Member"


def _can_manage_project_team(project_name):
    if _is_system_project_manager():
        return True
    return _get_user_project_role(project_name) == "Project Manager"


@frappe.whitelist()
def get_team_configuration():
    if not _is_system_project_manager():
        frappe.throw("You do not have permission to manage team configuration.")

    config_doc = _get_or_create_pm_configuration()
    team_rows = []
    for row in config_doc.team_details:
        team_rows.append(
            {
                "user": row.user,
                "user_name": row.user_name,
                "role": row.role or "Team Member",
                "enabled": int(row.enabled or 0),
            }
        )

    available_users = frappe.get_all(
        "User",
        filters={"enabled": 1, "user_type": "System User"},
        fields=["name", "full_name", "user_image"],
        order_by="full_name asc",
        limit_page_length=500,
    )
    available_users = [u for u in available_users if u["name"] not in ["Administrator", "Guest"]]

    return {
        "name": config_doc.name,
        "user": config_doc.user,
        "team_setup": int(config_doc.team_setup or 0),
        "project_setup": int(config_doc.project_setup or 0),
        "team_details": team_rows,
        "available_users": available_users,
        "available_roles": ["Project Manager", "Team Member", "Viewer"],
    }


@frappe.whitelist()
def save_team_configuration(team_details):
    if not _is_system_project_manager():
        frappe.throw("You do not have permission to manage team configuration.")

    if isinstance(team_details, str):
        team_details = frappe.parse_json(team_details)
    if not isinstance(team_details, list):
        frappe.throw("Invalid team configuration payload.")

    allowed_roles = {"Project Manager", "Team Member", "Viewer"}
    unique_users = set()
    cleaned_rows = []
    for row in team_details:
        user = (row.get("user") or "").strip()
        role = (row.get("role") or "Team Member").strip()
        enabled = int(row.get("enabled", 1))
        if not user:
            continue
        if user in unique_users:
            frappe.throw(f"Duplicate team member found: {user}")
        if role not in allowed_roles:
            frappe.throw(f"Invalid role for {user}: {role}")
        unique_users.add(user)
        cleaned_rows.append({"user": user, "role": role, "enabled": enabled})

    config_doc = _get_or_create_pm_configuration()
    config_doc.set("team_details", [])
    for row in cleaned_rows:
        config_doc.append("team_details", row)
    config_doc.team_setup = 1 if any(row["enabled"] for row in cleaned_rows) else 0
    config_doc.save(ignore_permissions=True)
    return get_team_configuration()


@frappe.whitelist()
def get_project_manager_overview():
    if _is_system_project_manager():
        projects = frappe.get_all(
            "Project",
            fields=["name", "project_name", "status", "expected_start_date", "expected_end_date", "notes"],
            order_by="modified desc",
        )
    else:
        project_names = frappe.get_all(
            "Project User",
            filters={"user": frappe.session.user, "parenttype": "Project", "parentfield": "users"},
            fields=["parent"],
        )
        project_names = [d.parent for d in project_names]
        if not project_names:
            return {
                "stats": {"active_projects": 0, "average_progress": 0, "total_team_members": 0},
                "critical": {"overdue": 0, "due_today": 0, "blocked": 0, "long_pending": 0, "long_pending_days": 7},
                "projects": [],
                "assignable_users": [],
                "available_roles": ["Project Manager", "Team Member", "Viewer"],
                "permissions": {"can_manage_any_team": False},
            }
        projects = frappe.get_all(
            "Project",
            filters={"name": ["in", project_names]},
            fields=["name", "project_name", "status", "expected_start_date", "expected_end_date", "notes"],
            order_by="modified desc",
        )

    project_rows = []
    overall_progress_sum = 0
    has_role_field = frappe.get_meta("Project User").has_field("role")
    user_image_cache = {}

    for project in projects:
        total_tasks = frappe.db.count("Task", {"project": project.name})
        pending_tasks = frappe.db.count("Task", {"project": project.name, "status": ["not in", ["Completed", "Cancelled"]]})
        completed_tasks = max(total_tasks - pending_tasks, 0)
        delayed_tasks = frappe.db.count(
            "Task",
            {"project": project.name, "status": ["not in", ["Completed", "Cancelled"]], "exp_end_date": ["<", frappe.utils.today()]},
        )
        at_risk_tasks = frappe.db.count(
            "Task",
            {
                "project": project.name,
                "status": ["not in", ["Completed", "Cancelled"]],
                "exp_end_date": ["between", [frappe.utils.today(), frappe.utils.add_days(frappe.utils.today(), 3)]],
            },
        )
        progress = round((completed_tasks / total_tasks) * 100) if total_tasks else 0
        overall_progress_sum += progress

        team = frappe.get_all(
            "Project User",
            filters={"parent": project.name, "parenttype": "Project", "parentfield": "users"},
            fields=["user", "full_name", "role"] if has_role_field else ["user", "full_name"],
            order_by="idx asc",
        )
        role_count = {"project_manager": 0, "team_member": 0, "viewer": 0}
        current_user_role = _get_user_project_role(project.name)
        if _is_system_project_manager():
            current_user_role = "Project Manager"

        for member in team:
            role = (member.get("role") or "Team Member").strip()
            member["role"] = role
            if member.get("user"):
                if member.user not in user_image_cache:
                    user_image_cache[member.user] = frappe.db.get_value("User", member.user, "user_image")
                member["user_image"] = user_image_cache.get(member.user)
            if role == "Project Manager":
                role_count["project_manager"] += 1
            elif role == "Viewer":
                role_count["viewer"] += 1
            else:
                role_count["team_member"] += 1

        if project.status in ["Completed", "Cancelled"]:
            health_state = "Completed"
        elif delayed_tasks > 0:
            health_state = "Delayed"
        elif at_risk_tasks > 0:
            health_state = "At Risk"
        else:
            health_state = "On Track"

        project_rows.append(
            {
                "name": project.name,
                "project_name": project.project_name,
                "status": project.status,
                "expected_start_date": project.expected_start_date,
                "expected_end_date": project.expected_end_date,
                "notes": project.notes,
                "progress": progress,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_tasks": pending_tasks,
                "delayed_tasks": delayed_tasks,
                "at_risk_tasks": at_risk_tasks,
                "health_state": health_state,
                "team_count": len(team),
                "role_count": role_count,
                "team": team,
                "current_user_role": current_user_role or "Viewer",
                "permissions": {
                    "can_manage_team": _can_manage_project_team(project.name),
                    "can_edit_tasks": (current_user_role or "") in ["Project Manager", "Team Member"] or _is_system_project_manager(),
                    "read_only": (current_user_role == "Viewer") and not _is_system_project_manager(),
                },
            }
        )

    active_projects = len([p for p in project_rows if p["status"] not in ["Completed", "Cancelled"]])
    average_progress = round(overall_progress_sum / len(project_rows)) if project_rows else 0
    total_team_members = sum(p["team_count"] for p in project_rows)

    configured_users = _get_configured_team_users(frappe.session.user)
    assignable_users = []
    if configured_users:
        assignable_users = frappe.get_all(
            "User",
            filters={"name": ["in", configured_users]},
            fields=["name", "full_name", "user_image"],
            order_by="full_name asc",
            limit_page_length=500,
        )

    today_date = frappe.utils.today()
    long_pending_days = 7
    critical_open = {"project": ["!=", ""], "status": ["not in", ["Completed", "Cancelled"]]}
    critical = {
        "overdue": frappe.db.count("Task", {**critical_open, "exp_end_date": ["<", today_date]}),
        "due_today": frappe.db.count("Task", {**critical_open, "exp_end_date": today_date}),
        "blocked": frappe.db.count("Task", {"project": ["!=", ""], "status": ["in", ["Blocked", "On Hold"]]}),
        "long_pending": frappe.db.count(
            "Task", {**critical_open, "creation": ["<", frappe.utils.add_days(today_date, -long_pending_days)]}
        ),
        "long_pending_days": long_pending_days,
    }

    return {
        "stats": {"active_projects": active_projects, "average_progress": average_progress, "total_team_members": total_team_members},
        "critical": critical,
        "projects": project_rows,
        "assignable_users": assignable_users,
        "available_roles": ["Project Manager", "Team Member", "Viewer"],
        "permissions": {"can_manage_any_team": any(p["permissions"]["can_manage_team"] for p in project_rows)},
    }


@frappe.whitelist()
def save_project_team_roles(project_name, team):
    if not _can_manage_project_team(project_name):
        frappe.throw("You do not have permission to manage this project team.")
    if isinstance(team, str):
        team = frappe.parse_json(team)
    if not isinstance(team, list):
        frappe.throw("Invalid team payload.")

    role_options = {"Project Manager", "Team Member", "Viewer"}
    allowed_team_users = set(_get_configured_team_users(frappe.session.user))
    allowed_team_users.add(frappe.session.user)
    seen_users = set()
    cleaned_team = []
    for row in team:
        user = (row.get("user") or "").strip()
        role = (row.get("role") or "Team Member").strip()
        if not user:
            continue
        if user in seen_users:
            frappe.throw(f"Duplicate team member found: {user}")
        seen_users.add(user)
        if role not in role_options:
            frappe.throw(f"Invalid role for {user}: {role}")
        if user not in allowed_team_users and "System Manager" not in frappe.get_roles(frappe.session.user):
            frappe.throw(f"User {user} is not part of your global team configuration.")
        cleaned_team.append({"user": user, "role": role})

    doc = frappe.get_doc("Project", project_name)
    has_role_field = frappe.get_meta("Project User").has_field("role")
    doc.set("users", [])
    for row in cleaned_team:
        payload = {"user": row["user"]}
        if has_role_field:
            payload["role"] = row["role"]
        doc.append("users", payload)
    doc.save()
    return {"ok": True, "project_name": doc.name}


@frappe.whitelist()
def get_user_member_overview(user):
    if not _is_system_project_manager():
        frappe.throw("You do not have permission to access team member overview.")
    user = (user or "").strip()
    if not user:
        frappe.throw("User is required.")

    user_info = frappe.db.get_value("User", user, ["name", "full_name", "user_image", "email", "enabled"], as_dict=True)
    if not user_info:
        frappe.throw("User not found.")

    links = frappe.get_all(
        "Project User", filters={"user": user, "parenttype": "Project", "parentfield": "users"}, fields=["parent"]
    )
    project_names = [d.parent for d in links]
    projects = []
    for project_name in project_names:
        project = frappe.db.get_value(
            "Project", project_name, ["name", "project_name", "status", "expected_end_date"], as_dict=True
        )
        if not project:
            continue
        project["pending_tasks"] = frappe.db.count("Task", {"project": project_name, "status": ["not in", ["Completed", "Cancelled"]]})
        project["total_tasks"] = frappe.db.count("Task", {"project": project_name})
        projects.append(project)

    current_day = getdate(today())
    fiscal_start_year = current_day.year if current_day.month >= 4 else current_day.year - 1
    start_date = getdate(f"{fiscal_start_year}-04-01")
    end_date = getdate(f"{fiscal_start_year + 1}-03-31")
    activities = frappe.get_all(
        "Task",
        filters={"owner": user, "modified": ["between", [start_date, end_date]]},
        fields=["modified"],
        order_by="modified asc",
        limit_page_length=5000,
    )
    activity_map = {}
    for item in activities:
        day = getdate(item.modified).isoformat()
        activity_map[day] = activity_map.get(day, 0) + 1

    config_row = frappe.get_all(
        "Configuration Item",
        filters={"parent": frappe.session.user, "parenttype": "Project Manager Configuration", "parentfield": "team_details", "user": user},
        fields=["name", "role", "enabled"],
        limit_page_length=1,
    )
    member_profile = {"role": "Team Member", "enabled": 1}
    if config_row:
        member_profile["role"] = config_row[0].role or "Team Member"
        member_profile["enabled"] = int(config_row[0].enabled or 0)

    all_projects = frappe.get_all("Project", fields=["name", "project_name", "status"], order_by="project_name asc")
    return {
        "user": user_info,
        "member_profile": member_profile,
        "projects": projects,
        "all_projects": all_projects,
        "activity": activity_map,
        "activity_start_date": start_date.isoformat() if hasattr(start_date, "isoformat") else str(start_date),
        "activity_end_date": end_date.isoformat(),
    }


@frappe.whitelist()
def save_user_member_profile(user, role="Team Member", active=1, project_names=None):
    if not _is_system_project_manager():
        frappe.throw("You do not have permission to manage team members.")
    user = (user or "").strip()
    if not user:
        frappe.throw("User is required.")
    role = (role or "Team Member").strip()
    if role not in {"Project Manager", "Team Member", "Viewer"}:
        frappe.throw("Invalid role.")
    active = int(frappe.utils.cint(active))
    if isinstance(project_names, str):
        project_names = frappe.parse_json(project_names)
    if project_names is None:
        project_names = []
    if not isinstance(project_names, list):
        frappe.throw("Invalid project list.")
    target_projects = {(p or "").strip() for p in project_names if (p or "").strip()}

    config_doc = _get_or_create_pm_configuration()
    existing_row = None
    for row in config_doc.team_details:
        if row.user == user:
            existing_row = row
            break
    if existing_row:
        existing_row.role = role
        existing_row.enabled = active
    else:
        config_doc.append("team_details", {"user": user, "role": role, "enabled": active})
    config_doc.team_setup = 1 if any(int(r.enabled or 0) for r in config_doc.team_details) else 0
    config_doc.save(ignore_permissions=True)

    user_links = frappe.get_all(
        "Project User", filters={"user": user, "parenttype": "Project", "parentfield": "users"}, fields=["parent"]
    )
    current_projects = {d.parent for d in user_links}
    has_role_field = frappe.get_meta("Project User").has_field("role")

    for project_name in sorted(current_projects - target_projects):
        if not frappe.db.exists("Project", project_name):
            continue
        doc = frappe.get_doc("Project", project_name)
        kept = []
        for child in doc.users:
            if child.user != user:
                kept.append({"user": child.user, "role": getattr(child, "role", None)})
        doc.set("users", [])
        for child in kept:
            payload = {"user": child["user"]}
            if has_role_field and child.get("role"):
                payload["role"] = child.get("role")
            doc.append("users", payload)
        doc.save(ignore_permissions=True)

    for project_name in sorted(target_projects):
        if not frappe.db.exists("Project", project_name):
            continue
        doc = frappe.get_doc("Project", project_name)
        rows = []
        found = False
        for child in doc.users:
            child_role = getattr(child, "role", None)
            if child.user == user:
                found = True
                rows.append({"user": user, "role": role if has_role_field else child_role})
            else:
                rows.append({"user": child.user, "role": child_role})
        if not found:
            rows.append({"user": user, "role": role})
        doc.set("users", [])
        for child in rows:
            payload = {"user": child["user"]}
            if has_role_field and child.get("role"):
                payload["role"] = child.get("role")
            doc.append("users", payload)
        doc.save(ignore_permissions=True)

    return {"ok": True}
