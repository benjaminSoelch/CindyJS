#version 300 es
in vec3 aPos;
in vec2 aTexCoord;

out   vec3 cgl_spacePos;
out   vec3 cgl_viewDirection;
out   vec2 plain_pixel;

uniform   mat4 trafo_matrix;

void main(void) {
   gl_Position = vec4(aPos, 1.);
   vec4 pos4 = trafo_matrix*vec4(aPos, 1.);
   cgl_spacePos = pos4.xyz/pos4.w;
   vec4 delta = pos4 + trafo_matrix*vec4(0,0,1,0);
   cgl_viewDirection = delta.xyz/delta.w - cgl_spacePos;
   // backwards compatability with 2D mode
   plain_pixel = aTexCoord;
}
