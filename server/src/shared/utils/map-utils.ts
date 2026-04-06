import { Coord } from "../types/game-types"

export function getPolygonCentroid(points: Coord[]): Coord {
  let area = 0
  let cx = 0
  let cy = 0

  const n = points.length

  for (let i = 0; i < n; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % n]

    const cross = p1.x * p2.y - p2.x * p1.y

    area += cross
    cx += (p1.x + p2.x) * cross
    cy += (p1.y + p2.y) * cross
  }

  area *= 0.5

  // Prevent division by zero
  if (area === 0) {
    return getAveragePoint(points)
  }

  cx /= (6 * area)
  cy /= (6 * area)

  return { x: Math.round(cx), y: Math.round(cy) }
}

export function getAveragePoint(points: Coord[]): Coord {
  const sum = points.reduce(
    (acc, p) => {
      acc.x += p.x
      acc.y += p.y
      return acc
    },
    { x: 0, y: 0 }
  )

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  }
}