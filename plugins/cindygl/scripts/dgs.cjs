////////////////
// Controls
////////////////
dgs3dMouseState = {};
dgs3dPrepare():=(
    dgs3dMouseState:"sx" = mouse().x;
    dgs3dMouseState:"sy" = mouse().y;
    dgs3dMouseState:"rotating" = false;
    dgs3dMouseState:"dragging" = false;
    dgs3dMouseState:"oldTarget" = cglUndefinedVal();
);
dgs3dHandleMouseDown():=(
    dgs3dMouseState:"x0" = mouse().x;
    dgs3dMouseState:"y0" = mouse().y;
    if(isUndefined(dgs3dMouseState:"target"),
      dgs3dMouseState:"rotating" = true;
    ,
      dgs3dMouseState:"dragging" = true;
    )
);
dgs3dHandleMouseUp():=(
    dgs3dMouseState:"rotating" = dgs3dMouseState:"dragging" = false;
);
dgs3dUpdateCutoff():=(
  regional(viewRect,x0,y0,x1,y1);
  viewRect = cglViewRect(); // [x0,y0,x1,y1]
  x0 = viewRect_1;
  y0 = viewRect_2;
  x1 = viewRect_3;
  y1 = viewRect_4;
  dgs3dCutoffRadius = min(|x1-x0|,|y1-y0|)/2;
  dgs3dCutoffCenter = (x0+x1,y0+y1,0)/2;
);
dgs3dHandleZoom(zoom):=(
  dgs3dUpdateCutoff();
  forall(dgs3dPoints,p,cglEval(p:"redraw",p));
  forall(dgs3dLines,l,cglEval(l:"redraw",l));
  forall(dgs3dPlanes,p,cglEval(p:"redraw",p));
  forall(dgs3dQuadrics,q,cglEval(q:"redraw",q));
);
dgs3dUpdateCutoff();

