"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { GraphNode, GraphEdge } from "@/lib/ospf-types"
import { getAreaColor } from "@/lib/layout-engine"

interface TopologyCanvasProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  showLabels: boolean
  showMetrics: boolean
  colorBy: "area" | "lsa-type" | "role"
  zoom: number
  panX: number
  panY: number
  onSelectNode: (id: string | null) => void
  onSelectEdge: (id: string | null) => void
  onZoomChange: (zoom: number) => void
  onPanChange: (x: number, y: number) => void
}

const ROLE_COLORS: Record<string, string> = {
  internal: "#2dd4a0",
  abr: "#38bdf8",
  asbr: "#f97316",
}

// Status animation durations in ms
const NEW_GLOW_DURATION = 10000
const REMOVED_FADE_DURATION = 5000
const CHANGED_PULSE_DURATION = 8000

function getStatusAlpha(status: string | undefined, timestamp: number | undefined): number {
  if (!status || !timestamp || status === "stable") return 1
  const elapsed = Date.now() - timestamp
  if (status === "removed") {
    return Math.max(0, 1 - elapsed / REMOVED_FADE_DURATION)
  }
  return 1
}

function getGlowIntensity(status: string | undefined, timestamp: number | undefined): number {
  if (!status || !timestamp) return 0
  const elapsed = Date.now() - timestamp
  if (status === "new") {
    if (elapsed > NEW_GLOW_DURATION) return 0
    const decay = 1 - elapsed / NEW_GLOW_DURATION
    // Pulsing glow: base decay * sine pulse
    return decay * (0.5 + 0.5 * Math.sin(elapsed / 200))
  }
  if (status === "removed") {
    if (elapsed > REMOVED_FADE_DURATION) return 0
    // Fast flash then fade
    return (1 - elapsed / REMOVED_FADE_DURATION) * (0.5 + 0.5 * Math.sin(elapsed / 150))
  }
  if (status === "changed") {
    if (elapsed > CHANGED_PULSE_DURATION) return 0
    const decay = 1 - elapsed / CHANGED_PULSE_DURATION
    return decay * (0.4 + 0.6 * Math.sin(elapsed / 250))
  }
  return 0
}

function getStatusColor(status: string | undefined): string {
  if (status === "new") return "#34d399" // emerald
  if (status === "removed") return "#f87171" // red
  if (status === "changed") return "#fbbf24" // amber
  return ""
}

