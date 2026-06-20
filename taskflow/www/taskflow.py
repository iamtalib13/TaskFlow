import frappe


def get_context(context):
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/taskflow"
        raise frappe.Redirect

    context.no_cache = 1
    context.title = "Taskflow Portal"
    context.body_class = "taskflow-portal-page"
    return context