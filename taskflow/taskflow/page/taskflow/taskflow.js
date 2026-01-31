frappe.pages["taskflow"].on_page_load = function (wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Task Insights Portal",
		single_column: true,
	});

	frappe.require("/assets/taskflow/js/petite-vue.iife.js", () => {
		page.main.html(`
            <div id="taskflow-app" v-scope @vue:mounted="init()" class="container-fluid py-4" style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                <div class="row m-0">
                    <div class="col-md-3 p-0 pr-4">
                        <div class="mb-3">
                            <h6 class="font-weight-bold" style="font-size: 14px; color: #1f2328;">Projects</h6>
                            <input type="text" class="form-control form-control-sm border-secondary-subtle shadow-none" style="background: #f6f8fa;" placeholder="Filter projects" v-model="searchProject">
                        </div>
                        <div class="list-group">
                            <div @click="selectProject(null)" class="py-2 px-1 border-bottom" style="cursor: pointer; font-size: 14px; color: #0969da;">
                                <strong><i class="fa fa-list-ul mr-2"></i> All Projects</strong>
                            </div>
                            <div v-for="p in filteredProjects" 
                                @click="selectProject(p)"
                                class="py-2 px-1 border-bottom border-transparent"
                                style="cursor: pointer; font-size: 14px;"
                                :style="{color: selectedProject === p.name ? '#1f2328' : '#636c76'}">
                                <span :style="{fontWeight: selectedProject === p.name ? '600' : '400', color: selectedProject === p.name ? '#0969da' : 'inherit'}">
                                    <i class="fa fa-book mr-2" style="color: #636c76;"></i> [[ p.project_name ]]
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-9 p-0 border-left pl-4" style="border-color: #d0d7de !important;">
                        <div class="d-flex border-bottom mb-4" style="gap: 25px;">
                            <div @click="activeTab = 'overview'" :style="tabStyle(activeTab === 'overview')">
                                <i class="fa fa-dashboard mr-1"></i> Overview
                            </div>
                            <div @click="activeTab = 'projects'" :style="tabStyle(activeTab === 'projects')">
                                <i class="fa fa-briefcase mr-1"></i> Project View
                            </div>
                        </div>

                        <div class="row mb-4 no-gutters" style="gap: 15px;">
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
                                            <span><i class="fa fa-circle mr-1 text-primary" style="font-size: 8px;"></i> Total: [[ m.total_tasks ]]</span>
                                            <span class="text-danger"><i class="fa fa-circle mr-1" style="font-size: 8px;"></i> Pending: [[ m.pending_tasks ]]</span>
                                            <span class="text-success"><i class="fa fa-check-circle mr-1"></i> Done: [[ m.total_tasks - m.pending_tasks ]]</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div v-if="viewMode === 'task'" class="p-5 text-center text-muted border rounded border-dashed">
                                <i class="fa fa-tasks mb-2" style="font-size: 24px;"></i>
                                <p>Task specific details will appear here.</p>
                            </div>
                        </div>

                        <div v-if="activeTab === 'projects'">
                            <div class="border rounded overflow-hidden bg-white" style="border-color: #d0d7de !important;">
                                <div class="p-3 border-bottom bg-light">
                                    <h6 class="m-0 font-weight-bold" style="font-size: 14px;">[[ selectedProjectName || 'All Projects' ]] Tally</h6>
                                </div>
                                <table class="table table-hover mb-0" style="font-size: 13px;">
                                    <thead class="text-muted" style="background: #f6f8fa;">
                                        <tr>
                                            <th class="border-0">Member</th>
                                            <th class="border-0 text-center">Total</th>
                                            <th class="border-0 text-center">Pending</th>
                                            <th class="border-0 text-right pr-4">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="m in members">
                                            <td class="font-weight-bold" style="color: #0969da;">[[ m.full_name ]]</td>
                                            <td class="text-center">[[ m.total_tasks ]]</td>
                                            <td class="text-center text-danger">[[ m.pending_tasks ]]</td>
                                            <td class="text-right pr-4">
                                                <div class="d-inline-flex align-items-center" style="gap: 10px;">
                                                    <span style="font-size: 11px; color: #636c76;">[[ calculateProgress(m) ]]%</span>
                                                    <div class="progress" style="height: 6px; width: 80px; background-color: #ebedef;">
                                                        <div class="progress-bar bg-success" :style="{width: calculateProgress(m) + '%'}"></div>
                                                    </div>
                                                </div>
                                            </td>
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
			searchProject: "",
			projects: [],
			members: [],
			stats: [],

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
					boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
					fontWeight: isActive ? "600" : "400",
					borderRadius: "4px",
					color: isActive ? "#1f2328" : "#636c76",
				};
			},

			calculateProgress(member) {
				if (!member.total_tasks || member.total_tasks === 0) return 0;
				let completed = member.total_tasks - member.pending_tasks;
				return Math.round((completed / member.total_tasks) * 100);
			},

			get filteredProjects() {
				return this.projects.filter((p) =>
					p.project_name.toLowerCase().includes(this.searchProject.toLowerCase()),
				);
			},

			async init() {
				await this.fetchData();
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
				}
			},

			async selectProject(project) {
				this.selectedProject = project ? project.name : "";
				this.selectedProjectName = project ? project.project_name : "All Projects";
				await this.fetchData();
			},
		}).mount("#taskflow-app");
	});
};
