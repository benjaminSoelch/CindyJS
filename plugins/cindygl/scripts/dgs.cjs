// TODO move internal global variables to namespace
dgs3dPrepare():=(
    sx = mouse().x;
    sy = mouse().y;
    rotating = false;
    dragging = false;
    oldTarget = cglUndefinedVal();
);
dgs3dHandleMouseDown():=(
    x0 = mouse().x;
    y0 = mouse().y;
    if(isundefined(oldTarget),
      rotating = true;
    ,
      dragging = true;
    )
);
dgs3dHandleMouseUp():=(
    rotating = dragging = false;
);
dgs3dUpdateCutoff():=(
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
);
dgs3dUpdateCutoff();

dgs3dMovementAxes(point):=(
  regional(normal,l);
  if(length(point:"parents")>0,
    if(length(point:"parents")==1,
      l = point:"parents"_1;
      if(l:"type" == "line",
        PQ = transpose(kernel(dgs3dLineMatrix(l:"coords")));
        {"type":"parallel","v":(PQ_1 * PQ_2_4 - PQ_2*PQ_1_4)_(1..3)}
      ,if(l:"type" == "plane",
        {"type":"normal","n":(l:"coords")_(1..3)}
      ,
        cglLogError("unimplemented: moving point depending on "+(l:"type"));
      ));
    ,
      cglLogError("unimplemented: restricted movement");
    )
  ,
    // move free points parallel to view-plane
    normal = cglViewNormal();
    {"type":"normal","n":normal}
  );
);
dgs3dPreFrame():=(
    regional(mx,my,dx,dy,axes,viewPos,center,movePlaneOffset,movePlaneNormal,d2,oldDirection,newDirection,oldT,newT,oldPos,newPos,truePos,oldRadius,updateQueue);
    updateQueue = [];
    mx = mouse().x;
    my = mouse().y;
    if(dragging,
      target = oldTarget;
      axes = dgs3dMovementAxes(target);
      viewPos = cglViewPos();
      // view direction for given screen pixel
      oldDirection = cglDirection(sx,sy);
      newDirection = cglDirection(mx,my);
      if(axes:"type" == "normal",
        // compute intersections with movement plane for old and new view-ray
        movePlaneNormal = axes:"n";
        center = target:"coords"_(1..3);
        movePlaneOffset = movePlaneNormal * center;
        oldT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * newDirection);
        oldPos = viewPos + oldT*oldDirection;
        newPos = viewPos + newT*newDirection;
        // keep movement relative to click position (instead of center)
        truePos = center;
        newPos = newPos+(truePos-oldPos);
        // update position
        target:"coords" = (newPos_1,newPos_2,newPos_3,1);
        cglEval(target:"redraw",target);
        // TODO more efficient data-structure for queue
        updateQueue = updateQueue ++ target:"children";
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
        target:"coords" = (newPos_1,newPos_2,newPos_3,1);
        updateQueue = append(updateQueue, target);
      ,
        cglLogError("unimplemented: "+axes:"type"+" movement direction");
      ));
    ,if(rotating,
      dx = 2 * (mx -sx); dy = 2 * (my -sy);
      rotate3d(dx,dy);
    ,
      target = dgs3dFind(mx,my);
      if(target!=oldTarget,
        if(!isundefined(oldTarget),
          cglUpdate(oldTarget:"drawId",UcglColor->cglRed);
        );
        if(!isundefined(target),
          cglUpdate(target:"drawId",UcglColor->cglGreen);
        );
        oldTarget = target;
      );
    ));
    sx = mx;
    sy = my;
    while(length(updateQueue)>0,
      next = updateQueue_1;
      // TODO don't add children that already are in queue
      updateQueue = updateQueue_(2..(length(updateQueue))) ++ next:"children";
      cglEval(next:"recompute",next);
    );
);


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
  regional(mL,M,d12,d13,d14,d23,d24,d34,a,r,c0,c);
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
  // 3. pick non-zero row and column
  forall(1..4,i,
    if(M_i*M_i>0,
      r = M_i
    );
    c0 = (M_1_i,M_2_i,M_3_i,M_4_i);
    if(c0*c0>0,
      c = c0;
    )
  );
  (r,c);
);

dgs3dMovablePoints = [];
dgs3dPoints = [];
dgs3dLines = [];
dgs3dPlanes = [];

dgs3dNewObject(type,parents):=(
  regional(obj);
  obj = {"type":type, "drawId": -1, "parents": parents, "children": [], "recompute": cglLazy(self,), "redraw": cglLazy(self,)};
  // TODO? give each object a unique id, allow removing objects by id
  if(type == "point",
    dgs3dPoints = append(dgs3dPoints,obj);
  ,if(type == "line",
    dgs3dLines = append(dgs3dLines,obj);
  ,if(type == "plane",
    dgs3dPlanes = append(dgs3dPlanes,obj);
  ,
    cglLogWarning("unknown object type");
  )));
  forall(parents,parent,
    parent:"children" = append(parent:"children",obj);
  );
  obj;
);

