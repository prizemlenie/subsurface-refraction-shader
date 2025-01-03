import {
    CubeCamera,
    DoubleSide,
    HalfFloatType,
    LinearFilter,
    LinearSRGBColorSpace,
    Mesh,
    NodeMaterial,
    RGBAFormat,
    Scene,
    WebGLCubeRenderTarget,
} from 'three/webgpu';
import { attribute, normalGeometry, vec4 } from 'three/tsl';

const scene = new Scene();
const normalMaterial = new NodeMaterial();
normalMaterial.side = DoubleSide;
normalMaterial.colorNode = vec4(normalGeometry.add(1).div(2), 1);
const tangentMaterial = new NodeMaterial();
tangentMaterial.side = DoubleSide;
tangentMaterial.colorNode = vec4(attribute('tangent', 'vec3').add(1).div(2), 1);
const cubeCamera = new CubeCamera(0.1, 3);
cubeCamera.position.set(0, 0, 0);

export const createNormalCubeMap = async (renderer, geometry) => {
    if (!renderer._initialized) {
        await renderer.init();
    }

    const normalsCubeRT = new WebGLCubeRenderTarget(256, {
        generateMipmaps: true,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
        colorSpace: LinearSRGBColorSpace,
        type: HalfFloatType,
    });
    const tangentsCubeRT = new WebGLCubeRenderTarget(256, {
        generateMipmaps: true,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
        colorSpace: LinearSRGBColorSpace,
        type: HalfFloatType,
    });

    const mesh = new Mesh(geometry, normalMaterial);
    cubeCamera.renderTarget = normalsCubeRT;
    geometry.computeTangents();

    scene.clear();
    scene.add(mesh);
    scene.add(cubeCamera);
    cubeCamera.update(renderer, scene);

    mesh.material = tangentMaterial;
    cubeCamera.renderTarget = tangentsCubeRT;
    cubeCamera.update(renderer, scene);

    return [normalsCubeRT.texture, tangentsCubeRT.texture];
};
