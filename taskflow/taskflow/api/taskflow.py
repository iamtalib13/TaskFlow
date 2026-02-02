import frappe
from frappe.utils import getdate, today, date_diff

@frappe.whitelist()
def get_dashboard_data(project=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    project_filters = {}
    
    if "System Manager" in roles:
        pass # No filter
    elif "Projects Manager" in roles:
        # Filter 1: Projects created by this user
        project_filters["owner"] = user
    else:
        # Filter 2: Projects where user is a member (Employee)
        assigned_projects = frappe.get_all("Project User", {"user": user}, "parent")
        project_ids = [d.parent for d in assigned_projects]
        if project_ids:
            project_filters["name"] = ["in", project_ids]
        else:
            # If no projects assigned, show nothing (or dummy filter that fails)
            project_filters["name"] = "No Project Assigned"

    # Existing Projects fetch logic
    raw_projects = frappe.get_all("Project", filters=project_filters, fields=["name", "project_name", "status", "expected_start_date", "expected_end_date"])
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
def get_task_list(project=None, start=0, page_length=10, only_my_tasks=False):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = {"project": ["!=", ""]}
    
    if only_my_tasks:
        filters["owner"] = user
    
    if project: 
        filters["project"] = project
        
        # Enforce Role Permissions for Project View
        if "System Manager" in roles:
            pass # See all
        elif "Projects Manager" in roles:
            # See all if owner of project, else only own tasks
            if frappe.db.get_value("Project", project, "owner") != user:
                filters["owner"] = user
        else:
            # Employee: See only own tasks
            filters["owner"] = user

    # 1. Task list fetch karein naye date fields ke saath
    tasks = frappe.get_list("Task", 
        filters=filters,
        # Naye fields add kiye: exp_start_date, exp_end_date
        fields=["name", "subject", "status", "owner", "priority", "exp_start_date", "exp_end_date", "project"],
        start=start, 
        page_length=page_length, 
        order_by="creation desc",
        ignore_permissions=True 
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
    roles = frappe.get_roles(user)
    is_manager = "Projects Manager" in roles or "System Manager" in roles
    
    # 1. Basic Stats (For Everyone)
    stats = [
        {"label": "My Total Tasks", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""]})},
        {"label": "My Pending", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""], "status": ["not in", ["Completed", "Cancelled"]]})},
        {"label": "My Completed", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""], "status": "Completed"})}
    ]
    
    insights = {}
    
    if is_manager:
        current_date = getdate(today())
        
        # 2. Project Health Pulse (Traffic Lights)
        p_filters = {"status": ["in", ["Open", "In Progress"]]}
        if "System Manager" not in roles:
            p_filters["owner"] = user
            
        projects = frappe.get_all("Project", filters=p_filters, fields=["expected_end_date"])
        
        health = {"on_track": 0, "at_risk": 0, "delayed": 0}
        risk_threshold = getdate(add_days(current_date, 3))
        
        for p in projects:
            if not p.expected_end_date:
                health["on_track"] += 1
                continue
                
            end_date = getdate(p.expected_end_date)
            if end_date < current_date:
                health["delayed"] += 1
            elif end_date <= risk_threshold:
                health["at_risk"] += 1
            else:
                health["on_track"] += 1
        
        insights["health"] = health

        # 3. Top 3 Priorities
        priorities = frappe.get_list("Task",
            filters={
                "status": ["in", ["Open", "Working", "Pending Review"]],
                "priority": ["in", ["Urgent", "High"]],
                "project": ["!=", ""]
            },
            fields=["name", "subject", "priority", "exp_end_date", "owner"],
            order_by="exp_end_date asc",
            limit=3
        )
        insights["priorities"] = priorities

        # 4. Team Workload
        workload_data = frappe.db.sql("""
            SELECT owner, COUNT(name) as count 
            FROM `tabTask` 
            WHERE status NOT IN ('Completed', 'Cancelled') AND project != ''
            GROUP BY owner 
            ORDER BY count DESC 
            LIMIT 5
        """, as_dict=True)
        
        for w in workload_data:
            w["full_name"] = frappe.db.get_value("User", w.owner, "full_name") or w.owner
            
        insights["workload"] = workload_data

        # 5. Stuck Indicators
        three_days_ago = add_days(today(), -3)
        stuck_count = frappe.db.count("Task", {
            "status": ["in", ["Open", "Working"]],
            "modified": ["<=", three_days_ago],
            "project": ["!=", ""]
        })
        insights["stuck_count"] = stuck_count

    return {"stats": stats, "insights": insights}

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
def add_comment(task_name, content):
    doc = frappe.get_doc("Task", task_name)
    comment = doc.add_comment("Comment", content)
    return {
        "content": comment.content,
        "owner": comment.owner,
        "creation": comment.creation,
        "comment_by": comment.comment_by
    }