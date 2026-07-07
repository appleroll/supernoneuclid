import { Scene } from './Scene';
import {ikeaColours} from '../colour/IKEAColours';

export function addShelf(
    scene: Scene,
    x: number,
    y: number,
    z: number,
    room: string,
    width = 3,
    depth = 4,
    rotation = 0, // 0, 1, 2, 3 = 0°, 90°, 180°, 270° respectively
    shelfColor = ikeaColours.white
) {
    const T = 0.15;

    const vertical = rotation % 2 === 1;

    // Uprights
    if (!vertical) {
        scene.addBox({
            pos: [x - width/2, y, z],
            scale: [T, 8, depth],
            mult: shelfColor,
            room
        });

        scene.addBox({
            pos: [x + width/2, y, z],
            scale: [T, 8, depth],
            mult: shelfColor,
            room
        });

        for (let i = 0; i < 8; i++) {
            scene.addBox({
                pos: [x, y - 1.5 + i, z],
                scale: [width, T, depth],
                mult: shelfColor,
                room
            });
        }
    } else {
        scene.addBox({
            pos: [x, y, z - width/2],
            scale: [depth, 8, T],
            mult: shelfColor,
            room
        });

        scene.addBox({
            pos: [x, y, z + width/2],
            scale: [depth, 8, T],
            mult: shelfColor,
            room
        });

        for (let i = 0; i < 8; i++) {
            scene.addBox({
                pos: [x, y - 4 + i, z],
                scale: [depth, T, width],
                mult: shelfColor,
                room
            });
        }
    }
}

export function addShelving(scene: Scene, room: string, startingX: number, endingX: number, y: number, startingZ: number, endingZ: number, shelfWidth: number, shelfHeight: number, shelfDepth: number, xSpacing: number, zSpacing: number) {
    const minX = Math.min(startingX, endingX);
    const maxX = Math.max(startingX, endingX);

    const minZ = Math.min(startingZ, endingZ);
    const maxZ = Math.max(startingZ, endingZ);

    for (let x = minX; x <= maxX; x += shelfWidth + xSpacing) {
        for (let z = minZ; z <= maxZ; z += shelfDepth + zSpacing) {
            addShelf(scene, x, y, z, room, shelfWidth, shelfHeight, shelfDepth);
        }
    }
}