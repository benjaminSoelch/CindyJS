////////////////
// Controls
////////////////
dgs3dModeSelect = false;
// TODO: different modes:
//  -> view only
//  -> move points
//  -> select object
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
    if(isUndefined(dgs3dMouseState:"target") % dgs3dModeSelect,
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
  forall(dgs3dPoints,p,p:"redraw".(p));
  forall(dgs3dLines,l,l:"redraw".(l));
  forall(dgs3dPlanes,p,p:"redraw".(p));
  forall(dgs3dCircles,q,q:"redraw".(q));
  forall(dgs3dQuadrics,q,q:"redraw".(q));
);
dgs3dUpdateCutoff();
dgs3d = {};
dgs3d.doTracing = false;

// TODO make focus color customizable, ? set color depending on color of point
dgs3dFocusColor = cglColor("green");
dgs3dMovementAxes(point):=(
  regional(normal,l);
  if(length(point:"parents")>0,
    if(length(point:"parents")==1,
      l = point:"parents"_1;
      if(l:"type" == "line",
        {"type":"parallel","v":dgs3dLineDirection(l:"coords")}
      ,if(l:"type" == "plane",
        {"type":"normal","n":(l:"coords")_(1..3)}
      ,if(l:"type" == "quadric",
        {"type":"normal","n":((l:"coords"*point:"coords")_(1..3))}
      ,if(l:"type" == "conic",
        // movement orthogonal to plane is removed by projection
        {"type":"normal","n":(((l:"coords"_1)*point:"coords")_(1..3))}
      ,if(l:"type" == "biquadric",
        regional(p,q);
        p = point:"coords"*l:"coords"_1;
        q = point:"coords"*l:"coords"_2;
        {"type":"parallel","v":cross(p_(1..3),q_(1..3))}
      ,
        cglLogError("unimplemented: moving point depending on "+(l:"type"));
      )))));
    ,
      cglLogError("unimplemented: restricted movement");
    )
  ,
    // move free points parallel to view-plane
    normal = cgl3d.spaceTransform*(0,0,1,0);
    {"type":"normal","n":normal_(1..3)}
  );
);
// TODO? limit maximum movement distance (moving along nearly orthogonal plane leads to points getting lost)
dgs3dPreFrame():=(
    regional(mx,my,dx,dy,target,newCoords,oldTarget,axes,oldSpacePos,newSpacePos,center,movePlaneOffset,movePlaneNormal,d2,oldDirection,newDirection,oldT,newT,oldPos,newPos,truePos,oldRadius,updateQueue);
    mx = mouse().x;
    my = mouse().y;
    oldTarget = dgs3dMouseState:"oldTarget";
    if(dgs3dMouseState:"dragging",
      target = oldTarget;
      axes = dgs3dMovementAxes(target);
      oldSpacePos = cglSpacePoint(dgs3dMouseState:"sx",dgs3dMouseState:"sy");
      newSpacePos = cglSpacePoint(mx,my);
      // view direction for given screen pixel
      oldDirection = cglDirection(dgs3dMouseState:"sx",dgs3dMouseState:"sy");
      newDirection = cglDirection(mx,my);
      if(axes:"type" == "normal",
        // compute intersections with movement plane for old and new view-ray
        movePlaneNormal = axes:"n";
        center = target:"coords"_(1..3)/target:"coords"_4;
        movePlaneOffset = movePlaneNormal * center;
        oldT = (movePlaneOffset - movePlaneNormal * oldSpacePos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * newSpacePos) / (movePlaneNormal * newDirection);
        oldPos = oldSpacePos + oldT*oldDirection;
        newPos = newSpacePos + newT*newDirection;
        // keep movement relative to click position (instead of center)
        truePos = center;
        newPos = newPos+(truePos-oldPos);
        // update position
        newCoords = (newPos_1,newPos_2,newPos_3,1);
      ,if(axes:"type" == "parallel",
        // move point in plane spanned by axis and line normal to axis
        d2 = cross(axes:"v",(cgl3d.spaceTransform*(0,0,1,0))_(1..3));
        movePlaneNormal = cross(axes:"v",d2);
        center = target:"coords"_(1..3)/target:"coords"_4;
        movePlaneOffset = movePlaneNormal * center;
        oldT = (movePlaneOffset - movePlaneNormal * oldSpacePos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * newSpacePos) / (movePlaneNormal * newDirection);
        oldPos = oldSpacePos + oldT*oldDirection;
        newPos = newSpacePos + newT*newDirection;
        // remove movement component orthogonal to axis
        newPos = newPos - ((newPos-oldPos)*d2)/(d2*d2) * d2;
        // keep movement relative to click position (instead of center)
        truePos = center;
        newPos = newPos+(truePos-oldPos);
        newCoords = (newPos_1,newPos_2,newPos_3,1);
      ,
        cglLogError("unimplemented: "+axes:"type"+" movement direction");
      ));
      dgs3dTracePoint(target,newCoords);
      dgs3dRedrawChildren(target);
    ,if(dgs3dMouseState:"rotating",
      dx = 2 * (mx - dgs3dMouseState:"sx"); dy = 2 * (my - dgs3dMouseState:"sy");
      rotate3d(dx,dy);
    ,
      if(dgs3dModeSelect,
        target = dgs3dFind(mx,my);
      ,
        target = dgs3dFindMovable(mx,my);
        
      );
      if(target!=oldTarget,
        if(!isUndefined(oldTarget),
          cgl3dObjectSetModifier(cgl3d.getObjects.(oldTarget:"drawId"),"cglColor",oldTarget:"color");
        );
        if(!isUndefined(target),
          cgl3dObjectSetModifier(cgl3d.getObjects.(target:"drawId"),"cglColor",dgs3dFocusColor);
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
dgs3dTryRecomputeChildren(obj):=(
  regional(retry);
  obj = dgs3dObjById(obj);
  if(obj:"recompute".(obj) != DGS3DmOVEoK,
    obj.resetChildren = false;
    true
  ,
    retry = false;
    // try recalculating direct children
    forall(obj:"children",child,
      child = dgs3dObjById(child);
      child:"oldCoords" = child:"coords";
      retry = retry % dgs3dTryRecomputeChildren(child);
    );
    // TODO? avoid duplicate work:
    // * if tracing subtree was successful ignore that subtree for subsequent recalculations
    // ?? remember coordinates at end-position when computing intermediate step(s)
    obj.resetChildren = true;
    retry
  )
);
dgs3dResetChildren(obj):=(
  obj = dgs3dObjById(obj);
  if(obj.resetChildren,
    forall(obj:"children",child,
      child:"coords" = child:"oldCoords";
      dgs3dResetChildren(child);
    );
  )
);
dgs3dRedrawChildren(obj):=(
  obj = dgs3dObjById(obj);
  obj:"redraw".(obj);
  forall(obj:"children",child,
    dgs3dRedrawChildren(child);
  );
);
DGS3DmAXlEVEL = 16;
dgs3dTracePoint(p,newCoords):=(
  dgs3dTracePointRec(p,newCoords,0,(0,0,0,0))
);
dgs3dTracePointRec(p,newCoords,level,prevV):=(
  regional(nextPos,mid,d,v,step,dir);
  nextPos = newCoords;
  p:"oldCoords" = p:"coords";
  p:"coords" = nextPos;
  if(dgs3dTryRecomputeChildren(p) & dgs3d.doTracing,
    dgs3dResetChildren(p);
    // TODO: find good detour path if direct movement fails
    step = 1;
    mid = newCoords;
    while(
      mid = (step*p:"oldCoords" + newCoords)/(step+1);
      step = step+1;
      // offset midpoint by v in CP^3 with d(v,M) < d(P_old,P_new)/2
      d = sqrt(dgs3dProjDistanceSq(p:"oldCoords",mid));
      v = (random()+i*random(),random()+i*random(),random()+i*random(),1);
      dir = normalize(newCoords-step*p:"oldCoords");
      v = v - (dir*v)*dir;
      v = normalize(v+0.5*prevV);
      p:"coords" = mid + random()*d*v;
      if(step > DGS3DmAXlEVEL,level = DGS3DmAXlEVEL;);
      dgs3dTryRecomputeChildren(p) & step < DGS3DmAXlEVEL
    ,dgs3dResetChildren(p));
    // move relative to new-position
    if(level<DGS3DmAXlEVEL,
      dgs3dTracePointRec(p,newCoords,level+1,v);
    ,
      // TODO: pick "best-possible" choice when tracing does not succeed
      cglLogError("tracing failed");
      p:"coords" = p:"oldCoords";
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
dgs3dLineFromMatrix(M):=(
  (M_1_2,M_1_3,M_1_4,M_2_3,M_2_4,M_3_4)
);
dgs3dLineFromDualMatrix(M):=(
  (M_3_4,-M_2_4,M_2_3,M_1_4,-M_1_3,M_1_2)
);
// l: line => v: vec3 euclidean direction vector of line l
dgs3dLineDirection(l):=(
  dgs3dEpsilon46((0,0,0,1),l)_(1..3);
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
// TODO? swap quadric and line parameters
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
  (dgs3dRP3Normalize(r),dgs3dRP3Normalize(c));
);
dgs3dRP3Normalize(p):=(
  regional(m,v);
  m = -1;
  forall(p,
    if(isList(#),
      forall(#,
        if(|#|>m,
          m = |#|;
          v = #;
        )
      );
    ,if(|#|>m,
      m = |#|;
      v = #;
    ))
  );
  if(v!=0,p = p/v);
);
// adjoint of 4x4 matrix
adjoint4(M):=( // in CindyJS there does not seem to be a adjoint built-in ...
  // TODO? precompute equation
  apply(1..4,i,apply(1..4,j,
    det(apply(M_(remove(1..4,j)),#_(remove(1..4,i))))*(-1)^(i+j)
  ));
);
// adjoint of 3x3 matrix
adjoint3(M):=(
  [
    [(M_2_2*M_3_3-M_3_2*M_2_3), -(M_2_1*M_3_3-M_3_1*M_2_3), (M_2_1*M_3_2-M_3_1*M_2_2)],
    [-(M_1_2*M_3_3-M_3_2*M_1_3), (M_1_1*M_3_3-M_3_1*M_1_3), -(M_1_1*M_3_2-M_3_1*M_1_2)],
    [(M_1_2*M_2_3-M_2_2*M_1_3), -(M_1_1*M_2_3-M_2_1*M_1_3), (M_1_1*M_2_2-M_2_1*M_1_2)]
  ]
);
// squared coordinates
dgs3dSqCoords(p):=(
  (p_1*p_1,p_1*p_2,p_1*p_3,p_1*p_4,p_2*p_2,p_2*p_3,p_2*p_4,p_3*p_3,p_3*p_4,p_4*p_4);
);

////////////////
// 2D Geometry
////////////////
// TODO? reuse code from 2D-geometry engine
// TODO: check if code works correctly
dgs3dDecompose2DConic(A):=(
  regional(B,i,beta,P,C);
  // 1. find anti-symmetric matrix D s.t. A+D has rank 1
  B = adjoint3(A);
  i = if(|B_1_1|>=|B_2_2| & |B_1_1|>=|B_3_3|, 1, if(|B_2_2|>=|B_1_1| & |B_2_2|>=|B_3_3|,2, 3));
  if(re(B_i_i)<0,
    B = -B;
  );
  beta = sqrt(B_i_i);
  P = B_i/beta;
  C = A + ((0,P_3,-P_2),(-P_3,0,P_1),(P_2,-P_1,0));
  dgs3dSplit2DRank1Conic(C);
);
dgs3dSplit2DRank1Conic(C):=(
  regional(l1,l2,m);
  m = -1;
  forall(1..3,i,
    forall(1..3,j,
      if(|C_i_j| > m,
        m = |C_i_j|;
        l1 = C_i;
        l2 = (C_1_j,C_2_j,C_3_j);
      );
    )
  );
  (l1,l2)
);
dgs3dIntersect2DConicLine(A,l):=(
  regional(M,B,alpha,C,m,l1,l2);
  M = ((0,l_3,-l_2),(-l_3,0,l_1),(l_2,-l_1,0));
  B = -M*A*M;
  // FIXME: handle case l_3 != 0
  alpha = sqrt(B_1_2*B_2_1-B_1_1*B_2_2)/l_3;
  C = B + alpha*M;
  dgs3dSplit2DRank1Conic(C);
);
dgs3dIntersect2DConic(A,B):=(
  regional(lambda,C,l12,p12,p34);
  // 1. find degenerate matrix in pencil
  lambda = sort(roots((
    det(A),
    -A_2_3*A_3_2*B_1_1+A_2_2*A_3_3*B_1_1+A_2_3*A_3_1*B_1_2-A_2_1*A_3_3*B_1_2
    -A_2_2*A_3_1*B_1_3+A_2_1*A_3_2*B_1_3+A_1_3*A_3_2*B_2_1-A_1_2*A_3_3*B_2_1
    -A_1_3*A_3_1*B_2_2+A_1_1*A_3_3*B_2_2+A_1_2*A_3_1*B_2_3-A_1_1*A_3_2*B_2_3
    -A_1_3*A_2_2*B_3_1+A_1_2*A_2_3*B_3_1+A_1_3*A_2_1*B_3_2-A_1_1*A_2_3*B_3_2
    -A_1_2*A_2_1*B_3_3+A_1_1*A_2_2*B_3_3,
    -A_3_3*B_1_2*B_2_1+A_3_2*B_1_3*B_2_1+A_3_3*B_1_1*B_2_2-A_3_1*B_1_3*B_2_2
    -A_3_2*B_1_1*B_2_3+A_3_1*B_1_2*B_2_3+A_2_3*B_1_2*B_3_1-A_2_2*B_1_3*B_3_1
    -A_1_3*B_2_2*B_3_1+A_1_2*B_2_3*B_3_1-A_2_3*B_1_1*B_3_2+A_2_1*B_1_3*B_3_2
    +A_1_3*B_2_1*B_3_2-A_1_1*B_2_3*B_3_2+A_2_2*B_1_1*B_3_3-A_2_1*B_1_2*B_3_3
    -A_1_2*B_2_1*B_3_3+A_1_1*B_2_2*B_3_3,
    det(B)
  )),(!isReal(#),|#|))_1; // prefer real roots with small magnitude
  C = A+lambda*B;
  // 3. decompose into lines
  l12 = dgs3dDecompose2DConic(C);
  // 4. compute intersections with lines
  if(|lambda|>=1,
    p12 = dgs3dIntersect2DConicLine(A,l12_1);
    p34 = dgs3dIntersect2DConicLine(A,l12_2);
  ,
    p12 = dgs3dIntersect2DConicLine(B,l12_1);
    p34 = dgs3dIntersect2DConicLine(B,l12_2);
  );
  (p12_1,p12_2,p34_1,p34_2)
);

// TODO decouple math and UI:
//  -> extract underlying computation for geometry operations to functions acting on coordinates

////////////////
// Objects + Rendering
////////////////

// all objects
dgs3dObjects = {};
// objects separated by type
dgs3dPoints = {};
dgs3dLines = {};
dgs3dPlanes = {};
dgs3dCircles = {};
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

dgs3dReset():=(
  // TODO: reset drawn objects
  dgs3dObjects = {};
  // objects separated by type
  dgs3dPoints = {};
  dgs3dLines = {};
  dgs3dPlanes = {};
  dgs3dCircles = {};
  dgs3dQuadrics = {};
  // special objects
  dgs3dMovablePoints = {};
);

// patch for removing json element (assigning nada recreates entry if element was not present)
jsonRemove(dir,key):=(
  regional(nada);
  if(!isUndefined(dir:key),
    dir:key = nada;
  )
);

dgs3dDelete(obj):=(
  obj = dgs3dObjById(obj);
  if(isUndefined(obj:"deleted"),
    jsonRemove(dgs3dObjects,obj:"id");
    jsonRemove(dgs3dPoints,obj:"id");
    jsonRemove(dgs3dLines,obj:"id");
    jsonRemove(dgs3dPlanes,obj:"id");
    jsonRemove(dgs3dQuadrics,obj:"id");
    jsonRemove(dgs3dCircles,obj:"id");
    jsonRemove(dgs3dMovablePoints,obj:"id");
    cglDelete(obj:"drawId");
    forall(obj:"parents",p,
      p:"children" = remove(apply(p:"children",child,if(child:"id"==obj:"id",-1,child)),-1);
    );
    forall(obj:"children",
      dgs3dDelete(#)
    );
    obj:"deleted" = true;
  )
);

// store/load -> convert internal object tree to/from simple list
// TODO? undo/redo functionality
// convert to list of simple (non self-containing) objects
dgs3dStore():=(
  visited = {};
  res = [];
  forall(dgs3dObjects,
    res = res ++ dgs3dStoreRec(#,visited);
  );
  res
);
dgs3dStoreRec(obj,visited):=(
  regional(res,id);
  obj = apply(obj,#); // local copy
  id = dgs3dIdForObj(obj);
  if(isUndefined(visited:id),
    visited:id = true;
    res = [];
    obj:"parents" = apply(obj:"parents",parent,
      id = dgs3dIdForObj(parent);
      res = res ++ dgs3dStoreRec(dgs3dObjById(parent),visited);
      id
    );
    obj:"children" = apply(obj:"children",child,
      id = dgs3dIdForObj(child);
      res = res ++ dgs3dStoreRec(dgs3dObjById(child),visited);
      id
    );
    res = res ++ [obj];
  ,
    []
  )
);
// restore object tree from list returned by store
dgs3dLoad(values):=(
  dgs3dReset();
  // 1. load objects
  forall(values,v,
    dgs3dObjects.(v:"id") = apply(v,#);
  );
  // TODO restore drawn objects
  forall(dgs3dObjects,obj,
    obj:"parents" = apply(obj:"parents",dgs3dObjById(#));
    obj:"children" = apply(obj:"children",dgs3dObjById(#));
    if(obj:"type" == "point",
      dgs3dPoints:(obj:"id") = obj;
      if(obj:"movable",
        dgs3dMovablePoints:(obj:"id") = obj;
      )
    ,if(obj:"type" == "line",
      dgs3dLines:(obj:"id") = obj;
    ,if(obj:"type" == "plane",
      dgs3dPlanes:(obj:"id") = obj;
    ,if(obj:"type" == "quadric",
      dgs3dQuadrics:(obj:"id") = obj;
    ))));
  );
);

// obj3d = {type: string, id: string, coords: [number], visible: bool, size: real, color: vec3, alpha: real}

// TODO? add additional fields
// + name: string -> unique identifier for object
// +  algorithm: string -> identifier for algorithm used to construct object
//    TODO? support running algorithm by name
//      * dgs3dCreate(algorithm:"string",args:[obj3d])
// + defined incidences / deduced incidences

// TODO: normalize coordinates of objects to avoid divergence of values
//   ? which norm is best for this case? (L1,L2,Linf)

// type: string, parents: [obj3d] -> obj3d
dgs3dNewObject(type,parents,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj,objId);
  objId = dgs3dNewId();
  obj = {
    "type":type, "id": objId, "drawId": -1,
    "parents": parents, "children": [],
    "visible": cglValOrDefault(visible,true),
    "recompute": lambda(self,DGS3DmOVEoK), "redraw": lambda(self,)
  };
  dgs3dObjects:objId = obj;
  if(type == "point",
    dgs3dPoints:objId = obj;
    obj:"color" = cglColor(cglValOrDefault(color,"red"));
    obj:"alpha" = cglValOrDefault(alpha,1);
    obj:"redraw" = lambda(self,dgs3dRenderPoint(self));
  ,if(type == "line",
    dgs3dLines:objId = obj;
    obj:"color" = cglColor(cglValOrDefault(color,"black"));
    obj:"alpha" = cglValOrDefault(alpha,1);
    obj:"redraw" = lambda(self,dgs3dRenderLine(self));
  ,if(type == "plane",
    dgs3dPlanes:objId = obj;
    obj:"color" = cglColor(cglValOrDefault(color,"cyan"));
    obj:"alpha" = cglValOrDefault(alpha,0.67);
    obj:"redraw" = lambda(self,dgs3dRenderPlane(self));
  ,if(type == "quadric",
    dgs3dQuadrics:objId = obj;
    obj:"color" = cglColor(cglValOrDefault(color,(0.5,0,1)));
    obj:"alpha" = cglValOrDefault(alpha,0.67);
    obj:"redraw" = lambda(self,dgs3dRenderQuadric(self));
  ,if(type == "conic", // TODO? should conics and bi-quadrics be stored with quadrics?
    dgs3dQuadrics:objId = obj;
    obj:"color" = cglColor(cglValOrDefault(color,(0.25,1,0)));
    obj:"alpha" = cglValOrDefault(alpha,1);
    obj:"redraw" = lambda(self,dgs3dRenderConic(self));
  ,if(type == "biquadric",
    dgs3dQuadrics:objId = obj;
    obj:"color" = cglColor(cglValOrDefault(color,(0.25,1,0)));
    obj:"alpha" = cglValOrDefault(alpha,1);
    obj:"redraw" = lambda(self,dgs3dRenderBiQuadric(self));
  ,if(type == "set",
    // nothing to do
  ,if(type == "transform" % type == "mobiusTrafo",
    // TODO? store all-transforms in JSON
  ,if(type == "surface",
    // ? store surfaces in JSON
    obj:"color" = cglColor(cglValOrDefault(color,(1,0.25,0)));
    obj:"alpha" = cglValOrDefault(alpha,0.5);
    obj:"redraw" = lambda(self,dgs3dRenderSurface(self));
  ,
    cglLogWarning("unknown object type: "+type);
  )))))))));
  forall(parents,parent,
    if(isJSON(parent),
      parent:"children" = append(parent:"children",obj);
    );
  );
  obj;
);
dgs3dNewPoint(parents,recompute,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("point",parents,visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewLine(parents,recompute,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("line",parents,visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"cylinderSize");
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewConic(parents,recompute,size->cglNada,visible->true,color->cglNada,alpha->cglNada,isCircle->false):=(
  regional(obj);
  obj = dgs3dNewObject("conic",parents,visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"cylinderSize");
  obj:"isCircle" = isCircle;
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewBiQuadric(parents,recompute,size->cglNada,visible->true,color->cglNada,alpha->cglNada,isCircle->false):=(
  regional(obj);
  obj = dgs3dNewObject("biquadric",parents,visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"cylinderSize");
  obj:"isCircle" = isCircle;
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewPlane(parents,recompute,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("plane",parents,visible->visible,color->color,alpha->alpha);
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewQuadric(parents,recompute,visible->true,color->cglNada,alpha->cglNada,isSphere->false):=(
  regional(obj);
  obj = dgs3dNewObject("quadric",parents,visible->visible,color->color,alpha->alpha);
  obj:"isSphere" = isSphere;
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewTrafo(parents,recompute):=(
  regional(obj);
  obj = dgs3dNewObject("transform",parents);
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewMobiusTrafo(parents,recompute):=(
  regional(obj);
  obj = dgs3dNewObject("mobiusTrafo",parents);
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewSurface(parents,recompute,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("surface",parents,visible->visible,color->color,alpha->alpha);
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  obj
);
dgs3dNewPointSet(parents,childCount,recompute,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("set",parents,visible->visible,color->color,alpha->alpha);
  obj:"children" = apply(1..childCount,
    regional(child);
    child = dgs3dNewObject("point",[obj],visible->visible,color->color,alpha->alpha);
    child.size = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
    child
  );
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  forall(obj:"children",child,
    child:"redraw".(child);
  );
  obj
);
dgs3dNewLinePair(parents,recompute,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("set",parents,visible->visible,color->color,alpha->alpha);
  obj:"children" = apply(1..2,
    regional(child);
    child = dgs3dNewObject("line",[obj],visible->visible,color->color,alpha->alpha);
    child.size = cglValOrDefault(size,cgl3d.defaults:"cylinderSize");
    child
  );
  obj:"recompute" = recompute;
  obj:"recompute".(obj);
  forall(obj:"children",child,
    child:"redraw".(child);
  );
  obj
);
// TODO? newPointOn 
// ? how to handle free-objects

// TODO? better name
dgs3dUpdateColor(obj,visible->cglNada,color->cglNada,alpha->cglNada):=(
  obj:"color" = cglColor(cglValOrDefault(color,obj:"color"));
  obj:"alpha" = cglValOrDefault(alpha,obj:"alpha");
  obj:"visible" = cglValOrDefault(alpha,obj:"visible");
  obj:"redraw".(obj);
);

// TODO do not render objects with complex coordinates
// TODO? only render points within drawing region
// TODO: only update bounds when object changed
dgs3dRenderPoint(self):=(
  regional(p,ptColor);
  p = self:"coords";
  if(self:"visible" == true & min(apply(p,isReal(#))) & p_4 != 0, // treat undefined as falsy
    ptColor = if(self == dgs3dMouseState:"target",dgs3dFocusColor,self:"color");
    if(self:"drawId"==-1,
      self:"drawId" = draw3d(p_(1..3)/p_4,size->self:"size",color->ptColor,alpha->self:"alpha");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["cglColor","cglAlpha"],[ptColor,self:"alpha"]);
      cgl3dObjectSet(cgl3d.getObjects.(self:"drawId"),"center",p_(1..3)/p_4);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
    cgl3d.setVisible.(self:"drawId",false);
  ));
);
// TODO? line segments: use definition-points instead of sphere intersections if they are closer to center of clipping sphere
dgs3dRenderLine(self):=(
  regional(PQ,P,Q);
  if(self:"visible" == true, // treat undefined as falsy
    // compute intersections of line with clipping sphere
    PQ = dgs3dIntersectLineQuadric(dgs3dDualLine(self:"coords"),((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,-dgs3dCutoffRadius*dgs3dCutoffRadius)));
    if(min(apply(PQ_1,isReal(#))),// real solution
      if(self:"drawId"==-1,
        self:"drawId" = draw3d((PQ_1_(1..3))/PQ_1_4,(PQ_2_(1..3))/PQ_2_4,size->self:"size",color->self:"color",alpha->self:"alpha")
      ,
        cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["cglColor","cglAlpha"],[self:"color",self:"alpha"]);
        P = (PQ_1_(1..3))/PQ_1_4;
        Q = (PQ_2_(1..3))/PQ_2_4;
        cgl3dObjectSet(cgl3d.getObjects.(self:"drawId"),"center",(P+Q)/2);
        cgl3dObjectSet(cgl3d.getObjects.(self:"drawId"),"orientation",(Q-P)/2);
        cgl3d.setVisible.(self:"drawId",true);
      );
    ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
    ));
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
// TODO? polygons: render only region bounded by set of (potentially infinite) points
dgs3dRenderPlane(self):=(
  regional(n); // make n visible in callee scopes
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
      n = self:"coords";
      // TODO? use custom cutoff-region instead of default
      self:"drawId" = surface3d((x,y,z,1)*n,plotModifiers->{"n":self:"coords"},color->self:"color",alpha->self:"alpha");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["n","cglColor","cglAlpha"],[self:"coords",self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
dgs3dRenderCircle(self):=(
  regional(p,ptColor);
  [c,n,r] = self:"coords";
  if(self:"visible" == true & min(apply(c,isReal(#))), // treat undefined as falsy
    if(self:"drawId"==-1,
      self:"drawId" = torus3d(c,n,r,color->ptColor,alpha->self:"alpha",size->self:"size");
    ,
      //cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["cglColor","cglAlpha"],[ptColor,self:"alpha"]);
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),"cglRadii",[r,self:"size"]);
      cgl3dObjectSet(cgl3d.getObjects.(self:"drawId"),["center","orientation","radius"],[c,n,r+self:"size"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
    cgl3d.setVisible.(self:"drawId",false);
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
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["M","cglColor","cglAlpha"],[self:"coords",self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
dgs3dRenderConic(self):=(
  regional(M); // make M visible in callee scopes
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
      M = self:"coords";
      // TODO? use custom cutoff-region instead of default
      self:"drawId" = surface3d(dgs3dDistanceQuadricPlane(Q,p,(x,y,z,1))-r*r,degree->8,
        plotModifiers->{"Q":self:"coords"_1,"p":self:"coords"_2,"r":self:"size"},
        alpha->self:"alpha",color->self:"color");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["Q","p","r","cglColor","cglAlpha"],[self:"coords"_1,self:"coords"_2,self:"size",self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
dgs3dRenderBiQuadric(self):=(
  regional(M); // make M visible in callee scopes
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
      M = self:"coords";
      // TODO? use custom cutoff-region instead of default
      self:"drawId" = surface3d(dgs3dDistanceQuadricQuadric(Q1,Q2,(x,y,z,1))-(r*r),degree->8,
        plotModifiers->{"Q1":self:"coords"_1,"Q2":self:"coords"_2,"r":self:"size"},
        alpha->self:"alpha",color->self:"color");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["Q1","Q2","r","cglColor","cglAlpha"],
        [self:"coords"_1,self:"coords"_2,self:"size",self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
dgs3dRenderSurface(self):=(
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
      // TODO? use custom cutoff-region instead of default
      self:"drawId" = surface3d(f.((x,y,z),data),degree->8,
        plotModifiers->{"f":self:"coords"_1,"data":self:"coords"_2},
        alpha->self:"alpha",color->self:"color");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["f","data","cglColor","cglAlpha"],
        [self:"coords"_1,self:"coords"_2,self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);

////////////////
// Projective Primitives
////////////////

// p: vec3 | vec4 => vec4
dgs3dPoint4(p):=(
  if(length(p)==4,
    p_(1..4)
  ,if(length(p)==3,
    (p_1,p_2,p_3,1)
  ,
    p = dgs3dObjById(p);
    if(p:"type"=="point",
      p:"coords"
    ,
      cglLogError("point should have length 3 or 4");
      (0,0,0,1)
    )
  ));
);

// p: vec3|vec4 = (x,y,z)|(x,y,z,w) ; size: real = radius, pinned: bool = fixed position?, visible: bool = should object be drawn
point3d(p,
  size->cgl3d.defaults:"sphereSize",pinned->false,visible->true,
  color->cglNada,alpha->cglNada
):=(
  dgs3dFreePoint(p,size->size,pinned->pinned,visible->visible,color->color,alpha->alpha)
);
dgs3dFreePoint(p,
  size->cgl3d.defaults:"sphereSize",pinned->false,visible->true,
  color->cglNada,alpha->cglNada
):=(
  regional(obj);
  obj = dgs3dNewObject("point",[],visible->visible,color->color,alpha->alpha);
  obj:"coords" = dgs3dPoint4(p);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  dgs3dRenderPoint(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
randomPoint3d(size->cgl3d.defaults:"sphereSize",pinned->false,visible->true,color->cglNada,alpha->cglNada):=(
  point3d((randomNormal(),randomNormal(),randomNormal()),size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
);

// p: vec6 = (l11,l12,l13,l14,l23,l24,l34) , visible: bool = should object be drawn
line3d(l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dFreePlane(l,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dFreeLine(l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("line",[],visible->visible,color->color,alpha->alpha);
  obj:"coords" = l;
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"cylinderSize");
  dgs3dRenderLine(obj);
  obj
);

// p: vec4 = (x,y,z,w) , visible: bool = should object be drawn
plane3d(p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dFreePlane(p,visible->visible,color->color,alpha->alpha);
);
dgs3dFreePlane(p,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("plane",[],visible->visible,color->color,alpha->alpha);
  obj:"coords" = p;
  dgs3dRenderPlane(obj);
  obj
);
// p: mat4, visible: bool = should object be drawn
quadric3d(M,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dFreeQuadric(M,visible->visible,color->color,alpha->alpha);
);
dgs3dFreeQuadric(M,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("quadric",[],visible->visible,color->color,alpha->alpha);
  obj:"coords" = M;
  dgs3dRenderQuadric(obj);
  obj
);

randomQuadric3d(visible->true,color->cglNada,alpha->cglNada):=(
  quadric3d(apply(1..4,apply(1..4,randomNormal(),randomNormal(),randomNormal())),
    visible->visible,color->color,alpha->alpha
  );
);
randomQuadricBy9P(size->cglNade,visible->true,color->cglNada,alpha->cglNada):=(
  pts = apply(1..9,randomPoint3d(size->size,visible->visible,color->color,alpha->alpha));
  quadricBy9P(pts);
);

// p1: point, p2: point|line, size:real = radius, visible: bool = should object be drawn
join3d(a,b,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dJoin2(a,b,size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dJoin2(a,b,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(a:"type" == "point" & b:"type" == "point",
    dgs3dJoin2P(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "point" & b:"type" == "line",
    dgs3dJoinPL(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "point",
    dgs3dJoinPL(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "line",
    dgs3dJoin2L(b,a,visible->visible,color->color,alpha->alpha);
  ,
    cglLogWarning("cannot join "+a:"type"+" and "+b:"type");
  ))));
);

// p1: point, p2: point, size:real = radius, visible: bool = should object be drawn
dgs3dJoin2P(p1,p2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([p1,p2],lambda(self,
    regional(a,b);
    a = (self:"parents"_1):"coords";
    b = (self:"parents"_2):"coords";
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon44(a,b));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha)
);

// p1: point, l1: line, visible: bool = should object be drawn
dgs3dJoinPL(p1,l1,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([p1,l1],lambda(self,
    regional(p,l,PQ);
    p = self:"parents"_1;
    l = self:"parents"_2;
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon46(p:"coords",dgs3dDualLine(l:"coords")));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha)
);

// p1: point, p2: point, p3: point  or  p1: line, p2: line, p3: line, visible: bool = should object be drawn
join3d(a,b,c,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dJoin3(a,b,c,visible->visible,color->color,alpha->alpha);
);
dgs3dJoin3(a,b,c,visible->true,color->cglNada,alpha->cglNada):=(
  if(a:"type" == "point" & b:"type" == "point" & c:"type" == "point",
    dgs3dJoin3P(a,b,c,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "line" & c:"type" == "line",
    dgs3dJoin3L(a,b,c,visible->visible,color->color,alpha->alpha);
  ,
    cglLogWarning("cannot join "+a:"type"+", "+b:"type"+" and "+c:"type");
  ));
);
// p1: point, p2: point, p3: point, visible: bool = should object be drawn
dgs3dJoin3P(p1,p2,p3,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([p1,p2,p3],lambda(self,
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon444(self:"parents"_1:"coords",self:"parents"_2:"coords",self:"parents"_3:"coords"));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha)
);
// l1: point, l2: point, l3: point, visible: bool = should object be drawn
dgs3dJoin3L(l1,l2,l3,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric([l1,l2,l3],lambda(self,
    regional(M,l1,l2,l3);
    l1 = self:"parents"_1:"coords";
    l2 = self:"parents"_2:"coords";
    l3 = self:"parents"_3:"coords";
    M = dgs3dLineMatrix(l1)*dgs3dLineMatrix(dgs3dDualLine(l2))*dgs3dLineMatrix(l3);
    self:"coords" = dgs3dRP3Normalize(M + transpose(M));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha)
);

// p0: vec4 (x,y,z,w), l: line , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnLine3d(l,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnLine(l,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnLine(l,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("point",[l],visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = lambda(self,
    regional(p,l,K);
    // project old-position onto line
    p = self:"coords";
    l = dgs3dLineMatrix(self:"parents"_1:"coords");
    K = transpose(kernel(l));
    // project P into K
    p = sum(K,v,(p*v)*v); // kernel always returns orthogonal vectors
    self:"coords" = dgs3dRP3Normalize(p);
    DGS3DmOVEoK
  );
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
pointOnLine3d(l,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnLine(l,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnLine(l,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnLine(l,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
// p0: vec3|vec4 = (x,y,z,w=1), s: plane , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnPlane3d(s,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnPlane(s,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnPlane(s,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("point",[s],visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = lambda(self,
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
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
pointOnPlane3d(s,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnPlane(s,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnPlane(s,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnPlane(s,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
// p0: vec3|vec4 = (x,y,z,w=1), q: quadric , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnQuadric3d(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnQuadric(q,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnQuadric(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("point",[q],visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = lambda(self,
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
      self:"coords" = dgs3dRP3Normalize(AB_1);
      ab > a
    ,
      self:"coords" = dgs3dRP3Normalize(AB_2);
      ab > b
    ),
      DGS3DmOVEoK
    ,
      DGS3DmOVErETRY
    );
  );
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
pointOnQuadric3d(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnQuadric(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnQuadric(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnQuadric(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
// p0: vec3|vec4 = (x,y,z,w=1), q: conic , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnConic3d(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnConic(q,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnConic(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("point",[q],visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = lambda(self,
    regional(P,P3,Qp,Q,p,np,nq);
    P = self:"coords";
    Qp = (self:"parents"_1):"coords";
    Q = Qp_1;
    p = Qp_2;
    // 1. project point into plane
    P3 = P_(1..3)/P_4;
    np = p_(1..3);
    P3 = P3 - np*(p_4+P3*np)/(np*np);
    P = (P3_1,P3_2,P3_3,1);
    P = dgs3dRP3Normalize(P);
    // 2. get line in plane through point normal to surface
    nq = (Q * P)_(1..3);
    nq = nq - ((np*nq)/(np*np)) * np; // project normal into plane
    l = dgs3dEpsilon44(P,P+(nq_1,nq_2,nq_3,0));
    // 2. intersect line with quadric
    AB = dgs3dIntersectLineQuadric(dgs3dDualLine(l),Q);
    // TODO better tracing
    //  point gets unstable when normal plane is close to orthogonal to view direction
    //  point gets unstable when quadric close to orthogonal to plane
    // 3. choose intersection closer to current pos
    a = (P-AB_1)*(P-AB_1);
    b = (P-AB_2)*(P-AB_2);
    ab = (AB_1-AB_2)*(AB_1-AB_2);
    print((P,AB));
    // assignment inside branches to avoid assigning value when comparison is undefined
    if(if(a<=b,
      self:"coords" = dgs3dRP3Normalize(AB_1);
      ab > a
    ,
      self:"coords" = dgs3dRP3Normalize(AB_2);
      ab > b
    ),
      DGS3DmOVEoK
    ,
      DGS3DmOVErETRY
    );
  );
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
pointOnConic3d(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  // TODO? can this result in an infinite projected point
  dgs3dPointOnConic(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnConic(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnConic(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
// p0: vec3|vec4 = (x,y,z,w=1), q: bi-quadric-curve , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnBiQuadric3d(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnBiQuadric(q,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnBiQuadric(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  regional(obj);
  obj = dgs3dNewObject("point",[q],visible->visible,color->color,alpha->alpha);
  obj:"size" = cglValOrDefault(size,cgl3d.defaults:"sphereSize");
  obj:"coords" = dgs3dPoint4(p0);
  obj:"recompute" = lambda(self,
    regional(P,QR,Q,R,p,q,r,n,ABCD,dsts);
    P = self:"coords";
    QR = (self:"parents"_1):"coords";
    Q = QR_1;
    R = QR_2;
    q = Q*P;
    r = R*P;
    n = cross(q_(1..3),r_(1..3));
    p = (n_1,n_2,n_3,(-P_(1..3)*n)/P_4);
    ABCD = apply(dgs3dIntersectionsQQP(Q,R,p),dgs3dRP3Normalize(#));
    P = dgs3dRP3Normalize(P);
    dsts = apply(ABCD,#=dgs3dRP3Normalize(#);(P-#)*(P-#));
    P = ABCD_1;
    d = dsts_1;
    if(if(!isReal(d),true,dsts_2 < d),P=ABCD_2;d=dsts_2);
    if(if(!isReal(d),true,dsts_3 < d),P=ABCD_3;d=dsts_3);
    if(if(!isReal(d),true,dsts_4 < d),P=ABCD_4;d=dsts_4);
    self:"coords" = P;
    // TODO detect error case where new points are closer to each other than to traced point
    if(isReal(d),
      DGS3DmOVEoK
    ,
      DGS3DmOVErETRY
    );
  );
  obj:"recompute".(obj);
  obj:"redraw".(obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints:(obj:"id") = obj;
  );
  obj
);
pointOnBiQuadric3d(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  // TODO? can this result in an infinite projected point
  dgs3dPointOnBiQuadric(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnBiQuadric(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnBiQuadric(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);

// p1: plane, p2: plane|line, size:real = radius, visible: bool = should object be drawn
meet3d(a,b,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dMeet2(a,b,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dMeet2(a,b,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(a:"type" == "plane" & b:"type" == "plane",
    dgs3dMeet2P(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "plane" & b:"type" == "line",
    dgs3dMeetPL(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "plane",
    dgs3dMeetPL(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "line",
    dgs3dMeet2L(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "quadric" & b:"type" == "line",
    dgs3dMeetQL(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "quadric",
    dgs3dMeetQL(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "quadric" & b:"type" == "plane",
    dgs3dMeetQP(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "plane" & b:"type" == "quadric",
    dgs3dMeetQP(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "quadric" & b:"type" == "quadric",
    dgs3dMeet2Q(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "conic" & b:"type" == "plane",
    dgs3dMeetCp(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "plane" & b:"type" == "conic",
    dgs3dMeetCp(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "conic" & b:"type" == "line",
    dgs3dMeetCL(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "line" & b:"type" == "conic",
    dgs3dMeetCL(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "conic" & b:"type" == "quadric",
    dgs3dMeetQuadricConic(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "quadric" & b:"type" == "conic",
    dgs3dMeetQuadricConic(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "biquadric" & b:"type" == "plane",
    dgs3dMeetBiQuadricPlane(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "plane" & b:"type" == "biquadric",
    dgs3dMeetBiQuadricPlane(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "biquadric" & b:"type" == "quadric",
    dgs3dMeetBiQuadricQuadric(a,b,size->size,visible->visible,color->color,alpha->alpha);
  ,if(a:"type" == "quadric" & b:"type" == "biquadric",
    dgs3dMeetBiQuadricQuadric(b,a,size->size,visible->visible,color->color,alpha->alpha);
  ,
    cglLogWarning("cannot meet "+a:"type"+" and "+b:"type");
  )))))))))))))))))));
);
// P1: plane, P2: plane, size:real = radius, visible: bool = should object be drawn
dgs3dMeet2P(P1,P2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([P1,P2],lambda(self,
    regional(A,B);
    A = (self:"parents"_1):"coords";
    B = (self:"parents"_2):"coords";
    self:"coords" = dgs3dRP3Normalize(dgs3dDualLine(dgs3dEpsilon44(A,B)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// P1: plane, l1: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeetPL(P1,l1,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([P1,l1],lambda(self,
    regional(p,l);
    p = self:"parents"_1;
    l = self:"parents"_2;
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon46(p:"coords",l:"coords"));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// TODO? restrict to co-planar lines
// l1: line, l2: line => point, size:real = radius, visible: bool = should object be drawn
dgs3dMeet2L(l1,l2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([l1,l2],lambda(self,
    regional(l1,l2,K);
    l1 = dgs3dLineMatrix(dgs3dDualLine((self:"parents"_1):"coords"));
    l2 = dgs3dLineMatrix((self:"parents"_2):"coords");
    K = l2*l1; // == -transpose(l1*l2)
    self:"coords" = dgs3dRP3Normalize(max(K,(#*#,#))_2);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha)
);
// l1: line, l2: line => plane, visible: bool = should object be drawn
dgs3dJoin2L(l1,l2,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([l1,l2],lambda(self,
    regional(l1,l2,K);
    l1 = dgs3dLineMatrix(dgs3dDualLine((self:"parents"_1):"coords"));
    l2 = dgs3dLineMatrix((self:"parents"_2):"coords");
    K = l1*l2;
    self:"coords" = dgs3dRP3Normalize(max(K,(#*#,#))_2);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dProjDistanceSq(P1,P2):=(
  regional(d);
  d = normalize(P1)-normalize(P2);
  |d*d|
);
dgs3dTracePointPair(self,AB):=(
  self:"coords" = AB;
  oldA = self:"children"_1:"coords";
  oldB = self:"children"_2:"coords";
  if(isUndefined(oldA) % isUndefined(oldB),
      self:"children"_1:"coords" = AB_1;
      self:"children"_2:"coords" = AB_2;
      DGS3DmOVEoK
  ,
    // TODO retry if distance between points smaller that distance to new points
    // * find good way to detect if points are too close to each other
    //  cindy-classic uses d(oldA,oldB)* s > d(oldA,newA)+d(oldB,newB)
    d11 = dgs3dProjDistanceSq(AB_1,oldA);
    d12 = dgs3dProjDistanceSq(AB_1,oldB);
    d21 = dgs3dProjDistanceSq(AB_2,oldA);
    d22 = dgs3dProjDistanceSq(AB_2,oldB);
    // chose permutation that minimizes sum of squared distances
    if(d11 + d22 <= d12 + d21,
      self:"children"_1:"coords" = AB_1;
      self:"children"_2:"coords" = AB_2;
      if(d11 <= d12 & d22 <= d21,DGS3DmOVEoK,DGS3DmOVErETRY)
    ,
      self:"children"_1:"coords" = AB_2;
      self:"children"_2:"coords" = AB_1;
      if(d12 <= d11 & d21 <= d22,DGS3DmOVEoK,DGS3DmOVErETRY)
    );
  )
);
dgs3dTracePointSet(self,pts):=(
  if(max(apply(self:"children",isUndefined(#:"coords"))),
    // at least one undefined child -> direly set in given order
    forall(1..(length(pts)),i,
      self:"children"_i:"coords" = pts_i;
    );
    DGS3DmOVEoK
  ,
    regional(n,iMin,jMin,dist);
    n = length(pts);
    dist = apply(pts,p,apply(self:"children",q,
      dgs3dProjDistanceSq(p,q:"coords");
    ));
    iMin = apply(1..n,i,min(1..n,j,(dist_i_j,j))_2);// old-index closest to new-index
    jMin = apply(1..n,j,min(1..n,i,(dist_i_j,i))_2);// new-index closest to old-index
    if(min(apply(iMin,x,i,jMin_x==i)),// all points have a mutually closest partner
      // closest points are unique -> apply permutation
      forall(1..n,i,
        self:"children"_(iMin_i):"coords" = pts_i;
      );
      // TODO: detect error case where distance between points smaller than distance to target points
      DGS3DmOVEoK
    ,
      regional(perm,inv,y,j);
      perm = inv = 1..n;
      forall(iMin,x,i,
        if(perm_i!=x,
          // i -> y  j -> x
          y = perm_i;
          j = inv_x;
          // swap if distance decreases
          if(dist_i_x+dist_j_y<dist_i_y+dist_j_x,
            perm_i = x;
            perm_j = y;
            inv_x = i;
            inv_y = j;
          );
        );
      );
      forall(jMin,i,x,
        if(perm_i!=x,
          // i -> y  j -> x
          y = perm_i;
          j = inv_x;
          // swap if distance decreases
          if(dist_i_x+dist_j_y<dist_i_y+dist_j_x,
            perm_i = x;
            perm_j = y;
            inv_x = i;
            inv_y = j;
          );
        );
      );
      // TODO? how far is this algorithm from a minimal distance sum solution?
      forall(1..n,i,
        self:"children"_(perm_i):"coords" = pts_i;
      );
      // duplicate entry -> retry move
      DGS3DmOVErETRY
    )
  )
);
// Q1: quadric, l1: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeetQL(Q1,l1,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q1,l1],2,lambda(self,
    regional(Q,l,AB,oldA,oldB,d11,d12,d21,d22);
    Q = self:"parents"_1:"coords";
    l = self:"parents"_2:"coords";
    AB = dgs3dIntersectLineQuadric(dgs3dDualLine(l),Q);
    dgs3dTracePointPair(self,AB);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// P1: plane, P2: plane, P3: plane, size:real = radius, visible: bool = should object be drawn
meet3d(a,b,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dMeet3(a,b,c,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dMeet3(x,y,z,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(x:"type" == "plane" & y:"type" == "plane" & z:"type" == "plane",
    dgs3dMeet3P(x,y,z,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "quadric" & y:"type" == "plane" & z:"type" == "plane",
    dgs3dMeetQpp(x,y,z,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "plane" & y:"type" == "quadric" & z:"type" == "plane",
    dgs3dMeetQpp(y,x,z,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "plane" & y:"type" == "plane" & z:"type" == "quadric",
    dgs3dMeetQpp(z,x,y,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "quadric" & y:"type" == "quadric" & z:"type" == "plane",
    dgs3dMeetQQp(x,y,z,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "quadric" & y:"type" == "plane" & z:"type" == "quadric",
    dgs3dMeetQQp(x,z,y,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "plane" & y:"type" == "quadric" & z:"type" == "quadric",
    dgs3dMeetQQp(y,z,x,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "quadric" & y:"type" == "quadric" & z:"type" == "quadric",
    dgs3dMeet3Q(x,y,z,size->size,visible->visible,color->color,alpha->alpha);
  ,
    cglLogWarning("cannot meet "+x:"type"+", "+y:"type"+" and "+z:"type");
  ))))))))
);
dgs3dMeet3P(P1,P2,P3,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([P1,P2,P3],lambda(self,
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon444(self:"parents"_1:"coords",self:"parents"_2:"coords",self:"parents"_3:"coords"));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// Q1: quadric, p1: plane, p2: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQpp(Q1,p1,p2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q1,p1,p2],2,lambda(self,
    regional(Q,p1,p2,AB,oldA,oldB,d11,d12,d21,d22);
    Q = self:"parents"_1:"coords";
    p1 = self:"parents"_2:"coords";
    p2 = self:"parents"_3:"coords";
    AB = dgs3dIntersectLineQuadric(dgs3dEpsilon44(p1,p2),Q);
    dgs3dTracePointPair(self,AB);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// C: conic, p: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetCp(C,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([C,p],2,lambda(self,
    regional(Q,C,AB,oldA,oldB,d11,d12,d21,d22);
    C = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    AB = dgs3dIntersectLineQuadric(dgs3dEpsilon44(C_2,p),C_1);
    dgs3dTracePointPair(self,AB);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// C: conic, l: line ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetCL(C,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewPointSet([C,l],2,lambda(self,
    regional(Q,C,AB,oldA,oldB,d11,d12,d21,d22);
    C = self:"parents"_1:"coords";
    l = self:"parents"_2:"coords";
    AB = dgs3dIntersectLineQuadric(dgs3dDualLine(l),C_1);
    dgs3dTracePointPair(self,AB);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// TODO: check if results are correct in all cases
dgs3dIntersectionsQQP(Q1,Q2,p):=(
  regional(T,S,A,B,pts2D);
  T = dgs3dMapPinfTo(p);
  S = transpose(T); // invert T
  // 2. transform quadrics such that p = (0,0,0,1)
  A = transpose(S)*Q1*S;
  B = transpose(S)*Q2*S;
  // 3. intersect conics given by first 3 coordinates
  pts2D = dgs3dIntersect2DConic(apply(A_(1..3),#_(1..3)),apply(B_(1..3),#_(1..3)));
  // 4. transform intersections back to original coordinate system
  apply(pts2D,v,dgs3dRP3Normalize(S*(v_1,v_2,v_3,0)));
);
// Q1: quadric, Q2: quadric, p: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQQp(Q1,Q2,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q1,Q2,p],4,lambda(self,
    regional(Q1,Q2,p,AB,oldA,oldB,d11,d12,d21,d22);
    Q1 = self:"parents"_1:"coords";
    Q2 = self:"parents"_2:"coords";
    p = self:"parents"_3:"coords";
    ABCD = dgs3dIntersectionsQQP(Q1,Q2,p);
    dgs3dTracePointSet(self,ABCD);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// Q: quadric, C: conic ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQuadricConic(Q,C,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q,C],4,lambda(self,
    regional(Q,C,AB,oldA,oldB,d11,d12,d21,d22);
    Q = self:"parents"_1:"coords";
    C = self:"parents"_2:"coords";;
    ABCD = dgs3dIntersectionsQQP(Q,C_1,C_2);
    dgs3dTracePointSet(self,ABCD);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// Q2: bi-quadric, p: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetBiQuadricPlane(Q2,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q2,p],4,lambda(self,
    regional(Q2,p,ABCD);
    Q2 = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";;
    ABCD = dgs3dIntersectionsQQP(Q2_1,Q2_2,p);
    dgs3dTracePointSet(self,ABCD);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dIntersects3Q(Q1,Q2,Q3):=(
  dgs3de3q3(dgs3dQuadAsVec(Q1),dgs3dQuadAsVec(Q2),dgs3dQuadAsVec(Q3));
);
// Q2: bi.quadric, q: quadric ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetBiQuadricQuadric(Q2,q,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q2,q],8,lambda(self,
    regional(Q2,q,sols);
    Q2 = self:"parents"_1:"coords";
    q = self:"parents"_2:"coords";;
    sols = dgs3dIntersects3Q(Q2_1,Q2_2,q);
    dgs3dTracePointSet(self,sols);
  ),size->size,visible->visible,color->color,alpha->alpha);
);

// Q1,Q2,Q3: quadric ; size:real = radius, visible: bool = should object be drawn
dgs3dMeet3Q(Q1,Q2,Q3,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet([Q1,Q2,Q3],8,lambda(self,
    regional(Q1,Q2,Q3,sols);
    Q1 = self:"parents"_1:"coords";
    Q2 = self:"parents"_2:"coords";
    Q3 = self:"parents"_3:"coords";
    sols = dgs3dIntersects3Q(Q1,Q2,Q3);
    dgs3dTracePointSet(self,sols);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
///////////
// E3Q3
///////////
dgs3dPnormalize(p):=(
  regional(n);
  n = length(p);
  while(if(n>1,p_n == 0,false),n=n-1);
  p_(1..n)
);
dgs3dPmul(a,b):=(
  if(islist(a) & islist(b),
    dgs3dPnormalize(
      apply(2..(length(a)+length(b)),s,sum(max(1,s-length(b))..(min(length(a),s-1)),i,a_i*b_(s-i)))
    )
  ,
    a*b
  )
);
dgs3dPadd(a,b):=(
  dgs3dPnormalize(apply(1..(max(length(a),length(b))),i,if(i <= length(a),a_i,0)+if(i <= length(b),b_i,0)))
);
dgs3dPsub(a,b):=(
  dgs3dPnormalize(apply(1..(max(length(a),length(b))),i,if(i <= length(a),a_i,0)-if(i <= length(b),b_i,0)))
);
dgs3dPsum(l):=(
  regional(s);
  s = [0];
  forall(l,p,s = dgs3dPadd(s,p));
  s
);
dgs3dmmulp(A,B):=(
  apply(1..(length(A)),i,apply(1..(length(B)),j,dgs3dPsum(apply(1..(length(A_i)),k,dgs3dPmul(A_i_k,B_k_j)))))
);
dgs3dPeval(p,x):=(
  sum(0..(length(p)-1),i,(p_(i+1))*(x^i))
);
dgs3dPevalm(A,x):=(
  apply(A,r,apply(r,e,dgs3dPeval(e,x)))
);
dgs3dQuadAsMat(qVec):=(
  [
    [2*qVec_1,qVec_2,qVec_3,qVec_4],
    [qVec_2,2*qVec_5,qVec_6,qVec_7],
    [qVec_3,qVec_6,2*qVec_8,qVec_9],
    [qVec_4,qVec_7,qVec_9,2*qVec_10]
  ]
);
dgs3dQuadAsVec(qMat):=(
  [qMat_1_1,qMat_1_2+qMat_2_1,qMat_1_3+qMat_3_1,qMat_1_4+qMat_4_1,
      qMat_2_2,qMat_2_3+qMat_3_2,qMat_2_4+qMat_4_2,
      qMat_3_3,qMat_3_4+qMat_4_3,qMat_4_4]
);
dgs3ddehom4(v):=(
  if(v_4 != 0,
    v/v_4
  ,if(v_3 != 0,
    v/v_3
  ,if(v_2 != 0,
    v/v_2
  ,if(v_1 != 0,
    (1,0,0,0)
  ,
    (0,0,0,0)
  ))))
);

dgs3de3q3checkError(res,q1,q2,q3):=(
  if(isundefined(res),
    true
  ,
    max((q1,q2,q3),q,max(res,v,abs(v*dgs3dQuadAsMat(q)*v))) > 1e-7
  );
);
// quadric intersection algo from paper: Efficient Intersection of Three Quadrics and Applications in Computer Vision
dgs3de3q3(q1,q2,q3):=(
  regional(res,retryCount,D,trafo,trafoT);
  res = dgs3de3q3Impl(q1,q2,q3);
  retryCount = 100; // retry at most 100 times
  // retry if error is too large
  // TODO! figure out if wrong solutions are problems with implementation or numerics of algorithm
  // TODO? remember "least-bad" solution so far
  while(retryCount > 0 & dgs3de3q3checkError(res,q1,q2,q3),
    // handling of singular cases inspired by: https://github.com/PoseLib/PoseLib
    D = 0;
    while(abs(D) < 1e-5 % abs(D) > 1e5, // find random trafo with reasonably small
      trafo = (
        (random(),random(),random(),random()),
        (random(),random(),random(),random()),
        (random(),random(),random(),random()),
        (random(),random(),random(),random())
      );
      D = det(trafo);
    );
    trafoT = transpose(trafo);
    res = dgs3de3q3Impl(
      dgs3dQuadAsVec(trafoT*dgs3dQuadAsMat(q1)*trafo),
      dgs3dQuadAsVec(trafoT*dgs3dQuadAsMat(q2)*trafo),
      dgs3dQuadAsVec(trafoT*dgs3dQuadAsMat(q3)*trafo)
    );
    if(!isundefined(res),
      res = apply(res,p,trafo*p);
      err = max((q1,q2,q3),q,Q = dgs3dQuadAsMat(q);max(res,v,abs(v*Q*v)));
    );
    retryCount = retryCount - 1;
  );
  apply(res,v,dgs3dRP3Normalize(v))
);
dgs3de3q3Impl(q1,q2,q3):=(
  regional(undef,Axy,Axz,Axw,Ayz,Ayw,Azw,D,varChoice,D1,A,M0,A1,M1,s11,s12,s13,s21,s22,s23,s31,s32,s33,M,D,roots,isError,solutions,Mr,ker,v);
  // 1. preprocessing:
  // input: xx xy xz xw yy yz yw zz zw ww
  Axy = ((-q1_1,-q1_5,-q1_2),(-q2_1,-q2_5,-q2_2),(-q3_1,-q3_5,-q3_2));
  Axz = ((-q1_1,-q1_8,-q1_3),(-q2_1,-q2_8,-q2_3),(-q3_1,-q3_8,-q3_3));
  Axw = ((-q1_1,-q1_10,-q1_4),(-q2_1,-q2_10,-q2_4),(-q3_1,-q3_10,-q3_4));
  Ayz = ((-q1_5,-q1_8,-q1_6),(-q2_5,-q2_8,-q2_6),(-q3_5,-q3_8,-q3_6));
  Ayw = ((-q1_5,-q1_10,-q1_7),(-q2_5,-q2_10,-q2_7),(-q3_5,-q3_10,-q3_7));
  Azw = ((-q1_8,-q1_10,-q1_9),(-q2_8,-q2_10,-q2_9),(-q3_8,-q3_10,-q3_9));
  D = det(Ayz);
  varChoice = 0;
  D1 = det(Axy);
  if(abs(D1)>abs(D), D = D1;  varChoice = 1);
  D1 = det(Axz);
  if(abs(D1)>abs(D), D = D1;  varChoice = 2);
  D1 = det(Axw);
  if(abs(D1)>abs(D), D = D1;  varChoice = 3);
  D1 = det(Ayw);
  if(abs(D1)>abs(D), D = D1;  varChoice = 4);
  D1 = det(Azw);
  if(abs(D1)>abs(D), D = D1;  varChoice = 5);
  if(abs(D) > 1e-8,
    if(varChoice == 1,
      // zz yz xz zw yy xy yw xx xw ww
      q1 = (q1_8,q1_6,q1_3,q1_9,q1_5,q1_2,q1_7,q1_1,q1_4,q1_10);
      q2 = (q2_8,q2_6,q2_3,q2_9,q2_5,q2_2,q2_7,q2_1,q2_4,q2_10);
      q3 = (q3_8,q3_6,q3_3,q3_9,q3_5,q3_2,q3_7,q3_1,q3_4,q3_10);
    ,if(varChoice == 2, // xz: swap x,y
      // yy xy yz yw xx xz xw zz zw ww
      q1 = (q1_5,q1_2,q1_6,q1_7,q1_1,q1_3,q1_4,q1_8,q1_9,q1_10);
      q2 = (q2_5,q2_2,q2_6,q2_7,q2_1,q2_3,q2_4,q2_8,q2_9,q2_10);
      q3 = (q3_5,q3_2,q3_6,q3_7,q3_1,q3_3,q3_4,q3_8,q3_9,q3_10);
    ,if( varChoice == 3, // xw: swap x,y ; swap z,w
      // yy xy yw yz xx xw xz ww zw zz
      q1 = (q1_5,q1_2,q1_7,q1_6,q1_1,q1_4,q1_3,q1_10,q1_9,q1_8);
      q2 = (q2_5,q2_2,q2_7,q2_6,q2_1,q2_4,q2_3,q2_10,q2_9,q2_8);
      q3 = (q3_5,q3_2,q3_7,q3_6,q3_1,q3_4,q3_3,q3_10,q3_9,q3_8);
    ,if( varChoice == 4, // yw: swap z,w
      // xx xy xw xz yy yw yz ww zw zz
      q1 = (q1_1,q1_2,q1_4,q1_3,q1_5,q1_7,q1_6,q1_10,q1_9,q1_8);
      q2 = (q2_1,q2_2,q2_4,q2_3,q2_5,q2_7,q2_6,q2_10,q2_9,q2_8);
      q3 = (q3_1,q3_2,q3_4,q3_3,q3_5,q3_7,q3_6,q3_10,q3_9,q3_8);
    ,if(varChoice == 5, // zw: swap y,w
      // xx xw xz xy ww zw yw zz yz yy
      q1 = (q1_1,q1_4,q1_3,q1_2,q1_10,q1_9,q1_7,q1_8,q1_6,q1_5);
      q2 = (q2_1,q2_4,q2_3,q2_2,q2_10,q2_9,q2_7,q2_8,q2_6,q2_5);
      q3 = (q3_1,q3_4,q3_3,q3_2,q3_10,q3_9,q3_7,q3_8,q3_6,q3_5);
    )))));
    // TODO? does the choice of x/w matter
    //  0  1  2  3  4  5  6  7  8  9
    // xx xy xz xw yy yz yw zz zw ww
    A = ((-q1_5,-q1_8,-q1_6),(-q2_5,-q2_8,-q2_6),(-q3_5,-q3_8,-q3_6));
    // 1. find polynomial matrix
    M0 = (
      ((q1_7,q1_2),(q1_9,q1_3),(q1_10,q1_4,q1_1)),
      ((q2_7,q2_2),(q2_9,q2_3),(q2_10,q2_4,q2_1)),
      ((q3_7,q3_2),(q3_9,q3_3),(q3_10,q3_4,q3_1))
    );
    A1 = inverse(A);
    M1 = dgs3dmmulp(A1,M0);
    s11=dgs3dPsub(dgs3dPadd(dgs3dPsub(dgs3dPmul(dgs3dPsub(M1_1_1,M1_3_2),M1_3_1),dgs3dPmul(M1_1_1,M1_3_1)),dgs3dPmul(M1_1_2,M1_2_1)),M1_3_3);
    s12=dgs3dPadd(dgs3dPadd(dgs3dPsub(dgs3dPmul(dgs3dPsub(M1_1_1,M1_3_2),M1_3_2),dgs3dPmul(M1_1_2,M1_3_1)),dgs3dPmul(M1_1_2,M1_2_2)),M1_1_3);
    s13=dgs3dPadd(dgs3dPsub(dgs3dPmul(dgs3dPsub(M1_1_1,M1_3_2),M1_3_3),dgs3dPmul(M1_1_3,M1_3_1)),dgs3dPmul(M1_1_2,M1_2_3));
    s21=dgs3dPsub(dgs3dPadd(dgs3dPsub(dgs3dPmul(dgs3dPsub(M1_3_1,M1_2_2),M1_3_1),dgs3dPmul(M1_1_1,M1_2_1)),dgs3dPmul(M1_2_1,M1_3_2)),M1_2_3);
    s22=dgs3dPadd(dgs3dPadd(dgs3dPsub(dgs3dPmul(dgs3dPsub(M1_3_1,M1_2_2),M1_3_2),dgs3dPmul(M1_1_2,M1_2_1)),dgs3dPmul(M1_2_2,M1_3_2)),M1_3_3);
    s23=dgs3dPadd(dgs3dPsub(dgs3dPmul(dgs3dPsub(M1_3_1,M1_2_2),M1_3_3),dgs3dPmul(M1_1_3,M1_2_1)),dgs3dPmul(M1_2_3,M1_3_2));
    s31=(dgs3dPadd(dgs3dPadd(dgs3dPadd(dgs3dPmul(dgs3dPsub(dgs3dPmul(M1_3_1,M1_3_1),dgs3dPmul(M1_1_1,M1_2_1)),M1_1_1),
      dgs3dPmul(dgs3dPsub(dgs3dPsub(dgs3dPadd(dgs3dPmul(M1_3_2,M1_3_1),dgs3dPmul(M1_3_1,M1_3_2)),dgs3dPmul(M1_1_2,M1_2_1)),
      dgs3dPmul(M1_1_1,M1_2_2)),M1_3_1)),dgs3dPmul(dgs3dPsub(dgs3dPmul(M1_3_2,M1_3_2),dgs3dPmul(M1_1_2,M1_2_2)),M1_2_1)),
      dgs3dPsub(dgs3dPsub(dgs3dPadd(dgs3dPmul(M1_3_1,M1_3_3),dgs3dPmul(M1_3_1,M1_3_3)),dgs3dPmul(M1_1_3,M1_2_1)),dgs3dPmul(M1_1_1,M1_2_3))));
    s32=(dgs3dPadd(dgs3dPadd(dgs3dPadd(dgs3dPmul(dgs3dPsub(dgs3dPmul(M1_3_1,M1_3_1),dgs3dPmul(M1_1_1,M1_2_1)),M1_1_2),
      dgs3dPmul(dgs3dPsub(dgs3dPsub(dgs3dPadd(dgs3dPmul(M1_3_2,M1_3_1),dgs3dPmul(M1_3_1,M1_3_2)),dgs3dPmul(M1_1_2,M1_2_1)),
      dgs3dPmul(M1_1_1,M1_2_2)),M1_3_2)),dgs3dPmul(dgs3dPsub(dgs3dPmul(M1_3_2,M1_3_2),dgs3dPmul(M1_1_2,M1_2_2)),M1_2_2)),
      dgs3dPsub(dgs3dPsub(dgs3dPadd(dgs3dPmul(M1_3_2,M1_3_3),dgs3dPmul(M1_3_2,M1_3_3)),dgs3dPmul(M1_1_3,M1_2_2)),dgs3dPmul(M1_1_2,M1_2_3))));
    s33=(dgs3dPsub(dgs3dPadd(dgs3dPadd(dgs3dPadd(dgs3dPmul(dgs3dPsub(dgs3dPmul(M1_3_1,M1_3_1),dgs3dPmul(M1_1_1,M1_2_1)),M1_1_3),
      dgs3dPmul(dgs3dPsub(dgs3dPsub(dgs3dPadd(dgs3dPmul(M1_3_2,M1_3_1),dgs3dPmul(M1_3_1,M1_3_2)),dgs3dPmul(M1_1_2,M1_2_1)),dgs3dPmul(M1_1_1,M1_2_2)),M1_3_3)),
      dgs3dPmul(dgs3dPsub(dgs3dPmul(M1_3_2,M1_3_2),dgs3dPmul(M1_1_2,M1_2_2)),M1_2_3)),dgs3dPmul(M1_3_3,M1_3_3)),dgs3dPmul(M1_1_3,M1_2_3)));
    M = ((s11,s12,s13),(s21,s22,s23),(s31,s32,s33));
    // 2. compute determinant of M
    D = dgs3dPsub(dgs3dPadd(dgs3dPadd(dgs3dPsub(dgs3dPsub(
        dgs3dPmul(M_1_1,dgs3dPmul(M_2_2,M_3_3)),dgs3dPmul(M_1_1,dgs3dPmul(M_2_3,M_3_2))),
        dgs3dPmul(M_1_2,dgs3dPmul(M_2_1,M_3_3))),dgs3dPmul(M_1_2,dgs3dPmul(M_2_3,M_3_1))),
        dgs3dPmul(M_1_3,dgs3dPmul(M_2_1,M_3_2))),dgs3dPmul(M_1_3,dgs3dPmul(M_2_2,M_3_1))
      );
    // 3. find roots
    roots = roots(D);
    isError = false;
    // 4. solve for other coordinates
    solutions = apply(roots,r,
      Mr = dgs3dPevalm(M,r);
      ker = transpose(kernel(Mr)); // is using kernel stable enough
      if(length(ker)!=1,
        isError = true;
        [r,0,0,1] // dummy value
      ,
        v = ker_1;
        if(abs(v_3) <= (1e-10 * (abs(v_1)+abs(v_2))),isError = true);
        [r*v_3,v_1,v_2,v_3]
      )
    );
    if(isError,undef,
      // undo coordinate-permutation on solutions
      if(varChoice == 0,
        solutions
      ,if(varChoice == 1, // xy: swap x,z
        solutions = apply(solutions,s,[s_3,s_2,s_1,s_4])
      ,if(varChoice == 2, // xz: swap x,y
        solutions = apply(solutions,s,[s_2,s_1,s_3,s_4])
      ,if(varChoice == 3, // xw: swap x,y ; swap z,w
        solutions = apply(solutions,s,[s_2,s_1,s_4,s_3])
      ,if(varChoice == 4, // yw: swap z,w
        solutions = apply(solutions,s,[s_1,s_2,s_4,s_3])
      ,if(varChoice == 5, // zw: swap y,w
        solutions = apply(solutions,s,[s_1,s_4,s_3,s_2])
      ))))));
    );
  );
);
////////

// Q: quadric, x: point|line|plane => plane size:real = radius, visible: bool = should object be drawn
polar3d(Q,x,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dPolar(Q,x,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dPolar(Q,x,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(Q:"type" == "quadric",
    if(x:"type" == "point",
      dgs3dPolarPlane(Q,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "line",
      dgs3dPolarLine(Q,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "plane",
      dgs3dPolarPoint(Q,x,size->size,visible->visible,color->color,alpha->alpha);
    // TODO? polar quadric
    ,
      cglLogWarning("cannot compute polar of "+x:"type"+" on "+Q:"type");
    )));
  ,if(Q:"type" == "conic",
    if(x:"type" == "point",
      dgs3dConicPolarLine(Q,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "line",
      dgs3dConicPolarPoint(Q,x,size->size,visible->visible,color->color,alpha->alpha);
    ,
      cglLogWarning("cannot compute polar of "+x:"type"+" on "+Q:"type");
    ));
  ,if(Q:"type" == "biquadric",
    if(x:"type" == "point",
      dgs3dBiQuadricPolarLine(Q,x,size->size,visible->visible,color->color,alpha->alpha);
    ,
      cglLogWarning("cannot compute polar of "+x:"type"+" on "+Q:"type");
    );
  ,
      cglLogWarning("cannot compute polar on "+Q:"type");
  )));
);
// Q: quadric, p: point => plane, visible: bool = should object be drawn
dgs3dPolarPlane(Q,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([Q,p],lambda(self,
    self:"coords" = dgs3dRP3Normalize(self:"parents"_1:"coords" * self:"parents"_2:"coords");
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);
// Q: quadric, l: line => line, visible: bool = should object be drawn
dgs3dPolarLine(Q,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([Q,l],lambda(self,
    regional(L,Q);
    Q = self:"parents"_1:"coords";
    L = dgs3dLineMatrix(self:"parents"_2:"coords");
    self:"coords" = dgs3dRP3Normalize(dgs3dLineFromDualMatrix(adjoint4(Q)*L*adjoint4(Q)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// Q: quadric, P: plane => point, visible: bool = should object be drawn
dgs3dPolarPoint(Q,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([Q,P],lambda(self,
    self:"coords" = dgs3dRP3Normalize(adjoint4(self:"parents"_1:"coords") * self:"parents"_2:"coords");
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// C: conic, p: point => line, visible: bool = should object be drawn
dgs3dConicPolarLine(C,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewLine([C,P],lambda(self,
    regional(Q,P,p,q);
    [Q,p] = self:"parents"_1:"coords";
    P = self:"parents"_2:"coords";
    q = Q*P;
    self:"coords" = dgs3dRP3Normalize(dgs3dDualLine(dgs3dEpsilon44(p,q)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// C: conic, l: line => point, visible: bool = should object be drawn
dgs3dConicPolarPoint(C,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewPoint([C,l],lambda(self,
    regional(Q,P,p,q);
    [Q,p] = self:"parents"_1:"coords";
    Q = Q + transpose([p])*[p]; // polar degenerates if Q is othrogonal to p
    L = dgs3dLineMatrix(self:"parents"_2:"coords");
    m = dgs3dLineFromDualMatrix(adjoint4(Q)*L*adjoint4(Q));
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon46(p,m));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// C: conic, p: point => line, visible: bool = should object be drawn
dgs3dBiQuadricPolarLine(C,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([C,P],lambda(self,
    regional(Q,R,P,p,q,r);
    [Q,R] = self:"parents"_1:"coords";
    P = self:"parents"_2:"coords";
    q = Q*P;
    r = R*P;
    self:"coords" = dgs3dRP3Normalize(dgs3dDualLine(dgs3dEpsilon44(q,r)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);

// Q: mat4, P: vec4
dgs3dComputeQuadricLines(Q,P):=(
  regional(p,T,S,l,m);
  p = Q*P;
  T = dgs3dMapPinfTo(p);
  S = T*Q*transpose(T); // transform Q (by T^-1 = T^T)
  // decompose top-left 3x3 matrix
  [l,m] = dgs3dDecompose2DConic(apply(S_(1..3),#_(1..3)));
  // go from 2D to 3D lines
  l = (0,0,l_1,0,l_2,l_3) ;//dgs3dDualLine(dgs3dEpsilon44((l_1,l_2,l_3,0),(0,0,0,1)));
  m = (0,0,m_1,0,m_2,m_3) ;//dgs3dDualLine(dgs3dEpsilon44((m_1,m_2,m_3,0),(0,0,0,1)));
  // map lines back to correct position
  l = dgs3dRP3Normalize(dgs3dLineFromMatrix(transpose(T)*dgs3dLineMatrix(l)*(T)));
  m = dgs3dRP3Normalize(dgs3dLineFromMatrix(transpose(T)*dgs3dLineMatrix(m)*(T)));
  [l,m]
);
// q: quadric, P: point => 2 x line, visible: bool = should object be drawn
dgs3dQuadricLines(q,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure P on q
  dgs3dNewLinePair([q,P],lambda(self,
    regional(q,P,l,m);
    q = self:"parents"_1:"coords";
    P = self:"parents"_2:"coords";
    [l,m] = dgs3dComputeQuadricLines(q,P);
    // TODO: tracing for line-pair
    self:"children"_1:"coords" = l;
    self:"children"_2:"coords" = m;
    DGS3DmOVEoK 
  ),size->size,visible->visible,color->color,alpha->alpha);
);

// pts: [point; 9] => quadric, visible: bool = should object be drawn
quadricBy9P(pts,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dQuadric9point(pts,visible->visible,color->color,alpha->alpha);
);
quadricBy9Points(pts,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dQuadric9point(pts,visible->visible,color->color,alpha->alpha);
);
dgs3dQuadric9point(pts,visible->true,color->cglNada,alpha->cglNada):=(
  if(length(pts)!=9,
    cglLogWarning("wrong number of points expected 9 got "+length(pts));
  );
  dgs3dNewQuadric(pts,lambda(self,
    regional(pts,v);
    pts = apply(self:"parents",#:"coords");
    self:"coords" = dgs3dRP3Normalize(dgs3dComputeQuadricBy9(pts));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);
// pts: [plane; 9] => quadric, visible: bool = should object be drawn
quadricBy9Planes(planes,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dQuadric9plane(planes,visible->visible,color->color,alpha->alpha);
);
dgs3dQuadric9plane(planes,visible->true,color->cglNada,alpha->cglNada):=(
  if(length(planes)!=9,
    cglLogWarning("wrong number of planes expected 9 got "+length(planes));
  );
  dgs3dNewQuadric(planes,lambda(self,
    regional(planes,v,M);
    planes = apply(self:"parents",#:"coords");
    self:"coords" = dgs3dRP3Normalize(adjoint4(dgs3dComputeQuadricBy9(planes)));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);

// build orthogonal transformation that maps (0,0,0,1) to p
dgs3dMapPinfTo(p):=(
  T = ((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,1));
  if(|p_1|>=|p_2| & |p_1|>=|p_3|,
    T_1 = T_4;
  ,if(|p_2|>=|p_1| & |p_2|>=|p_3|,
    T_2 = T_4;
  ,if(|p_3|>=|p_1| & |p_3|>=|p_2|,
    T_3 = T_4;
  )));
  T_4 = (p_1,p_2,p_3,p_4);
  // make transformation orthogonal
  T_4 = T_4/sqrt(T_4*T_4);
  T_1 = T_1 - (T_1*T_4)*T_4;
  T_2 = T_2 - (T_2*T_4)*T_4;
  T_3 = T_3 - (T_3*T_4)*T_4;
  T_3 = T_3/sqrt(T_3*T_3);
  T_1 = T_1 - (T_1*T_3)*T_3;
  T_2 = T_2 - (T_2*T_3)*T_3;
  T_2 = T_2/sqrt(T_2*T_2);
  T_1 = T_1 - (T_1*T_2)*T_2;
  T_1 = T_1/sqrt(T_1*T_1);
  T
);
dgs3dComputeConicBy5(p,A,B,C,D,E,dual->false):=(
  regional(T,a,b,c,d,e,G,H,M,v,w,r);
  T = dgs3dMapPinfTo(p);
  // build conic through 5 transformed points
  a = (T*A)_(1..3);
  b = (T*B)_(1..3);
  c = (T*C)_(1..3);
  d = (T*D)_(1..3);
  e = (T*E)_(1..3);
  G = transpose([cross(d,a)])*[cross(b,e)];
  H = transpose([cross(d,b)])*[cross(a,e)];
  M = (c*G*c)*H-(c*H*c)*G;
  M = M + transpose(M);
  if(dual,
    M = adjoint3(M);
  );
  fnz = 0;
  forall(M,forall(#,if(fnz==0,fnz=#))); // find first non-zero entry
  M = conjugate(fnz)*M; // scale by conjugate of first non-zero entry to map complex multiples of real matrices to real matrices
  // find v,r such that (M v;v r)*(p_1,p_2,p_3,0) = (0,0,0,0)
  w = T*(p_1,p_2,p_3,0);
  if(w_4 != 0,
    v = -(M*w_(1..3))/w_4;
    r = -(v*w_(1..3))/w_4;
  ,
    v = (0,0,0);
    r = 0;
  );
  transpose(T)*((M_1_1,M_1_2,M_1_3,v_1),(M_2_1,M_2_2,M_2_3,v_2),(M_3_1,M_3_2,M_3_3,v_3),(v_1,v_2,v_3,r))*T;
);
dgs3dComputeCircleBy3(A,B,C):=(
  p = dgs3dEpsilon444(A,B,C); // plane through A,B,C
  if(p*p==0, // A,B,C colinear -> pick any plane through A and B
    regional(d,v);
    d = B-A;
    v = min([(1,0,0,0),(0,1,0,0),(0,0,1,0),(1,1,1,1)],(abs(#*d),#))_2;
    p = dgs3dEpsilon444(A,B,C+v);
  );
  l = dgs3dEpsilon44(p,(0,0,0,1)); // line at infinity
  [I, J] = dgs3dIntersectLineQuadric(l,((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,0)));
  M = dgs3dComputeConicBy5(p,A,B,C,I,J);
  [M,p]
);
dgs3dComputeQuadricBy9(pts):=(
  regional(v,ptsSq);
  ptsSq = apply(pts,dgs3dSqCoords(#));
  v = transpose(kernel(append(ptsSq,(0,0,0,0,0,0,0,0,0,0))))_1;
  ((2*v_1,v_2,v_3,v_4),(v_2,2*v_5,v_6,v_7),(v_3,v_6,2*v_8,v_9),(v_4,v_7,v_9,2*v_10));
);
dgs3dComputeBiQuadricBy8(pts):=(
  regional(A,B);
  A = dgs3dComputeQuadricBy9(append(pts,(random(),random(),random(),random())));
  B = dgs3dComputeQuadricBy9(append(pts,(random(),random(),random(),random())));
  [dgs3dRP3Normalize(A),dgs3dRP3Normalize(B)]
);

conicBy5(A,B,C,D,E,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(A.type=="point" & B.type == "point" & C.type == "point" & D.type == "point" & E.type =="point",
    dgs3dConic5points(A,B,C,D,E,size->size,visible->visible,color->color,alpha->alpha);
  ,if(A.type=="line" & B.type == "line" & C.type == "line" & D.type == "line" & E.type =="line",
    dgs3dConic5lines(A,B,C,D,E,size->size,visible->visible,color->color,alpha->alpha);
  ,
    cglLogError("cannot create conic from "+apply((A,B,C,D,E),#.type));
  ));
);
conicBy5Points(A,B,C,D,E,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dConic5points(A,B,C,D,E,size->size,visible->visible,color->color,alpha->alpha);
);
conicBy5Lines(A,B,C,D,E,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dConic5lines(A,B,C,D,E,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dConic5points(A,B,C,D,E,size->cglNada,visible->true,xcolor->cglNada,alpha->cglNada):=(
  dgs3dNewConic([A,B,C,D,E],lambda(self,
    regional(A,B,C,D,E,M,p);
    A = self:"parents"_1:"coords";
    B = self:"parents"_2:"coords";
    C = self:"parents"_3:"coords";
    D = self:"parents"_4:"coords";
    E = self:"parents"_5:"coords";
    // find plane through 3 points
    p = dgs3dRP3Normalize(dgs3dEpsilon444(A,B,C));
    M = dgs3dRP3Normalize(dgs3dComputeConicBy5(p,A,B,C,D,E));
    self:"coords" = [M,p];
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->false);
);
dgs3dConic5lines(A,B,C,D,E,size->cglNada,visible->true,xcolor->cglNada,alpha->cglNada):=(
  dgs3dNewConic([A,B,C,D,E],lambda(self,
    regional(A,B,C,D,E,K,p);
    A = self:"parents"_1:"coords";
    B = self:"parents"_2:"coords";
    C = self:"parents"_3:"coords";
    D = self:"parents"_4:"coords";
    E = self:"parents"_5:"coords";
    // find plane through 3 points
    K = dgs3dLineMatrix(dgs3dDualLine(A))*dgs3dLineMatrix(B);
    p = dgs3dRP3Normalize(max(K,(#*#,#))_2); // common plane
    a = dgs3dEpsilon46(p,dgs3dDualLine(A));
    b = dgs3dEpsilon46(p,dgs3dDualLine(B));
    c = dgs3dEpsilon46(p,dgs3dDualLine(C));
    d = dgs3dEpsilon46(p,dgs3dDualLine(D));
    e = dgs3dEpsilon46(p,dgs3dDualLine(E));
    M = dgs3dRP3Normalize(dgs3dComputeConicBy5(p,a,b,c,d,e,dual->true));
    self:"coords" = [M,p];
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->false);
);
biQuadricBy8Points(pts,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dBiQuadric8points(pts,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dBiQuadric8points(pts,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewBiQuadric(pts,lambda(self,
    regional(pts);
    pts = apply(self:"parents",#:"coords");
    self:"coords" = dgs3dComputeBiQuadricBy8(pts);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->false);
);

// q: quadric => point, 
dgs3dQuadricCenter(Q,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([Q],lambda(self,
    self:"coords" = dgs3dRP3Normalize(adjoint4(self:"parents"_1:"coords")_4);
  ),size->size,visible->visible,color->color,alpha->alpha);
);
////////////////
// Euclidean Operations
////////////////

// x: plane|line, p: point => plane|line; size:real = radius, visible: bool = should object be drawn
parallel3d(x,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dParallel(x,p,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dParallel(x,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(x:"type" == "line" & p:"type" == "point",
    dgs3dParallelLine(x,p,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "plane" & p:"type" == "point",
    dgs3dParallelPlane(x,p,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "line" & p:"type" == "line",
    dgs3dParallel2Line(x,p,visible->visible,color->color,alpha->alpha);
  ,
    cglLogWarning("cannot compute parallel to "+x:"type"+" through "+p:"type");
  )));
);
// l: line, p: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dParallelLine(l,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([l,p],lambda(self,
    regional(l,p);
    l = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon44(p,dgs3dEpsilon46((0,0,0,1),l)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// P: plane, p: point => plane; size:real = radius, visible: bool = should object be drawn
dgs3dParallelPlane(P,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([P,p],lambda(self,
    regional(P,p);
    P = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon46(p,dgs3dEpsilon44((0,0,0,1),P)));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);
// paralle to l1 through l2
// l1,l2: line => plane; visible: bool = should object be drawn
dgs3dParallel2Line(l1,l2,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([l,p],lambda(self,
    regional(l1,l2,n1,n2,n,p2);
    l1 = self:"parents"_1:"coords";
    l2 = self:"parents"_2:"coords";
    n1 = dgs3dLineDirection(l1);
    n2 = dgs3dLineDirection(l2);
    n = cross(n1,n2);
    p2 = dgs3dEpsilon46((n2_1,n2_2,n2_3,0),l2);
    self:"coords" = dgs3dRP3Normalize((n_1*p2_4,n_2*p2_4,n_3*p2_4,-(n*p2_(1..3))));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);
// x: plane|line, p: point => line|plane|; size:real = radius, visible: bool = should object be drawn
normal3d(x,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNormal(x,p,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dNormal(x,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(x:"type" == "plane" & p:"type" == "point",
    dgs3dOrthogonalLine(x,p,size->size,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "plane" & p:"type" == "line",
    dgs3dOrthogonalPL(x,p,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "line" & p:"type" == "point",
    dgs3dOrthogonalPlane(x,p,visible->visible,color->color,alpha->alpha);
  ,if(x:"type" == "line" & p:"type" == "line",
    dgs3dOrthogonal2L(x,p,size->size,visible->visible,color->color,alpha->alpha);
  ,
    cglLogWarning("cannot compute normal to "+x:"type"+" through "+p:"type");
  ))));
);
// P: plane, p: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dOrthogonalLine(P,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  dgs3dNewLine([P,p],lambda(self,
    regional(P,p);
    P = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon44(p,p+(P_1,P_2,P_3,0)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// plane orthogonal to p through l
// p: plane, l: line => plane; visible: bool = should object be drawn
dgs3dOrthogonalPL(l,p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([l,p],lambda(self,
    regional(p,l,n1,n,p1);
    p = self:"parents"_1:"coords";
    l = self:"parents"_2:"coords";
    n1 = dgs3dLineDirection(l);
    n = cross(p_(1..3),n1);
    p1 = dgs3dEpsilon46((n1_1,n1_2,n1_3,0),l);
    self:"coords" = dgs3dRP3Normalize((n_1*p1_4,n_2*p1_4,n_3*p1_4,-(p1_1,p1_2,p1_3)*n));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);
// l: line, p: point => line; visible: bool = should object be drawn
dgs3dOrthogonalPlane(l,p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([l,p],lambda(self,
    regional(l,p,n);
    l = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    n = dgs3dLineDirection(l);
    self:"coords" = dgs3dRP3Normalize((n_1*p_4,n_2*p_4,n_3*p_4,-(p_1,p_2,p_3)*n));
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha);
);
// l1: line, l2: line => line; size:real = radius, visible: bool = should object be drawn
dgs3dOrthogonal2L(l1,l2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([l1,l2],lambda(self,
    regional(l1,l2,n1,n2,p1,n3,q);
    l1 = self:"parents"_1:"coords";
    l2 = self:"parents"_2:"coords";
    n1 = dgs3dLineDirection(l1);
    n2 = dgs3dLineDirection(l2);
    n = cross(n1,n2);
    // intersect lines with planes through 0 normal to line
    p1 = dgs3dEpsilon46((n1_1,n1_2,n1_3,0),l1);
    n3 = cross(n1,n);
    q = dgs3dEpsilon46((n3_1*p1_4,n3_2*p1_4,n3_3*p1_4,-(n3*p1_(1..3))),l2);
    self:"coords" = dgs3dRP3Normalize(dgs3dEpsilon44(q,q+(n_1,n_2,n_3,0)));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);
// p1,p2: point => point; size:real = radius, visible: bool = should object be drawn, delta: real -> distance at which point should be draw, default is 0.5
dgs3dMidpoint(p1,p2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(isUndefined(delta),
    dgs3dNewPoint([p1,p2],lambda(self,
      regional(p1,p2);
      p1 = self:"parents"_1:"coords";
      p2 = self:"parents"_2:"coords";
      if(p1_4 != 0 % p2_4 != 0,
        self:"coords" = p1*p2_4+p2*p1_4;
      ,if(p1_3 != 0 % p2_3 != 0,
        self:"coords" = p1*p2_3+p2*p1_3;
      ,if(p1_2 != 0 % p2_2 != 0,
        self:"coords" = p1*p2_2+p2*p1_2;
      ,
        self:"coords" = p1+p2;
      )));
      self:"coords" = dgs3dRP3Normalize(self:"coords");
      DGS3DmOVEoK
    ),size->size,visible->visible,color->color,alpha->alpha);
  ,
    dgs3dNewPoint([p1,p2,delta],lambda(self,
      regional(p1,p2,delta);
      p1 = self:"parents"_1:"coords";
      p2 = self:"parents"_2:"coords";
      delta = self:"parents"_3;
      if(p1_4 != 0 % p2_4 != 0,
        self:"coords" = (1-delta)*p1*p2_4+delta*p2*p1_4;
      ,if(p1_3 != 0 % p2_3 != 0,
        self:"coords" = (1-delta)*p1*p2_3+delta*p2*p1_3;
      ,if(p1_2 != 0 % p2_2 != 0,
        self:"coords" = (1-delta)*p1*p2_2+delta*p2*p1_2;
      ,
        self:"coords" = (1-delta)*p1+delta*p2;
      )));
      self:"coords" = dgs3dRP3Normalize(self:"coords");
      DGS3DmOVEoK
    ),size->size,visible->visible,color->color,alpha->alpha);
  );
);
// mirror x at y
mirror3d(x,y,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(x.type == "point" & y.type == "plane",
    dgs3dMirrorPtPl(x,y,size->size,visible->visible,color->color,alpha->alpha)
  // TODO: pt at line, pt at pt, plane at plane, plane at line, plane at pt, line at ...
  // TODO? mirror quadric, mirror at quadric
  ,
    cglLogError("cannot mirror "+x.type+" at "+y.type);
  )
);
// p: point, P:plane => point; size:real = radius, visible: bool = should object be drawn, delta: real -> distance at which point should be draw, default is 0.5
dgs3dMirrorPtPl(p,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([p,P],lambda(self,
    regional(p,P,p0,n,p1);
    p = self:"parents"_1:"coords";
    P = self:"parents"_2:"coords";
    p0 = p_(1..3);
    n = P_(1..3);
    p1 = p0 - 2*((P_4+(p0*n))/(n*n))*n;
    self:"coords" = dgs3dRP3Normalize((p1_1,p1_2,p1_3,p_4));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha);
);

// A,B,C,D: point => quadric, visible: bool = should object be drawn
sphere3d(A,B,C,D,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dSphere4points(A,B,C,D,visible->visible,color->color,alpha->alpha);
);
dgs3dSphere4points(A,B,C,D,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric([A,B,C,D],lambda(self,
    regional(pts,A,b,v,c);
    pts = apply(self:"parents",#:"coords");
    b = apply(pts,-(|#_(1..3)|^2));
    v = linearSolve(apply(pts,#*#_4),b);
    self:"coords" = [[1,0,0,0.5*v_1],[0,1,0,0.5*v_2],[0,0,1,0.5*v_3],[0.5*v_1,0.5*v_2,0.5*v_3,v_4]];
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isSphere->true);
);
// M,R: point => quadric, visible: bool = should object be drawn
sphere3dMR(M,R,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dSphere2P(M,R,visible->visible,color->color,alpha->alpha);
);
dgs3dSphere2P(M,R,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric([M,R],lambda(self,
    regional(M,R,v,r);
    [M,R] = apply(self:"parents",#:"coords");
    v = (M_4*R_(1..3)/R_4-M_(1..3));
    r = v*v;
    self:"coords" = [[M_4,0,0,-M_1],[0,M_4,0,-M_2],[0,0,M_4,-M_3],[-M_1,-M_2,-M_3,(M_1^2+M_2^2+M_3^2-r)/M_4]];
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isSphere->true);
);

circle3d(A,B,C,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dCircle3points(A,B,C,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dCircle3points(A,B,C,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic([A,B,C],lambda(self,
    regional(A,B,C,T,M,p,l,I,J,a,b,c,d,e,G,H);
    A = self:"parents"_1:"coords";
    B = self:"parents"_2:"coords";
    C = self:"parents"_3:"coords";
    self:"coords" = dgs3dComputeCircleBy3(A,B,C);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->true);
);

////////////////
// Distance Estimators
////////////////
// estimate squared-distance to intersection curve of quadric and plane
dgs3dDistanceQuadricPlane(Quadric,Plane,coords):=(
  regional(pol,v,plane,P);
  // 1. get polar planes
  pol = Quadric*coords;
  // move plane to midpoint between polar-point and plane
  pol_4 = 0.5*(pol_4 - ((coords_1,coords_2,coords_3)/coords_4)*(pol_1,pol_2,pol_3));
  // 2. compute distance to intersection line
  l = dgs3dDualLine(dgs3dEpsilon44(pol,Plane));
  v = dgs3dEpsilon46((0,0,0,1),l);
  plane = (v_1*coords_4,v_2*coords_4,v_3*coords_4,-(v_1,v_2,v_3,0)*coords);
  P = dgs3dEpsilon46(plane,l);
  P = (P / P_4 - coords / coords_4);
  P*P
);
// estimate squared-distance to intersection curve of quadric and quadric
dgs3dDistanceQuadricQuadric(Q1,Q2,coords):=(
  regional(pol1,pol2,l,v,plane,P);
  // 1. get polar planes
  pol1 = Q1*coords;
  pol2 = Q2*coords;
  // 2. compute distance to intersection line
  l = dgs3dDualLine(dgs3dEpsilon44(pol1,pol2));
  v = dgs3dEpsilon46((0,0,0,1),l);
  plane = (v_1*coords_4,v_2*coords_4,v_3*coords_4,-(v_1,v_2,v_3,0)*coords);
  P = dgs3dEpsilon46(plane,l);
  P = (P / P_4 - coords / coords_4);
  0.25*(P*P)
);
// Q: quadric, p: plane => conic; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQP(Q,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic([Q,p],lambda(self,
    regional(Q,p);
    Q = self:"parents"_1:"coords";
    p = self:"parents"_2:"coords";
    // find a quadric with the same intersection that is "less similar" to p
    // build transformation that maps (0,0,0,1) to p
    T = ((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,1));
    if(|p_1|>=|p_2| & |p_1|>=|p_3|,
      T_1 = T_4;
    ,if(|p_2|>=|p_1| & |p_2|>=|p_3|,
      T_2 = T_4;
    ,if(|p_3|>=|p_1| & |p_3|>=|p_2|,
      T_3 = T_4;
    )));
    T_4 = p;
    // make transformation orthogonal
    T_4 = T_4/sqrt(T_4*T_4);
    T_1 = T_1 - (T_1*T_4)*T_4;
    T_2 = T_2 - (T_2*T_4)*T_4;
    T_3 = T_3 - (T_3*T_4)*T_4;
    T_3 = T_3/sqrt(T_3*T_3);
    T_1 = T_1 - (T_1*T_3)*T_3;
    T_2 = T_2 - (T_2*T_3)*T_3;
    T_2 = T_2/sqrt(T_2*T_2);
    T_1 = T_1 - (T_1*T_2)*T_2;
    T_1 = T_1/sqrt(T_1*T_1);
    R = T*Q*transpose(T);
    R_4 = (0,0,0,0);
    R_1_4 = R_2_4 = R_3_4 = 0;
    S = dgs3dRP3Normalize(transpose(T)*R*T);
    self:"coords" = [S,p];
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->Q:"isSphere");
);
// Q1: quadric, Q2: quadric => biquadric; size:real = radius, visible: bool = should object be drawn
dgs3dMeet2Q(Q1,Q2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewBiQuadric([Q1,Q2],lambda(self,
    regional(Q1,Q2);
    Q1 = self:"parents"_1:"coords";
    Q2 = self:"parents"_2:"coords";
    self:"coords" = [Q1,Q2];
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->Q1:"isSphere"&Q2:"isSphere");
);
// ? quadric by mix of points, lines and planes

////////////////
// Transformations
////////////////
transformation3d(M):=(
  dgs3dFreeTransformation(M)
);
dgs3dFreeTransformation(M):=(
  regional(obj);
  obj = dgs3dNewObject("transform",[]);
  obj:"coords" = M;
  obj
);
dgs3dTransformBy5P(As,Bs):=(
  dgs3dNewTrafo(concat(As,Bs),lambda(self,
    regional(A,B,R,S,v,w);
    A = apply(self:"parents"_(1..5),#:"coords");
    B = apply(self:"parents"_(6..10),#:"coords");
    R = transpose((A_1,A_2,A_3,A_4));
    v = linearSolve(R,A_5);
    R=apply(R,(#_1*v_1,#_2*v_2,#_3*v_3,#_4*v_4));
    S = transpose((B_1,B_2,B_3,B_4));
    w = linearSolve(S,B_5);
    S=apply(S,(#_1*w_1,#_2*w_2,#_3*w_3,#_4*w_4));
    self:"coords" = dgs3dRP3Normalize(S*adjoint4(R));
    DGS3DmOVEoK
  ))
);
dgs3dAffineTransformBy4P(As,Bs):=(
  dgs3dNewTrafo(concat(As,Bs),lambda(self,
    regional(A,B,R,S);
    A = apply(self:"parents"_(1..4),dgs3ddehom4(#:"coords"));
    B = apply(self:"parents"_(5..8),dgs3ddehom4(#:"coords"));
    R = transpose(A);
    S = transpose(B);
    self:"coords" = dgs3dRP3Normalize(S*inverse(R));
    DGS3DmOVEoK
  ))
);
// mobius transform mapping inf -> p1, 0 -> p2, e1 -> p3 and e1-e2-plane to sphere through (p1,p2,p3,p4) where (p1,p2,p3,p4) = As
dgs3dComputeHalfMobiusTrafo(As):=(
  regional(c,v1,v2,v3,p4,m1,s,f4,m2,m3);
  // determine möbius transform T(v) = sM(v-a)/<v-a,v-a> + c
  // 1. T(inf) = c
  c = As_1_(1..3);
  v1 = As_2_(1..3) - c;
  v2 = As_3_(1..3) - c;
  v3 = As_4_(1..3) - c;
  v1 = v1/(v1*v1);
  v2 = v2/(v2*v2);
  v3 = v3/(v3*v3);
  // use T(0) = p2 and T(e1) = p3 to obtain value of M*e1
  // sM^-1 v2 = e_1-a ;  sM^-1 v1 = -a  -> s (v2-v1) = M  e_1
  m1 = (v2-v1);
  s = 1/|m1|;
  m1 = s*m1;
  // determine M*e2 from T(x*e1+y*e2) = p4
  f4 = s*(v3-v1); // f4 = x*M1 + y*M2
  m2 = f4 - (f4*m1)*m1;
  m2 = m2/|m2|;
  m3 = -cross(m1,m2); // choose matrix with negative determinant to get orientation preserving transformation
  [s*transpose((m1,m2,m3)),-s*(m1,m2,m3)*v1,c]
);
// compute S = (M1,a1,c1) with inverse of T = (M0,a0,c0)
dgs3dComputeComposeMobiusInverse(M1,a1,c1,M0,a0,c0):=(
  regional(L,p,q);
  if(|a1-a0|<1e-10,
    L = M1*transpose(M0)/(M0_1*M0_1);
    p = c1 - L*c0;
    [((L_1_1,L_1_2,L_1_3,p_1),(L_2_1,L_2_2,L_2_3,p_2),(L_3_1,L_3_2,L_3_3,p_3),(0,0,0,1))]
  ,
    // S*T^-1(p) = inf -> p = T(S^-1(inf)) = T(a1)
    p = M0*(a1-a0)/((a1-a0)*(a1-a0))+c0; // p = T(a1) -> S*T^-1(p) = S(a1)  = inf
    q = M1*(a0-a1)/((a0-a1)*(a0-a1))+c1; // S(a0) = S*T^-1(inf)
    // compute (S*T^-1(e_i+p)) -q to get columns of L // TODO? is there a simpler equation
    L = transpose(apply(((1,0,0,1),(0,1,0,1),(0,0,1,1)),x,
      regional(p1,p2);
      p1 = dgs3dComputeApplyMobiusTrafo((transpose(M0),c0,a0),x+(p_1,p_2,p_3,0));
      p2 = dgs3dComputeApplyMobiusTrafo((M1,a1,c1),p1);
      p2_(1..3) - q;
    ));
    [L,p,q]
  )
);
dgs3dComputeApplyMobiusTrafo(T,p):=(
  regional(v,M,a,c);
  if(length(T)==1,
    (T_1)*p
  ,
    [M,a,c] = T;
    v = dgs3ddehom4(p)_(1..3);
    if(v==a,
      regional(inf);
      inf = 1e64;
      (inf,inf,inf,1)
    ,
      v = M*(v-a)/((v-a)*(v-a))+c;
      (v_1,v_2,v_3,1)
    )
  )
);
dgs3dComputeInverseMobius(T):=(
  if(length(T)==1,
    [adjoint4(T)]
  ,
    regional(M,a,c);
    (M,a,c) = T;
    [transpose(M),c,a]
  )
);
dgs3dComputeComposeMobius(S,T):=(
  regional(M0,a0,c0,M1,a1,c1);
  // TODO! double-check composition in semi-degenerate cases
  if(length(S) == 1,
    if(length(T)== 1,
      [S_1*T_1];
    ,
      S = S_1;
      M0 = (S_1_(1..3),S_2_(1..3),S_3_(1..3));
      c0 = (S_1_4,S_2_4,S_3_4);
      (M1,a1,c1) = T;
      // N( M(x-a)/(x-a)^2 + c )+b = NM(x-a)/(x-a)^2 + Nc+b
      (M0*M1,a1,M0*c1+c0)
    )
  ,
    if(length(T)== 1,
      T = T_1;
      (M0,a0,c0) = S;
      M1 = (T_1_(1..3),T_2_(1..3),T_3_(1..3));
      c1 = (T_1_4,T_2_4,T_3_4);
      // M((Nx+b)-a)/(Nx+b-a)^2+c = MN(x-N^-1(a-b))/(s^2(x-N^-1(a-b))^2)+c where N=s*orth
      (M0*M1/(M1_1*M1_1),inverse(M1)*(a0-c1),c0)
    ,
      (M0,a0,c0) = S;
      (M1,a1,c1) = T;
      dgs3dComputeComposeMobiusInverse(M0,a0,c0,transpose(M1),c1,a1);
    )
  )
);
dgs3dMobiusTransformBy4P(As,Bs):=(
  dgs3dNewMobiusTrafo(concat(As,Bs),lambda(self,
    regional(M0,a0,c0,M1,a1,c1);
    As = apply(self:"parents"_(1..4),dgs3ddehom4(#:"coords"));
    Bs = apply(self:"parents"_(5..8),dgs3ddehom4(#:"coords"));
    [M0,a0,c0] = dgs3dComputeHalfMobiusTrafo(As);
    [M1,a1,c1] = dgs3dComputeHalfMobiusTrafo(Bs);
    self:"coords" = dgs3dComputeComposeMobiusInverse(M1,a1,c1,M0,a0,c0);
    DGS3DmOVEoK
  ))
);
dgs3dMobiusTransformPoint(T,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([T,P],lambda(self,
    regional(T,P);
    T = self:"parents"_1:"coords";
    P = self:"parents"_2:"coords";
    self:"coords" = dgs3dComputeApplyMobiusTrafo(T,P);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dComputeMobiusTransformPlane(T,v):=(
  if(length(T)==1,
    v = transpose(adjoint4(T_1))*v;
    ((0,0,0,v_1),(0,0,0,v_2),(0,0,0,v_3),(v_1,v_2,v_3,2*v_4))
  ,
    regional(MT,p,q,c,k,l,r);
    (MT,q,p) = T; // decompose inverse trafo
    c = v_4;
    v = v_(1..3);
    k = q*v + c;
    l = MT*v;
    // k <y,y> + 2<y,l/2-kp> + k<p,p>-<p,l> = 0
    v = 0.5*l - k*p;
    r = k*(p*p)-p*l;
    ((k,0,0,v_1),(0,k,0,v_2),(0,0,k,v_3),(v_1,v_2,v_3,r));
  )
);
dgs3dComputeMobiusTransformSphere(T,S):=(
  if(length(T)==1,
    T = adjoint4(T_1);
    transpose(T)*S*T
  ,
    regional(MT,p,q,a,v,c,k,l,r);
    (MT,q,p) = T; // decompose inverse trafo
    // write S as a<x,x> + <x,v> + c = 0
    a = (S_1_1+S_2_2+S_3_3)/3;
    v = (S_1_4,S_2_4,S_3_4)+S_4_(1..3);
    c = S_4_4;
    k = a*q*q + q*v + c;
    l = MT*(2*a*q + v);
    // k <y,y> + 2<y,l/2-kp> + k<p,p>-<p,l> = 0
    v = 0.5*l - k*p;
    r = k*(p*p)-p*l + a*(MT_1*MT_1);
    ((k,0,0,v_1),(0,k,0,v_2),(0,0,k,v_3),(v_1,v_2,v_3,r));
  );
);
dgs3dMobiusTransformPlane(T,p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric([T,p],lambda(self,
    regional(T,v);
    T = self:"parents"_1:"coords";
    v = self:"parents"_2:"coords";
    self:"coords" = dgs3dComputeMobiusTransformPlane(T,v);
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isSphere->true)
);
dgs3dMobiusTransformSphere(T,s,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric([T,s],lambda(self,
    regional(T,S);
    T = self:"parents"_1:"coords";
    S = self:"parents"_2:"coords";
    self:"coords" = dgs3dComputeMobiusTransformSphere(T,S);
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isSphere->true)
);
dgs3dMobiusTransformLine(T,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic([T,l],lambda(self,
    regional(T,l,p1,p2,S1,S2,Q,R,q);
    T = self:"parents"_1:"coords";
    // find two planes through line
    l = dgs3dLineMatrix(dgs3dDualLine(self:"parents"_2:"coords"));
    (p1,p2) = transpose(kernel(l));
    // transform planes
    S1 = dgs3dComputeMobiusTransformPlane(T,p1);
    S2 = dgs3dComputeMobiusTransformPlane(T,p2);
    // find plane in pencil through two spheres
    if(S1_1_1==0,
      Q = S1;
      R = S2;
    ,
      Q = S2_1_1*S1-S1_1_1*S2; // make top-left 3x3 submatrix zero
      R = S1_1_1*S1+S2_1_1*S2; // swap factors and one single to ensure linearly independent choice
    );
    q = (Q_1_4+Q_4_1,Q_2_4+Q_4_2,Q_3_4+Q_4_3,Q_4_4);
    self:"coords" = (R,q);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->true)
);
dgs3dMobiusTransformCircle(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic([T,c],lambda(self,
    regional(T,Q,P,s,p,S1,S2,R,q);
    T = self:"parents"_1:"coords";
    (Q,p) = self:"parents"_2:"coords";
    // add multiple of degenerate quadric given by p to ensure Q is a sphere
    P = transpose([p])*[p];
    if(|P_1_2|>|P_1_3| & |P_1_2|>|P_2_3|,
      s = Q_1_2/P_1_2;
    ,if(|P_1_3|>|P_2_3|,
      s = Q_1_3/P_1_3;
    ,
      s = Q_2_3/P_2_3;
    ));
    Q = Q - s*P;
    // transform plane and sphere
    S1 = dgs3dComputeMobiusTransformPlane(T,p);
    S2 = dgs3dComputeMobiusTransformSphere(T,Q);
    // find plane in pencil through two spheres
    if(S1_1_1==0,
      Q = S1;
      R = S2;
    ,
      Q = S2_1_1*S1-S1_1_1*S2; // make top-left 3x3 submatrix zero
      R = S1_1_1*S1+S2_1_1*S2; // swap factors and one single to ensure linearly independent choice
    );
    q = (Q_1_4+Q_4_1,Q_2_4+Q_4_2,Q_3_4+Q_4_3,Q_4_4);
    self:"coords" = (R,q);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->true)
);
dgs3dMobiusTransformCircle2(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic([T,c],lambda(self,
    regional(T,Q,P,s,p,S1,S2,R,q);
    T = self:"parents"_1:"coords";
    (Q1,Q2) = self:"parents"_2:"coords";
    // TODO? are the arguments guaranteed to be spheres
    // transform plane and sphere
    S1 = dgs3dComputeMobiusTransformSphere(T,Q1);
    S2 = dgs3dComputeMobiusTransformSphere(T,Q2);
    // find plane in pencil through two spheres
    if(S1_1_1==0,
      Q = S1;
      R = S2;
    ,
      Q = S2_1_1*S1-S1_1_1*S2; // make top-left 3x3 submatrix zero
      R = S1_1_1*S1+S2_1_1*S2; // swap factors and one single to ensure linearly independent choice
    );
    q = (Q_1_4+Q_4_1,Q_2_4+Q_4_2,Q_3_4+Q_4_3,Q_4_4);
    self:"coords" = (R,q);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha,isCircle->true)
);
dgs3dMobiusTransformTransform(T,S,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewTrafo((T,S),lambda(self,
    regional(S,T,R);
    T = self:"parents"_1:"coords";
    S = self:"parents"_2:"coords";
    // need trafo with: Tx -> TSx
    self:"coords" = dgs3dComputeComposeMobius(T,dgs3dComputeComposeMobius(S,dgs3dComputeInverseMobius(T)));
    DGS3DmOVEoK
  ))
);
dgs3dMobiusTransformQuadric(T,q,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewSurface([T,q],lambda(self,
    regional(T,M,a,c,q,data);
    T = self:"parents"_1:"coords";
    q = self:"parents"_2:"coords";
    self:"coords" = if(length(T)==1,
      T = adjoint4(T_1);
      data = {"M":transpose(T)*q*T};
      [lambda((spacePos,data),spacePos*data.M*spacePos)]
    ,
      [M,a,c] = T;
      data = {
        "M": M,
        "p": a,
        "q": c,
        "A": apply(q_(1..3),#_(1..3)),
        "b": (q_1_4+q_4_1,q_2_4+q_4_2,q_3_4+q_4_2),
        "c": q_4_4
      };
      [lambda((spacePos,data),x=(spacePos-data.p);
        x*transpose(data.M)*data.A*data.M*x
          +(x*x)*(2*data.q*data.A+data.b)*data.M*x
          +(x*x)^2*(data.q*data.A*data.q+data.b*data.q+data.c)
      ),data]
    );
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isSphere->true)
);

transform3d(T,x,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dTransform(T,x,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dTransform(Q,x,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(T.type == "transform",
    if(x:"type" == "point",
      dgs3dTransformPoint(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "line",
      dgs3dTransformLine(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "plane",
      dgs3dTransformPlane(T,x,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "quadric",
      dgs3dTransformQuadric(T,x,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "conic",
      dgs3dTransformConic(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "biquadric",
      dgs3dTransformBiQuadric(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "transform",
      dgs3dTransformTrafo(T,x);
    ,
      cglLogWarning("cannot transform "+x:"type");
    )))))));
  ,if(T.type == "mobiusTrafo",
    if(x:"type" == "point",
      dgs3dMobiusTransformPoint(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "line",
      dgs3dMobiusTransformLine(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "plane",
      dgs3dMobiusTransformPlane(T,x,visible->visible,color->color,alpha->alpha);
    ,if((x:"type" == "quadric") & (x:"isSphere" == true),
      dgs3dMobiusTransformSphere(T,x,visible->visible,color->color,alpha->alpha);
    ,if((x:"type" == "conic") & (x:"isCircle" == true),
      dgs3dMobiusTransformCircle(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if((x:"type" == "biquadric") & (x:"isCircle" == true),
      dgs3dMobiusTransformCircle2(T,x,size->size,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "mobiusTrafo",
      dgs3dMobiusTransformTransform(T,x,visible->visible,color->color,alpha->alpha);
    ,if(x:"type" == "quadric",
      dgs3dMobiusTransformQuadric(T,x,visible->visible,color->color,alpha->alpha);
    // TODO? image of conic/bi-quadric under Möbius-Trafo as 2nd-class object
    //    "surfacePlaneIntersection"/ "surfaceIntersection" renderers
    ,
      cglLogWarning("cannot apply mobius transform to "+x:"type");
    ))))))));
  ,
    cglLogWarning("the first parameter of transform should be a  tranformation got: "+x:"type");
  ));
);
dgs3dTransformPoint(T,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint([T,P],lambda(self,
    regional(T,P);
    T = self:"parents"_1:"coords";
    P = self:"parents"_2:"coords";
    self:"coords" = dgs3dRP3Normalize(T*P);
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dTransformLine(T,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine([T,l],lambda(self,
    regional(T,l);
    T = adjoint4(self:"parents"_1:"coords");
    l = dgs3dLineMatrix(self:"parents"_2:"coords");
    self:"coords" = dgs3dRP3Normalize(dgs3dLineFromMatrix(transpose(T)*l*T));
    DGS3DmOVEoK
  ),size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dTransformPlane(T,p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane([T,p],lambda(self,
    regional(T,p);
    T = adjoint4(self:"parents"_1:"coords");
    p = self:"parents"_2:"coords";
    self:"coords" = dgs3dRP3Normalize(transpose(T)*p);
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha)
);
dgs3dTransformQuadric(T,q,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric([T,q],lambda(self,
    regional(T,q);
    T = adjoint4(self:"parents"_1:"coords");
    q = self:"parents"_2:"coords";
    self:"coords" = dgs3dRP3Normalize(transpose(T)*q*T);
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha)
);
dgs3dTransformConic(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic([T,c],lambda(self,
    regional(T,q,p);
    T = adjoint4(self:"parents"_1:"coords");
    (q,p) = self:"parents"_2:"coords";
    self:"coords" = [dgs3dRP3Normalize(transpose(T)*q*T),dgs3dRP3Normalize(transpose(T)*p)];
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isCircle->false)
);
dgs3dTransformBiQuadric(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewBiQuadric([T,c],lambda(self,
    regional(T,q,p);
    T = adjoint4(self:"parents"_1:"coords");
    (q,r) = self:"parents"_2:"coords";
    self:"coords" = [dgs3dRP3Normalize(transpose(T)*q*T),dgs3dRP3Normalize(transpose(T)*r*T)];
    DGS3DmOVEoK
  ),visible->visible,color->color,alpha->alpha,isCircle->false)
);
dgs3dTransformTrafo(T,S):=(
  dgs3dNewTrafo((T,S),lambda(self,
    regional(S,T);
    T = self:"parents"_1:"coords";
    S = self:"parents"_2:"coords";
    // need trafo with: Tx -> TSx
    self:"coords" = dgs3dRP3Normalize(T*S*inverse(T));
    DGS3DmOVEoK
  ))
);

// TODO: ? support redefining objects
// TODO: ? should failure to trace child prevent movement of parent

// TODO: test-cases for:
// * quadric by 9 planes
// * transformations
// * load/store
// * delete

// TODO? support finding different object kinds
// ? general find (matches any object)
// ? find restricted to certain kinds of objecst (e.g find point or line)
dgs3dFindPointDist = (pt,root,dir) => (
  regional(center,radius);
  center = cgl3dObjectGet(cgl3d.getObject.(pt:"drawId"),"center");
  radius = cgl3dObjectGet(cgl3d.getObject.(pt:"drawId"),"radius");
  cglEvalOrDiscard(cgl3d.compute.sphereDepths.(root,dir,center,radius)_1);
);
dgs3dFindLineDist = (ln,root,dir) => (
  regional(center,orientation,radius);
  center = cgl3dObjectGet(cgl3d.getObject.(ln:"drawId"),"center");
  orientation = cgl3dObjectGet(cgl3d.getObject.(ln:"drawId"),"orientation");
  radius = cgl3dObjectGet(cgl3d.getObject.(ln:"drawId"),"radius");
  cglEvalOrDiscard(cgl3d.compute.cappedCylinderDepths.(root,dir,center,orientation,radius)_1);
);
dgs3dFindPlaneDist = (pl,root,dir) => (
  regional(v,n,s,l,l0,l1);
  v = pl:"coords";
  n = v_(1..3);
  s = v_4;
  // n*(r+l*d)+s = 0 ->  l = -(s+n*r)/(n*d)
  if(n*dir == 0,cglUndefinedVal(), // avoid warning for div by 0
    l = -(s+n*root)/(n*dir);
    cglEvalOrDiscard(
      [l0,l1] = cgl3d.cutoff.screenSphere.expr.(root,dir);
      if(l<l0 % l > l1,cglUndefinedVal(),l)
    )
  )
);
dgs3dFindMovable(x,y):=(
  dgs3dFind(x,y,[(dgs3dMovablePoints,dgs3dFindPointDist)])
);
dgs3dFindPoint(x,y):=(
  dgs3dFind(x,y,[(dgs3dPoints,dgs3dFindPointDist)])
);
dgs3dFind(x,y):=(
  dgs3dFind(x,y,[
    (dgs3dPoints,dgs3dFindPointDist),
    (dgs3dLines,dgs3dFindLineDist),
    (dgs3dPlanes,dgs3dFindPlaneDist)
    // TODO quadric, conic, biquadric
  ])
);
dgs3dFind(x,y,searchSpace):=(
  regional(root,dir,res,dist,center,radius);
  root = cglSpacePoint(x,y);
  dir = normalize(cglDirection(x,y));
  res = cglUndefinedVal();
  dist = 1e400; // infinity
  forall(searchSpace,
    objects = #_1;
    distanceEstimator = #_2;
    forall(objects,obj,
      d = distanceEstimator.(obj,root,dir);
      if(!isUndefined(d),
        if(d < dist,
          dist = d;
          res = obj;
        )
      );
    );
  );
  res
);