import {
    LoadingManager,
    TextureLoader,
    MirroredRepeatWrapping,
    RepeatWrapping,
    SRGBColorSpace,
    NodeMaterial,
    DoubleSide,
    MeshStandardNodeMaterial,
    FrontSide,
} from 'three/webgpu';
import {
    cameraPosition,
    dot,
    min,
    normalWorld,
    normalize,
    positionWorld,
    vec3,
    vec4,
} from 'three/tsl';
import {
    buildEmissiveShader,
    buildSubsurfaceShader,
    getSubsurfaceNormalWithNormalMapping,
    getSubsurfaceNormalValue,
} from './subsurfaceShader';
import { createNormalCubeMap } from './createNormalCubeMap';
import { renderer, togglePostProcessing } from './sceneSetup';
import { uniforms, updateUniform } from './uniforms';
import { settings } from './gui';
import { addAsset, assetLoaded } from './assetsLoadingIndicator';

const subsurfaceShader = buildSubsurfaceShader(uniforms);
const emissiveShader = buildEmissiveShader(uniforms);
const loadingManager = new LoadingManager();
const textureLoader = new TextureLoader(loadingManager);

// *********************************************************************************************************************
// GUI
const materials = [];
const meshes = [];
const loadedTextures = new Set();
const loadTexture = (url) => {
    if (loadedTextures.has(url)) {
        return textureLoader.load(url);
    }

    loadedTextures.add(url);
    addAsset('Textures');

    return textureLoader.load(url, () => assetLoaded('Textures'));
};

const texuresConfig = [
    {
        colorMap: loadTexture('textures/stonewall_18_basecolor_gs.webp'),
        normalMap: loadTexture('textures/stonewall_18_normal.webp'),
        scale: 4,
        label: 'stone nm',
        mirror: true,
        colorBoost: 6.5,
        onSelect: () => {
            // updateUniform('minMipLevel', 2);
            // updateUniform('mipMultiplier', 10);
            togglePostProcessing(false);
        },
    },
    {
        colorMap: loadTexture('textures/stonewall_18_basecolor_gs.webp'),
        scale: 4,
        label: 'stone',
        mirror: true,
        colorBoost: 6.5,
        onSelect: () => {
            // updateUniform('minMipLevel', 2);
            // updateUniform('mipMultiplier', 10);
            togglePostProcessing(false);
        },
    },
    {
        colorMap: loadTexture('textures/tree_11_diffuse_gs.webp'),
        normalMap: loadTexture('textures/tree_11_normal.webp'),
        scale: 2,
        label: 'tree nm',
        mirror: true,
        colorBoost: 6.5,
        onSelect: () => {
            // updateUniform('minMipLevel', 1);
            // updateUniform('mipMultiplier', 8);
            togglePostProcessing(false);
        },
    },
    {
        colorMap: loadTexture('textures/tree_11_diffuse_gs.webp'),
        scale: 2,
        label: 'tree',
        mirror: true,
        colorBoost: 6.5,
        onSelect: () => {
            // updateUniform('minMipLevel', 1);
            // updateUniform('mipMultiplier', 8);
            togglePostProcessing(false);
        },
    },
    {
        colorMap: loadTexture('textures/lava_02_emissive.webp'),
        emissiveMap: loadTexture('textures/lava_02_emissive.webp'),
        colorBoost: 6,
        emissiveColorBoost: 1.5,
        scale: 4,
        label: 'emissive',
        onSelect: () => {
            // updateUniform('minMipLevel', 2);
            // updateUniform('mipMultiplier', 8);
            togglePostProcessing(true);
        },
    },
    {
        colorMap: loadTexture('textures/marble_32-diffuse.webp'),
        mirror: false,
        scale: 3,
        label: 'potato',
        colorBoost: 2,
        onSelect: () => {
            // updateUniform('minMipLevel', 0);
            // updateUniform('mipMultiplier', 6);
            togglePostProcessing(false);
        },
    },
];

texuresConfig.forEach(({ colorMap, emissiveMap, mirror, normalMap }) => {
    const em = emissiveMap || {};
    const nm = normalMap || {};
    const wrap = mirror ? MirroredRepeatWrapping : RepeatWrapping;
    nm.wrapS = em.wrapS = colorMap.wrapS = wrap;
    nm.wrapT = em.wrapT = colorMap.wrapT = wrap;
    em.colorSpace = colorMap.colorSpace = SRGBColorSpace;
});

