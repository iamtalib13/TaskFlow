from frappe import _


def get_data():
	return {
		"heatmap": True,
		"heatmap_message": _("This is based on Taskflow Task activity recorded against this project."),
		"fieldname": "project",
		"transactions": [
			{
				"label": _("Execution"),
				"items": ["Taskflow Task"],
			}
		],
	}
