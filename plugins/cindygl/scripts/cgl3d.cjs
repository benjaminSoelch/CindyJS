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
cglNada = cglUndefinedVal();

cglValOrDefault(val,default):=(
  if(isUndefined(val),default,val)
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

cgl3d.spaceTransform = ((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,1));
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
  self().spaceTransform = self().spaceTransform * rotY * rotZ;
);
rotate3d(alpha,beta) := cgl3d.rotate.(alpha,beta);
cgl3d.zoom = (newScale) => (
  self().zoomFactor = newScale;
);
zoom3d(newScale) := cgl3d.zoom.(newScale);
// TODO? make relative to internal coordinate system
cglViewRect():=(
  regional(bounds,p0,p1);
  bounds = screenbounds();
  p0 = (bounds_4).xy;
  p1 = (bounds_2).xy;
  cgl3d.zoomFactor*[p0_1,p0_2,p1_1,p1_2]
);

cgl3d.objects = {"opaque": {}, "translucent":{}};
cgl3d.resetObjects = () => (
  self().objects.opaque = {};
  self().objects.translucent = {};
);
reset3d() := cgl3d.resetObjects.();
// TODO? make p0,p1, screenCorners, part of permanent coordinate system
cgl3d.prepareRender = () => (
  regional(bounds,size,zoom,x0,y0,x1,y1,a,b,nada);
  if(isUndefined(image),
    bounds = screenbounds();
    a = bounds_1; b = bounds_3;
    bounds = [min(a.x,b.x),min(a.y,b.y),abs(a.x-b.x),abs(a.y-b.y)];
    if(isUndefined(p0),p0 = a);
    if(isUndefined(p1),p1 = b);
  ,
    size = imagesize(image);
    bounds = [0,0,size_1,size_2];
    if(isUndefined(p0),p0 = (0,0));
    if(isUndefined(p1),p1 = size);
  );
  if(!isUndefined(screenCorners),
    a = screenCorners_1; b = screenCorners_2;
    bounds = [min(a_1,b_1),min(a_2,b_2),abs(a_1-b_1),abs(a_2-b_2)];
    if(isUndefined(p0),p0 = a);
    if(isUndefined(p1),p1 = b);
  );
  zoom = cgl3d.zoomFactor;
  [x0,y0] = zoom*p0;
  [x1,y1] = zoom*p1;
  defaultZ = max(abs(x1-x0),abs(y1-y0));
  z0 = if(isUndefined(z0),-defaultZ,zoom*z0);
  z1 = if(isUndefined(z1),defaultZ,zoom*z1);
  projection = [
      [(x1-x0)/2,0,0,(x0+x1)/2],
      [0,(y1-y0)/2,0,(y0+y1)/2],
      [0,0,zScale*((z1*(1-skewFactor)-z0*(1+skewFactor))/2),zScale*(z1*(1-skewFactor)+z0*(1+skewFactor))/2],
      [0,0,-skewFactor,1]
  ];
  cgl3d.renderTransform = cgl3d.spaceTransform*projection;
  layers = cglValOrDefault(layers,if(length(keys(cgl3d.objects.translucent)) > 0,2,0));
  cgl3dStartRender(layers->layers,image->image,bounds->bounds,transform->cgl3d.renderTransform);
  z0 = z1 = p0 = p1 = nada; // ensure "modifiers" do not leak into globals
);
cgl3d.render = () => (
  self().prepareRender.(); // extract preparation to separate function, any local variables interfere with rendering 
  cgl3dRenderOpaque(self().objects.opaque);
  cgl3dRenderTranslucent(self().objects.translucent);
  cgl3dFinishRender();
);
// prevent capturing of global variables
render3d(layers->cglNada,image->cglNada,screenCorners->cglNada,
  p0->cglNada,p1->cglNada,skewFactor->0.5,zScale->1,z0->cglNada,z1->cglNada) := cgl3d.render.();
