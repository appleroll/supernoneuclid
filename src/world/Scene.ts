import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Camera } from './Camera';
import { Portal } from '../noneuclideans/Portal';

export interface RenderBox {
    pos: Vec3;
    scale: Vec3;
    mult: number[];
    room: string;
}

export class Scene {
    public boxes: RenderBox[] = [];
    public portals: Portal[] = [];
    public activeRoom: string = 'A';

    addBox(box: RenderBox) {
        this.boxes.push(box);
    }

    addPortal(portal: Portal) {
        this.portals.push(portal);
    }

    updateTeleportation(camera: Camera) {
        for (const portal of this.portals) {
            const newRoom = portal.checkCrossing(camera, this.activeRoom);
            if (newRoom) {
                console.log(`Teleported from room ${this.activeRoom} to room ${newRoom}`);
                this.activeRoom = newRoom;
                break; // Only allow crossing one portal per frame
            }
        }
    }

    getRenderJobs(camera: Camera, maxDepth: number = 2) {
        const jobs: any[] = [];
        let textureCount = 0;

        // Recursive function to explore rooms from the inside out
        const buildRoom = (room: string, camPos: Vec3, depth: number, incomingPortal?: Portal): number => {
            if (depth === 0) return -1; // means we hit the depth limit

            const models: any[] = [];
            const activePortals = this.portals.filter(p => p.roomA === room || p.roomB === room);

            this.boxes.filter(b => b.room === room).forEach(b => {
                models.push({ 
                    model: Mat4.multiply(Mat4.translation(b.pos), Mat4.scaling(b.scale)), 
                    mult: b.mult 
                });
            });

            activePortals.forEach(portal => {
                if (portal === incomingPortal) return; // Prevent infinite loops by not looking back through the portal we just came from

                const isRoomA = room === portal.roomA;
                const currentPos = isRoomA ? portal.posA : portal.posB;
                const targetPos = isRoomA ? portal.posB : portal.posA;
                const virtualRoom = isRoomA ? portal.roomB : portal.roomA;

                const scaleX = portal.axis === 'X' ? 0.005 : portal.width;
                const scaleZ = portal.axis === 'X' ? portal.width : 0.005;
                const portalModelMatrix = Mat4.multiply(Mat4.translation(currentPos), Mat4.scaling([scaleX, portal.height, scaleZ]));

                // Shift the virtual camera
                const camOffset = Vec3.sub(camPos, currentPos);
                const virtualCamPos = Vec3.add(targetPos, camOffset);

                const innerTextureIndex = buildRoom(virtualRoom, virtualCamPos, depth - 1, portal);

                if (innerTextureIndex === -1) {
                    models.push({ model: portalModelMatrix, mult: [0.8, 0.8, 0.8, 1.0] });
                } else {
                    models.push({ model: portalModelMatrix, mult: [1, 1, 1, 1], portalIndex: innerTextureIndex });
                }
            });

            // If we are at the top level (no incoming portal), we render the main view. Otherwise, we render to a texture for the portal.
            if (!incomingPortal) {
                jobs.push({ isMain: true, view: camera.getViewMatrix(), models });
                return -1;
            } else {
                const myTextureIndex = textureCount++;
                jobs.push({ isMain: false, targetIndex: myTextureIndex, view: camera.getVirtualViewMatrix(camPos), models });
                return myTextureIndex;
            }
        };

        // Start building the scene from the active room
        buildRoom(this.activeRoom, camera.pos, maxDepth, undefined);

        return { jobs, totalTextures: textureCount };
    }
}