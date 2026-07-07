import { Vec3 } from './Vec3';

export const Mat4 = {
    identity: () => new Float32Array([
        1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1
    ]),
    multiply: (a: Float32Array, b: Float32Array) => {
        const out = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[i + j*4] = a[i + 0*4]*b[0 + j*4] + a[i + 1*4]*b[1 + j*4] + a[i + 2*4]*b[2 + j*4] + a[i + 3*4]*b[3 + j*4];
            }
        }
        return out;
    },
    translation: (t: Vec3) => new Float32Array([
        1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1
    ]),
    scaling: (s: Vec3) => new Float32Array([
        s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1
    ]),
    rotationX: (angle: number) => {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            1,0,0,0,
            0,c,s,0,
            0,-s,c,0,
            0,0,0,1
        ]);
    },
    rotationY: (angle: number) => {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c,0,-s,0,
            0,1,0,0,
            s,0,c,0,
            0,0,0,1
        ]);
    },
    rotationZ: (angle: number) => {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c,s,0,0,
            -s,c,0,0,
            0,0,1,0,
            0,0,0,1
        ]);
    },
    rotation: (r: Vec3) => Mat4.multiply(Mat4.multiply(Mat4.rotationZ(r[2]), Mat4.rotationY(r[1])), Mat4.rotationX(r[0])),
    perspective: (fov: number, aspect: number, near: number, far: number) => {
        const f = 1.0 / Math.tan(fov / 2);
        return new Float32Array([
            f/aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far+near)/(near-far), -1,
            0, 0, (2*far*near)/(near-far), 0
        ]);
    },
    lookAt: (eye: Vec3, center: Vec3, up: Vec3) => {
        const f = Vec3.normalize(Vec3.sub(center, eye));
        const s = Vec3.normalize(Vec3.cross(f, up));
        const u = Vec3.cross(s, f);
        return new Float32Array([
            s[0], u[0], -f[0], 0,
            s[1], u[1], -f[1], 0,
            s[2], u[2], -f[2], 0,
            -s[0]*eye[0] - s[1]*eye[1] - s[2]*eye[2],
            -u[0]*eye[0] - u[1]*eye[1] - u[2]*eye[2],
             f[0]*eye[0] + f[1]*eye[1] + f[2]*eye[2],
            1
        ]);
    }
};