cgl3d.addObject = (obj) => (
  regional(id,opaqueIf);
  id = cgl3dObjectId(obj);
  opaqueIf = cgl3dObjectGet(obj,"opaqueIf");
  if(isLambda(opaqueIf),
    // TODO pass whole map of plot-modifiers into opaque-expr
    opaqueIf = eval(opaqueIf,(),cglAlpha->cgl3dObjectGetModifier(obj,"cglAlpha"));
  );
  if (if(isUndefined(opaqueIf),true,opaqueIf),
    self().objects.opaque:id = obj;
  ,
    self().objects.translucent:id = obj;
  );
  id
);
cgl3d.getObject = (objId) => (
  regional(obj);
  if(isList(objId),objId=objId_(length(objId)));
  obj = self().objects.opaque:objId;
  if(isundefined(obj),
    obj = self().objects.translucent:objId;
  );
  obj
);
cgl3d.getObjects = (objId) => (
  if(isList(objId),
    apply(objId,cgl3d.getObject.(#))
  ,
    cgl3d.getObject.(objId)
  );
);
cgl3d.removeObject = (id) => (
  if(isList(id),
    apply(id,self().removeObject.(#))
  ,
    delete(self().objects.opaque:id);
    delete(self().objects.translucent:id);
  );
);
delete3d(id) := cgl3d.removeObject.(id);
cgl3d.setVisible = (id,val) => (
  apply(self().getObjects.(id),cgl3dObjectSet(#,"visible",val));
);
hide3d(id) := cgl3d.setVisible.(id,false);
show3d(id) := cgl3d.setVisible.(id,true);
cglSpacePoint(x,y):=(
  regional(p4,bounds,a,b);
  bounds = screenbounds();
  a = bounds_1; b = bounds_3;
  p4 = cgl3d.renderTransform*(2*(x-a_1)/(b_1-a_1)-1,1-2*(y-a_2)/(b_2-a_2),0,1);
  (p4_(1..3))/p4_4;
);
cglDirection(x,y):=(
  regional(p0,p1,bounds,a,b);
  bounds = screenbounds();
  a = bounds_1; b = bounds_3;
  p0 = cgl3d.renderTransform*(2*(x-a_1)/(b_1-a_1)-1,1-2*(y-a_2)/(b_2-a_2),0,1);
  p1 = cgl3d.renderTransform*(2*(x-a_1)/(b_1-a_1)-1,1-2*(y-a_2)/(b_2-a_2),1,1);
  (p1_(1..3))/p1_4 - (p0_(1..3))/p0_4
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
  cgl3d.compute.pixelDepth.(dst,direction);
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

cgl3d.shader.sphere = (direction,isBack) => (
  regional(normal,texturePos,color);
  normal = cgl3d.compute.sphereNormal.(direction,cglCenter,isBack);
  texturePos = cglProjection.(normal);
  color = cglPixelExpr.(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight.(color,direction,normal);
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
  d1 = cglCylinderProjGetDirection1.(normal,height,orientation);
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
    cgl3d.compute.pixelDepth.(cylinderDepths_2,direction);
    normal = normalize(v2-delta2*cglOrientation);
    (normal_1,normal_2,normal_3,delta2);
);
cglCapOpenShaderBack = cglCapVoidShader;
cglCapRoundShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,normal);
    m = cglCenter+delta*cglOrientation;
    normal = cgl3d.compute.sphereNormal.(direction,m,false);
    (normal_1,normal_2,normal_3,delta);
);
cglCapRoundShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,normal);
    m = cglCenter+delta*cglOrientation;
    normal = cgl3d.compute.sphereNormal.(direction,m,true);
    (normal_1,normal_2,normal_3,delta);
);
cglCapFlatShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,a,normal);
    m = cglCenter+delta*cglOrientation;
    // <v + a*d,o> = <m,o>
    a = (m*cglOrientation-cglSpacePos*cglOrientation)/(direction*cglOrientation);
    if(|cglSpacePos + a*direction - m| > cglRadius,cglDiscard());
    cgl3d.compute.pixelDepth.(a,direction);
    normal = normalize(cglOrientation*delta);
    (normal_1,normal_2,normal_3,delta)
);
cglCapFlatShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
    regional(m,a,normal);
    m = cglCenter+delta*cglOrientation;
    // <v + a*d,o> = <m,o>
    a = (m*cglOrientation-cglSpacePos*cglOrientation)/(direction*cglOrientation);
    if(|cglSpacePos + a*direction - m| > cglRadius,cglDiscard());
    cgl3d.compute.pixelDepth.(a,direction);
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
    cgl3d.compute.pixelDepth.(a,direction);
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
    cgl3d.compute.pixelDepth.(a,direction);
    normal = -delta*normalize(cutVector);
    delta = (p-cglCenter)*U;
    (normal_1,normal_2,normal_3,delta)
);
cglCapAngleVoidRoundShaderFront = lambda((direction,cylinderDepths,delta,U,cutVector),
  regional(res,v2);
  res = cglCapRoundShaderFront.(direction,cylinderDepths,delta,U,cutVector);
  v2 = cglSpacePos + cglRawDepth * direction - cglCenter;
  if((delta*(v2*cutVector)>1) % (delta*(v2*U)<1),cglDiscard());
  res
);
cglCapAngleVoidRoundShaderBack = lambda((direction,cylinderDepths,delta,U,cutVector),
  regional(res,v2);
  res = cglCapRoundShaderBack.(direction,cylinderDepths,delta,U,cutVector);
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
  cglCapCutFlat1.(v2,U) & (|v2 + cglOrientation| > cglRadius)
);
cglCapCutRound2 = lambda((v2,U),
  cglCapCutFlat2.(v2,U) & (|v2 - cglOrientation| > cglRadius)
);
cglCapCutAngle1 = lambda((v2,U),
  v2*cglCutDir1<-1
);
cglCapCutAngle2 = lambda((v2,U),
  v2*cglCutDir2>1
);
cglCapCutAngleRound1 = lambda((v2,U),
  cglCapCutRound1.(v2,U) % cglCapCutAngle1.(v2,U);
);
cglCapCutAngleRound2 = lambda((v2,U),
  cglCapCutRound2.(v2,U) % cglCapCutAngle2.(v2,U);
);

// wrap getting cut-normal in lambda-function to save uniform variable in case where normal is not needed
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
cgl3d.connect.flat = 1;

// feature TODO? separate projection for end-caps
cgl3d.shader.cylinder = (direction) => (
  regional(l,BA,U,v1,delta,normalAndHeight,v2,normal,texturePos,color,pos3d);
  l = cgl3d.compute.cylinderDepths.(direction);
  BA = cglOrientation;
  U = BA/(BA*BA);
  v1 = (cglSpacePos+l_1*direction)-cglCenter;
  delta = (v1*U);
  if(cglCut1.(delta,v1)<-1, // cap1
    // opt TODO? is there a less nested algorithm for correctly handling intersecting end-caps
    if(cglCut2.(delta,v1)>1, // cap1 & cap2
      // -> pick cut that is further from viewPosition
      // <v + a*d,n> = <m,n>
      cutVector1=cglGetCutVector1.(U);
      cutVector2=cglGetCutVector2.(U);
      a1 = ((cglCenter-cglOrientation)*cutVector1-cglSpacePos*cutVector1)/(direction*cutVector1);
      a2 = ((cglCenter+cglOrientation)*cutVector2-cglSpacePos*cutVector2)/(direction*cutVector2);
      if(a1<a2,
        normalAndHeight = cglCap2front.(direction,l,1,U,cglGetCutVector2.(U));
        v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1.(v2,U), // cap1 and cap2
          normalAndHeight = cglCap1front.(direction,l,-1,U,cglGetCutVector1.(U));
          v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut2.(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      ,
        normalAndHeight = cglCap1front.(direction,l,-1,U,cglGetCutVector1.(U));
        v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut2.(v2,U), // cap1 and cap2
          normalAndHeight = cglCap2front.(direction,l,1,U,cglGetCutVector2.(U));
          v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut1.(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      );
    ,
      normalAndHeight = cglCap1front.(direction,l,-1,U,cglGetCutVector1.(U));
      v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
      // opt TODO? omit check for second cap if both caps are cut orthogonal to cylinder
      if(cglCapCut2.(v2,U), // cap1 and cap2
        normalAndHeight = cglCap2front.(direction,l,1,U,cglGetCutVector2.(U));
        v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1.(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
      );
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection.(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  ,if(cglCut2.(delta,v1)>1, // cap2
    normalAndHeight = cglCap2front.(direction,l,1,U,cglGetCutVector2.(U));
    v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
    if(cglCapCut1.(v2,U), // cap1 and cap2
      normalAndHeight = cglCap1front.(direction,l,-1,U,cglGetCutVector1.(U));
      v2 = cglSpacePos + cglRawDepth*direction - cglCenter;
      if(cglCapCut2.(v2,U),cglDiscard()); // both intersections with caps are cut of by other cap
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection.(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  , // intersection with body of cylinder
    cgl3d.compute.pixelDepth.(l_1,direction);
    normal = normalize(v1-delta*BA);
    texturePos = cglProjection.(normal,max(-1,min(delta,1)),cglOrientation);
  ));
  color = cglPixelExpr.(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight.(color,direction,normal);
);
cgl3d.shader.cylinderBack = (direction) => (
  regional(l,BA,U,v2,delta,normalAndHeight,v3,normal,texturePos,color,pos3d);
  l = cgl3d.compute.cylinderDepths.(direction);
  BA = cglOrientation;
  U = BA/(BA*BA);
  v2 = (cglSpacePos+l_2*direction)-cglCenter;
  delta = (v2*U);
  if(cglCut1.(delta,v2)<-1, // cap 1
    if(cglCut2.(delta,v2)>1, // cap1 & cap2
      // -> pick cut that is further from viewPosition
      // <v + a*d,n> = <m,n>
      cutVector1=cglGetCutVector1.(U);
      cutVector2=cglGetCutVector2.(U);
      a1 = ((cglCenter-cglOrientation)*cutVector1-cglSpacePos*cutVector1)/(direction*cutVector1);
      a2 = ((cglCenter+cglOrientation)*cutVector2-cglSpacePos*cutVector2)/(direction*cutVector2);
      if(a1<a2,
        normalAndHeight = cglCap2back.(direction,l,1,U,cglGetCutVector2.(U));
        v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1.(v3,U), // cap1 and cap2
          normalAndHeight = cglCap1back.(direction,l,-1,U,cglGetCutVector1.(U));
          v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut2.(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      ,
        normalAndHeight = cglCap1back.(direction,l,-1,U,cglGetCutVector1.(U));
        v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut2.(v3,U), // cap1 and cap2
          normalAndHeight = cglCap2back.(direction,l,1,U,cglGetCutVector2.(U));
          v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
          if(cglCapCut1.(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
        );
      );
    ,
      normalAndHeight = cglCap1back.(direction,l,-1,U,cglGetCutVector1.(U));
      v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
      if(cglCapCut2.(v3,U), // cap1 and cap2
        normalAndHeight = cglCap2back.(direction,l,1,U,cglGetCutVector2.(U));
        v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
        if(cglCapCut1.(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
      );
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection.(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  ,if(cglCut2.(delta,v2)>1, // cap2
    normalAndHeight = cglCap2back.(direction,l,1,U,cglGetCutVector2.(U));
    v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
    if(cglCapCut1.(v3,U), // cap1 and cap2
      normalAndHeight = cglCap1back.(direction,l,-1,U,cglGetCutVector1.(U));
      v3 = cglSpacePos + cglRawDepth*direction - cglCenter;
      if(cglCapCut2.(v3,U),cglDiscard()); // both intersections with caps are cut of by other cap
    );
    normal = (normalAndHeight_1,normalAndHeight_2,normalAndHeight_3);
    delta = normalAndHeight_4;
    pos3d = (cglSpacePos+cglRawDepth*direction);
    texturePos = cglProjection.(normalize((pos3d-cglCenter)-delta*BA),max(-1,min(delta,1)),cglOrientation);
  , // intersection with body of cylinder
    cgl3d.compute.pixelDepth.(l_2,direction);
    normal = normalize(v2-delta*BA);
    texturePos = cglProjection.(normal,max(-1,min(delta,1)),cglOrientation);
  ));
  color = cglPixelExpr.(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight.(color,direction,normal);
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
// use lambda-procedures to allow multiple signatures for same code
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
  v0 = cglEvalP.(poly, x0);
  v1 = cglEvalP.(poly, x1);
  if(v0*v1<=0,
    repeat(16,
      m = (x0+x1)/2;
      vm = cglEvalP.(poly, m);
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
cglBinSearchP4(poly, x0, x1, def) := cglBinSearchP.(poly, x0, x1, def);
cglBinSearchP3(poly, x0, x1, def) := cglBinSearchP.(poly, x0, x1, def);
cglBinSearchP2(poly, x0, x1, def) := cglBinSearchP.(poly, x0, x1, def);
cglBinSearchP1(poly, x0, x1, def) := cglBinSearchP.(poly, x0, x1, def);
 //finds the k-th root of poly in interval (l, u). returns def if there is none
cglKthrootP3(k, poly, l, u, def) := (
  regional(p1, p2, p3, a0, b0, b1, c0, c1, c2, count);
  p3 = poly;  //cubic
  p2 = cglD.(p3); //quadratic
  p1 = cglD.(p2); //linear

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
  p3 = cglD.(p4); //cubic
  p2 = cglD.(p3); //quadratic
  p1 = cglD.(p2); //linear

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
  v1 = cglTorusProjGetDirection1.(normal,radiusDirection,orientation);
  v2 = -normalize(cross(orientation,v1));
  phi1 = arctan2(radiusDirection*v1,radiusDirection*v2)+pi;
  phi2 = arctan2(normal*radiusDirection,normal*orientation)+pi;
  (phi1,phi2)/(2*pi);
);
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
  cgl3d.compute.pixelDepth.(v+dst,direction);
  texturePos = cgl3d.projection.torus.(normal,arcDirection,orientation);
  cglCheckAngle1.(texturePos);
  cglCheckAngle2.(texturePos);
  color = cglPixelExpr.(texturePos,cglSpacePos + cglRawDepth*direction,normal);
  cglLight.(color,direction,normal);
);

/////////////////////
// polygons & meshes
/////////////////////

cgl3d.shader.triangle = (direction) => (
  regional(color,normal,texCoord);
  cglRawDepth = |cglSpacePos-cglSpacePos|; // set raw depth to correct value (depth is handled by v-shader)
  texCoord = cglTextureMapping.(cglSpacePos,direction);
  normal = cglNormalExpr.(cglSpacePos,texCoord);
  color = cglPixelExpr.(texCoord,cglSpacePos,normal);
  cglLight.(color,direction,normal);
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
    even++cgl3d.triangulate.spiral.(odd);
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
  triangles = triangulator.(vertices);
  if(isUndefined(vNormals) & normalType != cgl3d.normalType.pixel,
    vNormals = flatten(apply(1..(length(triangles)/3),i,
      n=normalize(cross(triangles_(3*i)-triangles_(3*i-1),triangles_(3*i-2)-triangles_(3*i-1)));
      [n,n,n];
    ));
    if(normalType==cgl3d.normalType.flat,
      // compute average normal
      vNormals = normalize(sum(vNormals)); // for flat normal-type normals is a single normal
    ,if(normalType==cgl3d.normalType.vertex,
      vMap = triangulator.(1..length(vertices));
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
    vNormals = triangulator.(vNormals);
  );
  vModifiers=apply(vModifiers,e,triangulator.(e));
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
    cgl3d.mesh.samplesToTriangles.(vNormals,Nx,Ny,topology,cgl3d.mesh.sampleVertex);
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
    cglSurfaceExpr.(cglRay(direction, a+#*(b-a))) //evaluate cglSurfaceExpr(ray(direction, ·)) along Chebyshev nodes for (a,b)
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
    v0 = cglSurfaceExpr.(cglRay(direction, x0));
    v1 = cglSurfaceExpr.(cglRay(direction, x1));
    repeat(11,
        m = (x0 + x1) / 2; vm = cglSurfaceExpr.(cglRay(direction, m));
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
  cgl3d.compute.pixelDepth.(dst,direction);
  x = cglRay(direction, dst); // the intersection point in R^3
  normal = normalize(cglNormalExpr.(x));
  pos3d = cglSpacePos+dst*direction;
  pixelCol = cglPixelExpr.(cglSurfaceComputeTextureCoords(pos3d,normal),pos3d,normal);
  color = (1 - cglAlpha) * color + cglAlpha * pixelCol;
  cglLight.(color,direction,normal);
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
  depths = cglCutoffRegion.(cglSpacePos,direction);
  l = depths_1;
  u = depths_2;
  cglSurfaceIterateRoots(direction,l,u);
);
// what color should be given to pixel in  direction direction (vec3)
cgl3d.shader.surfaceLayer = (direction) => (
  regional(depths,u,l);
  // discard points outside bounding sphere
  depths = cglCutoffRegion.(cglSpacePos,direction);
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
  if(isUndefined(val),
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
  if(isUndefined(val),
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
cglGuessdegHelper(F, s, x) := log(|F.(s*x)|)/log(s*|x|); // is approx. degree+log(leadingcoeff)/log(s*|x|) for large s
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
cgl3d.compute.guessDerivative = (F) => (
  lambda(p,((
      (F.(p + [eps, 0, 0]) - F.(p - [eps, 0, 0])),
      (F.(p + [0, eps, 0]) - F.(p - [0, eps, 0])),
      (F.(p + [0, 0, eps]) - F.(p - [0, 0, eps]))
  ) / (2 * eps)),eps->.001,F->F)
);

cgl3d.bounds = {};
cgl3d.bounds.unbounded = {"type":"unbounded"};
cgl3d.bounds.sphere = (center,radius) => {"type":"sphere","center":center,"radius":radius};
cgl3d.bounds.cylinder = (center,orientation,radius) => {"type":"cylinder","center":center,"orientation":orientation,"radius":radius};
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

cgl3d.cutoff = {};
cgl3d.cutoff.screenSphere = {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  cgl3d.compute.sphereDepths.(rayStart,direction,(x0+x1,y0+y1,0)/2,min(|x1-x0|,|y1-y0|)/2)
),"bounds": cgl3d.bounds.unbounded,"modifs":{}};
cgl3d.cutoff.screenCylinder = {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1,r);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  r = min(|x1-x0|,|y1-y0|)/2.5;
  cgl3d.compute.cappedCylinderDepths.(rayStart,direction,(x0+x1,y0+y1,0)/2,[0,r,0],r)
),"bounds": cgl3d.bounds.unbounded,"modifs":{}};
cgl3d.cutoff.screenCylinder = (orientation) => {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1,r);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  r = min(|x1-x0|,|y1-y0|)/2.5;
  cgl3d.compute.cappedCylinderDepths.(rayStart,direction,(x0+x1,y0+y1,0)/2,r*cglBoxOrientation,r)),
  "bounds": cgl3d.bounds.unbounded,"modifs":{"cglBoxOrientation":normalize(orientation)}};
cgl3d.cutoff.screenCube = {"expr": lambda((rayStart,direction),
  regional(viewRect,x0,y0,x1,y1,r);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  r = min(|x1-x0|,|y1-y0|)/3;
  cgl3d.compute.cuboidDepths.(rayStart,direction,(0,0,0),[r,0,0],[0,r,0],[0,0,r])
),"bounds": cgl3d.bounds.unbounded,"modifs":{}};

cgl3d.cutoff.sphere = (center,radius) => {"expr":lambda((rayStart,direction),
  cgl3d.compute.sphereDepths.(rayStart,direction,cglCenter,cglRadius)
),"bounds":cgl3d.bounds.sphere.(center,radius),"modifs":{}};
cgl3d.cutoff.cylinder = (center,orientation,radius) => {"expr":lambda((rayStart,direction),
  cgl3d.compute.cappedCylinderDepths.(rayStart,direction,cglCenter,cglOrientation,cglRadius)
),"bounds":cgl3d.bounds.cylinder.(center,orientation,radius),"modifs":{}};
cgl3d.cutoff.cube = (center,sideLength) => {"expr":lambda((rayStart,direction),
  cgl3d.compute.cuboidDepths.(rayStart,direction,cglCenter,cglCubeAxes_1,cglCubeAxes_2,cglCubeAxes_3)
),"bounds":cgl3d.bounds.cuboid.(center,[sideLength,0,0],[0,sideLength,0],[0,0,sideLength]),"modifs":{}};
cgl3d.cutoff.cube = (center,sideLength,up,front) => {
  "expr":lambda((rayStart,direction),
    cgl3d.compute.cuboidDepths.(rayStart,direction,cglCenter,cglCubeAxes_1,cglCubeAxes_2,cglCubeAxes_3)),
  "bounds":cgl3d.bounds.cuboid.(center,sideLength*normalize(up),sideLength*normalize(front),
    sideLength*normalize(cross(up,front))),"modifs":{}
};
cgl3d.cutoff.cuboid = (center,v1,v2,v3) => {
  "expr":lambda((rayStart,direction),
    cgl3d.compute.cuboidDepths.(rayStart,direction,cglCenter,cglCubeAxes_1,cglCubeAxes_2,cglCubeAxes_3)),
  "bounds":cgl3d.bounds.cuboid.(center,v1,v2,v3),"modifs":{}
};

// intersect cutoff-region with the half-space {P ; P*normal <= depth} // code TODO? better name
cutoffAddPlane(oldCutoff,normal.(),depth.(),plotModifiers->{}):=(
  {
    "expr":lambda((rayStart,direction),
      regional(depths,l,n);
      depths = baseExpr.(rayStart,direction);
      // <v + l*d , n> <= x
      // <v,n> + l<d , n> <= x
      // l <= (x-<v,n>)/<d,n>
      n = normal.(); // current compiler does not support direct multplication with constant vector
      l = (depth.()-(rayStart*n))/(direction*n);
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
  cgl3d.defaults.sphereAlpha = cglNada;
  cgl3d.defaults.sphereProjection = cgl3d.projection.sphereEquirect;

  cgl3d.defaults.cylinderColor = CGLnAMEDcOLORS_"black";
  cgl3d.defaults.cylinderSize = 0.4;
  cgl3d.defaults.cylinderAlpha = cglNada;
  cgl3d.defaults.cylinderCaps = cgl3d.cylinderCap.open;

  cgl3d.defaults.curveSamples = 32;
  cgl3d.defaults.curveCaps = cgl3d.cylinderCap.round;
  cgl3d.defaults.curveJoints =cgl3d.connect.round;

  cgl3d.defaults.torusColor = CGLnAMEDcOLORS_"blue";
  cgl3d.defaults.torusSize = 0.25;
  cgl3d.defaults.torusAlpha = cglNada;

  cgl3d.defaults.triangleColor = CGLnAMEDcOLORS_"green";
  cgl3d.defaults.triangleAlpha = cglNada;

  cgl3d.defaults.surfaceColor = CGLnAMEDcOLORS_"cyan";
  cgl3d.defaults.surfaceAlpha = 1;
  cgl3d.defaults.surfaceCutoff = cgl3d.cutoff.screenSphere;
);

cgl3d.saveDefaults = () => (
  cgl3d.defaultStack = append(cgl3d.defaultStack,
    apply(cgl3d.defaults,#) // push shallow copy of current defaults
  );
);
cgl3d.restoreDefaults = () => (
  if(length(cgl3d.defaultStack)>0,
    // pop previous defaults from default-stack
    cgl3d.defaults = cgl3d.defaultStack_(length(cgl3d.defaultStack));
    cgl3d.defaultStack = apply(1..(length(cgl3d.defaultStack)-1),i,cgl3d.defaultStack_i);
  ,
    cgl3d.resetDefaults.();
  );
);
cgl3d.resetDefaults.(); // initialisation of code complete -> can initialize default values

/////////////////////
// user-interface
/////////////////////


// feature TODO:

// TODO? render intersection of surfaces as primitive operation
// TODO? global clipping region
// TODO? better lighting system
// TODO function for updating/resetting defaults
// ? use internal global variables (-> document names of default values)
// ? always use cglAlpha even if explicitly not specified

// TODO? make bounding box parameters modifiers

// TODO? cglLogLevel(...) built-in for setting log-level

// bug TODO:
// FIXME: bounding box for cylinder with round caps is too short

// FIXME better error message for dynamic array access
// ? does opengl support dynamic indexing
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
// TODO connect3d -> textures do not match for closed curves in connect3d (is this even possible if angle direction is constant along cylinders?)

// opt TODO:
// TODO speed up mesh3d for large meshes
// TODO? store texture-name in plotModifiers instead of lambda-modifier
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
  ,if(length(name)==1, // TODO? verify that name is a valid color
    (name,name,name)
  ,if(if(length(name)==4, name_4 == 1, false),
    (name_1,name_2,name_3)
  ,
    name
  )))
);
cglColorExpr(expr.(texturePos,spacePos,normal),hasAlpha->false):=(
  {
    "type": "expr",
    "expr": expr,
    "hasAlpha": cglValOrDefault(hasAlpha,false)
  }
);
cglTexture(name,hasAlpha->false,interpolate->true,repeatTexture->false):=(
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
        col=expr.(texturePos,spacePos);
        (col_1,col_2,col_3,col_4*cglAlpha)
      ,expr->expr);
    ,
      expr
    );
  ,
    if(hasAlpha,
      lambda((texturePos,spacePos),
        regional(col);
        col=expr.(texturePos,spacePos);
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
  if(!isUndefined(texture),
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
  if(colorsMode != CglColorsIgnore & isUndefined(pixelExpr) & !isUndefined(colors),
    colors = apply(colors,cglColor(#));
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
            regional(col);col = colorData.();
            (col_1,col_2,col_3,col_4*cglAlpha)
          ,colorData->colorData);
        ,
          lambda((texPos,pos3d,normal),
            regional(col);col = colorData.();
            (col_1,col_2,col_3,cglAlpha)
          ,colorData->colorData);
        );
      ,
        lambda((texPos,pos3d,normal),colorData.(),colorData->colorData);
      );
      vModifiers_(if(isBack,"cglColorBack","cglColor")) = colors;
    ,
      colorData = if(isBack,lambda((),cglColorsBack),lambda((),cglColors));
      pixelExpr = if(hasAlpha,
        if(length(colors_1)==4,
          lambda((texPos,pos3d,normal),
            regional(col);col = (1-texPos_2) * colorData.()_1 + texPos_2 * colorData.()_2;
            (col_1,col_2,col_3,col_4*cglAlpha)
          ,colorData->colorData);
        ,
          lambda((texPos,pos3d,normal),
            regional(col);col = (1-texPos_2) * colorData.()_1 + texPos_2 * colorData.()_2;
            (col_1,col_2,col_3,cglAlpha)
          ,colorData->colorData);
        );
      ,
        lambda((texPos,pos3d,normal),
            (1-texPos_2) * colorData.()_1 + texPos_2 * colorData.()_2
        ,colorData->colorData);
      );
      modifiers_(if(isBack,"cglColorsBack","cglColors")) = colors;
    );
  );
  if(isUndefined(pixelExpr) & !isUndefined(color),
    if(isString(color),color=cglColor(color));
    if(isList(color),
      color = cglColor(color);
      usesAlpha = length(color)==4;
      colorData = if(isBack,lambda((),cglColorBack),lambda((),cglColor));
      pixelExpr = if(hasAlpha,
        if(length(color)==4,
          lambda((texPos,pos3d,normal),
            regional(col);col=colorData.();
            (col_1,col_2,col_3,col_4*cglAlpha)
          ,colorData->colorData);
        ,
          lambda((texPos,pos3d,normal),
            regional(col);col=colorData.();
            (col_1,col_2,col_3,cglAlpha)
          ,colorData->colorData);
        );
      ,
        lambda((texPos,pos3d,normal),colorData.(),colorData->colorData);
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
  if(!isUndefined(exprDataBack_"pixelExpr"), // expression for back face is given
    usesAlphaFront = exprData_"usesAlpha";
    usesAlphaBack = exprDataBack_"usesAlpha";
    exprData_"usesAlpha" = usesAlphaFront % usesAlphaBack;
    exprData_"modifiers" = cglMergeDicts(exprData_"modifiers",exprDataBack_"modifiers");
    exprData_"vModifiers" = cglMergeDicts(exprData_"vModifiers",exprDataBack_"vModifiers");
    defaultAlpha = if(hasAlpha,lambda((),cglAlpha),lambda((),1));
    if(usesAlphaFront == usesAlphaBack,
      exprData_"pixelExpr" = lambda((texPos,pos3d,normal),
        if(normal*cglViewDirection<=0,exprFront.(texPos,pos3d,normal),exprBack.(texPos,pos3d,normal))
      ,exprFront->exprData_"pixelExpr",exprBack->exprDataBack_"pixelExpr")
    ,if(usesAlphaFront,
      exprData_"pixelExpr" = lambda((texPos,pos3d,normal),
        regional(col);
        if(normal*cglViewDirection<=0,
          exprFront.(texPos,pos3d,normal)
        ,
          col = exprBack.(texPos,pos3d,normal);
          (col_1,col_2,col_3,defaultAlpha.())
        )
      ,exprFront->exprData_"pixelExpr",exprBack->exprDataBack_"pixelExpr",defaultAlpha->defaultAlpha)
    ,
      exprData_"pixelExpr" = lambda((texPos,pos3d,normal),
        regional(col);
        if(normal*cglViewDirection<=0,
          col = exprFront.(texPos,pos3d,normal);
          (col_1,col_2,col_3,defaultAlpha.())
        ,
          exprBack.(texPos,pos3d,normal)
        )
      ,exprFront->exprData_"pixelExpr",exprBack->exprDataBack_"pixelExpr",defaultAlpha->defaultAlpha)
    ))
  );
  exprData
);
cglNormalizeRange(range):=(
  range = range/(2*pi); // scale: 0...2*pi -> 0..1
  range = apply(range,val,mod(val,1)); // pick representant in 0..1
);

draw3d(pos3d,color->cgl3d.defaults.sphereColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,
  size->cgl3d.defaults.sphereSize,alpha->cgl3d.defaults.sphereAlpha,
  projection->cgl3d.defaults.sphereProjection,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  sphere3d(pos3d,size,
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
    alpha->alpha,projection->projection,light->light,plotModifiers->plotModifiers
  );
);
sphere3d(pos3d,color->cgl3d.defaults.sphereColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,
  size->cgl3d.defaults.sphereSize,alpha->cgl3d.defaults.sphereAlpha,
  projection->cgl3d.defaults.sphereProjection,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  sphere3d(pos3d,size,
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
    alpha->alpha,projection->projection,light->light,plotModifiers->plotModifiers
  );
);

sphere3d(center,radius,
  color->cgl3d.defaults.sphereColor,texture->cglNada,colorBack->cglNada,textureBack->cglNada,
  projection->cgl3d.defaults.sphereProjection,
  alpha->cgl3d.defaults.sphereAlpha,light->cgl3d.defaults.light,plotModifiers->{}):=(
  regional(needBackFace,modifiers,ids,topLayer,hasAlpha,usesAlpha,exprData,opacityExpr);
  hasAlpha = ! isUndefined(alpha);
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
    ids = [cgl3d.addObject.(cgl3dNewSphere(cgl3d.shader.sphere.(#,true),center,radius,
      plotModifiers->modifiers,opaqueIf->opacityExpr))];
  );
  topLayer = cgl3d.addObject.(cgl3dNewSphere(cgl3d.shader.sphere.(#,false),center,radius,
    plotModifiers->modifiers,opaqueIf->opacityExpr));
  ids=if(needBackFace,append(ids,topLayer),topLayer);
);


draw3d(point1,point2,color->cgl3d.defaults.cylinderColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  size->cgl3d.defaults.cylinderSize,alpha->cgl3d.defaults.cylinderAlpha,
  caps->cgl3d.defaults.curveCaps,renderBack->false,direction1->cglNada,
  projection->cgl3d.projection.cylinder,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  cylinder3d((point1+point2)/2,(point2-point1)/2,size,color->color,colors->colors,texture->texture,
    colorBack->colorBack,colorsBack->colorsBack,textureBack->textureBack,
    alpha->alpha,caps->caps,renderBack->renderBack,direction1->direction1,
    projection->projection,light->light,plotModifiers->plotModifiers
  );
);
cylinder3d(center,orientation,color->cgl3d.defaults.cylinderColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  size->cgl3d.defaults.cylinderSize,alpha->cgl3d.defaults.cylinderAlpha,
  caps->cgl3d.defaults.curveCaps,renderBack->false,direction1->cglNada,
  projection->cgl3d.projection.cylinder,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  cylinder3d(center,orientation,size,color->color,colors->colors,texture->texture,
    colorBack->colorBack,colorsBack->colorsBack,textureBack->textureBack,
    alpha->alpha,caps->caps,renderBack->renderBack,direction1->direction1,
    projection->projection,light->light,plotModifiers->plotModifiers
  );
);
cylinder3d(center,orientation,radius,
  color->cgl3d.defaults.cylinderColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  caps->cgl3d.defaults.cylinderCaps,renderBack->false,
  // if true back-face should always be rendered
  direction1->cglNada,projection->cgl3d.projection.cylinder,
  alpha->cgl3d.defaults.cylinderAlpha,light->cgl3d.defaults.light,plotModifiers->{}
):=(
  regional(cap1,cap2,overhang,needBackFace,modifiers,n,ids,topLayer,hasAlpha,usesAlpha,exprData,opacityExpr);
  if(!isUndefined(colors),
    if(length(colors)!=2,
      cglLogWarning("wrong length for colors expected 2 got: "+text(length(colors)));
      if(length(colors)<2,
        colors = colors ++ (color,color);
      );
    );
    if(colors_1 == colors_2,
      color = colors_1;
      colors = cglNada;
    );
  );
  if(isList(caps),
    cap1 = caps_1; cap2 = caps_2;
  ,
    cap1 = cap2 = caps;
  );
  overhang = if(cap1_"name" == "Round" % cap2_"name" == "Round",radius,0);
  hasAlpha = !isUndefined(alpha);
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
  if(!isUndefined(cap1_"cutDirection"),
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
  if(!isUndefined(cap2_"cutDirection"),
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
  if(!isUndefined(direction1),
    modifiers_"cglDirection1" = normalize(direction1);
    modifiers_"cglCylinderProjGetDirection1" = lambda((normal,height,orientation),
      cglDirection1);
  );
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  if(needBackFace,
    ids = [cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.cylinderBack.(#),center,orientation,radius,overhang->overhang,
     plotModifiers->modifiers,opaqueIf->opacityExpr))];
  );
  topLayer = cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.cylinder.(#),center,orientation,radius,overhang->overhang,
    plotModifiers->modifiers,opaqueIf->opacityExpr));
  ids=if(needBackFace,append(ids,topLayer),topLayer);
);

cglJoint(prev,current,next,jointType):=(
  if(jointType==cgl3d.connect.round,
    cgl3d.cylinderCap.cutVoidRound.((normalize(next-current)+normalize(current-prev))/2);
  ,if(jointType==cgl3d.connect.flat,
    cgl3d.cylinderCap.cutVoid.((normalize(next-current)+normalize(current-prev))/2);
  ,if(jointType==cgl3d.connect.open,
    cgl3d.cylinderCap.open
  )));
);
connect3d(points,
  color->cgl3d.defaults.cylinderColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  caps->cgl3d.defaults.curveCaps,joints->cgl3d.defaults.curveJoints,
  closed->false,renderBack->false,
  size->cgl3d.defaults.cylinderSize,alpha->cgl3d.defaults.cylinderAlpha,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  regional(cap1,cap2,jointEnd,jointStart,totalLength,alpha0,a,b,current1,current2,prev,next,projection,nextColor,cylinderColors,direction1,cutDir);
  if(isList(caps),
    cap1 = caps_1; cap2 = caps_2;
  ,
    cap1 = cap2 = caps;
  );
  if(cap1 == cgl3d.cylinderCap.open % cap1_"name" == "Cut-Open" %
    cap2 == cgl3d.cylinderCap.open % cap2_"name" == "Cut-Open",
    renderBack = true; // caps are open -> need back face
  );
  jointEnd = joints;
  jointStart = joints;
  alpha0 = alpha;
  // remove all points before last point that are equal to last point
  if(!isUndefined(colors),
    // feature TODO? sync up colors with used vertices
    // a:col1 b:col2 b:col3 b:col4 c:col5 -> a:col1 b:col2 ; b:col4 c:col5
    colors = remove(apply(1..length(points),i,if(if(i>1,points_(i-1)==points_i,false),-1,colors_i)),-1);
  );
  // TODO: handle colorsBack
  prev = -1;
  points = remove(apply(points,p,if(p == prev,-1,prev=p;p)),-1);
  if(length(points)>=3,
    // update projection if color is computed per pixel
    if(!isUndefined(texture) % !isUndefined(color:"type"),
      projection = lambda((normal,height,orientation),
        regional(pos0);
        pos0=cgl3d.projection.cylinder.(normal,height,orientation);
        (pos0_1,cglSegmentEnd*pos0_2+cglSegmentStart*(1-pos0_2))
      );
    ,
      projection = cgl3d.projection.cylinder
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
      cylinderColors = [
        if(isUndefined(colors),color,colors_(length(points)-1)),
        if(isUndefined(colors),color,colors_(length(points)))
      ];
      nextColor = if(isUndefined(colors),color,colors_1);
      ids = [];
    ,
      current1 = points_1;
      current2 = points_2;
      next = points_3;
      direction1 = normalize(next-current2)+normalize(current2-current1);
      direction1 = normalize(direction1 - (normalize(current2-current1)*direction1)*normalize(current2-current1));
      cylinderColors = [
        if(isUndefined(colors),color,colors_1),
        if(isUndefined(colors),color,colors_2)
      ];
      nextColor = if(isUndefined(colors),color,colors_3);
      a = b;b = a + |current1-current2|/totalLength;
      plotModifiers_"cglSegmentStart"=a;
      plotModifiers_"cglSegmentEnd"=b;
      alpha = alpha0;
      ids = [cylinder3d(
          (current1+current2)/2,(current2-current1)/2,size,
          caps->[cap1,cglJoint(current1,current2,next,jointEnd)],colors->cylinderColors,
          color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
          alpha->alpha,renderBack->renderBack,direction1->direction1,
          projection->projection,light->light,plotModifiers->plotModifiers
        )];
    );
    ids = ids ++ apply(if(closed,2,4)..length(points),i,
      prev = current1;
      current1 = current2;
      current2 = next;
      next = points_i;
      cutDir = normalize((normalize(current2-current1)+normalize(current1-prev)));
      direction1 = direction1-2*(direction1*cutDir)*cutDir; // mirror direction at cut-plane
      cylinderColors = [cylinderColors_1,nextColor];
      nextColor = if(isUndefined(colors),color,colors_i);
      a = b;b = a + |current1-current2|/totalLength;
      plotModifiers_"cglSegmentStart"=a;
      plotModifiers_"cglSegmentEnd"=b;
      alpha = alpha0;
      cylinder3d((current1+current2)/2,(current2-current1)/2,size,colors->cylinderColors,
        caps->[cglJoint(prev,current1,current2,jointStart),cglJoint(current1,current2,next,jointEnd)],
        color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
        alpha->alpha,renderBack->renderBack,direction1->direction1,
        projection->projection,light->light,plotModifiers->plotModifiers
      );
    );
    cylinderColors = [cylinderColors_1,nextColor];
    a = b;b = a + |current2-next|/totalLength;
    plotModifiers_"cglSegmentStart"=a;
    plotModifiers_"cglSegmentEnd"=b;
    cutDir = normalize((normalize(next-current2)+normalize(current2-current1)));
    direction1 = direction1-2*(direction1*cutDir)*cutDir; // mirror direction at cut-plane
    alpha = alpha0;
    flatten(append(ids,cylinder3d((current2+next)/2,(next-current2)/2,size,
        colors->[cylinderColors_2,nextColor],
        caps->[cglJoint(current1,current2,next,jointStart),if(closed,cglJoint(current2,next,points_1,jointEnd),cap2)],
        color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
        alpha->alpha,renderBack->renderBack,direction1->direction1,
        projection->projection,light->light,plotModifiers->plotModifiers
      )));
  ,if(length(points)==2,
    cylinder3d((points_1+points_2)/2,(points_2-points_1)/2,size,
      color->color,colors->colors,texture->texture,colorBack->colorBack,textureBack->textureBack,
      alpha->alpha,caps->caps,renderBack->renderBack,direction1->direction1,
      light->light,plotModifiers->plotModifiers
    );
  ,if(length(points)==1,
    if(!isUndefined(colors),
      color = colors_1
    );
    sphere3d(points_1,size,
      color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
      alpha->alpha,light->light,plotModifiers->plotModifiers
    );
  )));
);
curve3d(expr.(t),from,to,color->cgl3d.defaults.cylinderColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  samples->cgl3d.defaults.curveSamples,closed->false,renderBack->false,
  caps->cgl3d.defaults.curveCaps,joints->cgl3d.defaults.curveJoints,
  size->cgl3d.defaults.cylinderSize,alpha->cgl3d.defaults.cylinderAlpha,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  samples = cglValOrDefault(samples,cgl3d.defaults.curveSamples)-1;
  if(from==to,
    sphere3d(expr.(from),size,
      color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
      alpha->alpha,light->light,plotModifiers->plotModifiers
    );
  ,
    connect3d(apply(0..samples,k,
      t = k/samples;
      expr.(t*to+(1-t)*from);
    ),
      color->color,colors->colors,texture->texture,
      colorBack->colorBack,colorsBack->colorsBack,textureBack->textureBack,
      closed->closed,renderBack->renderBack,caps->caps,joints->joints,size->size,
      alpha->alpha,light->light,plotModifiers->plotModifiers
    );
  );
);

torus3d(center,orientation,radius1,radius2,color->cgl3d.defaults.torusColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.torusAlpha,
  arcRange->cglNada,angle1range->cglNada,angle2range->cglNada,
  direction1->cglNada,light->cgl3d.defaults.light,plotModifiers->{}
):=(
  regional(needBackFace,modifiers,ids,topLayer,hasAlpha,usesAlpha,exprData,pixelExpr,opacityExpr);
  orientation=normalize(orientation);
  hasAlpha = !isUndefined(alpha);
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
  if(!isUndefined(angle1range),
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
  if(!isUndefined(angle2range),
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
  if(!isUndefined(direction1),
    modifiers_"cglDirection1" = normalize(direction1);
    modifiers_"cglTorusProjGetDirection1" = lambda((normal,height,orientation),cglDirection1);
  );
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  if(needBackFace,
    ids = [cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.torus.(#,4),
      center, radius2*orientation, radius1+radius2,
      plotModifiers->modifiers,opaqueIf->opacityExpr)),
    cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.torus.(#,3),
      center, radius2*orientation, radius1+radius2,
      plotModifiers->modifiers,opaqueIf->opacityExpr)),
    cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.torus.(#,2),
      center, radius2*orientation, radius1+radius2,
      plotModifiers->modifiers,opaqueIf->opacityExpr))];
  );
  topLayer = cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.torus.(#,1),
    center, radius2*orientation, radius1+radius2,
    plotModifiers->modifiers,opaqueIf->opacityExpr));
  ids=if(needBackFace,append(ids,topLayer),topLayer);
);

torus3d(center,orientation,radius,size->cgl3d.defaults.torusSize,
  color->cgl3d.defaults.torusColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.torusAlpha,
  arcRange->cglNada,angle1range->cglNada,angle2range->cglNada,
  direction1->cglNada,light->cgl3d.defaults.light,plotModifiers->{}
):=(
  torus3d(center,orientation,radius,size,
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
    alpha->alpha,arcRange->arcRange,angle1range->angle1range,angle2range->angle2range,
    direction1->direction1,light->light,plotModifiers->plotModifiers
  );
);
// feature TODO? option to use aspect ratio instead of second radius
circle3d(center,orientation,radius,size->cgl3d.defaults.torusSize,
  color->cgl3d.defaults.torusColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.torusAlpha,
  arcRange->cglNada,angle1range->cglNada,angle2range->cglNada,
  direction1->cglNada,light->cgl3d.defaults.light,plotModifiers->{}
):=(
  torus3d(center,orientation,radius,size,
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,
    alpha->alpha,arcRange->arcRange,angle1range->angle1range,angle2range->angle2range,
    direction1->direction1,light->light,plotModifiers->plotModifiers
  );
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
cglNormalExpr(expr.(spacePos,texturePos)):=expr;
// feature TODO? normalTexture to be plugged into normals (texture of normal vectors)
draw3d(p1,p2,p3,color->cgl3d.defaults.triangleColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.triangleAlpha,
  uv->[(0,0),(1,0),(0,1)],normal->cglNada,normals->cglNada,
  light->cgl3d.defaults.light,plotModifiers->{},vertexModifiers->{}
):=(
  triangle3d(p1,p2,p3,
    color->color,colors->colors,texture->texture,
    colorBack->colorBack,colorsBack->colorsBack,textureBack->textureBack,
    alpha->alpha,uv->uv,normal->normal,normals->normals,
    light->light,plotModifiers->plotModifiers,vertexModifiers->vertexModifiers
  );
);
triangle3d(p1,p2,p3,color->cgl3d.defaults.triangleColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.triangleAlpha,
  uv->[(0,0),(1,0),(0,1)],normal->cglNada,normals->cglNada,
  light->cgl3d.defaults.light,plotModifiers->{},vertexModifiers->{}
):=(
  regional(normalExpr,modifiers,vModifiers,defNormal,hasAlpha,usesAlpha,exprData,pixelExpr,colLen,opacityExpr);
  hasAlpha = !isUndefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  defNormal = cglValOrDefault(normal,normalize(cross(p2-p1,p3-p1)));
  if(!isUndefined(normals),
    if(isLambda(normals),
      normalExpr = normals;
    ,
      normals = cglCheckSize(normals,3,"wrong length for normals",defNormal);
      vModifiers_"cglNormal" = normals;
      normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
    );
  );
  if(!isUndefined(normal),
    if(isUndefined(normalExpr),
      modifiers_"cglNormal" = normal;
      normalExpr = lambda((spacePos,texturePos),cglNormal);
    ,
      cglLogWarning("modifier `normal` is ignored if `normals` is given");
    );
  );
  if(isUndefined(normalExpr),
    modifiers_"cglNormal" = defNormal;
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  );
  modifiers_"cglNormalExpr" = normalExpr;
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  if(!isUndefined(colors),
    colors = cglCheckSize(colors,3,"wrong length for colors",color);
  );
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject.(cgl3dNewMesh(cgl3d.shader.triangle.(#),[p1,p2,p3],
    plotModifiers->modifiers,vModifiers->vModifiers,opaqueIf->opacityExpr));
);

// TODO improve triangle rendering
// ? support rendering multiple polygons in single call (should be possible with minimal extension of the triangles function)
// ? auto-merge rendered triangles with similar parameters into single render-call

// render multiple triangles in a single call
triangles3d(triangles,
  color->cgl3d.defaults.triangleColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  alpha->cgl3d.defaults.triangleAlpha,uv->cglNada,
  normals->cglNada,normalType->cgl3d.normalType.triangle,
  light->cgl3d.defaults.light,plotModifiers->{},vertexModifiers->{}
):=(
  regional(modifiers,vModifiers,normalExpr,defNormal,hasAlpha,usesAlpha,exprData,pixelExpr,colLen,opacityExpr,v1,v2,v3,triuv,n,cols,vertices,triangleCount);
  vertices = if(islist(triangles_1_1),
    flatten(triangles)
  ,
    triangles
  );
  triangleCount = length(vertices)/3;
  // feature TODO? allow giving normals/uv per vertex
  uv = if(isUndefined(uv),
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
  hasAlpha = !isUndefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  if(isLambda(normals),
    normalExpr = normals;
  ,
    if(normalType == cgl3d.normalType.pixel,
        cglLogError("per-pixel normals should be given as a lambda-expression");
    );
    if(isUndefined(normals) % normalType == cgl3d.normalType.pixel,
      normals = flatten(apply(0..(triangleCount-1),i,
        v1 = vertices_(3*i+1);
        v2 = vertices_(3*i+2);
        v3 = vertices_(3*i+3);
        defNormal = normalize(cross(v2-v1,v3-v1));
        [defNormal,defNormal,defNormal]
      ));
    ,if(normalType == cgl3d.normalType.vertex,
      cglCheckSize(normals,length(vertices),"normals should contain one element for each vertex");
    ,
      cglCheckSize(normals,triangleCount,"normals should contain one element for each triangle");
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
    ));
    vModifiers_"cglNormal" = normals;
    normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
  );
  modifiers_"cglNormalExpr" = normalExpr;
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  if(!isUndefined(colors),
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
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject.(cgl3dNewMesh(cgl3d.shader.triangle.(#),vertices,
    plotModifiers->modifiers,vModifiers->vModifiers,opaqueIf->opacityExpr));
);

polygon3d(vertices,triangulation->cgl3d.triangulate.default,
  color->cgl3d.defaults.triangleColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  alpha->cgl3d.defaults.triangleAlpha,uv->cglNada,
  normal->cglNada,normals->cglNada,normalType->cgl3d.normalType.triangle,
  light->cgl3d.defaults.light,plotModifiers->{},vertexModifiers->{}
):=(
  regional(modifiers,normalExpr,vModifiers,trianglesAndNormals,hasAlpha,usesAlpha,exprData,pixelExpr,colLen,opacityExpr);
  hasAlpha = !isUndefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  modifiers = {
    "cglLight": light
  };
  modifiers = cglMergeDicts(modifiers,cglValOrDefault(plotModifiers,{}));
  vModifiers = cglValOrDefault(vertexModifiers,{});
  if(isLambda(normals),
    normalType = cgl3d.normalType.pixel;
  ,if(!isUndefined(normals),
    normalType = cgl3d.normalType.vertex;
  ,if(!isUndefined(normal),
    normalType = cgl3d.normalType.face;
  )));
  if(isUndefined(normalType),
    normalType = cgl3d.normalType.triangle;
  );
  if(normalType == cgl3d.normalType.pixel,
    if(!isLambda(normals),
      cglLogWarning("modifier `normals` has to be a lambda-function when using per-pixel normals");
    );
    normalExpr = normals;
  ,if(normalType == cgl3d.normalType.vertex,
    normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
    if(!isUndefined(normals),
      normals = cglCheckSize(normals,length(vertices),"wrong length for normals");
    );
  ,if(normalType == cgl3d.normalType.triangle,
    normals = cglNada;
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  ,if(normalType == cgl3d.normalType.flat,
    normals = normal; // for flat normal-type normals is a single normal
    normalExpr = lambda((spacePos,texturePos),cglNormal);
  ,
    cglLogError("unknown normal-type: "+text(normalType));
  ))));
  modifiers_"cglNormalExpr" = normalExpr;
  if(isUndefined(uv),
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
  if(!isUndefined(colors),
    colors = cglCheckSize(colors,length(vertices),"wrong length for colors",color);
  );
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  trianglesAndNormals = cgl3d.compute.triangulationPolygon.(triangulation,vertices,normals,vModifiers,normalType);
  vModifiers = trianglesAndNormals_3;
  if(normalType == cgl3d.normalType.flat,
    modifiers_"cglNormal" =trianglesAndNormals_2;
  ,if(normalType != cgl3d.normalType.pixel,
    vModifiers_"cglNormal" =trianglesAndNormals_2;
  ));
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject.(cgl3dNewMesh(cgl3d.shader.triangle.(#),trianglesAndNormals_1,
    plotModifiers->modifiers,vModifiers->vModifiers,opaqueIf->opacityExpr));
);

// feature TODO? adjust uv coordinates if side of grid-cell is collapsed
mesh3d(grid,
  color->cgl3d.defaults.triangleColor,colors->cglNada,texture->cglNada,
  colorBack->cglNada,colorsBack->cglNada,textureBack->cglNada,
  alpha->cgl3d.defaults.triangleAlpha,uv->cglNada,
  normals->cglNada,normalType->cglNada,topology->cgl3d.mesh.topologyOpen,
  light->cgl3d.defaults.light,plotModifiers->{},vertexModifiers->{}
):=(
  regional(Ny,Nx,normalExpr,triangles,modifiers,vModifiers,exprData,pixelExpr,hasAlpha,usesAlpha,colLen,opacityExpr);
  hasAlpha = !isUndefined(alpha);
  alpha = cglValOrDefault(alpha,1);
  Ny = length(grid);
  Nx = length(grid_1);
  triangles = cgl3d.mesh.samplesToTriangles.(grid,Nx,Ny,topology,cgl3d.mesh.sampleVertex);
  if(isUndefined(normalType),
    if(isLambda(normals),
      normalType = cgl3d.normalType.pixel;
    ,if(!isUndefined(normals),
        normalType = cgl3d.normalType.vertex;
    ,
      normalType = cgl3d.normalType.triangle;
    ));
  );
  if(normalType == cgl3d.normalType.pixel & !isLambda(normals),
      cglLogWarning("modifier `normals` has to a lambda-expression when using per-pixel normals");
      normals = cglNada;
      normalType = cgl3d.normalType.vertex;
  );
  if(normalType == cgl3d.normalType.pixel,
    normalExpr = normals
  ,
    if(normalType == cgl3d.normalType.vertex,
      // interpolated vector may not be normalized
      normalExpr = lambda((spacePos,texturePos),normalize(cglNormal));
    ,
      normalExpr = lambda((spacePos,texturePos),cglNormal);
    );
    if(isUndefined(normals),
      normals = cgl3d.mesh.guessNormals.(grid,Nx,Ny,normalType,topology);
    ,if(normalType == cgl3d.normalType.face,
      normals = cgl3d.mesh.samplesToTriangles.(normals,Nx,Ny,topology,cgl3d.mesh.sampleFace);
    ,if(normalType == cgl3d.normalType.triangle,
      normals = cgl3d.mesh.samplesToTriangles.(normals,Nx,Ny,topology,cgl3d.mesh.sampleTriangle);
    ,if(normalType == cgl3d.normalType.vertex,
      normals = cgl3d.mesh.samplesToTriangles.(normals,Nx,Ny,topology,cgl3d.mesh.sampleVertex);
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
  if(isUndefined(uv),
    // map grid-positions to unit-square
    regional(nx,ny);
    ny = if(topology.y=="open",Ny-1,Ny);
    nx = if(topology.x=="open",Nx-1,Nx);
    uv=apply(0..ny,y,apply(0..nx,x,(x/nx,y/ny)));
  );
  modifiers_"cglTextureMapping" = lambda((pos3d,direction),cglTexCoords);
  vModifiers_"cglTexCoords" = uv;
  vModifiers=apply(vModifiers,samples,cgl3d.mesh.samplesToTriangles.(samples,Nx,Ny,topology,cgl3d.mesh.sampleVertex));
  // bring vertex colors in correct format (one color per vertex)
  if(!isUndefined(colors),colors = cgl3d.mesh.samplesToTriangles.(colors,Nx,Ny,topology,cgl3d.mesh.sampleVertex));
  if(!isUndefined(colorsBack),colorsBack = cgl3d.mesh.samplesToTriangles.(colorsBack,Nx,Ny,topology,cgl3d.mesh.sampleVertex));
  exprData = cglResolveColorExpr(hasAlpha,CglColorsVertex);
  usesAlpha = exprData_"usesAlpha";
  modifiers = cglMergeDicts(modifiers,exprData_"modifiers");
  vModifiers = cglMergeDicts(vModifiers,exprData_"vModifiers");
  if(hasAlpha, modifiers_"cglAlpha" = alpha);
  modifiers_"cglPixelExpr" = exprData_"pixelExpr";
  if(normalType != cgl3d.normalType.pixel,
    vModifiers_"cglNormal" = normals;
  );
  opacityExpr = if(usesAlpha,false,if(hasAlpha,lambda((),cglAlpha>=1),true));
  cgl3d.addObject.(cgl3dNewMesh(cgl3d.shader.triangle.(#),triangles,
    plotModifiers->modifiers,vModifiers->vModifiers,opaqueIf->opacityExpr));
);

// TODO using modifiers in plotted expression leads to errors
//  * evaluate plot-expr with all given plot-modifiers?

// feature TODO custom projection/uv-mapping from surface to 2D space
cglSurface3d(F,// lambda: p: vec3 -> float
  color->cgl3d.defaults.surfaceColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.surfaceAlpha,
  dF->cglNada,cutoffRegion->cgl3d.defaults.surfaceCutoff,
  degree->cglNada,layers->0,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
    regional(N,nodes,normalExpr,N,B,modifiers,viewRect,bounds,usesAlpha,opacityExpr,exprData,pixelExpr);
    normalExpr = if(isUndefined(dF),cgl3d.compute.guessDerivative.(F),lambda(p,dF.(p_1,p_2,p_3),dF->dF));
    if(isUndefined(degree),
      N = min(cglTryDetermineDegree(fun),cglMaxAutoDeg);
      if(isUndefined(N),
        N = min(cgl3d.compute.guessDegree.(F),cglMaxAutoDeg);
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
        cgl3d.addObject.(cgl3dNewObject(cgl3d.shader.surface.(#),plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,if(bounds_"type" == "sphere",
        cgl3d.addObject.(cgl3dNewSphere(cgl3d.shader.surface.(#),bounds_"center",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,if(bounds_"type" == "cylinder",
        cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.surface.(#),bounds_"center",bounds_"orientation",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,if(bounds_"type" == "cuboid",
        cgl3d.addObject.(cgl3dNewCuboid(cgl3d.shader.surface.(#),bounds_"center",bounds_"v1",bounds_"v2",bounds_"v3",plotModifiers->modifiers,opaqueIf->opacityExpr))
      ,
        cglLogError("unknown bounding box type: "+text(bounds_"type"));
      ))));
    ,
      if(layers<0,layers=N,layers=min(layers,N));
      apply(0..(layers-1),i,
        modifiers_"K"=layers-i;
        if(bounds_"type" == "unbounded",
          cgl3d.addObject.(cgl3dNewObject(cgl3d.shader.surfaceLayer.(#),plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,if(bounds_"type" == "sphere",
          cgl3d.addObject.(cgl3dNewSphere(cgl3d.shader.surfaceLayer.(#),bounds_"center",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,if(bounds_"type" == "cylinder",
          cgl3d.addObject.(cgl3dNewCylinder(cgl3d.shader.surfaceLayer.(#),bounds_"point1",bounds_"point2",bounds_"radius",plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,if(bounds_"type" == "cuboid",
          cgl3d.addObject.(cgl3dNewCuboid(cgl3d.shader.surfaceLayer.(#),bounds_"center",bounds_"v1",bounds_"v2",bounds_"v3",plotModifiers->modifiers,opaqueIf->opacityExpr))
        ,
          cglLogError("unknown bounding box type: "+text(bounds_"type"));
        ))));
      );
    );
);
surface3d(cgl3dSurfaceExpr.(x,y,z),
  color->cgl3d.defaults.surfaceColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.surfaceAlpha,
  dF->cglNada,cutoffRegion->cgl3d.defaults.surfaceCutoff,
  degree->cglNada,layers->0,
  light->cgl3d.defaults.light,plotModifiers->{}
) := (
  regional(cgl3dSurfaceExpr0);
  cgl3dSurfaceExpr0 = cgl3dSurfaceExpr.(0,0,0);
  if(isLambda(cgl3dSurfaceExpr0),cgl3dSurfaceExpr=cgl3dSurfaceExpr0);
  // convert function to form taking vector insteads of 3 arguments
  cglSurface3d(lambda(p,cgl3dSurfaceExpr.(p.x, p.y, p.z),cgl3dSurfaceExpr->cgl3dSurfaceExpr),
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,alpha->alpha,
    dF->dF,cutoffRegion->cutoffRegion,degree->degree,layers->layers,
    light->light,plotModifiers->plotModifiers
  );
);

// feature TODO: allow using function value in color-expression (? accessible through special modifier)
plot3d(cgl3dPlotExpr.(x,y),
  color->cgl3d.defaults.surfaceColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.surfaceAlpha,
  df->cglNada,cutoffRegion->cgl3d.defaults.surfaceCutoff,
  degree->cglNada,layers->0,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  regional(cgl3dPlotExpr0);
  cgl3dPlotExpr0 = cgl3dPlotExpr.(0,0);
  if(isLambda(cgl3dPlotExpr0),cgl3dPlotExpr=cgl3dPlotExpr0);
  if(isUndefined(degree),
      degree = min(cglTryDetermineDegree(cgl3dPlotExpr),cglMaxAutoDeg);
  );
  cglSurface3d(lambda(p,cgl3dPlotExpr.(p.x,p.y)-p.z,cgl3dPlotExpr->cgl3dPlotExpr),
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,alpha->alpha,
    dF->cglNada/*lambda((x,y,z),,df->df)*/,//TODO: compute surface dF from df
    cutoffRegion->cutoffRegion,degree->degree,layers->layers,
    light->light,plotModifiers->plotModifiers
  );
);

complexplot3d(cgl3dPlotExpr.(z),
  color->cgl3d.defaults.surfaceColor,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.surfaceAlpha,
  df->cglNada,cutoffRegion->cgl3d.defaults.surfaceCutoff,
  degree->cglNada,layers->0,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  cplot3d(cgl3dPlotExpr,
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,alpha->alpha,
    df->df,cutoffRegion->cutoffRegion,degree->degree,layers->layers,
    light->light,plotModifiers->plotModifiers
  );
);
cplot3d(cgl3dPlotExpr.(z),
  color->cglNada,texture->cglNada,
  colorBack->cglNada,textureBack->cglNada,alpha->cgl3d.defaults.surfaceAlpha,
  df->cglNada,cutoffRegion->cgl3d.defaults.surfaceCutoff,
  degree->cglNada,layers->0,
  light->cgl3d.defaults.light,plotModifiers->{}
):=(
  regional(cgl3dPlotExpr0);
  cgl3dPlotExpr0 = cgl3dPlotExpr.(0,0,0);
  if(isLambda(cgl3dPlotExpr0),cgl3dPlotExpr=cgl3dPlotExpr0);
  if(isUndefined(color) & isUndefined(texture), // TODO find better condition for choosing phase-coloring
    color = {
      "type": "expr",
      "expr": lambda((texturePos,spacePos,normal),
        regional(z);
        z=cgl3dPlotExpr.(spacePos_1+i*spacePos_2);
        hue((arctan2(re(z),im(z))+pi)/(2*pi))
      ,cgl3dPlotExpr->cgl3dPlotExpr),
      "hasAlpha": false
    };
  );
  cglSurface3d(lambda(p,abs(cgl3dPlotExpr.(p.x+i*p.y))-p.z,cgl3dPlotExpr->cgl3dPlotExpr),
    color->color,texture->texture,colorBack->colorBack,textureBack->textureBack,alpha->alpha,
    dF->cglNada/*lambda((x,y,z),,df->df)*/,//TODO: compute surface dF from df
    cutoffRegion->cutoffRegion,degree->cglValOrDefault(degree,-1),layers->layers,
    light->light,plotModifiers->plotModifiers
  );
);