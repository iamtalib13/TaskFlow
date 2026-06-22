import frappe
from frappe.desk.form.assign_to import add

def execute():
	# Get all Taskflow Tasks where assigned_to_user is set
	tasks = frappe.get_all(
		"Taskflow Task",
		filters={
			"assigned_to_user": ["is", "set"]
		},
		fields=["name", "assigned_to_user", "_assign"]
	)

	for task in tasks:
		user = task.assigned_to_user
		if not user:
			continue

		# Parse existing _assign field
		existing_assignees = []
		if task.get("_assign"):
			try:
				existing_assignees = frappe.parse_json(task._assign)
			except Exception:
				pass

		# If user is not already in the _assign list, assign them
		if user not in existing_assignees:
			try:
				add({
					"doctype": "Taskflow Task",
					"name": task.name,
					"assign_to": [user],
					"ignore_permissions": True
				})
			except Exception as e:
				frappe.log_error(
					message=f"Error assigning task {task.name} to {user}: {str(e)}",
					title="Sync Assign To User Patch"
				)
