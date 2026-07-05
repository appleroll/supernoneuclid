import { Engine } from './core/Engine';
import { Mat4 } from './math/Mat4';
import { InputManager } from './input/InputManager';
import { Camera } from './world/Camera';
import { buildWorld1 } from './world/world1';
import { currentGameState } from './states/GameState';

async function main() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new Engine(canvas);
    await engine.init();

    const input = new InputManager(canvas);
    const camera = new Camera();
    
    const scene = buildWorld1(true);

    let portalTargets: { texture: GPUTexture, view: GPUTextureView }[] = [];

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        engine.resize(canvas.width, canvas.height);
        
        // Destroy old textures to prevent memory leaks
        portalTargets.forEach(target => target.texture.destroy());
        portalTargets = []; 
    });

    let lastTime = performance.now();
    
    function loop(time: number) {
        if (currentGameState === "playing") {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            camera.update(dt, input);
            scene.updateTeleportation(camera);

            const projMatrix = Mat4.perspective(
                Math.PI / 3,
                canvas.width / canvas.height,
                0.001,
                100
            );

            const { jobs, totalTextures } = scene.getRenderJobs(camera, 4);

            while (portalTargets.length < totalTextures) {
                portalTargets.push(engine.createRenderTarget(canvas.width, canvas.height));
            }

            const allTextureViews = portalTargets.map(t => t.view);

            jobs.forEach((job: any) => {
                if (job.isMain) {
                    engine.render(projMatrix, job.view, job.models, undefined, allTextureViews);
                } else {
                    engine.render(
                        projMatrix,
                        job.view,
                        job.models,
                        portalTargets[job.targetIndex].view,
                        allTextureViews
                    );
                }
            });
        } else {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            camera.update(dt, input);
            scene.updateTeleportation(camera);

            const projMatrix = Mat4.perspective(
                Math.PI / 3,
                canvas.width / canvas.height,
                0.1,
                100
            );

            const { jobs, totalTextures } = scene.getRenderJobs(camera, 4);

            while (portalTargets.length < totalTextures) {
                portalTargets.push(engine.createRenderTarget(canvas.width, canvas.height));
            }

            const allTextureViews = portalTargets.map(t => t.view);

            jobs.forEach((job: any) => {
                if (job.isMain) {
                    engine.render(projMatrix, job.view, job.models, undefined, allTextureViews);
                } else {
                    engine.render(
                        projMatrix,
                        job.view,
                        job.models,
                        portalTargets[job.targetIndex].view,
                        allTextureViews
                    );
                }
            });            
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main().catch(console.error);