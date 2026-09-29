<template>
  <div
    class="relative flex-1 min-h-0 flex flex-col bg-[#F3F6F5] dark:bg-neutral-950"
    @dragover.prevent="dragActive = true"
    @dragleave.self="dragActive = false"
    @drop.prevent="onDrop"
  >
    <!-- Drop overlay -->
    <div
      v-if="dragActive && canChat"
      class="absolute inset-2 z-30 rounded-xl border-2 border-dashed border-[#468373] bg-[#468373]/10 flex items-center justify-center text-xs font-semibold text-[#2F5E52] pointer-events-none"
    >
      Drop files to attach
    </div>

    <!-- Messages -->
    <div ref="scroller" class="flex-1 min-h-0 overflow-y-auto px-3 py-3" @scroll="onScroll">
      <div v-if="!canChat" class="h-full flex flex-col items-center justify-center text-center text-ink-gray-5 select-none">
        <MessageSquare class="size-6 text-ink-gray-3 mb-1.5" />
        <p class="text-xs font-medium">Save the task to start the chat</p>
      </div>

      <div v-else-if="loading && messages.length === 0" class="py-8 flex justify-center">
        <Loader2 class="size-4 animate-spin text-[#468373]" />
      </div>

      <div v-else-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center text-ink-gray-5 select-none">
        <MessageSquare class="size-6 text-ink-gray-3 mb-1.5" />
        <p class="text-xs font-medium">No messages yet</p>
        <p class="text-[11px] text-ink-gray-4">Say hi, share a file, or @mention a teammate.</p>
      </div>

      <template v-else>
        <template v-for="row in rows" :key="row.key">
          <!-- Date separator -->
          <div v-if="row.type === 'date'" class="flex justify-center my-3 select-none">
            <span class="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-semibold text-ink-gray-6 dark:text-neutral-300">
              {{ row.label }}
            </span>
          </div>

          <!-- Message -->
          <div
            v-else
            :ref="(el) => setMessageRef(row.msg.id, el)"
            class="group flex items-end gap-1.5 transition-colors rounded-lg"
            :class="[
              row.msg.is_mine ? 'justify-end' : 'justify-start',
              row.groupEnd ? 'mb-2' : 'mb-0.5',
              highlightedId === row.msg.id ? 'bg-[#468373]/10' : '',
            ]"
          >
            <!-- Avatar (others, last of a group) -->
            <div v-if="!row.msg.is_mine" class="w-7 shrink-0">
              <Avatar
                v-if="row.groupEnd"
                :image="row.msg.author_image"
                :label="row.msg.author"
                size="md"
                shape="circle"
              />
            </div>

            <div class="relative max-w-[85%] min-w-0 flex flex-col" :class="row.msg.is_mine ? 'items-end' : 'items-start'">
              <!-- Hover actions: centred just above the bubble, overlapping its top
                   edge a little so the pointer can move onto them without a gap.
                   On a bubble narrower than the bar it sits flush with the bubble's
                   inner edge instead, so it never leaves the panel. -->
              <div
                class="absolute bottom-full -mb-2 z-20 hidden group-hover:flex items-center gap-0.5 rounded-full border border-outline-gray-2 bg-surface-base dark:bg-neutral-800 dark:border-neutral-700 shadow-sm px-1 py-0.5"
                :class="pickerFor === row.msg.id ? '!flex' : ''"
                :style="actionBarStyle(row.msg)"
              >
                <button type="button" class="chat-action" title="React" @click="togglePicker(row.msg.id)">
                  <Smile class="size-3.5" />
                </button>
                <button type="button" class="chat-action" title="Reply" @click="startReply(row.msg)">
                  <Reply class="size-3.5" />
                </button>
                <button v-if="row.msg.can_edit" type="button" class="chat-action" title="Edit" @click="startEdit(row.msg)">
                  <Pencil class="size-3.5" />
                </button>
                <button v-if="row.msg.can_delete" type="button" class="chat-action chat-action-danger" title="Delete" @click="removeMessage(row.msg)">
                  <Trash2 class="size-3.5" />
                </button>

                <!-- Quick reactions -->
                <div
                  v-if="pickerFor === row.msg.id"
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex items-center gap-0.5 rounded-full border border-outline-gray-2 bg-surface-base dark:bg-neutral-800 dark:border-neutral-700 shadow-md px-1.5 py-1"
                >
                  <button
                    v-for="e in REACTIONS"
                    :key="e"
                    type="button"
                    class="size-7 rounded-full text-base leading-none hover:bg-surface-gray-2 hover:scale-125 transition-transform"
                    @click="react(row.msg, e)"
                  >
                    {{ e }}
                  </button>
                </div>
              </div>

              <!-- Bubble -->
              <div
                class="max-w-full px-2.5 pt-1.5 pb-1 text-xs leading-relaxed shadow-xs break-words min-w-[72px]"
                :class="[
                  row.msg.is_mine
                    ? 'bg-[#DDEFE8] dark:bg-[#1D4036] text-ink-gray-9 dark:text-neutral-100 rounded-2xl'
                    : 'bg-surface-base dark:bg-neutral-800 text-ink-gray-9 dark:text-neutral-100 rounded-2xl',
                  row.groupEnd ? (row.msg.is_mine ? 'rounded-br-md' : 'rounded-bl-md') : '',
                ]"
                @dblclick="startReply(row.msg)"
              >
                <!-- Author (others, first of a group) -->
                <div v-if="!row.msg.is_mine && row.groupStart" class="text-[11px] font-semibold text-[#2F5E52] dark:text-emerald-300 mb-0.5">
                  {{ row.msg.author }}
                </div>

                <!-- Reply quote -->
                <button
                  v-if="row.msg.reply_to"
                  type="button"
                  class="w-full text-left mb-1 pl-2 pr-1.5 py-1 rounded-md border-l-2 border-[#468373] bg-[#468373]/10 hover:bg-[#468373]/15 transition-colors"
                  :class="row.msg.reply_to.deleted ? 'cursor-default' : 'cursor-pointer'"
                  @click="!row.msg.reply_to.deleted && jumpTo(row.msg.reply_to.id)"
                >
                  <div v-if="!row.msg.reply_to.deleted" class="text-[10px] font-semibold text-[#2F5E52] dark:text-emerald-300 truncate">
                    {{ row.msg.reply_to.author }}
                  </div>
                  <div class="text-[11px] text-ink-gray-6 dark:text-neutral-300 truncate" :class="row.msg.reply_to.deleted ? 'italic' : ''">
                    {{ row.msg.reply_to.snippet }}
                  </div>
                </button>

                <!-- Attachments -->
                <div v-if="row.msg.attachments.length" class="flex flex-col gap-1 mb-1">
                  <div v-if="imagesOf(row.msg).length" class="grid gap-1" :class="imagesOf(row.msg).length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
                    <a
                      v-for="img in imagesOf(row.msg)"
                      :key="img.id"
                      :href="img.url"
                      target="_blank"
                      :title="`Download ${img.name}`"
                      class="block overflow-hidden rounded-lg bg-black/5"
                    >
                      <img :src="img.url" :alt="img.name" class="max-h-48 w-full object-cover" loading="lazy" />
                    </a>
                  </div>
                  <a
                    v-for="f in filesOf(row.msg)"
                    :key="f.id"
                    :href="f.url"
                    :title="`Download ${f.name}`"
                    class="flex min-w-0 max-w-full items-center gap-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 px-2 py-1.5 transition-colors"
                  >
                    <span class="size-8 shrink-0 rounded-full bg-[#468373] text-white flex items-center justify-center">
                      <FileText class="size-4" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-[11px] font-semibold">{{ f.name }}</span>
                      <span class="block text-[10px] text-ink-gray-5 uppercase">{{ f.ext }} · {{ f.size }}</span>
                    </span>
                    <Download class="size-3.5 text-ink-gray-5 shrink-0" />
                  </a>
                </div>

                <!-- Text -->
                <div
                  v-if="hasText(row.msg.content)"
                  class="chat-content"
                  @click="onContentClick"
                  v-html="linkify(row.msg.content)"
                />

                <!-- Reactions + meta -->
                <div class="flex flex-wrap items-end justify-end gap-1 mt-0.5">
                  <button
                    v-for="r in row.msg.reactions"
                    :key="r.emoji"
                    type="button"
                    class="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[11px] border transition-colors"
                    :class="r.mine
                      ? 'bg-[#468373] border-[#468373] text-white'
                      : 'bg-black/5 dark:bg-white/10 border-transparent text-ink-gray-7 dark:text-neutral-200 hover:bg-black/10'"
                    :title="r.users.join(', ')"
                    @click="react(row.msg, r.emoji)"
                  >
                    <span class="leading-none">{{ r.emoji }}</span>
                    <span class="font-semibold leading-none">{{ r.count }}</span>
                  </button>
                  <span class="ml-auto pl-2 text-[10px] text-ink-gray-5 dark:text-neutral-400 whitespace-nowrap select-none" :title="fullTime(row.msg.creation)">
                    <span v-if="row.msg.edited_at" :title="`Edited ${fullTime(row.msg.edited_at)}`">edited </span>{{ shortTime(row.msg.creation) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Jump to latest -->
    <button
      v-if="!atBottom && messages.length"
      type="button"
      class="absolute right-4 bottom-[88px] z-20 size-8 rounded-full bg-surface-base dark:bg-neutral-800 border border-outline-gray-2 dark:border-neutral-700 shadow-md flex items-center justify-center text-ink-gray-6 hover:text-[#468373]"
      title="Jump to latest"
      @click="scrollToBottom(true)"
    >
      <ChevronDown class="size-4" />
    </button>

    <!-- Composer -->
    <div v-if="canChat" class="shrink-0 border-t border-outline-gray-2 dark:border-neutral-800 bg-surface-base dark:bg-neutral-900 px-2.5 py-2">
      <!-- Reply / edit banner -->
      <div v-if="replyTo || editing" class="flex items-center gap-2 mb-1.5 pl-2 pr-1 py-1 rounded-md border-l-2 border-[#468373] bg-[#468373]/10">
        <component :is="editing ? Pencil : Reply" class="size-3.5 text-[#468373] shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="text-[10px] font-semibold text-[#2F5E52] dark:text-emerald-300">
            {{ editing ? 'Edit message' : `Reply to ${replyTo.author}` }}
          </div>
          <div class="text-[11px] text-ink-gray-6 truncate">{{ snippetOf(editing || replyTo) }}</div>
        </div>
        <button type="button" class="p-1 rounded hover:bg-black/5 text-ink-gray-5" title="Cancel (Esc)" @click="cancelCompose">
          <X class="size-3.5" />
        </button>
      </div>

      <!-- Pending files -->
      <div v-if="pendingFiles.length" class="flex flex-wrap gap-1.5 mb-1.5">
        <span
          v-for="(f, i) in pendingFiles"
          :key="i"
          class="inline-flex items-center gap-1.5 max-w-[180px] pl-2 pr-1 py-0.5 rounded-md bg-surface-gray-2 dark:bg-neutral-800 text-[11px] text-ink-gray-7"
        >
          <Paperclip class="size-3 shrink-0 text-ink-gray-5" />
          <span class="truncate">{{ f.name }}</span>
          <button type="button" class="p-0.5 rounded hover:bg-black/10" title="Remove" @click="pendingFiles.splice(i, 1)">
            <X class="size-3" />
          </button>
        </span>
      </div>

      <div class="flex items-end gap-1.5">
        <button
          v-if="!editing"
          type="button"
          class="size-8 shrink-0 rounded-full flex items-center justify-center text-ink-gray-5 hover:text-[#468373] hover:bg-surface-gray-2 transition-colors"
          title="Attach files"
          @click="$refs.fileInput.click()"
        >
          <Paperclip class="size-4" />
        </button>
        <input ref="fileInput" type="file" multiple class="hidden" data-chat-file @change="onPickFiles" />

        <Editor
          ref="editorRef"
          v-model="draft"
          :extensions="extensions"
          placeholder="Message…  (@ to mention)"
          class="min-w-0 flex-1"
        >
          <template #default>
            <div class="min-w-0 flex-1 rounded-2xl bg-surface-gray-2 dark:bg-neutral-800 focus-within:ring-1 focus-within:ring-[#468373]/40 transition" @keydown.esc="cancelCompose">
              <EditorContent class="chat-editor max-h-32 min-h-[32px] overflow-y-auto px-3 py-1.5 text-xs text-ink-gray-9 dark:text-neutral-100" />
            </div>
          </template>
        </Editor>

        <button
          type="button"
          class="size-8 shrink-0 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#468373] hover:bg-[#3A6F61]"
          :disabled="!canSend"
          :title="editing ? 'Save (Enter)' : 'Send (Enter)'"
          @click="submit"
        >
          <Loader2 v-if="sending" class="size-4 animate-spin" />
          <Check v-else-if="editing" class="size-4" />
          <SendHorizontal v-else class="size-4" />
        </button>
      </div>
      <p class="mt-1 pl-10 text-[10px] text-ink-gray-4 select-none">Enter to send · Shift+Enter for a new line</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Avatar, toast } from 'frappe-ui'
import { Editor, EditorContent, CommentKit } from 'frappe-ui/editor'
import { Extension } from '@tiptap/core'
import dayjs from 'dayjs'
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Reply,
  SendHorizontal,
  Smile,
  Trash2,
  X,
} from 'lucide-vue-next'
import {
  fetchChatMessages,
  sendChatMessage,
  editChatMessage,
  deleteChatMessage,
  toggleChatReaction,
  getErrorMessage,
} from '@/data/api.js'

// Quick reactions offered in the picker. Each must be in ALLOWED_REACTIONS in
// taskflow/taskflow/api/task_chat.py (the server allows a wider set).
const REACTIONS = ['👍', '👎', '❤️']
const MAX_FILES = 10
const MAX_FILE_SIZE = 25 * 1024 * 1024
const POLL_MS = 15000
const GROUP_GAP_MIN = 5

const props = defineProps({
  taskId: { type: String, default: '' },
  // Team members for @mentions: [{ user, employee, employee_name }]
  members: { type: Array, default: () => [] },
})

const emit = defineEmits(['count'])

const messages = ref([])
const loading = ref(false)
const sending = ref(false)
const draft = ref('')
const pendingFiles = ref([])
const replyTo = ref(null)
const editing = ref(null)
const pickerFor = ref('')
const highlightedId = ref('')
const atBottom = ref(true)
const dragActive = ref(false)
const scroller = ref(null)
const editorRef = ref(null)
const messageEls = new Map()
let pollTimer = null

const canChat = computed(() => !!props.taskId && props.taskId !== 'new')
const draftEmpty = computed(() => editorRef.value?.isEmpty ?? !draft.value)
const canSend = computed(() => !sending.value && (!draftEmpty.value || (!editing.value && pendingFiles.value.length > 0)))

// --- Mentions + Enter to send ---
const people = computed(() => {
  const map = new Map()
  for (const m of props.members || []) {
    const id = m?.user || m?.employee || m?.name
    if (id && !map.has(id)) map.set(id, { id, label: m.employee_name || m.user || id })
  }
  return Array.from(map.values())
})

// Runs before the editor's own Enter (new paragraph). While an @mention
// suggestion list is open, Enter is left to it so it picks the person.
// Shift+Enter keeps the default line break.
const suggestionOpen = (state) =>
  state.plugins.some((p) => p.spec?.key && p.getState(state)?.active === true)

const SubmitOnEnter = Extension.create({
  name: 'taskChatSubmitOnEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (suggestionOpen(editor.state)) return false
        submit()
        return true
      },
    }
  },
})

