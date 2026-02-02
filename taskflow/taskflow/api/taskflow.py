import frappe

@frappe.whitelist()
def get_dashboard_data(project=None):
    # Sirf dates fetch karne ke liye fields add kiye hain
    raw_projects = frappe.get_all("Project", fields=["name", "project_name", "status", "expected_start_date", "expected_end_date"])
    
    projects_with_counts = []
    selected_project_info = None

    for p in raw_projects:
        p_pending = frappe.db.count("Task", {"project": p.name, "status": ["not in", ["Completed", "Cancelled"]]})
        project_data = {
            "name": p.name,
            "project_name": p.project_name,
            "status": p.status,
            "pending_count": p_pending,
            "start": p.expected_start_date,
            "end": p.expected_end_date
        }
        projects_with_counts.append(project_data)
        if project and p.name == project:
            selected_project_info = project_data

    task_filters = {"project": ["!=", ""]} 
    if project:
        task_filters['project'] = project

    total = frappe.db.count("Task", task_filters)
    pending = frappe.db.count("Task", {**task_filters, "status": ["not in", ["Completed", "Cancelled"]]})
    completed = frappe.db.count("Task", {**task_filters, "status": "Completed"})

    user_filters = {"parenttype": "Project"}
    if project:
        user_filters["parent"] = project
    else:
        user_filters["parent"] = ["in", [p['name'] for p in projects_with_counts]]
    
    project_users = frappe.get_all("Project User", filters=user_filters, fields=["user"])
    unique_users = list(set([d.user for d in project_users]))

    members_data = []
    for user_id in unique_users:
        full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
        m_task_filters = {"owner": user_id, "project": ["!=", ""]}
        if project: m_task_filters["project"] = project
            
        m_total = frappe.db.count("Task", m_task_filters)
        m_pending = frappe.db.count("Task", {**m_task_filters, "status": ["not in", ["Completed", "Cancelled"]]})

        members_data.append({
            "full_name": full_name,
            "total_tasks": m_total,
            "pending_tasks": m_pending,
            "user_id": user_id
        })

    return {
        "projects": projects_with_counts,
        "selected_project_info": selected_project_info, # Naya data
        "stats": [
            {"label": "Total Tasks", "value": total},
            {"label": "Pending", "value": pending},
            {"label": "Completed", "value": completed}
        ],
        "members": members_data
    }

@frappe.whitelist()
def get_task_list(project=None, start=0, page_length=10):
    filters = {"project": ["!=", ""]}
    if project: filters["project"] = project
    tasks = frappe.get_list("Task", 
        filters=filters,
        fields=["name", "subject", "status", "owner", "priority"],
        start=start, page_length=page_length, order_by="creation desc"
    )
    total_count = frappe.db.count("Task", filters)
    return {"tasks": tasks, "has_more": int(start) + int(page_length) < total_count}