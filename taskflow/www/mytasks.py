import frappe
import frappe.sessions


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/mytasks"
		raise frappe.Redirect

	if isinstance(context, dict) and not isinstance(context, frappe._dict):
		context = frappe._dict(context)

	context.no_cache = 1
	context.title = "Tasks"
	context.boot = get_bootinfo()
	return context


def get_bootinfo():
	csrf_token = ""
	if hasattr(frappe.local, "session") and getattr(frappe.local.session, "data", None):
		csrf_token = frappe.local.session.data.get("csrf_token", "")

	if not csrf_token:
		try:
			csrf_token = frappe.sessions.get_csrf_token()
		except Exception:
			csrf_token = ""

	return {
		"site_name": frappe.local.site,
		"csrf_token": csrf_token,
	}
