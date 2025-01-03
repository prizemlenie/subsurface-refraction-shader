import {
    Scene,
    PerspectiveCamera,
    AmbientLight,
    DirectionalLight,
    WebGPURenderer,
    NoColorSpace,
    Clock,
    PostProcessing,
} from 'three/webgpu';
import { pass, mrt, output, emissive } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { info, settings } from './gui';

const fpsGraph = info.addBlade({
    view: 'fpsgraph',
    label: 'fps',
    rows: 2,
    min: 0,
    max: 300,
});
// *******************************************************************************************************************
// Canvas
const canvas = document.querySelector('canvas');

// *******************************************************************************************************************
// Scene
export const scene = new Scene();

// *******************************************************************************************************************
// Base camera
export const camera = new PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(1.8, 0.3, -4).divideScalar(2.7);
scene.add(camera);

// *******************************************************************************************************************
// Lighting
const alight = new AmbientLight(0xffffff, 5.5);
const dlight1 = new DirectionalLight(0xffffff, 6.5);
const dlight2 = new DirectionalLight(0xffffff, 3.5);

dlight1.position.set(-3, 2, 3);
dlight1.lookAt(0, 0, 0);

dlight2.position.set(3, 2, 3);
dlight2.lookAt(0, 0, 0);

scene.add(alight, dlight1, dlight2);

// *******************************************************************************************************************
// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.enablePan = false;

// *******************************************************************************************************************
// Renderer
export const renderer = new WebGPURenderer({
    // forceWebGL: true,
    canvas,
    antialias: true,
});
renderer.setClearColor(0x000000, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = NoColorSpace;

window.addEventListener('resize', () => {
    const [width, height] = [window.innerWidth, window.innerHeight];

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});

// *******************************************************************************************************************
// Postprocessing
const scenePass = pass(scene, camera);
scenePass.setMRT(
    mrt({
        output,
        emissive,
    })
);

const outputPass = scenePass.getTextureNode();
const emissivePass = scenePass.getTextureNode('emissive');

const bloomPass = bloom(emissivePass, 6.5, 1.5);

const postProcessing = new PostProcessing(renderer);
postProcessing.outputNode = outputPass.add(bloomPass);

// *******************************************************************************************************************
// GUI
const params = {
    rotationSpeed: 0.07,
    spotLight: false,
    frameTime: 0,
    avgFrameTime: 0,
    framesTimeSum: 0,
    framesCount: 0,
    floor: false,
};
info.addBinding(params, 'frameTime', {
    label: 'Frame time',
    view: 'graph',
    readonly: true,
    min: 0,
    max: 15,
    rows: 2,
});
info.addBinding(params, 'avgFrameTime', {
    label: 'Avg frame time',
    readonly: true,
    interval: 1000,
});

settings.addBinding(params, 'rotationSpeed', {
    label: 'rot/sec',
    min: 0,
    max: 0.3,
    step: 0.01,
});
settings
    .addBinding(dlight1, 'intensity', {
        label: 'Light intensity',
        min: 0,
        max: 20,
        step: 0.1,
    })
    .on('change', ({ value }) => {
        dlight2.intensity = value / 2;
    });

// *******************************************************************************************************************
// Animation loop
const clock = new Clock();
const avgFrameTimeBatchSize = 100;
let animationCallback = null;
let postProcessingEnabled = false;

const tick = () => {
    const delta = clock.getDelta();

    controls.update();

    animationCallback?.(delta, params);

    fpsGraph.begin();
    const start = performance.now();
    postProcessingEnabled
        ? postProcessing.renderAsync()
        : renderer.renderAsync(scene, camera);
    params.frameTime = performance.now() - start;
    fpsGraph.end();

    if (params.framesCounterStartTime === null) {
        params.framesCounterStartTime = start;
    }
    params.framesCount += 1;
    params.framesTimeSum += params.frameTime;
    if (params.framesCount >= avgFrameTimeBatchSize) {
        params.avgFrameTime = params.framesTimeSum / params.framesCount;
        params.framesCount = 0;
        params.framesTimeSum = 0;
    }

    requestAnimationFrame(tick);
};
tick();

export const onFrame = (callback) => {
    animationCallback = callback;
};

export const togglePostProcessing = (enabled) => {
    postProcessingEnabled = enabled;
};
