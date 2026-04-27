import { create } from 'zustand'
import {
  Node, Edge, addEdge,
  applyNodeChanges, applyEdgeChanges,
  NodeChange, EdgeChange, Connection,
} from '@xyflow/react'

export interface SurveySettings {
  // Survey / public renderer settings
  theme: 'dark' | 'light' | 'system'
  brandColor: string
  radius: 'none' | 'sm' | 'full'
  // Canvas / builder settings
  canvasBg: 'dots' | 'lines' | 'cross' | 'none'
  canvasBgColor: string
  canvasBgOpacity: number   // 0–100
  minimap: boolean
  snapToGrid: boolean
}

// ── Configs ────────────────────────────────────────────
export interface QuestionConfig {
  label: string
  questionType: 'text' | 'multiple_choice' | 'rating'
  field: string
  required: boolean
  options?: string[]
  maxRating?: number
}

export interface IfElseConfig {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: string
}

export interface SwitchConfig {
  field: string
  cases: { value: string; label: string }[]
}

export interface EndConfig {
  message: string
}

export interface RatingConfig {
  label: string
  field: string
  style: 'nps' | 'stars'
  required: boolean
}

export interface StatementConfig {
  text: string
  buttonLabel: string
}

export interface MatrixConfig {
  label: string
  field: string
  rows: string[]
  columns: string[]
  required: boolean
}

export interface HiddenFieldConfig {
  field: string
  paramName: string
  defaultValue: string
}

export interface RecallConfig {
  label: string
  field: string
  recallField: string
  questionType: 'text' | 'multiple_choice'
  options?: string[]
  required: boolean
}

export type BlockType =
  | 'question' | 'if_else' | 'switch' | 'end'
  | 'rating' | 'statement' | 'matrix' | 'hidden_field' | 'recall'

export type BlockConfig =
  | QuestionConfig | IfElseConfig | SwitchConfig | EndConfig
  | RatingConfig | StatementConfig | MatrixConfig | HiddenFieldConfig | RecallConfig

export interface BlockData extends Record<string, unknown> {
  blockType: BlockType
  config: BlockConfig
}

export type BlockNode = Node<BlockData>

// ── Store ──────────────────────────────────────────────
interface BuilderState {
  nodes: BlockNode[]
  edges: Edge[]
  title: string
  settings: SurveySettings
  isDirty: boolean
  selectedNodeId: string | null
  onNodesChange: (changes: NodeChange<BlockNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: BlockNode) => void
  deleteNode: (id: string) => void
  deleteEdge: (id: string) => void
  updateNodeConfig: (id: string, patch: Partial<BlockConfig>) => void
  updateSettings: (patch: Partial<SurveySettings>) => void
  setTitle: (title: string) => void
  setSelectedNode: (id: string | null) => void
  loadSurvey: (nodes: BlockNode[], edges: Edge[], title: string, settings?: SurveySettings) => void
  markClean: () => void
}

function edgeLabelForHandle(handle: string | null | undefined): string | undefined {
  if (!handle) return undefined
  if (handle === 'true') return 'Yes'
  if (handle === 'false') return 'No'
  return handle
}

export const useBuilderStore = create<BuilderState>((set) => ({
  nodes: [],
  edges: [],
  title: '',
  settings: { theme: 'dark', brandColor: '#ffffff', radius: 'sm', canvasBg: 'dots', canvasBgColor: '', canvasBgOpacity: 30, minimap: true, snapToGrid: false },
  isDirty: false,
  selectedNodeId: null,

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), isDirty: true })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges), isDirty: true })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(
        { ...connection, type: 'logic', label: edgeLabelForHandle(connection.sourceHandle) },
        s.edges
      ),
      isDirty: true,
    })),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      isDirty: true,
    })),

  deleteEdge: (id) =>
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id), isDirty: true })),

  updateNodeConfig: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } } : n
      ),
      isDirty: true,
    })),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch }, isDirty: true })),
  setTitle: (title) => set({ title, isDirty: true }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  loadSurvey: (nodes, edges, title, settings) =>
    set({
      nodes, edges, title,
      settings: settings
        ? (Object.assign({ theme: 'dark', brandColor: '#ffffff', radius: 'sm', canvasBg: 'dots', canvasBgColor: '', canvasBgOpacity: 30, minimap: true, snapToGrid: false }, settings) as SurveySettings)
        : { theme: 'dark' as const, brandColor: '#ffffff', radius: 'sm' as const, canvasBg: 'dots' as const, canvasBgColor: '', canvasBgOpacity: 30, minimap: true, snapToGrid: false },
      isDirty: false, selectedNodeId: null
    }),
  markClean: () => set({ isDirty: false }),
}))

// ── Default configs ────────────────────────────────────
export function defaultConfig(blockType: BlockType): BlockConfig {
  const ts = Date.now()
  switch (blockType) {
    case 'question':
      return { label: 'New Question', questionType: 'text', field: `q_${ts}`, required: false }
    case 'if_else':
      return { field: '', operator: 'equals', value: '' }
    case 'switch':
      return { field: '', cases: [{ value: 'option_1', label: 'Option 1' }] }
    case 'end':
      return { message: 'Thank you for completing this survey!' }
    case 'rating':
      return { label: 'How would you rate us?', field: `rating_${ts}`, style: 'nps', required: false }
    case 'statement':
      return { text: 'Add your statement here.', buttonLabel: 'Continue' }
    case 'matrix':
      return {
        label: 'Please rate the following:',
        field: `matrix_${ts}`,
        rows: ['Speed', 'Design', 'Support'],
        columns: ['Poor', 'Okay', 'Great'],
        required: false,
      }
    case 'hidden_field':
      return { field: 'utm_source', paramName: 'utm_source', defaultValue: '' }
    case 'recall':
      return {
        label: 'You mentioned {{answer}} — tell us more.',
        field: `recall_${ts}`,
        recallField: '',
        questionType: 'text',
        required: false,
      }
  }
}
