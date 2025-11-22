// utils/geometry.ts

type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };

/**
 * Clips a polygon against a single infinite line (edge).
 * This is a helper function for the Sutherland-Hodgman algorithm.
 * @param polygon The polygon to clip.
 * @param p1 First point of the clipping edge vector.
 * @param p2 Second point of the clipping edge vector.
 * @returns The clipped polygon.
 */
const clipAgainstEdge = (polygon: Point[], p1: Point, p2: Point): Point[] => {
    if (polygon.length === 0) return [];

    const clippedPolygon: Point[] = [];
    let s = polygon[polygon.length - 1];

    // Using cross product to check which side of the line a point is on.
    // For a clockwise clipping rectangle (in a Y-down coordinate system),
    // a point P is "inside" the edge P1->P2 if the z-component of (P2-P1) x (P-P1) is >= 0.
    const isInside = (p: Point) => (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x) >= 0;

    const intersect = (start: Point, end: Point): Point => {
        // Standard formula for line-line intersection.
        const dc = { x: p1.x - p2.x, y: p1.y - p2.y };
        const dp = { x: start.x - end.x, y: start.y - end.y };
        const n1 = p1.x * p2.y - p1.y * p2.x;
        const n2 = start.x * end.y - start.y * end.x;
        const den = dc.x * dp.y - dc.y * dp.x;
        
        // Lines are parallel, should not happen in this algorithm's flow
        // but returning start is a safe fallback.
        if (den === 0) return start;
        
        const x = (n1 * dp.x - n2 * dc.x) / den;
        const y = (n1 * dp.y - n2 * dc.y) / den;
        return { x, y };
    };

    for (const e of polygon) {
        const sIsInside = isInside(s);
        const eIsInside = isInside(e);

        if (eIsInside) {
            if (!sIsInside) {
                // Edge crossed from outside to inside: add intersection point.
                clippedPolygon.push(intersect(s, e));
            }
            // End point is inside: add it.
            clippedPolygon.push(e);
        } else if (sIsInside) {
            // Edge crossed from inside to outside: add intersection point.
            clippedPolygon.push(intersect(s, e));
        }
        // Both points are outside: do nothing.
        s = e;
    }

    return clippedPolygon;
};


/**
 * Clips a polygon path against a rectangle using the Sutherland-Hodgman algorithm.
 * This function handles cases where the polygon is split into multiple pieces.
 * @param path The polygon to clip, represented as an array of points.
 * @param rect The rectangular clipping window.
 * @returns An array of clipped polygons. Each polygon is an array of points.
 */
export const clipPathWithRect = (path: Point[], rect: Rect): Point[][] => {
    if (path.length < 3) return [];

    const p1 = { x: rect.x, y: rect.y }; // Top-left
    const p2 = { x: rect.x + rect.width, y: rect.y }; // Top-right
    const p3 = { x: rect.x + rect.width, y: rect.y + rect.height }; // Bottom-right
    const p4 = { x: rect.x, y: rect.y + rect.height }; // Bottom-left

    // Clip against each of the 4 edges of the rectangle in clockwise order
    let clippedPath = clipAgainstEdge(path, p1, p2);      // Top edge
    clippedPath = clipAgainstEdge(clippedPath, p2, p3);   // Right edge
    clippedPath = clipAgainstEdge(clippedPath, p3, p4);   // Bottom edge
    clippedPath = clipAgainstEdge(clippedPath, p4, p1);   // Left edge
    
    // The algorithm might not produce a valid polygon if completely clipped
    return clippedPath.length >= 3 ? [clippedPath] : [];
};


/**
 * Checks if a point is inside a polygon using the ray-casting algorithm.
 * @param point The point to check.
 * @param polygon An array of points defining the polygon.
 * @returns True if the point is inside the polygon, false otherwise.
 */
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html

    const { x, y } = point;
    let isInside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            isInside = !isInside;
        }
    }

    return isInside;
};