// The editor is built once, often before team members have loaded, so hand
// the mention list over as a getter: it reads the current people on every @.
const extensions = [
  CommentKit.configure({ mention: { items: () => people.value } }),
  SubmitOnEnter,
]

function editorInstance() {
  return editorRef.value?.editor || null
}

function setEditorContent(html) {
  draft.value = html
  const ed = editorInstance()
  if (ed) {
    ed.commands.setContent(html || '')
    ed.commands.focus('end')
  }
}

// --- Rows: date separators + grouping of consecutive messages ---
const rows = computed(() => {
  const out = []
  let lastDay = ''
  const list = messages.value
  for (let i = 0; i < list.length; i++) {
    const msg = list[i]
    const d = dayjs(msg.creation)
    const day = d.format('YYYY-MM-DD')
    if (day !== lastDay) {
      out.push({ type: 'date', key: `d-${day}`, label: dayLabel(d) })
      lastDay = day
    }
    const prev = list[i - 1]
    const next = list[i + 1]
    const sameAsPrev = prev && sameGroup(prev, msg)
    const sameAsNext = next && sameGroup(msg, next)
    out.push({ type: 'msg', key: msg.id, msg, groupStart: !sameAsPrev, groupEnd: !sameAsNext })
  }
  return out
})

function sameGroup(a, b) {
  const da = dayjs(a.creation)
  const db = dayjs(b.creation)
  return a.author_email === b.author_email
    && da.isSame(db, 'day')
    && Math.abs(db.diff(da, 'minute')) < GROUP_GAP_MIN
}

