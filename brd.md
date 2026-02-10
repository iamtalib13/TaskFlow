# 🚀 TaskFlow: Project Management App Blueprint (Frappe UI v16)

TaskFlow ek modern project management application hai jo **Frappe Framework** (Backend) aur **Frappe UI** (Frontend) par build hai. Iska objective Project Managers ko v16 jaisa sleek interface aur seamless team management provide karna hai.

---

## 🛠 1. Technical Stack & Roles

- **Backend:** Frappe Framework v15/v16 (Python, MariaDB)
- **Frontend:** Frappe UI (Vue 3, TailwindCSS, Headless UI)
- **Icons:** Lucide Icons / Feather Icons
- **User Roles:**
- **Project Manager:** Full control (Create Projects/Tasks, Manage Team).
- **Team Member:** View assigned tasks & Fill Timesheets.
- **Viewer:** Read-only access to progress.

---

## 🏗 2. Data Model (DocTypes)

Humne 3 core DocTypes define kiye hain:

| DocType       | Fields Key                                                | Linkages         |
| ------------- | --------------------------------------------------------- | ---------------- |
| **Project**   | `project_name`, `status`, `manager`, `end_date`           | Primary Master   |
| **Task**      | `subject`, `project`, `assigned_to`, `priority`, `status` | Child of Project |
| **Timesheet** | `task`, `hours`, `description`, `user`, `date`            | Log of Task      |

---

## 🔗 3. Backend Logic Integration (`taskflow/api.py`)

Frontend (Frappe UI) ko fast metrics dene ke liye optimized endpoints:

```python
import frappe
from frappe import _

@frappe.whitelist()
def get_manager_dashboard_stats():
    """Project Manager dashboard ke liye single-call stats"""
    return {
        "active_projects": frappe.db.count("Project", {"status": ["!=", "Completed"]}),
        "pending_tasks": frappe.db.count("Task", {"status": ["!=", "Done"]}),
        "overdue_tasks": frappe.db.count("Task", {
            "status": ["!=", "Done"],
            "end_date": ["<", frappe.utils.today()]
        })
    }

@frappe.whitelist()
def update_task_status(task_name, status):
    """Kanban Drag-n-Drop support ke liye status update API"""
    doc = frappe.get_doc("Task", task_name)
    doc.status = status
    doc.save()
    return _("Task updated successfully")

```

---

## 💻 4. Frontend Implementation (Frappe UI)

Chunki aapne frontend pehle hi initiate kar diya hai, ab hume use v16 style mein map karna hai.

### I. Global Resource Binding

`src/resources/index.js` (ya main file) mein in resources ko define karein:

```javascript
import { createListResource, createResource } from "frappe-ui";

// 1. Projects List
export const projectsResource = createListResource({
  doctype: "Project",
  fields: ["*"],
  auto: true,
});

// 2. Dashboard Stats
export const dashboardStats = createResource({
  url: "taskflow.api.get_manager_dashboard_stats",
  auto: true,
});
```

### II. v16 UI Layout Logic

Frappe v16 style achieve karne ke liye standard components use karein:

- **Navigation:** `Sidebar` component with Lucide icons (Layout.vue).
- **Dashboard Cards:** `stats` resource se data binding.
- **Task List:** `ListView` with customized rows for priority colors.

---

## 🎨 5. UI Style Guide (Talib's TaskFlow Design)

- **Colors:** Primary Color (#1F2937 - Dark Gray/Indigo hybrid).
- **Typography:** Inter font family.
- **Cards:** \* Background: `#FFFFFF`
- Border: `1px solid #F3F4F6`
- Shadow: `shadow-sm` on rest, `shadow-md` on hover.

---

## ⚙️ 6. Hooks & Events (`hooks.py`)

System automation ke liye hooks ka injection:

```python
# Project complete automatically when tasks are done
doc_events = {
    "Task": {
        "on_update": "taskflow.api.handle_task_completion"
    }
}

# Export custom frontend build to Frappe Desk
app_include_js = "/assets/taskflow/js/taskflow.bundle.js"

```

---

## 🚀 7. Step-by-Step Execution Plan

1. **Backend Config:** Doctypes create karein aur `api.py` mein functions likhein.
2. **Role Setup:** Role Permissions Manager mein Project Manager ko task/project ka access dein.
3. **Frontend Binding:** initiated frontend folder mein jaakar `createListResource` se Task list display karein.
4. **v16 Styling:** Tailwind CSS class `rounded-lg`, `border-gray-200`, aur `text-gray-900` ka consistently use karein.
5. **Build:** `bench build --app taskflow` karke desk interface ke saath sync karein.

---

### Key Reminders for Development:

> - `bench start` hamesha background mein chalu rakhein.
> - Frontend ke liye `npm run dev` use karein (Vite auto-reload ke liye).
> - Frappe UI ke components ko customize karne ke liye Tailwind best practice hai.

---
