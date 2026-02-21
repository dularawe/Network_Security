import type { GraphNode, GraphEdge, LayoutAlgorithm, OSPFTopology } from "./ospf-types"

const AREA_COLORS: Record<string, string> = {
  "0": "#2dd4a0",
  "1": "#38bdf8",
  "2": "#f97316",
  "3": "#e879f9",
  "4": "#facc15",
  "5": "#fb923c",
  "6": "#a78bfa",
  "7": "#f472b6",
}

export function getAreaColor(area: string): string {
  // Support many areas by hashing the area number
  if (AREA_COLORS[area]) return AREA_COLORS[area]
  const num = parseInt(area, 10) || 0
  const hue = (num * 47 + 30) % 360
  return `hsl(${hue}, 65%, 55%)`
}

// Compute a layout size that grows with node count so nodes never overlap
function computeLayoutSize(nodeCount: number, baseWidth: number, baseHeight: number) {
  // For small topologies, use the viewport. For large ones, grow.
  // ~120px per node in grid terms, but at least the canvas viewport
  const minArea = baseWidth * baseHeight
  const desiredArea = Math.max(minArea, nodeCount * 150 * 150)
  const aspect = baseWidth / baseHeight
  const h = Math.sqrt(desiredArea / aspect)
  const w = h * aspect
  return { width: Math.ceil(w), height: Math.ceil(h) }
}

export function buildGraph(
  topology: OSPFTopology,
  layout: LayoutAlgorithm,
  viewportWidth: number,
  viewportHeight: number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Create router nodes
  for (const router of topology.routers) {
    nodes.push({
      id: router.id,
      type: "router",
      label: router.routerId,
      role: router.role,
      area: router.area,
      x: 0,
      y: 0,
      data: router,
    })
  }

  // Create network nodes
  for (const network of topology.networks) {
    nodes.push({
      id: network.id,
      type: "network",
      label: network.networkAddress,
      area: network.area,
      x: 0,
      y: 0,
      data: network,
    })
  }

  // Create edges
  for (const link of topology.links) {
    edges.push({
      id: link.id,
      source: link.source,
      target: link.target,
      cost: link.cost,
      linkType: link.linkType,
      area: link.area,
      interfaceInfo: link.interfaceInfo,
    })
  }

  // Compute scaled layout size
  const { width, height } = computeLayoutSize(nodes.length, viewportWidth, viewportHeight)

  // Apply layout
  applyLayout(nodes, edges, layout, width, height)

  return { nodes, edges }
}

// Returns the zoom and pan needed to fit all nodes into the viewport
export function computeAutoFit(
  nodes: GraphNode[],
  viewportWidth: number,
  viewportHeight: number
): { zoom: number; panX: number; panY: number } {
  if (nodes.length === 0) return { zoom: 1, panX: 0, panY: 0 }

  const padding = 80
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x > maxX) maxX = n.x
    if (n.y > maxY) maxY = n.y
  }

  const contentW = maxX - minX + padding * 2
  const contentH = maxY - minY + padding * 2

  if (contentW <= 0 || contentH <= 0) return { zoom: 1, panX: 0, panY: 0 }

  const zoom = Math.min(
    viewportWidth / contentW,
    viewportHeight / contentH,
    1.5 // don't zoom in too much on small topologies
  )

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const panX = viewportWidth / 2 - centerX * zoom
  const panY = viewportHeight / 2 - centerY * zoom

  return { zoom: Math.max(0.05, zoom), panX, panY }
}

function applyLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layout: LayoutAlgorithm,
  width: number,
  height: number
) {
  switch (layout) {
    case "force-directed":
      forceDirectedLayout(nodes, edges, width, height)
      break
    case "hierarchical":
      hierarchicalLayout(nodes, edges, width, height)
      break
    case "radial":
      radialLayout(nodes, edges, width, height)
      break
  }
}

