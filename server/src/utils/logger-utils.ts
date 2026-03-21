import { Coord } from "../shared/types/game-types";

export const coordToString = (coord: Coord) => {
  return `${coord.x}, ${coord.y}`;
}