// TODO make focus color customizable, ? set color depending on color of point
dgs3dFocusColor = cglGreen;
dgs3dMovementAxes(point):=(
  regional(normal,l,PQ);
  if(length(point:"parents")>0,
    if(length(point:"parents")==1,
      l = point:"parents"_1;
      if(l:"type" == "line",
        PQ = transpose(kernel(dgs3dLineMatrix(l:"coords")));
        {"type":"parallel","v":(PQ_1 * PQ_2_4 - PQ_2*PQ_1_4)_(1..3)}
      ,if(l:"type" == "plane",
        {"type":"normal","n":(l:"coords")_(1..3)}
      ,if(l:"type" == "quadric",
        {"type":"normal","n":((l:"coords"*point:"coords")_(1..3))}
      ,
        cglLogError("unimplemented: moving point depending on "+(l:"type"));
      )));
    ,
      cglLogError("unimplemented: restricted movement");
    )
  ,
    // move free points parallel to view-plane
    normal = cglViewNormal();
    {"type":"normal","n":normal}
  );
);
// TODO? limit maximum movement distance (moving along nearly orthogonal plane leads to points getting lost)
dgs3dPreFrame():=(
    regional(mx,my,dx,dy,target,newCoords,oldTarget,axes,viewPos,center,movePlaneOffset,movePlaneNormal,d2,oldDirection,newDirection,oldT,newT,oldPos,newPos,truePos,oldRadius,updateQueue);
    mx = mouse().x;
    my = mouse().y;
    oldTarget = dgs3dMouseState:"oldTarget";
    if(dgs3dMouseState:"dragging",
      target = oldTarget;
      axes = dgs3dMovementAxes(target);
      viewPos = cglViewPos();
      // view direction for given screen pixel
      oldDirection = cglDirection(dgs3dMouseState:"sx",dgs3dMouseState:"sy");
      newDirection = cglDirection(mx,my);
      if(axes:"type" == "normal",
        // compute intersections with movement plane for old and new view-ray
        movePlaneNormal = axes:"n";
        center = target:"coords"_(1..3)/target:"coords"_4;
        movePlaneOffset = movePlaneNormal * center;
        oldT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * newDirection);
        oldPos = viewPos + oldT*oldDirection;
        newPos = viewPos + newT*newDirection;
        // keep movement relative to click position (instead of center)
        truePos = center;
        newPos = newPos+(truePos-oldPos);
        // update position
        newCoords = (newPos_1,newPos_2,newPos_3,1);
      ,if(axes:"type" == "parallel",
        // move point in plane spanned by axis and line normal to axis
        d2 = cross(axes:"v",cglViewNormal());
        movePlaneNormal = cross(axes:"v",d2);
        center = target:"coords"_(1..3);
        movePlaneOffset = movePlaneNormal * center;
        oldT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * newDirection);
        oldPos = viewPos + oldT*oldDirection;
        newPos = viewPos + newT*newDirection;
        // remove movement component orthogonal to axis
        newPos = newPos - ((newPos-oldPos)*d2)/(d2*d2) * d2;
        // keep movement relative to click position (instead of center)
        truePos = center;
        newPos = newPos+(truePos-oldPos);
        newCoords = (newPos_1,newPos_2,newPos_3,1);
      ,
        cglLogError("unimplemented: "+axes:"type"+" movement direction");
      ));
      dgs3dTracePoint(target,newCoords,0);
      dgs3dRedrawChildren(target);
    ,if(dgs3dMouseState:"rotating",
      dx = 2 * (mx - dgs3dMouseState:"sx"); dy = 2 * (my - dgs3dMouseState:"sy");
      rotate3d(dx,dy);
    ,
      target = dgs3dFind(mx,my);
      if(target!=oldTarget,
        if(!isUndefined(oldTarget),
          cglUpdate(oldTarget:"drawId",UcglColor->oldTarget:"color");
        );
        if(!isUndefined(target),
          cglUpdate(target:"drawId",UcglColor->dgs3dFocusColor);
        );
        oldTarget = target;
      );
    ));
    dgs3dMouseState:"target" = target;
    dgs3dMouseState:"oldTarget" = oldTarget;
    dgs3dMouseState:"sx" = mx;
    dgs3dMouseState:"sy" = my;
);
DGS3DmOVEoK = 0;
DGS3DmOVErETRY = 1;
// TODO? avoid duplicate work:
//  * don't recompute children if parent fails (! ensure that only computed objects are reset)
//  * do not redo calculations for objects where recomputing objects and all children succeeded
dgs3dTryRecomputeChildren(obj):=(
  regional(retry);
  obj = dgs3dObjById(obj);
  retry = cglEval(obj:"recompute",obj) != DGS3DmOVEoK;
  // try recalculating direct children 
  forall(obj:"children",child,
    child = dgs3dObjById(child);
    child:"oldCoords" = child:"coords";
    retry = retry % dgs3dTryRecomputeChildren(child);
  );
  retry
);
dgs3dResetChildren(obj):=(
  obj = dgs3dObjById(obj);
  forall(obj:"children",child,
    child:"coords" = child:"oldCoords";
    dgs3dResetChildren(child);
  );
);
dgs3dRedrawChildren(obj):=(
  obj = dgs3dObjById(obj);
  cglEval(obj:"redraw",obj);
  forall(obj:"children",child,
    dgs3dRedrawChildren(child);
  );
);
DGS3DmAXlEVEL = 10;
dgs3dTracePoint(p,newCoords,level):=(
  regional(nextPos,mid);
  nextPos = newCoords;
  p:"oldCoords" = p:"coords";
  p:"coords" = nextPos;
  // TODO? complex detour
  if(dgs3dTryRecomputeChildren(p),
    dgs3dResetChildren(p);
    if(level<DGS3DmAXlEVEL,
      mid = (p:"oldCoords" + newCoords)/2;
      dgs3dTracePoint(p,mid,level+1);
      // move relative to new-position 
      dgs3dTracePoint(p,newCoords + (p:"coords"-mid),level+1);
    ,
      cglLogError("tracing failed");
    );
  );
);

////////////////
// Tensor Math
////////////////