// ───────────── Force-Directed Layout ─────────────
function forceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
) {
  if (nodes.length === 0) return

  const centerX = width / 2
  const centerY = height / 2
  const n = nodes.length

  // Scale the initial radius and repulsion based on node count
  const initRadius = Math.min(width, height) * 0.4
  const nodeSpacing = Math.max(120, 800 / Math.sqrt(n))

  // Initialize with area-grouped circular positions
  const areaGroups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    if (!areaGroups.has(node.area)) areaGroups.set(node.area, [])
    areaGroups.get(node.area)!.push(node)
  }

  const areas = Array.from(areaGroups.keys()).sort()
  const areaAngle = (2 * Math.PI) / Math.max(areas.length, 1)

  areas.forEach((area, ai) => {
    const group = areaGroups.get(area)!
    const baseAngle = areaAngle * ai
    const areaRadius = initRadius * (area === "0" ? 0.3 : 0.85)
    const areaCenterX = centerX + (area === "0" ? 0 : areaRadius * Math.cos(baseAngle))
    const areaCenterY = centerY + (area === "0" ? 0 : areaRadius * Math.sin(baseAngle))

    group.forEach((node, ni) => {
      const a = (2 * Math.PI * ni) / group.length
      const r = Math.min(nodeSpacing * Math.sqrt(group.length) * 0.4, initRadius * 0.3)
      node.x = areaCenterX + r * Math.cos(a)
      node.y = areaCenterY + r * Math.sin(a)
    })
  })

  // Build adjacency index for O(E) edge lookups
  const adj = new Map<number, number[]>()
  for (const edge of edges) {
    const si = nodes.findIndex((nd) => nd.id === edge.source)
    const ti = nodes.findIndex((nd) => nd.id === edge.target)
    if (si === -1 || ti === -1) continue
    if (!adj.has(si)) adj.set(si, [])
    if (!adj.has(ti)) adj.set(ti, [])
    adj.get(si)!.push(ti)
    adj.get(ti)!.push(si)
  }

  // Scaled force parameters
  const repulsion = Math.max(12000, n * 300)
  const attraction = 0.003
  const areaGravity = 0.0005 // pull same-area nodes together
  const iterations = Math.min(200, 80 + n * 2)
  const damping = 0.9
  const minDist = nodeSpacing * 0.5 // minimum distance to prevent overlap

  const vx = new Float64Array(n)
  const vy = new Float64Array(n)

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations // cooling

    // Repulsion: O(n^2) but with early cutoff for distant nodes
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const distSq = dx * dx + dy * dy
        const dist = Math.sqrt(distSq) || 0.1

        // Extra strong repulsion when too close
        let force: number
        if (dist < minDist) {
          force = repulsion * 3 / (dist * dist + 1)
        } else {
          force = repulsion / (distSq + 1)
        }

        // Same area: reduce repulsion slightly so they cluster
        if (nodes[i].area === nodes[j].area) {
          force *= 0.6
        }

        const fx = (dx / dist) * force * temp
        const fy = (dy / dist) * force * temp
        vx[i] += fx
        vy[i] += fy
        vx[j] -= fx
        vy[j] -= fy
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const si = nodes.findIndex((nd) => nd.id === edge.source)
      const ti = nodes.findIndex((nd) => nd.id === edge.target)
      if (si === -1 || ti === -1) continue

      const dx = nodes[ti].x - nodes[si].x
      const dy = nodes[ti].y - nodes[si].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1

      // Ideal spring length based on node count
      const idealLen = nodeSpacing
      const displacement = dist - idealLen
      const force = displacement * attraction * temp

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      vx[si] += fx
      vy[si] += fy
      vx[ti] -= fx
      vy[ti] -= fy
    }

    // Area gravity: pull nodes toward their area centroid
    for (const [, group] of areaGroups) {
      let cx = 0, cy = 0
      for (const node of group) { cx += node.x; cy += node.y }
      cx /= group.length
      cy /= group.length

      for (const node of group) {
        const idx = nodes.indexOf(node)
        vx[idx] += (cx - node.x) * areaGravity * temp
        vy[idx] += (cy - node.y) * areaGravity * temp
      }
    }

    // Gentle center gravity
    for (let i = 0; i < n; i++) {
      vx[i] += (centerX - nodes[i].x) * 0.0003 * temp
      vy[i] += (centerY - nodes[i].y) * 0.0003 * temp
    }

    // Apply velocities with damping
    for (let i = 0; i < n; i++) {
      vx[i] *= damping
      vy[i] *= damping

      // Limit max velocity
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i])
      const maxSpeed = 50 * temp + 5
      if (speed > maxSpeed) {
        vx[i] = (vx[i] / speed) * maxSpeed
        vy[i] = (vy[i] / speed) * maxSpeed
      }

      nodes[i].x += vx[i]
      nodes[i].y += vy[i]

      // Soft bounds: large margins to prevent edge clipping
      const margin = 60
      nodes[i].x = Math.max(margin, Math.min(width - margin, nodes[i].x))
      nodes[i].y = Math.max(margin, Math.min(height - margin, nodes[i].y))
    }
  }

  // Post-process: resolve remaining overlaps with a few jitter passes
  resolveOverlaps(nodes, minDist, 5)
}

