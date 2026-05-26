import frappe


def get_context(context):
    context.no_cache = 1
    context.title = "Taskflow"
    context.body_class = "taskflow-v1-page"
    return context
