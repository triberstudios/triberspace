import * as THREE from 'three';

class InfiniteGridHelper extends THREE.Object3D {
    constructor(size1 = 1, size2 = 10, color1 = 0x888888, color2 = 0x444444) {
        super();
        
        // Create a large plane geometry
        const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
        
        const material = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            uniforms: {
                uSize1: { value: size1 },
                uSize2: { value: size2 },
                uSize3: { value: size1 / 5 },  // Even finer grid at 0.2 units
                uColor1: { value: new THREE.Color(color1) },
                uColor2: { value: new THREE.Color(color2) },
                uDistance: { value: 5000 }  // Much larger grid area
            },
            vertexShader: `
                varying vec3 worldPosition;
                uniform float uDistance;
                
                void main() {
                    vec3 pos = position * uDistance;
                    worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 worldPosition;
                uniform float uSize1;
                uniform float uSize2;
                uniform float uSize3;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                
                float getGrid(float size) {
                    vec2 coord = worldPosition.xz / size;
                    vec2 derivative = fwidth(coord);
                    vec2 grid = abs(fract(coord - 0.5) - 0.5) / derivative;
                    float line = min(grid.x, grid.y);
                    return 1.0 - min(line, 1.0);
                }
                
                float getVisibility() {
                    // Calculate distance from camera to grid point (like Blender)
                    vec3 distanceToCamera = worldPosition - cameraPosition;
                    float dist = length(distanceToCamera);
                    
                    // Shorter fade distances
                    float maxDistance = 750.0;   // Grid completely faded at 750 units from camera
                    float fadeDistance = 250.0;  // Start fading at 500 units
                    float fadeFactor = 1.0 - smoothstep(maxDistance - fadeDistance, maxDistance, dist);
                    
                    // Also fade based on view angle (fade when looking parallel to grid)
                    float angleToGrid = abs(dot(normalize(distanceToCamera), vec3(0.0, 1.0, 0.0)));
                    float angleFade = smoothstep(0.0, 0.1, angleToGrid);
                    
                    return fadeFactor * angleFade;
                }
                
                void main() {
                    float g1 = getGrid(uSize1);
                    float g2 = getGrid(uSize2);
                    float g3 = getGrid(uSize3);  // Ultra-fine grid
                    
                    vec3 color = mix(uColor1, uColor2, g2);
                    
                    // Combine the grid lines - make g1 (1-unit lines) more visible
                    float alpha = max(max(g3 * 0.6, g1 * 1.0), g2 * 0.9);
                    
                    // Apply fading
                    alpha *= getVisibility();
                    
                    // Highlight axes
                    float axisLineWidth = 0.05;
                    if (abs(worldPosition.x) < axisLineWidth || abs(worldPosition.z) < axisLineWidth) {
                        alpha = max(alpha, getVisibility());
                        color = uColor2;
                    }
                    
                    if (alpha <= 0.0) discard;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            extensions: {
                derivatives: true
            }
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.renderOrder = -1; // Render before other objects
        mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        
        this.add(mesh);
        this.mesh = mesh;
    }
    
    updateColors(color1, color2) {
        this.mesh.material.uniforms.uColor1.value = new THREE.Color(color1);
        this.mesh.material.uniforms.uColor2.value = new THREE.Color(color2);
    }
}

export { InfiniteGridHelper };