// Push overlapping nodes apart
function resolveOverlaps(nodes: GraphNode[], minDist: number, passes: number) {
  for (let p = 0; p < passes; p++) {
    let moved = false
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x
        const dy = nodes[j].y - nodes[i].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          nodes[i].x -= nx * overlap
          nodes[i].y -= ny * overlap
          nodes[j].x += nx * overlap
          nodes[j].y += ny * overlap
          moved = true
        } else if (dist === 0) {
          // Identical positions: jitter
          nodes[j].x += (Math.random() - 0.5) * minDist
          nodes[j].y += (Math.random() - 0.5) * minDist
          moved = true
        }
      }
    }
    if (!moved) break
  }
}

// ───────────── Hierarchical (Grid-by-Area) Layout ─────────────
function hierarchicalLayout(
  nodes: GraphNode[],
  _edges: GraphEdge[],
  width: number,
  height: number
) {
  if (nodes.length === 0) return

  // Group by area, sort areas with "0" (backbone) first
  const areaGroups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    if (!areaGroups.has(node.area)) areaGroups.set(node.area, [])
    areaGroups.get(node.area)!.push(node)
  }

  const areas = Array.from(areaGroups.keys()).sort((a, b) => {
    if (a === "0") return -1
    if (b === "0") return 1
    return a.localeCompare(b)
  })

  // Within each area, place nodes in a grid with generous spacing
  const cellW = 150
  const cellH = 130
  const areaPadding = 60
  const areaGap = 80

  let currentY = areaPadding

  for (const area of areas) {
    const group = areaGroups.get(area)!
    // Determine grid columns to fit width, min 2
    const cols = Math.max(2, Math.min(Math.floor((width - areaPadding * 2) / cellW), Math.ceil(Math.sqrt(group.length * 1.5))))
    const rows = Math.ceil(group.length / cols)

    const gridW = cols * cellW
    const startX = (width - gridW) / 2 + cellW / 2

    group.forEach((node, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      node.x = startX + col * cellW
      node.y = currentY + row * cellH
    })

    currentY += rows * cellH + areaGap
  }

  // Center vertically if it fits
  const totalH = currentY - areaGap + areaPadding
  if (totalH < height) {
    const offsetY = (height - totalH) / 2
    for (const node of nodes) {
      node.y += offsetY
    }
  }
}

// ───────────── Radial Layout ─────────────
function radialLayout(
  nodes: GraphNode[],
  _edges: GraphEdge[],
  width: number,
  height: number
) {
  if (nodes.length === 0) return

  const centerX = width / 2
  const centerY = height / 2

  // Group by area
  const areaGroups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    if (!areaGroups.has(node.area)) areaGroups.set(node.area, [])
    areaGroups.get(node.area)!.push(node)
  }

  const areas = Array.from(areaGroups.keys()).sort()
  const nonBackbone = areas.filter((a) => a !== "0")
  const backbone = areaGroups.get("0") || []

  // Place backbone nodes in the inner ring
  const innerRadius = Math.max(100, Math.min(width, height) * 0.12 + backbone.length * 15)
  backbone.forEach((node, ni) => {
    const a = (2 * Math.PI * ni) / Math.max(backbone.length, 1)
    node.x = centerX + innerRadius * Math.cos(a)
    node.y = centerY + innerRadius * Math.sin(a)
  })

  // Place other areas in outer ring sectors
  if (nonBackbone.length > 0) {
    const sectorAngle = (2 * Math.PI) / nonBackbone.length

    nonBackbone.forEach((area, ai) => {
      const group = areaGroups.get(area)!
      const baseAngle = sectorAngle * ai - Math.PI / 2

      // Multiple rings if many nodes in one area
      const nodesPerRing = Math.max(6, Math.ceil(Math.sqrt(group.length) * 3))
      const ringCount = Math.ceil(group.length / nodesPerRing)

      group.forEach((node, ni) => {
        const ringIdx = Math.floor(ni / nodesPerRing)
        const posInRing = ni % nodesPerRing
        const ringTotal = Math.min(nodesPerRing, group.length - ringIdx * nodesPerRing)

        const outerRadius = innerRadius + 120 + ringIdx * 100
        const spreadAngle = sectorAngle * 0.75
        const startAngle = baseAngle - spreadAngle / 2
        const a = startAngle + (spreadAngle * (posInRing + 0.5)) / ringTotal

        node.x = centerX + outerRadius * Math.cos(a)
        node.y = centerY + outerRadius * Math.sin(a)
      })
    })
  }
}
