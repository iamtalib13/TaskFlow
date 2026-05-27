import frappe
from frappe.boot import load_translations

no_cache = 1


def get_context(context):
    csrf_token = frappe.sessions.get_csrf_token()
    frappe.db.commit()  # nosempgrep
    context = frappe._dict()
    context.csrf_token = csrf_token
    context.site_name = frappe.local.site
    context.boot = get_boot()
    context.title = "Taskflow"
    context.body_class = "taskflow-page"
    return context


def get_boot():
    bootinfo = frappe._dict(
        {
            "site_name": frappe.local.site,
            "default_route": "/taskflow",
        }
    )
    bootinfo.lang = frappe.local.lang
    load_translations(bootinfo)
    return bootinfo
