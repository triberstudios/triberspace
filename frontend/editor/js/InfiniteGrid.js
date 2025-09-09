import * as THREE from 'three';

class InfiniteGrid extends THREE.Mesh {
    constructor() {
        const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
        
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
            extensions: {
                derivatives: true
            },
            uniforms: {
                uSize1: { value: 1 },
                uSize2: { value: 10 },
                uColor1: { value: new THREE.Color(0x999999) },
                uColor2: { value: new THREE.Color(0x777777) },
                uDistance: { value: 1000 },
                uFadeStart: { value: 40 },
                uFadeEnd: { value: 200 },
                uOpacity: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 worldPosition;
                uniform float uDistance;
                
                void main() {
                    vec3 pos = position.xyz * uDistance;
                    pos.xz += cameraPosition.xz;
                    worldPosition = pos;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 worldPosition;
                uniform float uSize1;
                uniform float uSize2;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                uniform float uDistance;
                uniform float uFadeStart;
                uniform float uFadeEnd;
                uniform float uOpacity;
                
                float getGrid(float size) {
                    vec2 coord = worldPosition.xz / size;
                    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
                    float line = min(grid.x, grid.y);
                    return 1.0 - min(line, 1.0);
                }
                
                void main() {
                    float d = distance(cameraPosition.xz, worldPosition.xz);
                    
                    // Fade based on distance
                    float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, d);
                    
                    // Get grid lines at two scales
                    float g1 = getGrid(uSize1);
                    float g2 = getGrid(uSize2);
                    
                    // Start with transparent
                    vec3 finalColor = uColor1;
                    float alpha = 0.0;
                    
                    // Add fine grid - make it much more visible
                    if (g1 > 0.0) {
                        alpha = max(alpha, g1);  // Full opacity for fine grid
                        finalColor = uColor1;
                    }
                    
                    // Add coarse grid (overrides fine grid where they overlap)
                    if (g2 > 0.0) {
                        alpha = g2;  // Full opacity for coarse grid
                        finalColor = uColor2;
                    }
                    
                    // Apply distance fade
                    alpha *= fade * uOpacity;
                    
                    // Make sure we have some minimum visibility
                    if (alpha < 0.01) discard;
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `
        });
        
        super(geometry, material);
        this.rotation.x = -Math.PI / 2;
        this.frustumCulled = false;
    }
    
    setColors(color1, color2) {
        this.material.uniforms.uColor1.value.set(color1);
        if (color2) {
            this.material.uniforms.uColor2.value.set(color2);
        } else {
            this.material.uniforms.uColor2.value.set(color1);
        }
    }
    
    setOpacity(opacity) {
        this.material.uniforms.uOpacity.value = opacity;
    }
    
    setFadeDistance(start, end) {
        this.material.uniforms.uFadeStart.value = start;
        this.material.uniforms.uFadeEnd.value = end;
    }
    
    setGridSizes(size1, size2) {
        this.material.uniforms.uSize1.value = size1;
        this.material.uniforms.uSize2.value = size2;
    }
}

export { InfiniteGrid };