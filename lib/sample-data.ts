// 50-router OSPF topology across 6 areas
// Area 0 (Backbone): Routers 1-10 (core mesh)
// Area 1 (Branch East): Routers 11-18
// Area 2 (Branch West): Routers 19-26
// Area 3 (Data Center): Routers 27-34
// Area 4 (Campus North): Routers 35-42
// Area 5 (Campus South): Routers 43-50
// ABRs: R1(Area0/1), R3(Area0/2), R5(Area0/3), R7(Area0/4), R9(Area0/5)

function rid(n: number) {
  return `${n}.${n}.${n}.${n}`
}
function hex4() {
  return (
    "0x" +
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")
  )
}
function age() {
  return Math.floor(50 + Math.random() * 500)
}
function seq() {
  return "8000000" + Math.floor(1 + Math.random() * 9)
}

interface LinkDef {
  type: "p2p" | "stub" | "transit"
  neighborId?: string
  ifAddr: string
  linkId: string
  mask?: string
  cost: number
}

function routerLSA(
  routerId: string,
  links: LinkDef[],
  flags?: string[]
): string {
  const flagLines = (flags || []).map((f) => `  ${f}`).join("\n")
  const linkBlocks = links
    .map((l) => {
      if (l.type === "p2p") {
        return `    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: ${l.neighborId}
     (Link Data) Router Interface address: ${l.ifAddr}
     Number of Metrics: 0
      TOS 0 Metrics: ${l.cost}`
      } else if (l.type === "transit") {
        return `    Link connected to: a Transit Network
     (Link ID) Designated Router address: ${l.linkId}
     (Link Data) Router Interface address: ${l.ifAddr}
     Number of Metrics: 0
      TOS 0 Metrics: ${l.cost}`
      } else {
        return `    Link connected to: a Stub Network
     (Link ID) Network/subnet number: ${l.linkId}
     (Link Data) Network Mask: ${l.mask || "255.255.255.252"}
     Number of Metrics: 0
      TOS 0 Metrics: ${l.cost}`
      }
    })
    .join("\n\n")

  return `  LS age: ${age()}
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: ${routerId}
  Advertising Router: ${routerId}
  LS Seq Number: ${seq()}
  Checksum: ${hex4()}
  Length: ${36 + links.length * 12}
${flagLines}
   Number of Links: ${links.length}

${linkBlocks}`
}

function netLSA(
  drAddr: string,
  drRouter: string,
  mask: string,
  attached: string[]
): string {
  return `  LS age: ${age()}
  Options: (No TOS-capability, DC)
  LS Type: Network Links
  Link State ID: ${drAddr}
  Advertising Router: ${drRouter}
  LS Seq Number: ${seq()}
  Checksum: ${hex4()}
  Length: ${32 + attached.length * 4}
  Network Mask: ${mask}
${attached.map((r) => `        Attached Router: ${r}`).join("\n")}`
}