const applyTexture = (textureIndex, material) => {
    const config = texuresConfig[textureIndex];
    config.normalMap
        ? (material.colorNode = subsurfaceShader({
              colorTexture: config.colorMap,
              normalCubeMap: material.userData.normalCubeMap,
              colorBoost: config.colorBoost || 1,
              textureScale: config.scale || 1,
              getSubsurfaceNormal: ({
                  subsurfacePosition,
                  viewVec,
                  mipLevel,
              }) =>
                  getSubsurfaceNormalWithNormalMapping({
                      normalCubeMap: material.userData.normalCubeMap,
                      tangentCubeMap: material.userData.tangentCubeMap,
                      subsurfacePosition,
                      textureScale: config.scale || 1,
                      normalMap: config.normalMap,
                      viewVec,
                      mipLevel,
                  }),
          }))
        : (material.colorNode = subsurfaceShader({
              colorTexture: config.colorMap,
              normalCubeMap: material.userData.normalCubeMap,
              colorBoost: config.colorBoost || 1,
              textureScale: config.scale || 1,
              getSubsurfaceNormal: getSubsurfaceNormalValue,
          }));

    material.emissiveNode = config.emissiveMap
        ? emissiveShader({
              emissiveMap: config.emissiveMap,
              colorBoost: config.emissiveColorBoost || 1,
              textureScale: config.scale || 1,
          })
        : null;
    config.onSelect?.();
    material.needsUpdate = true;
};
const params = { textureIndex: 0, wireframe: false, scattering: 1 };

settings
    .addBinding(params, 'wireframe', {
        label: 'Wireframe',
        index: 2,
    })
    .on('change', ({ value }) => {
        meshes.forEach(
            (mesh) =>
                (mesh.material = value
                    ? mesh.userData.overviewMaterial
                    : mesh.userData.effectMaterial)
        );
    });

const applyScatteringPreset = (value) => {
    updateUniform('minMipLevel', [0, 1, 2][value]);
    updateUniform('mipMultiplier', [0, 6, 10][value]);
};
applyScatteringPreset(params.scattering);
settings
    .addBinding(params, 'scattering', {
        label: 'Scattering intensity',
        groupName: 'Scattering intensity',
        view: 'radiogrid',
        size: [3, 1],
        cells: (x) => ({ value: x, title: ['Off', 'Low', 'High'][x] }),
        index: 4,
    })
    .on('change', ({ value }) => applyScatteringPreset(value));

settings
    .addBinding(params, 'textureIndex', {
        label: 'Subsurface texture',
        groupName: 'Subsurface texture',
        view: 'radiogrid',
        size: [2, 3],
        cells: (x, y) => {
            const index = x + y * 2;
            const item = texuresConfig[index];
            return { value: index, title: item.label };
        },
        index: 3,
    })
    .on('change', ({ value }) => {
        materials.forEach((material) => applyTexture(value, material));
    });

// *********************************************************************************************************************
// Mesh material initialization

const overviewMaterial = new NodeMaterial();
overviewMaterial.colorNode = (() => {
    const viewVec = normalize(cameraPosition.sub(positionWorld));
    return vec4(
        vec3(min(dot(normalWorld, viewVec).mul(0.5).add(0.5).add(0.2), 0.7)),
        1
    );
})();
overviewMaterial.wireframe = true;
overviewMaterial.side = DoubleSide;

export const initMeshMaterial = async (mesh) => {
    const [normalCubeMap, tangentCubeMap] = await createNormalCubeMap(
        renderer,
        mesh.geometry
    );
    const originalMaterial = mesh.material;
    const newMaterial = new MeshStandardNodeMaterial();

    // This may look odd, but I ran into a peculiar problem.
    // Even though the normal cube maps for two different meshes were generated correctly and were distinct,
    // The cube maps passed to the subsurface shader ended up being the same for both meshes.
    // Interestingly, this issue only appeared for those specific two meshes,
    // And changing their loading order didn’t help.
    // I tried investigating the problem, but decided not to spend too much time on it.
    // Recreating the material for each mesh ultimately resolved the issue.
    Object.entries(originalMaterial).forEach(
        ([key, value]) => (newMaterial[key] = value)
    );
    newMaterial.emissiveIntensity = 0;
    newMaterial.aoMapIntensity = 0;
    newMaterial.userData = { normalCubeMap, tangentCubeMap };
    newMaterial.emissiveMap = null;
    newMaterial.side = FrontSide;
    applyTexture(0, newMaterial);
    mesh.material = newMaterial;

    materials.push(newMaterial);
    meshes.push(mesh);

    mesh.userData = { effectMaterial: newMaterial, overviewMaterial };
    return mesh;
};
