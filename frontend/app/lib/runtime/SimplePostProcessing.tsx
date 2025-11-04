'use client';

import React from 'react';
import { EffectComposer, N8AO, ToneMapping, Bloom } from '@react-three/postprocessing';

interface SimplePostProcessingProps {
    n8aoEnabled?: boolean;
}

export function SimplePostProcessing({
    n8aoEnabled = true
}: SimplePostProcessingProps) {
    return (
        <EffectComposer multisampling={4}>
            <>
                {/* N8AO - Optional based on toggle */}
                {n8aoEnabled ? (
                    <N8AO
                        aoRadius={8}
                        distanceFalloff={4.0}
                        intensity={5.0}
                        aoSamples={16}
                        denoiseSamples={16}
                        denoiseRadius={24}
                        halfRes={true}
                        screenSpaceRadius={true}
                        depthAwareUpsampling={true}
                    />
                ) : null}

                {/* Bloom - Always active for visual enhancement */}
                <Bloom
                    intensity={0.3}
                    luminanceThreshold={0.9}
                    luminanceSmoothing={0.9}
                />

                {/* Tone Mapping - Always active */}
                <ToneMapping />
            </>
        </EffectComposer>
    );
}