// TODO? only render points within drawing region
dgs3dRenderPoint(self):=(
  regional(p);
  p = self:"coords";
  if(p_4 != 0,
    if(self:"drawId"==-1,
      self:"drawId" = draw3d(p_(1..3)/p_4,size->size);
    ,
      cglUpdateBounds(self:"drawId",p_(1..3)/p_4,self:"radius")
    );
  ,if(self:"drawId"!=-1,
    cglSetVisible(self:"drawId",false);
  ));
);
// TODO? line segments: use definition-points instead of sphere intersections if they are closer to center of clipping sphere
dgs3dRenderLine(self):=(
  regional(PQ);
  // compute intersections of line with clipping sphere
  PQ = dgs3dIntersectLineQuadric(dgs3dDualLine(self:"coords"),((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,-dgs3dCutoffRadius*dgs3dCutoffRadius)));
  if(min(apply(PQ_1,isreal(#))),// real solution
    if(self:"drawId"==-1,
      self:"drawId" = draw3d((PQ_1_(1..3))/PQ_1_4,(PQ_2_(1..3))/PQ_2_4,size->self:"radius")
    ,
      cglUpdateBounds(self:"drawId",(PQ_1_(1..3))/PQ_1_4,(PQ_2_(1..3))/PQ_2_4,self:"radius");
      cglSetVisible(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
    cglSetVisible(self:"drawId",false);
  ));
);
// TODO? polygons: render only region bounded by set of (potentially infinite) points
dgs3dRenderPlane(self):=(
  regional(n); // make n visible in callee scopes
  if(self:"drawId"==-1,
    n = self:"coords";
    // TODO? use custom cutoff-region instead of default
    self:"drawId" = surface3d(x*n_1+y*n_2+z*n_3+n_4,plotModifiers->{"n":self:"coords"},alpha->0.75);
  ,
    cglUpdate(self:"drawId",Un->self:"coords");
  );
);

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

// p: vec3|vec4 = (x,y,z)|(x,y,z,w) ; size: real = radius, pinned: bool = fixed position?
cglInterface(point3d,dgs3dNewPoint,(p),(size,pinned));
dgs3dNewPoint(p):=(
  regional(obj);
  obj = dgs3dNewObject("point",[]);
  obj:"coords" = dgs3dPoint4(p);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"sphereSize");
  dgs3dRenderPoint(obj);
  obj:"redraw" = cglLazy(self,dgs3dRenderPoint(self));
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints = append(dgs3dMovablePoints,obj);
  );
  obj
);
// TODO? line3d !collides with line3d in CindyGL3D

// p: vec4 -> (x,y,z,w) 
cglInterface(plane3d,dgs3dNewPlane,(p),());
dgs3dNewPlane(p):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[]);
  obj:"coords" = p;
  dgs3dRenderPlane(obj);
  obj:"redraw" = cglLazy(self,dgs3dRenderPlane(self));
  obj
);

// p1: point, p2: point|line, size:real -> radius
cglInterface(join3d,dgs3dJoin2,(p1,p2),(size));
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

// p1: point, p2: point, size:real -> radius
dgs3dJoin2P(p1,p2):=(
  regional(obj);
  obj = dgs3dNewObject("line",[p1,p2]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(a,b);
    a = (self:"parents"_1):"coords";
    b = (self:"parents"_2):"coords";
    self:"coords" = dgs3dEpsilon44(a,b);
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderLine(self));
  cglEval(obj:"recompute",obj);
  obj
);

// p1: point, l1: line
dgs3dJoinPL(p1,l1):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[p1,l1]);
  obj:"recompute" = cglLazy(self,
    regional(p,l,PQ);
    p = self:"parents"_1;
    l = self:"parents"_2;
    self:"coords" = dgs3dEpsilon46(p:"coords",dgs3dDualLine(l:"coords"));
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderPlane(self));
  cglEval(obj:"recompute",obj);
  obj
);

// p0: vec4 (x,y,z,w), l: line , size: real -> radius, pinned:bool -> fixed position
cglInterface(pointOnLine3d,dgs3dPointOnLine,(p0,l),(size,pinned));
dgs3dPointOnLine(p0,l):=(
  regional(obj);
  obj = dgs3dNewObject("point",[l]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"sphereSize");
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
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderPoint(self));
  cglEval(obj:"recompute",obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints = append(dgs3dMovablePoints,obj);
  );
  obj
);

