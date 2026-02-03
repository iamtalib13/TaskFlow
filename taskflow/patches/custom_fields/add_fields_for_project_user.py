import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Project User": [
            {
                "fieldname": "role",
                "fieldtype": "Select",
                "label": "Role",
                "options": "Project Manager\nTeam Member\nViewer",
                "insert_after": "user", 
                "reqd": 1,
                "default": "Team Member",
                "in_list_view":1
            }
        ],
    }
    create_custom_fields(fields, update=True)