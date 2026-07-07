import { Mat4 } from '../math/Mat4';
import wgsl from './core.wgsl?raw';
import { loadGltfMeshData, type MeshData } from './GltfLoader';

type RenderModel = {
    model: Float32Array;
    mult: number[];
    meshId: string;
    portalIndex?: number;
};

type MeshResources = {
    vertexBuffer: GPUBuffer;
    colorBuffer: GPUBuffer;
    indexBuffer?: GPUBuffer;
    indexCount: number;
    indexFormat?: GPUIndexFormat;
};

export class Engine {
    canvas: HTMLCanvasElement;
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;
    pipeline!: GPURenderPipeline;
    
    meshes: Map<string, MeshResources> = new Map();
    
    cameraUniformBuffer!: GPUBuffer;
    cameraBindGroup!: GPUBindGroup;

    depthTexture!: GPUTexture;
    depthTextureView!: GPUTextureView;

    modelBindGroups: Map<string, { buffer: GPUBuffer, bindGroup: GPUBindGroup }> = new Map();
    
    dummyTextureView!: GPUTextureView; 

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async init() {
        if (!navigator.gpu) throw new Error("WebGPU not supported");

        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter!.requestDevice();
        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({ device: this.device, format: this.format, alphaMode: 'premultiplied' });

        const shaderModule = this.device.createShaderModule({ code: wgsl });
        this.pipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [
                    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 16, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }] }
                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format: this.format }]
            },
            primitive: { topology: 'triangle-list', cullMode: 'back' },
            depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
        });

        // Create a 1x1 dummy texture for normal objects
        const dummyTex = this.device.createTexture({
            size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING
        });
        this.dummyTextureView = dummyTex.createView();

        this.initBuffers();
        await this.loadBuiltinMeshes();
        this.resize(this.canvas.width, this.canvas.height);
    }

    createRenderTarget(width: number, height: number) {
        const texture = this.device.createTexture({
            size: [width, height],
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        return { texture, view: texture.createView() };
    }

    initBuffers() {
        const positions = new Float32Array([
            -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
            -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,  -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
            -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
             0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
            -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5, -0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
        ]);

        const faceColors = [
            [0.7, 0.7, 0.7, 1.0], // Front
            [0.7, 0.7, 0.7, 1.0], // Back
            [0.5, 0.5, 0.5, 1.0], // Top
            [0.5, 0.5, 0.5, 1.0], // Bottom
            [0.9, 0.9, 0.9, 1.0], // Right
            [0.9, 0.9, 0.9, 1.0], // Left
        ];
        const colors = new Float32Array(36 * 4);
        for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) colors.set(faceColors[j], (j * 6 + i) * 4);

        this.meshes.set('box', {
            vertexBuffer: this.createBuffer(positions, GPUBufferUsage.VERTEX),
            colorBuffer: this.createBuffer(colors, GPUBufferUsage.VERTEX),
            indexCount: 36
        });

        this.cameraUniformBuffer = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.cameraBindGroup = this.device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.cameraUniformBuffer } }] });
    }

    async loadBuiltinMeshes() {
        await Promise.all([
            this.loadMesh('blahaj', new URL('../assets/blahaj.glb', import.meta.url).href),
            this.loadMesh('billy-small', new URL('../assets/ikea_billy_small.glb', import.meta.url).href),
        ]);
    }

    async loadMesh(meshId: string, url: string) {
        const meshData = await loadGltfMeshData(url);
        this.meshes.set(meshId, this.createMeshResources(meshData));
    }

    createMeshResources(meshData: MeshData): MeshResources {
        const positionBuffer = this.createBuffer(meshData.positions, GPUBufferUsage.VERTEX);
        const colorBuffer = this.createBuffer(meshData.colors, GPUBufferUsage.VERTEX);
        const indexBuffer = this.device.createBuffer({
            size: meshData.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(indexBuffer.getMappedRange()).set(new Uint8Array(meshData.indices.buffer, meshData.indices.byteOffset, meshData.indices.byteLength));
        indexBuffer.unmap();

        return {
            vertexBuffer: positionBuffer,
            colorBuffer,
            indexBuffer,
            indexCount: meshData.indices.length,
            indexFormat: meshData.indexFormat,
        };
    }

    createBuffer(data: Float32Array, usage: number) {
        const buffer = this.device.createBuffer({ size: data.byteLength, usage: usage | GPUBufferUsage.COPY_DST, mappedAtCreation: true });
        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();
        return buffer;
    }

    resize(width: number, height: number) {
        if (!this.device || width === 0 || height === 0) return;
        if (this.depthTexture) this.depthTexture.destroy();

        this.depthTexture = this.device.createTexture({ size: [width, height], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
        this.depthTextureView = this.depthTexture.createView();
    }

    render(
            projMatrix: Float32Array, 
            viewMatrix: Float32Array, 
            models: RenderModel[], 
            targetView?: GPUTextureView, 
            portalViews?: GPUTextureView[]
        ) {
            if (!this.device) return;

            const viewProj = Mat4.multiply(projMatrix, viewMatrix);
            this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, viewProj);

            const commandEncoder = this.device.createCommandEncoder();
            const pass = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: targetView || this.context.getCurrentTexture().createView(),
                    clearValue: { r: 0.1, g: 0.6, b: 1, a: 1.0 },
                    loadOp: 'clear', storeOp: 'store'
                }],
                depthStencilAttachment: { view: this.depthTextureView, depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store' }
            });

            pass.setPipeline(this.pipeline);
            pass.setBindGroup(0, this.cameraBindGroup);
            const dummyMesh = this.meshes.get('box');
            if (!dummyMesh) {
                return;
            }

            const pBindGroups = (portalViews || []).map(view => 
                this.device.createBindGroup({
                    layout: this.pipeline.getBindGroupLayout(2),
                    entries: [{ binding: 0, resource: view }]
                })
            );
            
            const dummyPBindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(2),
                entries: [{ binding: 0, resource: this.dummyTextureView }]
            });

            models.forEach((box, i) => {
                const mesh = this.meshes.get(box.meshId) ?? dummyMesh;
                let cache = this.modelBindGroups.get(i.toString());
                if (!cache) {
                    const buffer = this.device.createBuffer({
                        size: 96,
                        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                    });
                    const bindGroup = this.device.createBindGroup({
                        layout: this.pipeline.getBindGroupLayout(1),
                        entries: [{ binding: 0, resource: { buffer } }]
                    });
                    cache = { buffer, bindGroup };
                    this.modelBindGroups.set(i.toString(), cache);
            }

            this.device.queue.writeBuffer(cache.buffer, 0, box.model);
            this.device.queue.writeBuffer(cache.buffer, 64, new Float32Array(box.mult));
            
            if (box.portalIndex !== undefined && box.portalIndex >= 0 && box.portalIndex < pBindGroups.length) {
                this.device.queue.writeBuffer(cache.buffer, 80, new Float32Array([1, 0, 0, 0])); // isPortal = true
                pass.setBindGroup(2, pBindGroups[box.portalIndex]);
            } else {
                this.device.queue.writeBuffer(cache.buffer, 80, new Float32Array([0, 0, 0, 0])); // isPortal = false
                pass.setBindGroup(2, dummyPBindGroup);
            }

            pass.setBindGroup(1, cache.bindGroup);
            pass.setVertexBuffer(0, mesh.vertexBuffer);
            pass.setVertexBuffer(1, mesh.colorBuffer);
            if (mesh.indexBuffer) {
                pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat ?? 'uint16');
                pass.drawIndexed(mesh.indexCount, 1, 0, 0, 0);
            } else {
                pass.draw(mesh.indexCount, 1, 0, 0);
            }
        });

        pass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}