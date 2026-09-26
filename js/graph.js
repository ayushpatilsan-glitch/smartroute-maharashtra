
/**
 * SmartRoute Maharashtra - Graph Engine & Dijkstra Implementation
 * DSA Concepts: Graph (Adjacency List), Priority Queue (Min-Heap),
 * Hash Table, Path Reconstruction
 * Demo data only - architecture ready for live APIs.
 */

class MinHeap {
  constructor(compareFn) {
    this.heap = [];
    this.compare = compareFn || ((a, b) => a.priority - b.priority);
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._sinkDown(0);
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.compare(this.heap[idx], this.heap[parent]) >= 0) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }

  _sinkDown(idx) {
    const n = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
      if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

class TransportGraph {
  constructor(stations, connections) {
    this.stations = new Map(); // Hash Table: id -> station
    this.nameToId = new Map(); // Hash Table: name (lowercase) -> id
    this.adj = new Map(); // Adjacency List: id -> [{to, edge}]

    stations.forEach(s => {
      this.stations.set(s.id, s);
      this.nameToId.set(s.name.toLowerCase(), s.id);
      this.adj.set(s.id, []);
    });

    connections.forEach(c => {
      if (!this.adj.has(c.source)) this.adj.set(c.source, []);
      this.adj.get(c.source).push({ to: c.destination, edge: c });
    });
  }

  getStationByName(name) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    // Exact
    if (this.nameToId.has(key)) {
      return this.stations.get(this.nameToId.get(key));
    }
    // Partial / fuzzy
    for (const [n, id] of this.nameToId) {
      if (n.includes(key) || key.includes(n)) {
        return this.stations.get(id);
      }
    }
    return null;
  }

  searchStations(query, limit = 10) {
    if (!query || query.length < 1) return [];
    const q = query.trim().toLowerCase();
    const results = [];
    for (const [name, id] of this.nameToId) {
      if (name.includes(q) || q.includes(name)) {
        results.push(this.stations.get(id));
        if (results.length >= limit) break;
      }
    }
    // Prefer starts-with
    results.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    });
    return results;
  }

  getNeighbors(id) {
    return this.adj.get(id) || [];
  }

  /**
   * Dijkstra's Algorithm
   * weightFn: (edge) => number  (distance | time | fare | transferCost)
   * transferCostFn optional for min-transfers (mode change costs)
   */
  dijkstra(sourceId, destId, weightFn, options = {}) {
    const { allowModes = null, maxTransfers = Infinity } = options;
    const dist = new Map();
    const prev = new Map(); // for path reconstruction: id -> { prevId, edge }
    const transfers = new Map();
    const visited = new Set();

    for (const id of this.stations.keys()) {
      dist.set(id, Infinity);
      transfers.set(id, 0);
    }
    dist.set(sourceId, 0);

    const pq = new MinHeap((a, b) => a.priority - b.priority);
    pq.push({ id: sourceId, priority: 0, lastMode: null, transferCount: 0 });

    while (!pq.isEmpty()) {
      const { id: u, priority, lastMode, transferCount } = pq.pop();
      if (visited.has(u)) continue;
      if (priority > dist.get(u)) continue;
      visited.add(u);

      if (u === destId) break;

      for (const { to: v, edge } of this.getNeighbors(u)) {
        if (allowModes && !allowModes.includes(edge.mode)) continue;

        let extraTransfer = 0;
        if (lastMode !== null && lastMode !== edge.mode) {
          extraTransfer = 1;
        }
        const newTransfers = transferCount + extraTransfer;
        if (newTransfers > maxTransfers) continue;

        const w = weightFn(edge, extraTransfer);
        const alt = dist.get(u) + w;

        if (alt < dist.get(v)) {
          dist.set(v, alt);
          prev.set(v, { prevId: u, edge });
          transfers.set(v, newTransfers);
          pq.push({
            id: v,
            priority: alt,
            lastMode: edge.mode,
            transferCount: newTransfers
          });
        }
      }
    }

    return { dist, prev, transfers, reachable: dist.get(destId) < Infinity };
  }

  reconstructPath(prev, sourceId, destId) {
    const path = [];
    let current = destId;
    while (current !== sourceId) {
      const p = prev.get(current);
      if (!p) return null;
      path.unshift({ stationId: current, edge: p.edge });
      current = p.prevId;
    }
    path.unshift({ stationId: sourceId, edge: null });
    return path;
  }

  /**
   * Build full route object from path
   */
  buildRoute(path, metricLabel) {
    if (!path || path.length < 2) return null;
    let totalDist = 0, totalTime = 0, totalFare = 0;
    let transferCount = 0;
    let lastMode = null;
    const steps = [];
    const modes = new Set();

    for (let i = 1; i < path.length; i++) {
      const { stationId, edge } = path[i];
      const fromStation = this.stations.get(path[i - 1].stationId);
      const toStation = this.stations.get(stationId);
      totalDist += edge.distance;
      totalTime += edge.time;
      totalFare += edge.fare;
      modes.add(edge.mode);
      if (lastMode !== null && lastMode !== edge.mode) transferCount++;
      lastMode = edge.mode;

      steps.push({
        from: fromStation.name,
        to: toStation.name,
        mode: edge.mode,
        distance: edge.distance,
        time: edge.time,
        fare: edge.fare,
        routeNumber: edge.routeNumber,
        stops: edge.stops || []
      });
    }

    return {
      id: metricLabel + "-" + path.map(p => p.stationId).join("-"),
      steps,
      totalDistance: Math.round(totalDist * 10) / 10,
      totalTime: Math.round(totalTime),
      totalFare: Math.round(totalFare),
      transfers: transferCount,
      modes: Array.from(modes),
      pathStations: path.map(p => this.stations.get(p.stationId).name)
    };
  }

  findShortestDistance(sourceName, destName, options = {}) {
    const src = this.getStationByName(sourceName);
    const dst = this.getStationByName(destName);
    if (!src || !dst) return null;
    const weightFn = (edge) => edge.distance;
    const { dist, prev, reachable } = this.dijkstra(src.id, dst.id, weightFn, options);
    if (!reachable) return null;
    const path = this.reconstructPath(prev, src.id, dst.id);
    return this.buildRoute(path, "distance");
  }

  findFastestRoute(sourceName, destName, options = {}) {
    const src = this.getStationByName(sourceName);
    const dst = this.getStationByName(destName);
    if (!src || !dst) return null;
    const weightFn = (edge) => edge.time;
    const { dist, prev, reachable } = this.dijkstra(src.id, dst.id, weightFn, options);
    if (!reachable) return null;
    const path = this.reconstructPath(prev, src.id, dst.id);
    return this.buildRoute(path, "time");
  }

  findCheapestRoute(sourceName, destName, options = {}) {
    const src = this.getStationByName(sourceName);
    const dst = this.getStationByName(destName);
    if (!src || !dst) return null;
    const weightFn = (edge) => edge.fare + 0.01; // small epsilon to prefer fewer edges if equal
    const { dist, prev, reachable } = this.dijkstra(src.id, dst.id, weightFn, options);
    if (!reachable) return null;
    const path = this.reconstructPath(prev, src.id, dst.id);
    return this.buildRoute(path, "fare");
  }

  findMinimumTransferRoute(sourceName, destName, options = {}) {
    const src = this.getStationByName(sourceName);
    const dst = this.getStationByName(destName);
    if (!src || !dst) return null;
    // Primary: minimize transfers, secondary: time
    const weightFn = (edge, extraTransfer) => extraTransfer * 1000 + edge.time;
    const { dist, prev, reachable } = this.dijkstra(src.id, dst.id, weightFn, options);
    if (!reachable) return null;
    const path = this.reconstructPath(prev, src.id, dst.id);
    return this.buildRoute(path, "transfers");
  }

  /**
   * Generate multiple distinct routes by:
   * 1. Running Dijkstra for each metric
   * 2. Optionally exploring k-shortest like variants by mode restrictions
   */
  findAllRoutes(sourceName, destName, options = {}) {
    const routes = [];
    const seen = new Set();

    const addIfNew = (route) => {
      if (!route) return;
      const key = route.pathStations.join(">") + "|" + route.modes.join("+");
      if (!seen.has(key)) {
        seen.add(key);
        routes.push(route);
      }
    };

    addIfNew(this.findShortestDistance(sourceName, destName, options));
    addIfNew(this.findFastestRoute(sourceName, destName, options));
    addIfNew(this.findCheapestRoute(sourceName, destName, options));
    addIfNew(this.findMinimumTransferRoute(sourceName, destName, options));

    // Mode-restricted variants to surface more options
    const modeSets = [
      ["Bus", "Metro", "Walking"],
      ["Bus", "Auto", "Walking"],
      ["Metro", "Walking", "Bus"],
      ["Bus", "Train", "Walking"],
      ["Bus"],
      ["Metro", "Bus"],
      ["Auto", "Bus"],
      ["Taxi"]
    ];

    for (const modes of modeSets) {
      const opt = { ...options, allowModes: modes };
      addIfNew(this.findShortestDistance(sourceName, destName, opt));
      addIfNew(this.findFastestRoute(sourceName, destName, opt));
      addIfNew(this.findCheapestRoute(sourceName, destName, opt));
    }

    // Sort by a composite score (prefer lower distance + time + fare)
    routes.sort((a, b) => {
      const scoreA = a.totalDistance * 2 + a.totalTime * 0.5 + a.totalFare * 0.3 + a.transfers * 10;
      const scoreB = b.totalDistance * 2 + b.totalTime * 0.5 + b.totalFare * 0.3 + b.transfers * 10;
      return scoreA - scoreB;
    });

    return routes.slice(0, 12); // limit for UI
  }

  getSummary(routes) {
    if (!routes || routes.length === 0) {
      return { shortest: null, fastest: null, cheapest: null, minTransfers: null };
    }
    let shortest = routes[0], fastest = routes[0], cheapest = routes[0], minTransfers = routes[0];
    for (const r of routes) {
      if (r.totalDistance < shortest.totalDistance) shortest = r;
      if (r.totalTime < fastest.totalTime) fastest = r;
      if (r.totalFare < cheapest.totalFare) cheapest = r;
      if (r.transfers < minTransfers.transfers ||
          (r.transfers === minTransfers.transfers && r.totalTime < minTransfers.totalTime)) {
        minTransfers = r;
      }
    }
    return { shortest, fastest, cheapest, minTransfers };
  }
}

// Global instance (will be created after data loads)
let graph = null;

function initGraph() {
  graph = new TransportGraph(STATIONS, CONNECTIONS);
  return graph;
}
