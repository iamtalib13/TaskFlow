frappe.pages["taskflow"].on_page_load = function (wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "TaskFlow",
		single_column: true,
	});

	frappe.require("/assets/taskflow/js/petite-vue.iife.js", () => {
		page.main.html(`
            <div id="taskflow-app" v-scope @vue:mounted="init()" class="container-fluid py-3" style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; height: calc(100vh - 60px); overflow: hidden;">
                
                <style>
                    .selected-project-active {
                        background-color: #f0f7ff !important;
                        color: #0969da !important;
                        font-weight: 600 !important;
                        border-left: 3px solid #0969da !important;
                        padding-left: 8px !important;
                    }
                    .btn-create-project {
                        background-color: #1f2328;
                        color: white;
                        border-radius: 6px;
                        padding: 4px 12px;
                        font-size: 13px;
                        font-weight: 600;
                        transition: 0.2s;
                    }
                    .btn-create-project:hover { background-color: #2d3795ff; color: white; }
                    
                    /* Custom Scrollbar for a cleaner SPA look */
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: #d0d7de; border-radius: 10px; }
                    ::-webkit-scrollbar-thumb:hover { background: #afb8c1; }
                </style>

                <div class="row m-0 h-100">
                    <!-- Left Sidebar -->
                    <div class="col-md-3 p-0 pr-4 d-flex flex-column h-100">
                        <!-- Profile Card -->
                        <div class="flex-shrink-0 mb-4 border rounded p-3 bg-white shadow-sm position-relative">
                             <div class="d-flex align-items-center" style="gap: 12px;">
                                <div class="position-relative">
                                    <img :src="user.user_image" v-if="user.user_image" class="rounded-circle border" style="width: 48px; height: 48px; object-fit: cover;">
                                    <div v-else class="rounded-circle border d-flex align-items-center justify-content-center bg-light text-muted" style="width: 48px; height: 48px; font-size: 20px;">
                                        <i class="fa fa-user"></i>
                                    </div>
                                    <button class="btn btn-sm bg-white text-muted border position-absolute d-flex align-items-center justify-content-center shadow-sm" 
                                        style="bottom: -4px; right: -4px; width: 22px; height: 22px; padding: 0; border-radius: 50%;"
                                        @click="editProfile()" title="Edit Profile">
                                        <i class="fa fa-pencil" style="font-size: 10px;"></i>
                                    </button>
                                </div>
                                <div style="min-width: 0;">
                                    <div class="font-weight-bold text-truncate" style="color: #1f2328; font-size: 14px;">[[ getDisplayName() ]]</div>
                                    <div v-if="user.role_label" class="badge badge-light border mb-1 px-2" style="font-size: 10px; color: #57606a;">[[ user.role_label ]]</div>
                                    <div class="text-muted text-truncate" style="font-size: 12px;" v-if="user.company_email">
                                        <i class="fa fa-envelope-o mr-1"></i>[[ user.company_email ]]
                                    </div>
                                    <div class="text-muted text-truncate" style="font-size: 12px;" v-else>
                                         <i class="fa fa-envelope-o mr-1"></i>[[ user.email ]]
                                    </div>
                                </div>
                             </div>
                             
                             <!-- Email Warning -->
                             <div v-if="!user.company_email" class="mt-3 p-2 rounded border border-warning bg-warning-light d-flex align-items-start" style="background-color: #fff8c5; border-color: #d4a72c !important;">
                                <i class="fa fa-exclamation-triangle text-warning mr-2 mt-1"></i>
                                <div style="font-size: 11px; line-height: 1.3; color: #574600;">
                                    <strong>Action Needed:</strong> Company email is missing. You may not receive email notifications. 
                                    <a href="#" @click.prevent="editProfile()" style="text-decoration: underline; color: #574600;">Add now</a>
                                </div>
                             </div>

                             <div class="mt-3">
                                <button class="btn btn-sm btn-light border w-100 shadow-sm" style="font-size: 12px; color: #1f2328;" @click="goToUserOverview()">
                                    <i class="fa fa-th-large mr-2"></i> My Dashboard
                                </button>
                             </div>
                        </div>

                        <div class="flex-shrink-0 mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="font-weight-bold m-0" style="font-size: 14px; color: #1f2328;">Projects</h6>
                            </div>
                            <div class="d-flex" style="gap: 8px;">
                                <input type="text" class="form-control form-control-sm border-secondary-subtle shadow-none flex-grow-1" style="background: #f6f8fa;" placeholder="Filter projects" v-model="searchProject">
                                <button v-if="user.is_manager" class="btn-create-project d-flex align-items-center justify-content-center" style="padding: 4px 12px; font-size: 12px; white-space: nowrap;" @click="openCreateModal()" title="Create Project">
                                    <i class="fa fa-plus mr-1"></i> Create Project
                                </button>
                            </div>
                        </div>
                        <div class="list-group flex-grow-1 overflow-auto pr-1" style="min-height: 0;">
                            <div v-if="filteredProjects.length > 0">
                                <div v-for="p in filteredProjects" @click="selectProject(p)" 
                                     :class="['py-2 px-1 border-bottom d-flex justify-content-between align-items-center', selectedProject === p.name ? 'selected-project-active' : 'border-transparent']" 
                                     style="cursor: pointer; font-size: 14px;">
                                    <span><i class="fa fa-book mr-2" :style="{color: selectedProject === p.name ? '#0969da' : '#636c76'}"></i> [[ p.project_name ]]</span>
                                    <span v-if="p.pending_count > 0" class="badge badge-pill text-white" style="background-color: #f85149; font-size: 10px;">[[ p.pending_count ]]</span>
                                </div>
                            </div>
                            <div v-else class="text-center py-5 px-2">
                                <div class="mb-3"><i class="fa fa-search fa-2x text-muted" style="opacity: 0.3;"></i></div>
                                <div class="text-muted small mb-3">No projects found matching "[[ searchProject ]]"</div>
                                <button v-if="user.is_manager" class="btn-create-project" style="font-size: 12px;" @click="openCreateModal()">
                                    <i class="fa fa-plus mr-1"></i> Create Project
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="col-md-9 p-0 border-left pl-4 d-flex flex-column h-100" style="border-color: #d0d7de !important;">
                        
                        <!-- User Overview Mode -->
                        <div v-if="isUserOverview" class="d-flex flex-column h-100">
                            <div class="flex-shrink-0 mb-4">
                                <h5 class="font-weight-bold mb-3" style="color: #1f2328;">My Dashboard</h5>
                                <div class="row no-gutters" style="gap: 15px;">
                                    <div class="col shadow-none border rounded p-3 bg-white" v-for="stat in userOverviewStats" style="border-color: #d0d7de !important;">
                                        <div style="font-size: 11px; color: #636c76; text-transform: uppercase; letter-spacing: 0.5px;">[[ stat.label ]]</div>
                                        <div style="font-size: 22px; font-weight: 600; color: #1f2328;">[[ stat.value ]]</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex-grow-1 overflow-auto pr-1 border rounded bg-white shadow-sm" style="min-height: 0; border-color: #d0d7de !important;">
                                <div class="p-3 border-bottom bg-light">
                                     <h6 class="m-0 font-weight-bold" style="font-size: 13px;">My Tasks Across All Projects</h6>
                                </div>
                                <table class="table table-hover mb-0" style="font-size: 13px;">
                                    <thead class="bg-white text-muted">
                                        <tr>
                                            <th>Task Subject</th><th>Project</th><th>Status</th><th>Exp. Start</th><th>Exp. End</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="t in tasks">
                                            <td><a :href="'/app/task/' + t.name" class="font-weight-bold" style="color: #0969da;">[[ t.subject ]]</a></td>
                                            <td><span class="text-muted">[[ t.project_title ]]</span></td>
                                            <td><span class="badge" :class="t.status === 'Completed' ? 'badge-success' : 'badge-warning'">[[ t.status ]]</span></td>
                                            <td class="text-muted">[[ formatDate(t.exp_start_date) ]]</td>
                                            <td class="text-muted">[[ formatDate(t.exp_end_date) ]]</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div id="task-end-marker" style="height: 20px;"></div>
                            </div>
                        </div>

                        <div v-else class="d-flex flex-column h-100">
                            <div class="flex-shrink-0">
                            <div class="mb-3 d-flex align-items-center justify-content-between" style="font-size: 18px; color: #1f2328;">
                                <div class="d-flex align-items-center">
                                    <i class="fa fa-book mr-2" style="color: #636c76;"></i>
                                    <span style="font-weight: 600;">Project</span>
                                    <span class="mx-2" style="color: #d0d7de;">/</span>
                                    <span style="font-weight: 400;">[[ selectedProjectName ]]</span>
                                    <button v-if="selectedProject" class="btn btn-link p-0 ml-3 text-muted" @click="editProject()" title="Edit Project">
                                        <i class="fa fa-pencil" style="font-size: 14px;"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="d-flex border-bottom mb-4 align-items-center justify-content-between">
                                <div class="d-flex" style="gap: 25px;">
                                    <div @click="activeTab = 'overview'" :style="tabStyle(activeTab === 'overview')"><i class="fa fa-dashboard mr-1"></i> Overview</div>
                                    <div @click="activeTab = 'projects'" :style="tabStyle(activeTab === 'projects')"><i class="fa fa-briefcase mr-1"></i> Project View</div>
                                    <div @click="activeTab = 'task_view'" :style="tabStyle(activeTab === 'task_view')"><i class="fa fa-tasks mr-1"></i> Task View</div>
                                </div>
                            </div>
                        </div>

                        <div class="flex-grow-1 overflow-auto pr-1" style="min-height: 0;">
                            <div v-if="activeTab === 'overview'">
                            <div class="row mb-4 no-gutters" style="gap: 15px;">
                                <div class="col shadow-none border rounded p-3 bg-white" v-for="stat in stats" style="border-color: #d0d7de !important;">
                                    <div style="font-size: 11px; color: #636c76; text-transform: uppercase; letter-spacing: 0.5px;">[[ stat.label ]]</div>
                                    <div style="font-size: 22px; font-weight: 600; color: #1f2328;">[[ stat.value ]]</div>
                                </div>
                            </div>

                            <div class="d-flex mb-3 border-bottom pb-2 align-items-center justify-content-between">
                                <div class="btn-group border rounded" style="background: #f6f8fa; padding: 2px;">
                                    <button @click="viewMode = 'member'" class="btn btn-sm shadow-none py-1" :style="switcherStyle(viewMode === 'member')">Team Members</button>
                                    <button @click="viewMode = 'task'" class="btn btn-sm shadow-none py-1" :style="switcherStyle(viewMode === 'task')">Task List</button>
                                </div>
                                <div style="font-size: 12px; color: #636c76;">[[ members.length ]] contributors</div>
                            </div>

                            <div class="row m-0" v-if="viewMode === 'member'">
                                <div v-for="m in members" class="col-md-6 p-1">
                                    <div class="border rounded p-3 mb-2 h-100 bg-white" style="border-color: #d0d7de !important;">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div class="font-weight-bold" style="color: #0969da; font-size: 14px;">[[ m.full_name ]]</div>
                                            <span class="badge border px-2 text-muted font-weight-normal" style="font-size: 10px;">[[ m.designation || 'Member' ]]</span>
                                        </div>
                                        <div class="d-flex mt-3" style="gap: 15px; font-size: 12px; color: #636c76;">
                                            <span>Total: [[ m.total_tasks ]]</span>
                                            <span class="text-danger">Pending: [[ m.pending_tasks ]]</span>
                                            <span class="text-success">Done: [[ m.total_tasks - m.pending_tasks ]]</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div v-if="viewMode === 'task'">
                                <div class="border rounded overflow-hidden bg-white shadow-sm" style="border-color: #d0d7de !important;">
                                    <table class="table table-hover mb-0" style="font-size: 13px;">
                                        <thead class="bg-light text-muted">
                                            <tr>
                                                <th>Task Subject</th><th>Status</th><th>Owner</th><th>Exp. Start</th><th>Exp. End</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                           <tr v-for="t in tasks">
                                                <td><a :href="'/app/task/' + t.name" class="font-weight-bold" style="color: #0969da;">[[ t.subject ]]</a></td>
                                                <td><span class="badge" :class="t.status === 'Completed' ? 'badge-success' : 'badge-warning'">[[ t.status ]]</span></td>
                                                <td class="text-muted">[[ t.owner_name ]]</td>
                                                <td class="text-muted">[[ formatDate(t.exp_start_date) ]]</td>
                                                <td class="text-muted">[[ formatDate(t.exp_end_date) ]]</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div id="task-end-marker" style="height: 20px;"></div>
                                    <div v-if="loadingTasks" class="p-3 text-center text-muted border-top">
                                        <i class="fa fa-spinner fa-spin mr-2"></i> Loading more tasks...
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="activeTab === 'projects'">
                            <div class="mb-4 p-3 border rounded bg-white" v-if="selectedProjectInfo">
                                <h6 class="font-weight-bold mb-3">[[ selectedProjectName ]] Timeline</h6>
                                <div class="row text-center">
                                    <div class="col-md-6 border-right">
                                        <div class="small text-muted">Start Date</div>
                                        <div class="font-weight-bold">[[ formatDate(selectedProjectInfo.start) ]]</div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="small text-muted">Expected End Date</div>
                                        <div class="font-weight-bold">[[ formatDate(selectedProjectInfo.end) ]]</div>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="small font-weight-bold text-muted">Member Breakout</h6>
                                    <div v-for="m in members" class="p-2 border rounded mb-2 d-flex justify-content-between align-items-center bg-white" style="border-color: #d0d7de !important;">
                                        <span class="small">[[ m.full_name ]]</span>
                                        <span class="badge badge-light">[[ m.total_tasks ]] Tasks</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="small font-weight-bold text-muted">Task Breakout</h6>
                                    <div class="row no-gutters" style="gap:10px;">
                                        <div v-for="s in stats" class="col border rounded p-2 text-center bg-white" style="border-color: #d0d7de !important;">
                                            <div style="font-size: 10px;" class="text-muted">[[ s.label ]]</div>
                                            <div class="font-weight-bold">[[ s.value ]]</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="activeTab === 'task_view'">
                            <div class="border rounded bg-white shadow-sm overflow-hidden">
                                <table class="table table-hover mb-0" style="font-size: 13px;">
                                    <thead class="bg-light text-muted" style="font-size: 11px; text-transform: uppercase;">
                                        <tr>
                                            <th class="pl-4">Team Member</th><th class="text-center">Overall Tasks</th><th class="text-center">Pending</th><th class="text-center">Completed</th><th class="pr-4">Active Projects</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="m in globalTeam">
                                            <td class="pl-4"><div class="font-weight-bold" style="color: #1f2328;">[[ m.full_name ]]</div></td>
                                            <td class="text-center">[[ m.total_tasks ]]</td>
                                            <td class="text-center text-danger font-weight-bold">[[ m.pending_tasks ]]</td>
                                            <td class="text-center text-success">[[ m.completed_tasks ]]</td>
                                            <td class="pr-4 text-muted" style="font-size: 12px;">[[ m.projects ]]</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

		PetiteVue.createApp({
			$delimiters: ["[[", "]]"],
			activeTab: "overview",
			viewMode: "member",
			selectedProject: "",
			selectedProjectName: "All Projects",
			searchProject: "",
			projects: [],
			members: [],
			stats: [],
			tasks: [],
			tasksStart: 0,
			hasMoreTasks: false,
			loadingTasks: false,
			globalTeam: [],
            isUserOverview: false, // New State
            userOverviewStats: [], // New State

            user: {
                full_name: frappe.user.full_name,
                email: frappe.session.user,
                image: null,
                company_email: null,
                employee: null,
                first_name: null,
                last_name: null,
                role_label: "",
                is_manager: false
            },

            async fetchUserInfo() {
                 const res = await frappe.call({
                    method: "taskflow.taskflow.api.taskflow.get_user_info"
                 });
                 if (res.message) {
                     this.user = res.message;
                 }
            },

            getDisplayName() {
                if (this.user.first_name) {
                    return this.user.first_name + (this.user.last_name ? " " + this.user.last_name : "");
                }
                return this.user.full_name;
            },

            goToUserOverview() {
                frappe.set_route("taskflow");
            },

            async fetchUserOverviewData() {
                const res = await frappe.call({
                    method: "taskflow.taskflow.api.taskflow.get_user_overview_data"
                });
                if (res.message) {
                    this.userOverviewStats = res.message.stats;
                }
            },

            setupRouting() {
                frappe.router.on("change", () => {
                    this.handleRoute();
                });
            },

            async handleRoute() {
                const route = frappe.get_route();
                // Route format: taskflow / project / [project_name]  OR  taskflow (default)
                if (route.length > 2 && route[1] === 'project') {
                     const projectId = route[2];
                     if (this.selectedProject !== projectId) {
                         this.isUserOverview = false;
                         // We need to find the project object to set name correctly, or fetch it
                         // For now, let's just set ID and fetch data.
                         this.selectedProject = projectId;
                         // selectedProjectName will be updated after fetchData
                         await this.fetchData();
                         await this.fetchTasks();
                     }
                } else {
                    // Default / User Overview
                    this.isUserOverview = true;
                    this.selectedProject = "";
                    this.selectedProjectName = "All Projects"; 
                    await this.fetchUserOverviewData();
                    await this.fetchTasks(); 
                }
            },

            editProfile() {
                const d = new frappe.ui.Dialog({
                    title: __("Update Profile"),
                    fields: [
                        {
                            label: __("Profile Picture"),
                            fieldname: "user_image",
                            fieldtype: "Attach Image",
                            default: this.user.user_image
                        },
                        { fieldtype: "Section Break", label: __("Employee Details") },
                        {
                            label: __("First Name"),
                            fieldname: "first_name",
                            fieldtype: "Data",
                            reqd: 1,
                            default: this.user.first_name
                        },
                        {
                            label: __("Last Name"),
                            fieldname: "last_name",
                            fieldtype: "Data",
                            default: this.user.last_name
                        },
                        {
                            label: __("Company Email"),
                            fieldname: "company_email",
                            fieldtype: "Data",
                            options: "Email",
                            default: this.user.company_email,
                            description: this.user.employee ? __("Linked to Employee: ") + this.user.employee : __("No linked Employee record found.")
                        }
                    ],
                    primary_action_label: __("Save Changes"),
                    primary_action: async (values) => {
                        d.get_primary_btn().prop("disabled", true);
                        try {
                            const res = await frappe.call({
                                method: "taskflow.taskflow.api.taskflow.update_user_profile",
                                args: {
                                    user_image: values.user_image,
                                    company_email: values.company_email,
                                    first_name: values.first_name,
                                    last_name: values.last_name
                                }
                            });
                            
                            if (res.message) {
                                this.user = res.message;
                                frappe.show_alert({message: __("Profile Updated Successfully"), indicator: "green"});
                                d.hide();
                            }
                        } catch (e) {
                            console.error(e);
                        } finally {
                            d.get_primary_btn().prop("disabled", false);
                        }
                    }
                });
                d.show();
            },

			openCreateModal() {
				const d = new frappe.ui.Dialog({
					title: __("Create New Project"),
					fields: [
						{ label: __("Project Details"), fieldtype: "Section Break" },
						{
							label: __("Project Name"),
							fieldname: "project_name",
							fieldtype: "Data",
							reqd: 1,
						},
						{ fieldtype: "Column Break" },
						{
							label: __("Company"),
							fieldname: "company",
							fieldtype: "Link",
							options: "Company",
							default: frappe.defaults.get_default("company"),
							reqd: 1,
						},
						{
							label: __("Naming Series"),
							fieldname: "naming_series",
							fieldtype: "Select",
							options: "PROJ-.####",
							default: "PROJ-.####",
							reqd: 1,
						},

						{ fieldtype: "Section Break" },
						{
							label: __("Expected Start Date"),
							fieldname: "expected_start_date",
							fieldtype: "Date",
							default: frappe.datetime.get_today(),
						},
						{ fieldtype: "Column Break" },
						{
							label: __("Expected End Date"),
							fieldname: "expected_end_date",
							fieldtype: "Date",
						},

						{ label: __("Notes"), fieldtype: "Section Break" },
						{ label: __("Description"), fieldname: "notes", fieldtype: "Text Editor" },

						{ label: __("Team"), fieldtype: "Section Break" },
						{
							label: __("Team Members"),
							fieldname: "users",
							fieldtype: "Table",
							options: "Project User",
							fields: [
								{
									label: __("User"),
									fieldname: "user",
									fieldtype: "Link",
									options: "User",
									in_list_view: 1,
									reqd: 1,
								},
							],
						},
					],
					size: "large", // Set width to large
					primary_action_label: __("Create"),
					primary_action: async (values) => {
						d.get_primary_btn().prop("disabled", true);
						try {
							const res = await frappe.call({
								method: "frappe.client.insert",
								args: { doc: { doctype: "Project", ...values } },
							});
							if (res.message) {
								frappe.show_alert({
									message: __("Project Created Successfully"),
									indicator: "green",
								});
								d.hide();
								await this.fetchData();
							}
						} finally {
							d.get_primary_btn().prop("disabled", false);
						}
					},
				});
				d.show();
			},

			async editProject() {
				if (!this.selectedProject) return;
				const doc_res = await frappe.call({
					method: "frappe.client.get",
					args: { doctype: "Project", name: this.selectedProject },
				});
				if (!doc_res.message) return;
				const project_doc = doc_res.message;

				const d = new frappe.ui.Dialog({
					title: __("Edit Project: ") + project_doc.project_name,
					fields: [
						{ label: __("Project Details"), fieldtype: "Section Break" },
						{
							label: __("Project Name"),
							fieldname: "project_name",
							fieldtype: "Data",
							reqd: 1,
							default: project_doc.project_name,
						},
						{ fieldtype: "Column Break" },
						{
							label: __("Status"),
							fieldname: "status",
							fieldtype: "Select",
							options: ["Open", "Completed", "Cancelled"],
							default: project_doc.status,
						},

						{ fieldtype: "Section Break" },
						{
							label: __("Expected Start Date"),
							fieldname: "expected_start_date",
							fieldtype: "Date",
							default: project_doc.expected_start_date,
						},
						{ fieldtype: "Column Break" },
						{
							label: __("Expected End Date"),
							fieldname: "expected_end_date",
							fieldtype: "Date",
							default: project_doc.expected_end_date,
						},
						{ label: __("Team"), fieldtype: "Section Break" },
						{
							label: __("Team Members"),
							fieldname: "users",
							fieldtype: "Table",
							options: "Project User",
							fields: [
								{
									label: __("User"),
									fieldname: "user",
									fieldtype: "Link",
									options: "User",
									in_list_view: 1,
									reqd: 1,
								},
							],
							default: project_doc.users,
						},

						{ label: __("Notes"), fieldtype: "Section Break" },
						{
							label: __("Description"),
							fieldname: "notes",
							fieldtype: "Text Editor",
							default: project_doc.notes,
						},
					],
					size: "large", // Set width to large
					primary_action_label: __("Update"),
					primary_action: async (values) => {
						d.get_primary_btn().prop("disabled", true);
						try {
							const res = await frappe.call({
								method: "frappe.client.save",
								args: { doc: { ...project_doc, ...values } },
							});
							if (res.message) {
								frappe.show_alert({
									message: __("Project Updated Successfully"),
									indicator: "green",
								});
								d.hide();
								await this.fetchData();
								this.selectedProjectName = res.message.project_name;
							}
						} finally {
							d.get_primary_btn().prop("disabled", false);
						}
					},
				});
				d.show();
			},

			async init() {
                await this.fetchUserInfo();
				await this.fetchData(); // Fetch projects for sidebar
                this.setupRouting();
                this.handleRoute(); // Handle initial route
				this.setupInfiniteScroll();
			},

			setupInfiniteScroll() {
				const observer = new IntersectionObserver(
					(entries) => {
						if (
							entries[0].isIntersecting &&
							this.hasMoreTasks &&
							!this.loadingTasks &&
                            (this.isUserOverview || (this.activeTab === "overview" && this.viewMode === "task"))
						) {
							this.fetchTasks(true);
						}
					},
					{ threshold: 0.1 },
				);

				setTimeout(() => {
					const target = document.querySelector("#task-end-marker");
					if (target) observer.observe(target);
				}, 1000);
			},

			async fetchData() {
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_dashboard_data",
					args: { project: this.selectedProject || undefined },
				});
				if (res.message) {
					this.projects = res.message.projects;
					this.members = res.message.members;
					this.stats = res.message.stats;
					this.selectedProjectInfo = res.message.selected_project_info;
                    if (this.selectedProjectInfo) {
                        this.selectedProjectName = this.selectedProjectInfo.project_name;
                    }
					this.globalTeam = res.message.global_team_data;
				}
			},

			async fetchTasks(isLoadMore = false) {
				if (this.loadingTasks) return;
				if (!isLoadMore) {
					this.tasksStart = 0;
					this.tasks = [];
					this.hasMoreTasks = false;
				}
				this.loadingTasks = true;
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_task_list",
					args: {
						project: this.selectedProject,
						start: this.tasksStart,
						page_length: 20,
                        only_my_tasks: this.isUserOverview ? 1 : 0
					},
				});
				if (res.message) {
					this.tasks = [...this.tasks, ...res.message.tasks];
					this.hasMoreTasks = res.message.has_more;
					this.tasksStart += 20;
				}
				this.loadingTasks = false;
			},

			async selectProject(project) {
                if (project) {
				    frappe.set_route("taskflow", "project", project.name);
                } else {
                    frappe.set_route("taskflow");
                }
			},

			formatDate(dateStr) {
				if (!dateStr) return "N/A";
				const d = new Date(dateStr);
				return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
			},

			tabStyle(isActive) {
				return {
					paddingBottom: "8px",
					fontSize: "14px",
					cursor: "pointer",
					fontWeight: isActive ? "600" : "400",
					color: isActive ? "#1f2328" : "#636c76",
					borderBottom: isActive ? "2px solid #fd8c73" : "2px solid transparent",
				};
			},

			switcherStyle(isActive) {
				return {
					backgroundColor: isActive ? "white" : "transparent",
					fontWeight: isActive ? "600" : "400",
					borderRadius: "4px",
					color: isActive ? "#1f2328" : "#636c76",
				};
			},

			get filteredProjects() {
				return this.projects.filter((p) =>
					p.project_name.toLowerCase().includes(this.searchProject.toLowerCase()),
				);
			},
		}).mount("#taskflow-app");
	});
};
