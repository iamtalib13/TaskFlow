frappe.pages["taskflow"].on_page_load = function (wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Task Insights Portal",
		single_column: true,
	});

	frappe.require("/assets/taskflow/js/petite-vue.iife.js", () => {
		page.main.html(`
            <div id="taskflow-app" v-scope @vue:mounted="init()" class="container-fluid py-4" style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                
                <style>
                    .selected-project-active {
                        background-color: #f0f7ff !important;
                        color: #0969da !important;
                        font-weight: 600 !important;
                        border-left: 3px solid #0969da !important;
                        padding-left: 8px !important;
                    }
               /* Naya style button ke liye */
                    .btn-create-project {
                        background-color: #1f2328;
                        color: white;
                        border-radius: 6px;
                        padding: 4px 12px;
                        font-size: 13px;
                        font-weight: 600;
                        transition: 0.2s;
                    }
                    .btn-create-project:hover {
                        background-color: #2d3795ff;
                        color: white;
                    }
                </style>
                <div class="row m-0">
                    <div class="col-md-3 p-0 pr-4">
                        <div class="mb-3">
                            <h6 class="font-weight-bold" style="font-size: 14px; color: #1f2328;">Projects</h6>
                            <input type="text" class="form-control form-control-sm border-secondary-subtle shadow-none" style="background: #f6f8fa;" placeholder="Filter projects" v-model="searchProject">
                        </div>
                        <div class="list-group">
                            <div v-for="p in filteredProjects" 
                                 @click="selectProject(p)" 
                                 :class="['py-2 px-1 border-bottom d-flex justify-content-between align-items-center', selectedProject === p.name ? 'selected-project-active' : 'border-transparent']" 
                                 style="cursor: pointer; font-size: 14px;">
                                <span><i class="fa fa-book mr-2" :style="{color: selectedProject === p.name ? '#0969da' : '#636c76'}"></i> [[ p.project_name ]]</span>
                                <span v-if="p.pending_count > 0" class="badge badge-pill text-white" style="background-color: #f85149; font-size: 10px;">[[ p.pending_count ]]</span>
                            </div>
                        </div>
                    </div>

                  <div class="col-md-9 p-0 border-left pl-4" style="border-color: #d0d7de !important;">
                        
                        <div class="d-flex border-bottom mb-4 align-items-center justify-content-between">
                            <div class="d-flex" style="gap: 25px;">
                                <div @click="activeTab = 'overview'" :style="tabStyle(activeTab === 'overview')"><i class="fa fa-dashboard mr-1"></i> Overview</div>
                                <div @click="activeTab = 'projects'" :style="tabStyle(activeTab === 'projects')"><i class="fa fa-briefcase mr-1"></i> Project View</div>
                                <div @click="activeTab = 'task_view'" :style="tabStyle(activeTab === 'task_view')"><i class="fa fa-tasks mr-1"></i> Task View</div>
                            </div>
                            
                            <button class="btn-create-project mb-2" onclick="frappe.new_doc('Project')">
                                <i class="fa fa-plus mr-1"></i> Create Project
                            </button>
                        </div>

                        <div v-if="activeTab === 'overview'" class="row mb-4 no-gutters" style="gap: 15px;">
                            <div class="col shadow-none border rounded p-3 bg-white" v-for="stat in stats" style="border-color: #d0d7de !important;">
                                <div style="font-size: 11px; color: #636c76; text-transform: uppercase; letter-spacing: 0.5px;">[[ stat.label ]]</div>
                                <div style="font-size: 22px; font-weight: 600; color: #1f2328;">[[ stat.value ]]</div>
                            </div>
                        </div>

                        <div v-if="activeTab === 'overview'">
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
                                            <span class="badge border px-2 text-muted font-weight-normal" style="font-size: 10px; border-radius: 10px;">[[ m.designation || 'Member' ]]</span>
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
                                            <tr><th>Task Subject</th><th>Status</th><th>Owner</th></tr>
                                        </thead>
                                        <tbody>
                                           <tr v-for="t in tasks">
                                                <td><a :href="'/app/task/' + t.name" class="font-weight-bold" style="color: #0969da;">[[ t.subject ]]</a></td>
                                                <td><span class="badge" :class="t.status === 'Completed' ? 'badge-success' : 'badge-warning'">[[ t.status ]]</span></td>
                                                <td class="text-muted">[[ t.owner_name ]]</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div v-if="hasMoreTasks" class="p-3 text-center border-top bg-light">
                                        <button @click="fetchTasks(true)" class="btn btn-sm btn-outline-primary shadow-none">Load More Tasks...</button>
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
                                    <div v-for="m in members" class="p-2 border rounded mb-2 d-flex justify-content-between align-items-center bg-white">
                                        <span class="small">[[ m.full_name ]]</span>
                                        <span class="badge badge-light">[[ m.total_tasks ]] Tasks</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="small font-weight-bold text-muted">Task Breakout</h6>
                                    <div class="row no-gutters" style="gap:10px;">
                                        <div v-for="s in stats" class="col border rounded p-2 text-center bg-white">
                                            <div style="font-size: 10px;" class="text-muted">[[ s.label ]]</div>
                                            <div class="font-weight-bold">[[ s.value ]]</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="activeTab === 'task_view'">
                            <div class="border rounded bg-white overflow-hidden">
                                <table class="table table-hover mb-0" style="font-size: 13px;">
                                    <thead class="bg-light">
                                        <tr>
                                            <th>Member Name</th>
                                            <th class="text-center">Total Tasks</th>
                                            <th class="text-center">Pending</th>
                                            <th class="text-right pr-4">Project</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="m in members">
                                            <td class="font-weight-bold" style="color: #0969da;">[[ m.full_name ]]</td>
                                            <td class="text-center">[[ m.total_tasks ]]</td>
                                            <td class="text-center text-danger font-weight-bold">[[ m.pending_tasks ]]</td>
                                            <td class="text-right pr-4 text-muted">[[ selectedProjectName ]]</td>
                                        </tr>
                                    </tbody>
                                </table>
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
			selectedProjectInfo: null,
			searchProject: "",
			projects: [],
			members: [],
			stats: [],
			tasks: [],
			tasksStart: 0,
			hasMoreTasks: false,

			formatDate(dateStr) {
				if (!dateStr) return "N/A";
				const d = new Date(dateStr);
				const day = String(d.getDate()).padStart(2, "0");
				const month = String(d.getMonth() + 1).padStart(2, "0");
				const year = d.getFullYear();
				return `${day}/${month}/${year}`;
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
			async init() {
				await this.fetchData();
				if (this.projects.length > 0 && !this.selectedProject) {
					this.selectProject(this.projects[0]);
				}
			},
			async fetchData() {
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_dashboard_data",
					args: { project: this.selectedProject },
				});
				if (res.message) {
					this.projects = res.message.projects;
					this.members = res.message.members;
					this.stats = res.message.stats;
					this.selectedProjectInfo = res.message.selected_project_info;
				}
			},
			async selectProject(project) {
				this.selectedProject = project ? project.name : "";
				this.selectedProjectName = project ? project.project_name : "All Projects";
				await this.fetchData();
				await this.fetchTasks();
			},
			async fetchTasks(isLoadMore = false) {
				if (!isLoadMore) {
					this.tasksStart = 0;
					this.tasks = [];
				}
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_task_list",
					args: {
						project: this.selectedProject,
						start: this.tasksStart,
						page_length: 10,
					},
				});
				if (res.message) {
					this.tasks = [...this.tasks, ...res.message.tasks];
					this.hasMoreTasks = res.message.has_more;
					this.tasksStart += 10;
				}
			},
		}).mount("#taskflow-app");
	});
};
