import frappe


def execute():
    """Migrate _assign user emails from Taskflow Task into table_gqbl (Task Assignment) child table."""
    tasks = frappe.get_all(
        "Taskflow Task",
        fields=["name", "_assign"],
        filters={"_assign": ["is", "set"]},
    )

    for task in tasks:
        try:
            users = frappe.parse_json(task._assign) if task._assign else []
        except Exception:
            continue

        if not users:
            continue

        existing = {
            row.user_id
            for row in frappe.get_all(
                "Task Assignment",
                filters={"parent": task.name},
                fields=["user_id"],
            )
        }

        new_rows = [u for u in users if u and u not in existing]
        if not new_rows:
            continue

        doc = frappe.get_doc("Taskflow Task", task.name)
        for user_id in new_rows:
            doc.append("table_gqbl", {"user_id": user_id})
        doc.save(ignore_permissions=True, ignore_version=True)
        frappe.db.commit()