// Packet Tracer router icon (drawn with canvas paths)
function drawRouterIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, selected: boolean) {
  const s = size

  if (selected) {
    ctx.shadowColor = color
    ctx.shadowBlur = 24
  }

  // Router body - rounded rectangle
  ctx.fillStyle = "#141a22"
  ctx.strokeStyle = color
  ctx.lineWidth = selected ? 2.5 : 1.8
  ctx.beginPath()
  ctx.roundRect(x - s * 1.1, y - s * 0.65, s * 2.2, s * 1.3, 5)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  // Inner detail lines (like a real router face)
  ctx.strokeStyle = color + "50"
  ctx.lineWidth = 0.8

  // Horizontal divider
  ctx.beginPath()
  ctx.moveTo(x - s * 0.9, y + s * 0.15)
  ctx.lineTo(x + s * 0.9, y + s * 0.15)
  ctx.stroke()

  // Status LEDs
  const ledY = y + s * 0.35
  for (let i = 0; i < 3; i++) {
    const ledX = x - s * 0.5 + i * s * 0.35
    ctx.fillStyle = i === 0 ? color : color + "30"
    ctx.beginPath()
    ctx.arc(ledX, ledY, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Arrow icon in center (routing symbol)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(x - s * 0.45, y - s * 0.2)
  ctx.lineTo(x + s * 0.45, y - s * 0.2)
  ctx.stroke()
  // Right arrowhead
  ctx.beginPath()
  ctx.moveTo(x + s * 0.25, y - s * 0.35)
  ctx.lineTo(x + s * 0.45, y - s * 0.2)
  ctx.lineTo(x + s * 0.25, y - s * 0.05)
  ctx.stroke()
  // Left arrowhead
  ctx.beginPath()
  ctx.moveTo(x - s * 0.25, y - s * 0.35)
  ctx.lineTo(x - s * 0.45, y - s * 0.2)
  ctx.lineTo(x - s * 0.25, y - s * 0.05)
  ctx.stroke()

  // Port dots on sides
  ctx.fillStyle = color + "80"
  for (let i = 0; i < 2; i++) {
    ctx.beginPath()
    ctx.arc(x - s * 1.1, y - s * 0.25 + i * s * 0.5, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + s * 1.1, y - s * 0.25 + i * s * 0.5, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Packet Tracer switch/network icon
function drawNetworkIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, selected: boolean) {
  const s = size

  if (selected) {
    ctx.shadowColor = color
    ctx.shadowBlur = 24
  }

  // Switch body - trapezoid shape
  ctx.fillStyle = "#141a22"
  ctx.strokeStyle = color
  ctx.lineWidth = selected ? 2.5 : 1.8
  ctx.beginPath()
  ctx.moveTo(x - s * 0.9, y - s * 0.45)
  ctx.lineTo(x + s * 0.9, y - s * 0.45)
  ctx.lineTo(x + s * 1.1, y + s * 0.45)
  ctx.lineTo(x - s * 1.1, y + s * 0.45)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0

  // Arrow pattern inside (switch arrows)
  ctx.strokeStyle = color + "90"
  ctx.lineWidth = 1.3

  // 4 horizontal arrows
  const arrowY1 = y - s * 0.15
  const arrowY2 = y + s * 0.15
  // Right arrow top
  ctx.beginPath()
  ctx.moveTo(x - s * 0.5, arrowY1)
  ctx.lineTo(x + s * 0.5, arrowY1)
  ctx.moveTo(x + s * 0.3, arrowY1 - 4)
  ctx.lineTo(x + s * 0.5, arrowY1)
  ctx.lineTo(x + s * 0.3, arrowY1 + 4)
  ctx.stroke()
  // Left arrow bottom
  ctx.beginPath()
  ctx.moveTo(x + s * 0.5, arrowY2)
  ctx.lineTo(x - s * 0.5, arrowY2)
  ctx.moveTo(x - s * 0.3, arrowY2 - 4)
  ctx.lineTo(x - s * 0.5, arrowY2)
  ctx.lineTo(x - s * 0.3, arrowY2 + 4)
  ctx.stroke()
}

export function TopologyCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  showLabels,
  showMetrics,
  colorBy,
  zoom,
  panX,
  panY,
  onSelectNode,
  onSelectEdge,
  onZoomChange,
  onPanChange,
}: TopologyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [localNodes, setLocalNodes] = useState<GraphNode[]>(nodes)

  useEffect(() => {
    setLocalNodes(nodes)
  }, [nodes])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const getNodeColor = useCallback(
    (node: GraphNode): string => {
      if (colorBy === "area") return getAreaColor(node.area)
      if (colorBy === "role" && node.type === "router") {
        return ROLE_COLORS[node.role || "internal"] || "#94a3b8"
      }
      return getAreaColor(node.area)
    },
    [colorBy]
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    ctx.scale(dpr, dpr)

    // Background - Packet Tracer style light-gray grid on dark
    ctx.fillStyle = "#0d1117"
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    // Dot grid pattern (like Packet Tracer)
    const gridSize = 30
    ctx.fillStyle = "rgba(255,255,255,0.04)"
    const startX = -Math.ceil(panX / zoom / gridSize) * gridSize - gridSize
    const startY = -Math.ceil(panY / zoom / gridSize) * gridSize - gridSize
    const endX = startX + canvasSize.width / zoom + gridSize * 3
    const endY = startY + canvasSize.height / zoom + gridSize * 3
    for (let gx = startX; gx < endX; gx += gridSize) {
      for (let gy = startY; gy < endY; gy += gridSize) {
        ctx.beginPath()
        ctx.arc(gx, gy, 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw area backgrounds with Packet Tracer-like colored regions
    const areaGroups = new Map<string, GraphNode[]>()
    for (const node of localNodes) {
      if (!areaGroups.has(node.area)) areaGroups.set(node.area, [])
      areaGroups.get(node.area)!.push(node)
    }

    for (const [area, group] of areaGroups) {
      if (group.length < 1) continue
      const pad = 80
      const minX = Math.min(...group.map((n) => n.x)) - pad
      const minY = Math.min(...group.map((n) => n.y)) - pad
      const maxX = Math.max(...group.map((n) => n.x)) + pad
      const maxY = Math.max(...group.map((n) => n.y)) + pad

      const color = getAreaColor(area)

      // Filled region
      ctx.fillStyle = color + "0a"
      ctx.strokeStyle = color + "25"
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 4])
      const r = 16
      ctx.beginPath()
      ctx.moveTo(minX + r, minY)
      ctx.lineTo(maxX - r, minY)
      ctx.quadraticCurveTo(maxX, minY, maxX, minY + r)
      ctx.lineTo(maxX, maxY - r)
      ctx.quadraticCurveTo(maxX, maxY, maxX - r, maxY)
      ctx.lineTo(minX + r, maxY)
      ctx.quadraticCurveTo(minX, maxY, minX, maxY - r)
      ctx.lineTo(minX, minY + r)
      ctx.quadraticCurveTo(minX, minY, minX + r, minY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])

      // Area label at top-left
      ctx.fillStyle = color + "90"
      ctx.font = "bold 12px system-ui, sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "top"
      ctx.fillText(`Area ${area}`, minX + 10, minY + 8)
    }

    // Draw edges (cables)
    for (const edge of edges) {
      const sourceNode = localNodes.find((n) => n.id === edge.source)
      const targetNode = localNodes.find((n) => n.id === edge.target)
      if (!sourceNode || !targetNode) continue

      const isSelected = edge.id === selectedEdgeId
      const edgeColor = getAreaColor(edge.area)

      // Status-based rendering
      const edgeAlpha = getStatusAlpha(edge.status, edge.statusTimestamp)
      const edgeGlow = getGlowIntensity(edge.status, edge.statusTimestamp)
      const statusCol = getStatusColor(edge.status)

      ctx.save()
      ctx.globalAlpha = edgeAlpha

      // Status glow behind the edge
      if (edgeGlow > 0 && statusCol) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.x, sourceNode.y)
        ctx.lineTo(targetNode.x, targetNode.y)
        ctx.strokeStyle = statusCol
        ctx.lineWidth = 8 * edgeGlow + 3
        ctx.shadowColor = statusCol
        ctx.shadowBlur = 20 * edgeGlow
        ctx.setLineDash([])
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Cable line
      ctx.beginPath()
      ctx.moveTo(sourceNode.x, sourceNode.y)
      ctx.lineTo(targetNode.x, targetNode.y)

      // Dashed line style for new edges
      if (edge.status === "new" && edge.statusTimestamp) {
        const elapsed = Date.now() - edge.statusTimestamp
        if (elapsed < NEW_GLOW_DURATION) {
          const dashProgress = Math.min(1, elapsed / 3000)
          if (dashProgress < 1) {
            ctx.setLineDash([12 * dashProgress + 4, 8 * (1 - dashProgress)])
          } else {
            ctx.setLineDash([])
          }
        } else {
          ctx.setLineDash([])
        }
        ctx.lineWidth = isSelected ? 3 : 2
      } else if (edge.linkType === "point-to-point") {
        ctx.setLineDash([])
        ctx.lineWidth = isSelected ? 3 : 2
      } else if (edge.linkType === "transit") {
        ctx.setLineDash([8, 4])
        ctx.lineWidth = isSelected ? 3 : 2
      } else {
        ctx.setLineDash([3, 3])
        ctx.lineWidth = isSelected ? 2.5 : 1.5
      }

      if (isSelected) {
        ctx.strokeStyle = statusCol || edgeColor
        ctx.shadowColor = statusCol || edgeColor
        ctx.shadowBlur = 12
      } else {
        ctx.strokeStyle = statusCol ? statusCol + "cc" : edgeColor + "80"
        ctx.shadowBlur = 0
      }

      ctx.stroke()
      ctx.setLineDash([])
      ctx.shadowBlur = 0

      // Interface dots on each end of the cable
      const dx = targetNode.x - sourceNode.x
      const dy = targetNode.y - sourceNode.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        const nx = dx / len
        const ny = dy / len
        const srcEndX = sourceNode.x + nx * 30
        const srcEndY = sourceNode.y + ny * 30
        const tgtEndX = targetNode.x - nx * 30
        const tgtEndY = targetNode.y - ny * 30

        // Interface dots
        ctx.fillStyle = edgeColor
        ctx.beginPath()
        ctx.arc(srcEndX, srcEndY, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(tgtEndX, tgtEndY, 3, 0, Math.PI * 2)
        ctx.fill()

        // Interface IP label near source
        if (showMetrics && edge.interfaceInfo) {
          ctx.fillStyle = "#0d1117"
          ctx.strokeStyle = edgeColor + "40"
          ctx.lineWidth = 0.8
          const labelText = edge.interfaceInfo
          ctx.font = "9px monospace"
          const tw = ctx.measureText(labelText).width + 8
          const labelX = srcEndX + ny * 12
          const labelY = srcEndY - nx * 12
          ctx.beginPath()
          ctx.roundRect(labelX - tw / 2, labelY - 7, tw, 14, 3)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = edgeColor + "cc"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(labelText, labelX, labelY)
        }

        // Cost label in the middle
        if (showMetrics && edge.cost > 0) {
          const midX = (sourceNode.x + targetNode.x) / 2
          const midY = (sourceNode.y + targetNode.y) / 2
          // Show old -> new cost for changed edges
          const costText = edge.status === "changed" && edge.oldCost != null
            ? `${edge.oldCost} -> ${edge.cost}`
            : `cost: ${edge.cost}`
          ctx.font = "bold 10px monospace"
          const costW = ctx.measureText(costText).width + 12
          ctx.fillStyle = "#1a2233"
          ctx.strokeStyle = (statusCol || edgeColor) + "60"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(midX - costW / 2, midY - 9, costW, 18, 4)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = statusCol || edgeColor
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(costText, midX, midY)
        }
      }
      ctx.restore()
    }

    // Draw nodes
    for (const node of localNodes) {
      const isSelected = node.id === selectedNodeId
      const color = getNodeColor(node)
      const nodeSize = 20

      // Status-based rendering
      const nodeAlpha = getStatusAlpha(node.status, node.statusTimestamp)
      const nodeGlow = getGlowIntensity(node.status, node.statusTimestamp)
      const nodeStatusCol = getStatusColor(node.status)

      // Skip fully faded-out removed nodes
      if (nodeAlpha <= 0) continue

      ctx.save()
      ctx.globalAlpha = nodeAlpha

      // Glow aura behind the node
      if (nodeGlow > 0 && nodeStatusCol) {
        const glowRadius = 35 + 15 * nodeGlow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius)
        gradient.addColorStop(0, nodeStatusCol + Math.round(nodeGlow * 80).toString(16).padStart(2, "0"))
        gradient.addColorStop(1, nodeStatusCol + "00")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Status ring
      if (nodeStatusCol && nodeGlow > 0) {
        ctx.strokeStyle = nodeStatusCol
        ctx.lineWidth = 2
        ctx.shadowColor = nodeStatusCol
        ctx.shadowBlur = 12 * nodeGlow
        ctx.beginPath()
        ctx.arc(node.x, node.y, 32, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      const drawColor = nodeStatusCol && nodeGlow > 0.2 ? nodeStatusCol : color

      if (node.type === "router") {
        drawRouterIcon(ctx, node.x, node.y, nodeSize, drawColor, isSelected)

        // Role badge
        if (node.role && node.role !== "internal") {
          const badge = node.role.toUpperCase()
          ctx.font = "bold 9px system-ui, sans-serif"
          const badgeW = ctx.measureText(badge).width + 10
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.roundRect(node.x - badgeW / 2, node.y - nodeSize * 0.65 - 18, badgeW, 15, 3)
          ctx.fill()
          ctx.fillStyle = "#0d1117"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(badge, node.x, node.y - nodeSize * 0.65 - 10.5)
        }
      } else {
        drawNetworkIcon(ctx, node.x, node.y, nodeSize * 0.8, drawColor, isSelected)
      }

      // Status badge (NEW / DOWN / CHANGED)
      if (node.status && node.status !== "stable" && nodeGlow > 0.1) {
        const badgeText = node.status === "new" ? "NEW" : node.status === "removed" ? "DOWN" : "CHANGED"
        ctx.font = "bold 8px system-ui, sans-serif"
        const bw = ctx.measureText(badgeText).width + 8
        const bx = node.x + 24
        const by = node.y - 28
        ctx.fillStyle = nodeStatusCol || "#888"
        ctx.beginPath()
        ctx.roundRect(bx - bw / 2, by - 7, bw, 14, 3)
        ctx.fill()
        ctx.fillStyle = "#0d1117"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(badgeText, bx, by)
      }

      // Label below the icon
      if (showLabels) {
        ctx.font = "bold 11px monospace"
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        // Label background
        const labelText = node.label
        const lw = ctx.measureText(labelText).width + 8
        const ly = node.type === "router" ? node.y + nodeSize * 0.8 + 4 : node.y + nodeSize * 0.6 + 4
        ctx.fillStyle = "#0d1117cc"
        ctx.beginPath()
        ctx.roundRect(node.x - lw / 2, ly - 2, lw, 16, 3)
        ctx.fill()
        ctx.fillStyle = "#e2e8f0"
        ctx.fillText(labelText, node.x, ly)
      }

      ctx.restore() // restore node status alpha
    }

    ctx.restore() // restore main transform
  }, [localNodes, edges, selectedNodeId, selectedEdgeId, showLabels, showMetrics, colorBy, zoom, panX, panY, canvasSize, getNodeColor])

  useEffect(() => {
    draw()
  }, [draw])

  // Animation loop: re-draw when nodes/edges have active status animations
  useEffect(() => {
    let animFrameId: number | null = null
    const hasAnimations = localNodes.some(
      (n) => n.status && n.status !== "stable" && n.statusTimestamp
    ) || edges.some(
      (e) => e.status && e.status !== "stable" && e.statusTimestamp
    )

    if (hasAnimations) {
      const animate = () => {
        draw()
        animFrameId = requestAnimationFrame(animate)
      }
      animFrameId = requestAnimationFrame(animate)
    }

    return () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId)
    }
  }, [localNodes, edges, draw])

  const getNodeAt = useCallback(
    (clientX: number, clientY: number): GraphNode | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left - panX) / zoom
      const y = (clientY - rect.top - panY) / zoom

      for (const node of [...localNodes].reverse()) {
        const hitSize = node.type === "router" ? 28 : 22
        if (Math.abs(x - node.x) < hitSize && Math.abs(y - node.y) < hitSize) {
          return node
        }
      }
      return null
    },
    [localNodes, zoom, panX, panY]
  )

  const getEdgeAt = useCallback(
    (clientX: number, clientY: number): GraphEdge | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left - panX) / zoom
      const y = (clientY - rect.top - panY) / zoom

      for (const edge of edges) {
        const source = localNodes.find((n) => n.id === edge.source)
        const target = localNodes.find((n) => n.id === edge.target)
        if (!source || !target) continue

        const dx = target.x - source.x
        const dy = target.y - source.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) continue

        const t = Math.max(0, Math.min(1, ((x - source.x) * dx + (y - source.y) * dy) / (len * len)))
        const projX = source.x + t * dx
        const projY = source.y + t * dy
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2)
        if (dist < 10) return edge
      }
      return null
    },
    [localNodes, edges, zoom, panX, panY]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAt(e.clientX, e.clientY)
      if (node) {
        setDragNodeId(node.id)
        onSelectNode(node.id)
        onSelectEdge(null)
        return
      }

      const edge = getEdgeAt(e.clientX, e.clientY)
      if (edge) {
        onSelectEdge(edge.id)
        onSelectNode(null)
        return
      }

      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
      onSelectNode(null)
      onSelectEdge(null)
    },
    [getNodeAt, getEdgeAt, panX, panY, onSelectNode, onSelectEdge]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragNodeId) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left - panX) / zoom
        const y = (e.clientY - rect.top - panY) / zoom
        setLocalNodes((prev) =>
          prev.map((n) => (n.id === dragNodeId ? { ...n, x, y } : n))
        )
        return
      }
      if (isPanning) {
        onPanChange(e.clientX - panStart.x, e.clientY - panStart.y)
      }
    },
    [dragNodeId, isPanning, panStart, panX, panY, zoom, onPanChange]
  )

  const handleMouseUp = useCallback(() => {
    setDragNodeId(null)
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.2, Math.min(4, zoom * delta))
      onZoomChange(newZoom)
    },
    [zoom, onZoomChange]
  )

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-card rounded-lg border border-border"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block", cursor: dragNodeId ? "grabbing" : isPanning ? "grabbing" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1.5 border border-border">
        <button
          onClick={() => onZoomChange(Math.max(0.2, zoom - 0.2))}
          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm font-mono rounded hover:bg-secondary/50"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="text-xs text-muted-foreground font-mono min-w-[3.5rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(4, zoom + 0.2))}
          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm font-mono rounded hover:bg-secondary/50"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => { onZoomChange(1); onPanChange(0, 0) }}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-mono px-1 rounded hover:bg-secondary/50"
          aria-label="Reset view"
        >
          FIT
        </button>
      </div>
      {/* Empty state */}
      {localNodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-secondary/30 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
              <rect x="2" y="6" width="8" height="5" rx="1" />
              <rect x="14" y="6" width="8" height="5" rx="1" />
              <rect x="8" y="15" width="8" height="5" rx="1" />
              <path d="M10 8.5h4M6 11v5.5a1 1 0 001 1h1M18 11v5.5a1 1 0 01-1 1h-1" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-[240px] leading-relaxed">
            Paste OSPF LSA data in the left panel and click <strong className="text-foreground">Parse & Visualize</strong> to draw the network topology
          </p>
        </div>
      )}
    </div>
  )
}
