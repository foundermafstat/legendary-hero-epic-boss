// Light Render Shader
// Renders light with soft shadows using 1D shadow map and gaussian blur

export const lightRenderVertex = `
  in vec2 aPosition;
  out vec2 vTextureCoord;

  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uOutputTexture;

  vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
  }

  vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
  }

  void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

export const lightRenderFragment = `
  in vec2 vTextureCoord;
  out vec4 fragColor;

  uniform sampler2D uTexture;
  uniform float uResolution;
  uniform vec3 uLightColor;
  uniform float uSoftness;
  uniform float uConeAngle; // Half-angle in radians

  #define PI 3.14159265359

  // Sample the 1D shadow map and check if we're in shadow
  float sampleShadow(float coord, float r) {
    return step(r, texture(uTexture, vec2(coord, 0.5)).r);
  }

  void main(void) {
    // Convert to normalized coordinates (-1 to 1)
    vec2 norm = vTextureCoord * 2.0 - 1.0;
    
    // Calculate polar coordinates
    float theta = atan(norm.y, norm.x);
    float r = length(norm);
    
    // Discard pixels outside the light radius
    if (r > 1.0) {
      fragColor = vec4(0.0);
      return;
    }
    
    // Cone attenuation
    // We assume the light points to the Right (0 radians) in local space
    // and we rotate the mesh to change direction.
    // Wrap theta to maintain continuity if needed, but atan is -PI to PI
    
    // Smooth fade at the edges of the cone
    if (abs(theta) > uConeAngle) {
       fragColor = vec4(0.0);
       return;
    }

    // Optional: Soft cone edges (could be improved with smoothstep)
    // float coneFade = smoothstep(uConeAngle, uConeAngle * 0.8, abs(theta));
    
    // Convert angle to texture coordinate (0 to 1)
    // Shadow map is generated 0 to 1 mapping to 0 to 360 (or similar)
    // ShadowMapShader uses: theta = PI * 1.5 + norm.x * PI; which maps -1..1 to 0.5PI..2.5PI
    // We need to match that parameterization.
    
    // In ShadowMapShader:
    // y goes 0 to 1 (distance).
    // x goes 0 to 1 (angle).
    
    // Here we have `theta` (angle) and `r` (distance).
    // We need to find `coord` (x in shadow map) corresponding to `theta`.
    
    // Current ShadowMapShader mapping:
    // Input x (-1 to 1) -> Angle (PI*1.5 + x*PI) = 1.5PI + [-PI, PI] = [0.5PI, 2.5PI]
    // Normalized Angle (0 to 1) in shadow map corresponds to 0.5PI to 2.5PI ?
    // Use the inverse:
    // Angle A = 1.5PI + (coord * 2 - 1) * PI
    // We have theta (-PI to PI).
    // We need to map theta to coord (0..1).
    
    // Aligning coordinate systems is tricky without visualizing.
    // Let's assume consistent "Right = 0".
    // If ShadowMapShader scans "All Directions", it surely covers our Theta.
    // Let's use the simplest mapping: 
    // coord = (theta + PI) / (2.0 * PI); // Maps -PI..PI to 0..1
    
    float coord = (theta + PI) / (2.0 * PI);
    
    // Sample center (hard shadows)
    float center = sampleShadow(coord, r);
    
    // Apply blur that increases with distance for softer far shadows
    float blur = (1.0 / uResolution) * smoothstep(0.0, 1.0, r) * uSoftness;
    
    // Gaussian blur sampling
    float sum = 0.0;
    sum += sampleShadow(coord - 4.0 * blur, r) * 0.05;
    sum += sampleShadow(coord - 3.0 * blur, r) * 0.09;
    sum += sampleShadow(coord - 2.0 * blur, r) * 0.12;
    sum += sampleShadow(coord - 1.0 * blur, r) * 0.15;
    sum += center * 0.16;
    sum += sampleShadow(coord + 1.0 * blur, r) * 0.15;
    sum += sampleShadow(coord + 2.0 * blur, r) * 0.12;
    sum += sampleShadow(coord + 3.0 * blur, r) * 0.09;
    sum += sampleShadow(coord + 4.0 * blur, r) * 0.05;
    
    // Apply radial falloff for soft light edges
    float falloff = smoothstep(1.0, 0.0, r);
    falloff = pow(falloff, 1.5); // Adjust curve
    
    // Apply Cone Edge Softness
    float coneEdge = smoothstep(uConeAngle, uConeAngle * 0.8, abs(theta));
    
    // Final color with light color tint
    float intensity = sum * falloff * coneEdge;
    fragColor = vec4(uLightColor * intensity, intensity);
  }
`;