function buildSample(): string {
  const sections: string[] = []
  sections.push(`OSPF Router with ID (1.1.1.1) (Process ID 1)`)

  // ============ AREA 0 (Backbone) - Routers 1-10 ============
  // Ring topology: 1-2-3-4-5-6-7-8-9-10-1
  // Plus cross links: 1-5, 2-7, 3-9, 4-8
  sections.push(`\n                Router Link States (Area 0)\n`)

  // R1 (ABR Area 0/1)
  sections.push(
    routerLSA(rid(1), [
      { type: "p2p", neighborId: rid(2), ifAddr: "10.0.12.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.12.0", ifAddr: "10.0.12.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(10), ifAddr: "10.0.110.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.110.0", ifAddr: "10.0.110.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(5), ifAddr: "10.0.15.1", linkId: "", cost: 20 },
      { type: "stub", linkId: "10.0.15.0", ifAddr: "10.0.15.1", mask: "255.255.255.252", cost: 20 },
    ], ["Area Border Router"])
  )

  // R2 (ABR placeholder, connects backbone)
  sections.push(
    routerLSA(rid(2), [
      { type: "p2p", neighborId: rid(1), ifAddr: "10.0.12.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.12.0", ifAddr: "10.0.12.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(3), ifAddr: "10.0.23.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.23.0", ifAddr: "10.0.23.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(7), ifAddr: "10.0.27.1", linkId: "", cost: 30 },
      { type: "stub", linkId: "10.0.27.0", ifAddr: "10.0.27.1", mask: "255.255.255.252", cost: 30 },
    ], [])
  )

  // R3 (ABR Area 0/2)
  sections.push(
    routerLSA(rid(3), [
      { type: "p2p", neighborId: rid(2), ifAddr: "10.0.23.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.23.0", ifAddr: "10.0.23.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(4), ifAddr: "10.0.34.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.34.0", ifAddr: "10.0.34.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(9), ifAddr: "10.0.39.1", linkId: "", cost: 25 },
      { type: "stub", linkId: "10.0.39.0", ifAddr: "10.0.39.1", mask: "255.255.255.252", cost: 25 },
    ], ["Area Border Router"])
  )

  // R4
  sections.push(
    routerLSA(rid(4), [
      { type: "p2p", neighborId: rid(3), ifAddr: "10.0.34.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.34.0", ifAddr: "10.0.34.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(5), ifAddr: "10.0.45.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.45.0", ifAddr: "10.0.45.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(8), ifAddr: "10.0.48.1", linkId: "", cost: 15 },
      { type: "stub", linkId: "10.0.48.0", ifAddr: "10.0.48.1", mask: "255.255.255.252", cost: 15 },
    ], [])
  )

  // R5 (ABR Area 0/3)
  sections.push(
    routerLSA(rid(5), [
      { type: "p2p", neighborId: rid(4), ifAddr: "10.0.45.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.45.0", ifAddr: "10.0.45.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(6), ifAddr: "10.0.56.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.56.0", ifAddr: "10.0.56.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(1), ifAddr: "10.0.15.2", linkId: "", cost: 20 },
      { type: "stub", linkId: "10.0.15.0", ifAddr: "10.0.15.2", mask: "255.255.255.252", cost: 20 },
    ], ["Area Border Router"])
  )

  // R6
  sections.push(
    routerLSA(rid(6), [
      { type: "p2p", neighborId: rid(5), ifAddr: "10.0.56.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.56.0", ifAddr: "10.0.56.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(7), ifAddr: "10.0.67.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.67.0", ifAddr: "10.0.67.1", mask: "255.255.255.252", cost: 10 },
    ], [])
  )

  // R7 (ABR Area 0/4)
  sections.push(
    routerLSA(rid(7), [
      { type: "p2p", neighborId: rid(6), ifAddr: "10.0.67.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.67.0", ifAddr: "10.0.67.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(8), ifAddr: "10.0.78.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.78.0", ifAddr: "10.0.78.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(2), ifAddr: "10.0.27.2", linkId: "", cost: 30 },
      { type: "stub", linkId: "10.0.27.0", ifAddr: "10.0.27.2", mask: "255.255.255.252", cost: 30 },
    ], ["Area Border Router"])
  )

  // R8
  sections.push(
    routerLSA(rid(8), [
      { type: "p2p", neighborId: rid(7), ifAddr: "10.0.78.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.78.0", ifAddr: "10.0.78.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(9), ifAddr: "10.0.89.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.89.0", ifAddr: "10.0.89.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(4), ifAddr: "10.0.48.2", linkId: "", cost: 15 },
      { type: "stub", linkId: "10.0.48.0", ifAddr: "10.0.48.2", mask: "255.255.255.252", cost: 15 },
    ], [])
  )

  // R9 (ABR Area 0/5)
  sections.push(
    routerLSA(rid(9), [
      { type: "p2p", neighborId: rid(8), ifAddr: "10.0.89.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.89.0", ifAddr: "10.0.89.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(10), ifAddr: "10.0.910.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.910.0", ifAddr: "10.0.910.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(3), ifAddr: "10.0.39.2", linkId: "", cost: 25 },
      { type: "stub", linkId: "10.0.39.0", ifAddr: "10.0.39.2", mask: "255.255.255.252", cost: 25 },
    ], ["Area Border Router"])
  )

  // R10
  sections.push(
    routerLSA(rid(10), [
      { type: "p2p", neighborId: rid(9), ifAddr: "10.0.910.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.910.0", ifAddr: "10.0.910.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p", neighborId: rid(1), ifAddr: "10.0.110.2", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.0.110.0", ifAddr: "10.0.110.2", mask: "255.255.255.252", cost: 10 },
    ], ["AS Boundary Router"])
  )

  // ============ AREA 1 (Branch East) - Routers 11-18 ============
  // R1 is ABR connecting Area 0 and Area 1
  // Chain: R1 -- R11 -- R12 -- R13 -- R14, R12 -- R15 -- R16, R13 -- R17 -- R18
  sections.push(`\n                Router Link States (Area 1)\n`)

  // R1 in Area 1
  sections.push(
    routerLSA(rid(1), [
      { type: "p2p", neighborId: rid(11), ifAddr: "10.1.1.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.1.1.0", ifAddr: "10.1.1.1", mask: "255.255.255.252", cost: 10 },
    ], [])
  )

  const area1Routers = [
    { id: 11, links: [
      { type: "p2p" as const, neighborId: rid(1), ifAddr: "10.1.1.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.1.0", ifAddr: "10.1.1.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(12), ifAddr: "10.1.12.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.12.0", ifAddr: "10.1.12.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 12, links: [
      { type: "p2p" as const, neighborId: rid(11), ifAddr: "10.1.12.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.12.0", ifAddr: "10.1.12.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(13), ifAddr: "10.1.23.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.23.0", ifAddr: "10.1.23.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(15), ifAddr: "10.1.25.1", linkId: "", cost: 15 },
      { type: "stub" as const, linkId: "10.1.25.0", ifAddr: "10.1.25.1", mask: "255.255.255.252", cost: 15 },
    ]},
    { id: 13, links: [
      { type: "p2p" as const, neighborId: rid(12), ifAddr: "10.1.23.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.23.0", ifAddr: "10.1.23.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(14), ifAddr: "10.1.34.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.34.0", ifAddr: "10.1.34.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(17), ifAddr: "10.1.37.1", linkId: "", cost: 20 },
      { type: "stub" as const, linkId: "10.1.37.0", ifAddr: "10.1.37.1", mask: "255.255.255.252", cost: 20 },
    ]},
    { id: 14, links: [
      { type: "p2p" as const, neighborId: rid(13), ifAddr: "10.1.34.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.34.0", ifAddr: "10.1.34.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.1.140.0", ifAddr: "10.1.140.1", mask: "255.255.255.0", cost: 1 },
    ]},
    { id: 15, links: [
      { type: "p2p" as const, neighborId: rid(12), ifAddr: "10.1.25.2", linkId: "", cost: 15 },
      { type: "stub" as const, linkId: "10.1.25.0", ifAddr: "10.1.25.2", mask: "255.255.255.252", cost: 15 },
      { type: "p2p" as const, neighborId: rid(16), ifAddr: "10.1.56.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.56.0", ifAddr: "10.1.56.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 16, links: [
      { type: "p2p" as const, neighborId: rid(15), ifAddr: "10.1.56.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.56.0", ifAddr: "10.1.56.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.1.160.0", ifAddr: "10.1.160.1", mask: "255.255.255.0", cost: 1 },
    ]},
    { id: 17, links: [
      { type: "p2p" as const, neighborId: rid(13), ifAddr: "10.1.37.2", linkId: "", cost: 20 },
      { type: "stub" as const, linkId: "10.1.37.0", ifAddr: "10.1.37.2", mask: "255.255.255.252", cost: 20 },
      { type: "p2p" as const, neighborId: rid(18), ifAddr: "10.1.78.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.78.0", ifAddr: "10.1.78.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 18, links: [
      { type: "p2p" as const, neighborId: rid(17), ifAddr: "10.1.78.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.1.78.0", ifAddr: "10.1.78.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.1.180.0", ifAddr: "10.1.180.1", mask: "255.255.255.0", cost: 1 },
    ]},
  ]
  for (const r of area1Routers) {
    sections.push(routerLSA(rid(r.id), r.links, []))
  }

  // ============ AREA 2 (Branch West) - Routers 19-26 ============
  // R3 is ABR
  sections.push(`\n                Router Link States (Area 2)\n`)

  // R3 in Area 2
  sections.push(
    routerLSA(rid(3), [
      { type: "p2p", neighborId: rid(19), ifAddr: "10.2.1.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.2.1.0", ifAddr: "10.2.1.1", mask: "255.255.255.252", cost: 10 },
    ], [])
  )

  const area2Routers = [
    { id: 19, links: [
      { type: "p2p" as const, neighborId: rid(3), ifAddr: "10.2.1.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.1.0", ifAddr: "10.2.1.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(20), ifAddr: "10.2.12.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.12.0", ifAddr: "10.2.12.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(23), ifAddr: "10.2.15.1", linkId: "", cost: 15 },
      { type: "stub" as const, linkId: "10.2.15.0", ifAddr: "10.2.15.1", mask: "255.255.255.252", cost: 15 },
    ]},
    { id: 20, links: [
      { type: "p2p" as const, neighborId: rid(19), ifAddr: "10.2.12.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.12.0", ifAddr: "10.2.12.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(21), ifAddr: "10.2.23.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.23.0", ifAddr: "10.2.23.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 21, links: [
      { type: "p2p" as const, neighborId: rid(20), ifAddr: "10.2.23.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.23.0", ifAddr: "10.2.23.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(22), ifAddr: "10.2.34.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.34.0", ifAddr: "10.2.34.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 22, links: [
      { type: "p2p" as const, neighborId: rid(21), ifAddr: "10.2.34.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.34.0", ifAddr: "10.2.34.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.2.220.0", ifAddr: "10.2.220.1", mask: "255.255.255.0", cost: 1 },
    ]},
    { id: 23, links: [
      { type: "p2p" as const, neighborId: rid(19), ifAddr: "10.2.15.2", linkId: "", cost: 15 },
      { type: "stub" as const, linkId: "10.2.15.0", ifAddr: "10.2.15.2", mask: "255.255.255.252", cost: 15 },
      { type: "p2p" as const, neighborId: rid(24), ifAddr: "10.2.56.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.56.0", ifAddr: "10.2.56.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 24, links: [
      { type: "p2p" as const, neighborId: rid(23), ifAddr: "10.2.56.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.56.0", ifAddr: "10.2.56.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(25), ifAddr: "10.2.67.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.67.0", ifAddr: "10.2.67.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 25, links: [
      { type: "p2p" as const, neighborId: rid(24), ifAddr: "10.2.67.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.67.0", ifAddr: "10.2.67.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(26), ifAddr: "10.2.78.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.78.0", ifAddr: "10.2.78.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 26, links: [
      { type: "p2p" as const, neighborId: rid(25), ifAddr: "10.2.78.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.2.78.0", ifAddr: "10.2.78.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.2.260.0", ifAddr: "10.2.260.1", mask: "255.255.255.0", cost: 1 },
    ]},
  ]
  for (const r of area2Routers) {
    sections.push(routerLSA(rid(r.id), r.links, []))
  }

  // ============ AREA 3 (Data Center) - Routers 27-34 ============
  // R5 is ABR
  sections.push(`\n                Router Link States (Area 3)\n`)

  sections.push(
    routerLSA(rid(5), [
      { type: "p2p", neighborId: rid(27), ifAddr: "10.3.1.1", linkId: "", cost: 5 },
      { type: "stub", linkId: "10.3.1.0", ifAddr: "10.3.1.1", mask: "255.255.255.252", cost: 5 },
    ], [])
  )

  const area3Routers = [
    { id: 27, links: [
      { type: "p2p" as const, neighborId: rid(5), ifAddr: "10.3.1.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.1.0", ifAddr: "10.3.1.2", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(28), ifAddr: "10.3.12.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.12.0", ifAddr: "10.3.12.1", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(31), ifAddr: "10.3.15.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.15.0", ifAddr: "10.3.15.1", mask: "255.255.255.252", cost: 5 },
    ]},
    { id: 28, links: [
      { type: "p2p" as const, neighborId: rid(27), ifAddr: "10.3.12.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.12.0", ifAddr: "10.3.12.2", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(29), ifAddr: "10.3.23.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.23.0", ifAddr: "10.3.23.1", mask: "255.255.255.252", cost: 5 },
    ]},
    { id: 29, links: [
      { type: "p2p" as const, neighborId: rid(28), ifAddr: "10.3.23.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.23.0", ifAddr: "10.3.23.2", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(30), ifAddr: "10.3.34.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.34.0", ifAddr: "10.3.34.1", mask: "255.255.255.252", cost: 5 },
    ]},
    { id: 30, links: [
      { type: "p2p" as const, neighborId: rid(29), ifAddr: "10.3.34.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.34.0", ifAddr: "10.3.34.2", mask: "255.255.255.252", cost: 5 },
      { type: "stub" as const, linkId: "10.3.300.0", ifAddr: "10.3.300.1", mask: "255.255.255.0", cost: 1 },
    ]},
    { id: 31, links: [
      { type: "p2p" as const, neighborId: rid(27), ifAddr: "10.3.15.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.15.0", ifAddr: "10.3.15.2", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(32), ifAddr: "10.3.56.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.56.0", ifAddr: "10.3.56.1", mask: "255.255.255.252", cost: 5 },
    ]},
    { id: 32, links: [
      { type: "p2p" as const, neighborId: rid(31), ifAddr: "10.3.56.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.56.0", ifAddr: "10.3.56.2", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(33), ifAddr: "10.3.67.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.67.0", ifAddr: "10.3.67.1", mask: "255.255.255.252", cost: 5 },
    ]},
    { id: 33, links: [
      { type: "p2p" as const, neighborId: rid(32), ifAddr: "10.3.67.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.67.0", ifAddr: "10.3.67.2", mask: "255.255.255.252", cost: 5 },
      { type: "p2p" as const, neighborId: rid(34), ifAddr: "10.3.78.1", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.78.0", ifAddr: "10.3.78.1", mask: "255.255.255.252", cost: 5 },
    ]},
    { id: 34, links: [
      { type: "p2p" as const, neighborId: rid(33), ifAddr: "10.3.78.2", linkId: "", cost: 5 },
      { type: "stub" as const, linkId: "10.3.78.0", ifAddr: "10.3.78.2", mask: "255.255.255.252", cost: 5 },
      { type: "stub" as const, linkId: "10.3.340.0", ifAddr: "10.3.340.1", mask: "255.255.255.0", cost: 1 },
    ]},
  ]
  for (const r of area3Routers) {
    sections.push(routerLSA(rid(r.id), r.links, []))
  }

  // ============ AREA 4 (Campus North) - Routers 35-42 ============
  // R7 is ABR
  sections.push(`\n                Router Link States (Area 4)\n`)

  sections.push(
    routerLSA(rid(7), [
      { type: "p2p", neighborId: rid(35), ifAddr: "10.4.1.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.4.1.0", ifAddr: "10.4.1.1", mask: "255.255.255.252", cost: 10 },
    ], [])
  )

  const area4Routers = [
    { id: 35, links: [
      { type: "p2p" as const, neighborId: rid(7), ifAddr: "10.4.1.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.1.0", ifAddr: "10.4.1.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(36), ifAddr: "10.4.12.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.12.0", ifAddr: "10.4.12.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(39), ifAddr: "10.4.15.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.15.0", ifAddr: "10.4.15.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 36, links: [
      { type: "p2p" as const, neighborId: rid(35), ifAddr: "10.4.12.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.12.0", ifAddr: "10.4.12.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(37), ifAddr: "10.4.23.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.23.0", ifAddr: "10.4.23.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 37, links: [
      { type: "p2p" as const, neighborId: rid(36), ifAddr: "10.4.23.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.23.0", ifAddr: "10.4.23.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(38), ifAddr: "10.4.34.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.34.0", ifAddr: "10.4.34.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 38, links: [
      { type: "p2p" as const, neighborId: rid(37), ifAddr: "10.4.34.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.34.0", ifAddr: "10.4.34.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.4.380.0", ifAddr: "10.4.380.1", mask: "255.255.255.0", cost: 1 },
    ]},
    { id: 39, links: [
      { type: "p2p" as const, neighborId: rid(35), ifAddr: "10.4.15.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.15.0", ifAddr: "10.4.15.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(40), ifAddr: "10.4.56.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.56.0", ifAddr: "10.4.56.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 40, links: [
      { type: "p2p" as const, neighborId: rid(39), ifAddr: "10.4.56.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.56.0", ifAddr: "10.4.56.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(41), ifAddr: "10.4.67.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.67.0", ifAddr: "10.4.67.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 41, links: [
      { type: "p2p" as const, neighborId: rid(40), ifAddr: "10.4.67.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.67.0", ifAddr: "10.4.67.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(42), ifAddr: "10.4.78.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.78.0", ifAddr: "10.4.78.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 42, links: [
      { type: "p2p" as const, neighborId: rid(41), ifAddr: "10.4.78.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.4.78.0", ifAddr: "10.4.78.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.4.420.0", ifAddr: "10.4.420.1", mask: "255.255.255.0", cost: 1 },
    ]},
  ]
  for (const r of area4Routers) {
    sections.push(routerLSA(rid(r.id), r.links, []))
  }

  // ============ AREA 5 (Campus South) - Routers 43-50 ============
  // R9 is ABR
  sections.push(`\n                Router Link States (Area 5)\n`)

  sections.push(
    routerLSA(rid(9), [
      { type: "p2p", neighborId: rid(43), ifAddr: "10.5.1.1", linkId: "", cost: 10 },
      { type: "stub", linkId: "10.5.1.0", ifAddr: "10.5.1.1", mask: "255.255.255.252", cost: 10 },
    ], [])
  )

  const area5Routers = [
    { id: 43, links: [
      { type: "p2p" as const, neighborId: rid(9), ifAddr: "10.5.1.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.1.0", ifAddr: "10.5.1.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(44), ifAddr: "10.5.12.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.12.0", ifAddr: "10.5.12.1", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(47), ifAddr: "10.5.15.1", linkId: "", cost: 15 },
      { type: "stub" as const, linkId: "10.5.15.0", ifAddr: "10.5.15.1", mask: "255.255.255.252", cost: 15 },
    ]},
    { id: 44, links: [
      { type: "p2p" as const, neighborId: rid(43), ifAddr: "10.5.12.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.12.0", ifAddr: "10.5.12.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(45), ifAddr: "10.5.23.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.23.0", ifAddr: "10.5.23.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 45, links: [
      { type: "p2p" as const, neighborId: rid(44), ifAddr: "10.5.23.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.23.0", ifAddr: "10.5.23.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(46), ifAddr: "10.5.34.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.34.0", ifAddr: "10.5.34.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 46, links: [
      { type: "p2p" as const, neighborId: rid(45), ifAddr: "10.5.34.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.34.0", ifAddr: "10.5.34.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.5.460.0", ifAddr: "10.5.460.1", mask: "255.255.255.0", cost: 1 },
    ]},
    { id: 47, links: [
      { type: "p2p" as const, neighborId: rid(43), ifAddr: "10.5.15.2", linkId: "", cost: 15 },
      { type: "stub" as const, linkId: "10.5.15.0", ifAddr: "10.5.15.2", mask: "255.255.255.252", cost: 15 },
      { type: "p2p" as const, neighborId: rid(48), ifAddr: "10.5.56.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.56.0", ifAddr: "10.5.56.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 48, links: [
      { type: "p2p" as const, neighborId: rid(47), ifAddr: "10.5.56.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.56.0", ifAddr: "10.5.56.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(49), ifAddr: "10.5.67.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.67.0", ifAddr: "10.5.67.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 49, links: [
      { type: "p2p" as const, neighborId: rid(48), ifAddr: "10.5.67.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.67.0", ifAddr: "10.5.67.2", mask: "255.255.255.252", cost: 10 },
      { type: "p2p" as const, neighborId: rid(50), ifAddr: "10.5.78.1", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.78.0", ifAddr: "10.5.78.1", mask: "255.255.255.252", cost: 10 },
    ]},
    { id: 50, links: [
      { type: "p2p" as const, neighborId: rid(49), ifAddr: "10.5.78.2", linkId: "", cost: 10 },
      { type: "stub" as const, linkId: "10.5.78.0", ifAddr: "10.5.78.2", mask: "255.255.255.252", cost: 10 },
      { type: "stub" as const, linkId: "10.5.500.0", ifAddr: "10.5.500.1", mask: "255.255.255.0", cost: 1 },
    ]},
  ]
  for (const r of area5Routers) {
    sections.push(routerLSA(rid(r.id), r.links, []))
  }

  return sections.join("\n\n")
}

export const sampleOSPFData = buildSample()
