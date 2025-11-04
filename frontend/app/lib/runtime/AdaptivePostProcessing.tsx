'use client';

import React from 'react';
import { EffectComposer, N8AO, SSAO, ToneMapping, Bloom } from '@react-three/postprocessing';

interface N8AOControls {
    enabled: boolean;
    aoSamples: number;
    aoRadius: number;
    intensity: number;
    denoiseSamples: number;
    denoiseRadius: number;
    distanceFalloff: number;
    halfRes: boolean;
    screenSpaceRadius: boolean;
    depthAwareUpsampling: boolean;
}

interface AdaptivePostProcessingProps {
    enabled?: boolean;
    controls?: N8AOControls;
}

export function AdaptivePostProcessing({
    enabled = true,
    controls
}: AdaptivePostProcessingProps) {
    if (!enabled) {
        return null;
    }

    // Use Leva controls if provided, otherwise use defaults
    const n8aoSettings = controls || {
        enabled: true,
        aoSamples: 16,
        aoRadius: 6.9,
        intensity: 5.0,
        denoiseSamples: 12,
        denoiseRadius: 16,
        distanceFalloff: 4.0,
        halfRes: true,
        screenSpaceRadius: true,
        depthAwareUpsampling: true
    };

    return (
        <EffectComposer multisampling={4}>
            <>
                {/* N8AO with user-controlled parameters */}
                {n8aoSettings.enabled ? (
                    <N8AO
                        aoRadius={n8aoSettings.aoRadius}
                        distanceFalloff={n8aoSettings.distanceFalloff}
                        intensity={n8aoSettings.intensity}
                        aoSamples={n8aoSettings.aoSamples}
                        denoiseSamples={n8aoSettings.denoiseSamples}
                        denoiseRadius={n8aoSettings.denoiseRadius}
                        halfRes={n8aoSettings.halfRes}
                        screenSpaceRadius={n8aoSettings.screenSpaceRadius}
                        depthAwareUpsampling={n8aoSettings.depthAwareUpsampling}
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
