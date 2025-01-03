import {
    Fn,
    abs,
    clamp,
    colorToDirection,
    cross,
    cubeTexture,
    dot,
    mat3,
    max,
    min,
    mix,
    normalGeometry,
    normalize,
    positionGeometry,
    pow,
    step,
    texture,
    vec4,
} from 'three/tsl';

let subsurfaceNormal;
let subsurfacePosition;
let surfaceNormal;
let viewVecDotSubsurfNormal;
let viewVec;
let subsurfaceBasicNormal;
let mipLevel;

const calcFinalColor = Fn(
    ([surfaceColor, mediumColor, thinMediumColor, subsurfaceTint]) =>
        mix(
            mix(
                mediumColor,
                surfaceColor.mul(subsurfaceTint),
                min(pow(max(viewVecDotSubsurfNormal, 0), 4), 1)
            ),
            thinMediumColor,
            pow(max(viewVecDotSubsurfNormal.negate(), 0), 4)
        )
);
const triplanarProject = ([
    textureSampler,
    position,
    normal,
    mipLevel,
    scale,
]) => {
    const absN = abs(normal);
    const positionScaled = position.toVar().mul(scale);
    const uvX = positionScaled.yz;
    const uvY = positionScaled.xz;
    const uvZ = positionScaled.xy;
    const componentsSum = absN.x.add(absN.y).add(absN.z).toVar();
    const blendX = absN.x.div(componentsSum);
    const blendY = absN.y.div(componentsSum);
    const blendZ = absN.z.div(componentsSum);
    const xColor = texture(textureSampler, uvX, mipLevel);
    const yColor = texture(textureSampler, uvY, mipLevel);
    const zColor = texture(textureSampler, uvZ, mipLevel);

    return xColor.mul(blendX).add(yColor.mul(blendY)).add(zColor.mul(blendZ));
};

export const getSubsurfaceNormalFromCubeMap = Fn(
    ({ subsurfacePosition, normalCubeMap }) =>
        normalize(
            cubeTexture(normalCubeMap, subsurfacePosition).xyz.mul(2).sub(1)
        )
);

export const getSubsurfaceNormalValue = Fn(() => subsurfaceBasicNormal);

export const getSubsurfaceNormalWithNormalMapping = Fn(
    ({
        subsurfacePosition,
        tangentCubeMap,
        normalMap,
        textureScale,
        viewVec,
        mipLevel,
    }) => {
        const tangent = normalize(
            cubeTexture(tangentCubeMap, subsurfacePosition).xyz.mul(2).sub(1)
        );
        const bitangent = cross(subsurfaceBasicNormal, tangent);
        const TBN = mat3(tangent, bitangent, subsurfaceBasicNormal);
        const normalMapValue = colorToDirection(
            triplanarProject([
                normalMap,
                subsurfacePosition,
                surfaceNormal,
                mipLevel,
                textureScale,
            ])
        );
        const mappedNormal = TBN.mul(normalMapValue);
        const normalDotViewVec = dot(subsurfaceBasicNormal, viewVec);

        return mix(
            subsurfaceBasicNormal,
            mappedNormal,
            step(0.1, normalDotViewVec)
        );
    }
);

export const buildSubsurfaceShader = ({
    modelSpaceCameraPos,
    mediumColor,
    thinMediumColor,
    subsurfaceTint,
    depth,
    mipMultiplier,
    minMipLevel,
}) =>
    Fn(
        ({
            normalCubeMap,
            colorTexture,
            colorBoost,
            textureScale,
            getSubsurfaceNormal,
        }) => {
            viewVec = normalize(
                modelSpaceCameraPos.sub(positionGeometry)
            ).toVar();
            const scaleFactor = depth.div(dot(viewVec, normalGeometry));
            const subsurfaceIntersectionVector = viewVec
                .negate()
                .mul(scaleFactor);
            subsurfacePosition = positionGeometry
                .add(subsurfaceIntersectionVector)
                .toVar();
            surfaceNormal = normalize(
                cubeTexture(normalCubeMap, positionGeometry).xyz.mul(2).sub(1)
            ).toVar();

            subsurfaceBasicNormal = getSubsurfaceNormalFromCubeMap({
                normalCubeMap,
                subsurfacePosition,
            }).toVar();

            mipLevel = dot(subsurfaceBasicNormal, viewVec)
                .oneMinus()
                .mul(mipMultiplier)
                .add(minMipLevel);

            subsurfaceNormal = getSubsurfaceNormal({
                subsurfacePosition,
                viewVec,
                mipLevel,
            }).toVar();

            const surfaceColor = triplanarProject([
                colorTexture,
                subsurfacePosition,
                surfaceNormal,
                mipLevel,
                textureScale,
            ]);

            viewVecDotSubsurfNormal = dot(
                subsurfaceNormal.xyz,
                viewVec
            ).toVar();

            return calcFinalColor([
                vec4(surfaceColor.mul(colorBoost).rgb, 1),
                mediumColor,
                thinMediumColor,
                subsurfaceTint,
            ]);
        }
    );

export const buildEmissiveShader = ({ subsurfaceTint }) =>
    Fn(({ emissiveMap, colorBoost, textureScale }) => {
        const emission = triplanarProject([
            emissiveMap,
            subsurfacePosition,
            surfaceNormal,
            mipLevel,
            textureScale,
        ]);
        const mcolor = mix(
            vec4(0, 0, 0, 1),
            emission.mul(subsurfaceTint),
            pow(clamp(viewVecDotSubsurfNormal, 0, 1), 4)
        );

        return vec4(mcolor.rgb.mul(colorBoost), 1);
    });
