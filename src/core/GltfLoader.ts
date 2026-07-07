import { Mat4 } from '../math/Mat4';
import { Vec3 } from '../math/Vec3';

export interface MeshData {
    positions: Float32Array;
    colors: Float32Array;
    indices: Uint16Array | Uint32Array;
    indexFormat: GPUIndexFormat;
}

type GltfJson = {
    buffers?: { uri?: string; byteLength: number }[];
    bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
    accessors?: { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean }[];
    meshes?: { primitives?: { attributes: Record<string, number>; indices?: number }[] }[];
    nodes?: { mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] }[];
    scenes?: { nodes?: number[] }[];
    scene?: number;
};

const COMPONENTS_PER_TYPE: Record<string, number> = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT4: 16
};

function resolveUrl(baseUrl: string, relativePath: string) {
    return new URL(relativePath, baseUrl).href;
}

function componentSize(componentType: number) {
    switch (componentType) {
        case 5120:
        case 5121:
            return 1;
        case 5122:
        case 5123:
            return 2;
        case 5125:
        case 5126:
            return 4;
        default:
            throw new Error(`Unsupported glTF component type: ${componentType}`);
    }
}

function readComponent(view: DataView, offset: number, componentType: number, normalized = false) {
    switch (componentType) {
        case 5120:
            return normalized ? Math.max(view.getInt8(offset) / 127, -1) : view.getInt8(offset);
        case 5121:
            return normalized ? view.getUint8(offset) / 255 : view.getUint8(offset);
        case 5122:
            return normalized ? Math.max(view.getInt16(offset, true) / 32767, -1) : view.getInt16(offset, true);
        case 5123:
            return normalized ? view.getUint16(offset, true) / 65535 : view.getUint16(offset, true);
        case 5125:
            return view.getUint32(offset, true);
        case 5126:
            return view.getFloat32(offset, true);
        default:
            throw new Error(`Unsupported glTF component type: ${componentType}`);
    }
}

function parseGlb(arrayBuffer: ArrayBuffer) {
    const header = new DataView(arrayBuffer, 0, 12);
    const magic = header.getUint32(0, true);
    const version = header.getUint32(4, true);
    if (magic !== 0x46546c67 || version !== 2) {
        throw new Error('Not a GLB file');
    }

    let offset = 12;
    let jsonText = '';
    let binaryChunk: ArrayBuffer | undefined;

    while (offset < arrayBuffer.byteLength) {
        const chunkLength = new DataView(arrayBuffer, offset, 8).getUint32(0, true);
        const chunkType = new DataView(arrayBuffer, offset, 8).getUint32(4, true);
        offset += 8;
        const chunk = arrayBuffer.slice(offset, offset + chunkLength);
        offset += chunkLength;

        if (chunkType === 0x4e4f534a) {
            jsonText = new TextDecoder().decode(chunk).trim();
        } else if (chunkType === 0x004e4942) {
            binaryChunk = chunk;
        }
    }

    return { jsonText, binaryChunk };
}

async function loadJsonAndBuffers(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load model: ${url}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const arrayBuffer = await response.arrayBuffer();
    const isBinary = contentType.includes('model/gltf-binary') || new Uint32Array(arrayBuffer.slice(0, 4))[0] === 0x46546c67;

    if (isBinary) {
        const { jsonText, binaryChunk } = parseGlb(arrayBuffer);
        if (!jsonText) {
            throw new Error(`GLB file did not contain JSON: ${url}`);
        }
        return { gltf: JSON.parse(jsonText) as GltfJson, binaryChunk, baseUrl: url };
    }

    const text = new TextDecoder().decode(arrayBuffer);
    return { gltf: JSON.parse(text) as GltfJson, baseUrl: url };
}

async function loadBufferData(gltf: GltfJson, baseUrl: string, binaryChunk?: ArrayBuffer) {
    const buffers = gltf.buffers ?? [];
    return Promise.all(buffers.map(async (buffer, index) => {
        if (buffer.uri) {
            const response = await fetch(resolveUrl(baseUrl, buffer.uri));
            if (!response.ok) {
                throw new Error(`Failed to load glTF buffer: ${buffer.uri}`);
            }
            return response.arrayBuffer();
        }

        if (index === 0 && binaryChunk) {
            return binaryChunk;
        }

        throw new Error('Unsupported glTF buffer layout');
    }));
}

