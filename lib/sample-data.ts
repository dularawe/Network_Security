export const sampleOSPFData = `OSPF Router with ID (1.1.1.1) (Process ID 1)

                Router Link States (Area 0)

  LS age: 234
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 1.1.1.1
  Advertising Router: 1.1.1.1
  LS Seq Number: 80000005
  Checksum: 0x3A9C
  Length: 60
  Area Border Router
   Number of Links: 3

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 2.2.2.2
     (Link Data) Router Interface address: 10.0.12.1
     Number of Metrics: 0
      TOS 0 Metrics: 10

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.0.12.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 10

    Link connected to: a Transit Network
     (Link ID) Designated Router address: 10.0.123.2
     (Link Data) Router Interface address: 10.0.123.1
     Number of Metrics: 0
      TOS 0 Metrics: 5

  LS age: 189
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 2.2.2.2
  Advertising Router: 2.2.2.2
  LS Seq Number: 80000007
  Checksum: 0x4B2E
  Length: 72
  Area Border Router
  AS Boundary Router
   Number of Links: 4

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 1.1.1.1
     (Link Data) Router Interface address: 10.0.12.2
     Number of Metrics: 0
      TOS 0 Metrics: 10

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.0.12.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 10

    Link connected to: a Transit Network
     (Link ID) Designated Router address: 10.0.123.2
     (Link Data) Router Interface address: 10.0.123.2
     Number of Metrics: 0
      TOS 0 Metrics: 5

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 3.3.3.3
     (Link Data) Router Interface address: 10.0.23.1
     Number of Metrics: 0
      TOS 0 Metrics: 20

  LS age: 312
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 3.3.3.3
  Advertising Router: 3.3.3.3
  LS Seq Number: 80000003
  Checksum: 0x5D1F
  Length: 60
  Area Border Router
   Number of Links: 3

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 2.2.2.2
     (Link Data) Router Interface address: 10.0.23.2
     Number of Metrics: 0
      TOS 0 Metrics: 20

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.0.23.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 20

    Link connected to: a Transit Network
     (Link ID) Designated Router address: 10.0.123.2
     (Link Data) Router Interface address: 10.0.123.3
     Number of Metrics: 0
      TOS 0 Metrics: 5

                Router Link States (Area 1)

  LS age: 156
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 1.1.1.1
  Advertising Router: 1.1.1.1
  LS Seq Number: 80000004
  Checksum: 0x2B8D
  Length: 48
   Number of Links: 2

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 4.4.4.4
     (Link Data) Router Interface address: 10.1.14.1
     Number of Metrics: 0
      TOS 0 Metrics: 15

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.1.14.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 15

  LS age: 198
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 4.4.4.4
  Advertising Router: 4.4.4.4
  LS Seq Number: 80000006
  Checksum: 0x6E3A
  Length: 60
   Number of Links: 3

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 1.1.1.1
     (Link Data) Router Interface address: 10.1.14.2
     Number of Metrics: 0
      TOS 0 Metrics: 15

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.1.14.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 15

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.1.40.0
     (Link Data) Network Mask: 255.255.255.0
     Number of Metrics: 0
      TOS 0 Metrics: 1

                Router Link States (Area 2)

  LS age: 267
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 3.3.3.3
  Advertising Router: 3.3.3.3
  LS Seq Number: 80000005
  Checksum: 0x7C2B
  Length: 48
   Number of Links: 2

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 5.5.5.5
     (Link Data) Router Interface address: 10.2.35.1
     Number of Metrics: 0
      TOS 0 Metrics: 25

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.2.35.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 25

  LS age: 345
  Options: (No TOS-capability, DC)
  LS Type: Router Links
  Link State ID: 5.5.5.5
  Advertising Router: 5.5.5.5
  LS Seq Number: 80000008
  Checksum: 0x8D1C
  Length: 60
   Number of Links: 3

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 3.3.3.3
     (Link Data) Router Interface address: 10.2.35.2
     Number of Metrics: 0
      TOS 0 Metrics: 25

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.2.35.0
     (Link Data) Network Mask: 255.255.255.252
     Number of Metrics: 0
      TOS 0 Metrics: 25

    Link connected to: a Stub Network
     (Link ID) Network/subnet number: 10.2.50.0
     (Link Data) Network Mask: 255.255.255.0
     Number of Metrics: 0
      TOS 0 Metrics: 1

                Net Link States (Area 0)

  LS age: 201
  Options: (No TOS-capability, DC)
  LS Type: Network Links
  Link State ID: 10.0.123.2
  Advertising Router: 2.2.2.2
  LS Seq Number: 80000003
  Checksum: 0x9A0E
  Length: 36
  Network Mask: /24
        Attached Router: 1.1.1.1
        Attached Router: 2.2.2.2
        Attached Router: 3.3.3.3

                Summary Net Link States (Area 0)

  LS age: 178
  Options: (No TOS-capability, DC)
  LS Type: Summary Links(Network)
  Link State ID: 10.1.0.0
  Advertising Router: 1.1.1.1
  LS Seq Number: 80000002
  Checksum: 0xAB3F
  Length: 28
  Network Mask: /16
        TOS: 0  Metric: 15

  LS age: 289
  Options: (No TOS-capability, DC)
  LS Type: Summary Links(Network)
  Link State ID: 10.2.0.0
  Advertising Router: 3.3.3.3
  LS Seq Number: 80000002
  Checksum: 0xBC4E
  Length: 28
  Network Mask: /16
        TOS: 0  Metric: 25
`.trim()
