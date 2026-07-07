import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Camera } from './Camera';
import { Portal } from '../noneuclideans/Portal';

export interface RenderItem {
    pos: Vec3;
    scale: Vec3;
    mult: number[];
    room: string;
    meshId?: string;
    rotation?: Vec3;
}

export interface RenderModel {
    model: Float32Array;
    mult: number[];
    meshId: string;
    portalIndex?: number;
}

export class Scene {
    public boxes: RenderItem[] = [];
    public portals: Portal[] = [];
    public activeRoom: string = 'A';

    addBox(box: RenderItem) {
        this.boxes.push({ meshId: 'box', rotation: [0, 0, 0], ...box });
    }

    addMesh(item: RenderItem & { meshId: string }) {
        this.boxes.push({ rotation: [0, 0, 0], ...item });
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

            const models: RenderModel[] = [];
            const activePortals = this.portals.filter(p => p.roomA === room || p.roomB === room);

            this.boxes.filter(b => b.room === room).forEach(b => {
                models.push({ 
                    model: Mat4.multiply(
                        Mat4.multiply(Mat4.translation(b.pos), Mat4.rotation(b.rotation ?? [0, 0, 0])),
                        Mat4.scaling(b.scale)
                    ),
                    mult: b.mult,
                    meshId: b.meshId ?? 'box'
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
                    models.push({ model: portalModelMatrix, mult: [0.8, 0.8, 0.8, 1.0], meshId: 'box' });
                } else {
                    models.push({ model: portalModelMatrix, mult: [1, 1, 1, 1], portalIndex: innerTextureIndex, meshId: 'box' });
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