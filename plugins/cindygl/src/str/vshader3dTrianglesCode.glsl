 // code inside main function of triangle vertex shader, will be combined during shader compilation
   // remember viewSpace position
   cgl_spacePos = aPos;
   // transform to screen space
   gl_Position = inverse_trafo*vec4(aPos,1);
   vec4 delta = vec4(aPos,1) + trafo_matrix*vec4(0,0,1,0);
   cgl_viewDirection = delta.xyz/delta.w - cgl_spacePos;
   // 2D coordinates
   plain_pixel = aTexCoord;
