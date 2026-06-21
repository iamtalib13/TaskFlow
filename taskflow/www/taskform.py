import frappe


def get_context(context):
    if frappe.session.user == "Guest":
        redirect_to = "/taskform"
        if frappe.request and frappe.request.query_string:
            redirect_to += f"?{frappe.request.query_string.decode('utf-8')}"
        frappe.local.flags.redirect_location = f"/login?redirect-to={redirect_to}"
        raise frappe.Redirect

    context.no_cache = 1
    context.title = "Task Form"
    context.body_class = "taskflow-portal-page taskform-page"
    return context
