frappe.pages["taskflow"].on_page_load = function (wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "TaskFlow",
		single_column: true,
	});

	frappe.require("/assets/taskflow/js/petite-vue.iife.js", () => {
		page.main.html(`

	            <div id="taskflow-app" v-scope @vue:mounted="init()" class="container-fluid py-3" style="background-color: #ffffff; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; height: calc(100vh - 60px); overflow: hidden; font-size: 14px;">

	                

	                <style>

	                    .selected-project-active {

	                        background-color: #f0f7ff !important;

	                        color: #0969da !important;

	                        font-weight: 600 !important;

	                        border-left: 3px solid #0969da !important;

	                        padding-left: 10px !important;

	                    }

	                    .btn-create-project {

	                        background-color: #1f2328;

	                        color: white;

	                        border-radius: 6px;

	                        padding: 6px 14px;

	                        font-size: 14px;

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

	

	                <!-- Task Detail Overlay -->

	                <div v-if="currentTask" class="position-absolute w-100 h-100 bg-white" style="top: 0; left: 0; z-index: 1000; overflow-y: auto; background-color: rgba(255,255,255,0.95) !important; backdrop-filter: blur(4px);">

	                    <!-- Header -->

	                    <div class="border-bottom sticky-top bg-white px-4 py-3 shadow-sm d-flex justify-content-between align-items-center" style="background-color: rgba(255,255,255,0.95) !important; backdrop-filter: blur(4px);">

	                        <div class="d-flex align-items-center flex-grow-1 mr-4" style="gap: 15px;">

	                            <input type="text" class="form-control font-weight-bold" style="font-size: 20px; border: none; padding: 0; height: auto;" v-model="currentTask.doc.subject">

	                            <select class="custom-select form-control-sm w-auto" style="font-size: 14px;" v-model="currentTask.doc.status" :class="{'text-success': currentTask.doc.status === 'Completed', 'text-danger': currentTask.doc.status === 'Cancelled'}">

	                                <option>Open</option>

	                                <option>Working</option>

	                                <option>Pending Review</option>

	                                <option>Completed</option>

	                                <option>Cancelled</option>

	                            </select>

	                        </div>

	                        <div class="d-flex" style="gap: 10px;">

	                            <button class="btn btn-sm btn-light border" style="font-size: 14px;" @click="focusMode = !focusMode" :title="focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'">

	                                <i class="fa" :class="focusMode ? 'fa-compress' : 'fa-expand'"></i> [[ focusMode ? 'Exit Focus' : 'Focus' ]]

	                            </button>

	                            <button class="btn btn-sm btn-primary" style="font-size: 14px; font-weight: 600;" @click="saveTask()">Save</button>

	                            <button class="btn btn-sm btn-light border" style="font-size: 14px;" @click="closeTask()">Cancel</button>

	                        </div>

	                    </div>

	

	                    <div class="container-fluid py-4 px-4">

	                        <div class="row justify-content-center">

	                            <!-- Left Column: Assignment & Schedule -->

	                            <div class="col-md-3" v-show="!focusMode">

	                                <div class="mb-4">

	                                    <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Assignment</h6>

	                                    <div class="form-group">

	                                        <label class="text-muted mb-1" style="font-size: 13px;">Project</label>

	                                        <input type="text" class="form-control bg-light" style="font-size: 14px;" :value="currentTask.doc.project" readonly>

	                                    </div>

	                                    <div class="form-group">

	                                        <label class="text-muted mb-1" style="font-size: 13px;">Priority</label>

	                                        <select class="form-control" style="font-size: 14px;" v-model="currentTask.doc.priority">

	                                            <option>Low</option>

	                                            <option>Medium</option>

	                                            <option>High</option>

	                                            <option>Urgent</option>

	                                        </select>

	                                    </div>

	                                    <div class="form-group">

	                                        <label class="text-muted mb-1" style="font-size: 13px;">Owner</label>

	                                        <div class="d-flex align-items-center bg-light rounded p-2 border">

	                                            <div style="font-size: 14px;">[[ currentTask.doc.owner ]]</div>

	                                        </div>

	                                    </div>

	                                </div>

	

	                                <div class="mb-4">

	                                    <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Schedule</h6>

	                                    <div class="form-group">

	                                        <label class="text-muted mb-1" style="font-size: 13px;">Start Date</label>

	                                        <input type="date" class="form-control" style="font-size: 14px;" v-model="currentTask.doc.exp_start_date">

	                                    </div>

	                                    <div class="form-group">

	                                        <label class="text-muted mb-1" style="font-size: 13px;">End Date</label>

	                                        <input type="date" class="form-control" style="font-size: 14px;" v-model="currentTask.doc.exp_end_date">

	                                    </div>

	                                </div>

	                            </div>

	

	                            <!-- Center Column: Description & Attachments -->

	                            <div :class="focusMode ? 'col-md-8' : 'col-md-6 border-left border-right'">

	                                <div class="mb-4 px-3">

	                                    <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Description</h6>

	                                    <textarea class="form-control" rows="15" v-model="currentTask.doc.description" style="font-size: 15px; line-height: 1.6; border-color: #e1e4e8;"></textarea>

	                                </div>

	                                <div class="px-3">

	                                    <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Attachments</h6>

	                                    <div v-if="currentTask.attachments.length > 0">

	                                        <div v-for="file in currentTask.attachments" class="d-flex align-items-center mb-2 p-2 border rounded">

	                                            <i class="fa fa-paperclip mr-2 text-muted"></i>

	                                            <a :href="file.file_url" target="_blank" class="text-truncate" style="max-width: 250px; font-size: 14px;">[[ file.file_name ]]</a>

	                                        </div>

	                                    </div>

	                                    <div v-else class="text-muted font-italic" style="font-size: 14px;">No attachments</div>

	                                </div>

	                            </div>

	

	                            <!-- Right Column: Comments -->

	                            <div class="col-md-3" v-show="!focusMode">

	                                <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Comments</h6>

	                                <div class="mb-3">

	                                    <textarea class="form-control mb-2" style="font-size: 14px;" rows="3" placeholder="Write a comment..." v-model="newComment"></textarea>

	                                    <button class="btn btn-sm btn-light border btn-block" style="font-size: 14px;" @click="postComment()">Post Comment</button>

	                                </div>

	                                <div style="max-height: 500px; overflow-y: auto;">

	                                    <div v-for="c in currentTask.comments" class="mb-3 p-2 bg-light rounded border">

	                                        <div class="d-flex justify-content-between mb-1">

	                                            <strong style="font-size: 13px;">[[ c.comment_by || c.owner ]]</strong>

	                                            <span class="text-muted" style="font-size: 11px;">[[ formatDate(c.creation) ]]</span>

	                                        </div>

	                                        <div style="white-space: pre-wrap; font-size: 14px;">[[ c.content ]]</div>

	                                    </div>

	                                </div>

	                            </div>

	                        </div>

	                    </div>

	                </div>

	

	                <div class="row m-0 h-100">

	                    <!-- Left Sidebar -->

	                    <div class="col-md-3 p-0 pr-4 d-flex flex-column h-100">

	                        <!-- Profile Card -->

	                        <div class="flex-shrink-0 mb-4 border rounded p-3 bg-white shadow-sm position-relative">

	                             <div class="d-flex align-items-center" style="gap: 12px;">

	                                <div class="position-relative">

	                                    <img :src="user.user_image" v-if="user.user_image" class="rounded-circle border" style="width: 52px; height: 52px; object-fit: cover;">

	                                    <div v-else class="rounded-circle border d-flex align-items-center justify-content-center bg-light text-muted" style="width: 52px; height: 52px; font-size: 24px;">

	                                        <i class="fa fa-user"></i>

	                                    </div>

	                                    <button class="btn btn-sm bg-white text-muted border position-absolute d-flex align-items-center justify-content-center shadow-sm" 

	                                        style="bottom: -2px; right: -2px; width: 24px; height: 24px; padding: 0; border-radius: 50%;"

	                                        @click="editProfile()" title="Edit Profile">

	                                        <i class="fa fa-pencil" style="font-size: 12px;"></i>

	                                    </button>

	                                </div>

	                                <div style="min-width: 0;">

	                                    <div class="font-weight-bold text-truncate" style="color: #1f2328; font-size: 15px;">[[ getDisplayName() ]]</div>

	                                    <div v-if="user.role_label" class="badge badge-light border mb-1 px-2" style="font-size: 11px; color: #57606a;">[[ user.role_label ]]</div>

	                                    <div class="text-muted text-truncate" style="font-size: 13px;" v-if="user.company_email">

	                                        <i class="fa fa-envelope-o mr-1"></i>[[ user.company_email ]]

	                                    </div>

	                                    <div class="text-muted text-truncate" style="font-size: 13px;" v-else>

	                                         <i class="fa fa-envelope-o mr-1"></i>[[ user.email ]]

	                                    </div>

	                                </div>

	                             </div>

	                             

	                             <!-- Email Warning -->

	                             <div v-if="!user.company_email" class="mt-3 p-2 rounded border border-warning bg-warning-light d-flex align-items-start" style="background-color: #fff8c5; border-color: #d4a72c !important;">

	                                <i class="fa fa-exclamation-triangle text-warning mr-2 mt-1"></i>

	                                <div style="font-size: 12px; line-height: 1.4; color: #574600;">

	                                    <strong>Action Needed:</strong> Company email is missing. 

	                                    <a href="#" @click.prevent="editProfile()" style="text-decoration: underline; color: #574600; font-weight: 600;">Add now</a>

	                                </div>

	                             </div>

	

                             <div class="mt-3">
	                                <button class="btn btn-sm btn-light border w-100 shadow-sm" style="font-size: 13px; font-weight: 600; color: #1f2328;" @click="goToUserOverview()">
	                                    <i class="fa fa-th-large mr-2"></i> My Dashboard
	                                </button>
                                    <button class="btn btn-sm btn-light border w-100 shadow-sm mt-2" style="font-size: 13px; font-weight: 600; color: #1f2328;" @click="openManageTeam()">
	                                    <i class="fa fa-users mr-2"></i> Manage Team
	                                </button>
	                             </div>

	

	                             

	

	                             	                        </div>

	

	                             

	

	                             	                        <div class="flex-shrink-0 mb-3">

	                            <div class="d-flex justify-content-between align-items-center mb-2">

	                                <h6 class="font-weight-bold m-0" style="font-size: 15px; color: #1f2328;">Projects</h6>

	                            </div>

	                            <div class="d-flex" style="gap: 8px;">

	                                <input type="text" class="form-control form-control-sm border-secondary-subtle shadow-none flex-grow-1" style="background: #f6f8fa; font-size: 14px;" placeholder="Filter projects" v-model="searchProject">

	                                <button v-if="user.is_manager" class="btn-create-project d-flex align-items-center justify-content-center" style="padding: 4px 12px; font-size: 13px; white-space: nowrap;" @click="openCreateModal()" title="Create Project">

	                                    <i class="fa fa-plus mr-1"></i> Create Project

	                                </button>

	                            </div>

	                        </div>

	                        <div class="list-group flex-grow-1 overflow-auto pr-1" style="min-height: 0;">

	                            <div v-if="filteredProjects.length > 0">

	                                <div v-for="p in filteredProjects" @click="selectProject(p)" 

	                                     :class="['py-2 px-1 border-bottom d-flex justify-content-between align-items-center', selectedProject === p.name ? 'selected-project-active' : 'border-transparent']" 

	                                     style="cursor: pointer; font-size: 15px;">

	                                    <span><i class="fa fa-book mr-2" :style="{color: selectedProject === p.name ? '#0969da' : '#636c76'}"></i> [[ p.project_name ]]</span>

	                                    <span v-if="p.pending_count > 0" class="badge badge-pill text-white" style="background-color: #f85149; font-size: 11px;">[[ p.pending_count ]]</span>

	                                </div>

	                            </div>

	                            <div v-else class="text-center py-5 px-2">

	                                <div class="mb-3"><i class="fa fa-search fa-2x text-muted" style="opacity: 0.3;"></i></div>

	                                <div class="text-muted small mb-3" style="font-size: 14px;">No projects found matching "[[ searchProject ]]"</div>

	                                <button v-if="user.is_manager" class="btn-create-project" style="font-size: 13px;" @click="openCreateModal()">

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

	                                <div class="d-flex align-items-center justify-content-between mb-3">

	                                    <h5 class="font-weight-bold m-0" style="color: #1f2328; font-size: 22px;">My Dashboard</h5>

	                                    <button class="btn btn-sm btn-primary shadow-sm px-3" style="border-radius: 6px; font-weight: 600; font-size: 14px;" @click="createTask()">

	                                        <i class="fa fa-plus mr-1"></i> Create Task

	                                    </button>

	                                </div>

                                    <!-- Onboarding Setup Wizard -->
                                    <div v-if="user.is_manager && showOnboarding" class="mb-5 p-4 rounded border shadow-sm bg-white" style="border-color: #d0d7de !important; background: linear-gradient(145deg, #ffffff, #fcfcfc);">
                                        <div class="d-flex justify-content-between align-items-center mb-4">
                                            <div>
                                                <h4 class="font-weight-bold m-0" style="color: #1f2328;">🚀 Welcome, [[ user.first_name || 'Manager' ]]!</h4>
                                                <p class="text-muted mt-1" style="font-size: 14px;">Let's get your workspace ready for efficient management.</p>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-weight-bold mb-1" style="font-size: 12px; color: #0969da;">[[ onboardingProgress ]]% Complete</div>
                                                <div class="progress" style="width: 120px; height: 8px; border-radius: 10px; background-color: #f6f8fa;">
                                                    <div class="progress-bar progress-bar-animated progress-bar-striped" role="progressbar" :style="{width: onboardingProgress + '%'}" style="background-color: #0969da;"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="row">
                                            <div class="col-md-6 border-right">
                                                <div class="d-flex align-items-start mb-4" :style="{opacity: hasTeamConfig ? '0.5' : '1'}">
                                                    <div class="rounded-circle d-flex align-items-center justify-content-center mr-3" :style="{backgroundColor: hasTeamConfig ? '#2da44e' : '#f6f8fa', color: hasTeamConfig ? 'white' : '#636c76', width: '32px', height: '32px', minWidth: '32px'}">
                                                        <i class="fa" :class="hasTeamConfig ? 'fa-check' : 'fa-users'"></i>
                                                    </div>
                                                    <div>
                                                        <h6 class="font-weight-bold mb-1">Step 1: Define Your Team Pool</h6>
                                                        <p class="text-muted mb-2" style="font-size: 13px;">Create a global list of members you can assign to any project.</p>
                                                        <button v-if="!hasTeamConfig" class="btn btn-sm btn-outline-primary" style="font-weight: 600;" @click="openManageTeam()">Setup Team Pool</button>
                                                        <span v-else class="text-success font-weight-bold" style="font-size: 13px;"><i class="fa fa-check-circle"></i> Team Pool Ready</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="d-flex align-items-start mb-4" :style="{opacity: hasProjects ? '0.5' : '1', pointerEvents: !hasTeamConfig ? 'none' : 'auto'}">
                                                    <div class="rounded-circle d-flex align-items-center justify-content-center mr-3" :style="{backgroundColor: hasProjects ? '#2da44e' : '#f6f8fa', color: hasProjects ? 'white' : '#636c76', width: '32px', height: '32px', minWidth: '32px'}">
                                                        <i class="fa" :class="hasProjects ? 'fa-check' : 'fa-rocket'"></i>
                                                    </div>
                                                    <div>
                                                        <h6 class="font-weight-bold mb-1">Step 2: Initialize First Project</h6>
                                                        <p class="text-muted mb-2" style="font-size: 13px;">Kickstart your first project and assign tasks to your team.</p>
                                                        <button v-if="!hasProjects" class="btn btn-sm" :class="hasTeamConfig ? 'btn-primary' : 'btn-light disabled'" style="font-weight: 600;" @click="openCreateModal()">Launch First Project</button>
                                                        <span v-else class="text-success font-weight-bold" style="font-size: 13px;"><i class="fa fa-check-circle"></i> Project Launched</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-if="hasProjects && hasTeamConfig" class="mt-3 p-3 rounded text-center" style="background-color: #f0f7ff; color: #0969da; border: 1px dashed #0969da;">
                                            <i class="fa fa-magic mr-2"></i> <strong>Boom! You're all set.</strong> Your dashboard will now show real-time insights. 
                                            <button class="btn btn-sm btn-link font-weight-bold ml-2 p-0" @click="showOnboarding = false">Dismiss Wizard</button>
                                        </div>
                                    </div>

	                                <div v-if="user.is_manager && userOverviewInsights && !showOnboarding" class="mb-4">

	                                    <!-- Row 1: Health & Stuck -->

	                                    <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Project Health & Pulse</h6>

	                                    <div class="row mb-4 m-0" style="gap: 15px;">

	                                        <div class="col p-3 rounded border text-white position-relative" style="background-color: #2da44e;" title="Projects due in more than 3 days"> <!-- On Track -->

	                                            <div style="font-size: 13px; opacity: 0.9; font-weight: 600;">On Track</div>

	                                            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 6px;">&gt; 3 Days Remaining</div>

	                                            <div style="font-size: 28px; font-weight: 700;">[[ userOverviewInsights.health.on_track ]]</div>

	                                        </div>

	                                        <div class="col p-3 rounded border text-dark position-relative" style="background-color: #ffd33d;" title="Projects due within next 3 days"> <!-- At Risk -->

	                                            <div style="font-size: 13px; opacity: 0.9; font-weight: 600;">At Risk</div>

	                                            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 6px;">Due in &le; 3 Days</div>

	                                            <div style="font-size: 28px; font-weight: 700;">[[ userOverviewInsights.health.at_risk ]]</div>

	                                        </div>

	                                        <div class="col p-3 rounded border text-white position-relative" style="background-color: #cf222e;" title="Projects past due date"> <!-- Delayed -->

	                                            <div style="font-size: 13px; opacity: 0.9; font-weight: 600;">Delayed</div>

	                                            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 6px;">Past Due Date</div>

	                                            <div style="font-size: 28px; font-weight: 700;">[[ userOverviewInsights.health.delayed ]]</div>

	                                        </div>

	                                        <div class="col p-3 rounded border bg-white text-dark position-relative" style="border-color: #d0d7de !important;" title="Tasks not updated in 3+ days"> <!-- Stuck -->

	                                            <div style="font-size: 13px; color: #636c76; font-weight: 600;">Stuck Tasks</div>

	                                            <div style="font-size: 11px; color: #636c76; opacity: 0.8; margin-bottom: 6px;">No Activity &gt; 3 Days</div>

	                                            <div style="font-size: 28px; font-weight: 700;">[[ userOverviewInsights.stuck_count ]]</div>

	                                        </div>

	                                    </div>

	

	                                    <!-- Row 2: Priorities & Workload -->

	                                    <div class="row m-0">

	                                        <div class="col-md-6 pl-0">

	                                            <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Top 3 Priorities</h6>

	                                            <div v-if="userOverviewInsights.priorities.length > 0" class="list-group shadow-sm">

	                                                <div v-for="t in userOverviewInsights.priorities" class="list-group-item list-group-item-action p-3" @click="openTask(t.name)" style="cursor: pointer;">

	                                                    <div class="d-flex w-100 justify-content-between align-items-center">

	                                                        <h6 class="mb-1" style="font-size: 14px; font-weight: 600; color: #1f2328;">[[ t.subject ]]</h6>

	                                                        <span class="badge" style="font-size: 11px;" :class="t.priority === 'Urgent' ? 'badge-danger' : 'badge-warning'">[[ t.priority ]]</span>

	                                                    </div>

	                                                    <small class="text-muted" style="font-size: 13px;">Due: [[ formatDate(t.exp_end_date) ]]</small>

	                                                </div>

	                                            </div>

	                                            <div v-else class="p-3 bg-light rounded text-center text-muted" style="font-size: 14px;">No urgent tasks.</div>

	                                        </div>

	                                        <div class="col-md-6 pr-0">

	                                            <h6 class="text-muted text-uppercase mb-3" style="font-size: 12px; letter-spacing: 0.5px; font-weight: 700;">Workload Fatigue Gauge</h6>

	                                            <div class="bg-white border rounded shadow-sm p-3" style="border-color: #d0d7de !important;">

	                                                <div v-for="w in userOverviewInsights.workload" class="mb-3">
                                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                                            <span class="font-weight-bold" style="font-size: 13px;">[[ w.full_name ]]</span>
                                                            <span class="text-muted" style="font-size: 11px;">[[ w.count ]] Tasks</span>
                                                        </div>
                                                        <div class="progress" style="height: 6px; border-radius: 10px; background-color: #f6f8fa;">
                                                            <div class="progress-bar" role="progressbar" 
                                                                :style="{
                                                                    width: Math.min((w.count / 10) * 100, 100) + '%',
                                                                    backgroundColor: w.count < 4 ? '#2da44e' : (w.count < 8 ? '#ffd33d' : '#cf222e')
                                                                }" 
                                                                :aria-valuenow="w.count" aria-valuemin="0" aria-valuemax="10">
                                                            </div>
                                                        </div>
                                                        <div class="mt-1 d-flex justify-content-end">
                                                            <span v-if="w.count >= 8" class="badge badge-danger" style="font-size: 9px; padding: 2px 5px;">Overwhelmed</span>
                                                            <span v-else-if="w.count >= 4" class="badge badge-warning" style="font-size: 9px; padding: 2px 5px;">Busy</span>
                                                            <span v-else class="badge badge-success" style="font-size: 9px; padding: 2px 5px;">Available</span>
                                                        </div>
                                                    </div>

	                                            </div>

	                                        </div>

	                                    </div>

	                                </div>

	

	                                <div v-else class="row no-gutters" style="gap: 15px;">

	                                    <div class="col shadow-none border rounded p-3 bg-white" v-for="stat in userOverviewStats" style="border-color: #d0d7de !important;">

	                                        <div style="font-size: 12px; color: #636c76; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">[[ stat.label ]]</div>

	                                        <div style="font-size: 26px; font-weight: 700; color: #1f2328;">[[ stat.value ]]</div>

	                                    </div>

	                                </div>

	                            </div>

	                            

	                            <div class="flex-grow-1 overflow-auto pr-1 border rounded bg-white shadow-sm" style="min-height: 0; border-color: #d0d7de !important;">

	                                <div class="p-3 border-bottom bg-light">

	                                     <h6 class="m-0 font-weight-bold" style="font-size: 14px;">My Tasks Across All Projects</h6>

	                                </div>

	                                <table class="table table-hover mb-0" style="font-size: 14px;">

	                                    <thead class="bg-white text-muted">

	                                        <tr>

	                                            <th>Task Subject</th><th>Project</th><th>Status</th><th>Exp. Start</th><th>Exp. End</th><th>Days Left</th>

	                                        </tr>

	                                    </thead>

	                                    <tbody>

	                                        <tr v-for="t in tasks">

	                                            <td><a href="#" @click.prevent="openTask(t.name)" class="font-weight-bold" style="color: #0969da;">[[ t.subject ]]</a></td>

	                                            <td><span class="text-muted">[[ t.project_title ]]</span></td>

	                                            <td><span class="badge" style="font-size: 12px;" :class="t.status === 'Completed' ? 'badge-success' : 'badge-warning'">[[ t.status ]]</span></td>

	                                            <td class="text-muted">[[ formatDate(t.exp_start_date) ]]</td>

	                                            <td class="text-muted">[[ formatDate(t.exp_end_date) ]]</td>

	                                            <td>

	                                                <span v-if="t.days_left !== null" :class="{'text-danger font-weight-bold': t.days_left < 0, 'text-warning font-weight-bold': t.days_left === 0, 'text-success': t.days_left > 0}">

	                                                    [[ t.days_left < 0 ? Math.abs(t.days_left) + ' days overdue' : (t.days_left === 0 ? 'Due Today' : t.days_left + ' days left') ]]

	                                                </span>

	                                                <span v-else class="text-muted">-</span>

	                                            </td>

	                                        </tr>

	                                    </tbody>

	                                </table>

	                                <div id="task-end-marker" style="height: 20px;"></div>

	                            </div>

	                        </div>

	

	                        <div v-else class="d-flex flex-column h-100">

	                            <div class="flex-shrink-0">

	                            <div class="mb-3 d-flex align-items-center justify-content-between" style="font-size: 20px; color: #1f2328;">

	                                <div class="d-flex align-items-center">

	                                    <i class="fa fa-book mr-2" style="color: #636c76;"></i>

	                                    <span style="font-weight: 600;">Project</span>

	                                    <span class="mx-2" style="color: #d0d7de;">/</span>

	                                    <span style="font-weight: 400;">[[ selectedProjectName ]]</span>

	                                    <button v-if="selectedProject" class="btn btn-link p-0 ml-3 text-muted" @click="editProject()" title="Edit Project">

	                                        <i class="fa fa-pencil" style="font-size: 16px;"></i>

	                                    </button>

	                                </div>

	                                <button class="btn btn-sm btn-primary shadow-sm px-3" style="border-radius: 6px; font-weight: 600; font-size: 14px;" @click="createTask()">

	                                    <i class="fa fa-plus mr-1"></i> Create Task

	                                </button>

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

	                                    <div style="font-size: 12px; color: #636c76; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">[[ stat.label ]]</div>

	                                    <div style="font-size: 26px; font-weight: 700; color: #1f2328;">[[ stat.value ]]</div>

	                                </div>

	                            </div>

	

	                            <div class="d-flex mb-3 border-bottom pb-2 align-items-center justify-content-between">

	                                <div class="btn-group border rounded" style="background: #f6f8fa; padding: 2px;">

	                                    <button @click="viewMode = 'member'" class="btn btn-sm shadow-none py-1" style="font-size: 13px;" :style="switcherStyle(viewMode === 'member')">Team Members</button>

	                                    <button @click="viewMode = 'task'" class="btn btn-sm shadow-none py-1" style="font-size: 13px;" :style="switcherStyle(viewMode === 'task')">Task List</button>

	                                </div>

	                                <div style="font-size: 13px; color: #636c76;">[[ members.length ]] contributors</div>

	                            </div>

	

	                            <div class="row m-0" v-if="viewMode === 'member'">

	                                <div v-for="m in members" class="col-md-6 p-1">

	                                    <div class="border rounded p-3 mb-2 h-100 bg-white" style="border-color: #d0d7de !important;">

	                                        <div class="d-flex justify-content-between align-items-start">

	                                            <div class="font-weight-bold" style="color: #0969da; font-size: 15px;">[[ m.full_name ]]</div>

	                                            <span class="badge border px-2 text-muted font-weight-normal" style="font-size: 11px;">[[ m.designation || 'Member' ]]</span>

	                                        </div>

	                                        <div class="d-flex mt-3" style="gap: 15px; font-size: 13px; color: #636c76;">

	                                            <span>Total: [[ m.total_tasks ]]</span>

	                                            <span class="text-danger">Pending: [[ m.pending_tasks ]]</span>

	                                            <span class="text-success">Done: [[ m.total_tasks - m.pending_tasks ]]</span>

	                                        </div>

	                                    </div>

	                                </div>

	                            </div>

	                            

	                            <div v-if="viewMode === 'task'">

	                                <div class="border rounded overflow-hidden bg-white shadow-sm" style="border-color: #d0d7de !important;">

	                                    <table class="table table-hover mb-0" style="font-size: 14px;">

	                                        <thead class="bg-light text-muted">

	                                            <tr>

	                                                <th>Task Subject</th><th>Status</th><th>Owner</th><th>Exp. Start</th><th>Exp. End</th><th>Days Left</th>

	                                            </tr>

	                                        </thead>

	                                        <tbody>

	                                           <tr v-for="t in tasks">

	                                                <td><a href="#" @click.prevent="openTask(t.name)" class="font-weight-bold" style="color: #0969da;">[[ t.subject ]]</a></td>

	                                                <td><span class="badge" style="font-size: 12px;" :class="t.status === 'Completed' ? 'badge-success' : 'badge-warning'">[[ t.status ]]</span></td>

	                                                <td class="text-muted">[[ t.owner_name ]]</td>

	                                                <td class="text-muted">[[ formatDate(t.exp_start_date) ]]</td>

	                                                <td class="text-muted">[[ formatDate(t.exp_end_date) ]]</td>

	                                                <td>

	                                                    <span v-if="t.days_left !== null" :class="{'text-danger font-weight-bold': t.days_left < 0, 'text-warning font-weight-bold': t.days_left === 0, 'text-success': t.days_left > 0}">

	                                                        [[ t.days_left < 0 ? Math.abs(t.days_left) + ' days overdue' : (t.days_left === 0 ? 'Due Today' : t.days_left + ' days left') ]]

	                                                    </span>

	                                                    <span v-else class="text-muted">-</span>

	                                                </td>

	                                            </tr>

	                                        </tbody>

	                                    </table>

	                                    <div id="task-end-marker" style="height: 20px;"></div>

	                                    <div v-if="loadingTasks" class="p-3 text-center text-muted border-top" style="font-size: 14px;">

	                                        <i class="fa fa-spinner fa-spin mr-2"></i> Loading more tasks...

	                                    </div>

	                                </div>

	                            </div>

	                        </div>

	

	                        <div v-if="activeTab === 'projects'">

	                            <div class="mb-4 p-3 border rounded bg-white" v-if="selectedProjectInfo">

	                                <h6 class="font-weight-bold mb-3" style="font-size: 16px;">[[ selectedProjectName ]] Timeline</h6>

	                                <div class="row text-center">

	                                    <div class="col-md-6 border-right">

	                                        <div class="text-muted" style="font-size: 13px;">Start Date</div>

	                                        <div class="font-weight-bold" style="font-size: 15px;">[[ formatDate(selectedProjectInfo.start) ]]</div>

	                                    </div>

	                                    <div class="col-md-6">

	                                        <div class="text-muted" style="font-size: 13px;">Expected End Date</div>

	                                        <div class="font-weight-bold" style="font-size: 15px;">[[ formatDate(selectedProjectInfo.end) ]]</div>

	                                    </div>

	                                </div>

	                            </div>

	                            <div class="row">

	                                <div class="col-md-6">

	                                    <h6 class="font-weight-bold text-muted" style="font-size: 13px; text-transform: uppercase;">Member Breakout</h6>

	                                    <div v-for="m in members" class="p-2 border rounded mb-2 d-flex justify-content-between align-items-center bg-white" style="border-color: #d0d7de !important;">

	                                        <span style="font-size: 14px;">[[ m.full_name ]]</span>

	                                        <span class="badge badge-light" style="font-size: 12px;">[[ m.total_tasks ]] Tasks</span>

	                                    </div>

	                                </div>

	                                <div class="col-md-6">

	                                    <h6 class="font-weight-bold text-muted" style="font-size: 13px; text-transform: uppercase;">Task Breakout</h6>

	                                    <div class="row no-gutters" style="gap:10px;">

	                                        <div v-for="s in stats" class="col border rounded p-2 text-center bg-white" style="border-color: #d0d7de !important;">

	                                            <div style="font-size: 12px;" class="text-muted">[[ s.label ]]</div>

	                                            <div class="font-weight-bold" style="font-size: 15px;">[[ s.value ]]</div>

	                                        </div>

	                                    </div>

	                                </div>

	                            </div>

	                        </div>

	

	                        <div v-if="activeTab === 'task_view'">

	                            <div class="border rounded bg-white shadow-sm overflow-hidden">

	                                <table class="table table-hover mb-0" style="font-size: 14px;">

	                                    <thead class="bg-light text-muted" style="font-size: 12px; text-transform: uppercase; font-weight: 700;">

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

	                                            <td class="pr-4 text-muted" style="font-size: 13px;">[[ m.projects ]]</td>

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

			userOverviewInsights: null, // New State for PM

			showOnboarding: false,
			hasTeamConfig: false,
			hasProjects: false,

			get onboardingProgress() {
				let p = 0;
				if (this.hasTeamConfig) p += 50;
				if (this.hasProjects) p += 50;
				return p;
			},

			currentTask: null, // Task Detail View State

			focusMode: false, // Focus Mode State

			newComment: "",

			user: {
				full_name: frappe.user.full_name,

				email: frappe.session.user,

				image: null,

				company_email: null,

				employee: null,

				first_name: null,

				last_name: null,

				role_label: "",

				is_manager: false,
			},

			async fetchUserInfo() {
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_user_info",
				});

				if (res.message) {
					this.user = res.message;
				}
			},

			getDisplayName() {
				if (this.user.first_name) {
					return (
						this.user.first_name +
						(this.user.last_name ? " " + this.user.last_name : "")
					);
				}

				return this.user.full_name;
			},

			goToUserOverview() {
				frappe.set_route("taskflow");
			},

			async openManageTeam() {
				let config_name;
				try {
					// 1. Check if config exists
					let r = await frappe.call({
						method: "frappe.client.get_value",
						args: {
							doctype: "Project Manager Configuration",
							filters: { user: frappe.session.user },
							fieldname: "name",
						},
					});

					if (r.message && r.message.name) {
						config_name = r.message.name;
					} else {
						// Create if not exists
						let new_doc = await frappe.call({
							method: "frappe.client.insert",
							args: {
								doc: {
									doctype: "Project Manager Configuration",
									user: frappe.session.user,
									team_details: [],
								},
							},
						});
						config_name = new_doc.message.name;
					}

					// 2. Fetch full doc
					let doc_res = await frappe.call({
						method: "frappe.client.get",
						args: {
							doctype: "Project Manager Configuration",
							name: config_name,
						},
					});
					let config_doc = doc_res.message;

					// 3. Open Dialog
					let d = new frappe.ui.Dialog({
						title: "Manage Team",
						fields: [
							{
								label: "Team Details",
								fieldname: "team_details",
								fieldtype: "Table",
								options: "Configuration Item",
								fields: [
									{
										label: "User",
										fieldname: "user",
										fieldtype: "Link",
										options: "User",
										in_list_view: 1,
										reqd: 1,
									},
									{
										label: "User Name",
										fieldname: "user_name",
										fieldtype: "Data",
										in_list_view: 1,
										read_only: 1,
										fetch_from: "user.full_name"
									},
									{
										label: "Role",
										fieldname: "role",
										fieldtype: "Select",
										options: ["Team Member", "Project Manager", "Viewer"],
										in_list_view: 1,
										reqd: 1,
									},
									{
										label: "Enabled",
										fieldname: "enabled",
										fieldtype: "Check",
										in_list_view: 1,
										default: 1,
									},
								],
								data: config_doc.team_details,
								get_data: () => {
									return config_doc.team_details;
								},
							},
						],
						size: "large",
						primary_action_label: "Save",
						primary_action: async (values) => {
							d.get_primary_btn().prop("disabled", true);
							try {
								// Update config_doc with new values from table
								config_doc.team_details = values.team_details;
								
								// Explicitly set team_setup when saving team
								if (values.team_details && values.team_details.length > 0) {
									config_doc.team_setup = 1;
								}
								
								await frappe.call({
									method: "frappe.client.save",
									args: { doc: config_doc },
								});

								frappe.show_alert({
									message: __("Team Configuration Saved"),
									indicator: "green",
								});
								d.hide();
								await this.fetchUserOverviewData();
							} catch (e) {
								console.error(e);
								frappe.msgprint(__("Error saving configuration"));
							} finally {
								d.get_primary_btn().prop("disabled", false);
							}
						},
					});
					d.show();
				} catch (e) {
					console.error(e);
					frappe.msgprint(__("Something went wrong while fetching configuration."));
				}
			},

			async fetchUserOverviewData() {
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_user_overview_data",
				});

				if (res.message) {
					this.userOverviewStats = res.message.stats;
					this.userOverviewInsights = res.message.insights;
					
					this.hasTeamConfig = res.message.has_team_config;
					this.hasProjects = res.message.has_projects;
					
					// Show onboarding if setup is incomplete
					if (this.user.is_manager && (!this.hasTeamConfig || !this.hasProjects)) {
						this.showOnboarding = true;
					} else if (this.hasTeamConfig && this.hasProjects) {
						// Don't auto-hide if they just finished, let them dismiss or refresh
						// But if they load fresh and it's done, hide it.
					}
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

				if (route.length > 2 && route[1] === "project") {
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

			async openTask(name) {
				const res = await frappe.call({
					method: "taskflow.taskflow.api.taskflow.get_task_details",

					args: { task: name },
				});

				if (res.message) {
					this.currentTask = res.message;

					// Format dates for input fields (YYYY-MM-DD)

					if (this.currentTask.doc.exp_start_date) {
						this.currentTask.doc.exp_start_date =
							this.currentTask.doc.exp_start_date.split(" ")[0]; // Handle timestamp if present
					}

					if (this.currentTask.doc.exp_end_date) {
						this.currentTask.doc.exp_end_date =
							this.currentTask.doc.exp_end_date.split(" ")[0];
					}
				}
			},

			closeTask() {
				this.currentTask = null;

				this.newComment = "";

				this.focusMode = false;
			},

			async saveTask() {
				if (!this.currentTask) return;

				try {
					await frappe.call({
						method: "taskflow.taskflow.api.taskflow.update_task_details",

						args: {
							task_name: this.currentTask.doc.name,

							values: {
								subject: this.currentTask.doc.subject,

								status: this.currentTask.doc.status,

								priority: this.currentTask.doc.priority,

								project: this.currentTask.doc.project,

								exp_start_date: this.currentTask.doc.exp_start_date,

								exp_end_date: this.currentTask.doc.exp_end_date,

								description: this.currentTask.doc.description,
							},
						},
					});

					frappe.show_alert({ message: __("Task Saved"), indicator: "green" });

					// Refresh lists in background

					this.fetchTasks();
				} catch (e) {
					console.error(e);
				}
			},

			async postComment() {
				if (!this.newComment.trim()) return;

				try {
					const res = await frappe.call({
						method: "taskflow.taskflow.api.taskflow.add_comment",

						args: {
							task_name: this.currentTask.doc.name,

							content: this.newComment,
						},
					});

					if (res.message) {
						this.currentTask.comments.unshift(res.message);

						this.newComment = "";
					}
				} catch (e) {
					console.error(e);
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

							default: this.user.user_image,
						},

						{ fieldtype: "Section Break", label: __("Employee Details") },

						{
							label: __("First Name"),

							fieldname: "first_name",

							fieldtype: "Data",

							reqd: 1,

							default: this.user.first_name,
						},

						{
							label: __("Last Name"),

							fieldname: "last_name",

							fieldtype: "Data",

							default: this.user.last_name,
						},

						{
							label: __("Company Email"),

							fieldname: "company_email",

							fieldtype: "Data",

							options: "Email",

							default: this.user.company_email,

							description: this.user.employee
								? __("Linked to Employee: ") + this.user.employee
								: __("No linked Employee record found."),
						},
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

									last_name: values.last_name,
								},
							});

							if (res.message) {
								this.user = res.message;

								frappe.show_alert({
									message: __("Profile Updated Successfully"),
									indicator: "green",
								});

								d.hide();
							}
						} catch (e) {
							console.error(e);
						} finally {
							d.get_primary_btn().prop("disabled", false);
						}
					},
				});

				d.show();
			},

			createTask() {
				const d = new frappe.ui.Dialog({
					title: __("Create New Task"),

					fields: [
						{
							label: __("Subject"),

							fieldname: "subject",

							fieldtype: "Data",

							reqd: 1,
						},

						{
							label: __("Project"),

							fieldname: "project",

							fieldtype: "Link",

							options: "Project",

							reqd: 1,

							default: this.selectedProject || "",
						},

						{ fieldtype: "Column Break" },

						{
							label: __("Priority"),

							fieldname: "priority",

							fieldtype: "Select",

							options: ["Low", "Medium", "High", "Urgent"],

							default: "Medium",
						},

						{
							label: __("Status"),

							fieldname: "status",

							fieldtype: "Select",

							options: [
								"Open",
								"Working",
								"Pending Review",
								"Completed",
								"Cancelled",
							],

							default: "Open",
						},

						{ fieldtype: "Section Break" },

						{
							label: __("Expected Start Date"),

							fieldname: "exp_start_date",

							fieldtype: "Date",

							default: frappe.datetime.get_today(),
						},

						{ fieldtype: "Column Break" },

						{
							label: __("Expected End Date"),

							fieldname: "exp_end_date",

							fieldtype: "Date",
						},

						{ fieldtype: "Section Break" },

						{
							label: __("Description"),

							fieldname: "description",

							fieldtype: "Text Editor",
						},
					],

					primary_action_label: __("Create Task"),

					primary_action: async (values) => {
						d.get_primary_btn().prop("disabled", true);

						try {
							const res = await frappe.call({
								method: "frappe.client.insert",

								args: {
									doc: {
										doctype: "Task",

										...values,
									},
								},
							});

							if (res.message) {
								frappe.show_alert({
									message: __("Task Created Successfully"),
									indicator: "green",
								});

								d.hide();

								await this.fetchTasks(); // Refresh list

								if (this.isUserOverview) {
									await this.fetchUserOverviewData(); // Refresh stats
								} else {
									await this.fetchData(); // Refresh project stats
								}
							}
						} finally {
							d.get_primary_btn().prop("disabled", false);
						}
					},
				});

				d.show();
			},

			async openCreateModal() {
				// Parallel fetching for better performance
				let team_users = [];
				const [config_res] = await Promise.all([
					frappe.call({
						method: "frappe.client.get_value",
						args: {
							doctype: "Project Manager Configuration",
							filters: { user: frappe.session.user },
							fieldname: "name",
						},
					}),
				]);

				if (config_res.message && config_res.message.name) {
					const items = await frappe.call({
						method: "frappe.client.get_list",
						args: {
							doctype: "Configuration Item",
							filters: { parent: config_res.message.name, enabled: 1 },
							fields: ["user"],
						},
					});
					team_users = items.message.map((d) => d.user);
				}

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
									get_query: () => {
										return {
											filters: team_users.length > 0 ? { name: ["in", team_users] } : {},
										};
									},
								},
								{
									label: __("Role"),
									fieldname: "role",
									fieldtype: "Select",
									options: ["Project Manager", "Team Member", "Viewer"],
									in_list_view: 1,
									default: "Team Member",
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
							// Duplicate User Validation
							if (values.users && values.users.length > 0) {
								const users = values.users.map(u => u.user);
								const uniqueUsers = [...new Set(users)];
								if (users.length !== uniqueUsers.length) {
									frappe.throw(__("Duplicate users found in Team Members table."));
									d.get_primary_btn().prop("disabled", false);
									return;
								}
							}

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

								// Mark project_setup as complete in PM configuration
								await frappe.call({
									method: "frappe.client.set_value",
									args: {
										doctype: "Project Manager Configuration",
										name: frappe.session.user,
										fieldname: "project_setup",
										value: 1
									}
								});

								await this.fetchData();
								await this.fetchUserOverviewData();
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

				// Fetch PM's team and Project details in parallel
				let team_users = [];
				const [team_res, doc_res] = await Promise.all([
					frappe.call({ method: "taskflow.taskflow.api.taskflow.get_pm_team" }),
					frappe.call({
						method: "taskflow.taskflow.api.taskflow.get_project_data",
						args: { project: this.selectedProject },
					}),
				]);

				if (team_res.message) {
					team_users = team_res.message;
				}

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
									get_query: () => {
										return {
											filters: team_users.length > 0 ? { name: ["in", team_users] } : {},
										};
									},
								},
								{
									label: __("Role"),
									fieldname: "role",
									fieldtype: "Select",
									options: ["Project Manager", "Team Member", "Viewer"],
									in_list_view: 1,
									default: "Team Member",
									reqd: 1,
								},
							],

							data: project_doc.users,
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
							// Duplicate User Validation
							if (values.users && values.users.length > 0) {
								const users = values.users.map(u => u.user);
								const uniqueUsers = [...new Set(users)];
								if (users.length !== uniqueUsers.length) {
									frappe.throw(__("Duplicate users found in Team Members table."));
									d.get_primary_btn().prop("disabled", false);
									return;
								}
							}

							const res = await frappe.call({
								method: "taskflow.taskflow.api.taskflow.update_project",
								args: {
									project_name: project_doc.name,
									values: values
								},
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
							(this.isUserOverview ||
								(this.activeTab === "overview" && this.viewMode === "task"))
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

						only_my_tasks: this.isUserOverview ? 1 : 0,
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

					fontSize: "15px",

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
