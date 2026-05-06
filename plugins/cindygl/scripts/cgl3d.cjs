// initialization script containing implementation for CindyGL3D functions
// opt TODO? would creating minified version to speed up import time

use("CindyGL");
// normalize if non-zero, map (0,0,0) to itself
normalize(v):=(
  regional(l);
  l = |v|;
  if(l!=l,(0,0,0), // NaN
    if(l>0,v/l,v)
  );
);
cglMod1plus(n,k):=(
  mod(n-1,k)+1;
);
// returns undefined
cglUndefinedVal():=(regional(nada);nada);

cglValOrDefault(val,default):=(
  if(isundefined(val),default,val)
);
// add all entries in second dictionary to first dictionary
cglMergeDicts(dict1,dict2):=(
  res = dict1;
  forall(dict2,val,key,res_key=val);
  res;
);

/////////////////////
// objects and coordinate system
/////////////////////
cgl3d = {};
cgl3d.projection = {};
cgl3d.compute = {};
cgl3d.shader = {};
cgl3d.light = {};
cgl3d.draw = {};

cgl3d.renderTransform = ((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,1));
cgl3d.zoomFactor = 1;
cgl3d.rotate = (alpha,beta) => (
  rotZ=[
    [1,0,0,0],
    [0,cos(beta),-sin(beta),0],
    [0,sin(beta),cos(beta),0],
    [0,0,0,1]
  ];
  rotY=[
    [cos(alpha),0,sin(alpha),0],
    [0,1,0,0],
    [-sin(alpha),0,cos(alpha),0],
    [0,0,0,1]
  ];
  self().renderTransform = self().renderTransform * rotY * rotZ;
);
rotate3d(alpha,beta) := cgl3d.rotate:(alpha,beta);
cgl3d.zoom = (newScale) => (
  self().zoomFactor = newScale;
);
zoom3d(newScale) := cgl3d.zoom:(newScale);

cgl3d.objects = {"opaque": {}, "translucent":{}};
cgl3d.resetObjects = () => (
  self().objects.opaque = {};
  self().objects.translucent = {};
);
reset3d() := cgl3d.resetObjects:();
cgl3d.render = () => (
  cgl3dStartRender(layers->0); // TODO set layers to 2 if there are translucent objects
  cgl3dSetRenderTransform(cgl3d.renderTransform,cgl3d.zoomFactor);
  cgl3dRenderOpaque(self().objects.opaque);
  cgl3dRenderTranslucent(self().objects.translucent);
  cgl3dFinishRender();
);
render3d() := cgl3d.render:();
render3d(p0,p1) := (
  cgl3dStartRender(p0->p0,p1->p1,layers->0);
  cgl3dSetRenderTransform(cgl3d.renderTransform,cgl3d.zoomFactor);
  cgl3dRenderOpaque(cgl3d.objects.opaque);
  cgl3dRenderTranslucent(cgl3d.objects.translucent);
  cgl3dFinishRender();
);
cgl3d.addObject = (obj) => (
  regional(id);
  id = cgl3dObjectId(obj);
  // TODO determine if object is opaque or translucent
  self().objects.opaque:id = obj;
  id
);

cgl3d.compute.pixelDepth = (rawDepth,direction) => (
  cglRawDepth = rawDepth;
  cglDepth = cglPointDepth(cglSpacePos + rawDepth*direction);
);

/////////////////////
// light functions
/////////////////////
cgl3d.light.none = (color,viewDirection,normal) => color;
cgl3d.light.simple = (color,viewDirection,normal) => (
  regional(brightness);
  // normal towards view -> .75*brightness  ; normal away from view -> .45 * brightness
  brightness = viewDirection*normal;
  brightness = 0.25+0.6*abs(brightness)-0.15*brightness;
  brightness*color;
);
cgl3d.light.normal = (color,viewDirection,normal) => (
  (normal+(1,1,1))/2;
);
cgl3d.light.depth = (color,viewDirection,normal) => (
  hue(cglDepth-0.3);
);
cglAddLight(material, lightcolor, lightdir, normal, gamma1,gamma2) := (
  regional(illumination,res);
  illumination = max(0,(lightdir/abs(lightdir))*normal);
  res=(illumination^gamma1+illumination^gamma2)*lightcolor;
  material=material+(1,1,1);
  (res_1*material_1,res_2*material_2,res_3*material_3);
);
cglComputeLight(direction,normal,col,pos):=(
  regional(colo,ambient,lightCol,lightdir0);
  lightCol=(1,1,1)*.1;
  lightdir0 = (-10, 10, 0.)-pos;
  ambient=.5;
  colo= col*ambient;
  colo= colo+cglAddLight(col,lightCol, lightdir0, normal, 3,20);
  colo= colo+cglAddLight(col,lightCol, lightdir0, normal, 3,20);
  colo= colo+cglAddLight(col,lightCol, direction, normal, 3,32);
  colo= colo+cglAddLight(col,lightCol, -direction, normal, 3,32);
  colo= colo+cglAddLight(col,lightCol, -direction, normal, 3,32);
);
// default light computation
cgl3d.light.default = (color,direction,normal) => (
  regional(col3,lightCol);
  // apply light calculation only to first 3 components
  // this code should work for both colors of size 3 and 4
  col3=(color_1,color_2,color_3)*0.75;
  lightCol = 0.75*color; // ensure that lightCol is a float array
  lightCol = color; // local copy of color to ensure value is mutable
  col3=cglComputeLight(direction,normal,col3,cglSpacePos+direction*cglRawDepth);
  lightCol_1=col3_1;
  lightCol_2=col3_2;
  lightCol_3=col3_3;
  lightCol;
);
cglLightExpr(expr(color,direction,normal)):=expr;

cglLight2gamma = [2, 20, 2, 20, 1, 10, 1, 10];
cglLight2colors = [
    (.3, .5, 1.),
    (1, 2, 2) / 2,
    (1., 0.2, 0.1),
    (2, 2, 1) / 2,
    .4 * (.7, .8, .3),
    .9 * (.7, .8, .3),
    .4 * (.6, .1, .6),
    .9 * (.6, .1, .6)
];
cglLight2(direction, dst, color,normal) := (
  // lighting parameters
  lightdirs = [ // depends on view-direction -> need to calculate within shader
    cglRay(direction, -100), //enlights parts of the surface which normal points away from the camera
    cglRay(direction, -100),
    cglRay(direction, 100), //Has an effect, if the normal of the surface points to the camera

    cglRay(direction, 100),
    (-10, 10, -2.), // TODO? make relative to view
    (-10, 10, -2.),
    (10, -8, 3.),
    (10, -8, 3.)
  ];
  al=0.5; // how much should color depend on surface color
  // ----
  x = cglSpacePos + dst*direction; //the intersection point in R^3
  color = (1 - al) * color;

  forall(1..length(lightdirs),
    col=cglLight2colors_#;
    //illuminate if the normal and lightdir point in the same direction
    illumination = max(0, (lightdirs_# / abs(lightdirs_#)) * normal);
    col = (illumination ^ cglLight2gamma_#)* col;
    color = color + al * if(length(color)==3,col,(col_1,col_2,col_3,1/length(lightdirs)));
  );
  color
);
cgl3d.light.default2 =(color,viewDirection,normal) => (
  cglLight2(viewDirection,cglRawDepth,color,normal)
);

/////////////////////
// internal state
/////////////////////

CGLnAMEDcOLORS = {
  "white":(1,1,1),
  "grey":(0.5,0.5,0.5),
  "gray":(0.5,0.5,0.5),
  "black":(0,0,0),
  "red":(1,0,0),
  "green":(0,1,0),
  "blue":(0,0,1),
  "cyan":(0,1,1),
  "magenta":(1,0,1),
  "yellow":(1,1,0)
};

/////////////////////
// spheres
/////////////////////

cgl3d.compute.sphereNormal = (direction,center,isBack) => (
  regional(vc,b2,c,D4,r,dst,dst2,pos3d);
  // |v+l*d -c|=r
  vc=cglSpacePos-center;
  // -> l*l <d,d> + l * 2<v-c,d> + <v-c,v-c> - r*r
  b2=(vc*direction); // 1/2 * b
  c=vc*vc-cglRadius*cglRadius;
  D4=b2*b2-c; // 1/4* ( b*b - 4 *a*c)
  if(D4<0,cglDiscard()); // discard rays that do not intersect the sphere
  r=re(sqrt(D4));
  dst=-b2-r;// sqrt should always be real
  dst2 = -b2+r;
  /*if(dst<0, // TODO: correctly detect pixels behind camera
    if(isBack,cglDiscard());
    dst=dst2;
    if(dst<0,cglDiscard());
  );*/
  if(isBack,dst=dst2);
  pos3d = cglSpacePos+ dst*direction;
  cgl3d.compute.pixelDepth:(dst,direction);
  normalize(pos3d - center);
);
cgl3d.compute.sphereDepths = (rayStart,direction,center,radius) => (
  regional(vc,b2,c,D4,r);
  // |v+l*d -c|=r
  vc=rayStart-center;
  // -> l*l <d,d> + l * 2<v-c,d> + <v-c,v-c> - r*r
  b2=(vc*direction); // 1/2 * b
  c=vc*vc-radius*radius;
  D4=b2*b2-c; // 1/4* ( b*b - 4 *a*c)
  if(D4<0,cglDiscard()); // discard rays that do not intersect the sphere
  r=re(sqrt(D4)); // sqrt should always be real
  (-b2-r,-b2+r);
);
// stereographic projection from sphere onto C using normal vector as input
// assumes normal is normalized
cgl3d.projection.sphereStereographicC = (normal) => (
  // A = l (x,y,z) + (1-l) (0,0,1)
  // 0 = l z + (1-l) = 1 + l (z-1) -> l = 1 / (1-z)
  (normal_1)/(1-normal_3) + i* (normal_2)/(1-normal_3);
);
// project sphere onto unit square using normal as input
// 1. convert position into two angles
// 2. map angles onto square
// assumes that normal is normalized
cgl3d.projection.sphereEquirect = (normal) => (
  regional(phi,theta);
  phi = arctan2(-normal_3,normal_1); // (-pi, pi]
  theta = arctan2(|(normal_1,normal_3)|,normal_2); // (-pi, pi]
  (1/(2*pi))*(phi+pi,2*theta+pi);
);
// feature TODO? add projection for non-axis aligned coordinate system

cgl3d.shader.sphere = (direction,isBack) => (
  regional(normal,texturePos,color);
  normal = cgl3d.compute.sphereNormal:(direction,cglCenter,isBack);
  texturePos = cglProjection:(normal);
  color = cglPixelExpr:(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight:(color,direction,normal);
);

/////////////////////
// cylinder
/////////////////////

// the two distances where the viewRay in the given direction intersects the cylinder defined by cglCenter, cglOrientation and cglRadius
cgl3d.compute.cylinderDepths = (direction) => (
  regional(w,W,BA,U,VA,S,T,a,b,c,D,r);
    // P lies on infinite cylinder around axis AB with radius r iff
    // |(P-A) - <P-A,B-A>/<B-A,B-A>*(B-A)| = r
    // P = V+l*D, BA = B-A , U := (B - A)/|B-A|²
    // |((V+l*D)-A) - <(V+l*D)-A,BA>*U| = r
    // |(V-A)-<V-A,BA>*U + l*(D-<D,BA>*U)| = r
    // S := (V-A)-<V-A,BA>*U,  T := <D,BA>*U+D
    // |S + l*T| = r
    // <S-l*T,S-l*T>-r²=0 -> l² <T,T> + l 2<S,T> + <S,S> - r^2 =0

    // pick point on viewRay closer to cylinder to increase numeric stability
    w = |cglSpacePos-cglCenter|;
    W = cglSpacePos + w*direction;
    BA = cglOrientation;
    U = BA/(BA*BA);
    VA = (W-cglCenter);
    S = VA - (VA*BA)*U;
    T = direction - (direction*BA)*U;
    a = T*T;
    b = S*T;
    c = S*S -cglRadius*cglRadius;
    D= b*b-a*c;
    if(D<0,cglDiscard()); // discard rays that do not intersect the cylinder
    r = re(sqrt(D));
    (w - (b + r)/a, w - (b - r)/a);
);
// intersections of ray in given direction with cylinder with circular end-caps
// needed for bounding box computations
cgl3d.compute.cappedCylinderDepths = (rayStart,direction,center,orientation,radius) => (
  regional(w,W,BA,U,VA,S,T,a,b,c,o,D,r,l,v,d,m0t,m1t,m0,m1,low,hi);
  w = |rayStart-center|;
  W = rayStart + w*direction;
  BA = orientation;
  U = BA/(BA*BA);
  VA = (W-center);
  S = VA - (VA*BA)*U;
  T = direction - (direction*BA)*U;
  a = T*T;
  b = S*T;
  c = S*S -radius*radius;
  D= b*b-a*c;
  if(D<0,cglDiscard()); // discard rays that do not intersect the cylinder
  r = re(sqrt(D));
  l = (- (b + r)/a, - (b - r)/a);
  // intersections with cutoff planes
  // normal: U, values at ends: <A,B-A>, <B,B-A>
  // <view + m * dir,(B-A)> = <view,B-A> + m * <dir,B-A>
  d = direction * U;
  v = W * U;
  c = center * U;
  o = orientation * U;
  // b >= v + m*d >= a -> (b-a)/d >= m >= (a-v)/d
  m0t = ((c-o)-v)/d;
  m1t = ((c+o)-v)/d;
  m0 = min(m0t,m1t);
  m1 = max(m0t,m1t);
  // lowBound: -w, m0, l_1
  // hi Bound: m1, l_2
  low = max(-w,max(m0,l_1));
  hi = min(m1,l_2);
  if(hi<=low,cglDiscard());
  [low+w,hi+w];
);

cglCylinderProjGetDirection1Default = lambda((normal,height,orientation),
  regional(d1);
  if(|orientation_1|<|orientation_2|,
    d1=normalize(cross(orientation,(1,0,0)));
  ,
    d1=normalize(cross(orientation,(0,1,0)));
  );
);
// project cylinder onto unit square using normal and height as input
// assumes that normal is normalized, and height is in the range -1..1
cgl3d.projection.cylinder = (normal,height,orientation) => (
  regional(d1,d2);
  d1 = cglCylinderProjGetDirection1:(normal,height,orientation);
  d2 = -normalize(cross(orientation,d1));
  ((arctan2(d1*normal,d2*normal)+pi)/(2*pi),0.5*(height+1));
);

cglCapVoidShader = lambda((direction,cylinderDepths,delta,U,cutVector),
    cglDiscard();
    (0,0,0,0) // compiler cannot detect that code is unreachable -> have to return correct type
    // bug TODO make compiler realize that code after discard is unreachable
);
cglCapOpenShaderNoBack = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(v2,delta2,normal);
    v2 = (cglSpacePos+cylinderDepths_2*direction)-cglCenter;
    delta2 = v2*cutVector;
    if(delta2*delta>1,cglDiscard());
    cgl3d.compute.pixelDepth:(cylinderDepths_2,direction);
    normal = normalize(v2-delta2*cglOrientation);
    (normal_1,normal_2,normal_3,delta2);
);
cglCapOpenShaderBack = cglCapVoidShader;
cglCapRoundShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,normal);
    m = cglCenter+delta*cglOrientation;
    normal = cgl3d.compute.sphereNormal:(direction,m,false);
    (normal_1,normal_2,normal_3,delta);
);
cglCapRoundShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,normal);
    m = cglCenter+delta*cglOrientation;
    normal = cgl3d.compute.sphereNormal:(direction,m,true);
    (normal_1,normal_2,normal_3,delta);
);
cglCapFlatShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,a,normal);
    m = cglCenter+delta*cglOrientation;
    // <v + a*d,o> = <m,o>
    a = (m*cglOrientation-cglSpacePos*cglOrientation)/(direction*cglOrientation);
    if(|cglSpacePos + a*direction - m| > cglRadius,cglDiscard());
    cgl3d.compute.pixelDepth:(a,direction);
    normal = normalize(cglOrientation*delta);
    (normal_1,normal_2,normal_3,delta)
);
cglCapFlatShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,a,normal);
    m = cglCenter+delta*cglOrientation;
    // <v + a*d,o> = <m,o>
    a = (m*cglOrientation-cglSpacePos*cglOrientation)/(direction*cglOrientation);
    if(|cglSpacePos + a*direction - m| > cglRadius,cglDiscard());
    cgl3d.compute.pixelDepth:(a,direction);
    normal = -normalize(cglOrientation*delta);
    (normal_1,normal_2,normal_3,delta)
);
cglCapAngleFlatShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,a,p,o,normal);
    m = cglCenter+delta*cglOrientation;
    // <v + a*d,n> = <m,n>
    a = (m*cutVector-cglSpacePos*cutVector)/(direction*cutVector);
    p = cglSpacePos + a*direction;
    o = normalize(cglOrientation);
    if(|p-m - ((p-m)*o)*o| > cglRadius,cglDiscard());
    cgl3d.compute.pixelDepth:(a,direction);
    normal = delta*normalize(cutVector);
    delta = (p-cglCenter)*U;
    (normal_1,normal_2,normal_3,delta)
);
cglCapAngleFlatShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,a,p,o,normal);
    m = cglCenter+delta*cglOrientation;
    // <v + a*d,n> = <m,n>
    a = (m*cutVector-cglSpacePos*cutVector)/(direction*cutVector);
    p = cglSpacePos + a*direction;
    o = normalize(cglOrientation);
    if(|p-m - ((p-m)*o)*o| > cglRadius,cglDiscard());
    cgl3d.compute.pixelDepth:(a,direction);
    normal = -delta*normalize(cutVector);
    delta = (p-cglCenter)*U;
    (normal_1,normal_2,normal_3,delta)
);
cglCapAngleVoidRoundShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
  regional(res,v2);
  res = cglCapRoundShaderFront:(direction,cylinderDepths,delta,U,cutVector);
  v2 = cglSpacePos + cglRawDepth * direction - cglCenter;
  if((delta*(v2*cutVector)>1) % (delta*(v2*U)<1),cglDiscard());
  res
);
cglCapAngleVoidRoundShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
  regional(res,v2);
  res = cglCapRoundShaderBack:(direction,cylinderDepths,delta,U,cutVector);
  v2 = cglSpacePos + cglRawDepth * direction - cglCenter;
  if((delta*(v2*cutVector)>1) % (delta*(v2*U)<1),cglDiscard());
  res
);

