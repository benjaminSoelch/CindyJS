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
   // compute square in front of sphere seen from cgl_viewPos
   vec4 screenCenter = inverse_trafo*vec4(uCenter,1);
   float scaleZ = screenCenter.w;
   gl_Position = screenCenter + vec4(scaleZ*uRadius*aPos.x,scaleZ*uRadius*aPos.y,-uRadius,0);
   // transform to viewSpace
   vec4 pos4 = trafo_matrix*gl_Position;
   cgl_spacePos = pos4.xyz/pos4.w;
   vec4 delta = trafo_matrix*vec4(0,0,1,0)+pos4;
   cgl_viewDirection = delta.xyz/delta.w - cgl_spacePos;
   // 2D coordinates
   plain_pixel = aTexCoord;
}
