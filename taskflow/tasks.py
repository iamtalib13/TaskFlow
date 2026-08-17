import frappe
from frappe.utils import today, nowdate


def mark_overdue_tasks():
	"""Daily cron: Mark tasks as Overdue if due_date has passed and status is still active."""
	overdue_tasks = frappe.get_all(
		"Taskflow Task",
		filters={
			"due_date": ["<", today()],
			"status": ["in", ["Open", "In Progress"]],
		},
		fields=["name"],
	)

	for task in overdue_tasks:
		frappe.db.set_value("Taskflow Task", task.name, "status", "Overdue", update_modified=False)

	if overdue_tasks:
		frappe.db.commit()
		frappe.logger().info(f"Marked {len(overdue_tasks)} task(s) as Overdue")


def send_daily_completed_task_email():
	"""
	Cron at 4:20 PM daily:
	For every active Taskflow Team that has send_email=1, fetch all tasks
	completed today across that team's projects and email the report to all
	active team members.
	"""
	today_date = nowdate()  # e.g. "2026-08-17"

	# 1. Get all active teams with send_email enabled
	teams = frappe.get_all(
		"Taskflow Team",
		filters={"send_email": 1, "is_active": 1},
		fields=["name", "team_name"],
	)

	if not teams:
		frappe.logger().info("TaskFlow Email Cron: No teams with send_email enabled.")
		return

	for team in teams:
		# 2. Get all projects belonging to this team
		projects = frappe.get_all(
			"Taskflow Project",
			filters={"team": team.name},
			fields=["name", "project_name"],
		)

		if not projects:
			continue

		project_ids = [p.name for p in projects]
		project_name_map = {p.name: p.project_name for p in projects}

		# 3. Get all tasks completed today for these projects
		completed_tasks = frappe.get_all(
			"Taskflow Task",
			filters={
				"team": team.name,
				"project": ["in", project_ids],
				"status": "Completed",
				"completed_on": ["between", [today_date + " 00:00:00", today_date + " 23:59:59"]],
			},
			fields=[
				"name",
				"task_title",
				"project",
				"assigned_to",
				"priority",
				"completed_on",
				"progress_percent",
			],
			order_by="completed_on asc",
		)

		if not completed_tasks:
			frappe.logger().info(
				f"TaskFlow Email Cron: No completed tasks today for team '{team.team_name}'. Skipping."
			)
			continue

		# 4. Build HTML email body
		html_body = _build_email_html(team.team_name, today_date, completed_tasks, project_name_map)

		# 5. Collect recipients — fixed address + all active team members with a valid user email
		FIXED_RECIPIENTS = ["iamfaijankq@gmail.com"]

		members = frappe.get_all(
			"Taskflow Team Member",
			filters={"parent": team.name, "is_active": 1},
			fields=["user"],
		)

		recipients = list(FIXED_RECIPIENTS)  # always include fixed address
		for m in members:
			if not m.user:
				continue
			email = frappe.db.get_value("User", m.user, "email")
			if email and email not in recipients:
				recipients.append(email)

		if not recipients:
			frappe.logger().info(
				f"TaskFlow Email Cron: No recipients for team '{team.team_name}'. Skipping."
			)
			continue

		# 6. Send the email
		subject = f"✅ TaskFlow Daily Report — {team.team_name} | {today_date}"
		frappe.sendmail(
			recipients=recipients,
			cc=["suraiyyasutriya2@gmail.com"],
			subject=subject,
			message=html_body,
			now=True,
		)

		frappe.logger().info(
			f"TaskFlow Email Cron: Sent report for team '{team.team_name}' "
			f"({len(completed_tasks)} tasks) to {len(recipients)} recipient(s)."
		)


def _build_email_html(team_name, date, tasks, project_name_map):
	"""Build a clean HTML email body for the completed task report."""

	priority_colors = {
		"Critical": "#dc2626",
		"High": "#ea580c",
		"Medium": "#d97706",
		"Low": "#16a34a",
	}

	rows_html = ""
	for i, task in enumerate(tasks):
		project_label = project_name_map.get(task.project, task.project or "—")
		assigned = task.assigned_to or "—"
		priority = task.priority or "—"
		priority_color = priority_colors.get(priority, "#6b7280")
		completed_time = str(task.completed_on)[:16] if task.completed_on else "—"
		progress = int(task.progress_percent or 100)
		bg = "#f9fafb" if i % 2 == 0 else "#ffffff"

		rows_html += f"""
		<tr style="background:{bg};">
			<td style="padding:10px 14px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">{task.task_title}</td>
			<td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">{project_label}</td>
			<td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">{assigned}</td>
			<td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e5e7eb;">
				<span style="color:{priority_color};font-weight:600;">{priority}</span>
			</td>
			<td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">{progress}%</td>
			<td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">{completed_time}</td>
		</tr>"""

	return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1e293b;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                ✅ TaskFlow Daily Report
              </h1>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">
                Team: <strong style="color:#e2e8f0;">{team_name}</strong> &nbsp;|&nbsp; Date: <strong style="color:#e2e8f0;">{date}</strong>
              </p>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:14px;color:#374151;">
                Here is a summary of <strong>{len(tasks)} task(s)</strong> completed today by the <strong>{team_name}</strong> team.
              </p>
            </td>
          </tr>

          <!-- Table -->
          <tr>
            <td style="padding:20px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Task</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Project</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Assigned To</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Priority</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Progress</th>
                    <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #e5e7eb;">Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {rows_html}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                This is an automated report from <strong>TaskFlow</strong>. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
