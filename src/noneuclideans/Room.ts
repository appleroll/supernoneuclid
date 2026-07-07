import { Vec3 } from '../math/Vec3';
import { Portal } from './Portal';
import { Scene } from '../world/Scene';
import { ikeaColours } from '../colour/IKEAColours';
import { addPallettes } from '../world/Pallettes';

export interface IKEAShellConfig {
    mainRoom: string;
    roomNames: string[]; // Array of 8 strings
    centerPos: Vec3;     // The exact physical center of the cross partition
    quadrantSize: number; // Width/Depth of a single quadrant (Total box is 2x this)
    height: number;
    hiddenOffsets: Vec3[]; // 8 distant coordinates to hide the geometry
    colors: number[][];
}

export class IKEAShell {
    private config: IKEAShellConfig;

    constructor(config: IKEAShellConfig) {
        this.config = config;
    }

    addToScene(scene: Scene, init: boolean) {
        const { mainRoom, roomNames, centerPos, quadrantSize: S, height, hiddenOffsets, colors} = this.config;
        const T = 0.2; // Wall thickness
        const cx = centerPos[0];
        const cy = centerPos[1];
        const cz = centerPos[2];

        const extColor = ikeaColours.blue;
        scene.addBox({ pos: [cx - S - T/2, cy, cz], scale: [T, height, S*2], mult: extColor, room: mainRoom }); // West wall
        scene.addBox({ pos: [cx + S + T/2, cy, cz], scale: [T, height, S*2], mult: extColor, room: mainRoom }); // East wall
        scene.addBox({ pos: [cx, cy, cz - S - T/2], scale: [S*2, height, T], mult: extColor, room: mainRoom }); // North wall
        scene.addBox({ pos: [cx, cy + height/2 + T/2, cz], scale: [S*2, T, S*2], mult: extColor, room: mainRoom });
        scene.addBox({ pos: [cx + S/2, cy, cz + S + T/2], scale: [S, height, T], mult: extColor, room: mainRoom });

        const quadCenters = [
            [-S/2, S/2],  // SW
            [-S/2, -S/2], // NW
            [S/2, -S/2],  // NE
            [S/2, S/2]    // SE
        ];

        for (let i = 0; i < 8; i++) {
            const room = roomNames[i];
            const offset = hiddenOffsets[i];
            const color = colors[i];
            const quadIdx = i % 4;
            
            const qx = cx + quadCenters[quadIdx][0];
            const qz = cz + quadCenters[quadIdx][1];
            
            const vx = qx + offset[0];
            const vy = cy + offset[1];
            const vz = qz + offset[2];

            // Floor & Ceiling for this quadrant
            if (room !== "Q6" && room !== "Q7") { // Q6 and Q7 are storage areas, so they should be concrete
                scene.addBox({ pos: [vx, vy - height/2, vz], scale: [S, T, S], mult: color, room: room });
                scene.addBox({ pos: [vx, vy + height/2, vz], scale: [S, T, S], mult: color, room: room });
            } else {
                scene.addBox({ pos: [vx, vy - height/2, vz], scale: [S, T, S], mult: ikeaColours.concrete, room: room });
                scene.addBox({ pos: [vx, vy + height/2, vz], scale: [S, T, S], mult: ikeaColours.concrete, room: room });
            }

            // here we add another ceiling bc ikea is split into different floors, and lets just make it so IKEA is on the ground floor
            // here we pose some questions
            // 1. how high is IKEA?
            // 2. does American IKEA differ from our Aussie one?

            scene.addBox({ pos: [vx, vy + height/2 - 7, vz], scale: [S, T, S], mult: color, room: room });

            if (quadIdx === 0) { // SW: Add West and South outer walls
                scene.addBox({ pos: [vx - S/2, vy, vz], scale: [T, height, S], mult: color, room: room });
                if (i !== 0) {
                    scene.addBox({ pos: [vx, vy, vz + S/2], scale: [S, height, T], mult: color, room: room });
                } else {
                    // ?bookmark ?landmark IKEA ENTRANCE
                    // based on image https://c8.alamy.com/comp/F4MMND/entrance-of-ikea-springvale-victoria-australia-F4MMND.jpg
                    const ikeaYellow = ikeaColours.yellow;
                    scene.addBox({ pos: [vx - S/4, vy, vz + S/2], scale: [S/2, height, T], mult: extColor, room: room });
                    scene.addBox({ pos: [vx + S/4, vy + height/2 + 0.125, vz + S/2], scale: [S/2, height, T], mult: extColor, room: room });
                    scene.addBox({ pos: [vx + S/4, vy - 1, vz + S/2], scale: [S/2, height/8 + 1, T + 0.1], mult: ikeaYellow, room: room });
                    scene.addBox({ pos: [vx + S/4 - 5.25, -2, vz + S/2], scale: [2, height, T + 0.1], mult: ikeaYellow, room: room });
                }
            }
            if (quadIdx === 1) { // NW: Add West and North outer walls
                scene.addBox({ pos: [vx - S/2, vy, vz], scale: [T, height, S], mult: color, room: room });
                scene.addBox({ pos: [vx, vy, vz - S/2], scale: [S, height, T], mult: color, room: room });
            }
            if (quadIdx === 2) { // NE: Add East and North outer walls
                scene.addBox({ pos: [vx + S/2, vy, vz], scale: [T, height, S], mult: color, room: room });
                scene.addBox({ pos: [vx, vy, vz - S/2], scale: [S, height, T], mult: color, room: room });
            }
            if (quadIdx === 3) { // SE: Add East and South outer walls
                scene.addBox({ pos: [vx + S/2, vy, vz], scale: [T, height, S], mult: color, room: room });
                scene.addBox({ pos: [vx, vy, vz + S/2], scale: [S, height, T], mult: color, room: room });
            }

            scene.addBox({ pos: [cx + offset[0], vy, cz + offset[2]], scale: [0.4, height, 0.4], mult: color, room: room });

            // // ?landmark ?bookmark Add the inner walls that partition the quadrants
            // Q1 (SW)
            if (quadIdx === 0) {
                // Vertical wall: pillar -> south
                scene.addBox({
                    pos: [cx + offset[0], vy, cz + S / 4 + offset[2]],
                    scale: [T, height, S / 2],
                    mult: color,
                    room: room
                });

                // Horizontal wall: pillar -> west
                scene.addBox({
                    pos: [cx - S / 4 + offset[0], vy, cz + offset[2]],
                    scale: [S / 2, height, T],
                    mult: color,
                    room: room
                });
            }

            // Q2 (NW)
            if (quadIdx === 1) {
                // // Vertical wall: pillar -> north
                // ?note Removed wall to fit IKEA storage bay
                // scene.addBox({
                //     pos: [cx + offset[0], vy, cz - S / 4 + offset[2]],
                //     scale: [T, height, S / 2],
                //     mult: color,
                //     room: room
                // });

                // Horizontal wall: pillar -> west
                scene.addBox({
                    pos: [cx - S / 4 + offset[0], vy, cz + offset[2]],
                    scale: [S / 2, height, T],
                    mult: color,
                    room: room
                });
            }

            // // Q3 (NE)
            if (quadIdx === 2) {
                // // // Vertical wall: pillar -> north
                // ?note Removed wall to fit the IKEA storage bay
                // scene.addBox({
                //     pos: [cx + offset[0], vy, cz - S / 4 + offset[2]],
                //     scale: [T, height, S / 2],
                //     mult: color,
                //     room: room
                // });

                // Horizontal wall: pillar -> east
                scene.addBox({
                    pos: [cx + S / 4 + offset[0], vy, cz + offset[2]],
                    scale: [S / 2, height, T],
                    mult: color,
                    room: room
                });
            }

            // Q4 (SE)
            if (quadIdx === 3) {
                // Vertical wall: pillar -> south
                scene.addBox({
                    pos: [cx + offset[0], vy, cz + S / 4 + offset[2]],
                    scale: [T, height, S / 2],
                    mult: color,
                    room: room
                });

                // Horizontal wall: pillar -> east
                scene.addBox({
                    pos: [cx + S / 4 + offset[0], vy, cz + offset[2]],
                    scale: [S / 2, height, T],
                    mult: color,
                    room: room
                });
            }
            addPallettes(scene, room, vx, vz);
}

        if (init) {
            // ?landmark ?bookmark Add the portal that connects the main room to the first quadrant (Q1)
            // ie. the entrance portal
            const entrancePhysical: Vec3 = [cx - S/2, cy, cz + S];
            const entranceVirtual: Vec3 = [cx - S/2 + hiddenOffsets[0][0] - 0.1, cy, cz + S + hiddenOffsets[0][2]];
            
            scene.addPortal(new Portal(
                mainRoom, 
                entrancePhysical,
                roomNames[0], 
                entranceVirtual,
                entrancePhysical[2], 
                entranceVirtual[2],
                -1, 
                S, 
                height, 
                'Z'
            ));

            // The doorways that connect the quadrants (Clockwise)
            const doorways = [
                { axis: 'Z' as const, dir: -1 as const, pos: [-S/2, 0] }, // SW -> NW
                { axis: 'X' as const, dir:  1 as const, pos: [0, -S/2] }, // NW -> NE
                { axis: 'Z' as const, dir:  1 as const, pos: [S/2, 0] },  // NE -> SE
                { axis: 'X' as const, dir: -1 as const, pos: [0, S/2] }   // SE -> SW
            ];

            // Connect Room i to Room i+1
            for (let i = 0; i < 8; i++) {
                const nextI = (i + 1) % 8;
                const door = doorways[i % 4];

                const doorPhysX = cx + door.pos[0];
                const doorPhysZ = cz + door.pos[1];

                const posA: Vec3 = [doorPhysX + hiddenOffsets[i][0], cy, doorPhysZ + hiddenOffsets[i][2]];
                const posB: Vec3 = [doorPhysX + hiddenOffsets[nextI][0], cy, doorPhysZ + hiddenOffsets[nextI][2]];

                const triggerA = door.axis === 'X' ? cx + hiddenOffsets[i][0] : cz + hiddenOffsets[i][2];
                const triggerB = door.axis === 'X' ? cx + hiddenOffsets[nextI][0] : cz + hiddenOffsets[nextI][2];

                scene.addPortal(new Portal(
                    roomNames[i], 
                    posA,
                    roomNames[nextI], 
                    posB,
                    triggerA, 
                    triggerB,
                    door.dir, 
                    S, 
                    height,
                    door.axis
                ));
            }
        }
    }
}