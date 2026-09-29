import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    """Fields the task chat stores on Comment: reply link, reactions, edit time."""
    fields = {
        "Comment": [
            {
                "fieldname": "taskflow_chat_section",
                "fieldtype": "Section Break",
                "label": "Taskflow Chat",
                "insert_after": "ip_address",
                "collapsible": 1,
            },
            {
                "fieldname": "taskflow_reply_to",
                "fieldtype": "Link",
                "label": "Reply To",
                "options": "Comment",
                "insert_after": "taskflow_chat_section",
                "read_only": 1,
            },
            {
                "fieldname": "taskflow_edited_at",
                "fieldtype": "Datetime",
                "label": "Edited At",
                "insert_after": "taskflow_reply_to",
                "read_only": 1,
            },
            {
                "fieldname": "taskflow_reactions",
                "fieldtype": "Long Text",
                "label": "Reactions",
                "description": 'JSON map of emoji to user ids, e.g. {"👍": ["a@x.com"]}',
                "insert_after": "taskflow_edited_at",
                "read_only": 1,
            },
        ],
    }
    create_custom_fields(fields, update=True)
