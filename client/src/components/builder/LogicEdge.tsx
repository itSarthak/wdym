import { EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer } from '@xyflow/react'
import { X } from 'lucide-react'
import { useBuilderStore } from '../../store/builder'

export function LogicEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label, selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ strokeWidth: 1.5 }} />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-1 nodrag nopan"
        >
          {label && (
            <span className="bg-white dark:bg-[#000] border border-[#e4e4e7] dark:border-[#222] text-[10px] text-[#71717a] dark:text-[#888] px-1.5 py-0.5 rounded-sm">
              {String(label)}
            </span>
          )}
          {selected && (
            <button
              onClick={() => useBuilderStore.getState().deleteEdge(id)}
              className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              title="Delete edge"
            >
              <X size={8} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
