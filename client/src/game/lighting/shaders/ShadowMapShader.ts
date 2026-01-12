// Shadow Map Generation Shader
// Converts 2D occlusion map to 1D shadow map using polar transform

export const shadowMapVertex = `
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

export const shadowMapFragment = `
  in vec2 vTextureCoord;
  out vec4 fragColor;

  uniform sampler2D uTexture;
  uniform float uResolution;

  #define PI 3.14159265359
  #define THRESHOLD 0.5

  void main(void) {
    float minDistance = 1.0;
    
    // For each pixel along the y-axis, sample in polar coordinates
    for (float y = 0.0; y < 1.0; y += 1.0 / uResolution) {
      // Convert from rectangular to polar
      vec2 norm = vec2(vTextureCoord.x, y) * 2.0 - 1.0;
      float theta = PI * 1.5 + norm.x * PI;
      float r = (1.0 + norm.y) * 0.5;
      
      // Calculate the coordinate to sample from occlusion map
      vec2 coord = vec2(-r * sin(theta), -r * cos(theta)) * 0.5 + 0.5;
      
      // Sample the occlusion map
      vec4 data = texture(uTexture, coord);
      
      // Current distance from center
      float dst = y;
      
      // If we hit an occluder, update minimum distance
      if (data.a > THRESHOLD) {
        minDistance = min(minDistance, dst);
      }
    }
    
    fragColor = vec4(vec3(minDistance), 1.0);
  }
`;
