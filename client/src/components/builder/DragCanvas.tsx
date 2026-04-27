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

function resolveVariant(bg: string): BackgroundVariant | undefined {
  if (bg === 'dots') return BackgroundVariant.Dots
  if (bg === 'lines') return BackgroundVariant.Lines
  if (bg === 'cross') return BackgroundVariant.Cross
  return undefined
}

function FlowCanvas({ onRegisterAddBlock }: { onRegisterAddBlock?: (fn: (type: BlockType) => void) => void }) {
  const { screenToFlowPosition } = useReactFlow()
  const { theme } = useThemeStore()
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNode,
    settings,
  } = useBuilderStore()

  const [cmdOpen, setCmdOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Register mobile add-block handler so Builder's FAB can call it
  useEffect(() => {
    if (!onRegisterAddBlock) return
    onRegisterAddBlock((type: BlockType) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
      const position = screenToFlowPosition({ x: cx, y: cy })
      const id = crypto.randomUUID()
      addNode({ id, type: 'block', position, data: { blockType: type, config: defaultConfig(type) } })
      setSelectedNode(id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAddBlock])

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
  const bgVariant = resolveVariant(settings.canvasBg)

  // Resolve base hex color (custom or theme default)
  const baseHex = settings.canvasBgColor || (isDark ? '#ffffff' : '#000000')
  // Convert hex + opacity to rgba so pattern is subtle
  const opacity = (settings.canvasBgOpacity ?? 30) / 100
  function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '')
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const bgColor = hexToRgba(baseHex.startsWith('#') ? baseHex : '#888888', opacity)

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
        snapToGrid={settings.snapToGrid}
        snapGrid={[16, 16]}
      >
        {bgVariant !== undefined && (
          <Background
            variant={bgVariant}
            color={bgColor}
            gap={settings.canvasBg === 'cross' ? 32 : 24}
            size={settings.canvasBg === 'dots' ? 2.5 : settings.canvasBg === 'cross' ? 6 : 1.5}
          />
        )}
        <Controls showInteractive={false} position="bottom-right" />
        {settings.minimap && (
          <MiniMap
            position="bottom-left"
            nodeColor={isDark ? '#222' : '#e4e4e7'}
            maskColor={isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)'}
          />
        )}
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

export function DragCanvas({ onRegisterAddBlock }: { onRegisterAddBlock?: (fn: (type: BlockType) => void) => void } = {}) {
  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex">
        <BlockPalette />
        <FlowCanvas onRegisterAddBlock={onRegisterAddBlock} />
      </div>
    </ReactFlowProvider>
  )
}