function getAccessorView(gltf: GltfJson, bufferData: ArrayBuffer[], accessorIndex: number) {
    const accessor = gltf.accessors?.[accessorIndex];
    if (!accessor) {
        throw new Error(`Missing accessor ${accessorIndex}`);
    }

    const bufferView = accessor.bufferView !== undefined ? gltf.bufferViews?.[accessor.bufferView] : undefined;
    if (!bufferView) {
        throw new Error(`Missing bufferView for accessor ${accessorIndex}`);
    }

    const source = bufferData[bufferView.buffer];
    if (!source) {
        throw new Error(`Missing buffer ${bufferView.buffer}`);
    }

    const componentCount = COMPONENTS_PER_TYPE[accessor.type];
    if (!componentCount) {
        throw new Error(`Unsupported glTF accessor type: ${accessor.type}`);
    }

    const stride = bufferView.byteStride ?? componentSize(accessor.componentType) * componentCount;
    const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    return { accessor, view: new DataView(source), offset, stride, componentCount };
}

function readAccessorValues(gltf: GltfJson, bufferData: ArrayBuffer[], accessorIndex: number): number[] {
    const { accessor, view, offset, stride, componentCount } = getAccessorView(gltf, bufferData, accessorIndex);
    const values: number[] = [];

    for (let i = 0; i < accessor.count; i++) {
        const elementOffset = offset + i * stride;
        for (let component = 0; component < componentCount; component++) {
            values.push(readComponent(view, elementOffset + component * componentSize(accessor.componentType), accessor.componentType, accessor.normalized));
        }
    }

    return values;
}

function readIndices(gltf: GltfJson, bufferData: ArrayBuffer[], accessorIndex: number): number[] {
    const { accessor, view, offset, stride } = getAccessorView(gltf, bufferData, accessorIndex);
    if (COMPONENTS_PER_TYPE[accessor.type] !== 1) {
        throw new Error('Index accessor must be scalar');
    }

    const indices: number[] = [];
    for (let i = 0; i < accessor.count; i++) {
        const elementOffset = offset + i * stride;
        indices.push(readComponent(view, elementOffset, accessor.componentType, accessor.normalized));
    }
    return indices;
}

function matrixFromNode(node: NonNullable<GltfJson['nodes']>[number]) {
    if (node.matrix && node.matrix.length === 16) {
        return new Float32Array(node.matrix);
    }

    const translation = node.translation ? [node.translation[0] ?? 0, node.translation[1] ?? 0, node.translation[2] ?? 0] as Vec3 : [0, 0, 0] as Vec3;
    const scale = node.scale ? [node.scale[0] ?? 1, node.scale[1] ?? 1, node.scale[2] ?? 1] as Vec3 : [1, 1, 1] as Vec3;

    const rotation = node.rotation ?? [0, 0, 0, 1];
    const x = rotation[0] ?? 0;
    const y = rotation[1] ?? 0;
    const z = rotation[2] ?? 0;
    const w = rotation[3] ?? 1;

    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;

    const rotationMatrix = new Float32Array([
        1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
        2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
        2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
        0, 0, 0, 1
    ]);

    return Mat4.multiply(Mat4.multiply(Mat4.translation(translation), rotationMatrix), Mat4.scaling(scale));
}

function transformPoint(matrix: Float32Array, point: [number, number, number]) {
    const x = point[0];
    const y = point[1];
    const z = point[2];
    return [
        matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
        matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
        matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
    ] as [number, number, number];
}

