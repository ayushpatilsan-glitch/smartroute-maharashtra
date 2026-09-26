# SmartRoute Maharashtra

**Smart Maharashtra Transportation Route Planner**

A modern, professional, graph-based multimodal transportation route planner focused on **Pune** and the **Pune Metropolitan Region**. Built as a college **Data Structures** project demonstrating:

- Graph
- Adjacency List
- Dijkstra’s Algorithm
- Priority Queue / Min-Heap
- Hash Table
- Path Reconstruction

> **Demo data only.** All distances, times and fares are sample/estimated values for academic demonstration. Not live traffic, live bus locations or official fares. Architecture is ready for future real API integration.

## Live Demo

After publishing to GitHub Pages:

`https://<your-username>.github.io/smartroute-maharashtra/`

## Features

- **Multimodal routing**: Bus, Metro, Auto Rickshaw, Local Train, Taxi, Walking
- **Multiple optimization goals**:
  - Shortest distance
  - Fastest time
  - Cheapest fare
  - Minimum transfers
- **All routes** shown (not only one “best”)
- Step-by-step path with mode, distance, time, fare
- Station search with autocomplete (hash-backed)
- Filters by mode, max fare, max time, max transfers
- Comparison table
- Interactive Pune network view
- DSA visualization page
- Fully responsive

## Project Structure

```
smartroute-maharashtra/
├── index.html          # Home + search
├── plan.html           # Route results & details
├── network.html        # Pune station network
├── transport.html      # Modes explanation
├── dsa.html            # Data structures visualization
├── about.html          # Project explanation
├── css/
│   └── styles.css
├── js/
│   ├── data.js         # Stations + connections (demo dataset)
│   ├── graph.js        # Graph, MinHeap, Dijkstra, route builders
│   └── app.js          # UI logic
└── README.md
```

## How Algorithms Work

1. Stations are **vertices**; transport links are **weighted directed edges**.
2. Graph is stored as an **adjacency list**.
3. Station lookup uses a **hash table** (Map).
4. For each optimization goal, **Dijkstra** runs with a different weight function:
   - Distance → edge.distance
   - Time → edge.time
   - Fare → edge.fare
   - Transfers → large penalty on mode change + time
5. A **min-heap (priority queue)** selects the next node to expand.
6. **Path reconstruction** walks the predecessor map from destination back to source.
7. Multiple runs (and mode-restricted variants) produce a set of distinct routes for comparison.

## Quick Start (Local)

Just open `index.html` in a browser, or use any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

## Publishing on GitHub Pages (A–Z)

See the detailed guide in the conversation or follow:

1. Create a new repository (e.g. `smartroute-maharashtra`)
2. Upload / push all files
3. Settings → Pages → Source: Deploy from branch `main` / root
4. Wait 1–2 minutes → open `https://<username>.github.io/smartroute-maharashtra/`

## Sample Query

**From:** Pune Railway Station  
**To:** VIT Pune  

You will see multiple routes (Bus+Metro+Bus, Metro+Bus, Bus+Bus, Auto options, etc.) with different distance / time / fare / transfer trade-offs.

## Author

College Data Structures Project  
GitHub: [ayushpatilsan-glitch](https://github.com/ayushpatilsan-glitch)

## License

Educational / academic use.
