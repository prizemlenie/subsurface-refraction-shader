import { Group } from 'three/webgpu';

import { loadMesh } from './loadMesh';
import { onFrame, scene } from './sceneSetup';
import { nextBtn } from './gui';
import { initMeshMaterial } from './initMeshMaterial';
import { assetLoaded } from './assetsLoadingIndicator';

const main = async () => {
    // *******************************************************************************************************************
    // Assets

    let meshes = await Promise.all([
        loadMesh('models/crystal_d_3_min.glb'),
        loadMesh('models/crystal_d_6_min.glb'),
        loadMesh('models/crystal_heart_min.glb'),
    ]);

    meshes = await Promise.all(
        meshes.map(async (mesh) => {
            await initMeshMaterial(mesh);
            assetLoaded('Meshes');
            return mesh;
        })
    );

    // *******************************************************************************************************************
    // GUI

    let currentMeshIndex = 0;
    const meshGroup = new Group();
    scene.add(meshGroup);

    const applyMesh = async () => {
        meshGroup.clear();
        const mesh = meshes[currentMeshIndex];

        onFrame((delta, params) => {
            mesh.rotation.y += Math.PI * 2 * delta * params.rotationSpeed;
        });

        meshGroup.add(mesh);
    };
    const nextMesh = async () => {
        currentMeshIndex = (currentMeshIndex + 1) % meshes.length;
        await applyMesh();
    };

    await applyMesh();

    nextBtn.on('click', nextMesh);

    const assetsInfo = document.querySelector('.assets-info');
    document.querySelectorAll('.assets-info-toggle').forEach((element) =>
        element.addEventListener('click', () => {
            assetsInfo.classList.toggle('visible');
        })
    );
};

main();
