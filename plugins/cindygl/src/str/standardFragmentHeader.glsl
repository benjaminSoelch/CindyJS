#version 300 es
precision highp float;
precision highp int;

#define pi 3.141592653589793

in vec2 cgl_pixel;
in vec2 plain_pixel;
in vec3 cgl_viewDirection;
in vec3 cgl_spacePos;

out vec4 fragColor;

uniform vec3 cgl_viewPos;
uniform vec3 cgl_viewNormal;
uniform vec4 cgl_viewRect;
uniform mat4 inverse_trafo;

float cgl_depth;
vec3 cgl_viewDirection0;
float cgl_point_depth(vec3 v){
    vec4 screenPos = inverse_trafo*vec4(v,1);
    return 0.5*(screenPos.z/screenPos.w+1.);
}