import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { InputManager } from '../input/InputManager';

export class Camera {
    pos: Vec3 = [0, 1.5, 5];
    prevPos: Vec3 = [0, 1.5, 5];
    yaw = 0;
    pitch = 0;
    forward: Vec3 = [0, 0, -1];

    update(dt: number, input: InputManager) {
        this.prevPos = [...this.pos] as Vec3;

        // Mouse look
        const { mx, my } = input.getMouseDelta();
        this.yaw -= mx * 0.002;
        this.pitch -= my * -0.002;
        this.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, this.pitch));

        // Calculate direction vectors
        this.forward = [
            Math.cos(this.pitch) * Math.sin(this.yaw),
            Math.sin(this.pitch),
            Math.cos(this.pitch) * Math.cos(this.yaw)
        ];
        const right: Vec3 = [Math.cos(this.yaw), 0, -Math.sin(this.yaw)];
        
        let moveFwd: Vec3 = [this.forward[0], 0, this.forward[2]];
        if (moveFwd[0] !== 0 || moveFwd[2] !== 0) moveFwd = Vec3.normalize(moveFwd);

        // Keyboard movement
        if (input.isKeyDown('shift')) {
            if (input.isKeyDown('w')) { 
                this.pos = Vec3.sub(this.pos, Vec3.mul(moveFwd, dt * 7));
                this.pos[1] = 1.5 + Math.sin(Date.now() * 0.02) * 0.05;
            }
            if (input.isKeyDown('s')) this.pos = Vec3.add(this.pos, Vec3.mul(moveFwd, dt * 7));
            if (input.isKeyDown('a')) this.pos = Vec3.sub(this.pos, Vec3.mul(right, dt * 7));
            if (input.isKeyDown('d')) this.pos = Vec3.add(this.pos, Vec3.mul(right, dt * 7));
        } else if (input.isKeyDown('q')) {
            // debug mode: move faster
            // ?todo comment out when shipping
            if (input.isKeyDown('w')) this.pos = Vec3.sub(this.pos, Vec3.mul(moveFwd, dt * 15));
            if (input.isKeyDown('s')) this.pos = Vec3.add(this.pos, Vec3.mul(moveFwd, dt * 15));
            if (input.isKeyDown('a')) this.pos = Vec3.sub(this.pos, Vec3.mul(right, dt * 15));
            if (input.isKeyDown('d')) this.pos = Vec3.add(this.pos, Vec3.mul(right, dt * 15));
        }
        else {
            if (input.isKeyDown('w')) {
                this.pos = Vec3.sub(this.pos, Vec3.mul(moveFwd, dt * 5));
                // move player up and down in a sine wave
                this.pos[1] = 1.5 + Math.sin(Date.now() * 0.015) * 0.07;
            }
            if (input.isKeyDown('s')) this.pos = Vec3.add(this.pos, Vec3.mul(moveFwd, dt * 5));
            if (input.isKeyDown('a')) this.pos = Vec3.sub(this.pos, Vec3.mul(right, dt * 5));
            if (input.isKeyDown('d')) this.pos = Vec3.add(this.pos, Vec3.mul(right, dt * 5));
        }
    }

    getViewMatrix(): Float32Array {
        return Mat4.lookAt(this.pos, Vec3.sub(this.pos, this.forward), [0, 1, 0]);
    }

    getVirtualViewMatrix(virtualPos: Vec3): Float32Array {
        return Mat4.lookAt(virtualPos, Vec3.sub(virtualPos, this.forward), [0, 1, 0]);
    }
}