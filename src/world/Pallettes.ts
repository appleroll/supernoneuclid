import { Vec3 } from '../math/Vec3';
import { Scene } from './Scene';

function randomChoice<T>(values: T[]): T {
    return values[Math.floor(Math.random() * values.length)];
}

function randomRange(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
    return Math.floor(randomRange(min, max + 1));
}

export function addPallet(
    scene: Scene,
    room: string,
    x: number,
    y: number,
    z: number,
    width = 2.6,
    depth = 1.9
) {
    const palletHeight = 0.22;
    const woodColour = [0.60, 0.42, 0.22, 1];
    const boxColours = [[0.96, 0.96, 0.95, 1], [0.92, 0.92, 0.95, 1], [0.88, 0.88, 0.88, 1], [0.84, 0.95, 0.95, 1]];
    const topColour = [0.92, 0.82, 0.60, 1];

    scene.addBox({ pos: [x, y, z], scale: [width, palletHeight, depth], mult: woodColour, room });
    scene.addBox({ pos: [x, y + 0.12, z], scale: [width * 0.88, 0.05, depth * 0.88], mult: topColour, room });

    const gridSize = Math.random() < 0.5 ? 4 : 5;
    const columns = gridSize;
    const rows = gridSize;
    const layers = gridSize;
    const boxWidth = width / columns;
    const boxDepth = depth / rows;
    const boxHeight = Math.min(0.5, Math.min(boxWidth, boxDepth) * 0.92);
    const startX = x - width / 2 + boxWidth / 2;
    const startZ = z - depth / 2 + boxDepth / 2;
    const colour = randomChoice(boxColours);

    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            let stackHeight = layers;

            // randomise the stack height to recreate missing boxes
            const rand = Math.random();
            if (rand < 0.1) {
                stackHeight = 0; // Missing all boxes
            } if (rand < 0.3) {
                stackHeight -= 3; // Missing 3 from top
            } else if (rand < 0.5) {
                stackHeight -= 2; // Missing 2 from top
            } else if (rand < 0.7) {
                stackHeight -= 1; // Missing 1 from top
            }

            for (let layer = 0; layer < stackHeight; layer++) {
                const halfHeight = boxHeight / 2;
                const itemX = startX + column * boxWidth;
                const itemZ = startZ + row * boxDepth;
                const itemY = y + palletHeight + halfHeight + layer * boxHeight * 0.98;

                scene.addBox({
                    pos: [itemX, itemY - 0.1, itemZ], 
                    scale: [boxWidth + 0.1, boxHeight, boxDepth + 0.1],
                    mult: colour,
                    room
                });
            }
        }
    }
}

export function addPallettes(scene: Scene, room: string, trueX: number, trueZ: number) {
    if (room === 'Q6' || room === 'Q7') {
        return;
    }

    const floorY = 0.22;
    const numPallettes = randomInt(3, 6);
    const pallettePositions: Vec3[] = [];

    for (let i = 0; i < numPallettes; i++) {
        let attempts = 0;
        let x = 0;
        let z = 0;
        let isOverlapping = true;

        do {
            x = randomRange(trueX - 8, trueX + 8);
            z = randomRange(trueZ - 8, trueZ + 8);
            
            isOverlapping = pallettePositions.some(
                pos => Math.hypot(pos[0] - x, pos[2] - z) < 3.5
            );
            
            attempts++;
        } while (isOverlapping && attempts < 50);

        if (attempts < 100) {
            pallettePositions.push([x, floorY, z]);
            addPallet(scene, room, x, floorY, z);
        }
    }
}