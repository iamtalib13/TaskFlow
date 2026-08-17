app_name = "taskflow"
app_title = "Taskflow"
app_publisher = "Talib Sheikh"
app_description = "TaskFlow is a high-performance Frappe app designed to simplify project management. It acts as a streamlined interface for the ERPNext Project Module, bringing Managers and Team Members onto a single, intuitive dashboard to manage tasks, timelines, and collaboration without the complexity of a full ERP."
app_email = "talibsheikh16@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "taskflow",
# 		"logo": "/assets/taskflow/logo.png",
# 		"title": "Taskflow",
# 		"route": "/taskflow",
# 		"has_permission": "taskflow.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/taskflow/css/taskflow.css"
# app_include_js = "/assets/taskflow/js/taskflow.js"

# include js, css files in header of web template
# web_include_css = "/assets/taskflow/css/taskflow.css"
# web_include_js = "/assets/taskflow/js/taskflow.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "taskflow/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "taskflow/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

website_route_rules = [
    {"from_route": "/taskflow/<path:app_path>", "to_route": "taskflow"},
]

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "taskflow.utils.jinja_methods",
# 	"filters": "taskflow.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "taskflow.install.before_install"
# after_install = "taskflow.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "taskflow.uninstall.before_uninstall"
# after_uninstall = "taskflow.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "taskflow.utils.before_app_install"
# after_app_install = "taskflow.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "taskflow.utils.before_app_uninstall"
# after_app_uninstall = "taskflow.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "taskflow.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
    "Task": "taskflow.permissions.get_task_permission",
    "Taskflow Team": "taskflow.permissions.get_taskflow_team_permission",
    "Taskflow Project": "taskflow.permissions.get_taskflow_project_permission",
    "Taskflow Task": "taskflow.permissions.get_taskflow_task_permission",
}
#
has_permission = {
	"Taskflow Team": "taskflow.permissions.has_taskflow_team_permission",
	"Taskflow Project": "taskflow.permissions.has_taskflow_project_permission",
	"Taskflow Task": "taskflow.permissions.has_taskflow_task_permission",
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

scheduler_events = {
	"daily": [
		"taskflow.tasks.mark_overdue_tasks"
	],
	"cron": {
		# Every day at 7:00 PM — send completed task email for teams with send_email=1
		"0 19 * * *": [
			"taskflow.tasks.send_daily_completed_task_email"
		],
	},
}

# Testing
# -------

# before_tests = "taskflow.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "taskflow.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "taskflow.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["taskflow.utils.before_request"]
# after_request = ["taskflow.utils.after_request"]

# Job Events
# ----------
# before_job = ["taskflow.utils.before_job"]
# after_job = ["taskflow.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"taskflow.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