function readPrimitiveMesh(gltf: GltfJson, bufferData: ArrayBuffer[], primitive: { attributes: Record<string, number>; indices?: number }, transform: Float32Array) {
    const positionAccessorIndex = primitive.attributes.POSITION;
    if (positionAccessorIndex === undefined) {
        throw new Error('glTF primitive is missing POSITION');
    }

    const positionsSource = readAccessorValues(gltf, bufferData, positionAccessorIndex);
    const colorAccessorIndex = primitive.attributes.COLOR_0;
    const colorsSource = colorAccessorIndex !== undefined ? readAccessorValues(gltf, bufferData, colorAccessorIndex) : undefined;
    const positions: number[] = [];
    const colors: number[] = [];
    const vertexCount = positionsSource.length / 3;

    for (let i = 0; i < vertexCount; i++) {
        const sourceIndex = i * 3;
        const transformed = transformPoint(transform, [positionsSource[sourceIndex], positionsSource[sourceIndex + 1], positionsSource[sourceIndex + 2]]);
        positions.push(transformed[0], transformed[1], transformed[2]);

        if (colorsSource) {
            const colorIndex = i * (colorsSource.length / vertexCount);
            const r = colorsSource[colorIndex] ?? 1;
            const g = colorsSource[colorIndex + 1] ?? 1;
            const b = colorsSource[colorIndex + 2] ?? 1;
            const a = colorsSource[colorIndex + 3] ?? 1;
            colors.push(r, g, b, a);
        } else {
            colors.push(1, 1, 1, 1);
        }
    }

    const vertexOffset = 0;
    const indices = primitive.indices !== undefined ? readIndices(gltf, bufferData, primitive.indices) : Array.from({ length: vertexCount }, (_, i) => i);
    const maxIndex = Math.max(...indices, 0);
    const indexArray = maxIndex > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);

    if (vertexOffset !== 0) {
        for (let i = 0; i < indexArray.length; i++) {
            indexArray[i] += vertexOffset;
        }
    }

    return {
        positions,
        colors,
        indices: indexArray
    };
}

function traverseNode(gltf: GltfJson, bufferData: ArrayBuffer[], nodeIndex: number, parentMatrix: Float32Array, meshes: { positions: number[]; colors: number[]; indices: number[] }[]) {
    const node = gltf.nodes?.[nodeIndex];
    if (!node) {
        return;
    }

    const localMatrix = matrixFromNode(node);
    const worldMatrix = Mat4.multiply(parentMatrix, localMatrix);

    if (node.mesh !== undefined) {
        const mesh = gltf.meshes?.[node.mesh];
        if (!mesh?.primitives) {
            throw new Error(`Missing mesh ${node.mesh}`);
        }

        for (const primitive of mesh.primitives) {
            const primitiveMesh = readPrimitiveMesh(gltf, bufferData, primitive, worldMatrix);
            const vertexBase = meshes.reduce((count, item) => count + item.positions.length / 3, 0);
            const adjustedIndices = Array.from(primitiveMesh.indices, index => index + vertexBase);
            meshes.push({ positions: primitiveMesh.positions, colors: primitiveMesh.colors, indices: adjustedIndices });
        }
    }

    for (const child of node.children ?? []) {
        traverseNode(gltf, bufferData, child, worldMatrix, meshes);
    }
}

export async function loadGltfMeshData(url: string): Promise<MeshData> {
    const { gltf, binaryChunk, baseUrl } = await loadJsonAndBuffers(url);
    const bufferData = await loadBufferData(gltf, baseUrl, binaryChunk);
    const rootSceneIndex = gltf.scene ?? 0;
    const rootScene = gltf.scenes?.[rootSceneIndex];
    if (!rootScene) {
        throw new Error(`Missing glTF scene ${rootSceneIndex}`);
    }

    const primitiveMeshes: { positions: number[]; colors: number[]; indices: number[] }[] = [];
    for (const nodeIndex of rootScene.nodes ?? []) {
        traverseNode(gltf, bufferData, nodeIndex, Mat4.identity(), primitiveMeshes);
    }

    if (primitiveMeshes.length === 0) {
        throw new Error(`No renderable meshes found in ${url}`);
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    for (const mesh of primitiveMeshes) {
        positions.push(...mesh.positions);
        colors.push(...mesh.colors);
        indices.push(...mesh.indices.map(index => index + vertexOffset));
        vertexOffset += mesh.positions.length / 3;
    }

    const maxIndex = Math.max(...indices, 0);
    return {
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        indices: maxIndex > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
        indexFormat: maxIndex > 65535 ? 'uint32' : 'uint16'
    };
}
