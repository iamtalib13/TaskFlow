import frappe

@frappe.whitelist()
def get_dashboard_data(project=None):
    # 1. Fetch All Projects for Sidebar
    projects = frappe.get_all("Project", fields=["name", "project_name", "status"])
    
    # Base filter: Sirf wahi tasks dikhayein jo kisi project se linked hain (Inbuilt tasks aksar linked nahi hote)
    # Agar aapne koi custom field banayi hai identify karne ke liye, toh wo yahan add karein.
    task_filters = {"project": ["!=", ""]} 
    
    if project:
        task_filters['project'] = project

    # Stats Calculation
    total = frappe.db.count("Task", task_filters)
    pending = frappe.db.count("Task", {**task_filters, "status": ["not in", ["Completed", "Cancelled"]]})
    completed = frappe.db.count("Task", {**task_filters, "status": "Completed"})

    # 2. Members Logic Fix
    # Agar project selected hai, toh sirf us project ke users.
    # Agar All Projects hai, toh un sabhi projects ke unique users.
    user_filters = {"parenttype": "Project"}
    if project:
        user_filters["parent"] = project
    else:
        # All projects ke users uthane ke liye
        user_filters["parent"] = ["in", [p.name for p in projects]]
    
    project_users = frappe.get_all("Project User", filters=user_filters, fields=["user"])
    unique_users = list(set([d.user for d in project_users]))

    members_data = []
    for user_id in unique_users:
        full_name = frappe.db.get_value("User", user_id, "full_name") or user_id
        
        # Member ke liye filters: 
        # Agar hum specific project mein hain, toh sirf us project ke tasks count honge.
        # Agar All Projects mein hain, toh un saare projects ke tasks count honge jo upar list hue hain.
        m_task_filters = {"owner": user_id, "project": ["!=", ""]}
        if project:
            m_task_filters["project"] = project
            
        m_total = frappe.db.count("Task", m_task_filters)
        m_pending = frappe.db.count("Task", {**m_task_filters, "status": ["not in", ["Completed", "Cancelled"]]})

        members_data.append({
            "full_name": full_name,
            "total_tasks": m_total,
            "pending_tasks": m_pending,
            "user_id": user_id
        })

    return {
        "projects": projects,
        "stats": [
            {"label": "Total Tasks", "value": total},
            {"label": "Pending", "value": pending},
            {"label": "Completed", "value": completed}
        ],
        "members": members_data
    }
# -------------------
# Task List API with Pagination
# -------------------
@frappe.whitelist()
def get_task_list(project=None, start=0, page_length=20):
    filters = {"project": ["!=", ""]} # Sirf project linked tasks
    if project:
        filters["project"] = project
        
    return frappe.get_list("Task", 
        filters=filters,
        fields=["name", "subject", "status", "owner", "exp_end_date"],
        start=start,
        page_length=page_length,
        order_by="creation desc"
    )