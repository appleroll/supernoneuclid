// //?note FILE DEPRECATED FOR NOW
// // Uncomment once we add a purpose for tunnels to be in the game.
// ?AI This script was originally built into world1 and was later moved here with the help of AI. Currently not in use.


// import { Vec3 } from '../math/Vec3';
// import { Portal } from './Portal';
// import { Scene } from '../world/Scene';

// export interface TunnelConfig {
//     mainRoom: string;
//     tunnelRoom: string;
//     startPos: Vec3;
//     endPos: Vec3;
//     hiddenOffset: Vec3;
//     width: number;
//     height: number;
//     length: number;      // Interior length
//     color?: number[];
//     wallThickness?: number; // Added to handle exterior walls
// }

// export class Tunnel {
//     private config: TunnelConfig;

//     constructor(config: TunnelConfig) {
//         this.config = config;
//     }

//     addToScene(scene: Scene, init: boolean) {
//         const { mainRoom, tunnelRoom, startPos, endPos, hiddenOffset, width, height, length } = this.config;
//         const color = this.config.color || [0.1, 0.1, 0.1, 1];
//         const thickness = this.config.wallThickness || 0.2;

//         const halfW = width / 2;
//         const halfH = height / 2;
//         const halfL = length / 2;
        
//         // --- 1. BUILD INTERIOR GEOMETRY (Hidden Room) ---
//         const midZ = hiddenOffset[2] - halfL;

//         const floorPos: Vec3 = [hiddenOffset[0], hiddenOffset[1] - halfH, midZ];
//         const ceilPos: Vec3 = [hiddenOffset[0], hiddenOffset[1] + halfH, midZ];
//         const horizScale: Vec3 = [width, thickness, length];

//         const leftPos: Vec3 = [hiddenOffset[0] - halfW, hiddenOffset[1], midZ];
//         const rightPos: Vec3 = [hiddenOffset[0] + halfW, hiddenOffset[1], midZ];
//         const vertScale: Vec3 = [thickness, height, length];

//         scene.addBox({ pos: floorPos, scale: horizScale, mult: color, room: tunnelRoom });
//         scene.addBox({ pos: ceilPos, scale: horizScale, mult: color, room: tunnelRoom });
//         scene.addBox({ pos: leftPos, scale: vertScale, mult: color, room: tunnelRoom });
//         scene.addBox({ pos: rightPos, scale: vertScale, mult: color, room: tunnelRoom });

//         // --- 2. BUILD EXTERIOR GEOMETRY (Main Room) ---
//         // Calculate the physical span of the tunnel in the main universe
//         const extLength = Math.abs(endPos[2] - startPos[2]);
//         const extMidZ = (startPos[2] + endPos[2]) / 2;
//         const extY = startPos[1]; // Assuming level ground between start and end

//         // Push walls outward by half the thickness so the inner clear width matches `width`
//         const extLeftPos: Vec3 = [startPos[0] - halfW - (thickness / 2), extY, extMidZ];
//         const extRightPos: Vec3 = [startPos[0] + halfW + (thickness / 2), extY, extMidZ];
//         const extRoofPos: Vec3 = [startPos[0], extY + halfH + (thickness / 2), extMidZ];

//         const extSideScale: Vec3 = [thickness, height, extLength];
//         const extRoofScale: Vec3 = [width + (thickness * 2), thickness, extLength];

//         // Add the exterior shell to the Main Room
//         scene.addBox({ pos: extLeftPos, scale: extSideScale, mult: color, room: mainRoom });
//         scene.addBox({ pos: extRightPos, scale: extSideScale, mult: color, room: mainRoom });
//         scene.addBox({ pos: extRoofPos, scale: extRoofScale, mult: color, room: mainRoom });

//         if (init) {
//             const entryPortal = new Portal(
//                 mainRoom, startPos,
//                 tunnelRoom, hiddenOffset,
//                 startPos[2], hiddenOffset[2],
//                 -1, width
//             );
            
//             const tunnelEndPos: Vec3 = [hiddenOffset[0], hiddenOffset[1], hiddenOffset[2] - length];
//             const exitPortal = new Portal(
//                 mainRoom, endPos,
//                 tunnelRoom, tunnelEndPos,
//                 endPos[2], tunnelEndPos[2],
//                 1, width
//             );

//             scene.addPortal(entryPortal);
//             scene.addPortal(exitPortal);
//         }
//     }
// }