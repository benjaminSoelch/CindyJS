#version 300 es
in vec2 aTexCoord;
in vec3 aPos;

out   vec3 cgl_spacePos;
out   vec3 cgl_viewDirection;
out   vec2 plain_pixel;

uniform   mat4 trafo_matrix;
uniform   mat4 inverse_trafo;
uniform   vec3 uCenter;
uniform   vec3 uOrientation;
uniform   float uRadius;
uniform   float uBoxLengthScale;

void main(void) {
   // pick ray through A or B depending on sign on aPos.y
   // pick point on ray coresponding to distance of the closer of the two points
   vec3 v0 = abs(uOrientation.x)<abs(uOrientation.y)?vec3(1,0,0):vec3(0,1,0);
   vec3 dir1 = normalize(cross(v0,uOrientation));
   vec3 dir2 = normalize(cross(dir1,uOrientation));
   cgl_spacePos = uCenter+uBoxLengthScale*uOrientation*aPos.x+uRadius*(dir1*aPos.y+dir2*aPos.z);
   // transform to viewSpace
   gl_Position = inverse_trafo*vec4(cgl_spacePos,1);
   vec4 delta = vec4(cgl_spacePos,1)+trafo_matrix*vec4(0,0,1,0);
   cgl_viewDirection = delta.xyz/delta.w - cgl_spacePos;
   // 2D coordinates
   plain_pixel = aTexCoord;
}
