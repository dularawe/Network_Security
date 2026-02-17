"use client"

import { Network } from "lucide-react"
import { LiveIndicator } from "@/components/live-indicator"
import type { PollingState } from "@/lib/ospf-types"

interface AppHeaderProps {
  pollingState: PollingState
}

export function AppHeader({ pollingState }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-card">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
          <Network className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">
            OSPF Topology Visualizer
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Interactive LSA Network Diagram
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <LiveIndicator pollingState={pollingState} />
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
          OSPFv2 / OSPFv3
        </span>
      </div>
    </header>
  )
}
