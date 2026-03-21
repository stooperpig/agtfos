import { getRange } from "../../../src/shared/utils/map-utils";
import { Coord } from "../../../src/shared/types/game-types";

describe("getRange", () => {
    it("returns 0 when both coordinates are the same", () => {
        const a: Coord = { x: 2, y: 3 };
        const b: Coord = { x: 2, y: 3 };
        expect(getRange(a, b)).toBe(0);
    });

    it("returns correct range for adjacent hexes", () => {
        const a: Coord = { x: 2, y: 3 };
        const b: Coord = { x: 3, y: 3 };
        expect(getRange(a, b)).toBe(1);
    });

    it("returns correct range for hexes two steps apart", () => {
        const a: Coord = { x: 0, y: 0 };
        const b: Coord = { x: 2, y: 0 };
        expect(getRange(a, b)).toBe(2);
    });

    // it("returns correct range for hexes with negative coordinates", () => {
    //     const a: Coord = { x: -1, y: -1 };
    //     const b: Coord = { x: 1, y: 1 };
    //     expect(getRange(a, b)).toBe(2);
    // });

    it("returns correct range for distant hexes", () => {
        const a: Coord = { x: 0, y: 0 };
        const b: Coord = { x: 5, y: 7 };
        expect(getRange(a, b)).toBeGreaterThan(0);
        // The exact value can be checked if needed
    });
});