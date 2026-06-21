import frappe
from frappe.utils import today


def mark_overdue_tasks():
	"""Daily cron: Mark tasks as Overdue if due_date has passed and status is still active."""
	overdue_tasks = frappe.get_all(
		"Taskflow Task",
		filters={
			"due_date": ["<", today()],
			"status": ["in", ["Open", "In Progress", "Review", "On Hold"]],
		},
		fields=["name"],
	)

	for task in overdue_tasks:
		frappe.db.set_value("Taskflow Task", task.name, "status", "Overdue", update_modified=False)

	if overdue_tasks:
		frappe.db.commit()
		frappe.logger().info(f"Marked {len(overdue_tasks)} task(s) as Overdue")