function dayLabel(d) {
  const today = dayjs()
  if (d.isSame(today, 'day')) return 'Today'
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday'
  return d.isSame(today, 'year') ? d.format('D MMMM') : d.format('D MMMM YYYY')
}

const shortTime = (v) => dayjs(v).format('h:mm A')
const fullTime = (v) => dayjs(v).format('D MMM YYYY, h:mm A')

function hasText(html) {
  if (!html) return false
  if (html.includes('<img')) return true
  const div = document.createElement('div')
  div.innerHTML = html
  return !!(div.textContent || '').trim()
}

function snippetOf(msg) {
  if (!msg) return ''
  const div = document.createElement('div')
  div.innerHTML = msg.content || ''
  const text = (div.textContent || '').replace(/\s+/g, ' ').trim()
  if (text) return text.length > 90 ? text.slice(0, 89) + '…' : text
  return msg.attachments?.length ? `📎 ${msg.attachments[0].name}` : ''
}

// Half the action bar's width: 24px buttons, 2px gaps, 4px padding + 1px border a side.
function actionBarStyle(msg) {
  const buttons = 2 + (msg.can_edit ? 1 : 0) + (msg.can_delete ? 1 : 0)
  const half = (buttons * 24 + (buttons - 1) * 2 + 10) / 2
  const offset = `max(0px, calc(50% - ${half}px))`
  return msg.is_mine ? { right: offset } : { left: offset }
}

