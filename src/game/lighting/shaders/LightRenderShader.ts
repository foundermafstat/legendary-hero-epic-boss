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
    
    // Convert angle to texture coordinate (0 to 1)
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
    
    // Final color with light color tint
    float intensity = sum * falloff;
    fragColor = vec4(uLightColor * intensity, intensity);
  }
`;
