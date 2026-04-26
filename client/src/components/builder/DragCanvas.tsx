import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  MiniMap,
} from '@xyflow/react'
import { BlockNode } from './BlockNode'
import { LogicEdge } from './LogicEdge'
import { BlockPalette } from './BlockPalette'
import { NodeConfigPanel } from './NodeConfigPanel'
import { CommandPalette } from './CommandPalette'
import { useBuilderStore, BlockData, BlockType, defaultConfig } from '../../store/builder'
import { useThemeStore } from '../../store/theme'

const nodeTypes = { block: BlockNode }
const edgeTypes = { logic: LogicEdge }

function FlowCanvas() {
  const { screenToFlowPosition } = useReactFlow()
  const { theme } = useThemeStore()
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNode,
  } = useBuilderStore()

  const [cmdOpen, setCmdOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const blockType = event.dataTransfer.getData('block-type') as BlockData['blockType']
      if (!blockType) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const id = crypto.randomUUID()
      addNode({ id, type: 'block', position, data: { blockType, config: defaultConfig(blockType) } })
      setSelectedNode(id)
    },
    [screenToFlowPosition, addNode, setSelectedNode]
  )

  function handleCommandSelect(blockType: BlockType) {
    const rect = canvasRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const position = screenToFlowPosition({ x: cx, y: cy })
    const id = crypto.randomUUID()
    addNode({ id, type: 'block', position, data: { blockType, config: defaultConfig(blockType) } })
    setSelectedNode(id)
  }

  const isDark = theme === 'dark'

  return (
    <div ref={canvasRef} className="flex-1 relative h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        proOptions={{ hideAttribution: true }}
        colorMode={isDark ? 'dark' : 'light'}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={isDark ? '#1a1a1a' : '#e4e4e7'}
          gap={24}
          size={1}
        />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          position="bottom-right"
          style={{ bottom: 48 }}
          nodeColor={isDark ? '#222' : '#e4e4e7'}
          maskColor={isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)'}
        />
      </ReactFlow>

      <NodeConfigPanel />

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelect={handleCommandSelect}
      />

      {/* Cmd+K hint */}
      {!cmdOpen && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#444] bg-white dark:bg-black border border-[#f4f4f5] dark:border-[#1a1a1a] rounded px-2 py-1 select-none">
            <kbd className="font-mono">⌘K</kbd> to search blocks
          </span>
        </div>
      )}
    </div>
  )
}

export function DragCanvas() {
  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex">
        <BlockPalette />
        <FlowCanvas />
      </div>
    </ReactFlowProvider>
  )
}
