import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import {
  useBuilderStore,
  QuestionConfig, IfElseConfig, SwitchConfig, EndConfig,
  RatingConfig, StatementConfig, MatrixConfig, HiddenFieldConfig, RecallConfig,
} from '../../store/builder'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

const selectCls =
  'h-9 px-3 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-[#09090b] dark:text-white focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444]'

const miniCls =
  'flex-1 h-8 px-2 text-xs bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-[#09090b] dark:text-white focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444]'

const labelCls = 'text-xs text-[#71717a] dark:text-[#888] tracking-wide'

export function NodeConfigPanel() {
  const { nodes, selectedNodeId, setSelectedNode, deleteNode } = useBuilderStore()
  const node = nodes.find((n) => n.id === selectedNodeId)

  return (
    <AnimatePresence>
      {node && selectedNodeId && (
        <motion.div
          key="config-panel"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-0 h-full w-72 bg-[#fafafa] dark:bg-[#0a0a0a] border-l border-[#e4e4e7] dark:border-[#1a1a1a] flex flex-col z-10"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e4e7] dark:border-[#1a1a1a]">
            <span className="text-xs font-medium uppercase tracking-widest text-[#71717a] dark:text-[#888]">
              {node.data.blockType.replace(/_/g, ' ')}
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {node.data.blockType === 'question' && (
              <QuestionForm config={node.data.config as QuestionConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'rating' && (
              <RatingForm config={node.data.config as RatingConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'statement' && (
              <StatementForm config={node.data.config as StatementConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'matrix' && (
              <MatrixForm config={node.data.config as MatrixConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'hidden_field' && (
              <HiddenFieldForm config={node.data.config as HiddenFieldConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'recall' && (
              <RecallForm config={node.data.config as RecallConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'if_else' && (
              <IfElseForm config={node.data.config as IfElseConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'switch' && (
              <SwitchForm config={node.data.config as SwitchConfig} nodeId={selectedNodeId} />
            )}
            {node.data.blockType === 'end' && (
              <EndForm config={node.data.config as EndConfig} nodeId={selectedNodeId} />
            )}
          </div>

          {/* Delete block button */}
          <div className="px-4 py-3 border-t border-[#e4e4e7] dark:border-[#1a1a1a]">
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => deleteNode(selectedNodeId)}
            >
              <Trash2 size={12} className="mr-1.5" /> Delete block
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Shared sub-components ─────────────────────────────

function ListEditor({
  label, items, onChange, placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelCls}>{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => { const n = [...items]; n[i] = e.target.value; onChange(n) }}
            className={miniCls}
            placeholder={placeholder || `Item ${i + 1}`}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-[#a1a1aa] dark:text-[#555] hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        className="flex items-center gap-1 text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
      >
        <Plus size={12} /> Add
      </button>
    </div>
  )
}

// ── Block forms ───────────────────────────────────────

function QuestionForm({ config, nodeId }: { config: QuestionConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <Input label="Label" value={config.label}
        onChange={(e) => updateNodeConfig(nodeId, { label: e.target.value })} placeholder="Enter your question" />
      <Input label="Field name" value={config.field}
        onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. first_name" />
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Type</label>
        <select value={config.questionType} onChange={(e) => updateNodeConfig(nodeId, { questionType: e.target.value as QuestionConfig['questionType'] })} className={selectCls}>
          <option value="text">Text</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="rating">Number Rating</option>
        </select>
      </div>
      {config.questionType === 'multiple_choice' && (
        <ListEditor label="Options" items={config.options || []}
          onChange={(options) => updateNodeConfig(nodeId, { options })} placeholder="Option" />
      )}
      {config.questionType === 'rating' && (
        <Input label="Max" type="number" min={2} max={10} value={config.maxRating ?? 5}
          onChange={(e) => updateNodeConfig(nodeId, { maxRating: Number(e.target.value) })} />
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={config.required}
          onChange={(e) => updateNodeConfig(nodeId, { required: e.target.checked })}
          className="accent-[#09090b] dark:accent-white" />
        <span className="text-xs text-[#71717a] dark:text-[#888]">Required</span>
      </label>
    </>
  )
}

function RatingForm({ config, nodeId }: { config: RatingConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <Input label="Label" value={config.label}
        onChange={(e) => updateNodeConfig(nodeId, { label: e.target.value })} placeholder="How would you rate us?" />
      <Input label="Field name" value={config.field}
        onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. nps_score" />
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Style</label>
        <select value={config.style} onChange={(e) => updateNodeConfig(nodeId, { style: e.target.value as 'nps' | 'stars' })} className={selectCls}>
          <option value="nps">NPS (0–10)</option>
          <option value="stars">Stars (1–5)</option>
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={config.required}
          onChange={(e) => updateNodeConfig(nodeId, { required: e.target.checked })}
          className="accent-[#09090b] dark:accent-white" />
        <span className="text-xs text-[#71717a] dark:text-[#888]">Required</span>
      </label>
    </>
  )
}

function StatementForm({ config, nodeId }: { config: StatementConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Text</label>
        <textarea value={config.text} rows={5}
          onChange={(e) => updateNodeConfig(nodeId, { text: e.target.value })}
          className="px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] resize-none"
          placeholder="Your statement text..."
        />
      </div>
      <Input label="Button label" value={config.buttonLabel}
        onChange={(e) => updateNodeConfig(nodeId, { buttonLabel: e.target.value })} placeholder="Continue" />
    </>
  )
}

function MatrixForm({ config, nodeId }: { config: MatrixConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <Input label="Label" value={config.label}
        onChange={(e) => updateNodeConfig(nodeId, { label: e.target.value })} placeholder="Please rate the following:" />
      <Input label="Field name" value={config.field}
        onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. product_ratings" />
      <ListEditor label="Rows (items)" items={config.rows}
        onChange={(rows) => updateNodeConfig(nodeId, { rows })} placeholder="Row label" />
      <ListEditor label="Columns (scale)" items={config.columns}
        onChange={(columns) => updateNodeConfig(nodeId, { columns })} placeholder="Column label" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={config.required}
          onChange={(e) => updateNodeConfig(nodeId, { required: e.target.checked })}
          className="accent-[#09090b] dark:accent-white" />
        <span className="text-xs text-[#71717a] dark:text-[#888]">Required</span>
      </label>
    </>
  )
}

function HiddenFieldForm({ config, nodeId }: { config: HiddenFieldConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <div className="p-3 bg-[#f4f4f5] dark:bg-[#111] rounded border border-[#e4e4e7] dark:border-[#222]">
        <p className="text-[10px] text-[#71717a] dark:text-[#888] leading-relaxed">
          Invisible to respondents. Reads a URL query param and attaches it to the submission.
        </p>
      </div>
      <Input label="Field name (key in submission)" value={config.field}
        onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. utm_source" />
      <Input label="URL parameter name" value={config.paramName}
        onChange={(e) => updateNodeConfig(nodeId, { paramName: e.target.value })} placeholder="e.g. utm_source" />
      <Input label="Default (if param is absent)" value={config.defaultValue}
        onChange={(e) => updateNodeConfig(nodeId, { defaultValue: e.target.value })} placeholder="(empty)" />
      <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
        Example URL: /s/your-survey<strong>?{config.paramName || 'param'}=value</strong>
      </p>
    </>
  )
}

function RecallForm({ config, nodeId }: { config: RecallConfig; nodeId: string }) {
  const { updateNodeConfig, nodes } = useBuilderStore()
  const questionFields = nodes
    .filter((n) => ['question', 'rating', 'matrix'].includes(n.data.blockType))
    .map((n) => (n.data.config as { field?: string }).field)
    .filter(Boolean) as string[]

  return (
    <>
      <div className="p-3 bg-[#f4f4f5] dark:bg-[#111] rounded border border-[#e4e4e7] dark:border-[#222]">
        <p className="text-[10px] text-[#71717a] dark:text-[#888] leading-relaxed">
          Use <code className="font-mono bg-white dark:bg-[#222] px-1 rounded">{'{{answer}}'}</code> in the label to insert the recalled answer.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Recall field</label>
        <select value={config.recallField}
          onChange={(e) => updateNodeConfig(nodeId, { recallField: e.target.value })}
          className={selectCls}>
          <option value="">— pick a field —</option>
          {questionFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <Input label="Label (use {{answer}} to recall)"
        value={config.label}
        onChange={(e) => updateNodeConfig(nodeId, { label: e.target.value })}
        placeholder="You said {{answer}} — tell us more." />
      <Input label="Field name (for this answer)" value={config.field}
        onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. followup" />
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Answer type</label>
        <select value={config.questionType}
          onChange={(e) => updateNodeConfig(nodeId, { questionType: e.target.value as 'text' | 'multiple_choice' })}
          className={selectCls}>
          <option value="text">Text</option>
          <option value="multiple_choice">Multiple Choice</option>
        </select>
      </div>
      {config.questionType === 'multiple_choice' && (
        <ListEditor label="Options" items={config.options || []}
          onChange={(options) => updateNodeConfig(nodeId, { options })} placeholder="Option" />
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={config.required}
          onChange={(e) => updateNodeConfig(nodeId, { required: e.target.checked })}
          className="accent-[#09090b] dark:accent-white" />
        <span className="text-xs text-[#71717a] dark:text-[#888]">Required</span>
      </label>
    </>
  )
}

function IfElseForm({ config, nodeId }: { config: IfElseConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <Input label="Field name" value={config.field} onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. age" />
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Operator</label>
        <select value={config.operator} onChange={(e) => updateNodeConfig(nodeId, { operator: e.target.value as IfElseConfig['operator'] })} className={selectCls}>
          <option value="equals">equals</option>
          <option value="not_equals">not equals</option>
          <option value="contains">contains</option>
          <option value="greater_than">greater than</option>
          <option value="less_than">less than</option>
        </select>
      </div>
      <Input label="Value" value={config.value} onChange={(e) => updateNodeConfig(nodeId, { value: e.target.value })} placeholder="Compare value" />
      <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Left handle → Yes · Right handle → No</p>
    </>
  )
}

function SwitchForm({ config, nodeId }: { config: SwitchConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <>
      <Input label="Field name" value={config.field} onChange={(e) => updateNodeConfig(nodeId, { field: e.target.value })} placeholder="e.g. plan" />
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Cases</label>
        {config.cases.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input value={c.value} onChange={(e) => { const next = config.cases.map((x, j) => j === i ? { ...x, value: e.target.value } : x); updateNodeConfig(nodeId, { cases: next }) }} placeholder="value" className={miniCls} />
            <input value={c.label} onChange={(e) => { const next = config.cases.map((x, j) => j === i ? { ...x, label: e.target.value } : x); updateNodeConfig(nodeId, { cases: next }) }} placeholder="label" className={miniCls} />
            <button onClick={() => updateNodeConfig(nodeId, { cases: config.cases.filter((_, j) => j !== i) })} className="text-[#a1a1aa] dark:text-[#555] hover:text-red-500 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => updateNodeConfig(nodeId, { cases: [...config.cases, { value: `option_${config.cases.length + 1}`, label: '' }] })}
          className="flex items-center gap-1 text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
        >
          <Plus size={12} /> Add case
        </button>
      </div>
    </>
  )
}

function EndForm({ config, nodeId }: { config: EndConfig; nodeId: string }) {
  const { updateNodeConfig } = useBuilderStore()
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>Completion message</label>
      <textarea value={config.message} rows={4}
        onChange={(e) => updateNodeConfig(nodeId, { message: e.target.value })}
        className="px-3 py-2 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] resize-none"
        placeholder="Thank you for completing this survey!"
      />
    </div>
  )
}