// a:vec4, b: vec4  => vec6
dgs3dEpsilon44(a,b):=(
  // 12 13 14 23 24 34
  (a_3*b_4-a_4*b_3,a_4*b_2-a_2*b_4,a_2*b_3-a_3*b_2,a_1*b_4-a_4*b_1,a_3*b_1-a_1*b_3,a_1*b_2-a_2*b_1)
);
// p:vec4, l: vec6  => vec4
dgs3dEpsilon46(p,l):=(
  //  1  2  3  4  5  6
  // 12 13 14 23 24 34
  (
     p_2*l_6 - p_3 * l_5 + p_4 * l_4,
    -p_1*l_6 + p_3 * l_3 - p_4 * l_2,
     p_1*l_5 - p_2 * l_3 + p_4 * l_1,
    -p_1*l_4 + p_2 * l_2 - p_3 * l_1
  )
);
// l: vec6 => vec6
dgs3dDualLine(l):=(
  (l_6,-l_5,l_4,l_3,-l_2,l_1)
);
// l: vec6 => mat4
dgs3dLineMatrix(l):=(
  ((0,l_1,l_2,l_3),(-l_1,0,l_4,l_5),(-l_2,-l_4,0,l_6),(-l_3,-l_5,-l_6,0))
);
// a:vec4, b: vec4, c: vec4  => vec4
dgs3dEpsilon444(a,b,c):=(
  (
      a_2*b_3*c_4 - a_2*b_4*c_3 - a_3*b_2*c_4 + a_3*b_4*c_2 + a_4*b_2*c_3 - a_4*b_3*c_2,
    - a_1*b_3*c_4 + a_1*b_4*c_3 + a_3*b_1*c_4 - a_3*b_4*c_1 - a_4*b_1*c_3 + a_4*b_3*c_1,
      a_1*b_2*c_4 - a_1*b_4*c_2 - a_2*b_1*c_4 + a_2*b_4*c_1 + a_4*b_1*c_2 - a_4*b_2*c_1,
    - a_1*b_2*c_3 + a_1*b_3*c_2 + a_2*b_1*c_3 - a_2*b_3*c_1 - a_3*b_1*c_2 + a_3*b_2*c_1
  )
);
dgs3dDiv0(a,b):=(
  if(b!=0,a/b,0);
);
// l: vec6 (point-like), Q: mat4 => vec4 x 2
dgs3dIntersectLineQuadric(l,Q):=(
  regional(mL,M,d12,d13,d14,d23,d24,d34,a,r,c0,c,rMax,cMax);
  mL = dgs3dLineMatrix(l);
  M = mL*Q*mL;
  // 1. find non-zero 2x2 minor in M
  // Is it enough to only check minors on diagonal?
  d12 = -dgs3dDiv0(det(apply(M_(3,4),r,r_(3,4))),det(apply(mL_(3,4),r,r_(3,4))));
  d13 = -dgs3dDiv0(det(apply(M_(2,4),r,r_(2,4))),det(apply(mL_(2,4),r,r_(2,4))));
  d14 = -dgs3dDiv0(det(apply(M_(2,3),r,r_(2,3))),det(apply(mL_(2,3),r,r_(2,3))));
  d23 = -dgs3dDiv0(det(apply(M_(1,4),r,r_(1,4))),det(apply(mL_(1,4),r,r_(1,4))));
  d24 = -dgs3dDiv0(det(apply(M_(1,3),r,r_(1,3))),det(apply(mL_(1,3),r,r_(1,3))));
  d34 = -dgs3dDiv0(det(apply(M_(1,2),r,r_(1,2))),det(apply(mL_(1,2),r,r_(1,2))));
  a = sqrt(append(remove((d12,d13,d14,d23,d24,d34),0),0)_1);
  // 2. add multiple of mL to make minor 0
  M = M+a*mL;
  rMax = -1;
  cMax = -1;
  // 3. pick non-zero row and column
  forall(1..4,i,
    if(abs(M_i*M_i)>rMax,
      r = M_i;
      rMax = abs(M_i*M_i);
    );
    c0 = (M_1_i,M_2_i,M_3_i,M_4_i);
    if(abs(c0*c0)>cMax,
      c = c0;
      cMax = abs(c0*c0);
    )
  );
  (r/max(r,|#|),c/max(c,|#|));
);
// adjoint of 4x4 matrix
adjoint4(M):=( // in CindyJS there does not seem to be a adjoint built-in ...
  regional(Mij);
  apply(1..4,i,apply(1..4,j,
    det(apply(M_(remove(1..4,j)),#_(remove(1..4,i))))*(-1)^(i+j)
  ));
);
// squared coordinates
dgs3dSqCoords(p):=(
  (p_1*p_1,p_1*p_2,p_1*p_3,p_1*p_4,p_2*p_2,p_2*p_3,p_2*p_4,p_3*p_3,p_3*p_4,p_4*p_4);
);

////////////////
// Objects + Rendering
////////////////

// all objects
dgs3dObjects = {};
// objects separated by type
dgs3dPoints = {};
dgs3dLines = {};
dgs3dPlanes = {};
dgs3dQuadrics = {};
// special objects
dgs3dMovablePoints = {};

// create unique id for each object
dgs3dUID = 0;
dgs3dNewId() := (
  regional(res);
  res = text(dgs3dUID);
  dgs3dUID = dgs3dUID + 1;
  res;
);
dgs3dObjById(id) := if(isstring(id), dgs3dObjects:id, id);
dgs3dIdForObj(obj) := if(isstring(obj), obj, obj:"id");
// TODO? store/load -> convert to/from list of JSONs with ids instead of values for parents/children

// obj3d = {type: string, id: string, coords: [number], visible: bool, size: real, color: vec3, alpha: real}

// TODO? add additional fields
// + name: string -> unique identifier for object
// +  algorithm: string -> identifier for algorithm used to construct object
//    TODO? support running algorithm by name
//      * dgs3dCreate(algorithm:"string",args:[obj3d])
// + defined incidences / deduced incidences

// type: string, parents: [obj3d] -> obj3d
dgs3dNewObject(type,parents):=(
  regional(obj,objId);
  objId = dgs3dNewId();
  obj = {
    "type":type, "id": objId, "drawId": -1,
    "parents": parents, "children": [],
    "visible": cglValOrDefault(visible,true),
    "recompute": cglLazy(self,DGS3DmOVEoK), "redraw": cglLazy(self,)
  };
  dgs3dObjects:objId = obj;
  if(type == "point",
    dgs3dPoints:objId = obj;
    obj:"color" = cglValOrDefault(color,cglRed);
    obj:"alpha" = cglValOrDefault(alpha,1);
    obj:"redraw" = cglLazy(self,dgs3dRenderPoint(self));
  ,if(type == "line",
    dgs3dLines:objId = obj;
    obj:"color" = cglValOrDefault(color,cglBlack);
    obj:"alpha" = cglValOrDefault(alpha,1);
    obj:"redraw" = cglLazy(self,dgs3dRenderLine(self));
  ,if(type == "plane",
    dgs3dPlanes:objId = obj;
    obj:"color" = cglValOrDefault(color,cglCyan);
    obj:"alpha" = cglValOrDefault(alpha,0.67);
    obj:"redraw" = cglLazy(self,dgs3dRenderPlane(self));
  ,if(type == "quadric",
    dgs3dQuadrics:objId = obj;
    obj:"color" = cglValOrDefault(color,(0.5,0,1));
    obj:"alpha" = cglValOrDefault(alpha,0.67);
    obj:"redraw" = cglLazy(self,dgs3dRenderQuadric(self));
  ,if(type == "pointPair",
    // nothing to do
  ,
    cglLogWarning("unknown object type");
  )))));
  forall(parents,parent,
    parent:"children" = append(parent:"children",obj);
  );
  obj;
);

// TODO? better name
cglInterface(color3d,dgs3dUpdateColor,(obj),(visible,color,alpha));
dgs3dUpdateColor(obj):=(
  obj:"color" = cglValOrDefault(color,obj:"color");
  obj:"alpha" = cglValOrDefault(alpha,obj:"alpha");
  obj:"visible" = cglValOrDefault(alpha,obj:"visible");
  cglEval(obj:"redraw",obj);
);

// TODO do not render objects with complex coordinates
// TODO? only render points within drawing region
dgs3dRenderPoint(self):=(
  regional(p,ptColor);
  p = self:"coords";
  if(self:"visible" == true & min(apply(p,isReal(#))) & p_4 != 0, // treat undefined as falsy
    ptColor = if(self == dgs3dMouseState:"target",dgs3dFocusColor,self:"color");
    if(self:"drawId"==-1,
      self:"drawId" = draw3d(p_(1..3)/p_4,size->self:"size",color->ptColor,alpha->self:"alpha");
    ,
      cglUpdate(self:"drawId",UcglColor->ptColor,UcglAlpha->self:"alpha");
      cglUpdateBounds(self:"drawId",p_(1..3)/p_4,self:"size");
      cglSetVisible(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
    cglSetVisible(self:"drawId",false);
  ));
);
// TODO? line segments: use definition-points instead of sphere intersections if they are closer to center of clipping sphere
dgs3dRenderLine(self):=(
  regional(PQ);
  if(self:"visible" == true, // treat undefined as falsy
    // compute intersections of line with clipping sphere
    PQ = dgs3dIntersectLineQuadric(dgs3dDualLine(self:"coords"),((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,-dgs3dCutoffRadius*dgs3dCutoffRadius)));
    if(min(apply(PQ_1,isReal(#))),// real solution
      if(self:"drawId"==-1,
        self:"drawId" = draw3d((PQ_1_(1..3))/PQ_1_4,(PQ_2_(1..3))/PQ_2_4,size->self:"size",color->self:"color",alpha->self:"alpha")
      ,
        cglUpdate(self:"drawId",UcglColor->self:"color",UcglAlpha->self:"alpha");
        cglUpdateBounds(self:"drawId",(PQ_1_(1..3))/PQ_1_4,(PQ_2_(1..3))/PQ_2_4,self:"size");
        cglSetVisible(self:"drawId",true);
      );
    ,if(self:"drawId"!=-1,
      cglSetVisible(self:"drawId",false);
    ));
  ,if(self:"drawId"!=-1,
      cglSetVisible(self:"drawId",false);
  ));
);
// TODO? polygons: render only region bounded by set of (potentially infinite) points
dgs3dRenderPlane(self):=(
  regional(n); // make n visible in callee scopes
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
      n = self:"coords";
      // TODO? use custom cutoff-region instead of default
      self:"drawId" = surface3d(x*n_1+y*n_2+z*n_3+n_4,plotModifiers->{"n":self:"coords"},color->self:"color",alpha->self:"alpha");
    ,
      cglUpdate(self:"drawId",Un->self:"coords",UcglColor->self:"color",UcglAlpha->self:"alpha");
      cglSetVisible(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cglSetVisible(self:"drawId",false);
  ));
);
dgs3dRenderQuadric(self):=(
  regional(M); // make M visible in callee scopes
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
      M = self:"coords";
      // TODO? use custom cutoff-region instead of default
      self:"drawId" = surface3d((x,y,z,1)*M*(x,y,z,1),plotModifiers->{"M":self:"coords"},alpha->self:"alpha",color->self:"color");
    ,
      cglUpdate(self:"drawId",UM->self:"coords",UcglColor->self:"color",UcglAlpha->self:"alpha");
      cglSetVisible(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cglSetVisible(self:"drawId",false);
  ));
);

////////////////
// Projective Primitives
////////////////

// TODO? accept point object as argument
// p: vec3 | vec4 => vec4
dgs3dPoint4(p):=(
  if(length(p)==4,
    p_(1..4)
  ,if(length(p)==3,
    (p_1,p_2,p_3,1)
  ,
    cglError("point should have length 3 or 4");
    (0,0,0,1)
  ));
);

// p: vec3|vec4 = (x,y,z)|(x,y,z,w) ; size: real = radius, pinned: bool = fixed position?, visible: bool = should object be drawn
cglInterface(point3d,dgs3dNewPoint,(p),(size,pinned,visible,color,alpha));
dgs3dNewPoint(p):=(
  regional(obj);
  obj = dgs3dNewObject("point",[]);
  obj:"coords" = dgs3dPoint4(p);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  dgs3dRenderPoint(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
// TODO? line3d collides with line3d in CindyGL3D

// p: vec4 = (x,y,z,w) , visible: bool = should object be drawn
cglInterface(plane3d,dgs3dNewPlane,(p),(visible,color,alpha));
dgs3dNewPlane(p):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[]);
  obj:"coords" = p;
  dgs3dRenderPlane(obj);
  obj
);
// p: mat4, visible: bool = should object be drawn
cglInterface(quadric3d,dgs3dNewQuadric,(p),(visible,color,alpha));
dgs3dNewQuadric(M):=(
  regional(obj);
  obj = dgs3dNewObject("quadric",[]);
  obj:"coords" = M;
  dgs3dRenderQuadric(obj);
  obj
);

// p1: point, p2: point|line, size:real = radius, visible: bool = should object be drawn
cglInterface(join3d,dgs3dJoin2,(p1,p2),(size,visible,color,alpha));
dgs3dJoin2(a,b):=(
  if(a:"type" == "point" & b:"type" == "point",
    dgs3dJoin2P(a,b);
  ,if(a:"type" == "point" & b:"type" == "line",
    dgs3dJoinPL(a,b);
  ,if(a:"type" == "line" & b:"type" == "point",
    dgs3dJoinPL(b,a);
  ,
    cglLogWarning("cannot join "+a:"type"+" and "+b:"type");
  )));
);

// p1: point, p2: point, size:real = radius, visible: bool = should object be drawn
dgs3dJoin2P(p1,p2):=(
  regional(obj);
  obj = dgs3dNewObject("line",[p1,p2]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(a,b);
    a = (self:"parents"_1):"coords";
    b = (self:"parents"_2):"coords";
    self:"coords" = dgs3dEpsilon44(a,b);
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);

// p1: point, l1: line, visible: bool = should object be drawn
dgs3dJoinPL(p1,l1):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[p1,l1]);
  obj:"recompute" = cglLazy(self,
    regional(p,l,PQ);
    p = self:"parents"_1;
    l = self:"parents"_2;
    self:"coords" = dgs3dEpsilon46(p:"coords",dgs3dDualLine(l:"coords"));
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);

// p0: vec4 (x,y,z,w), l: line , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
cglInterface(pointOnLine3d,dgs3dPointOnLine,(p0,l),(size,pinned,visible,color,alpha));
dgs3dPointOnLine(p0,l):=(
  regional(obj);
  obj = dgs3dNewObject("point",[l]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = cglLazy(self,
    regional(p,l,K);
    // project old-position onto line
    p = self:"coords";
    l = dgs3dLineMatrix(self:"parents"_1:"coords");
    K = transpose(kernel(l));
    // project P into K
    p = sum(K,v,(p*v)*v);
    self:"coords" = p;
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
cglInterface(pointOnLine3d,dgs3dPointOnLine,(l),(size,pinned,visible,color,alpha));
dgs3dPointOnLine(l):=(
  dgs3dPointOnLine((0,0,0,1),l);
);

// p1: point, p2: point, p3: point  or  p1: line, p2: line, p3: line, visible: bool = should object be drawn
cglInterface(join3d,dgs3dJoin3,(p1,p2,p3),(visible,color,alpha));
dgs3dJoin3(a,b,c):=(
  if(a:"type" == "point" & b:"type" == "point" & c:"type" == "point",
    dgs3dJoin3P(a,b,c);
  ,if(a:"type" == "line" & b:"type" == "line" & c:"type" == "line",
    dgs3dJoin3L(a,b,c);
  ,
    cglLogWarning("cannot join "+a:"type"+", "+b:"type"+" and "+c:"type");
  ));
);
// p1: point, p2: point, p3: point, visible: bool = should object be drawn
dgs3dJoin3P(p1,p2,p3):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[p1,p2,p3]);
  obj:"recompute" = cglLazy(self,  
    self:"coords" = dgs3dEpsilon444(self:"parents"_1:"coords",self:"parents"_2:"coords",self:"parents"_3:"coords");
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// l1: point, l2: point, l3: point, visible: bool = should object be drawn
dgs3dJoin3L(l1,l2,l3):=(
  regional(obj);
  obj = dgs3dNewObject("quadric",[l1,l2,l3]);
  obj:"recompute" = cglLazy(self,
    regional(M);
    M = dgs3dLineMatrix(l1:"coords")*dgs3dLineMatrix(dgs3dDualLine(l2:"coords"))*dgs3dLineMatrix(l3:"coords");
    self:"coords" = M + transpose(M);
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);

// p0: vec3|vec4 = (x,y,z,w=1), s: plane , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
cglInterface(pointOnPlane3d,dgs3dPointOnPlane,(p0,s),(size,pinned,visible,color,alpha));
dgs3dPointOnPlane(p0,s):=(
  regional(obj);
  obj = dgs3dNewObject("point",[s]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = cglLazy(self,
    regional(p4,p,s,n);
    // project old-position onto plane
    p4 = self:"coords";
    p = p4_(1..3)/p4_4;
    s = self:"parents"_1:"coords";
    n = s_(1..3);
    p = p - n*(s_4+p*n)/(n*n);
    self:"coords" = (p_1,p_2,p_3,1);
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
cglInterface(pointOnPlane3d,dgs3dPointOnPlane,(s),(size,pinned,visible,color,alpha));
dgs3dPointOnPlane(s):=(
  dgs3dPointOnPlane((0,0,0,1),s);
);
// p0: vec3|vec4 = (x,y,z,w=1), q: quadric , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
cglInterface(pointOnQuadric3d,dgs3dPointOnQuadric,(p0,q),(size,pinned,visible,color,alpha));
dgs3dPointOnQuadric(p0,q):=(
  regional(obj);
  obj = dgs3dNewObject("point",[q]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = cglLazy(self,
    regional(p,Q,n,l,AB,a,b,ab);
    p = self:"coords";
    Q = (self:"parents"_1):"coords";
    // 1. get line through point normal to surface
    n = Q * p;
    l = dgs3dEpsilon44(p,p+(n_1,n_2,n_3,0));
    // 2. intersect line with quadric
    AB = dgs3dIntersectLineQuadric(dgs3dDualLine(l),Q);
    // TODO better tracing
    //  point gets unstable when normal plane is close to orthogonal to view direction
    // 3. choose intersection closer to current pos
    a = (p-AB_1)*(p-AB_1);
    b = (p-AB_2)*(p-AB_2);
    ab = (AB_1-AB_2)*(AB_1-AB_2);
    // assignment inside branches to avoid assigning value when comparison is undefined
    if(if(a<=b,
      self:"coords" = AB_1;
      ab > a
    ,
      self:"coords" = AB_2;
      ab > b
    ),
      DGS3DmOVEoK
    ,
      DGS3DmOVErETRY
    );
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);

// p1: plane, p2: plane|line, size:real = radius, visible: bool = should object be drawn
cglInterface(meet3d,dgs3dMeet2,(P1,P2),(size,visible,color,alpha));
dgs3dMeet2(a,b):=(
  if(a:"type" == "plane" & b:"type" == "plane",
    dgs3dMeet2P(a,b);
  ,if(a:"type" == "plane" & b:"type" == "line",
    dgs3dMeetPL(a,b);
  ,if(a:"type" == "line" & b:"type" == "plane",
    dgs3dMeetPL(b,a);
  ,if(a:"type" == "line" & b:"type" == "line",
    dgs3dMeet2L(a,b);
  ,if(a:"type" == "quadric" & b:"type" == "line",
    dgs3dMeetQL(a,b);
  ,if(a:"type" == "line" & b:"type" == "quadric",
    dgs3dMeetQL(b,a);
  ,
    cglLogWarning("cannot meet "+a:"type"+" and "+b:"type");
  ))))));
);
// P1: plane, P2: plane, size:real = radius, visible: bool = should object be drawn
dgs3dMeet2P(P1,P2):=(
  regional(obj);
  obj = dgs3dNewObject("line",[P1,P2]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(A,B);
    A = (self:"parents"_1):"coords";
    B = (self:"parents"_2):"coords";
    self:"coords" = dgs3dDualLine(dgs3dEpsilon44(A,B));
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// P1: plane, l1: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeetPL(P1,l1):=(
  regional(obj);
  obj = dgs3dNewObject("point",[P1,l1]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,
    regional(p,l);
    p = self:"parents"_1;
    l = self:"parents"_2;
    self:"coords" = dgs3dEpsilon46(p:"coords",l:"coords");
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// l1: line, l2: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeet2L(l1,l2):=(
  regional(obj);
  obj = dgs3dNewObject("point",[l1,l2]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,
    regional(l1,l2);
    l1 = dgs3dLineMatrix(dgs3dDualLine((self:"parents"_1):"coords"));
    l2 = dgs3dLineMatrix((self:"parents"_2):"coords");
    // there is no projectively invariant equation, use equation that works for (most?) finite points
    // TODO: figure out where this equation breaks, choose good sample point
    // FIXME: this seems to break when lines are close to intersecting
    self:"coords" = (l1*l2)*(0,0,1,0);
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// Q1: quadric, l1: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeetQL(Q1,l1):=(
  regional(obj);
  obj = dgs3dNewObject("pointPair",[Q1,l1]);
  obj:"children" = [dgs3dNewObject("point",[obj]),dgs3dNewObject("point",[obj])];
  obj:"recompute" = cglLazy(self,
    regional(Q,l,AB,oldA,oldB,d11,d12,d21,d22);
    Q = self:"parents"_1:"coords";
    l = self:"parents"_2:"coords";
    AB = dgs3dIntersectLineQuadric(dgs3dDualLine(l),Q);
    self:"coords" = AB;
    oldA = self:"children"_1:"coords";
    oldB = self:"children"_2:"coords";
    if(isundefined(oldA)% isundefined(oldB),
        self:"children"_1:"coords" = AB_1;
        self:"children"_2:"coords" = AB_2;
        DGS3DmOVEoK
    ,
      // TODO better tracing
      // * use "projective distance" (? normalize then distance) instead of euclidean distance
      // * better way to detect if points are too close to each other
      //  cindy-classic uses d(oldA,oldB)* s > d(oldA,newA)+d(oldB,newB)
      d11 = |AB_1-oldA|;
      d12 = |AB_1-oldB|;
      d21 = |AB_2-oldA|;
      d22 = |AB_2-oldB|;
      // * ? retry if distance between points smaller that distance to new points
      if(d11 <= d12 & d22 <= d21,
        self:"children"_1:"coords" = AB_1;
        self:"children"_2:"coords" = AB_2;
        DGS3DmOVEoK
      ,if(d12 < d11 & d21 < d22,
        self:"children"_1:"coords" = AB_2;
        self:"children"_2:"coords" = AB_1;
        DGS3DmOVEoK
      , // both solutions closer to same vertex
        self:"children"_1:"coords" = AB_1;
        self:"children"_2:"coords" = AB_2;
        DGS3DmOVErETRY
      ));
    )
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  forall(obj:"children",child,
    child:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
    print(child:"coords"_(1..3)/child:"coords"_4);
    cglEval(child:"recompute",child);
    dgs3dRenderPoint(child);
  );
  obj
);
// P1: plane, P2: plane, P3: plane, size:real = radius, visible: bool = should object be drawn
cglInterface(meet3d,dgs3dMeet3P,(P1,P2,P3),(size,visible,color,alpha));
dgs3dMeet3P(P1,P2,P3):=(
  regional(obj);
  obj = dgs3dNewObject("point",[P1,P2,P3]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,  
    self:"coords" = dgs3dEpsilon444(self:"parents"_1:"coords",self:"parents"_2:"coords",self:"parents"_3:"coords");
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);

// Q: quadric, x: point|line|plane => plane size:real = radius, visible: bool = should object be drawn
cglInterface(polar3d,dgs3dPolar,(Q,x),(size,visible,color,alpha));
dgs3dPolar(Q,x):=(
  if(x:"type" == "point",
    dgs3dPolarPlane(Q,x);
  // TODO? is there a geometrically meaningful way to polarize a line
  ,if(x:"type" == "plane",
    dgs3dPolarPoint(Q,x);
  // TODO? polar quadric
  ,
    cglLogWarning("cannot compute polar of "+x:"type");
  ));
);
// Q: quadric, p: point => plane, visible: bool = should object be drawn
dgs3dPolarPlane(Q,p):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[Q,p]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,  
    self:"coords" = self:"parents"_1:"coords" * self:"parents"_2:"coords";
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// Q: quadric, P: plane => point, visible: bool = should object be drawn
dgs3dPolarPoint(Q,P):=(
  regional(obj);
  obj = dgs3dNewObject("point",[Q,P]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,  
    self:"coords" = adjoint4(self:"parents"_1:"coords") * self:"parents"_2:"coords";
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);

// pts: [point; 9] => quadric, visible: bool = should object be drawn
cglInterface(quadricBy9Points,dgs3dQuadric9point,(pts),(visible,color,alpha));
dgs3dQuadric9point(pts):=(
  if(length(pts)!=9,
    cglLogWarning("wrong number of points expected 9 got "+length(pts));
  );
  obj = dgs3dNewObject("quadric",pts);
  obj:"recompute" = cglLazy(self,
    regional(pts,v);
    pts = apply(self:"parents",p,dgs3dSqCoords(p:"coords"));
    v = transpose(kernel(pts++[(0,0,0,0,0,0,0,0,0,0)]))_1;
    self:"coords" = ((2*v_1,v_2,v_3,v_4),(v_2,2*v_5,v_6,v_7),(v_3,v_6,2*v_8,v_9),(v_4,v_7,v_9,2*v_10));
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// pts: [plane; 9] => quadric, visible: bool = should object be drawn
cglInterface(quadricBy9Planes,dgs3dQuadric9plane,(planes),(visible,color,alpha));
dgs3dQuadric9plane(planes):=(
  if(length(planes)!=9,
    cglLogWarning("wrong number of planes expected 9 got "+length(planes));
  );
  obj = dgs3dNewObject("quadric",planes);
  obj:"recompute" = cglLazy(self,
    regional(planes,v,M);
    planes = apply(self:"parents",p,dgs3dSqCoords(p:"coords"));
    v = transpose(kernel(planes++[(0,0,0,0,0,0,0,0,0,0)]))_1;
    M = ((2*v_1,v_2,v_3,v_4),(v_2,2*v_5,v_6,v_7),(v_3,v_6,2*v_8,v_9),(v_4,v_7,v_9,2*v_10));
    self:"coords" = adjoint4(M);
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);

////////////////
// Euclidean Operations
////////////////

// x: plane|line, p: point => plane|line; size:real = radius, visible: bool = should object be drawn
cglInterface(parallel3d,dgs3dParallel,(x,p),(size,visible,color,alpha));
dgs3dParallel(x,p):=(
  if(x:"type" == "line",
    dgs3dParallelLine(x,p);
  ,if(x:"type" == "plane",
    dgs3dParallelPlane(x,p);
  ,
    cglLogWarning("cannot compute parallel to "+x:"type");
  ));
);
// l: line, p: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dParallelLine(l,p):=(
  regional(obj);
  obj = dgs3dNewObject("line",[l,p]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(l,p);
    l = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dEpsilon44(p,dgs3dEpsilon46((0,0,0,1),l));
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// P: plane, p: point => plane; size:real = radius, visible: bool = should object be drawn
dgs3dParallelPlane(P,p):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[P,p]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(P,p);
    P = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dEpsilon46(p,dgs3dEpsilon44((0,0,0,1),P));
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// x: plane|line, p: point => line|plane|; size:real = radius, visible: bool = should object be drawn
cglInterface(normal3d,dgs3dNormal,(x,p),(size,visible,color,alpha));
dgs3dNormal(x,p):=(
  if(x:"type" == "plane",
    dgs3dOrthogonalLine(x,p);
  ,if(x:"type" == "line",
    dgs3dOrthogonalPlane(x,p);
  ,
    cglLogWarning("cannot compute parallel to "+x:"type");
  ));
);
// P: plane, p: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dOrthogonalLine(P,p):=(
  regional(obj);
  obj = dgs3dNewObject("line",[P,p]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(P,p);
    P = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dEpsilon44(p,p+(P_1,P_2,P_3,0));
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// P: plane, p: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dOrthogonalPlane(l,p):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[l,p]);
  obj:"size" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(l,p,K,n);
    l = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    K = transpose(kernel(dgs3dLineMatrix(l)));
    n = (K_1 * K_2_4 - K_2*K_1_4)_(1..3);
    print(n);
    self:"coords" = (n_1*p_4,n_2*p_4,n_3*p_4,-(p_1,p_2,p_3)*n);
    DGS3DmOVEoK
  );
  cglEval(obj:"recompute",obj);
  cglEval(obj:"redraw",obj);
  obj
);
// TODO? orthogonal line to line through line
//  -> join(pt, meet(line,orth-plane(pt,line)))
// TODO? line orthogonal to two other lines

// TODO? transformations

// ? quadric by mix of points, lines and planes
// ? plane+quadric
// ? quadric+quadric

// TODO? more intuitive names for functions
// TODO: support deleting objects, ? support redefining objects

// TODO: test-case for quadric by 9 planes

dgs3dFind(x,y):=(
  regional(root,dir,res,dist);
  root = cglSpacePoint(x,y);
  dir = normalize(cglDirection(x,y));
  res = cglUndefinedVal();
  dist = 1e400; // infinity
  forall(dgs3dMovablePoints,pt,
    bounds = cglGetBounds(pt:"drawId");
    d = cglEvalOrDiscard(cglSphereDepths(root,dir,bounds_"center",bounds_"radius")_1);
    if(!isUndefined(d),
      if(d < dist,
        dist = d;
        res = pt;
      )
    );
  );
  res
);