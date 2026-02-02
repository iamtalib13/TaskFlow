import frappe
from frappe.utils import getdate, today, date_diff

@frappe.whitelist()
def get_dashboard_data(project=None):
    # ... (existing code)

@frappe.whitelist()
def get_task_list(project=None, start=0, page_length=10, only_my_tasks=False):
    filters = {"project": ["!=", ""]}
    
    if only_my_tasks:
        filters["owner"] = frappe.session.user
    
    if project: 
        filters["project"] = project

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
    
    stats = [
        {"label": "My Total Tasks", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""]})},
        {"label": "My Pending", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""], "status": ["not in", ["Completed", "Cancelled"]]})},
        {"label": "My Completed", "value": frappe.db.count("Task", {"owner": user, "project": ["!=", ""], "status": "Completed"})}
    ]
    
    return {"stats": stats}

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