cglCutOrthogonal = lambda((delta,v),delta);
cglCutVector1 = lambda((delta,v),v*cglCutDir1);
cglCutVector2 = lambda((delta,v),v*cglCutDir2);
cglCutBoth1 = lambda((delta,v),min(delta,v*cglCutDir1)); // code TODO? better name
cglCutBoth2 = lambda((delta,v),max(delta,v*cglCutDir2));

cglCapCutFlat1 = lambda((v2,U),
  v2*U<-1
);
cglCapCutFlat2 = lambda((v2,U),
  v2*U>1
);
cglCapCutRound1 = lambda((v2,U),
  // v2 = pos3d - center ->  pos3d - m = v2 + center - (center-orientation) = v2 - orientation
  cglCapCutFlat1:(v2,U) & (|v2 + cglOrientation| > cglRadius)
);
cglCapCutRound2 = lambda((v2,U),
  cglCapCutFlat2:(v2,U) & (|v2 - cglOrientation| > cglRadius)
);
cglCapCutAngle1 = lambda((v2,U),
  v2*cglCutDir1<-1
);
cglCapCutAngle2 = lambda((v2,U),
  v2*cglCutDir2>1
);
cglCapCutAngleRound1 = lambda((v2,U),
  cglCapCutRound1:(v2,U) % cglCapCutAngle1:(v2,U);
);
cglCapCutAngleRound2 = lambda((v2,U),
  cglCapCutRound2:(v2,U) % cglCapCutAngle2:(v2,U);
);

// wrap getting cut-normal in lazy-function to save uniform variable in case where normal is not needed
cglCutVectorNone = lambda((U),U);
cglGetCutVector1 = lambda((U),cglCutDir1);
cglGetCutVector2 = lambda((U),cglCutDir2);

cgl3d.cylinderCap = {};

cgl3d.cylinderCap.void = {"name":"Void","shaderFront":cglCapVoidShader,"shaderBack":cglCapVoidShader,
  "shaderNoBack":cglCapVoidShader,"capCut1":cglCapCutFlat1,"capCut2":cglCapCutFlat2};
cgl3d.cylinderCap.open = {"name":"Open","shaderFront":cglCapVoidShader,"shaderBack":cglCapOpenShaderBack,
  "shaderNoBack":cglCapOpenShaderNoBack,"capCut1":cglCapCutFlat1,"capCut2":cglCapCutFlat2};
cgl3d.cylinderCap.flat = {"name":"Flat","shaderFront":cglCapFlatShaderFront,"shaderBack":cglCapFlatShaderBack,
  "shaderNoBack":cglCapFlatShaderFront,"capCut1":cglCapCutFlat1,"capCut2":cglCapCutFlat2};
cgl3d.cylinderCap.round = {"name":"Round","shaderFront":cglCapRoundShaderFront,"shaderBack":cglCapRoundShaderBack,
  "shaderNoBack":cglCapRoundShaderFront,"capCut1":cglCapCutRound1,"capCut2":cglCapCutRound2};
cgl3d.cylinderCap.cutVoid = (normal) => {"name":"Cut-Void","cutDirection":normal,"cutOrthogonal":false,
  "shaderFront":cglCapVoidShader,"shaderNoBack":cglCapVoidShader,"shaderBack":cglCapVoidShader,
  "capCut1":cglCapCutAngle1,"capCut2":cglCapCutAngle2};
cgl3d.cylinderCap.cutOpen = (normal) => {"name":"Cut-Open","cutDirection":normal,"cutOrthogonal":false,
  "shaderFront":cglCapVoidShader,"shaderNoBack":cglCapOpenShaderNoBack,"shaderBack":cglCapOpenShaderBack,
  "capCut1":cglCapCutAngle1,"capCut2":cglCapCutAngle2};
cgl3d.cylinderCap.cutFlat = (normal) => {"name":"Cut-Flat","cutDirection":normal,"cutOrthogonal":false,
  "shaderFront":cglCapAngleFlatShaderFront,"shaderNoBack":cglCapAngleFlatShaderFront,"shaderBack":cglCapAngleFlatShaderBack,
  "capCut1":cglCapCutAngle1,"capCut2":cglCapCutAngle2};
cgl3d.cylinderCap.cutVoidRound = (normal) => {"name":"Cut-Round","cutDirection":normal,"cutOrthogonal":true,
  "shaderFront":cglCapAngleVoidRoundShaderFront,"shaderNoBack":cglCapAngleVoidRoundShaderFront,"shaderBack":cglCapAngleVoidRoundShaderBack,
  "capCut1":cglCapCutAngleRound1,"capCut2":cglCapCutAngleRound2};

cgl3d.connect = {};

cgl3d.connect.open = -1;
cgl3d.connect.round = 0;
cgl3d.connect.flat = 1; // feature TODO? better name