const imagesOf = (msg) => msg.attachments.filter((a) => a.is_image)
const filesOf = (msg) => msg.attachments.filter((a) => !a.is_image)

// Turn bare URLs in text nodes into links. Content is already sanitized on
// the server; this only wraps text, never parses attributes from it.
const URL_RE = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g
const linkCache = new Map()
function linkify(html) {
  if (!html || !html.includes('http')) return html
  if (linkCache.has(html)) return linkCache.get(html)
  const root = document.createElement('div')
  root.innerHTML = html
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes = []
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement.closest('a')) textNodes.push(walker.currentNode)
  }
  for (const node of textNodes) {
    const text = node.nodeValue
    URL_RE.lastIndex = 0
    if (!URL_RE.test(text)) continue
    URL_RE.lastIndex = 0
    const frag = document.createDocumentFragment()
    let last = 0
    for (const m of text.matchAll(URL_RE)) {
      frag.append(text.slice(last, m.index))
      const a = document.createElement('a')
      a.href = m[0]
      a.textContent = m[0]
      frag.append(a)
      last = m.index + m[0].length
    }
    frag.append(text.slice(last))
    node.replaceWith(frag)
  }
  const out = root.innerHTML
  linkCache.set(html, out)
  return out
}

// Links inside messages open in a new tab instead of leaving the task form.
function onContentClick(e) {
  const a = e.target.closest('a[href]')
  if (!a) return
  e.preventDefault()
  window.open(a.href, '_blank', 'noopener')
}

