import frappe

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
def get_task_list(project=None, start=0, page_length=10):
    filters = {"project": ["!=", ""]}
    if project: 
        filters["project"] = project

    # 1. Task list fetch karein naye date fields ke saath
    tasks = frappe.get_list("Task", 
        filters=filters,
        # Naye fields add kiye: exp_start_date, exp_end_date
        fields=["name", "subject", "status", "owner", "priority", "exp_start_date", "exp_end_date"],
        start=start, 
        page_length=page_length, 
        order_by="creation desc",
        ignore_permissions=True 
    )

    # 2. Har task ke liye owner ka first_name fetch karein
    for task in tasks:
        user_info = frappe.db.get_value("User", task.owner, ["first_name"], as_dict=True)
        task["owner_name"] = user_info.get("first_name") if user_info else task.owner

    total_count = frappe.db.count("Task", filters)
    return {"tasks": tasks, "has_more": int(start) + int(page_length) < total_count}

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