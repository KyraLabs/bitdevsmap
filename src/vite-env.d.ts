/// <reference types="vite/client" />

declare module 'world-atlas/land-110m.json' {
  // TopoJSON topology — typed loosely; consumed only by topojson-client.
  const topology: {
    type: 'Topology'
    objects: { land: unknown }
    [key: string]: unknown
  }
  export default topology
}
