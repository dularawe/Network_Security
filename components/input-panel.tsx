"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Play, FileText, Upload, Trash2 } from "lucide-react"

interface InputPanelProps {
  value: string
  onChange: (value: string) => void
  onParse: () => void
  onLoadSample: () => void
  onClear: () => void
  isParsing: boolean
  parseError: string | null
}

export function InputPanel({
  value,
  onChange,
  onParse,
  onLoadSample,
  onClear,
  isParsing,
  parseError,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      onChange(text)
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          OSPF LSA Data Input
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={onLoadSample}
          >
            Sample
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={onClear}
            disabled={!value}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.log,.pcap"
        onChange={handleFileUpload}
        className="hidden"
        aria-label="Upload OSPF data file"
      />

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Paste OSPF LSA data here...\n\nSupported formats:\n- Cisco "show ip ospf database" output\n- Wireshark OSPF captures\n- Structured LSA data'}
        className="flex-1 resize-none font-mono text-xs bg-secondary/30 border-border placeholder:text-muted-foreground/50 min-h-[200px]"
      />

      {parseError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive">{parseError}</p>
        </div>
      )}

      <Button
        onClick={onParse}
        disabled={!value || isParsing}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        size="sm"
      >
        <Play className="w-3.5 h-3.5" />
        {isParsing ? "Parsing..." : "Parse & Visualize"}
      </Button>

      {/* Push Mode API Info */}
      <div className="rounded-md bg-secondary/30 border border-border px-3 py-2.5 mt-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Automated Push Mode
        </p>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
          Push OSPF data via API for real-time monitoring. Enable polling in the control panel, then run:
        </p>
        <pre className="text-[9px] font-mono bg-background/50 rounded px-2 py-1.5 text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`ssh router "show ip ospf database" \\
  | curl -s -X POST \\
  -H "Content-Type: text/plain" \\
  -d @- /api/ospf-poll`}
        </pre>
      </div>
    </div>
  )
}
