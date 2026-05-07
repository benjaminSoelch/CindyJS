#version 300 es
in vec2 aTexCoord;
in vec3 aPos;

out   vec3 cgl_spacePos;
out   vec3 cgl_viewDirection;
out   vec2 plain_pixel;

uniform   mat4 trafo_matrix;
uniform   mat4 inverse_trafo;
uniform   vec3 uCenter;
uniform   float uRadius;

void main(void) {
   cgl_spacePos = uCenter - uRadius*aPos;
   // transform to viewSpace
   gl_Position = inverse_trafo*vec4(cgl_spacePos,1);
   gl_Position.z = 0.; // depth will be set by f-shader, set to 0 to avoid discarding in v-shader
   vec4 delta = vec4(cgl_spacePos,1)+trafo_matrix*vec4(0,0,1,0);
   cgl_viewDirection = delta.xyz/delta.w - cgl_spacePos;
   // 2D coordinates
   plain_pixel = aTexCoord;
}
