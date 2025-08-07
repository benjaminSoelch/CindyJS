 // code inside main function of triangle vertex shader, will be combined during shader compilation
   // remember viewSpace position
   cgl_spacePos = aPos;
   // transform to screen space
   gl_Position = projAndTrafoMatrix*vec4(aPos,1);
   //   ? is distance from viewPosition constant?
   if(orthogonal) {
      cgl_viewDirection = normalize(cgl_viewNormal);
      pixelViewPos = aPos - (dot(aPos,cgl_viewDirection))*cgl_viewDirection - cgl_viewNormal;
   } else {
      cgl_viewDirection = aPos - cgl_viewPos;
      pixelViewPos = cgl_viewPos;
   }
   // 2D coordinates
   plain_pixel = aTexCoord;
   // TODO? transform texture coordinates
   // vec3 r = transformMatrix*vec3(plain_pixel,1);
   // cgl_pixel = r.xy/r.z;
   cgl_pixel = aTexCoord;
