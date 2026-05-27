import frappe


def get_context(context):
	frappe.local.flags.redirect_location = "/taskflow"
	raise frappe.Redirect
