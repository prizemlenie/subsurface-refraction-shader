import { Color, Matrix4, Vector4 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { settings } from './gui';
import { camera } from './sceneSetup';

const bindings = {};
// *******************************************************************************************************************
// Uniforms
const colorParams = { view: 'color', color: { alpha: false, type: 'float' } };
const params = [
    {
        name: 'depth',
        value: 0.1,
        params: {
            label: 'Depth',
            min: 0,
            max: 0.15,
            step: 0.001,
            index: 2,
        },
    },
    'delimiter',
    {
        name: 'mediumColor',
        value: new Color(0.05, 0.02, 0.02),
        params: { ...colorParams, label: 'Medium color' },
    },
    {
        name: 'thinMediumColor',
        value: new Color(0.79, 0.07, 0.04),
        params: { ...colorParams, label: 'Thin medium color' },
    },
    {
        name: 'subsurfaceTint',
        value: new Color(0.6, 0.32, 0.09),
        params: { ...colorParams, label: 'Subsurface tint' },
    },
    'delimiter',
    {
        name: 'mipMultiplier',
        value: 4,
        params: { label: 'Mip multiplier', min: 0, max: 20, step: 1 },
    },
    {
        name: 'minMipLevel',
        value: 2,
        params: { label: 'Min mip level', min: 0, max: 10, step: 1 },
    },
];

export const uniforms = params.reduce((result, param) => {
    if (param !== 'delimiter') {
        result[param.name] = uniform(param.value);
    }
    return result;
}, {});

const _inverseModelMatrix = new Matrix4();
const _cameraPosition = new Vector4();
uniforms.modelSpaceCameraPos = uniform(camera.position);
uniforms.modelSpaceCameraPos.onObjectUpdate(({ object }) =>
    _cameraPosition
        .copy(camera.position)
        .applyMatrix4(_inverseModelMatrix.copy(object.matrixWorld).transpose())
);

params.forEach((param) => {
    if (param === 'delimiter') {
        settings.addBlade({ view: 'separator' });
        return;
    }
    if (typeof param === 'function') {
        param();
        return;
    }

    bindings[param.name] = settings
        .addBinding(param, 'value', param.params)
        .on('change', () => (uniforms[param.name].value = param.value));
});

// *******************************************************************************************************************
// Color preset
const p = { colorPreset: 'Red' };
const colorPresets = {
    Red: {
        mediumColor: new Color(0.05, 0.02, 0.02),
        thinMediumColor: new Color(0.79, 0.07, 0.04),
        subsurfaceTint: new Color(0.6, 0.32, 0.09),
    },
    Yellow: {
        mediumColor: new Color(0.05, 0.03, 0.02),
        thinMediumColor: new Color(0.82, 0.38, 0.02),
        subsurfaceTint: new Color(0.56, 0.32, 0.09),
    },
    Green: {
        mediumColor: new Color(0.02, 0.05, 0.02),
        thinMediumColor: new Color(0.02, 0.76, 0.13),
        subsurfaceTint: new Color(0.08, 0.47, 0.34),
    },
    'Light blue': {
        mediumColor: new Color(0.02, 0.05, 0.05),
        thinMediumColor: new Color(0.03, 0.75, 0.89),
        subsurfaceTint: new Color(0.1, 0.45, 0.59),
    },
    Purple: {
        mediumColor: new Color(0.04, 0.02, 0.05),
        thinMediumColor: new Color(0.46, 0.03, 0.89),
        subsurfaceTint: new Color(0.46, 0.1, 0.59),
    },
    White: {
        mediumColor: new Color(0.08, 0.08, 0.08),
        thinMediumColor: new Color(0.78, 0.71, 0.66),
        subsurfaceTint: new Color(0.36, 0.41, 0.41),
    },
};

settings
    .addBinding(p, 'colorPreset', {
        label: 'Color preset',
        groupName: 'Color preset',
        view: 'radiogrid',
        size: [2, 3],
        cells: (x, y) => {
            const key = Object.keys(colorPresets)[x + y * 2];
            return { value: key, title: key };
        },
        index: 2,
    })
    .on('change', ({ value }) => {
        const preset = colorPresets[value];
        Object.keys(preset).forEach((key) => {
            params.find((param) => param.name === key).value.copy(preset[key]);
            bindings[key].refresh();
        });
    });

settings.addBlade({ view: 'separator', index: 3 });

export const updateUniform = (name, value) => {
    params.find((param) => param.name === name).value = value;
    bindings[name].refresh();
};
