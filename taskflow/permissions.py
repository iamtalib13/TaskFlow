import frappe

def get_task_permission(user):
    """Filter Task list based on user roles and assignment"""
    if not user:
        user = frappe.session.user

    # Roles jo hamesha sab tasks dekh sakte hain
    allowed_roles = ["System Manager", "Task Manager", "Project Manager"]
    user_roles = frappe.get_roles(user)
    if any(role in allowed_roles for role in user_roles):
        return ""  # no filter, show all tasks

    # Employees: only tasks where they are in _assign
    # safe LIKE filter
    return f"""(`tabTask`.`_assign` LIKE '%"{user}"%')"""