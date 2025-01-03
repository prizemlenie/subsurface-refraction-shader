import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { addAsset } from './assetsLoadingIndicator';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

export const loadMesh = (path) => {
    addAsset('Meshes');
    return new Promise((resolve) => {
        gltfLoader.load(path, (gltf) => {
            let mesh = null;
            gltf.scene.traverse((child) => {
                child.type === 'Mesh' && (mesh = child);
            });

            mesh.material.emissiveIntensity = 0;
            mesh.material.aoMapIntensity = 0;
            mesh.castShadow = false;

            const { geometry } = mesh;
            geometry.center();
            const scale =
                1.8 /
                geometry.boundingBox.max.sub(geometry.boundingBox.min).length();
            geometry.scale(scale, scale, scale);
            mesh.scale.set(1, 1, 1);
            mesh.rotation.set(0, 0, 0);

            resolve(mesh);
        });
    });
};
