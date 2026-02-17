import type { GraphNode, GraphEdge, LayoutAlgorithm, OSPFTopology } from "./ospf-types"

const AREA_COLORS: Record<string, string> = {
  "0": "#2dd4a0",
  "1": "#38bdf8",
  "2": "#f97316",
  "3": "#e879f9",
  "4": "#facc15",
}

export function getAreaColor(area: string): string {
  return AREA_COLORS[area] || "#94a3b8"
}

export function buildGraph(
  topology: OSPFTopology,
  layout: LayoutAlgorithm,
  width: number,
  height: number
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

  // Apply layout
  applyLayout(nodes, edges, layout, width, height)

  return { nodes, edges }
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

function forceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
) {
  const centerX = width / 2
  const centerY = height / 2

  // Initialize with circular positions
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const radius = Math.min(width, height) * 0.3
    node.x = centerX + radius * Math.cos(angle)
    node.y = centerY + radius * Math.sin(angle)
  })

  // Simple force simulation
  const iterations = 120
  const repulsion = 8000
  const attraction = 0.005
  const damping = 0.92

  const velocities = nodes.map(() => ({ vx: 0, vy: 0 }))

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        velocities[i].vx += fx
        velocities[i].vy += fy
        velocities[j].vx -= fx
        velocities[j].vy -= fy
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const si = nodes.findIndex((n) => n.id === edge.source)
      const ti = nodes.findIndex((n) => n.id === edge.target)
      if (si === -1 || ti === -1) continue
      const dx = nodes[ti].x - nodes[si].x
      const dy = nodes[ti].y - nodes[si].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = dist * attraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      velocities[si].vx += fx
      velocities[si].vy += fy
      velocities[ti].vx -= fx
      velocities[ti].vy -= fy
    }

    // Center gravity
    for (let i = 0; i < nodes.length; i++) {
      velocities[i].vx += (centerX - nodes[i].x) * 0.001
      velocities[i].vy += (centerY - nodes[i].y) * 0.001
    }

    // Apply velocities
    for (let i = 0; i < nodes.length; i++) {
      velocities[i].vx *= damping
      velocities[i].vy *= damping
      nodes[i].x += velocities[i].vx
      nodes[i].y += velocities[i].vy
      // Clamp
      nodes[i].x = Math.max(60, Math.min(width - 60, nodes[i].x))
      nodes[i].y = Math.max(60, Math.min(height - 60, nodes[i].y))
    }
  }
}

function hierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
) {
  // Group by area
  const areaGroups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    const area = node.area
    if (!areaGroups.has(area)) areaGroups.set(area, [])
    areaGroups.get(area)!.push(node)
  }

  const areas = Array.from(areaGroups.keys()).sort()
  const layerHeight = height / (areas.length + 1)

  areas.forEach((area, areaIndex) => {
    const group = areaGroups.get(area)!
    const y = layerHeight * (areaIndex + 1)
    const spacing = width / (group.length + 1)
    group.forEach((node, nodeIndex) => {
      node.x = spacing * (nodeIndex + 1)
      node.y = y
    })
  })
}

function radialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
) {
  const centerX = width / 2
  const centerY = height / 2

  // Group by area
  const areaGroups = new Map<string, GraphNode[]>()
  for (const node of nodes) {
    if (!areaGroups.has(node.area)) areaGroups.set(node.area, [])
    areaGroups.get(node.area)!.push(node)
  }

  const areas = Array.from(areaGroups.keys()).sort()
  const areaAngleStep = (2 * Math.PI) / Math.max(areas.length, 1)

  areas.forEach((area, areaIndex) => {
    const group = areaGroups.get(area)!
    const baseAngle = areaAngleStep * areaIndex
    const radius = Math.min(width, height) * 0.3

    if (area === "0") {
      // Backbone area nodes go in center ring
      const innerRadius = Math.min(width, height) * 0.15
      group.forEach((node, ni) => {
        const angle = (2 * Math.PI * ni) / group.length
        node.x = centerX + innerRadius * Math.cos(angle)
        node.y = centerY + innerRadius * Math.sin(angle)
      })
    } else {
      const spreadAngle = areaAngleStep * 0.6
      group.forEach((node, ni) => {
        const angle = baseAngle - spreadAngle / 2 + (spreadAngle * ni) / Math.max(group.length - 1, 1)
        node.x = centerX + radius * Math.cos(angle)
        node.y = centerY + radius * Math.sin(angle)
      })
    }
  })
}
