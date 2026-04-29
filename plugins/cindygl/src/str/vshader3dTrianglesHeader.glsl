#version 300 es
in vec2 aTexCoord;
in vec3 aPos;

out   vec3 cgl_viewDirection;
out   vec3 cgl_spacePos;
out   vec2 plain_pixel;

uniform   mat4 trafo_matrix;
uniform   mat4 inverse_trafo;