// feature TODO? separate projection for end-caps
cgl3d.shader.cylinder = (direction) => (
  regional(l,BA,U,v1,delta,normalAndHeight,v2,normal,texturePos,color,pos3d);
  l = cgl3d.compute.cylinderDepths:(direction);
  BA = cglOrientation;
  U = BA/(BA*BA);
  v1 = (cglSpacePos+l_1*direction)-cglCenter;
  delta = (v1*U);
  if(cglCut1:(delta,v1)<-1, // cap1
    // opt TODO? is there a less nested algorithm for correctly handling intersecting end-caps
    if(cglCut2:(delta,v1)>1, // cap1 & cap2
      // -> pick cut that is further from viewPosition
      // <v + a*d,n> = <m,n>
      cutVector1=cglGetCutVector1:(U);
      cutVector2=cglGetCutVector2:(U);
      a1 = ((cglCenter-cglOrientation)*cutVector1-cglSpacePos*cutVector1)/(direction*cutVector1);
      a2 = ((cglCenter+cglOrientation)*cutVector2-cglSpacePos*cutVector2)/(direction*cutVector2);
      if(a1<a2,
        normalAndHeight = cglCap2front:(direction,l,1,U,cglGetCutVector2:(U));
        v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1:(v2,U), // cap1 and cap2
          normalAndHeight = cglCap1front:(direction,l,-1,U,cglGetCutVector1:(U));
          v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut2:(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      ,
        normalAndHeight = cglCap1front:(direction,l,-1,U,cglGetCutVector1:(U));
        v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut2:(v2,U), // cap1 and cap2
          normalAndHeight = cglCap2front:(direction,l,1,U,cglGetCutVector2:(U));
          v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut1:(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      );
    ,
      normalAndHeight = cglCap1front:(direction,l,-1,U,cglGetCutVector1:(U));
      v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
      // opt TODO? omit check for second cap if both caps are cut orthogonal to cylinder
      if(cglCapCut2:(v2,U), // cap1 and cap2
        normalAndHeight = cglCap2front:(direction,l,1,U,cglGetCutVector2:(U));
        v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1:(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
      );
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection:(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  ,if(cglCut2:(delta,v1)>1, // cap2
    normalAndHeight = cglCap2front:(direction,l,1,U,cglGetCutVector2:(U));
    v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
    if(cglCapCut1:(v2,U), // cap1 and cap2
      normalAndHeight = cglCap1front:(direction,l,-1,U,cglGetCutVector1:(U));
      v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
      if(cglCapCut2:(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection:(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  , // intersection with body of cylinder
    cgl3d.compute.pixelDepth:(l_1,direction);
    normal = normalize(v1-delta*BA);
    texturePos = cglProjection:(normal,max(-1,min(delta,1)),cglOrientation);
  ));
  color = cglPixelExpr:(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight:(color,direction,normal);
);
cgl3d.shader.cylinderBack = (direction) => (
  regional(l,BA,U,v2,delta,normalAndHeight,v3,normal,texturePos,color,pos3d);
  l = cgl3d.compute.cylinderDepths:(direction);
  BA = cglOrientation;
  U = BA/(BA*BA);
  v2 = (cglSpacePos+l_2*direction)-cglCenter;
  delta = (v2*U);
  if(cglCut1:(delta,v2)<-1, // cap 1
    if(cglCut2:(delta,v2)>1, // cap1 & cap2
      // -> pick cut that is further from viewPosition
      // <v + a*d,n> = <m,n>
      cutVector1=cglGetCutVector1:(U);
      cutVector2=cglGetCutVector2:(U);
      a1 = ((cglCenter-cglOrientation)*cutVector1-cglSpacePos*cutVector1)/(direction*cutVector1);
      a2 = ((cglCenter+cglOrientation)*cutVector2-cglSpacePos*cutVector2)/(direction*cutVector2);
      if(a1<a2,
        normalAndHeight = cglCap2back:(direction,l,1,U,cglGetCutVector2:(U));
        v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1:(v3,U), // cap1 and cap2
          normalAndHeight = cglCap1back:(direction,l,-1,U,cglGetCutVector1:(U));
          v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut2:(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      ,
        normalAndHeight = cglCap1back:(direction,l,-1,U,cglGetCutVector1:(U));
        v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut2:(v3,U), // cap1 and cap2
          normalAndHeight = cglCap2back:(direction,l,1,U,cglGetCutVector2:(U));
          v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut1:(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      );
    ,
      normalAndHeight = cglCap1back:(direction,l,-1,U,cglGetCutVector1:(U));
      v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
      if(cglCapCut2:(v3,U), // cap1 and cap2
        normalAndHeight = cglCap2back:(direction,l,1,U,cglGetCutVector2:(U));
        v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1:(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
      );
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection:(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  ,if(cglCut2:(delta,v2)>1, // cap2
    normalAndHeight = cglCap2back:(direction,l,1,U,cglGetCutVector2:(U));
    v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
    if(cglCapCut1:(v3,U), // cap1 and cap2
      normalAndHeight = cglCap1back:(direction,l,-1,U,cglGetCutVector1:(U));
      v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
      if(cglCapCut2:(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection:(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  , // intersection with body of cylinder
    cgl3d.compute.pixelDepth:(l_2,direction);
    normal = normalize(v2-delta*BA);
    texturePos = cglProjection:(normal,max(-1,min(delta,1)),cglOrientation);
  ));
  color = cglPixelExpr:(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight:(color,direction,normal);
);

/////////////////////
// simple surface-renderer: common
/////////////////////

// simple algorithm for small degree surfaces:
// bisection using Rolles theorem
// between any two roots of p there has to be a root of p'
//     l   u
//      \ /
//   l   a0  u   <-roots of p1
//    \ / \ /
// l   b0  b1  u <-roots of p2
//  \ / \ / \ /
//l  c0  c1  c2  <-roots of p3
// \ / \ / \ / \ /
// d0  d1  d2  d3 <-roots of p4
// use lazy-procedures to allow multiple signatures for same code
// feature TODO? add a way to call same function with multiple signatures
cglEvalP = lambda((coeffs,t),
  regional(s);
  s = 0;
  forall(reverse(coeffs),c,s = t*s + c);
  s;
);
cglD = lambda(coeffs,
  apply(1..(length(coeffs)-1),k,k*coeffs_(k+1));
);
cglBinSearchP = lambda((poly, x0, x1, def),
  regional(v0, v1, m, vm);
  v0 = cglEvalP:(poly, x0);
  v1 = cglEvalP:(poly, x1);
  if(v0*v1<=0,
    repeat(16,
      m = (x0+x1)/2;
      vm = cglEvalP:(poly, m);
      if(v0*vm<=0,
        (x1 = m; v1 = vm;),
        (x0 = m; v0 = vm;)
      );
    );
    m,
    def
  )
);
// wrapper function for cglBinSearchP instantiated for each commonly used degree
cglBinSearchP4(poly, x0, x1, def) := cglBinSearchP:(poly, x0, x1, def);
cglBinSearchP3(poly, x0, x1, def) := cglBinSearchP:(poly, x0, x1, def);
cglBinSearchP2(poly, x0, x1, def) := cglBinSearchP:(poly, x0, x1, def);
cglBinSearchP1(poly, x0, x1, def) := cglBinSearchP:(poly, x0, x1, def);
 //finds the k-th root of poly in interval (l, u). returns def if there is none
cglKthrootP3(k, poly, l, u, def) := (
  regional(p1, p2, p3, a0, b0, b1, c0, c1, c2, count);
  p3 = poly;  //cubic
  p2 = cglD:(p3); //quadratic
  p1 = cglD:(p2); //linear

  a0 = cglBinSearchP1(p1, l, u, u);
  b0 = cglBinSearchP2(p2, l, a0, l);
  c0 = cglBinSearchP3(p3, l, b0, l);
  count = (l < c0 & c0 < u);
  if(count >= k, c0,
    b1 = cglBinSearchP2(p2, a0, u, u);
    c1 = cglBinSearchP3(p3, b0, b1, c0);
    count = count + (c0 < c1 & c1 < u);
    if(count >= k, c1,
      c2 = cglBinSearchP3(p3, b1, u, u);
      count = count + (c1 < c2 & c2 < u);
      if(count >= k, c2, def);
    );
  );
);
cglKthrootP4(k, poly, l, u, def) := (
  regional(p1, p2, p3, p4, a0, b0, b1,
    c0, c1, c2, d0, d1, d2, d3,count);
  p4 = poly;  //quartic
  p3 = cglD:(p4); //cubic
  p2 = cglD:(p3); //quadratic
  p1 = cglD:(p2); //linear

  a0 = cglBinSearchP1(p1, l, u, u);
  b0 = cglBinSearchP2(p2, l, a0, l);
  c0 = cglBinSearchP3(p3, l, b0, l);
  d0 = cglBinSearchP4(p4, l, c0, l);
  count = (l < d0 & d0 < u);
  if(count >= k, d0,
    b1 = cglBinSearchP2(p2, a0, u, u);
    c1 = cglBinSearchP3(p3, b0, b1, c0);
    d1 = cglBinSearchP4(p4, c0, c1, d0);
    count = count + (d0 < d1 & d1 < u);
    if(count >= k, d1,
      c2 = cglBinSearchP3(p3, b1, u, u);
      d2 = cglBinSearchP4(p4, c1, c2, d1);
      count = count + (d1 < d2 & d2 < u);
      if(count >= k, d2,
        d3 = cglBinSearchP4(p4, c2, u, u);
        count = count + (d2 < d3 & d3 < u);
        if(count >= k, d3, def);
      );
    );
  );
);

/////////////////////
// torus
/////////////////////


cglTorusProjGetDirection1Default = lambda((normal,radiusDirection,orientation),
  normalize(cross(orientation,if(abs(orientation_1)<abs(orientation_2),(1,0,0),(0,1,0))));
);
// the torus with the given orientation onto the unit square using normal vector and radius-direction as input
// assumes that normal and radiusDirection are normalized
cgl3d.projection.torus = (normal,radiusDirection,orientation) => (
  regional(v1,v2,phi1,phi2);
  v1 = cglTorusProjGetDirection1:(normal,radiusDirection,orientation);
  v2 = -normalize(cross(orientation,v1));
  phi1 = arctan2(radiusDirection*v1,radiusDirection*v2)+pi;
  phi2 = arctan2(normal*radiusDirection,normal*orientation)+pi;
  (phi1,phi2)/(2*pi);
);
// opt TODO? separate bounding box-type for torus
cgl3d.shader.torus = (direction,layer) => (
  regional(center,radius1,radius2,v,V,vc,b0,c0,D0,x0,x1,
    orientation,b1,c1,E,W,a2,b2,c2,p3,p2,p1,p0,dst,pos3d,pc,
    arcDirection,arcCenter,normal,color,texturePos);
  // compute torus coordinates from cylinder bounding box arguments
  //   reduces number of needed uniforms
  center = cglCenter;
  radius1 = cglRadii_1;
  radius2 = cglRadii_2;
  v=|center-cglSpacePos|;
  V=cglSpacePos+v*direction;
  // 1. find intersections of view-ray with sphere around center with given radius r1+r2
  // |v+l*d -c|=r
  vc=V-center;
  // -> l*l <d,d> + l * 2<v-c,d> + <v-c,v-c> - r*r
  b0=(vc*direction);
  c0=vc*vc-cglRadius*cglRadius;//cglRadius = r1+r2
  // add small buffer distance to balance out numeric instability in bounding sphere
  D0=b0*b0-c0+0.001;
  if(D0<0,cglDiscard());
  x0=-b0-re(sqrt(D0));
  x1=-b0+re(sqrt(D0));
  orientation = normalize(cglOrientation);
  V = V - cglCenter; // update coordinate system such that center is at (0,0,0)
  // Equation for torus in orthogonal coord-system with unit vectors v1,v2,o
  // (sqrt(<P,v1>²+<P,v2>²)-r1)² + <P,o>² = r2²  =>
  // (<P,P> + r1²-r2²)² = 4 r1 ² (<P-<P,o>o,P-<P,o>o>)
  // P = V + l*D
  // (<V+l*D,V+l*D> + r1²-r2²)² = 4 r1 ² (<V+l*D-<V+l*D,o>o,V+l*D-<V+l*D,o>o>)
  // A² = B with  W := V-<V,o>o  E := D-<D,o>o
  // A := (<V+l*D,V+l*D> + r1²-r2²)
  //    = (<V,V>+l*2<V,D>+l²<D,D> + r1²-r2²)
  // B := 4 R² (<W+l*E,W+l*E>) = 4 r1 ² (<W,W>+l*2<W,E>+l²<E,E>)
  //  a1 := <D,D> = 1 b1 := <V,D> c1 := r1²-r2²+<V,V>
  //  a2 := <E,E> b2 := <W,E> c2 := <W,W>
  // (l² + l 2*b1 + c1)² = 4 r1² (l² a2 + l 2b2 + c2)
  // l⁴
  // l³  4 b1
  // l²  (2 c1 + 4 b1^2) -4 r1² a2
  // l   4 b1 c1 - 4 r1² 2 b2
  //     c1² - 4 r1² c2
  b1 = V * direction;
  c1 = radius1*radius1-radius2*radius2 + V*V;
  E = direction - (direction*orientation)*orientation;
  W = V - (V*orientation)*orientation;
  a2 = E*E;
  b2 = W*E;
  c2 = W*W;
  p3 = 4*b1;
  p2 = 2*c1 + 4*b1*b1 - 4*radius1*radius1*a2;
  p1 =  4*b1*c1 - 8*radius1*radius1*b2;
  p0 =  c1*c1 - 4*radius1*radius1*c2;
  dst=cglKthrootP4(layer,[p0,p1,p2,p3,1],x0,x1,x0-1);
  if(dst<x0,cglDiscard());
  pos3d = cglSpacePos+ (v+dst)*direction;
  pc=pos3d-center;
  arcDirection = normalize(pc-(orientation*pc)*orientation);
  arcCenter = center+radius1*arcDirection;
  normal = normalize(pos3d - arcCenter);
  cgl3d.compute.pixelDepth:(v+dst,direction);
  texturePos = cgl3d.projection.torus:(normal,arcDirection,orientation); // TODO? customize through modifier
  cglCheckAngle1:(texturePos);
  cglCheckAngle2:(texturePos);
  color = cglPixelExpr:(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight:(color,direction,normal);
);

/////////////////////
// polygons & meshes
/////////////////////

cgl3d.shader.triangle = (direction) => (
  regional(color,normal,texCoord);
  cglRawDepth = |cglSpacePos-cglSpacePos|; // set raw depth to correct value (depth is handled by v-shader)
  texCoord = cglTextureMapping:(cglSpacePos,direction);
  normal = cglNormalExpr:(cglSpacePos,texCoord);
  color = cglPixelExpr:(texCoord,cglSpacePos,normal);
  cglLight:(color,direction,normal);
);

cgl3d.normalType = {};
cgl3d.normalType.flat = 0;
cgl3d.normalType.face = 0;
cgl3d.normalType.triangle = 1;
cgl3d.normalType.vertex = 2;
cgl3d.normalType.pixel = 3;

cgl3d.triangulate = {};
cgl3d.triangulate.corner = (elts) => (
  regional(root);
  root = elts_1;
  flatten(apply(2..(length(elts)-1),i,
    [root,elts_i,elts_(i+1)];
  ));
);
cgl3d.triangulate.spiral = (elts) => (
  regional(eltCount,even,odd);
  eltCount = length(elts);
  if(eltCount<=3,
    if(eltCount<3,[],elts)
  ,
    even = flatten(apply(1..(eltCount/2),i,(elts_(2*i-1),elts_(2*i),elts_(cglMod1plus(2*i+1,eltCount)))));
    odd = apply(1..(eltCount/2),i,elts_(2*i-1));
    if(mod(eltCount,2)==1,
      odd = prepend(elts_eltCount,odd);
    );
    even++cgl3d.triangulate.spiral:(odd);
  );
);
cgl3d.triangulate.center = (elts) => (
  regional(center);
  center = sum(elts)/length(elts);
  flatten(apply(1..(length(elts)-1),i,
    [center,elts_i,elts_(i+1)];
  ))++[center,elts_(length(elts)),elts_1];
);
cgl3d.compute.triangulationPolygon = (triangulator,vertices,vNormals,vModifiers,normalType) => (
  regional(triangles,n,vMap,vData);
  triangles = triangulator:(vertices);
  if(isundefined(vNormals) & normalType != cgl3d.normalType.pixel,
    vNormals = flatten(apply(1..(length(triangles)/3),i,
      n=normalize(cross(triangles_(3*i)-triangles_(3*i-1),triangles_(3*i-2)-triangles_(3*i-1)));
      [n,n,n];
    ));
    if(normalType==cgl3d.normalType.flat,
      // compute average normal
      vNormals = normalize(sum(vNormals)); // for flat normal-type normals is a single normal
    ,if(normalType==cgl3d.normalType.vertex,
      vMap = triangulator:(1..length(vertices));
      vData = apply(vertices,(0,0,0));
      // compute average normal for each vertex
      forall(1..length(vNormals),i,
        vData_(vMap_i) = vData_(vMap_i) + vNormals_i
      );
      forall(1..length(vNormals),i,
        vNormals_i = normalize(vData_(vMap_i));
      );
    ));
  ,
    vNormals = triangulator:(vNormals);
  );
  vModifiers=apply(vModifiers,e,triangulator:(e));
  (triangles,vNormals,vModifiers)
);
cgl3d.triangulate.default = cgl3d.triangulate.spiral;

cgl3d.mesh = {};

cgl3d.mesh.topologyOpen = {"x":"open","y":"open"};
cgl3d.mesh.topologyCloseX = {"x":"closed","y":"open"};
cgl3d.mesh.topologyCloseY = {"x":"open","y":"closed"};
cgl3d.mesh.topologyCloseXY = {"x":"closed","y":"closed"};

// feature TODO? allow mirrored closing
cgl3d.mesh.sampleVertex = 0;
cgl3d.mesh.sampleFace = 1;
cgl3d.mesh.sampleTriangle = 2;

cgl3d.mesh.samplesToTriangles = (samples,Nx,Ny,topology,sampleType) => (
  regional(p00,p01,p10,p11);
  // opt TODO? is handling closure by computing missing elements on demand more efficient
  if(topology.x == "closed",//close X
    if(length(samples_1)<Nx+1,
      samples = apply(samples,row,append(row,row_1));
    );
    Nx=Nx+1;
  );
  if(topology.y == "closed",//close Y
    if(length(samples)<Ny+1,
      samples = append(samples,samples_1);
    );
    Ny=Ny+1;
  );
  flatten(apply(1..(Ny-1),ny,
    apply(1..(Nx-1),nx,
      p00 = samples_ny_nx;
      p01 = samples_ny_(nx+1);
      p10 = samples_(ny+1)_nx;
      p11 = samples_(ny+1)_(nx+1);
      if(sampleType == cgl3d.mesh.sampleVertex,
        [p00,p01,p10,p01,p10,p11];
      ,if(sampleType == cgl3d.mesh.sampleFace,
        [p00,p00,p00,p00,p00,p00];
      ,
        [p00,p00,p00,p11,p11,p11];
      ));
    );
  ),levels->2);
);
cgl3d.mesh.guessNormals = (samples,Nx,Ny,normalType,topology) => (
  regional(n,vNormals,p00,p01,p10,p11,n1,n2,Nx1,Ny1);
  if(normalType == cgl3d.normalType.triangle,
    // opt TODO? pass triangles as input, to avoid recomputing triangulation
    if(topology.x == "closed",//close X
      samples = apply(samples,row,append(row,row_1));
      Nx=Nx+1;
    );
    if(topology.y == "closed",//close Y
      samples = append(samples,samples_1);
      Ny=Ny+1;
    );
    flatten(apply(1..(Ny-1),ny,
      apply(1..(Nx-1),nx,
        p00 = samples_ny_nx;
        p01 = samples_ny_(nx+1);
        p10 = samples_(ny+1)_nx;
        p11 = samples_(ny+1)_(nx+1);
        n1=normalize(cross(p01-p00,p10-p00));
        n2=-normalize(cross(p01-p11,p10-p11));
        [n1,n1,n1,n2,n2,n2];
      );
    ),levels->2);
  ,if(normalType == cgl3d.normalType.face,
    if(topology.x == "closed",//close X
      samples = apply(samples,row,append(row,row_1));
      Nx=Nx+1;
    );
    if(topology.y == "closed",//close Y
      samples = append(samples,samples_1);
      Ny=Ny+1;
    );
    flatten(apply(1..(Ny-1),ny,
      apply(1..(Nx-1),nx,
        p00 = samples_ny_nx;
        p01 = samples_ny_(nx+1);
        p10 = samples_(ny+1)_nx;
        p11 = samples_(ny+1)_(nx+1);
        n1=normalize(cross(p01-p00,p10-p00));
        n2=-normalize(cross(p01-p11,p10-p11));
        n = normalize(n1+n2);
        [n,n,n,n,n,n];
      );
    ),levels->2);
  , // vertex normals
    if(topology.x == "closed",//close X
      samples = apply(samples,row,append(row,row_1));
      Nx1=Nx+1;
    ,
      Nx1=Nx;
    );
    if(topology.y == "closed",//close Y
      samples = append(samples,samples_1);
      Ny1=Ny+1;
    ,
      Ny1=Ny;
    );
    vNormals=apply(1..Ny,ny,apply(1..Nx,nx,
      p00 = samples_ny_nx;
      n = (0,0,0);
      // normals oriented to point "up" when grid is flat
      if(nx>1 & ny > 1,
        n = n + cross(samples_(ny-1)_nx-p00,samples_ny_(nx-1)-p00);
      );
      if(nx>1 & ny<Ny1,
        n = n + cross(samples_ny_(nx-1)-p00,samples_(ny+1)_nx-p00);
      );
      if(nx<Nx1 & ny > 1,
        n = n + cross(samples_ny_(nx+1)-p00,samples_(ny-1)_nx-p00);
      );
      if(nx<Nx1 & ny<Ny1,
        n = n + cross(samples_(ny+1)_nx-p00,samples_ny_(nx+1)-p00);
      );
      normalize(n)
    ));
    // assign normals to corresponding vertices
    cgl3d.mesh.samplesToTriangles:(vNormals,Nx,Ny,topology,cgl3d.mesh.sampleVertex);
  ));
);

/////////////////////
// general algebraic surfaces
/////////////////////

// ray(direction, t) is the point in R^3 that lies at position t on the ray in direction direction
cglRay(direction, t) := (t * direction + cglSpacePos);

// casteljau algorithm to evaluate and subdivide polynomials in Bernstein form.
// poly is a vector containing the coefficients, i.e. p(x) = sum(0..N, i, poly_(i+1) * b_(i,N)(x)) where b_(i,N)(x) = choose(N, i)*x^i*(1-x)^(N-1)
cglEvalCasteljau(poly, x) := (
  regional(alpha, beta,N);
  N = length(poly)-1;
  alpha = 1-x;
  beta = x;
  forall(0..N, k,
    repeat(N-k,
      poly_# = alpha*poly_# + beta*poly_(#+1);
    );
  );
  poly_1 // poly contains the bernstein-coefficients of the polynomial in the interval [x,1]
);

cglSurfaceNsign(direction, a, b) := ( // Descartes rule of sign for the interval (a,b)
  regional(poly,ans);
  // obtain the coefficients in bernstein basis of cglSurfaceExpr along the ray in interval (a,b) by interpolation within this interval
  poly = cglInterpMat * apply(cglChebNodes,
    cglSurfaceExpr:(cglRay(direction, a+#*(b-a))) //evaluate cglSurfaceExpr(ray(direction, ·)) along Chebyshev nodes for (a,b)
  );
  // count the number of sign changes
  ans = 0;
  // last = poly_1;
  forall(2..length(poly), k,
    // if(last == 0, last = poly_k;); this (almost) never happens
    if(min(poly_(k-1), poly_k) <= 0 & 0 <= max(poly_(k-1), poly_k), // sign switch; avoid products due numerics
      ans = ans + 1;
    );
  );
  ans // return value
);
// bisect cglSurfaceExpr(ray(direction, ·)) in [x0, x1] assuming that cglSurfaceExpr(ray(direction, x0)) and cglSurfaceExpr(ray(direction, x1)) have opposite signs
cglSurfaceBisectf(direction, x0, x1) := (
    regional(v0, v1, m, vm);
    v0 = cglSurfaceExpr:(cglRay(direction, x0));
    v1 = cglSurfaceExpr:(cglRay(direction, x1));
    repeat(11,
        m = (x0 + x1) / 2; vm = cglSurfaceExpr:(cglRay(direction, m));
        if (min(v0,vm) <= 0 & 0 <= max(v0, vm), // sgn(v0)!=sgn(vm); avoid products due numerics
            (x1 = m; v1 = vm;),
            (x0 = m; v0 = vm;)
        );
    );
    m // return value
);

// temporary algorithm for texture computation on surfaces
// decomposes position into normal part and tangential part, then combine the corresponding texture coordinates
// ! local texture coordinates do not approximate euclidean plane on some flat surfaces (e.g. cylinder)
// map does not seem to be injective
// Feature TODO find better algorithm ; make algorithm customizable
cglSurfaceComputeTextureCoords(pos3d,normal) := (
  regional(phi,theta,p0,pos2d,alpha,ax,ay,S,C);
  // texture-coordinates of normal-vector on sphere
  phi = if(|normal_2|==1,0,arctan2(-normal_3,normal_1)); // (-pi, pi]
  theta = arctan2(|(normal_1,normal_3)|,normal_2); // (-pi, pi]
  p0 = (1/(2*pi))*(phi+pi,2*theta+pi);
  // part of position that is orthogonal to normal
  pos2d = pos3d - (normal*pos3d)*normal;
  // find rotation angle needed to make z-component of normal vector zero
  alpha = arctan2(normal_3,|(normal_1,normal_2)|);
  ax = -normal_2;
  ay = normal_1;
  S = sin(alpha);
  C = cos(alpha);
  // rotation around (ax,ay,0) with angle alpha
  pos2d = ((ax*ax* (1-C) + C, ax*ay* (1-C), ay* S),(ax*ay* (1-C), ay*ay* (1-C) + C, - ax*S),(-ay*S, ax*S, C))*pos2d;
  (pos2d_1+p0_1,pos2d_2+p0_2);
);
// update the color color for the pixel at in direction direction assuming that the surface has been intersected at ray(direction, dst)
// because of the alpha-transparency updatecolor should be called for the intersections with large dst first
cglSurfaceUpdateColor(direction, dst, color) := (
  regional(x,pos3d,normal,pixelCol);
  cgl3d.compute.pixelDepth:(dst,direction);
  x = cglRay(direction, dst); // the intersection point in R^3
  normal = normalize(cglNormalExpr:(x));
  pos3d = cglSpacePos+dst*direction;
  texCoord = cglSurfaceComputeTextureCoords(pos3d,normal);
  pixelCol = cglPixelExpr:(texCoord,pos3d,normal);
  color = (1 - cglAlpha) * color + cglAlpha * pixelCol;
  cglLight:(color,direction,normal);
);

// id encodes a node in a binary tree using heap-indices
// 1 is root node and node v has children 2*v and 2*v+1
// computes s=2^depth of a node id: Compute floor(log_2(id));
// purpose: id corresponds interval [id-s,id+1-s]/s
cglSurfaceRootItrGetS(id) := (
  regional(s);
  s = 1;
  repeat(10,
    if(2*s<=id,
      s = 2*s;
    )
  );
  s // return value
);
// determines the next node in the binary tree that would be visited by a regular in DFS
// if the children of id are not supposed to be visited
// In interval logic: finds the biggest unvisited interval directly right of the interval of id.
cglSurfaceRootItrNext(id) := (
  id = id+1;
  // now: remove zeros from right (in binary representation) while(id&1) id=id>>1;
  repeat(10,
    if(mod(id,2)==0,
      id = floor(id/2);
    )
  );
  if(id==1, 0, id) // return value - id 0 means we stop our DFS
);
// iterate roots from back to front, merge colors for roots
cglSurfaceIterateRoots(direction,l,u):=(
  regional(a,b,color,id,hasRoot,s,cnt);
  a = l;
  b = u;
  color = cglColor0;
  // traverse binary tree (DFS) using heap-indices
  //1 is root node and node v has children 2*v and 2*v+1
  id = 1;
  hasRoot = false;
  // maximum number of steps
  repeat((length(cglChebNodes)-1)*6,
    // id=0 means we are done; do only a DFS-step if we are not finished yet
    if(id>0,
      s = cglSurfaceRootItrGetS(id); // s = floor(log_2(id))

      // the intervals [a,b] are chosen such that (id in binary notation)
      // id = 1   => [a,b]=[l,u]
      // id = 10  => [a,b]=[l,(u+l)/2]
      // id = 101 => [a,b]=[l,(u+3*l)/4]
      // id = 11  => [a,b]=[(u+l)/2,u]
      //...
      a = u - (u-l)*((id+1)/s-1);
      b = u - (u-l)*((id+0)/s-1);
      // how many sign changes has cglSurfaceExpr(ray(direction, ·)) in (a,b)?
      cnt = cglSurfaceNsign(direction, a, b);
      // algorithm TODO? this way of checking for multi-root seems to create artifacts, is the check necessary/ is there a better way
      if(cnt == 1 /*% (b-a)<.01*cglResolution*/, // in this case we found a root (or it is likely to have a multiple root)
        //=>colorize and break DFS
        color = cglSurfaceUpdateColor(direction, cglSurfaceBisectf(direction, a, b), color);
        hasRoot = true;
        id = cglSurfaceRootItrNext(id)
      ,if(cnt == 0, // there is no root
        id = cglSurfaceRootItrNext(id) // break DFS
      ,
        // otherwise cnt>=2: there are cnt - 2*k roots.
        id = 2*id;  // visit first child within DFS
      ));
    )
  );
  if(!hasRoot,cglDiscard());
  [color_1,color_2,color_3,cglAlpha] // return value
);
// find the k-th root of surface (needed for rendering individual roots)
cglSurfaceKthRoot(direction,l,u,K):=(
  regional(a,b,rootCount,rootDepth,id,s,cnt,color);
  a = l;
  b = u;
  // iterate roots from front to back until k-th root is found, discard pixel if there are less than k roots
  rootDepth = -1;
  id = 1;
  rootCount = 0;
  // maximum number of steps
  repeat((length(cglChebNodes)-1)*6,
    // id=0 means we are done; do only a DFS-step if we are not finished yet
    if(id>0 & rootCount < K,
      s = cglSurfaceRootItrGetS(id); // s = floor(log_2(id))
      a = l - (l-u)*((id+0)/s-1);
      b = l - (l-u)*((id+1)/s-1);
      // how many sign changes has cglSurfaceExpr(ray(direction, ·)) in (a,b)?
      cnt = cglSurfaceNsign(direction, a, b);
      if(cnt == 1 /*% (b-a)<.01*cglResolution*/, // in this case we found a root (or it is likely to have a multiple root)
        //=>colorize and break DFS
        rootDepth = cglSurfaceBisectf(direction, a, b);
        rootCount = rootCount + 1;
        id = cglSurfaceRootItrNext(id);
      ,if(cnt == 0, // there is no root
        id = cglSurfaceRootItrNext(id) // break DFS
      ,
        // otherwise cnt>=2: there are cnt - 2*k roots.
        id = 2*id;  // visit first child within DFS
      ));
    )
  );
  if(rootCount < K,cglDiscard());
  color = cglSurfaceUpdateColor(direction,rootDepth, cglColor0);
  [color_1,color_2,color_3,cglAlpha] // return value
);
// what color should be given to pixel in  direction direction (vec3)
cgl3d.shader.surface = (direction) => (
  regional(depths,u,l);
  // discard points outside bounding sphere
  depths = cglCutoffRegion:(cglSpacePos,direction);
  l = depths_1;
  u = depths_2;
  cglSurfaceIterateRoots(direction,l,u);
);
// what color should be given to pixel in  direction direction (vec3)
cgl3d.shader.surfaceLayer = (direction) => (
  regional(depths,u,l);
  // discard points outside bounding sphere
  depths = cglCutoffRegion:(cglSpacePos,direction);
  l = depths_1;
  u = depths_2;
  cglSurfaceKthRoot(direction,l,u,K);
);

// maximum degree for interpolating surfaces
// values of kind 4*n-1 are good values, as it means to use vectors of length 4*n.
cglMaxDeg = 23; // for values above ~20 the root-computation becomes unstable
cglMaxAutoDeg = 15;
// cache for interpolation parameters to avoid repeated recomputation
cglSurfaceRenderStateCache = {
  "interpMap":{},
  "chebNodes":{}
};
// opt TODO? would computing elements of Chebyshev-nodes/interpolation-matrix on demand be faster than storing as uniform variable
// N+1 Chebyshev nodes for interval (0, 1)
cglSurfaceChebyshevNodes(N):=(
  regional(cache,val);
  cache=cglSurfaceRenderStateCache_"chebNodes";
  val = cache_N;
  if(isundefined(val),
    val = apply(1..(N+1), k, (cos((2 * k - 1) / (2 * (N+1)) * pi)+1)/2);
    cache_N=val;
    cglSurfaceRenderStateCache_"chebNodes" = cache;
  );
  val
);
// matrix for interpolating polynomials (in Bernstein basis), given the values [p(li_1), p(li_2), ...]
cglSurfaceInterpolationMatrix(N):=(
  regional(cache,val,A);
  cache=cglSurfaceRenderStateCache_"interpMap";
  val = cache_N;
  if(isundefined(val),
    // A is the matrix of the linear map that evaluates a polynomial in bernstein-form at the Chebyshev nodes
    A = apply(cglSurfaceChebyshevNodes(N), node,
      // the i-th column contains the values of the (i,N) bernstein polynomial evaluated at the Chebyshev nodes
      apply(0..N, i, cglEvalCasteljau(
        apply(0..N, if(#==i,1,0)), // e_i = [0,0,0,1,0,0]
        node // evaluate  b_(i,N)(node)
      ))
    );
    val = inverse(A);
    cache_N=val;
    cglSurfaceRenderStateCache_"interpMap" = cache;
  );
  val
);
// guess the degree of the trivariate polynomial F. This approximation is reliable up to degree ~20.
cglGuessdegHelper(F, s, x) := log(|F:(s*x)|)/log(s*|x|); // is approx. degree+log(leadingcoeff)/log(s*|x|) for large s
// bug TODO guessing degree this way can lead to wrong results for some rational functions  ( e.g.  (z^3-1)/(z*(z^2+1))  -> 1  )
cgl3d.compute.guessDegree = (F) => max(apply(1 .. 2, // take the best result of 2
  regional(x,s,l,best,it);
  x = [random(), random(), random()];
  s = 1;
  l = 1;
  best = 1;
  it = 0;
  while(l<100 & s < 1e50 & it<100, // throw away Infinity
    best = round(l);
    it = it+1;
    s = 2*s;
    l = 2*cglGuessdegHelper(F,s*s, x)-cglGuessdegHelper(F,s,x); // remove error caused by log(leadingcoeff)
  );
  if(it==100, best = 1000000);
  best
));

// use central difference to approximate dF
cgl3d.compute.guessDerivative = (F) => ( // opt TODO? avoid code duplication for repeated application of cglEval
  lambda(p,((
      (F:(p + [eps, 0, 0]) - F:(p - [eps, 0, 0])),
      (F:(p + [0, eps, 0]) - F:(p - [0, eps, 0])),
      (F:(p + [0, 0, eps]) - F:(p - [0, 0, eps]))
  ) / (2 * eps)),eps->.001,F->F)
);

cgl3d.bounds = {};
cgl3d.bounds.unbounded = {"type":"unbounded"};
cgl3d.bounds.sphere = (center,radius) => {"type":"sphere","center":center,"radius":radius};
cgl3d.bounds.cylinder = (point1,point2,radius) => {"type":"cylinder","point1":point1,"point2":point2,"radius":radius};
cgl3d.bounds.cuboid = (center,v1,v2,v3) => {"type":"cuboid","center":center,"v1":v1,"v2":v2,"v3":v3};

// bug TODO bounding box computation is broken (lower bound always returns 0?)
// get intersections of view-ray with cuboid given by center point and (scaled) directions of the three axes
cgl3d.compute.cuboidDepths = (rayStart,direction,center,up,left,front) => (
  regional(relCenter,l1,l2,l1t,l2t,d1,d2,d);
  relCenter = center-rayStart;
  // + up, - up
  d1 = up*(relCenter-up);
  d2 = up*(relCenter+up);
  d = up*direction;
  l1t = d1/d;
  l2t = d2/d;
  l1 = min(l1t,l2t);
  l2 = max(l1t,l2t);
  l1 = max(l1,0);
 // + left, - left
  d1 = left*(relCenter-left);
  d2 = left*(relCenter+left);
  d = left*direction;
  l1t = d1/d;
  l2t = d2/d;
  l1 = max(l1,min(l1t,l2t));
  l2 = min(l2,max(l1t,l2t));
   // + front, - front
  d1 = front*(relCenter-front);
  d2 = front*(relCenter+front);
  d = front*direction;
  l1t = d1/d;
  l2t = d2/d;
  l1 = max(l1,min(l1t,l2t));
  l2 = min(l2,max(l1t,l2t));
  if(l1>=l2,cglDiscard());
  [l1,l2];
);

// bug TODO update to work with new coordinate system
cgl3d.cutoff = {};
cgl3d.cutoff.screenSphere = {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  cgl3d.compute.sphereDepths:(rayStart,direction,(x0+x1,y0+y1,0)/2,min(|x1-x0|,|y1-y0|)/2)
),"bounds": cgl3d.bounds.unbounded,"modifs":{}};
cgl3d.cutoff.screenCylinder = {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1,r);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  r = min(|x1-x0|,|y1-y0|)/2.5;
  cgl3d.compute.cappedCylinderDepths:(rayStart,direction,(x0+x1,y0+y1,0)/2,[0,r,0],r)
),"bounds": cgl3d.bounds.unbounded,"modifs":{}};
cgl3d.cutoff.screenCylinder = (orientation) => {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1,r);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  r = min(|x1-x0|,|y1-y0|)/2.5;
  cgl3d.compute.cappedCylinderDepths:(rayStart,direction,(x0+x1,y0+y1,0)/2,r*cglBoxOrientation,r)),
  "bounds": cgl3d.bounds.unbounded,"modifs":{"cglBoxOrientation":normalize(orientation)}};
cgl3d.cutoff.screenCube = {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1,r);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  r = min(|x1-x0|,|y1-y0|)/3;
  cgl3d.compute.cuboidDepths:(rayStart,direction,(0,0,0),[r,0,0],[0,r,0],[0,0,r])
),"bounds": cgl3d.bounds.unbounded,"modifs":{}};

cgl3d.cutoff.sphere = (center,radius) => {"expr":lambda((rayStart,direction),
  cgl3d.compute.sphereDepths:(rayStart,direction,cglCenter,cglRadius)
),"bounds":cgl3d.bounds.sphere:(center,radius),"modifs":{}};
cgl3d.cutoff.cylinder = (point1,point2,radius) => {"expr":lambda((rayStart,direction),
  cgl3d.compute.cappedCylinderDepths:(rayStart,direction,cglCenter,cglOrientation,cglRadius)
),"bounds":cgl3d.bounds.cylinder:(point1,point2,radius),"modifs":{}};
cgl3d.cutoff.cube = (center,sideLength) => {"expr":lambda((rayStart,direction),
  cgl3d.compute.cuboidDepths:(rayStart,direction,cglCenter,cglCubeAxes_1,cglCubeAxes_2,cglCubeAxes_3)
),"bounds":cgl3d.bounds.cuboid:(center,[sideLength,0,0],[0,sideLength,0],[0,0,sideLength]),"modifs":{}};
cgl3d.cutoff.cube = (center,sideLength,up,front) => {
  "expr":lambda((rayStart,direction),
    cgl3d.compute.cuboidDepths:(rayStart,direction,cglCenter,cglCubeAxes_1,cglCubeAxes_2,cglCubeAxes_3)),
  "bounds":cgl3d.bounds.cuboid:(center,sideLength*normalize(up),sideLength*normalize(front),
    sideLength*normalize(cross(up,front))),"modifs":{}
};
cgl3d.cutoff.cuboid = (center,v1,v2,v3) => {
  "expr":lambda((rayStart,direction),
    cgl3d.compute.cuboidDepths:(rayStart,direction,cglCenter,cglCubeAxes_1,cglCubeAxes_2,cglCubeAxes_3)),
  "bounds":cgl3d.bounds.cuboid:(center,v1,v2,v3),"modifs":{}
};

// intersect cutoff-region with the half-space {P ; P*normal <= depth} // code TODO? better name
cglInterface("cutoffAddPlane",cglCutoffAddPlane,(oldCutoff,normal:(),depth:()),(plotModifiers));
cglCutoffAddPlane(oldCutoff,normal,depth):=(
  {
    "expr":lambda((rayStart,direction),
      regional(depths,l,n);
      depths = baseExpr:(rayStart,direction);
      // <v + l*d , n> <= x
      // <v,n> + l<d , n> <= x
      // l <= (x-<v,n>)/<d,n>
      n = normal:(); // current compiler does not support direct multplication with constant vector
      l = (depth:()-(rayStart*n))/(direction*n);
      if(n*direction>0,
        depths_2 = min(depths_2,l);
      ,
        depths_1 = max(depths_1,l);
      );
      if(depths_1>depths_2,cglDiscard());
      depths;
    ,baseExpr->oldCutoff_"expr",normal->normal,depth->depth),
    "bounds":oldCutoff_"bounds",
    "modifs":cglMergeDicts(oldCutoff_"modifs",cglValOrDefault(plotModifiers,{}))
  };
);

cgl3d.defaults = {};
cgl3d.defaultStack = [];
cgl3d.resetDefaults = () => (
  cgl3d.defaults = {};
  cgl3d.defaults.light = cgl3d.light.default;

  cgl3d.defaults.sphereColor = CGLnAMEDcOLORS_"red";
  cgl3d.defaults.sphereSize = 0.5;
  cgl3d.defaults.sphereAlpha = cglUndefinedVal();
  cgl3d.defaults.sphereProjection = cgl3d.projection.sphereEquirect;

  cgl3d.defaults.cylinderColor = CGLnAMEDcOLORS_"black";
  cgl3d.defaults.cylinderSize = 0.4;
  cgl3d.defaults.cylinderAlpha = cglUndefinedVal();
  cgl3d.defaults.cylinderCaps = cgl3d.cylinderCap.open;

  cgl3d.defaults.curveSamples = 32;
  cgl3d.defaults.curveCaps = cgl3d.cylinderCap.round;
  cgl3d.defaults.curveJoints =cgl3d.connect.round;

  cgl3d.defaults.torusColor = CGLnAMEDcOLORS_"blue";
  cgl3d.defaults.torusSize = 0.25;
  cgl3d.defaults.torusAlpha = cglUndefinedVal();

  cgl3d.defaults.triangleColor = CGLnAMEDcOLORS_"green";
  cgl3d.defaults.triangleAlpha = cglUndefinedVal();

  cgl3d.defaults.surfaceColor = CGLnAMEDcOLORS_"cyan";
  cgl3d.defaults.surfaceAlpha = 1;
  cgl3d.defaults.surfaceCutoff = cgl3d.cutoff.screenSphere;
);

cgl3d.saveDefaults = () => (
  cgl3d.defaultStack = append(cgl3d.defaultStack,
    apply(cgl3d.defaults,#) // push shallow copy of current defaults
  );
);
cgl3d.restureDefaults = () => (
  if(length(cgl3d.defaultStack)>0,
    // pop previous defaults from default-stack
    cgl3d.defaults = cgl3d.defaultStack_(length(cgl3d.defaultStack));
    cgl3d.defaultStack = apply(1..(length(cgl3d.defaultStack)-1),i,cgl3d.defaultStack_i);
  ,
    cgl3d.resetDefaults:();
  );
);
cgl3d.resetDefaults:(); // initialisation of code complete -> can initialize default values

/////////////////////
// user-interface
/////////////////////


// feature TODO:

// TODO? object groups
//  * cglGroupStart(); // -> start new group, returns groupId
//  * cglGroupEnd(); // -> end current group, returns groupId
// TODO? intersection of surfaces as primitive operation
// TODO? global clipping region
// TODO? better lighting system
// TODO function for updating/resetting defaults
// ? use internal global variables (-> document names of default values)
// ? always use cglAlpha even if explicitly not specified

// TODO? replace uses of `tags` with a "moveable" object-tag
// TODO? make bounding box parameters modifiers

// TODO? cglLogLevel(...) built-in for setting log-level

// bug TODO:
// FIXME better error message for dynamic array access
// ? does opengl support dynamic indexing
// TODO! lambda-modifiers can be undefined when evaluating texture code
// TODO rendering of mesh with overlapping transparent textures is partially broken
//    (when multiple transparent triangles are rendered in single call WebGL ignores lower ones)
//    ? add texture mode to automatically ignore pixels belows certain alpha value
// TODO side effects of function arguments are evaluated out of order
//   -> parameters that depend on global variables might have the wrong value
//   e.g. surface3d(x+y+z,colorExpr->(t=0;t,t=1;t,t=0.5;t)); produces a surface with color (0.5,0.5,0.5)
// ? change compiler to compute function arguments in order and store results in temporary variables
// TODO handle radius <= 0
// * <0 -> use abs-value, (? use mirrored texture coordinates)
// * torus with major radius 0 -> sphere with minor radius as radius
// TODO ensure modifiers are correctly initialized when directly calling other implementation
// TODO? support interaction between translucent mesh and other objects in multi-layer rendering mode
// ? render each triangle as a seperate layer (too expensive?)
// ? automatically split self-overlapping translucent meshes into multiple layers when rendering in layered mode
// TODO translucent 3D-objects do not seem to work correctly on some mobile browsers
// TODO curve3d is nummerically unstable if number of sample points gets large
//  ? special case: use round cylinder-caps if all elements are opaque and curve is closed or ends are round
// TODO? connect3d: angled caps might cut into next segment
// TODO spheres&surfaces break if view distance is moved far out (? use trick of "moving view closer to object" from cylinder/torus also for spheres/surfaces)
// TODO connect3d -> textures do not match for closed curves in connect3d (is this even possible if angle direction is constant along cylinders?)

// opt TODO:
// TODO? store texture-name in plotModifier instead of lambda-modifier
// TODO is there a way to avoid recompilation when texture changes
// TODO? prevent recompilation when lambda modifier changes
// TODO? WEBGL.get*Parameter is slow try to avoid use
// TODO? option to conditionally disable rendering (renderIf parameter analogously to opaqueIf)
// TODO?can rendering multiple texture-layeres in single shader call speed up rendering for multi-layered surfaces


/** new color API:
  two modifiers: color & texture (+colors for multi-point objects) + coresponding parameters for back-side
  color:
    a) RGB value as list
    b) cglColor("NAME")
    c) cglColorExpr(<expr>) // modifier: hasAlpha (defaults to false)
    d) cglTexture(<name>) // modifiers: hasAlpha, interpolate, repeat
  texture:
    a) Texture name
    b) cglTexture(<name>) // modifiers: hasAlpha, interpolate, repeat
    c) cglColorExpr(<expr>) // modifier: hasAlpha (defaults to false)
  colors -> list of colors
*/
lowercase(str):=(
  if(length(str)>0,
    sum(apply(str_(1..length(str)),c,
      if(c>="A" & c <= "Z",
        "abcdefghijklmnopqrstuvwxyz"_(indexOf("ABCDEFGHIJKLMNOPQRSTUVWXYZ",c))
      ,
        c
      )
    ))
  ,
    str
  )
);
cglParseHexDigit(d):=(
  indexOf("0123456789abcdef",d)-1;
);
cglParseHexDigits(digits):=(
  regional(x);
  x = 0;
  forall(digits,
    x = 16*x + cglParseHexDigit(#)
  );
  x;
);
cglColor(name):=(
  if(isString(name),
    name = lowercase(name);
    if(name_1=="#",
      regional(colorDigits,r,b,g,a);
      name = name_(2..length(name));
      if(length(name)==6,
        r = cglParseHexDigits(name_(1,2))/255;
        g = cglParseHexDigits(name_(3,4))/255;
        b = cglParseHexDigits(name_(5,6))/255;
        (r,g,b)
      ,if(length(name)==8,
        r = cglParseHexDigits(name_(1,2))/255;
        g = cglParseHexDigits(name_(3,4))/255;
        b = cglParseHexDigits(name_(5,6))/255;
        a = cglParseHexDigits(name_(7,8))/255;
        (r,g,b,a)
      ,if(length(name)==3,
        r = cglParseHexDigit(name_1)/15;
        g = cglParseHexDigit(name_2)/15;
        b = cglParseHexDigit(name_3)/15;
        (r,g,b)
      ,if(length(name)==4,
        r = cglParseHexDigit(name_1)/15;
        g = cglParseHexDigit(name_2)/15;
        b = cglParseHexDigit(name_3)/15;
        a = cglParseHexDigit(name_4)/15;
        (r,g,b,a)
      ,
        cglLogError("hex color should have 3,4,6 or 8 digits");
      ))));
    ,
      cglValOrDefault(CGLnAMEDcOLORS_name,(0.5,0.5,0.5))
    )
  , // TODO? verify that name is a valid color
    name
  )
);
cglInterface("cglColorExpr",cglColorExprImpl,(expr:(texturePos,spacePos,normal)),(hasAlpha));
cglColorExprImpl(expr):=(
  {
    "type": "expr",
    "expr": expr,
    "hasAlpha": cglValOrDefault(hasAlpha,false)
  }
);
cglInterface("cglTexture",cglTextureImpl,(name),(hasAlpha,interpolate,repeatTexture));
cglTextureImpl(name):=(
  {
    "type": "texture",
    "name": name,
    "hasAlpha": cglValOrDefault(hasAlpha,false),
    "interpolate": cglValOrDefault(interpolate,true),
    "repeat": cglValOrDefault(repeatTexture,false)
  }
);
// helper functions for resolving of colorExpression/textures
// pick the first defined color expression return undefined if there is none
// code TODO? to which extend can this function be shortened by extracting code
cglPixelExprFromTexture(texture,hasAlpha,textureAlpha,repeatTexture,interpolateTexture):=(
    if(textureAlpha,
      pixelExpr = if(hasAlpha,
        lambda((texturePos,spacePos,normal),
          regional(col);
          col=cglTexture(texture,texturePos,repeat->repeatTexture,interpolate->interpolateTexture);
          (col_1,col_2,col_3,col_4*cglAlpha)
        ,texture->texture,repeatTexture->repeatTexture,interpolateTexture->interpolateTexture);
      ,
        lambda((texturePos,spacePos,normal),
          cglTexture(texture,texturePos,repeat->repeatTexture,interpolate->interpolateTexture)
        ,texture->texture,repeatTexture->repeatTexture,interpolateTexture->interpolateTexture);
      );
    ,
      pixelExpr = if(hasAlpha,
        lambda((texturePos,spacePos,normal),
          regional(col);
          col=cglTextureRGB(texture,texturePos,repeat->repeatTexture,interpolate->interpolateTexture);
          (col_1,col_2,col_3,cglAlpha)
        ,texture->texture,repeatTexture->repeatTexture,interpolateTexture->interpolateTexture);
      ,
        lambda((texturePos,spacePos,normal),
          cglTextureRGB(texture,texturePos,repeat->repeatTexture,interpolate->interpolateTexture)
        ,texture->texture,repeatTexture->repeatTexture,interpolateTexture->interpolateTexture);
      );
    )
);
cglPixelExprFromExpr(expr,hasAlpha,exprAlpha):=(
  if(exprAlpha,
    if(hasAlpha,
      lambda((texturePos,spacePos),
        regional(col);
        col=expr:(texturePos,spacePos);
        (col_1,col_2,col_3,col_4*cglAlpha)
      ,expr->expr);
    ,
      expr
    );
  ,
    if(hasAlpha,
      lambda((texturePos,spacePos),
        regional(col);
        col=expr:(texturePos,spacePos);
        (col_1,col_2,col_3,cglAlpha)
      ,expr->expr);
    ,
      expr
    );
  )
);

CglColorsIgnore = 0; // ignore colors field
CglColorsInterpolate = 1; // interpolate between colors_1 and colors_2 usign texPos_2 (cylinder)
CglColorsVertex = 2; // one color per vertex
cglResolveColorExpr0(hasAlpha,colorsMode,isBack):=(
  regional(pixelExpr,usesAlpha,modifiers,vModifiers);
  hasAlpha = cglValOrDefault(hasAlpha,false); // undefined condition would be silent failure
  repeatTexture = false;
  interpolateTexture = true;
  modifiers = {};
  vModifiers = {};
  usesAlpha = false;
  if(!isundefined(texture),
    if(isString(texture),
      pixelExpr = cglPixelExprFromTexture(texture,hasAlpha,false,repeatTexture,interpolateTexture);
    ,if(texture:"type"=="texture",
      usesAlpha = texture:"hasAlpha";
      pixelExpr = cglPixelExprFromTexture(texture:"name",hasAlpha,texture:"hasAlpha",texture:"repeat",texture:"interpolate");
    ,if(texture:"type"=="expr",
      usesAlpha = texture:"hasAlpha";
      pixelExpr = cglPixelExprFromExpr(texture:"expr",hasAlpha,texture:"hasAlpha");
    ,
      cglLogError("unexpected value for texture: "+texture);
    )))
  );
  if(colorsMode != CglColorsIgnore & isundefined(pixelExpr) & !isundefined(colors),
    colors = apply(colors,cglNormalColor(#));
    usesAlpha = false;
    forall(colors,col,usesAlpha = usesAlpha % length(col)==4);
    if(usesAlpha, // ensure all colors have the same length
      colors = apply(colors,col,if(length(col)<4,(col_1,col_2,col_3,1),col));
    );
    if(colorsMode == CglColorsVertex,
      colorData = if(isBack,lambda((),cglColorBack),lambda((),cglColor));
      pixelExpr = if(hasAlpha,
        if(length(colors_1)==4,
          lambda((texPos,pos3d,normal),
            regional(col);col = colorData:();
            (col_1,col_2,col_3,col_4*cglAlpha)
          ,colorData->colorData);
        ,
          lambda((texPos,pos3d,normal),
            regional(col);col = colorData:();
            (col_1,col_2,col_3,cglAlpha)
          ,colorData->colorData);
        );
      ,
        lambda((texPos,pos3d,normal),colorData:(),colorData->colorData);
      );
      vModifiers_(if(isBack,"cglColorBack","cglColor")) = colors;
    ,
      colorData = if(isBack,lambda((),cglColorsBack),lambda((),cglColors));
      pixelExpr = if(hasAlpha,
        if(length(colors_1)==4,
          lambda((texPos,pos3d,normal),
            regional(col);col = (1-texPos_2) * colorData:()_1 + texPos_2 * colorData:()_2;
            (col_1,col_2,col_3,col_4*cglAlpha)
          ,colorData->colorData);
        ,
          lambda((texPos,pos3d,normal),
            regional(col);col = (1-texPos_2) * colorData:()_1 + texPos_2 * colorData:()_2;
            (col_1,col_2,col_3,cglAlpha)
          ,colorData->colorData);
        );
      ,
        lambda((texPos,pos3d,normal),
            (1-texPos_2) * colorData:()_1 + texPos_2 * colorData:()_2
        ,colorData->colorData);
      );
      modifiers_(if(isBack,"cglColorsBack","cglColors")) = colors;
    );
  );
  if(isundefined(pixelExpr) & !isundefined(color),
    if(isString(color),color=cglColor(color));
    if(isList(color),
      color = cglNormalColor(color);
      usesAlpha = length(color)==4;
      colorData = if(isBack,lambda((),cglColorBack),lambda((),cglColor));
      pixelExpr = if(hasAlpha,
        if(length(color)==4,
          lambda((texPos,pos3d,normal),
            regional(col);col=colorData:();
            (col_1,col_2,col_3,col_4*cglAlpha)
          ,colorData->colorData);
        ,
          lambda((texPos,pos3d,normal),
            regional(col);col=colorData:();
            (col_1,col_2,col_3,cglAlpha)
          ,colorData->colorData);
        );
      ,
        lambda((texPos,pos3d,normal),colorData:(),colorData->colorData);
      );
      modifiers_(if(isBack,"cglColorBack","cglColor")) = color;
    ,if(color:"type"=="texture",
      usesAlpha = color:"hasAlpha";
      pixelExpr = cglPixelExprFromTexture(color:"name",hasAlpha,color:"hasAlpha",color:"repeat",color:"interpolate");
    ,if(color:"type"=="expr",
      usesAlpha = color:"hasAlpha";
      pixelExpr = cglPixelExprFromExpr(color:"expr",hasAlpha,color:"hasAlpha");
    ,
      cglLogError("unexpected value for color: "+texture);
    )))
  );
  {"pixelExpr":pixelExpr, "usesAlpha": usesAlpha, "modifiers": modifiers, "vModifiers": vModifiers}
);
cglResolveColorExprBack(hasAlpha,colorsMode):=(
  regional(texture,colors,color);
  texture = textureBack;
  colors = colorsBack;
  color = colorBack;
  cglResolveColorExpr0(hasAlpha,colorsMode,true);
);
cglResolveColorExpr(hasAlpha,colorsMode):=(
  regional(exprData,exprDataBack,usesAlphaFront,usesAlphaBack,defaultAlpha);
  exprData = cglResolveColorExpr0(hasAlpha,colorsMode,false);
  exprDataBack = cglResolveColorExprBack(hasAlpha,colorsMode);
  if(!isundefined(exprDataBack_"pixelExpr"), // expression for back face is given
    usesAlphaFront = exprData_"usesAlpha";
    usesAlphaBack = exprDataBack_"usesAlpha";
    exprData_"usesAlpha" = usesAlphaFront % usesAlphaBack;
    exprData_"modifiers" = cglMergeDicts(exprData_"modifiers",exprDataBack_"modifiers");
    exprData_"vModifiers" = cglMergeDicts(exprData_"vModifiers",exprDataBack_"vModifiers");
    defaultAlpha = if(hasAlpha,lambda((),cglAlpha),lambda((),1));
    if(usesAlphaFront == usesAlphaBack,
      exprData_"pixelExpr" = lambda((texPos,pos3d,normal),
        if(normal*cglViewDirection<=0,exprFront:(texPos,pos3d,normal),exprBack:(texPos,pos3d,normal))
      ,exprFront->exprData_"pixelExpr",exprBack->exprDataBack_"pixelExpr")
    ,if(usesAlphaFront,
      exprData_"pixelExpr" = lambda((texPos,pos3d,normal),
        regional(col);
        if(normal*cglViewDirection<=0,
          exprFront:(texPos,pos3d,normal)
        ,
          col = exprBack:(texPos,pos3d,normal);
          (col_1,col_2,col_3,defaultAlpha:())
        )
      ,exprFront->exprData_"pixelExpr",exprBack->exprDataBack_"pixelExpr",defaultAlpha->defaultAlpha)
    ,
      exprData_"pixelExpr" = lambda((texPos,pos3d,normal),
        regional(col);
        if(normal*cglViewDirection<=0,
          col = exprFront:(texPos,pos3d,normal);
          (col_1,col_2,col_3,defaultAlpha:())
        ,
          exprBack:(texPos,pos3d,normal)
        )
      ,exprFront->exprData_"pixelExpr",exprBack->exprDataBack_"pixelExpr",defaultAlpha->defaultAlpha)
    ))
  );
  exprData
);
// bring color into standard from
cglNormalColor(color):=( // code TODO better name
  if(length(color)==1,
    (color,color,color)
  ,if(if(length(color)==4, color_4 == 1, false),
    (color_1,color_2,color_3)
  ,
    color
  ));
);
cglNormalizeRange(range):=(
  range = range/(2*pi); // scale: 0...2*pi -> 0..1
  range = apply(range,val,mod(val,1)); // pick representant in 0..1
);

cglInterface("draw3d",cglDraw3d,(pos3d),(color,texture,colorBack,textureBack,size,alpha,
  light,projection,plotModifiers,tags,onUpdate));
cglInterface("sphere3d",cglDraw3d,(pos3d),(color,texture,colorBack,textureBack,size,alpha,
  light,projection,plotModifiers,tags,onUpdate));
cglDraw3d(pos3d):=(
  size = cglValOrDefault(size,cgl3d.defaults.sphereSize);
  cglSphere3d(pos3d,size);
);

cglInterface("sphere3d",cglSphere3d,(center,radius),(color,texture,colorBack,textureBack,alpha,
  light,projection,plotModifiers,tags,onUpdate));
cglSphere3d(center,radius):=(
  regional(needBackFace,modifiers,ids,topLayer,hasAlpha,usesAlpha,exprData,opacityExpr);
  color = cglValOrDefault(color,cgl3d.defaults.sphereColor);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  projection = cglValOrDefault(projection,cgl3d.defaults.sphereProjection);
  alpha = cglValOrDefault(alpha,cgl3d.defaults.sphereAlpha);
  hasAlpha = ! isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {"cglLight": light,"cglProjection":projection};
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  exprData = cglResolveColorExpr(hasAlpha,CglColorsIgnore);
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  usesAlpha = exprData_"usesAlpha";
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  needBackFace = hasAlpha % usesAlpha;
  if(needBackFace,
    ids = [cgl3d.addObject:(cgl3dNewSphere(cgl3d.shader.sphere:(#,true),center,radius,
      plotModifiers->modifiers,opaqueIf->opacityExpr,onUpdate->onUpdate))];
  );
  topLayer = cgl3d.addObject:(cgl3dNewSphere(cgl3d.shader.sphere:(#,false),center,radius,
    plotModifiers->modifiers,opaqueIf->opacityExpr,onUpdate->onUpdate));
  ids=if(needBackFace,append(ids,topLayer),topLayer);
);


cglInterface("draw3d",cglDraw3d,(point1,point2),(color,color1,color2,colors,texture,
  colorBack,colorsBack,textureBack,size,alpha,renderBack,direction1,
  light,caps,cap1,cap2,projection,plotModifiers,tags,onUpdate));
cglDraw3d(point1,point2):=(
  size = cglValOrDefault(size,cgl3d.defaults.cylinderSize);
  caps = cglValOrDefault(caps,cgl3d.defaults.curveCaps);
  cglCylinder3d((point1+point2)/2,(point2-point1)/2,size);
);
cglInterface("cylinder3d",cglCylinder3d,(center,orientation),(color,color1,color2,colors,texture,
  colorBack,colorsBack,textureBack,size,alpha,renderBack,direction1,
  light,caps,cap1,cap2,projection,plotModifiers,tags,onUpdate));
cglCylinder3d(center,orientation):=(
  size = cglValOrDefault(size,cgl3d.defaults.cylinderSize);
  cglCylinder3d(center,orientation,size);
);
cglInterface("cylinder3d",cglCylinder3d,(center,orientation,radius),(color,color1,color2,colors,texture,
  colorBack,colorsBack,textureBack,alpha,light,cap1,cap2,caps,
  projection,direction1,plotModifiers,tags,renderBack,onUpdate));
cglCylinder3d(center,orientation,radius):=(
  regional(overhang,needBackFace,modifiers,n,ids,topLayer,hasAlpha,usesAlpha,exprData,opacityExpr);
  color = cglValOrDefault(color,cgl3d.defaults.cylinderColor);
  if(!isundefined(colors),
    if(length(colors)!=2,
      cglLogWarning("wrong length for colors expected 2 got: "+text(length(colors)));
      if(length(colors)<2,
        colors = colors ++ (color,color);
      );
    );
    if(!isundefined(color1),colors_1=color1);
    if(!isundefined(color2),colors_2=color2);
    if(colors_1 == colors_2,
      color = colors_1;
      colors = cglUndefinedVal();
    );
  ,if(!isundefined(color1) % !isundefined(color2),
    colors = [cglValOrDefault(color1,color),cglValOrDefault(color2,color)];
  ));
  light = cglValOrDefault(light,cgl3d.defaults.light);
  caps = cglValOrDefault(caps,cgl3d.defaults.cylinderCaps);
  cap1 = cglValOrDefault(cap1,caps);
  cap2 = cglValOrDefault(cap2,caps);
  renderBack = cglValOrDefault(renderBack,false); // if true back-face should always be rendered
  projection = cglValOrDefault(projection,cgl3d.projection.cylinder);
  overhang = if(cap1_"name" == "Round" % cap2_"name" == "Round",radius,0);
  alpha = cglValOrDefault(alpha,cgl3d.defaults.cylinderAlpha);
  hasAlpha = !isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {"cglLight": light,
    "cglCap1back": cap1:"shaderBack",
    "cglCap2back": cap2:"shaderBack",
    "cglCut1": cglCutOrthogonal, "cglCut2": cglCutOrthogonal,
    "cglGetCutVector1":cglCutVectorNone,"cglGetCutVector2":cglCutVectorNone,
    "cglCapCut1": cap1:"capCut1","cglCapCut2": cap2:"capCut2",
    "cglProjection": projection};
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  exprData = cglResolveColorExpr(hasAlpha,CglColorsInterpolate);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  needBackFace = hasAlpha % usesAlpha % renderBack;
  modifiers_"cglCap1front"=cap1_(if(needBackFace,"shaderFront","shaderNoBack"));
  modifiers_"cglCap2front"=cap2_(if(needBackFace,"shaderFront","shaderNoBack"));
  modifiers_"cglCylinderProjGetDirection1" = cglCylinderProjGetDirection1Default;
  if(!isundefined(cap1_"cutDirection"),
    modifiers_"cglCut1" = if(cap1_"cutOrthogonal",cglCutBoth1,cglCutVector1);
    modifiers_"cglGetCutVector1" = cglGetCutVector1;
    n = cap1_"cutDirection";
    modifiers_"cglCutDir1" = n/(orientation*n);
    modifiers_"cglDirection1" =
      normalize(n - (normalize(orientation)*n)*normalize(orientation));
    modifiers_"cglCylinderProjGetDirection1" = lambda((normal,height,orientation),
      cglDirection1);
    overhang = max(overhang,radius*tan(arccos(|normalize(n)*normalize(orientation)|)));
  );
  if(!isundefined(cap2_"cutDirection"),
    modifiers_"cglCut2" = if(cap2_"cutOrthogonal",cglCutBoth2,cglCutVector2);
    modifiers_"cglGetCutVector2" = cglGetCutVector2;
    n = cap2_"cutDirection";
    modifiers_"cglCutDir2" = n/(orientation*n);
    modifiers_"cglDirection1" =
      normalize(n - (normalize(orientation)*n)*normalize(orientation));
    modifiers_"cglCylinderProjGetDirection1" = lambda((normal,height,orientation),
      cglDirection1);
    overhang = max(overhang,radius*tan(arccos(|normalize(n)*normalize(orientation)|)));
  );
  if(!isundefined(direction1),
    modifiers_"cglDirection1" = normalize(direction1);
    modifiers_"cglCylinderProjGetDirection1" = lambda((normal,height,orientation),
      cglDirection1);
  );
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  if(needBackFace,
    ids = [cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.cylinderBack:(#),center,orientation,radius,overhang->overhang,
     plotModifiers->modifiers,opaqueIf->opacityExpr))];
  );
  topLayer = cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.cylinder:(#),center,orientation,radius,overhang->overhang,
    plotModifiers->modifiers,opaqueIf->opacityExpr));
  ids=if(needBackFace,append(ids,topLayer),topLayer);
);

cglJoint(prev,current,next,jointType):=(
  if(jointType==cgl3d.connect.round,
    cgl3d.cylinderCap.cutVoidRound:((normalize(next-current)+normalize(current-prev))/2);
  ,if(jointType==cgl3d.connect.flat,
    cgl3d.cylinderCap.cutVoid:((normalize(next-current)+normalize(current-prev))/2);
  ,if(jointType==cgl3d.connect.open,
    cgl3d.cylinderCap.open
  )));
);
cglInterface("connect3d",cglConnect3d,(points),(
  color,colors,texture,colorBack,colorsBack,textureBack,size,alpha,
  light,caps,cap1,cap2,joints,closed,plotModifiers,tags,onUpdate));
cglConnect3d(points):=(
  // feature TODO? create wrapper for onUpdate to update complete list of sample points
  regional(jointEnd,jointStart,totalLength,alpha0,a,b,current1,current2,prev,next,projection,color1,color2,nextColor,direction1,cutDir,renderBack);
  closed = cglValOrDefault(closed,false);
  color = cglValOrDefault(color,cgl3d.defaults.cylinderColor);
  size = cglValOrDefault(size,cgl3d.defaults.cylinderSize);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  plotModifiers = cglValOrDefault(plotModifiers,{});
  caps = cglValOrDefault(caps,cgl3d.defaults.curveCaps);
  cap1 = cglValOrDefault(cap1,caps);
  cap2 = cglValOrDefault(cap2,caps);
  if(cap1 == cgl3d.cylinderCap.open % cap1_"name" == "Cut-Open" %
    cap2 == cgl3d.cylinderCap.open % cap2_"name" == "Cut-Open",
    renderBack = true; // caps are open -> need back face
  );
  joints = cglValOrDefault(joints,cgl3d.defaults.curveJoints);
  jointEnd = joints;
  jointStart = joints;
  alpha0 = alpha;
  // remove all points before last point that are equal to last point
  if(!isundefined(colors),
    // feature TODO? sync up colors with used vertices
    // a:col1 b:col2 b:col3 b:col4 c:col5 -> a:col1 b:col2 ; b:col4 c:col5
    colors = remove(apply(1..length(points),i,if(if(i>1,points_(i-1)==points_i,false),-1,colors_i)),-1);
  );
  prev = -1;
  points = remove(apply(points,p,if(p == prev,-1,prev=p;p)),-1);
  if(length(points)>=3,
    // update projection if color is computed per pixel
    if(!isundefined(texture) % !isundefined(color:"type"),
      projection = lambda((normal,height,orientation),
        regional(pos0);
        pos0=cgl3d.projection.cylinder:(normal,height,orientation);
        (pos0_1,cglSegmentEnd*pos0_2+cglSegmentStart*(1-pos0_2))
      );
    );
    totalLength = sum(consecutive(points),pts,|pts_1-pts_2|);
    if(closed,totalLength = totalLength + |points_1-points_(length(points))|);
    a = 0;
    b = 0;
    if(closed,
      current1 = points_(length(points)-1);
      current2 = points_(length(points));
      next = points_1;
      direction1 = normalize(next-current2)+normalize(current2-current1);
      direction1 = normalize(direction1 - (normalize(current2-current1)*direction1)*normalize(current2-current1));
      color1 = if(isundefined(colors),color,colors_(length(points)-1));
      color2 = if(isundefined(colors),color,colors_(length(points)));
      nextColor = if(isundefined(colors),color,colors_1);
      ids = [];
    ,
      current1 = points_1;
      current2 = points_2;
      next = points_3;
      direction1 = normalize(next-current2)+normalize(current2-current1);
      direction1 = normalize(direction1 - (normalize(current2-current1)*direction1)*normalize(current2-current1));
      color1 = if(isundefined(colors),color,colors_1);
      color2 = if(isundefined(colors),color,colors_2);
      nextColor = if(isundefined(colors),color,colors_3);
      a = b;b = a + |current1-current2|/totalLength;
      plotModifiers_"cglSegmentStart"=a;
      plotModifiers_"cglSegmentEnd"=b;
      alpha = alpha0;
      ids = [cglCylinder3d((current1+current2)/2,(current2-current1)/2,size,cap1->cap1,colors->(color1,color2),
        cap2->cglJoint(current1,current2,next,jointEnd))];
    );
    ids = ids ++ apply(if(closed,2,4)..length(points),i,
      prev = current1;
      current1 = current2;
      current2 = next;
      next = points_i;
      cutDir = normalize((normalize(current2-current1)+normalize(current1-prev)));
      direction1 = direction1-2*(direction1*cutDir)*cutDir; // mirror direction at cut-plane
      color1 = color2;
      color2 = nextColor;
      nextColor = if(isundefined(colors),color,colors_i);
      a = b;b = a + |current1-current2|/totalLength;
      plotModifiers_"cglSegmentStart"=a;
      plotModifiers_"cglSegmentEnd"=b;
      alpha = alpha0;
      cglCylinder3d((current1+current2)/2,(current2-current1)/2,size,colors->(color1,color2),
        cap1->cglJoint(prev,current1,current2,jointStart),cap2->cglJoint(current1,current2,next,jointEnd));
    );
    color1 = color2;
    color2 = nextColor;
    a = b;b = a + |current2-next|/totalLength;
    plotModifiers_"cglSegmentStart"=a;
    plotModifiers_"cglSegmentEnd"=b;
    cutDir = normalize((normalize(next-current2)+normalize(current2-current1)));
    direction1 = direction1-2*(direction1*cutDir)*cutDir; // mirror direction at cut-plane
    alpha = alpha0;
    flatten(append(ids,cglCylinder3d((current2+next)/2,(next-current2)/2,size,colors->(color2,nextColor),
        cap1->cglJoint(current1,current2,next,jointStart),
        cap2->if(closed,cglJoint(current2,next,points_1,jointEnd),cap2))));
  ,if(length(points)==2,
    color1 = if(isundefined(colors),color,colors_1);
    color2 = if(isundefined(colors),color,colors_2);
    cglCylinder3d((points_1+points_2)/2,(points_2-points_1)/2,size);
  ,if(length(points)==1,
    if(!isundefined(colors),
      color = colors_1
    );
    cglSphere3d(points_1,size);
  )));
);
cglInterface("curve3d",cglCurve3d,(expr:(t),from,to),(
  color,colors,texture,colorBack,colorsBack,textureBack,size,samples,alpha,light,
  caps,cap1,cap2,joints,closed,plotModifiers,tags,onUpdate));
cglCurve3d(expr,from,to):=(
  samples = cglValOrDefault(samples,cgl3d.defaults.curveSamples)-1;
  if(from==to,
    cglSphere3d(expr:(from),size);
  ,
    cglConnect3d(apply(0..samples,k,
      t = k/samples;
      expr:(t*to+(1-t)*from);
    ));
  );
);

cglInterface("torus3d",cglTorus3d,(center,orientation,radius1,radius2),(color,texture,
  colorBack,textureBack,alpha,light,arcRange,angle1range,angle2range,
  direction1,plotModifiers,tags,onUpdate));
cglTorus3d(center,orientation,radius1,radius2):=(
  regional(needBackFace,modifiers,ids,topLayer,hasAlpha,usesAlpha,exprData,pixelExpr,opacityExpr);
  orientation=normalize(orientation);
  color = cglValOrDefault(color,cgl3d.defaults.torusColor);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  alpha = cglValOrDefault(alpha,cgl3d.defaults.torusAlpha);
  hasAlpha = !isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light,
    "cglRadii": [radius1,radius2]
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  exprData = cglResolveColorExpr(hasAlpha,CglColorsIgnore);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  needBackFace = hasAlpha % usesAlpha;
  // use arcRange if angle1range is not given
  angle1range = cglValOrDefault(angle1range,arcRange);
  if(!isundefined(angle1range),
    needBackFace = true;
    angle1range = cglNormalizeRange(angle1range);
    modifiers_"cglAngle1Range" = angle1range;
    if(angle1range_1<angle1range_2,
      modifiers_"cglCheckAngle1" = lambda(texturePos,
        if(texturePos_1<cglAngle1Range_1 % texturePos_1>cglAngle1Range_2,cglDiscard());
      );
    ,if(angle1range_1>angle1range_2,
      modifiers_"cglCheckAngle1" = lambda(texturePos,
        if(texturePos_1<cglAngle1Range_1 & texturePos_1>cglAngle1Range_2,cglDiscard());
      );
    ,
      modifiers_"cglCheckAngle1" = lambda(texturePos,);
    ));
  ,
    modifiers_"cglCheckAngle1" = lambda(texturePos,);
  );
  if(!isundefined(angle2range),
    needBackFace = true;
    angle2range = cglNormalizeRange(angle2range);
    modifiers_"cglAngle2Range" = angle2range;
    if(angle2range_1<angle2range_2,
      modifiers_"cglCheckAngle2" = lambda(texturePos,
        if(texturePos_2<cglAngle2Range_1 % texturePos_2>cglAngle2Range_2,cglDiscard());
      );
    ,if(angle2range_1>angle2range_2,
      modifiers_"cglCheckAngle2" = lambda(texturePos,
        if(texturePos_2<cglAngle2Range_1 & texturePos_2>cglAngle2Range_2,cglDiscard());
      );
    ,
      modifiers_"cglCheckAngle2" = lambda(texturePos,);
    ));
  ,
    modifiers_"cglCheckAngle2" = lambda(texturePos,);
  );

  modifiers_"cglTorusProjGetDirection1" = cglTorusProjGetDirection1Default;
  if(!isundefined(direction1),
    modifiers_"cglDirection1" = normalize(direction1);
    modifiers_"cglTorusProjGetDirection1" = lambda((normal,height,orientation),cglDirection1);
  );
  tags = cglValOrDefault(tags,[]);
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  if(needBackFace,
    ids = [cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.torus:(#,4),
      center, radius2*orientation, radius1+radius2,
      plotModifiers->modifiers,tags->["torus","backside"]++tags,opaqueIf->opacityExpr)),
    cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.torus:(#,3),
      center, radius2*orientation, radius1+radius2,
      plotModifiers->modifiers,tags->["torus","backside"]++tags,opaqueIf->opacityExpr)),
    cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.torus:(#,2),
      center, radius2*orientation, radius1+radius2,
      plotModifiers->modifiers,tags->["torus","backside"]++tags,opaqueIf->opacityExpr))];
  );
  topLayer = cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.torus:(#,1),
    center, radius2*orientation, radius1+radius2,
    plotModifiers->modifiers,tags->["torus"]++tags,opaqueIf->opacityExpr));
  ids=if(needBackFace,append(ids,topLayer),topLayer);
);
// feature TODO? option to use aspect ratio instead of second radius
cglInterface("circle3d",cglCircle3d,(center,orientation,radius),(color,texture,
  colorBack,textureBack,size,alpha,
  light,arcRange,angle1range,angle2range,direction1,plotModifiers,tags,onUpdate));
cglInterface("torus3d",cglCircle3d,(center,orientation,radius),(color,texture,
  colorBack,textureBack,size,alpha,
  light,arcRange,angle1range,angle2range,direction1,plotModifiers,tags,onUpdate));
cglCircle3d(center,orientation,radius):=(
  size = cglValOrDefault(size,cgl3d.defaults.torusSize);
  cglTorus3d(center,orientation,radius,size);
);

cglCheckSize(vData,vCount,msg,defVal) := (
  if(length(vData)==vCount,
    vData
  ,
    cglLogError(msg+" expected: "+text(vCount)+" got: "+text(length(vData)));
    apply(1..vCount,defVal);
  )
);
cglCheckSize(vData,vCount,msg) := (
  if(length(vData)==vCount,
    vData
  ,
    cglLogError(msg+" expected: "+text(vCount)+" got: "+text(length(vData)));
  )
);

// code TODO? consistent order of spacePos and texture pos
cglInterface("cglNormalExpr",cglNormalExprImpl,(expr:(spacePos,texturePos)),());
cglNormalExprImpl(expr):=expr;
// feature TODO? normalTexture modifier (texture of normal vectors)
// API TODO? merge normalExpr and normalTexture into normals modifier and use type to distinguish arguments
cglInterface("draw3d",cglTriangle3d,(p1,p2,p3),(color,colors,texture,textureRGB,textureRGBA,interpolateTexture,repeatTexture,
  colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,colorsBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,uv,normal,normals,
  normalExpr,plotModifiers,vertexModifiers,tags,onUpdate));
cglInterface("triangle3d",cglTriangle3d,(p1,p2,p3),(color,colors,texture,textureRGB,textureRGBA,interpolateTexture,repeatTexture,
  colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,colorsBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,uv,normal,normals,
  normalExpr,plotModifiers,vertexModifiers,tags,onUpdate));
cglTriangle3d(p1,p2,p3):=(
  regional(modifiers,vModifiers,defNormal,hasAlpha,usesAlpha,exprData,pixelExpr,colLen,opacityExpr);
  color = cglValOrDefault(color,cgl3d.defaults.triangleColor);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  uv = cglValOrDefault(uv,[(0,0),(1,0),(0,1)]);
  alpha = cglValOrDefault(alpha,cgl3d.defaults.triangleAlpha);
  hasAlpha = !isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  defNormal = cglValOrDefault(normal,normalize(cross(p2-p1,p3-p1)));
  if(!isundefined(normals),
    if(isundefined(normalExpr),
      normals = cglCheckSize(normals,3,"wrong length for normals",defNormal);
      vModifiers_"cglNormal" = normals;
      normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
    ,
      cglLogWarning(" modifier `normals` is ignored if `normalExpr` is given");
    );
  );
  if(!isundefined(normal),
    if(isundefined(normalExpr),
      modifiers_"cglNormal" = normal;
      normalExpr = lambda((spacePos,texturePos),cglNormal);
    ,
      cglLogWarning("modifier `normal` is ignored if `normals` or `normalExpr` is given");
    );
  );
  if(isundefined(normalExpr),
    modifiers_"cglNormal" = defNormal;
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  );
  modifiers_"cglNormalExpr" = normalExpr;
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  if(!isundefined(colors),
    colors = cglCheckSize(colors,3,"wrong length for colors",color);
  );
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  tags = cglValOrDefault(tags,[]);
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject:(cgl3dNewMesh(cgl3d.shader.triangle:(#),[p1,p2,p3],
    plotModifiers->modifiers,vModifiers->vModifiers,tags->["triangle"]++tags,opaqueIf->opacityExpr));
);

// TODO improve triangle rendering
// TODO? support rendering multiple polygons in single call (should be possible with minimal extension of the triangles function)
// TODO? auto-merge rendered triangles with similar parameters into single render-call

// render multiple triangles in a single call
cglInterface("triangles3d",cglTriangles3d,(triangles),(color,colors,texture,textureRGB,textureRGBA,interpolateTexture,repeatTexture,
  colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,colorsBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,uv,normals,
  normalExpr,plotModifiers,vertexModifiers,tags,onUpdate));
cglTriangles3d(triangles):=(
  regional(modifiers,vModifiers,defNormal,hasAlpha,usesAlpha,exprData,pixelExpr,colLen,opacityExpr,v1,v2,v3,triuv,n,cols,vertices,triangleCount);
  color = cglValOrDefault(color,cgl3d.defaults.triangleColor);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  vertices = if(islist(triangles_1_1),
    flatten(triangles)
  ,
    triangles
  );
  triangleCount = length(vertices)/3;
  // feature TODO? allow giving normals/uv per vertex
  uv = if(isundefined(uv),
    apply(1..length(vertices),i,
      tri = mod(i,3);
      if(tri==1,
        (0,0)
      ,if(tri==2,
        (1,0)
      ,
        (0,1)
      ))
    )
  ,
    if(length(uv) == 3*triangleCount,
      uv // uv per vertex
    ,
    cglCheckSize(uv,triangleCount,"uv should contain one element for each triangle");
    flatten(apply(1..triangleCount,i,
      if(i<length(uv),
        triuv = uv_i;
        if(length(triuv)==3,
          triuv
        ,
          cglCheckSize(triuv,3,"wrong length for triangle uv",defNormal);
          if(length(triuv)>3,
            [triuv_1,triuv_2,triuv_3]
          ,
            [(0,0),(1,0),(0,1)]
          )
        );
      ,
        [(0,0),(1,0),(0,1)]
      );
    ))
    )
  );
  alpha = cglValOrDefault(alpha,cgl3d.defaults.triangleAlpha);
  hasAlpha = !isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  if(isundefined(normalExpr),
    if(isundefined(normals),
      normals = [];
    ,
      cglCheckSize(normals,triangleCount,"normals should contain one element for each triangle");
    );
    normals = flatten(apply(0..(triangleCount-1),i,
      v1 = vertices_(3*i+1);
      v2 = vertices_(3*i+2);
      v3 = vertices_(3*i+3);
      defNormal = normalize(cross(v2-v1,v3-v1));
      if(i<length(normals),
        n = normals_i;
        if(islist(n_1),
          cglCheckSize(n,3,"wrong length for triangle normals",defNormal);
        ,
          [n,n,n]
        )
      ,
        [defNormal,defNormal,defNormal]
      );
    ));
    vModifiers_"cglNormal" = normals;
    normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
  ,
    if(!isundefined(normals),
      cglLogWarning(" modifier `normals` is ignored if `normalExpr` is given");
    );
    modifiers_"cglNormal" = defNormal;
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  );
  modifiers_"cglNormalExpr" = normalExpr;
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  if(!isundefined(colors),
    if(length(colors)!=length(vertices),
      cglCheckSize(colors,triangleCount,"colors should contain one element pre vertex or one element per triangle");
      colors = flatten(apply(1..triangleCount,i,
        if(i<length(colors),
          cols = colors_i;
          if(islist(cols_1) % islist(cols_2) % islist(cols_3), // entry has list as element -> use sub-entries for vertices
            cglCheckSize(cols,3,"wrong length for triangle colors",color);
          ,
            [cols,cols,cols]
          )
        ,
          [color,color,color]
        );
      ));
    );
  );
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  tags = cglValOrDefault(tags,[]);
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject:(cgl3dNewMesh(cgl3d.shader.triangle:(#),vertices,
    plotModifiers->modifiers,vModifiers->vModifiers,tags->["triangles"]++tags,opaqueIf->opacityExpr));
);

cglInterface("polygon3d",cglPolygon3d,(vertices),(triangulation,color,colors,texture,
  textureRGB,textureRGBA,interpolateTexture,repeatTexture,colorExpr:(texturePos,spacePos,normal),
  colorExprRGB:(texturePos,spacePos,normal),colorExprRGBA:(texturePos,spacePos,normal),colorBack,colorsBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,uv,
  normal,normals,normalExpr,normalType,plotModifiers,vertexModifiers,tags,onUpdate));
cglPolygon3d(vertices):=(
  regional(modifiers,vModifiers,trianglesAndNormals,hasAlpha,usesAlpha,exprData,pixelExpr,colLen,opacityExpr);
  color = cglValOrDefault(color,cgl3d.defaults.triangleColor);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  triangulation = cglValOrDefault(triangulation,cgl3d.triangulate.default);
  alpha = cglValOrDefault(alpha,cgl3d.defaults.triangleAlpha);
  hasAlpha = !isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  if(isundefined(normalType),
    if(!isundefined(normalExpr),
      normalType = cgl3d.normalType.pixel;
    );
    if(!isundefined(normals),
      if(isundefined(normalType),
        normalType = cgl3d.normalType.vertex;
      ,
        cglLogWarning("modifier `normals` is ignored if `normalExpr` is given");
      )
    );
    if(!isundefined(normal),
      if(isundefined(normalType),
        normalType = cgl3d.normalType.face;
      ,
        cglLogWarning("modifier `normal` is ignored if `normalExpr` or `normals` is given");
      )
    );
    if(isundefined(normalType),
      normalType = cgl3d.normalType.triangle;
    );
  );
  if(normalType == cgl3d.normalType.pixel,
    if(isundefined(normalExpr),
      cglLogWarning("modifier `normalExpr` has to be set when using per-pixel normals");
      normals = cglUndefinedVal();
      normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
      normalType = cgl3d.normalType.vertex;
    );
  ,if(normalType == cgl3d.normalType.vertex,
    normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
    if(!isundefined(normals),
      normals = cglCheckSize(normals,length(vertices),"wrong length for normals");
    );
  ,if(normalType == cgl3d.normalType.triangle,
    normals = cglUndefinedVal();
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  ,if(normalType == cgl3d.normalType.flat,
    normals = normal; // for flat normal-type normals is a single normal
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  ,
    cglLogError("unknown normal-type: "+text(normalType));
  ))));
  modifiers_"cglNormalExpr" = normalExpr;
  if(isundefined(uv),
    regional(n,x,y,xmin,xmax,ymin,ymax,p);
    n = length(vertices);
    xmin=1;ymin=1;xmax=0;ymax=0;
    // 1. pick points at constant distance along unit circle
    // the starting position is chosen such that 4-gons can be scaled to fill the complete unit-square
    uv = apply(0..(n-1),i,
      x = sin(2*pi*(i/n-0.375));
      y = cos(2*pi*(i/n-0.375));
      xmin=min(xmin,x);
      xmax=max(xmax,x);
      ymin=min(ymin,y);
      ymax=max(ymax,y);
      (x,y);
    );
    // 2. scale point to unit square
    uv = apply(uv,p,
      ((p_1-xmin)/(xmax-xmin),(p_2-ymin)/(ymax-ymin))
    );
  );
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  if(!isundefined(colors),
    colors = cglCheckSize(colors,length(vertices),"wrong length for colors",color);
  );
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  trianglesAndNormals = cgl3d.compute.triangulationPolygon:(triangulation,vertices,normals,vModifiers,normalType);
  vModifiers = trianglesAndNormals_3;
  if(normalType == cgl3d.normalType.flat,
    modifiers_"cglNormal" =trianglesAndNormals_2;
  ,if(normalType != cgl3d.normalType.pixel,
    vModifiers_"cglNormal" =trianglesAndNormals_2;
  ));
  tags = cglValOrDefault(tags,[]);
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject:(cgl3dNewMesh(cgl3d.shader.triangle:(#),trianglesAndNormals_1,
    plotModifiers->modifiers,vModifiers->vModifiers,tags->["polygon"]++tags,opaqueIf->opacityExpr));
);

// feature TODO? adjust uv coordinates if side of grid-cell is collapsed
cglInterface("mesh3d",cglMesh3d,(grid),(color,colors,texture,textureRGB,textureRGBA,interpolateTexture,repeatTexture,
  colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,colorsBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,uv,
  normals,normalExpr,normalType,topology,plotModifiers,vertexModifiers,tags,onUpdate));
cglMesh3d(grid):=(
  regional(Ny,Nx,triangles,modifiers,vModifiers,exprData,pixelExpr,hasAlpha,usesAlpha,colLen,opacityExpr);
  color = cglValOrDefault(color,cgl3d.defaults.triangleColor);
  light = cglValOrDefault(light,cgl3d.defaults.light);
  alpha = cglValOrDefault(alpha,cgl3d.defaults.triangleAlpha);
  hasAlpha = !isundefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  topology = cglValOrDefault(topology,cgl3d.mesh.topologyOpen);
  Ny = length(grid);
  Nx = length(grid_1);
  triangles = cgl3d.mesh.samplesToTriangles:(grid,Nx,Ny,topology,cgl3d.mesh.sampleVertex);
  if(isundefined(normalType),
    if(!isundefined(normalExpr),
      normalType = cgl3d.normalType.pixel;
    );
    if(!isundefined(normals),
      if(isundefined(normalType),
        normalType = cgl3d.normalType.vertex;
      ,
        cglLogWarning("modifier `normals` is ignored if `normalExpr` is given");
      )
    );
    if(isundefined(normalType),
      normalType = cgl3d.normalType.triangle;
    );
  );
  if(normalType == cgl3d.normalType.pixel & isundefined(normalExpr),
      cglLogWarning("modifier `normalExpr` has to be set when using per-pixel normals");
      normals = cglUndefinedVal();
      normalType = cgl3d.normalType.vertex;
  );
  if(normalType != cgl3d.normalType.pixel,
    if(normalType == cgl3d.normalType.vertex,
      // interpolated vector may not be normalized
      normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
    ,
      normalExpr = lambda((spacePos,texturePos),cglNormal);
    );
    if(isundefined(normals),
      normals = cgl3d.mesh.guessNormals:(grid,Nx,Ny,normalType,topology);
    ,if(normalType == cgl3d.normalType.face,
      normals = cgl3d.mesh.samplesToTriangles:(normals,Nx,Ny,topology,cgl3d.mesh.sampleFace);
    ,if(normalType == cgl3d.normalType.triangle,
      normals = cgl3d.mesh.samplesToTriangles:(normals,Nx,Ny,topology,cgl3d.mesh.sampleTriangle);
    ,if(normalType == cgl3d.normalType.vertex,
      normals = cgl3d.mesh.samplesToTriangles:(normals,Nx,Ny,topology,cgl3d.mesh.sampleVertex);
    ,
      cglLogError("unknown normal-type: "+text(normalType));
    ))));
  );
  modifiers = {
    "cglLight": light,
    "cglNormalExpr":normalExpr
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  if(isundefined(uv),
    // map grid-positions to unit-square
    regional(nx,ny);
    ny = if(topology.y=="open",Ny-1,Ny);
    nx = if(topology.x=="open",Nx-1,Nx);
    uv=apply(0..ny,y,apply(0..nx,x,(x/nx,y/ny)));
  );
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  vModifiers=apply(vModifiers,samples,cgl3d.mesh.samplesToTriangles:(samples,Nx,Ny,topology,cgl3d.mesh.sampleVertex));
  // bring vertex colors in correct format (one color per vertex)
  if(!isundefined(colors),colors = cgl3d.mesh.samplesToTriangles:(colors,Nx,Ny,topology,cgl3d.mesh.sampleVertex));
  if(!isundefined(colorsBack),colorsBack = cgl3d.mesh.samplesToTriangles:(colorsBack,Nx,Ny,topology,cgl3d.mesh.sampleVertex));
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  if(normalType != cgl3d.normalType.pixel,
    vModifiers_"cglNormal" = normals;
  );
  tags = cglValOrDefault(tags,[]);
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject:(cgl3dNewMesh(cgl3d.shader.triangle:(#),triangles,
    plotModifiers->modifiers,vModifiers->vModifiers,tags->["polygon"]++tags,opaqueIf->opacityExpr));
);

// feature TODO? plane3d
// feature TODO? quadric3d
// feature TODO? cubic3d

// TODO using modifiers in plotted expression leads to errors
//  * evaluate plot-expr with all given plot-modifiers?

// feature TODO? allow equation as expression: transform `f == g` to  `f-g` in last top-level expression
// feature TODO custom projection/uv-mapping from surface to 2D space
cglInterface("surface3d",cglSurface3d,(expr:(x,y,z)),(color,texture,textureRGB,textureRGBA,
  interpolateTexture,repeatTexture,colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,
  texture,uv,dF:(x,y,z),cutoffRegion,degree,layers,plotModifiers,tags,onUpdate));
cglSurface3d(fun) := (
    regional(N,nodes,F,normalExpr,N,B,modifiers,viewRect,bounds,usesAlpha,opacityExpr,exprData,pixelExpr);
    color = cglValOrDefault(color,cgl3d.defaults.surfaceColor);
    light = cglValOrDefault(light,cgl3d.defaults.light);
    alpha = cglValOrDefault(alpha,cgl3d.defaults.surfaceAlpha);
    cutoffRegion = cglValOrDefault(cutoffRegion,cgl3d.defaults.surfaceCutoff);
    layers = cglValOrDefault(layers,0);
    // convert function to form taking vector insteads of 3 arguments
    F = lambda(p,fun:( p.x, p.y, p.z),fun->fun);
    normalExpr = if(isundefined(dF),cgl3d.compute.guessDerivative:(F),lambda(p,dF:(p_1,p_2,p_3)));
    if(isundefined(degree),
      N = min(cglTryDetermineDegree(fun),cglMaxAutoDeg);
      if(isundefined(N),
        N = min(cgl3d.compute.guessDegree:(F),cglMaxAutoDeg);
      ,if(N<0,
        N=cglMaxAutoDeg
      ));
    ,if(degree<0,
      N = cglMaxAutoDeg;
    ,
      N = max(degree,1);
      if(N>cglMaxDeg,
        cglLogInfo("exceeded maximum allowed degree, interpolating as "+text(cglMaxDeg)+" degree polynomial");
        N = cglMaxDeg;
      );
    ));
    nodes = cglSurfaceChebyshevNodes(N);
    B = cglSurfaceInterpolationMatrix(N);
    viewRect = cglViewRect();
    modifiers = {
      "cglSurfaceExpr":F,"cglNormalExpr":normalExpr,
      "cglChebNodes": nodes,"cglInterpMat":B,
      "cglCutoffRegion":cutoffRegion_"expr",
      "cglLight":light,"cglAlpha":alpha,
      "cglResolution": 2/min(|viewRect_1-viewRect_3|,|viewRect_2-viewRect_4|)
    };
    modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
    repeatTexture = cglValOrDefault(repeatTexture,true); // repeat surface texture by default
    hasAlpha = true;
    exprData = cglResolveColorExpr(false,CglColorsIgnore); // do not use alpha-modifier directly in color-expression
    usesAlpha = exprData_"usesAlpha";
    modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
    modifiers_"cglPixelExpr" = exprData_"pixelExpr";
    modifiers_"cglColor0" = if(usesAlpha,(0,0,0,0),(0,0,0));
    modifiers = cglMergeDicts(modifiers,cutoffRegion_"modifs");
    bounds = cutoffRegion_"bounds";
    opacityExpr = if(usesAlpha,false,lambda((),cglAlpha>=1));
    // code TODO? is there a way to avoid duplicate code for bounding box selection
    if(layers==0,
      if(bounds_"type" == "unbounded",
        cgl3d.addObject:(cgl3dNewObject(cgl3d.shader.surface:(#),plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,if(bounds_"type" == "sphere",
        cgl3d.addObject:(cgl3dNewSphere(cgl3d.shader.surface:(#),bounds_"center",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,if(bounds_"type" == "cylinder",
        cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.surface:(#),bounds_"point1",bounds_"point2",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,if(bounds_"type" == "cuboid",
        cgl3d.addObject:(cgl3dNewCuboid(cgl3d.shader.surface:(#),bounds_"center",bounds_"v1",bounds_"v2",bounds_"v3",plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,
        cglLogError("unknown bounding box type: "+text(bounds_"type"));
      ))));
    ,
      if(layers<0,layers=N,layers=min(layers,N));
      apply(0..(layers-1),i,
        modifiers_"K"=layers-i;
        if(bounds_"type" == "unbounded",
          cgl3d.addObject:(cgl3dNewObject(cgl3d.shader.surfaceLayer:(#),plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,if(bounds_"type" == "sphere",
          cgl3d.addObject:(cgl3dNewSphere(cgl3d.shader.surfaceLayer:(#),bounds_"center",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,if(bounds_"type" == "cylinder",
          cgl3d.addObject:(cgl3dNewCylinder(cgl3d.shader.surfaceLayer:(#),bounds_"point1",bounds_"point2",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,if(bounds_"type" == "cuboid",
          cgl3d.addObject:(cgl3dNewCuboid(cgl3d.shader.surfaceLayer:(#),bounds_"center",bounds_"v1",bounds_"v2",bounds_"v3",plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,
          cglLogError("unknown bounding box type: "+text(bounds_"type"));
        ))));
      );
    );
);

// feature TODO! compute surface dF from function df
// feature TODO? add ability to scale axes independently from CindyJS coordinate system
cglInterface("plot3d",cglPlot3d,(f:(x,y)),(color,texture,textureRGB,textureRGBA,interpolateTexture,repeatTexture,
  colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),colorExprRGBA:(texturePos,spacePos,normal),
  colorBack,textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),
  thickness,alpha,light,texture,uv,df:(x,y),cutoffRegion,degree,layers,plotModifiers,tags,onUpdate));
cglPlot3d(f/*f(x,y)*/):=(
  if(isundefined(degree),
      degree = min(cglTryDetermineDegree(f),cglMaxAutoDeg);
  );
  cglSurface3d(lambda((x,y,z),f:(x,y)-z,f->f),degree->degree);
);
cglInterface("complexplot3d",cglCPlot3d,(f:(z)),(color,texture,textureRGB,textureRGBA,interpolateTexture,
  repeatTexture, colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,texture,uv,df:(z),
  cutoffRegion,degree,layers,plotModifiers,tags,onUpdate));
cglInterface("cplot3d",cglCPlot3d,(f:(z)),(color,texture,textureRGB,textureRGBA,interpolateTexture,
  repeatTexture,colorExpr:(texturePos,spacePos,normal),colorExprRGB:(texturePos,spacePos,normal),
  colorExprRGBA:(texturePos,spacePos,normal),colorBack,
  textureBack,textureRGBBack,textureRGBABack,interpolateTextureBack,repeatTextureBack,
  colorExprBack:(texturePos,spacePos,normal),colorExprRGBBack:(texturePos,spacePos,normal),
  colorExprRGBABack:(texturePos,spacePos,normal),thickness,alpha,light,texture,uv,df:(z),
  cutoffRegion,degree,layers,plotModifiers,tags,onUpdate));
cglCPlot3d(f/*f(z)*/):=(
  if(isundefined(color) & isundefined(colorExpr), // TODO find better condition for choosing phase-coloring
    color = {
      "type": "expr",
      "expr": lambda((texturePos,spacePos,normal),
        regional(z);
        z=f:(spacePos_1+i*spacePos_2);
        hue((arctan2(re(z),im(z))+pi)/(2*pi))
      ,f->f),
      "hasAlpha": false
    };
  );
  cglSurface3d(cglLazy((x,y,z),abs(cglEval(f,x+i*y))-z,f->f),degree->cglValOrDefault(degree,-1));
);

/* TODO: port coordinate system controlls and object management
let recomputeProjMatrix = function(){
        let [x0,y0,x1,y1,z0,z1] = getZoomedViewPlane();
        // TODO this will break if z0 is near 0
        CindyGL.projectionMatrix=[
            [2/(x1-x0), 0, 0, - 2*x0/(x1-x0) -1],
            [0, 2/(y1-y0), 0, - 2*y0/(y1-y0) -1],
            [0, 0, 1/(z1-z0), - z0/(z1-z0) -1],
            [0, 0, -1/z0, 1]
        ];
        // TODO check matrix
        CindyGL.orthProjectionMatrix=[
            [2/(x1-x0), 0, 0, - 2*x0/(x1-x0) -1],
            [0, 2/(y1-y0), 0, - 2*y0/(y1-y0) -1],
            [0, 0, 1/(z1-z0), - z0/(z1-z0) -1],
            [0, 0, 0, 1]
        ];
        CindyGL.coordinateSystem.viewPosition = [(x0+x1)/2,(y0+y1)/2,z0,1];
        CindyGL.coordinateSystem.transformedViewNormal = mvmult4(CindyGL.invTrafoMatrix,[0,0,(z1-z0),1]);
        CindyGL.coordinateSystem.transformedViewPos =
            mvmult4(CindyGL.invTrafoMatrix,CindyGL.coordinateSystem.viewPosition);
    };
    let resetRotation = function(){
        CindyGL.trafoMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        CindyGL.invTrafoMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        CindyGL.coordinateSystem.transformedViewPos = CindyGL.coordinateSystem.viewPosition;
        let [x0,y0,x1,y1,z0,z1] = getZoomedViewPlane();
        CindyGL.coordinateSystem.transformedViewNormal = [0,0,(z1-z0),1];
    };
    let updateCoordSytem = function(modifs) {
        let ul=computeUpperLeftCorner(api);
        let lr=computeLowerRightCorner(api);
        let x0 = getRealModifier(modifs,"x0",ul.x);
        let x1 = getRealModifier(modifs,"x1",lr.x);
        let y0 = getRealModifier(modifs,"y0",lr.y);
        let y1 = getRealModifier(modifs,"y1",ul.y);
        [x0, y0] = getPoint2DModifier(modifs,"p0",[x0, y0]);
        [x1, y1] = getPoint2DModifier(modifs,"p1",[x1, y1]);
        let z1 = getRealModifier(modifs,"z1",0);
        let z0 = getRealModifier(modifs,"z0",z1-2*Math.abs(x1-x0));
        let zoom = getRealModifier(modifs,"zoom",1);
        CindyGL.coordinateSystem = {
            x0: x0 , x1: x1, y0: y0, y1: y1,
            z0: z0, z1: z1, zoom: zoom,
            // will be correctly initialized by recomputeProjMatrix()
            viewPosition: [0,0,0,0], transformedViewPos: [0,0,0,0]
        };
        recomputeProjMatrix();
    }
    resetRotation();
    updateCoordSytem({});
    api.defineFunction("cglCoordSystem", 0, (args, modifs) => {
        updateCoordSytem(modifs);
        return nada;
    });
    api.defineFunction("cglViewPos", 0, (args, modifs) => {
        let viewPos = CindyGL.coordinateSystem.transformedViewPos.slice(0,3);
        return { // convert to CindyJS list
            ctype: 'list',
            value: viewPos.map(toCjsNumber)
        };
    });
    api.defineFunction("cglViewNormal", 0, (args, modifs) => {
        let viewPos = CindyGL.coordinateSystem.transformedViewNormal.slice(0,3);
        return { // convert to CindyJS list
            ctype: 'list',
            value: viewPos.map(toCjsNumber)
        };
    });
    api.defineFunction("cglViewRect", 0, (args, modifs) => {
        let [x0,y0,x1,y1,z0,z1] = getZoomedViewPlane();
        return { // convert to CindyJS list
            ctype: 'list',
            value: [x0,y0,x1,y1].map(toCjsNumber)
        };
    });
    api.defineFunction("cglAxes", 0, (args, modifs) => {
        let unitPoints = [
            mvmult4(CindyGL.trafoMatrix,[1,0,0,1]),
            mvmult4(CindyGL.trafoMatrix,[0,1,0,1]),
            mvmult4(CindyGL.trafoMatrix,[0,0,1,1]),
            mvmult4(CindyGL.trafoMatrix,[0,0,0,1]),
        ].map(v=>[v[0]/v[3],v[1]/v[3],v[2]/v[3]]);
        let coordVectors = [
            subv3(unitPoints[0],unitPoints[3]),
            subv3(unitPoints[1],unitPoints[3]),
            subv3(unitPoints[2],unitPoints[3]),
        ];
        return { // convert to CindyJS list
            ctype: 'list',
            value: coordVectors.map(v=>({
                ctype: 'list',
                value: v.map(toCjsNumber)
            }))
        };
    });
    api.defineFunction("rotate3d", 2, (args, modifs) => {
        let alpha = api.evaluateAndVal(args[0])["value"]["real"];
        let beta = api.evaluateAndVal(args[1])["value"]["real"];
        let trafoMatrix;
        if(typeof(CindyGL.trafoMatrix)!== "undefined"){
            trafoMatrix=CindyGL.trafoMatrix;
        }else{
            trafoMatrix=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        }
        // TODO? rotate relative to center of view-rect
        let rotZ=[
          [1,0,0,0],
          [0,Math.cos(beta),-Math.sin(beta),0],
          [0,Math.sin(beta),Math.cos(beta),0],
          [0,0,0,1]
        ];
        let rotY=[
          [Math.cos(alpha),0,-Math.sin(alpha),0],
          [0,1,0,0],
          [Math.sin(alpha),0,Math.cos(alpha),0],
          [0,0,0,1]
        ];
        let rotationMatrix=mmult4(rotY,rotZ);
        CindyGL.trafoMatrix=mmult4(rotationMatrix,trafoMatrix);
        CindyGL.invTrafoMatrix=mmult4(CindyGL.invTrafoMatrix,transposeM4(rotationMatrix));
        if(typeof(CindyGL.coordinateSystem)!== "undefined"){
            CindyGL.coordinateSystem.transformedViewPos =
                mvmult4(CindyGL.invTrafoMatrix,CindyGL.coordinateSystem.viewPosition);
            let [x0,y0,x1,y1,z0,z1] = getZoomedViewPlane();
            CindyGL.coordinateSystem.transformedViewNormal =
                mvmult4(CindyGL.invTrafoMatrix,[0,0,(z1-z0),1]);
            return nada;
        }
        return nada;
    });
    api.defineFunction("zoom3d", 1, (args, modifs) => {
        let zoom = api.evaluateAndVal(args[0])["value"]["real"];
        CindyGL.coordinateSystem.zoom = zoom;
        recomputeProjMatrix();
    });
    // TODO? function to move view-position/canvas
    // TODO? combined reset for objects and coord-system
    api.defineFunction("cglResetRotation", 0, (args, modifs) => {
        resetRotation();
        return nada;
    });

    api.defineFunction("reset3d", 0, (args, modifs) => {
        CindyGL.objectBuffer = {
            opaque:new Map(),
            translucent:new Map(),
            callbacks:{
                preRender:[]
            }
        };
        return nada;
    });
    prepareRender() {
        CindyGL.objectBuffer.callbacks.preRender.forEach((func)=>{
            cglEvalImpl(func,[],{});
        });
        // ? split mesh into seperate layers depending on view direction
        CindyGL.objectBuffer.translucent.forEach((obj3d)=>{
            // sort triangles by depth
            if(obj3d.boundingBox['type']!=BoundingBoxType.triangles) return;
            /**@type{Array<number>} */
            const vertices = obj3d.boundingBox['vertices'];
            const triangleCount = vertices.length/9;
            const viewNormal = CindyGL.coordinateSystem.transformedViewNormal;
            // create an array of indices
            const indices = Array.from({ length: triangleCount }, (_, index) => index);
            // sort indices by distance of triangle midpoints from view-plane
            indices.sort((i1,i2)=>{
                const m1x = (vertices[9*i1]+vertices[9*i1+3]+vertices[9*i1+6])/3;
                const m1y = (vertices[9*i1+1]+vertices[9*i1+4]+vertices[9*i1+7])/3;
                const m1z = (vertices[9*i1+2]+vertices[9*i1+5]+vertices[9*i1+8])/3;
                const m2x = (vertices[9*i2]+vertices[9*i2+3]+vertices[9*i2+6])/3;
                const m2y = (vertices[9*i2+1]+vertices[9*i2+4]+vertices[9*i2+7])/3;
                const m2z = (vertices[9*i2+2]+vertices[9*i2+5]+vertices[9*i2+8])/3;
                const d1 = dot3([m1x,m1y,m1z],viewNormal);
                const d2 = dot3([m2x,m2y,m2z],viewNormal);
                return (d1 < d2) - (d2 < d1);
            });
            obj3d.boundingBox['vertices'] = vertices.map((_,index)=>{
                const triIndex =  Math.floor(index/9);
                const coordIndex = index%9;
                return vertices[9*indices[triIndex]+coordIndex];
            });
            obj3d.boundingBox['vModifiers'].forEach((vMod)=>{
                vMod.values = vMod.values.map((_,index)=>{
                    const triIndex = Math.floor(index/3);
                    const vIndex = index%3;
                    return vMod.values[3*indices[triIndex]+vIndex];
                });
                vMod.aData = undefined; // remove cached attribute data
            });
        });
    }
    postRender() {
      let wrongOpacity = sceneRenderer.wrongOpacity;
        if(wrongOpacity.size>0){
            cglLogDebug(`changing opacity of ${wrongOpacity.size} objects`);
            // update objects that had the wrong opacity
            wrongOpacity.forEach((obj3d)=>{
                let isOpaque = obj3d.opaque !== undefined ? obj3d.opaque : obj3d.renderer.opaque;
                if(isOpaque){
                    CindyGL.objectBuffer.translucent.delete(obj3d.id);
                }else{
                    CindyGL.objectBuffer.opaque.delete(obj3d.id);
                }
                setObject(obj3d.id,obj3d);
            });
        }
    }
    function getSpacePoint(x,y) {
        // FIXME use correct coord-system for x,y position
        let zoom = CindyGL.coordinateSystem.zoom;
        let screenPoint=[zoom*x,zoom*y,zoom*CindyGL.coordinateSystem.z1,1];
        return mvmult4(CindyGL.invTrafoMatrix,screenPoint).slice(0,3);
    }
    /**
     * Returns the position on the view-plane for the pixel (args[0],args[1])
     */
    api.defineFunction("cglSpacePoint", 2, (args, modifs) => {
        let x = api.evaluateAndVal(args[0])["value"]["real"];
        let y = api.evaluateAndVal(args[1])["value"]["real"];
        return toCjs(getSpacePoint(x,y));
    });
    /**
     * Returns the current viewDirection for the pixel (args[0],args[1])
     */
    api.defineFunction("cglDirection", 2, (args, modifs) => {
        let x = api.evaluateAndVal(args[0])["value"]["real"];
        let y = api.evaluateAndVal(args[1])["value"]["real"];
        let spacePoint = getSpacePoint(x,y);
        // TODO support orthogonal projection
        let viewPos = CindyGL.coordinateSystem.transformedViewPos;
        let direction = subv3(spacePoint,viewPos);
        return toCjs(direction);
    });
    /**
     * List all currently visible objects
     * modifiers can be used to filter objects depending on their tags
     * - if a modifier is set to `true` all returned objects will have the corresponging tag
     * - if a modifier is set to `false` no returned object will have the corresponding tag
     */
    api.defineFunction("cglListObjects", 0, (args, modifs) => {
        let modValues = {};
        Object.keys(modifs).forEach(key=>{
            let val = coerce.toBool(api.evaluateAndVal(modifs[key]),null);
            if(val===null)return;
            modValues[key] = val;
        });
        let res = [];
        let searchObject = (obj3d)=>{
            if(Object.keys(modValues).some(key=>(modValues[key] != obj3d.tags.has(key))))
                return;
            res.push(obj3d.id);
        };
        CindyGL.objectBuffer.opaque.forEach(searchObject);
        // TODO? parameter to select if translucent objects should be checked
        CindyGL.objectBuffer.translucent.forEach(searchObject);
        return toCjs(res);
    });
    /**
     * Finds the 3D object on the view-ray through the screen position (args[0],args[1]) that is closest to the camera.
     * If the `tags` modifier is set only objects that have at least one of the specified tags are considered
     */
    api.defineFunction("cglFindObject", 2, (args, modifs) => {
        let x = api.evaluateAndVal(args[0])["value"]["real"];
        let y = api.evaluateAndVal(args[1])["value"]["real"];
        let spacePoint = getSpacePoint(x,y);
        // TODO support orthogonal projection
        let tags = get3DPlotTags(modifs);
        let viewPos = CindyGL.coordinateSystem.transformedViewPos;
        let direction = subv3(spacePoint,viewPos);
        let minDst = Infinity;
        let pickedId = -1;
        let searchObject = (obj3d)=>{
            // TODO use Set.intersection once suppported
            let sharesTag = tags.size==0;
            for(const tag of tags){
                if(obj3d.tags.has(tag)){
                    sharesTag=true;
                    break;
                }
            };
            if(!sharesTag)
                return;
            // TODO? execute shader code to get correct z-coordinate
            if(obj3d.boundingBox['type'] == BoundingBoxType.sphere) {
                let center = obj3d.boundingBox['center'];
                // TODO? also detect positions sligthly outside sphere
                let radius = obj3d.boundingBox['radius'];
                // |v+l*d -c|=r
                let vc = subv3(viewPos,center);
                let a = dot3(direction,direction);
                let b = dot3(vc,direction);
                let c = dot3(vc,vc) - radius*radius;
                let D = b*b-a*c;
                if(D<0){ return; } // ray does not hit sphere
                let dst = (-b - Math.sqrt(D))/a;
                if (dst>=0 && dst<=minDst) {
                    minDst = dst;
                    pickedId = obj3d.id;
                }
            } else if(obj3d.boundingBox['type'] == BoundingBoxType.cylinder) {
                let radius = obj3d.boundingBox['radius'];
                let center = obj3d.boundingBox['center'];
                let orientation = obj3d.boundingBox['direction'];
                let direction0 = scalev3(1/Math.sqrt(dot3(direction,direction)),direction);
                let p1 = subv3(viewPos,center);
                let w = Math.sqrt(dot3(p1,p1));
                let W = addv3(viewPos,scalev3(w,direction0));
                let BA = orientation; // scaled by 2
                let U = scalev3(1/dot3(BA,BA),BA);
                let VA = subv3(W,center);
                let S = subv3(VA,scalev3(dot3(VA,BA),U));
                let T = subv3(direction0,scalev3(dot3(direction0,BA),U));
                let a = dot3(T,T);
                let b = dot3(S,T);
                let c = dot3(S,S) -radius*radius;
                let D= b*b-a*c;
                if(D<0){ return; } // ray does not hit cylinder
                let l1 = -(b + Math.sqrt(D))/a;
                let dst = w+l1;
                let v1 = subv3(addv3(W,scalev3(l1,direction0)),center);
                let delta = dot3(v1,U);
                if ( delta < -1 || delta > 1 ) {
                    let l2 = -(b - Math.sqrt(D))/a;
                    dst = w+l2;
                    let v2 = subv3(addv3(W,scalev3(l2,direction0)),center);
                    delta = dot3(v2,U);
                    if ( delta < -1 || delta > 1 ) {
                        return;
                    }
                }
                if (dst>=0 && dst<=minDst) {
                    minDst = dst;
                    pickedId = obj3d.id;
                }
            }
            // TODO? checks different bouning box types
            // TODO? make pixel depth dependent on actual shader code
        };
        CindyGL.objectBuffer.opaque.forEach(searchObject);
        // TODO? parameter to select if translucent objects should be checked
        CindyGL.objectBuffer.translucent.forEach(searchObject);
        // TODO? convert picked 3D-object to CindyJS object
        // TODO? add a way to group objects
        //   make name,position, readable, ? writable
        return toCjsNumber(pickedId);
    });
    function objectsById(idVal) {
        idVal = api.evaluateAndVal(idVal);
        let ids;
        if(idVal['ctype'] === 'number') {
            let objId = coerce.toInt(idVal,-1);
            if(objId<0)
                return [];
            ids = [objId];
        } else if(idVal['ctype'] === 'list') {
            ids = idVal['value'].map(id=>coerce.toInt(id,-1)).filter(id=>id>=0);
        }
        return ids.map(objId=>{
            let obj3d = CindyGL.objectBuffer.opaque.get(objId);
            let wasOpaque = true;
            if(obj3d === undefined){
                obj3d = CindyGL.objectBuffer.translucent.get(objId);
                wasOpaque = false;
                if(obj3d === undefined){
                    cglLogWarning(`could not find object with id ${objId}`);
                    return null;
                }
            }
            return [obj3d,objId,wasOpaque];
        }).filter(val=>val!==null);
    }
    api.defineFunction("cglSetVisible", 2, (args, modifs) => {
        let isVisible = api.evaluateAndVal(args[1]);
        if(isVisible["ctype"]!="boolean"){
            cglLogWarning("the second parameter of cglSetVisible should be a boolean");
            return nada;
        }
        isVisible = isVisible["value"];
        objectsById(args[0]).forEach(([obj3d,_,__])=>{
            obj3d.visible = isVisible;
        });
        return nada;
    });
    api.defineFunction("cglDelete", 1, (args, modifs) => {
        objectsById(args[0]).forEach(([_,objId,wasOpaque])=>{
            if(wasOpaque) {
                CindyGL.objectBuffer.opaque.delete(objId);
            } else {
                CindyGL.objectBuffer.translucent.delete(objId);
            }
        });
        return nada;
    });
function getZoomedViewPlane(){
    // x0 = (x0+x1)/2 + (x0-x1)/2
    // x0' = (x0+x1)/2 + zoom*(x0-x1)/2 = 0.5*(x0*(1+zoom)+x1*(1-zoom))
    let zoom = CindyGL.coordinateSystem.zoom;
    let x0=CindyGL.coordinateSystem.x0;
    let x1=CindyGL.coordinateSystem.x1;
    let y0=CindyGL.coordinateSystem.y0;
    let y1=CindyGL.coordinateSystem.y1;
    let z0=CindyGL.coordinateSystem.z0;
    let z1=CindyGL.coordinateSystem.z1;
    return [0.5*(x0*(1+zoom)+x1*(1-zoom)),0.5*(y0*(1+zoom)+y1*(1-zoom)),
            0.5*(x1*(1+zoom)+x0*(1-zoom)),0.5*(y1*(1+zoom)+y0*(1-zoom)),
            zoom*(z0-z1)+z1,z1];
}

*/