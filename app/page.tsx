"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { AppHeader } from "@/components/app-header"
import { InputPanel } from "@/components/input-panel"
import { TopologyCanvas } from "@/components/topology-canvas"
import { ControlPanel } from "@/components/control-panel"
import { DetailsPanel } from "@/components/details-panel"
import { parseOSPFData } from "@/lib/ospf-parser"
import { buildGraph } from "@/lib/layout-engine"
import { sampleOSPFData } from "@/lib/sample-data"
import { usePolling } from "@/lib/polling-client"
import { diffTopologies, applyNodeStatuses, applyEdgeStatuses } from "@/lib/topology-diff"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  OSPFTopology,
  GraphNode,
  GraphEdge,
  LayoutAlgorithm,
  LinkType,
  TopologyChange,
} from "@/lib/ospf-types"
import {
  PanelLeft,
  PanelRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function Page() {
  const [inputText, setInputText] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [topology, setTopology] = useState<OSPFTopology | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])

  const [layout, setLayout] = useState<LayoutAlgorithm>("force-directed")
  const [showLabels, setShowLabels] = useState(true)
  const [showMetrics, setShowMetrics] = useState(true)
  const [colorBy, setColorBy] = useState<"area" | "lsa-type" | "role">("area")
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [filterArea, setFilterArea] = useState<string | null>(null)
  const [filterLinkType, setFilterLinkType] = useState<LinkType | null>(null)

  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)

  // Real-time event log
  const [events, setEvents] = useState<TopologyChange[]>([])

  // Fire toast notifications for topology changes
  const notifyChanges = useCallback((changes: TopologyChange[]) => {
    for (const change of changes) {
      if (change.type === "router-added") {
        toast.success(change.description, {
          duration: 5000,
          style: { borderLeft: "3px solid #34d399" },
        })
      } else if (change.type === "router-removed") {
        toast.error(change.description, {
          duration: 5000,
          style: { borderLeft: "3px solid #f87171" },
        })
      } else if (change.type === "link-added") {
        toast.success(change.description, {
          duration: 4000,
          style: { borderLeft: "3px solid #34d399" },
        })
      } else if (change.type === "link-removed") {
        toast.error(change.description, {
          duration: 4000,
          style: { borderLeft: "3px solid #f87171" },
        })
      } else if (change.type === "metric-changed") {
        toast.warning(change.description, {
          duration: 4000,
          style: { borderLeft: "3px solid #fbbf24" },
        })
      } else if (change.type === "area-changed") {
        toast.info(change.description, {
          duration: 4000,
          style: { borderLeft: "3px solid #38bdf8" },
        })
      }
    }
  }, [])

  // Handle topology update from polling
  const handlePollingUpdate = useCallback(
    (newTopo: OSPFTopology, changes: TopologyChange[]) => {
      const graph = buildGraph(newTopo, layout, 900, 600)

      if (changes.length > 0) {
        const annotatedNodes = applyNodeStatuses(graph.nodes, changes, nodes)
        const annotatedEdges = applyEdgeStatuses(graph.edges, changes, edges)
        setNodes(annotatedNodes)
        setEdges(annotatedEdges)
        setEvents((prev) => [...prev, ...changes])
        notifyChanges(changes)
      } else {
        setNodes(graph.nodes)
        setEdges(graph.edges)
      }

      setTopology(newTopo)
    },
    [layout, nodes, edges, notifyChanges]
  )

  const { pollingState, startPolling, stopPolling, setInterval: setPollingInterval } =
    usePolling({
      onTopologyUpdate: handlePollingUpdate,
      currentTopology: topology,
    })

  // Auto-load sample data on first render
  useEffect(() => {
    try {
      const parsed = parseOSPFData(sampleOSPFData)
      if (parsed.routers.length > 0 || parsed.networks.length > 0) {
        setInputText(sampleOSPFData)
        setTopology(parsed)
        const graph = buildGraph(parsed, "force-directed", 900, 600)
        setNodes(graph.nodes)
        setEdges(graph.edges)
      }
    } catch {
      // Silently fail
    }
  }, [])

  const areas = useMemo(() => topology?.areas || [], [topology])

  const filteredNodes = useMemo(() => {
    let filtered = nodes
    if (filterArea) {
      filtered = filtered.filter((n) => n.area === filterArea)
    }
    return filtered
  }, [nodes, filterArea])

  const filteredEdges = useMemo(() => {
    let filtered = edges
    if (filterArea) {
      const nodeIds = new Set(filteredNodes.map((n) => n.id))
      filtered = filtered.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      )
    }
    if (filterLinkType) {
      filtered = filtered.filter((e) => e.linkType === filterLinkType)
    }
    return filtered
  }, [edges, filteredNodes, filterArea, filterLinkType])

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? filteredNodes.find((n) => n.id === selectedNodeId) || null
        : null,
    [selectedNodeId, filteredNodes]
  )

  const selectedEdge = useMemo(
    () =>
      selectedEdgeId
        ? filteredEdges.find((e) => e.id === selectedEdgeId) || null
        : null,
    [selectedEdgeId, filteredEdges]
  )

  const handleParse = useCallback(() => {
    setIsParsing(true)
    setParseError(null)

    try {
      const parsed = parseOSPFData(inputText)
      if (parsed.routers.length === 0 && parsed.networks.length === 0) {
        setParseError(
          "No OSPF data found. Make sure the input contains valid OSPF LSA data."
        )
        setIsParsing(false)
        return
      }

      // Diff against previous topology
      if (topology) {
        const changes = diffTopologies(topology, parsed)
        if (changes.length > 0) {
          const graph = buildGraph(parsed, layout, 900, 600)
          const annotatedNodes = applyNodeStatuses(graph.nodes, changes, nodes)
          const annotatedEdges = applyEdgeStatuses(graph.edges, changes, edges)
          setNodes(annotatedNodes)
          setEdges(annotatedEdges)
          setEvents((prev) => [...prev, ...changes])
          notifyChanges(changes)
          setTopology(parsed)
          setIsParsing(false)
          return
        }
      }

      setTopology(parsed)
      const graph = buildGraph(parsed, layout, 900, 600)
      setNodes(graph.nodes)
      setEdges(graph.edges)
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setZoom(1)
      setPanX(0)
      setPanY(0)
      setFilterArea(null)
      setFilterLinkType(null)
    } catch {
      setParseError(
        "Failed to parse OSPF data. Please check the input format."
      )
    }

    setIsParsing(false)
  }, [inputText, layout, topology, nodes, edges, notifyChanges])

  const handleLayoutChange = useCallback(
    (newLayout: LayoutAlgorithm) => {
      setLayout(newLayout)
      if (topology) {
        const graph = buildGraph(topology, newLayout, 900, 600)
        setNodes(graph.nodes)
        setEdges(graph.edges)
      }
    },
    [topology]
  )

  const handleLoadSample = useCallback(() => {
    setInputText(sampleOSPFData)
    setParseError(null)

    try {
      const parsed = parseOSPFData(sampleOSPFData)
      if (parsed.routers.length === 0 && parsed.networks.length === 0) {
        setParseError("No OSPF data found in sample.")
        return
      }
      setTopology(parsed)
      const graph = buildGraph(parsed, layout, 900, 600)
      setNodes(graph.nodes)
      setEdges(graph.edges)
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setZoom(1)
      setPanX(0)
      setPanY(0)
      setFilterArea(null)
      setFilterLinkType(null)
    } catch {
      setParseError("Failed to parse sample data.")
    }
  }, [layout])

  const handleClear = useCallback(() => {
    setInputText("")
    setTopology(null)
    setNodes([])
    setEdges([])
    setParseError(null)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setEvents([])
  }, [])

  // Simulate random topology change for demo purposes
  const handleSimulateChange = useCallback(() => {
    if (!topology || topology.routers.length === 0) {
      toast.error("Load OSPF data first before simulating changes.")
      return
    }

    const simType = Math.random()
    const now = Date.now()

    if (simType < 0.35) {
      // Simulate a new router coming online
      const newId = `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      const area = topology.areas[Math.floor(Math.random() * topology.areas.length)] || "0"
      const changes: TopologyChange[] = [
        {
          id: `sim-${now}`,
          type: "router-added",
          routerId: newId,
          description: `Router ${newId} came online (Area ${area})`,
          timestamp: now,
        },
      ]

      // Add node to graph
      const newNode: GraphNode = {
        id: newId,
        type: "router",
        label: newId,
        role: "internal",
        area,
        x: 200 + Math.random() * 500,
        y: 150 + Math.random() * 300,
        data: {
          id: newId,
          routerId: newId,
          role: "internal",
          area,
          lsaTypes: ["Router LSA (Type 1)"],
          neighbors: [],
          networks: [],
        },
        status: "new",
        statusTimestamp: now,
      }

      // Connect to a random existing router
      const existingRouter =
        topology.routers[Math.floor(Math.random() * topology.routers.length)]
      const newEdge: GraphEdge = {
        id: `link-sim-${now}`,
        source: newId,
        target: existingRouter.routerId,
        cost: Math.floor(Math.random() * 50) + 1,
        linkType: "point-to-point",
        area,
        status: "new",
        statusTimestamp: now,
      }

      changes.push({
        id: `sim-link-${now}`,
        type: "link-added",
        linkId: newEdge.id,
        description: `Link ${newId} <-> ${existingRouter.routerId} established (cost: ${newEdge.cost})`,
        timestamp: now,
      })

      setNodes((prev) => [...prev, newNode])
      setEdges((prev) => [...prev, newEdge])
      setEvents((prev) => [...prev, ...changes])
      notifyChanges(changes)
    } else if (simType < 0.65) {
      // Simulate a router going offline
      const routerToRemove =
        topology.routers[Math.floor(Math.random() * topology.routers.length)]
      const changes: TopologyChange[] = [
        {
          id: `sim-${now}`,
          type: "router-removed",
          routerId: routerToRemove.routerId,
          description: `Router ${routerToRemove.routerId} went offline`,
          timestamp: now,
        },
      ]

      setNodes((prev) =>
        prev.map((n) =>
          n.id === routerToRemove.routerId
            ? { ...n, status: "removed" as const, statusTimestamp: now }
            : n
        )
      )
      setEdges((prev) =>
        prev.map((e) =>
          e.source === routerToRemove.routerId ||
          e.target === routerToRemove.routerId
            ? { ...e, status: "removed" as const, statusTimestamp: now }
            : e
        )
      )
      setEvents((prev) => [...prev, ...changes])
      notifyChanges(changes)
    } else {
      // Simulate a metric change
      if (edges.length > 0) {
        const edgeToChange = edges[Math.floor(Math.random() * edges.length)]
        const oldCost = edgeToChange.cost
        const newCost = Math.floor(Math.random() * 100) + 1
        const changes: TopologyChange[] = [
          {
            id: `sim-${now}`,
            type: "metric-changed",
            linkId: edgeToChange.id,
            description: `Link ${edgeToChange.source} <-> ${edgeToChange.target} cost changed: ${oldCost} -> ${newCost}`,
            oldValue: oldCost,
            newValue: newCost,
            timestamp: now,
          },
        ]

        setEdges((prev) =>
          prev.map((e) =>
            e.id === edgeToChange.id
              ? {
                  ...e,
                  cost: newCost,
                  oldCost,
                  status: "changed" as const,
                  statusTimestamp: now,
                }
              : e
          )
        )
        setEvents((prev) => [...prev, ...changes])
        notifyChanges(changes)
      }
    }
  }, [topology, edges, notifyChanges])

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "ospf-topology.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [])

  const handlePanChange = useCallback((x: number, y: number) => {
    setPanX(x)
    setPanY(y)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <AppHeader pollingState={pollingState} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Input */}
        <div
          className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${
            showLeftPanel ? "w-80" : "w-0"
          } overflow-hidden shrink-0`}
        >
          {showLeftPanel && (
            <ScrollArea className="flex-1">
              <InputPanel
                value={inputText}
                onChange={setInputText}
                onParse={handleParse}
                onLoadSample={handleLoadSample}
                onClear={handleClear}
                isParsing={isParsing}
                parseError={parseError}
              />
            </ScrollArea>
          )}
        </div>

        {/* Left panel toggle */}
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className="flex items-center justify-center w-5 shrink-0 border-r border-border bg-card hover:bg-secondary/50 transition-colors"
          aria-label={showLeftPanel ? "Hide input panel" : "Show input panel"}
        >
          {showLeftPanel ? (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          ) : (
            <PanelLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col p-2 gap-2 min-w-0">
          <TopologyCanvas
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            showLabels={showLabels}
            showMetrics={showMetrics}
            colorBy={colorBy}
            zoom={zoom}
            panX={panX}
            panY={panY}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            onZoomChange={setZoom}
            onPanChange={handlePanChange}
          />
        </div>

        {/* Right panel toggle */}
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="flex items-center justify-center w-5 shrink-0 border-l border-border bg-card hover:bg-secondary/50 transition-colors"
          aria-label={
            showRightPanel ? "Hide control panel" : "Show control panel"
          }
        >
          {showRightPanel ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <PanelRight className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        {/* Right panel - Controls + Details */}
        <div
          className={`flex border-l border-border bg-card transition-all duration-200 ${
            showRightPanel ? "w-72" : "w-0"
          } overflow-hidden shrink-0`}
        >
          {showRightPanel && (
            <div className="flex flex-col w-72">
              {(selectedNode || selectedEdge) && (
                <div className="border-b border-border h-[300px] shrink-0">
                  <DetailsPanel
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    nodes={filteredNodes}
                    onClose={handleCloseDetails}
                  />
                </div>
              )}
              <ScrollArea className="flex-1">
                <ControlPanel
                  layout={layout}
                  showLabels={showLabels}
                  showMetrics={showMetrics}
                  colorBy={colorBy}
                  areas={areas}
                  filterArea={filterArea}
                  filterLinkType={filterLinkType}
                  onLayoutChange={handleLayoutChange}
                  onShowLabelsChange={setShowLabels}
                  onShowMetricsChange={setShowMetrics}
                  onColorByChange={setColorBy}
                  onFilterAreaChange={setFilterArea}
                  onFilterLinkTypeChange={setFilterLinkType}
                  onExportPNG={handleExportPNG}
                  onResetView={handleResetView}
                  nodeCount={filteredNodes.length}
                  edgeCount={filteredEdges.length}
                  pollingState={pollingState}
                  onStartPolling={startPolling}
                  onStopPolling={stopPolling}
                  onSetPollingInterval={setPollingInterval}
                  onSimulateChange={handleSimulateChange}
                  events={events}
                />
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
