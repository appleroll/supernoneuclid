//! COMMENTED CODE IN THIS FILE ARE AI-GENERATED DEMO SCRIPTS
// They are meant to serve as a reference in case I would need to use similar features in the future

import { Scene } from './Scene';
// import { Tunnel } from '../noneuclideans/Tunnel';
import { IKEAShell } from '../noneuclideans/Room'; 
import { Vec3 } from '../math/Vec3';
import { ikeaColours } from '../colour/IKEAColours';
import { addShelving } from './Shelving';

// const ROOM_B_Z_OFFSET = 7; 
// const ROOM_C_Z_OFFSET = -10; 

export function buildWorld1(init: boolean, existingScene?: Scene): Scene {
    const scene = existingScene || new Scene();

    const worldGeometry = [
        { pos: [0, -0.5, 10] as Vec3, scale: [500, 1, 500] as Vec3, mult: [0.2, 1, 0.2, 1], room: 'Null' },

        // /// TUNNEL 1 REFERENCE BLOCKS
        // { pos: [0, 0.5, -15] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },
        // { pos: [0, 0.5, 5] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },

        // /// TUNNEL 2 REFERENCE BLOCKS
        // { pos: [15, 0.5, -15] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' },
        // { pos: [15, 0.5, 5] as Vec3, scale: [1, 2, 1] as Vec3, mult: [0.8, 0.2, 0.2, 1], room: 'Null' }        
    ];

    // // Restored your original Tunnel 1
    // const secretTunnel = new Tunnel({
    //     mainRoom: 'A',
    //     tunnelRoom: 'B',
    //     startPos: [0, 1.5, 0],         
    //     endPos: [0, 1.5, -10],         
    //     hiddenOffset: [100, 1.5, 0],   
    //     width: 4,                      
    //     height: 3,                  
    //     length: 3,                     
    //     wallThickness: 0.2,
    //     color: [0.2, 0.1, 0.1, 1] 
    // });

    // // Restored your original Tunnel 2
    // const secretTunnel2 = new Tunnel({
    //     mainRoom: 'A',
    //     tunnelRoom: 'C',
    //     startPos: [15, 1.5, 0],         
    //     endPos: [15, 1.5, -10],         
    //     hiddenOffset: [115, 1.5, 0],   
    //     width: 4,                      
    //     height: 3,                  
    //     length: 20,                     
    //     wallThickness: 0.2,
    //     color: [0.2, 0.1, 0.1, 1] 
    // });

    // ?landmark ?bookmark Outer IKEA Shell
    const ikeashell = new IKEAShell({
        mainRoom: 'A',
        roomNames: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'],
        centerPos: [0, 6.5, -30],
        quadrantSize: 25,
        height: 13,

        hiddenOffsets: [
            [-100, 0, 0],   // Q1
            [-100, 0, -20], // Q2
            [-100, 0, -40], // Q3
            [-100, 0, -60], // Q4
            [-100, 0, -80], // Q5
            [-100, 0, -100],// Q6
            [-100, 0, -120],// Q7
            [-100, 0, -140] // Q8
        ],

        // white interior
        colors: [
            ikeaColours.white, // Q1
            ikeaColours.white, // Q2
            ikeaColours.white, // Q3
            ikeaColours.white, // Q4
            ikeaColours.white, // Q5
            ikeaColours.white, // Q6
            ikeaColours.white, // Q7
            ikeaColours.white  // Q8
        ]
    });

    if (init) {
        worldGeometry.forEach(b => scene.addBox({ ...b, room: 'A' }));
        // ?bookmark ?landmark Storage Self Serve Area No 2 (Q7)
        // ?landmark first row, nearest to yellow entrance
        addShelving(
            scene,
            "Q7",
            -87, -97,      // x range
            1,             // y
            -153, -157,    // z range
            4, 3, 1,       // shelf width, height, depth
            1, 3           // x spacing, z spacing
        );

        // ?landmark second row, opposite first row in Q7
        addShelving(
            scene,
            "Q7",
            -87, -97,
            1,
            -167, -171,
            4, 3, 1,
            1, 3
        );

        // Extra two shelves on the left
        addShelving(
            scene,
            "Q7",
            -82, -77,
            1,
            -167, -171,
            4, 3, 1,
            1, 3
        );

        // ?bookmark ?landmark Storage Self Serve Area No 1 (Q6)
        // ?landmark first row, nearest to yellow entrance
        addShelving(
            scene,
            "Q6",
            -102, -112,
            1,
            -147, -151,
            4, 3, 1,
            1, 3
        );

        // ?landmark second row, opposite first row in Q6
        addShelving(
            scene,
            "Q6",
            -102, -112,
            1,
            -133, -137,
            4, 3, 1,
            1, 3
        );

        // // 2. Build Room B (Compresses space)
        // worldGeometry.forEach(b => {
        //     const zOffset = b.pos[2] > -5 ? 0 : ROOM_B_Z_OFFSET;
        //     scene.addBox({
        //         pos: [b.pos[0] + 100, b.pos[1], b.pos[2] + zOffset] as Vec3,
        //         scale: b.scale, 
        //         mult: b.mult, 
        //         room: 'B'
        //     });
        // });

        // // 3. Build Room C
        // worldGeometry.forEach(b => {
        //     const zOffset = b.pos[2] > -5 ? 0 : ROOM_C_Z_OFFSET;
        //     scene.addBox({
        //         pos: [b.pos[0] + 115, b.pos[1], b.pos[2] + zOffset] as Vec3,
        //         scale: b.scale, 
        //         mult: b.mult, 
        //         room: 'C'
        //     });
        // });
    }

    // secretTunnel.addToScene(scene, init);
    // secretTunnel2.addToScene(scene, init);
    ikeashell.addToScene(scene, init); 
    
    return scene;
}