// --- Scrolling ---
function setMessageRef(id, el) {
  if (el) messageEls.set(id, el)
  else messageEls.delete(id)
}

function onScroll() {
  const el = scroller.value
  if (!el) return
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    const el = scroller.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

function jumpTo(id) {
  const el = messageEls.get(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  highlightedId.value = id
  setTimeout(() => {
    if (highlightedId.value === id) highlightedId.value = ''
  }, 1600)
}

// --- Data ---
function replaceMessage(updated) {
  const i = messages.value.findIndex((m) => m.id === updated.id)
  if (i !== -1) messages.value.splice(i, 1, updated)
}

async function load({ silent = false } = {}) {
  if (!canChat.value) {
    messages.value = []
    return
  }
  const taskId = props.taskId
  if (!silent) loading.value = true
  try {
    const list = await fetchChatMessages(taskId)
    if (taskId !== props.taskId) return
    const stick = atBottom.value
    const grew = list.length > messages.value.length
    messages.value = list
    if (!silent || (stick && grew)) scrollToBottom()
  } catch (e) {
    if (!silent) toast.error(getErrorMessage(e, 'Failed to load chat'))
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && !sending.value) load({ silent: true })
  }, POLL_MS)
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

// --- Compose ---
function startReply(msg) {
  editing.value = null
  replyTo.value = msg
  pickerFor.value = ''
  nextTick(() => editorInstance()?.commands.focus('end'))
}

function startEdit(msg) {
  replyTo.value = null
  pendingFiles.value = []
  editing.value = msg
  pickerFor.value = ''
  setEditorContent(msg.content)
}

function cancelCompose() {
  const wasEditing = !!editing.value
  replyTo.value = null
  editing.value = null
  if (wasEditing) setEditorContent('')
}

function addFiles(fileList) {
  const incoming = Array.from(fileList || [])
  for (const f of incoming) {
    if (f.size > MAX_FILE_SIZE) {
      toast.error(`${f.name} is larger than 25 MB`)
      continue
    }
    if (pendingFiles.value.length >= MAX_FILES) {
      toast.error(`You can attach up to ${MAX_FILES} files per message`)
      break
    }
    pendingFiles.value.push(f)
  }
}

function onPickFiles(e) {
  addFiles(e.target.files)
  e.target.value = ''
}

function onDrop(e) {
  dragActive.value = false
  if (!canChat.value || editing.value) return
  addFiles(e.dataTransfer?.files)
}

async function submit() {
  if (!canSend.value) return
  const content = draftEmpty.value ? '' : draft.value
  sending.value = true
  try {
    if (editing.value) {
      const updated = await editChatMessage(editing.value.id, content)
      replaceMessage(updated)
      editing.value = null
    } else {
      const sent = await sendChatMessage(props.taskId, {
        content,
        replyTo: replyTo.value?.id || '',
        files: pendingFiles.value,
      })
      messages.value.push(sent)
      replyTo.value = null
      pendingFiles.value = []
      scrollToBottom(true)
    }
    setEditorContent('')
  } catch (e) {
    toast.error(getErrorMessage(e, 'Failed to send message'))
  } finally {
    sending.value = false
  }
}

async function removeMessage(msg) {
  pickerFor.value = ''
  if (!window.confirm('Delete this message for everyone?')) return
  try {
    await deleteChatMessage(msg.id)
    messages.value = messages.value
      .filter((m) => m.id !== msg.id)
      .map((m) => (m.reply_to?.id === msg.id
        ? { ...m, reply_to: { id: msg.id, author: '', snippet: 'Message deleted', deleted: true } }
        : m))
    if (editing.value?.id === msg.id) cancelCompose()
    if (replyTo.value?.id === msg.id) replyTo.value = null
  } catch (e) {
    toast.error(getErrorMessage(e, 'Failed to delete message'))
  }
}

function togglePicker(id) {
  pickerFor.value = pickerFor.value === id ? '' : id
}

async function react(msg, emoji) {
  pickerFor.value = ''
  try {
    replaceMessage(await toggleChatReaction(msg.id, emoji))
  } catch (e) {
    toast.error(getErrorMessage(e, 'Failed to react'))
  }
}

function closePickerOnOutside(e) {
  if (pickerFor.value && !e.target.closest('.group')) pickerFor.value = ''
}

watch(() => messages.value.length, (n) => emit('count', n), { immediate: true })

watch(() => props.taskId, () => {
  messages.value = []
  replyTo.value = null
  editing.value = null
  pendingFiles.value = []
  atBottom.value = true
  load()
})

onMounted(() => {
  load()
  startPolling()
  document.addEventListener('mousedown', closePickerOnOutside)
})

onBeforeUnmount(() => {
  stopPolling()
  document.removeEventListener('mousedown', closePickerOnOutside)
})
</script>

<style scoped>
.chat-action {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-gray-5, #7c7c7c);
  transition: color 0.15s, background-color 0.15s;
}
.chat-action:hover {
  color: #468373;
  background: rgb(0 0 0 / 0.05);
}
.chat-action-danger:hover {
  color: #dc2626;
}
.chat-content :deep(p) {
  margin: 0;
}
.chat-content :deep(p + p) {
  margin-top: 0.35rem;
}
.chat-content :deep(a) {
  color: #2f5e52;
  text-decoration: underline;
  word-break: break-all;
}
.chat-content :deep(.mention) {
  color: #2f5e52;
  font-weight: 600;
}
.chat-content :deep(ul),
.chat-content :deep(ol) {
  padding-left: 1.1rem;
  margin: 0.25rem 0;
}
.chat-content :deep(ul) {
  list-style: disc;
}
.chat-content :deep(ol) {
  list-style: decimal;
}
.chat-content :deep(code) {
  font-size: 11px;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  background: rgb(0 0 0 / 0.06);
}
.chat-content :deep(img) {
  max-width: 100%;
  border-radius: 0.5rem;
}
/* ProseMirror mounts on the EditorContent root, which carries .chat-editor */
.chat-editor {
  outline: none;
}
.chat-editor :deep(p) {
  margin: 0;
}
</style>