// p1: point, p2: point, p3: point
cglInterface(join3d,dgs3dJoin3P,(p1,p2,p3),());
dgs3dJoin3P(p1,p2,p3):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[p1,p2,p3]);
  obj:"recompute" = cglLazy(self,  
    self:"coords" = dgs3dEpsilon444(self:"parents"_1:"coords",self:"parents"_2:"coords",self:"parents"_3:"coords");
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderPlane(self));
  cglEval(obj:"recompute",obj);
  obj
);

// p0: vec4 (x,y,z), s: plane , size: real -> radius, pinned:bool -> fixed position
cglInterface(pointOnPlane3d,dgs3dPointOnPlane,(p0,l),(size,pinned));
dgs3dPointOnPlane(p0,s):=(
  regional(obj);
  obj = dgs3dNewObject("point",[s]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"sphereSize");
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
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderPoint(self));
  cglEval(obj:"recompute",obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints = append(dgs3dMovablePoints,obj);
  );
  obj
);

// p1: plane, p2: plane|line, size:real -> radius
cglInterface(meet3d,dgs3dMeet2,(P1,P2),(size));
dgs3dMeet2(a,b):=(
  if(a:"type" == "plane" & b:"type" == "plane",
    dgs3dMeet2P(a,b);
  ,if(a:"type" == "plane" & b:"type" == "line",
    dgs3dMeetPL(a,b);
  ,if(a:"type" == "line" & b:"type" == "plane",
    dgs3dMeetPL(b,a);
  ,if(a:"type" == "line" & b:"type" == "line",
    dgs3dMeet2L(a,b);
  ,
    cglLogWarning("cannot join "+a:"type"+" and "+b:"type");
  ))));
);
// P1: plane, P2: plane, size:real -> radius
dgs3dMeet2P(P1,P2):=(
  regional(obj);
  obj = dgs3dNewObject("line",[P1,P2]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  obj:"recompute" = cglLazy(self,
    regional(A,B);
    A = (self:"parents"_1):"coords";
    B = (self:"parents"_2):"coords";
    self:"coords" = dgs3dDualLine(dgs3dEpsilon44(A,B));
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderLine(self));
  cglEval(obj:"recompute",obj);
  obj
);
// P1: plane, l1: line, size:real -> radius
dgs3dMeetPL(P1,l1):=(
  regional(obj);
  obj = dgs3dNewObject("point",[P1,l1]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,
    regional(p,l);
    p = self:"parents"_1;
    l = self:"parents"_2;
    self:"coords" = dgs3dEpsilon46(p:"coords",l:"coords");
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderPoint(self));
  cglEval(obj:"recompute",obj);
  obj
);
// l1: line, l2: line, size:real -> radius
dgs3dMeet2L(l1,l2):=(
  // TODO line intersection
  // point by two lines, there is no projectively invariant equation
  // on possible equation that seems to work for finite points -> (0,0,0,1)*L1*L2 )  TODO where does this break
  cglLogError("unimplemented");
);
// P1: plane, P2: plane, P3: plane, size:real -> radius
cglInterface(meet3d,dgs3dMeet3P,(P1,P2,P3),(size));
dgs3dMeet3P(P1,P2,P3):=(
  regional(obj);
  obj = dgs3dNewObject("point",[P1,P2,P3]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"recompute" = cglLazy(self,  
    self:"coords" = dgs3dEpsilon444(self:"parents"_1:"coords",self:"parents"_2:"coords",self:"parents"_3:"coords");
    cglEval(self:"redraw",self);
  );
  obj:"redraw" = cglLazy(self,dgs3dRenderPoint(self));
  cglEval(obj:"recompute",obj);
  obj
);

// TODO option to hide intermediate objects

// TODO? euclidean operations
// * parallel plane through point
// * parallel line through point
// * orthogonal line to plane through point
// * orthogonal line to line through point
// * orthogonal plane to line through point
// * line orthogonal to two other lines 
// TODO? transformations
// TODO? add support for quadrics
// ? quadric by 9 points
// ? point on quadric
// * line+quadric
// ? plane+quadric

dgs3dFind(x,y):=(
  regional(root,dir,res,dist);
  root = cglSpacePoint(x,y);
  dir = normalize(cglDirection(x,y));
  res = cglUndefinedVal();
  dist = 1e400; // infinity
  forall(dgs3dMovablePoints,pt,
    bounds = cglGetBounds(pt:"drawId");
    d = cglEvalOrDiscard(cglSphereDepths(root,dir,bounds_"center",bounds_"radius")_1);
    if(!isundefined(d),
      if(d < dist,
        dist = d;
        res = pt;
      )
    );
  );
  res
);