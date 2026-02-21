"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Search, X, Router, Globe, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { GraphNode } from "@/lib/ospf-types"

interface SearchResult {
  node: GraphNode
  matchField: string
  matchValue: string
}

interface TopologySearchProps {
  nodes: GraphNode[]
  onSelectNode: (nodeId: string) => void
  onFocusNode: (nodeId: string) => void
}

export function TopologySearch({ nodes, onSelectNode, onFocusNode }: TopologySearchProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim()
    if (!q || q.length < 1) return []

    const matches: SearchResult[] = []

    for (const node of nodes) {
      // Match router ID / label
      if (node.label.toLowerCase().includes(q)) {
        matches.push({ node, matchField: "Router ID", matchValue: node.label })
      }
      // Match area
      else if (node.area.toLowerCase().includes(q)) {
        matches.push({ node, matchField: "Area", matchValue: `Area ${node.area}` })
      }
      // Match role
      else if (node.role && node.role.toLowerCase().includes(q)) {
        matches.push({ node, matchField: "Role", matchValue: node.role.toUpperCase() })
      }
      // Match type
      else if (node.type.toLowerCase().includes(q)) {
        matches.push({ node, matchField: "Type", matchValue: node.type })
      }
      // Match status
      else if (node.status && node.status.toLowerCase().includes(q)) {
        matches.push({ node, matchField: "Status", matchValue: node.status })
      }
    }

    return matches.slice(0, 20)
  }, [query, nodes])

  const handleSelect = useCallback(
    (nodeId: string) => {
      onSelectNode(nodeId)
      onFocusNode(nodeId)
      setIsOpen(false)
      setQuery("")
    },
    [onSelectNode, onFocusNode]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && results[highlightIndex]) {
        e.preventDefault()
        handleSelect(results[highlightIndex].node.id)
      } else if (e.key === "Escape") {
        setIsOpen(false)
        setQuery("")
        inputRef.current?.blur()
      }
    },
    [results, highlightIndex, handleSelect]
  )

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Reset highlight on query change
  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

  const getNodeIcon = (type: string, role?: string) => {
    if (type === "network") return <Globe className="h-3.5 w-3.5 text-accent" />
    if (role === "abr") return <Router className="h-3.5 w-3.5 text-[#38bdf8]" />
    if (role === "asbr") return <Router className="h-3.5 w-3.5 text-[#f97316]" />
    return <Router className="h-3.5 w-3.5 text-primary" />
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search routers, areas, roles..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (query.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="h-9 bg-secondary/50 border-border pl-9 pr-8 text-sm placeholder:text-muted-foreground/50"
          aria-label="Search topology"
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-autocomplete="list"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-border bg-card shadow-xl shadow-black/30"
          role="listbox"
        >
          {results.map((result, idx) => (
            <button
              key={result.node.id + result.matchField}
              onClick={() => handleSelect(result.node.id)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                idx === highlightIndex
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground/80 hover:bg-secondary/50"
              }`}
              role="option"
              aria-selected={idx === highlightIndex}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary">
                {getNodeIcon(result.node.type, result.node.role)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium truncate">
                    {result.node.label}
                  </span>
                  {result.node.role && (
                    <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {result.node.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-[11px] text-muted-foreground">
                    Area {result.node.area}
                  </span>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="text-[11px] text-muted-foreground">
                    {result.matchField}: {result.matchValue}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results state */}
      {isOpen && query.length >= 1 && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card p-4 shadow-xl shadow-black/30"
        >
          <p className="text-center text-sm text-muted-foreground">
            No devices matching &ldquo;{query}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
