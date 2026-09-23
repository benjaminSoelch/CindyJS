////////////////
// Controls
////////////////
dgs3d = {};
dgs3dModeSelect = false;
dgs3d.doTracing = false;
dgs3d.alg = {};
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
dgs3dRedrawAll():=(
  forall(dgs3dObjects,#:"redraw".(#));
);
dgs3dHandleZoom(zoom):=(
  dgs3dUpdateCutoff();
  dgs3dRedrawAll();
);
dgs3dUpdateCutoff();

// TODO? set focus color depending on color of point
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
DGS3DmINaNGLEmOVE = 0.99; // prevent movement if movement direction too close to view-normal
dgs3dPreFrame():=(
    regional(mx,my,dx,dy,target,newCoords,oldTarget,axes,oldSpacePos,newSpacePos,center,movePlaneOffset,movePlaneNormal,d2,oldDirection,newDirection,oldT,newT,oldPos,newPos,delta,truePos,oldRadius,updateQueue);
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
      ,
        cglLogError("unimplemented: "+axes:"type"+" movement direction");
      ));
      // do not movePlaneNormal to close to view-plane
      delta = normalize(newPos-oldPos);
      // TODO? gradual scaling of movement distance instead of hard cutoff?
      if(min(|delta*normalize(oldDirection)|,|delta*normalize(newDirection)|)<DGS3DmINaNGLEmOVE %
          (re(delta*normalize(oldDirection))<0) != (re(delta*normalize(newDirection))<0),
        // keep movement relative to click position (instead of center)
        truePos = center;
        newPos = newPos+(truePos-oldPos);
        // update position
        newCoords = (newPos_1,newPos_2,newPos_3,1);
        dgs3dTracePoint(target,newCoords);
      );
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
dgs3dPrepareRecompute(obj):=(
  // TODO? sub-object for tracing-data to avoid polluting obj-data
  obj.needsRecompute = true;
  obj.resetChildren = false;
  obj.checkDetChildren = true;
  forall(obj.children,child,
    if(!child.needsRecompute,
      dgs3dPrepareRecompute(child)
    )
  );
);
dgs3dShouldRecompute(obj):=(
  if(obj.needsRecompute,!max(obj.parents,#.needsRecompute),false);
);
dgs3dRecomputeNonDetChild(obj,child):=(
  // for set `childrenDeterministic` is false, otherwise parent is deterministic if all children are deterministic
  if(child.childrenDeterministic,false,
    if(!dgs3dShouldRecompute(child),false,
      child:"oldCoords" = child:"coords";
      dgs3dTryRecomputeNonDetChildren(child)
    );
  )
);
dgs3dTryRecomputeNonDetChildren(obj):=(
  regional(retry);
  obj = dgs3dObjById(obj);
  if(obj.move.(obj) != DGS3DmOVEoK,
    obj.resetChildren = false;
    true
  ,
    retry = false;
    obj.needsRecompute = false;
    if(!obj.childrenDeterministic,
      // retry child that failed in previous attempt first
      if(!isUndefined(obj.badChild),
        retry = retry % dgs3dRecomputeNonDetChild(dgs3dObjById(obj.badChild));
      );
      // try recalculating direct children
      forall(obj:"children",child,
        retry = retry % dgs3dRecomputeNonDetChild(obj,dgs3dObjById(child))
      );
      // TODO? avoid duplicate work:
      // ? prioritize recalculation of children that went wrong on previous attempt
      // ! cannot eliminate non-deterministic subtree as same tracing path has to be used for all objects
      obj.resetChildren = true;
    );
    retry
  )
);
dgs3dRecomputeDetChildren(obj):=(
  forall(obj:"children",child,
    child = dgs3dObjById(child);
    if(dgs3dShouldRecompute(child),
      child.needsRecompute = false;
      if(child.childrenDeterministic,
        child.move.(child);
      );
    );
    if(child.checkDetChildren,
      child.checkDetChildren = false;
      dgs3dRecomputeDetChildren(child);
    );
  );
);
dgs3dResetChildren(obj):=(
  obj = dgs3dObjById(obj);
  if(obj.resetChildren,
    forall(obj:"children",child,
      if(!child.needsRecompute,
        child:"coords" = child:"oldCoords";
        child.needsRecompute = true;
        if(!child.childrenDeterministic,
          dgs3dResetChildren(child);
        );
      );
    );
  )
);
dgs3dRedrawChildren(obj):=(
  obj = dgs3dObjById(obj);
  obj.redraw.(obj);
  forall(obj:"children",child,
    dgs3dRedrawChildren(child);
  );
);
DGS3DmAXlEVEL = 16;
dgs3dTracePoint(p,newCoords):=(
  dgs3dPrepareRecompute(p);
  dgs3dTracePointRec(p,newCoords,0,(0,0,0,0));
  p.needsRecompute = false;
  dgs3dRecomputeDetChildren(p);
);
dgs3dTracePointRec(p,newCoords,level,prevV):=(
  regional(nextPos,mid,d,v,step,dir);
  nextPos = newCoords;
  p:"oldCoords" = p:"coords";
  p:"coords" = nextPos;
  if(dgs3dTryRecomputeNonDetChildren(p) & dgs3d.doTracing,
    // TODO: find good detour path if direct movement fails
    // ! need consistent choice to preserve theorems
    // ! choose path that is homotopy-equivalent to straight line
    step = 1;
    mid = newCoords;
    while(
      p.needsRecompute = true;
      dgs3dResetChildren(p);
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
      dgs3dTryRecomputeNonDetChildren(p) & step < DGS3DmAXlEVEL
    ,);
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

lexCompare(a,b):=(
  if(re(a)<re(b),
    -1
  ,if(re(a)>re(b),
    1
  ,if(im(a)<im(b),
    -1
  ,if(im(a)>im(b),
    1
  ,
    0
  ))))
);
dgs3dProjDistanceSq(P1,P2):=(
  regional(v1,v2);
  v1 = normalize(P1);
  v2 = normalize(P2);
  // we project both points to the unit-sphere and try to find the 
  //   minimum distance up to scalar multiplications with a complex unit
  // this results in minimizing the following expression for a real value a
  // <(A-e^(ia)B),(A-e^(ia)B)> = <A,A>+<B,B> - 2Re(e^(ia)<A,B>)
  // we have <A,A> = <B,B> = 1 and <A,B> = e^ib |<A,B>| with |<A,B>| <= 1
  // we get the minimal value 2 - 2|<A,B>| for b= -a 
  1-|v1*conjugate(v2)|;
);
// shader friendly version of dgs3dProjDistanceSq
dgs3dSimpleProjDistanceSq(P1,P2):=(
  regional(v1,v2);
  v1 = 1/re(sqrt(sum(apply(P1,|#|)))) * P1; // normalize(vec4) does not work in shader (function can only be used with one argument type)
  v2 = 1/re(sqrt(sum(apply(P2,|#|)))) * P2;
  1-|v1*v2|; // conjugate not supported by CindyGL (but input should be real)
);
dgs3dTracePointSelect(self,AB):=(
    regional(oldP);
    oldP = self:"coords";
    a = dgs3dProjDistanceSq(oldP,AB_1);
    b = dgs3dProjDistanceSq(oldP,AB_2);
    ab = dgs3dProjDistanceSq(AB_1,AB_2);
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
dgs3dTracePair(self,AB,metric):=(
  self:"coords" = AB;
  oldA = self:"children"_1:"coords";
  oldB = self:"children"_2:"coords";
  if(isUndefined(oldA) % isUndefined(oldB),
      self:"children"_1:"coords" = AB_1;
      self:"children"_2:"coords" = AB_2;
      DGS3DmOVEoK
  ,
    // TODO find good way to detect if points are too close to each other
    //  cindy-classic uses d(oldA,oldB)* s > d(oldA,newA)+d(oldB,newB)
    d11 = metric.(AB_1,oldA);
    d12 = metric.(AB_1,oldB);
    d21 = metric.(AB_2,oldA);
    d22 = metric.(AB_2,oldB);
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
dgs3dTraceSet(self,pts,metric):=(
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
      metric.(p,q:"coords");
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
////////////////
// Tensor Math
////////////////
idmatrix(n):=(apply(zeromatrix(n,n),#,i,#_i=1;#));

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
// l: vec6 (point-like), Q: mat4 => vec4 x 2
dgs3dIntersectQuadricDualLine(Q,l):=(
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
dgs3dIntersectQuadricLine(Q,l):=(dgs3dIntersectQuadricDualLine(Q,dgs3dDualLine(l)));
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
  if(m>0,p = p/v,p);
);
// adjoint of 4x4 matrix
adjoint4(M):=( // in CindyJS there does not seem to be a adjoint built-in ...
  [(
    -M_2_4*M_3_3*M_4_2+M_2_3*M_3_4*M_4_2+M_2_4*M_3_2*M_4_3-M_2_2*M_3_4*M_4_3-M_2_3*M_3_2*M_4_4+M_2_2*M_3_3*M_4_4,
      M_1_4*M_3_3*M_4_2-M_1_3*M_3_4*M_4_2-M_1_4*M_3_2*M_4_3+M_1_2*M_3_4*M_4_3+M_1_3*M_3_2*M_4_4-M_1_2*M_3_3*M_4_4,
    -M_1_4*M_2_3*M_4_2+M_1_3*M_2_4*M_4_2+M_1_4*M_2_2*M_4_3-M_1_2*M_2_4*M_4_3-M_1_3*M_2_2*M_4_4+M_1_2*M_2_3*M_4_4,
      M_1_4*M_2_3*M_3_2-M_1_3*M_2_4*M_3_2-M_1_4*M_2_2*M_3_3+M_1_2*M_2_4*M_3_3+M_1_3*M_2_2*M_3_4-M_1_2*M_2_3*M_3_4
  ),(
      M_2_4*M_3_3*M_4_1-M_2_3*M_3_4*M_4_1-M_2_4*M_3_1*M_4_3+M_2_1*M_3_4*M_4_3+M_2_3*M_3_1*M_4_4-M_2_1*M_3_3*M_4_4,
    -M_1_4*M_3_3*M_4_1+M_1_3*M_3_4*M_4_1+M_1_4*M_3_1*M_4_3-M_1_1*M_3_4*M_4_3-M_1_3*M_3_1*M_4_4+M_1_1*M_3_3*M_4_4,
      M_1_4*M_2_3*M_4_1-M_1_3*M_2_4*M_4_1-M_1_4*M_2_1*M_4_3+M_1_1*M_2_4*M_4_3+M_1_3*M_2_1*M_4_4-M_1_1*M_2_3*M_4_4,
    -M_1_4*M_2_3*M_3_1+M_1_3*M_2_4*M_3_1+M_1_4*M_2_1*M_3_3-M_1_1*M_2_4*M_3_3-M_1_3*M_2_1*M_3_4+M_1_1*M_2_3*M_3_4
  ),(
    -M_2_4*M_3_2*M_4_1+M_2_2*M_3_4*M_4_1+M_2_4*M_3_1*M_4_2-M_2_1*M_3_4*M_4_2-M_2_2*M_3_1*M_4_4+M_2_1*M_3_2*M_4_4,
      M_1_4*M_3_2*M_4_1-M_1_2*M_3_4*M_4_1-M_1_4*M_3_1*M_4_2+M_1_1*M_3_4*M_4_2+M_1_2*M_3_1*M_4_4-M_1_1*M_3_2*M_4_4,
    -M_1_4*M_2_2*M_4_1+M_1_2*M_2_4*M_4_1+M_1_4*M_2_1*M_4_2-M_1_1*M_2_4*M_4_2-M_1_2*M_2_1*M_4_4+M_1_1*M_2_2*M_4_4,
      M_1_4*M_2_2*M_3_1-M_1_2*M_2_4*M_3_1-M_1_4*M_2_1*M_3_2+M_1_1*M_2_4*M_3_2+M_1_2*M_2_1*M_3_4-M_1_1*M_2_2*M_3_4
  ),(
      M_2_3*M_3_2*M_4_1-M_2_2*M_3_3*M_4_1-M_2_3*M_3_1*M_4_2+M_2_1*M_3_3*M_4_2+M_2_2*M_3_1*M_4_3-M_2_1*M_3_2*M_4_3,
    -M_1_3*M_3_2*M_4_1+M_1_2*M_3_3*M_4_1+M_1_3*M_3_1*M_4_2-M_1_1*M_3_3*M_4_2-M_1_2*M_3_1*M_4_3+M_1_1*M_3_2*M_4_3,
      M_1_3*M_2_2*M_4_1-M_1_2*M_2_3*M_4_1-M_1_3*M_2_1*M_4_2+M_1_1*M_2_3*M_4_2+M_1_2*M_2_1*M_4_3-M_1_1*M_2_2*M_4_3,
    -M_1_3*M_2_2*M_3_1+M_1_2*M_2_3*M_3_1+M_1_3*M_2_1*M_3_2-M_1_1*M_2_3*M_3_2-M_1_2*M_2_1*M_3_3+M_1_1*M_2_2*M_3_3
  )]
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
// TODO: check if results are correct in all cases
dgs3dDecompose2DConic(A):=(
  regional(B,maxDiagEltIndex,beta,P,C);
  // 1. find anti-symmetric matrix D s.t. A+D has rank 1
  B = adjoint3(A);
  maxDiagEltIndex = if(|B_1_1|>=|B_2_2| & |B_1_1|>=|B_3_3|, 1, if(|B_2_2|>=|B_1_1| & |B_2_2|>=|B_3_3|,2, 3));
  beta = sqrt(-B_maxDiagEltIndex_maxDiagEltIndex);
  P = B_maxDiagEltIndex/beta;
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
// return a root of a x^3 + b x^2 + c x + d
// prefer real roots with small magnitude
dgs3dCubicRoot(a,b,c,d):=(
  sort(roots((a,b,c,d)),(!isReal(#),|#|))_1
);
dgs3dIntersect2DConic(A,B):=(
  regional(lambda,C,l12,p12,p34);
  // 1. find degenerate matrix in pencil
  lambda = dgs3dCubicRoot(
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
  );
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

////////////////
// Objects + Rendering
////////////////


dgs3dObjects = {}; // all objects
dgs3dObjectsByType = {}; // objects separated by type
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
dgs3dObjById(id) := if(isString(id), dgs3dObjects:id, id);
dgs3dIdForObj(obj) := if(isString(obj), obj, obj:"id");

dgs3dReset():=(
  forall(dgs3dObjects,obj,
    if(obj:"drawId"!=-1,cgl3d.removeObject.(obj:"drawId"))
  );
  dgs3dObjects = {};
  dgs3dObjectsByType = {};
  dgs3dMovablePoints = {};
);

// patch for removing json element (assigning nada recreates entry if element was not present)
jsonRemove(dir,key):=(
  regional(nada);
  if(!isUndefined(dir:key),
    dir:key = nada;
  )
);
// get element at key, insert empty json if key does not exist
jsonGetOrCreateJson(json,key):=(
  regional(oldVal);
  oldVal = json:key;
  if(!isUndefined(oldVal),oldVal,
    json:key = {};
  );
);
// get element or compute value
jsonGetOrComputeDefault(json,key,computeElt):=(
  regional(eltValue);
  eltValue = json:key;
  if(!isUndefined(eltValue),eltValue,computeElt.(key))
);

dgs3dIsSetType(name):=(
  name_1 == "{";
);
dgs3dIsSet(obj):=(
  dgs3dIsSetType(obj.type);
);
dgs3dCheckChildrenDeterministic(obj):=(
  if(dgs3dIsSet(obj),false,min(obj.children,#.childrenDeterministic))
);
dgs3dRecomputeChildrenDeterministic(obj):=(
  forall(obj.parents,
    if(!#.childrenDeterministic,
      if(dgs3dCheckChildrenDeterministic(#),
        #.childrenDeterministic = true;
        dgs3dRecomputeChildrenDeterministic(#);
      );
    );
  );
);
dgs3dDelete(obj):=(
  obj = dgs3dObjById(obj);
  if(obj.deleted != true,
    regional(typeObjects);
    jsonRemove(dgs3dObjects,obj.id);
    typeObjects = dgs3dObjectsByType:(obj.type);
    if(!isUndefined(typeObjects),
      jsonRemove(typeObjects,obj.id);
    );
    jsonRemove(dgs3dMovablePoints,obj.id);
    cglDelete(obj:"drawId");
    // TODO: how to handle deletion of set-elements
    forall(obj:"parents",p,
      if(!dgs3dIsSet(p), // do not remove children of set
        p:"children" = select(p:"children",child,child:"id"!=obj:"id");
      );
    );
    forall(obj.incidences,incidences,forall(incidences,incidence,
      jsonRemove(incidence.incidences:(obj.type),obj.id);
    ));
    forall(obj.tangencies,tangent,
      jsonRemove(tangent.tangencies,obj.id);
    );
    if(dgs3dIsSet(obj),
      dgs3dRecomputeChildrenDeterministic(obj);
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
    jsonGetOrCreateJson(dgs3dObjectsByType,obj.type):(obj:"id") = obj;
    if(obj:"movable" & obj:"type" == "point",
      dgs3dMovablePoints:(obj:"id") = obj;
    );
  );
);

/* obj3d = {
  id: string, // unique identifier
  type: string, // type of the object
  algorithm: string, // algorithm used to construct he object
  coords: [number], // coordinates of the object (representation depends on type)
  parents: [obj3d], // parent objects
  children: [obj3d], // child objects
  childrenDeterministic: bool, // are positions of children all deterministic
  drawId: cglID // id(s) of drawn objects
  visible: bool, size: real, color: vec3, alpha: real, // drawing parameters
  incidences: JSON, // incidences of object (contained in/contains/lines-coincident)
  tangencies:JSON, // tangencies relations of this object 
}*/

// TODO? add additional fields
// + name: string -> unique identifier for object
// ? deduced incidences

dgs3dObjAddIncidence(obj,incidence):=(
  jsonGetOrCreateJson(obj.incidences,incidence.type):(incidence.id) = incidence;
);
dgs3dObjAddIncidences(obj,incidences):=(
  forall(incidences,
    dgs3dObjAddIncidence(obj,#);
    dgs3dObjAddIncidence(#,obj);
  );
);
dgs3dObjAddTangency(obj,tangent):=(
  obj.tangencies:(tangent.id) = tangent;
);
dgs3dObjAddTangencies(obj,tangencies):=(
  forall(tangencies,
    dgs3dObjAddTangency(obj,#);
    dgs3dObjAddTangency(#,obj);
  );
);
dgs3dTagNonDeterministicChild(obj):=(
  forall(obj.parents,
    if(#.childrenDeterministic,
      #.childrenDeterministic = false;
      dgs3dTagNonDeterministicChild(#);
    );
  );
);
dgs3dDefaultColor(type):=(
  cglValOrDefault({
    "point": "red", "{point}": "yellow",
    "line": "black", "{line}": "black",
    "plane": "cyan", "{plane}": "cyan",
    "quadric": "#8000ff",
    "conic": "#40ff00", "biquadric": "#40ff00",
    "surface": "#ff4000"
  }:type,"gray");
);
dgs3dDefaultAlpha(type):=(
  if(type=="plane" % type == "quadric",
    0.67
  ,if(type == "surface",
    0.5
  ,
    1
  ))
);
dgs3dDefaultRenderer(type):=(
  cglValOrDefault({
    "point": dgs3dRenderPoint,
    "line": dgs3dRenderLine,
    "plane": dgs3dRenderPlane,
    "quadric": dgs3dRenderQuadric,
    "conic": dgs3dRenderConic,
    "biquadric": dgs3dRenderBiQuadric,
    "surface": dgs3dRenderSurface
  }:type,lambda(self,));
);
dgs3dGetAlg(alg):=(
  if(isString(alg),
    (alg,jsonGetOrComputeDefault(dgs3d.alg,alg,lambda(algName,
      if(substring(algName,0,4) == "free",
        cglNada
      ,if(substring(algName,0,2) == "on",
        cglNada
      ,if(algName == "setElt",cglNada,
        cglLogError("unsupported algorithm: "+algName);
        cglNada
      )));
    )))
  ,if(isLambda(alg),
    ("",alg)
  ,
    cglLogError("unexpected value for alg, expected string or lambda: "+alg);
    ("",()=>())
  ));
);
// type: string, parents: [obj3d] -> obj3d
dgs3dNewObject(type,alg,parents,onInit->lambda(self,),
  onMove->cglNada,visible->true,color->cglNada,alpha->cglNada,incidences->[],tangencies->[]):=(
  regional(obj,objId,algName,recompute);
  objId = dgs3dNewId();
  [algName,recompute] = dgs3dGetAlg(alg);
  obj = {
    "type":type, "algorithm": algName, "id": objId, "drawId": -1,
    "parents": parents, "children": [],
    "childrenDeterministic": !dgs3dIsSetType(type),
    "visible": cglValOrDefault(visible,true),
    "color": cglColor(cglValOrDefault(color,dgs3dDefaultColor(type))),
    "alpha": cglValOrDefault(alpha,dgs3dDefaultAlpha(type)),
    "recompute": recompute, "redraw": dgs3dDefaultRenderer(type),
    "move": cglValOrDefault(onMove,
      if(isUndefined(recompute),lambda(self,DGS3DmOVEoK),
        lambda(self,self.coords=eval(self.recompute,apply(self.parents,#.coords));DGS3DmOVEoK)
      )
    ),"needsRecompute": false,
    "incidences": {},"tangencies":{}
  };
  dgs3dObjAddIncidences(obj,incidences);
  dgs3dObjAddTangencies(obj,tangencies);
  dgs3dObjects:objId = obj;
  jsonGetOrCreateJson(dgs3dObjectsByType,obj.type):objId = obj;
  if(dgs3dIsSetType(type),dgs3dTagNonDeterministicChild(obj));
  forall(parents,parent,
    if(isJSON(parent),
      parent.children = append(parent.children,obj);
    );
  );
  onInit.(obj);
  if(algName!="setElt",
    obj.move.(obj);
    dgs3dRedrawChildren(obj);
  );
  obj;
);
dsg3dSetCoordsOnInit(coords):=(
  lambda(obj,obj.coords=coords,coords->coords)
);
dsg3dSetSizeOnInit(size):=(
  lambda(obj,obj.size=size,size->size)
);
dsg3dSetSizeAndCoordsOnInit(size,coords):=(
  lambda(obj,obj.size=size;obj.coords=coords,coords->coords,size->size)
);
dgs3dOnInitCurve(size,isCircle):=(
  lambda(obj,
    obj.size = size;
    obj.isCircle = isCircle;
  ,size->cglValOrDefault(size,cgl3d.defaults.cylinderSize),isCircle->isCircle)
);
dgs3dNewNumber(value):=(
  dgs3dNewObject("number","freeNumber",[],onInit->dsg3dSetCoordsOnInit(value));
);
dgs3dNewPoint(alg,parents,size->cglNada,visible->true,color->cglNada,alpha->cglNada,incidences->[]):=(
  dgs3dNewObject("point",alg,parents,
    onInit->dsg3dSetSizeOnInit(cglValOrDefault(size,cgl3d.defaults.sphereSize)),
    visible->visible,color->color,alpha->alpha,incidences->incidences);
);
dgs3dNewLine(alg,parents,size->cglNada,visible->true,color->cglNada,alpha->cglNada,incidences->[],tangencies->[]):=(
  dgs3dNewObject("line",alg,parents,
    onInit->dsg3dSetSizeOnInit(cglValOrDefault(size,cgl3d.defaults.cylinderSize)),
    visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
);
dgs3dNewConic(alg,parents,size->cglNada,visible->true,color->cglNada,alpha->cglNada,isCircle->false,incidences->[],tangencies->[]):=(
  dgs3dNewObject("conic",alg,parents,
    onInit->dgs3dOnInitCurve(size,isCircle),
    visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
);
dgs3dNewBiQuadric(alg,parents,size->cglNada,visible->true,color->cglNada,alpha->cglNada,isCircle->false,incidences->[],tangencies->[]):=(
  dgs3dNewObject("biquadric",alg,parents,
    onInit->dgs3dOnInitCurve(size,isCircle),
    visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
);
dgs3dNewPlane(alg,parents,visible->true,color->cglNada,alpha->cglNada,incidences->[],tangencies->[]):=(
  dgs3dNewObject("plane",alg,parents,
    visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
);
dgs3dNewQuadric(alg,parents,visible->true,color->cglNada,alpha->cglNada,isSphere->false,incidences->[],tangencies->[]):=(
  dgs3dNewObject("quadric",alg,parents,
    onInit->lambda(obj,obj.isSphere = isSphere,isSphere->isSphere),
    visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
);
dgs3dNewTrafo(alg,parents):=(
  dgs3dNewObject("transform",alg,parents);
);
dgs3dNewMobiusTrafo(alg,parents):=(
  dgs3dNewObject("mobiusTrafo",alg,parents);
);
dgs3dNewSurface(alg,parents,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewObject("surface",alg,parents,visible->visible,color->color,alpha->alpha);
);
dgs3dMovePointPair = lambda(self,
  dgs3dTracePair(self,eval(self.recompute,apply(self.parents,#.coords)),(x,y)=>dgs3dProjDistanceSq(x,y));
);
dgs3dMovePointSet  = lambda(self,
  dgs3dTraceSet(self,eval(self.recompute,apply(self.parents,#.coords)),(x,y)=>dgs3dProjDistanceSq(x,y));
);
dgs3dMoveLinePair  = lambda(self,
  dgs3dTracePair(self,eval(self.recompute,apply(self.parents,#.coords)),(x,y)=>dgs3dProjDistanceSq(x,y));
);
dgs3dMoveLineSet   = lambda(self,
  dgs3dTraceSet(self,eval(self.recompute,apply(self.parents,#.coords)),(x,y)=>dgs3dProjDistanceSq(x,y));
);
dgs3dMovePlaneSet  = lambda(self,
  dgs3dTraceSet(self,eval(self.recompute,apply(self.parents,#.coords)),(x,y)=>dgs3dProjDistanceSq(x,y));
);
dgs3dNewPointSet(alg,parents,childCount,size->cglNada,visible->true,color->cglNada,alpha->cglNada,incidences->[]):=(
  dgs3dNewObject("{point}",alg,parents,onInit->lambda(obj,
      obj.children = apply(1..childCount,
        dgs3dNewObject("point","setElt",[obj],
          onInit->dsg3dSetSizeOnInit(cglValOrDefault(size,cgl3d.defaults.sphereSize)),
          visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
      )
    ,childCount->childCount,incidences->incidences,tangencies->tangencies),
    onMove->if(childCount == 2,dgs3dMovePointPair,dgs3dMovePointSet),
    visible->visible,color->color,alpha->alpha);
);
dgs3dNewLineSet(alg,parents,childCount,size->cglNada,visible->true,color->cglNada,alpha->cglNada,incidences->[],tangencies->[]):=(
  dgs3dNewObject("{line}",alg,parents,onInit->lambda(obj,
      obj.children = apply(1..childCount,
        dgs3dNewObject("line","setElt",[obj],
          onInit->dsg3dSetSizeOnInit(cglValOrDefault(size,cgl3d.defaults.cylinderSize)),
          visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
      )
    ,childCount->childCount,incidences->incidences,tangencies->tangencies),
    onMove->if(childCount == 2,dgs3dMoveLinePair,dgs3dMoveLineSet),
    visible->visible,color->color,alpha->alpha);
);
dgs3dNewPlaneSet(alg,parents,childCount,visible->true,color->cglNada,alpha->cglNada,incidences->[],tangencies->[]):=(
  dgs3dNewObject("{plane}",alg,parents,onInit->lambda(obj,
      obj.children = apply(1..childCount,
        dgs3dNewObject("plane","setElt",[obj],
          visible->visible,color->color,alpha->alpha,incidences->incidences,tangencies->tangencies);
      )
    ,childCount->childCount,incidences->incidences,tangencies->tangencies),
    onMove->dgs3dMovePlaneSet,
    visible->visible,color->color,alpha->alpha);
);
// TODO? newPointOn 
// ? how to handle free-objects

// TODO? better name
dgs3dUpdateColor(obj,visible->cglNada,color->cglNada,alpha->cglNada):=(
  obj:"color" = cglColor(cglValOrDefault(color,obj:"color"));
  obj:"alpha" = cglValOrDefault(alpha,obj:"alpha");
  obj:"visible" = cglValOrDefault(alpha,obj:"visible");
  obj.redraw.(obj);
);

isRealVec(v):=(min(v,isReal(#)));
dgs3dIsFiniteRealPoint(p):=(
  // all entries real + normal vector non-zero
  isRealVec(p)&p_4!=0
);
dgs3dIsFiniteRealLine(l):=(
  // all entries real + normal vector non-zero
  // TODO: what characterizes infinite lines?
  isRealVec(l)&max(l,#!=0)
);
dgs3dIsFiniteRealPlane(p):=(
  // all entries real + normal vector non-zero
  isRealVec(p)&max(p_(1..3),#!=0)
);
dgs3dIsRealQuadric(q):=(
  min(q,isRealVec(#))
);
dgs3dIsFiniteRealConic(c):=(
  dgs3dIsRealQuadric(c_1) & dgs3dIsFiniteRealPlane(c_2)
);
dgs3dIsRealBiQuadric(q):=(
  dgs3dIsRealQuadric(q_1) & dgs3dIsRealQuadric(q_2)
);
// TODO: only update bounds when object changed
// TODO? use custom cutoff-region instead of default
dgs3dRenderPoint = (self) => (
  regional(p,ptColor);
  p = self:"coords";
  // TODO? only render points within drawing region
  if(self:"visible" == true & dgs3dIsFiniteRealPoint(p), // treat undefined as falsy
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
dgs3dRenderLine = (self) => (
  regional(l,PQ,P,Q);
  l = self:"coords";
  if(self:"visible" == true & dgs3dIsFiniteRealLine(l), // treat undefined as falsy
    // compute intersections of line with clipping sphere
    PQ = dgs3dIntersectQuadricLine(((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,-dgs3dCutoffRadius*dgs3dCutoffRadius)),l);
    if(isRealVec(PQ_1),// real solution
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
dgs3dRenderPlane = (self) => (
  regional(n); // make n visible in callee scopes
  if(self:"visible" == true & dgs3dIsFiniteRealPlane(self:"coords"), // treat undefined as falsy
    if(self:"drawId"==-1,
      n = self:"coords";
      self:"drawId" = surface3d((x,y,z,1)*n,plotModifiers->{"n":self:"coords"},color->self:"color",alpha->self:"alpha");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["n","cglColor","cglAlpha"],[self:"coords",self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
dgs3dRenderQuadric = (self) => (
  regional(M); // make M visible in callee scopes
  // is quadric matrix is not real (up to scalar) then the set of real points is one dimensional (TODO? render 1D set of real points)
  if(self:"visible" == true & dgs3dIsRealQuadric(self:"coords"), // treat undefined as falsy
    if(self:"drawId"==-1,
      M = self:"coords";
      self:"drawId" = surface3d((x,y,z,1)*M*(x,y,z,1),plotModifiers->{"M":self:"coords"},alpha->self:"alpha",color->self:"color");
    ,
      cgl3dObjectSetModifier(cgl3d.getObjects.(self:"drawId"),["M","cglColor","cglAlpha"],[self:"coords",self:"color",self:"alpha"]);
      cgl3d.setVisible.(self:"drawId",true);
    );
  ,if(self:"drawId"!=-1,
      cgl3d.setVisible.(self:"drawId",false);
  ));
);
dgs3dRenderConic = (self) => (
  regional(M); // make M visible in callee scopes
  if(self:"visible" == true & dgs3dIsFiniteRealConic(self:"coords"), // treat undefined as falsy
    if(self:"drawId"==-1,
      M = self:"coords";
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
dgs3dRenderBiQuadric = (self) => (
  regional(M); // make M visible in callee scopes
  if(self:"visible" == true & dgs3dIsRealBiQuadric(self:"coords"), // treat undefined as falsy
    if(self:"drawId"==-1,
      M = self:"coords";
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
dgs3dRenderSurface = (self) => (
  if(self:"visible" == true, // treat undefined as falsy
    if(self:"drawId"==-1,
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

dgs3dInitMovable(point,pinned):=(
  if(cglValOrDefault(pinned,false),
    point.movable = false;
  ,
    point.movable = true;
    dgs3dMovablePoints:(point.id) = point;
  );
  point
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
  dgs3dInitMovable(
    dgs3dNewObject("point","freePoint",[],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.sphereSize),
      dgs3dRP3Normalize(dgs3dPoint4(p))
    ),visible->visible,color->color,alpha->alpha)
  ,pinned)
);
randomPoint3d(size->cglNada,pinned->false,visible->true,color->cglNada,alpha->cglNada):=(
  point3d((randomNormal(),randomNormal(),randomNormal()),size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
);
randomPoint3dOn(obj,size->cglNada,pinned->false,visible->true,color->cglNada,alpha->cglNada):=(
  regional(P0);
  P0 = (randomNormal(),randomNormal(),randomNormal(),1);
  // TODO: better way to choose random initial point on ...
  if(obj.type == "line",
    pointOnLine3d(obj,P0,size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
  ,if(obj.type == "plane",
    pointOnPlane3d(obj,P0,size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
  ,if(obj.type == "quadric",
    pointOnQuadric3d(obj,P0,size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
  ,if(obj.type == "conic",
    pointOnConic3d(obj,P0,size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
  ,if(obj.type == "biquadric",
    pointOnBiQuadric3d(obj,P0,size->size,pinned->pinned,visible->visible,color->color,alpha->alpha);
  ,
    cglLogError("random point on "+obj.type+" is not supported");
  )))))
);

// p: vec6 = (l11,l12,l13,l14,l23,l24,l34) , visible: bool = should object be drawn
line3d(l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dFreeLine(l,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dFreeLine(l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewObject("line","freeLine",[],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.cylinderSize),
      dgs3dRP3Normalize(l)
    ),visible->visible,color->color,alpha->alpha);
);

// p: vec4 = (x,y,z,w) , visible: bool = should object be drawn
plane3d(p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dFreePlane(p,visible->visible,color->color,alpha->alpha);
);
dgs3dFreePlane(p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewObject("plane","freePlane",[],
    onInit->dsg3dSetCoordsOnInit(dgs3dRP3Normalize(p)),
    visible->visible,color->color,alpha->alpha);
);
// p: mat4, visible: bool = should object be drawn
quadric3d(M,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dFreeQuadric(M,visible->visible,color->color,alpha->alpha);
);
dgs3dFreeQuadric(M,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewObject("quadric","freeQuadric",[],
    onInit->dsg3dSetCoordsOnInit(dgs3dRP3Normalize(M+transpose(M))),
    visible->visible,color->color,alpha->alpha);
);
randomQuadric3d(visible->true,color->cglNada,alpha->cglNada):=(
  quadric3d(apply(1..4,apply(1..4,randomNormal(),randomNormal(),randomNormal())),
    visible->visible,color->color,alpha->alpha
  );
);
randomQuadricBy9P(size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  pts = apply(1..9,randomPoint3d(size->size,visible->visible,color->color,alpha->alpha));
  quadricBy9P(pts);
);

transformation3d(M):=(
  dgs3dFreeTransformation(M)
);
dgs3dFreeTransformation(M):=(
  dgs3dNewObject("transform","freeTransform",[],onInit->dsg3dSetCoordsOnInit(M));
);

// helpers for initial point for pointOn... operations
// finds point on ... priorities: finite > real > close to initial point
// TODO: find point on ... near view-ray (needed for click on object to define point)
dgs3dProjectPointToLine(P,l):=(
  regional(v,K);
  v = dgs3dLineDirection(l);
  if(|v|>0 & P_4 != 0,
    // intersect plane through P orthogonal to line with line
    dgs3dEpsilon46((P_4*v_1,P_4*v_2,P_4*v_3,-v*P_(1..3)),l);
  ,
    // project P into K, `kernel(.)` always returns orthogonal vectors
    K = transpose(kernel(dgs3dLineMatrix(l)));
    dgs3dRP3Normalize(sum(K,v,(P*v)*v));
  );
);
dgs3dFindPointOnLine(l,P0):=(
  dgs3dProjectPointToLine(P0,l:"coords")
);
dgs3dProjectPointToPlane0(P,p):=(
  regional(P3,n);
  P3 = P_(1..3)/P_4; // TODO? div0 for vector/scalar division
  n = p_(1..3);
  P3 = P3 - n*(p_4+P3*n)/(n*n);
  (P3_1,P3_2,P3_3,1)
);
dgs3dProjectPointToPlane(P,p):=(
  dgs3dRP3Normalize(dgs3dProjectPointToPlane0(P,p))
);
dgs3dFindPointOnPlane(p,P0):=(
  regional(n);
  p = p:"coords";
  n = p_(1..3);
  if(|n*n|>0,
    // p_1..3*P_1..3 = p_4*P_4
    dgs3dProjectPointToPlane(P0,p)
  ,if(|P0_(1..3)*P0_(1..3)|>0,  // plane is infinite -> pick infinite point close to P0
    (P0_1,P0_2,P0_3,0)
  ,
    (1,0,0,0)
  ))
);
dgs3dSelectClosest(pts,P,unique->false):=(
  regional(minDist,soln);
  if(length(pts)>0,
    soln = min(pts,(dgs3dProjDistanceSq(#,P),#));
    if(if(unique & length(pts)>1,soln_1 > min(pairs(pts),dgs3dProjDistanceSq(#_1,#_2)),false),
      cglUndefinedVal()
    ,soln_2);
  ,
    cglUndefinedVal()
  );
);
dgs3dSelectFiniteRealOrMidpoint(PQ,P,unique->false):=(
  regional(AB);
  AB = select(PQ,dgs3dIsFiniteRealPoint(#));
  if(unique % length(AB) > 0,
    dgs3dSelectClosest(AB,P,unique->unique)
  ,PQ_1+PQ_2);
);
dgs3dQuadricProjectionStep(q,P,X,unique->false):=(
  regional(p,l,PQ);
  p = q*X;
  if(dgs3dIsFiniteRealPlane(p),
    // orthogonal line to p through P
    l = dgs3d.alg.orthogonalLine.(p,P);
    // 2. intersect line with quadric
    dgs3dSelectFiniteRealOrMidpoint(dgs3dIntersectQuadricLine(q,l),P,unique->unique);
  ,// TODO: handle case of non-finite polar plane
    cglUndefinedVal()
  );
);
dgs3dTryProjectPointToQuadric(P,q,unique->false):=(
  regional(X);
  X = P;
  forall(1..4,X = dgs3dQuadricProjectionStep(q,P,X));
  dgs3dQuadricProjectionStep(q,P,X,unique->unique);
);
dgs3dFindPointOnQuadric(q,P0):=(
  regional(P);
  P = dgs3dTryProjectPointToQuadric(P0,q:"coords");
  if(!isUndefined(P),P,
    P0 // TODO: use axes/planes to find real point
  )
);
dgs3dConicProjectionStep(q,p,P,X,unique->false):=(
  regional(np,nq,l);
  nq = q * X;
  if(dgs3dIsFiniteRealPlane(nq),
    nq = nq_(1..3);
    np = p_(1..3);
    nq = nq - ((np*nq)/(np*np)) * np; // project normal into plane
    l = dgs3d.alg.orthogonalLine.(nq,P);
    dgs3dSelectFiniteRealOrMidpoint(dgs3dIntersectQuadricLine(q,l),P,unique->unique);
  ,// TODO: handle case of non-finite polar plane
    cglUndefinedVal()
  );
);
dgs3dTryProjectPointToConic(P,c,unique->false):=(
  regional(X,q,p);
  [q, p] = c;
  // 1. project point into plane
  X = P = dgs3dProjectPointToPlane(P,p);
  forall(1..4,X = dgs3dConicProjectionStep(q,p,P,X));
  dgs3dConicProjectionStep(q,p,P,X,unique->unique);
);
dgs3dFindPointOnConic(c,P0):=(
  regional(P);
  P = dgs3dTryProjectPointToConic(P0,c.coords);
  if(!isUndefined(P),P,
    P0 // TODO: find point in degenerate case
  )
);
dgs3dPlaneWithNormalThroughPoint(n,P):=(
  (n_1*P_4,n_2*P_4,n_3*P_4,-P_(1..3)*n)
);
dgs3dBiQuadricProjectionStep(q1,q2,P,X,unique->false):=(
  regional(p1,p2,n,p,PQRS);
  p1 = q1*P; p2 = q2*P; // TODO: handle infinite planes
  p = dgs3dPlaneWithNormalThroughPoint(cross(p1_(1..3),p2_(1..3)),P);
  PQRS = apply(dgs3dComputeIntersectionsQQP(q1,q2,p),dgs3dRP3Normalize(#));
  ABCD = select(PQRS,dgs3dIsFiniteRealPoint(#));
  if(unique % length(ABCD)>0,
    dgs3dSelectClosest(ABCD,P,unique->unique)
  , // no real intersection -> pick closest real intersection of line-pairs through intersections
    dgs3dSelectClosest(select(
      [dgs3dComputeIntersectionLL(dgs3dEpsilon44(PQRS_1,PQRS_2),dgs3dEpsilon44(PQRS_3,PQRS_4)),
      dgs3dComputeIntersectionLL(dgs3dEpsilon44(PQRS_1,PQRS_3),dgs3dEpsilon44(PQRS_2,PQRS_4)),
      dgs3dComputeIntersectionLL(dgs3dEpsilon44(PQRS_1,PQRS_4),dgs3dEpsilon44(PQRS_2,PQRS_3))]
    ,dgs3dIsFiniteRealPoint(#)),P,unique->unique);
  )
);
dgs3dTryProjectPointToBiQuadric(P,b,unique->false):=(
  regional(q1,q2,X);
  [q1,q2] = b;
  X = P;
  forall(1..4,X = dgs3dBiQuadricProjectionStep(q1,q2,P,X));
  dgs3dBiQuadricProjectionStep(q1,q2,P,X,unique->unique);
);
dgs3dFindPointOnBiQuadric(b,P0):=(
  regional(P);
  P = dgs3dTryProjectPointToBiQuadric(P0,b.coords);
  if(!isUndefined(P),P,
    P0 // TODO: find point in degenerate case
  )
);
// p0: vec4 (x,y,z,w), l: line , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnLine3d(l,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnLine(l,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnLine(l,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dInitMovable(dgs3dNewObject("point","onLine",[l],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.sphereSize),
      dgs3dFindPointOnLine(l,dgs3dPoint4(p0))
    ),onMove->lambda(self,
      self.coords = dgs3dProjectPointToLine(self.coords,((self.parents)_1).coords);
      DGS3DmOVEoK
    ),visible->visible,color->color,alpha->alpha,incidences->[l])
  ,pinned);
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
  dgs3dInitMovable(dgs3dNewObject("point","onPlane",[s],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.sphereSize),
      dgs3dFindPointOnPlane(s,dgs3dPoint4(p0))
    ),onMove->lambda(self,
      self.coords = dgs3dProjectPointToPlane(self.coords,((self.parents)_1).coords);
      DGS3DmOVEoK
    ),visible->visible,color->color,alpha->alpha,incidences->[s])
  ,pinned)
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
dgs3dSetIfDefined(self,coords):=(
 if(isUndefined(coords),DGS3DmOVErETRY,
    self:"coords" = coords;
    DGS3DmOVEoK
  )
);
dgs3dPointOnQuadric(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dInitMovable(dgs3dNewObject("point","onQuadric",[q],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.sphereSize),
      dgs3dFindPointOnQuadric(q,dgs3dPoint4(p0))
    ),onMove->lambda(self,
      dgs3dSetIfDefined(self,
        dgs3dTryProjectPointToQuadric(self.coords,((self.parents)_1).coords,unique->true)
      )
    ),visible->visible,color->color,alpha->alpha,incidences->[q])
  ,pinned)
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
  dgs3dInitMovable(dgs3dNewObject("point","onConic",[q],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.sphereSize),
      dgs3dFindPointOnConic(q,dgs3dPoint4(p0))
    ),onMove->lambda(self,
      dgs3dSetIfDefined(self,
        dgs3dTryProjectPointToConic(self.coords,((self.parents)_1).coords,unique->true)
      )
    ),visible->visible,color->color,alpha->alpha,incidences->[q])
  ,pinned)
);
pointOnConic3d(c,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnConic(c,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnConic(c,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnConic(c,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
// p0: vec3|vec4 = (x,y,z,w=1), q: bi-quadric-curve , size: real = radius, pinned:bool = fixed position, visible: bool = should object be drawn
pointOnBiQuadric3d(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnBiQuadric(q,p0,size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnBiQuadric(q,p0,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dInitMovable(dgs3dNewObject("point","onBiQuadric",[q],
    onInit->dsg3dSetSizeAndCoordsOnInit(
      cglValOrDefault(size,cgl3d.defaults.sphereSize),
      dgs3dFindPointOnBiQuadric(q,dgs3dPoint4(p0))
    ),onMove-> lambda(self,
      dgs3dSetIfDefined(self,
        dgs3dTryProjectPointToBiQuadric(self.coords,((self.parents)_1).coords,unique->true)
      );
    ),visible->visible,color->color,alpha->alpha,incidences->[q])
  ,pinned);
);
pointOnBiQuadric3d(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnBiQuadric(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
);
dgs3dPointOnBiQuadric(q,size->cglNada,visible->true,pinned->false,color->cglNada,alpha->cglNada):=(
  dgs3dPointOnBiQuadric(q,(0,0,0,1),size->size,visible->visible,pinned->pinned,color->color,alpha->alpha);
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
dgs3d.alg.joinPP = (P1,P2) => dgs3dRP3Normalize(dgs3dEpsilon44(P1,P2));
// p1: point, p2: point, size:real = radius, visible: bool = should object be drawn
dgs3dJoin2P(P1,P2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("joinPP",[P1,P2],size->size,visible->visible,color->color,alpha->alpha,incidences->[P1,P2])
);
dgs3d.alg.joinPL = (P,l) => dgs3dRP3Normalize(dgs3dEpsilon46(P,dgs3dDualLine(l)));
// p1: point, l1: line, visible: bool = should object be drawn
dgs3dJoinPL(P1,l1,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("joinPL",[P1,l1],visible->visible,color->color,alpha->alpha,incidences->[P1,l1])
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
dgs3d.alg.join3P = (P1,P2,P3) => dgs3dRP3Normalize(dgs3dEpsilon444(P1,P2,P3));
// p1: point, p2: point, p3: point, visible: bool = should object be drawn
dgs3dJoin3P(P1,P2,P3,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("join3P",[P1,P2,P3],visible->visible,color->color,alpha->alpha,incidences->[P1,P2,P3])
);
dgs3d.alg.join3L = (l1,l2,l3) => (
  regional(M);
  M = dgs3dLineMatrix(l1)*dgs3dLineMatrix(dgs3dDualLine(l2))*dgs3dLineMatrix(l3);
  dgs3dRP3Normalize(M + transpose(M))
);
// l1: point, l2: point, l3: point, visible: bool = should object be drawn
dgs3dJoin3L(l1,l2,l3,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("join3L",[l1,l2,l3],visible->visible,color->color,alpha->alpha,incidences->[l1,l2,l3])
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
  ,if(a:"type" == "conic" & b:"type" == "conic",
    dgs3dMeetConicConic(b,a,size->size,visible->visible,color->color,alpha->alpha);
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
  ))))))))))))))))))));
);
dgs3d.alg.meetPP = (p1,p2) => dgs3dRP3Normalize(dgs3dDualLine(dgs3dEpsilon44(p1,p2)));
// p1: plane, p2: plane, size:real = radius, visible: bool = should object be drawn
dgs3dMeet2P(p1,p2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("meetPP",[p1,p2],size->size,visible->visible,color->color,alpha->alpha,incidences->[p1,p2]);
);
dgs3d.alg.meetPL = (p,l) => dgs3dRP3Normalize(dgs3dEpsilon46(p,l));
// p1: plane, l1: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeetPL(p1,l1,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("meetPL",[p1,l1],size->size,visible->visible,color->color,alpha->alpha,incidences->[p1,l1]);
);
// TODO? restrict to co-planar lines
dgs3d.alg.meetLL = (l1,l2) => (
  l1 = dgs3dLineMatrix(dgs3dDualLine(l1));
  l2 = dgs3dLineMatrix(l2);
  dgs3dRP3Normalize(max(l2*l1,(#*#,#))_2);
);
// l1: line, l2: line => point, size:real = radius, visible: bool = should object be drawn
dgs3dMeet2L(l1,l2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("meetLL",[l1,l2],size->size,visible->visible,color->color,alpha->alpha,incidences->[l1,l2])
);
dgs3d.alg.joinLL = (l1,l2) => (
  l1 = dgs3dLineMatrix(dgs3dDualLine(l1));
  l2 = dgs3dLineMatrix(l2);
  dgs3dRP3Normalize(max(l1*l2,(#*#,#))_2);
);
// l1: line, l2: line => plane, visible: bool = should object be drawn
dgs3dJoin2L(l1,l2,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("joinLL",[l1,l2],size->size,visible->visible,color->color,alpha->alpha,incidences->[l1,l2])
);

dgs3d.alg.meetQL = (Q,l) => (
  dgs3dIntersectQuadricLine(Q,l)
);
// Q1: quadric, l1: line, size:real = radius, visible: bool = should object be drawn
dgs3dMeetQL(Q1,l1,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetQL",[Q1,l1],2,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[Q1,l1]);
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
dgs3d.alg.meet3P = (p1,p2,p3) => dgs3dRP3Normalize(dgs3dEpsilon444(p1,p2,p3));
dgs3dMeet3P(p1,p2,p3,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("meet3P",[p1,p2,p3],size->size,visible->visible,color->color,alpha->alpha,incidences->[p1,p2,p3]);
);
dgs3d.alg.meetQPP = (Q,p1,p2) => (
  dgs3dIntersectQuadricDualLine(Q,dgs3dEpsilon44(p1,p2))
); 
// Q1: quadric, p1: plane, p2: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQpp(Q1,p1,p2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetQPP",[Q1,p1,p2],2,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[Q1,p1,p2]);
);
dgs3d.alg.meetCP = (c,p) => (
  dgs3dIntersectQuadricDualLine(c_1,dgs3dEpsilon44(c_2,p))
);
// c: conic, p: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetCp(c,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetCP",[c,p],2,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[c,p]);
);
dgs3d.alg.meetCL = (c,l) => (
  dgs3dIntersectQuadricLine(c_1,l);
);
// c: conic, l: line ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetCL(c,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewPointSet("meetCL",[c,l],2,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3d.alg.meetCC = (c1,c2) => (
  // TODO? handle intersections in non-coplanar case
  dgs3dComputeIntersectionsQQP(c1_1,c2_1,c1_2);
);
// c1,c2: conic ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetConicConic(c1,c2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewPointSet("meetCC",[c1,c2],4,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dComputeIntersectionsQQP(Q1,Q2,p):=(
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
dgs3d.alg.meetQQP = (q1,q2,p) => (dgs3dComputeIntersectionsQQP(q1,q2,p));
dgs3d.alg.meetQC = (q,c) => (dgs3dComputeIntersectionsQQP(q,c_1,c_2));
dgs3d.alg.meetBP = (b,p) => (dgs3dComputeIntersectionsQQP(b_1,b_2,p));
// q1: quadric, q2: quadric, p: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQQp(q1,q2,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetQQP",[q1,q2,p],4,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[q1,q2,p]);
);
// q: quadric, c: conic ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQuadricConic(q,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetQC",[q,c],4,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[q,c]);
);
// b: bi-quadric, p: plane ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetBiQuadricPlane(b,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetBP",[b,p],4,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[b,p]);
);
dgs3dIntersects3Q(q1,q2,q3):=(
  dgs3de3q3(dgs3dQuadAsVec(q1),dgs3dQuadAsVec(q2),dgs3dQuadAsVec(q3));
);
dgs3d.alg.meetBQ = (b,q) => (
  dgs3dIntersects3Q(b_1,b_2,q)
);
dgs3d.alg.meet3Q = (q1,q2,q3) => (
  dgs3dIntersects3Q(q1,q2,q3)
);
// b: bi.quadric, q: quadric ; size:real = radius, visible: bool = should object be drawn
dgs3dMeetBiQuadricQuadric(b,q,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meetBQ",[b,q],8,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[b,q]);
);

// q1,q2,q3: quadric ; size:real = radius, visible: bool = should object be drawn
dgs3dMeet3Q(q1,q2,q3,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPointSet("meet3Q",[q1,q2,q3],8,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[q1,q2,q3]);
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
  if(isList(a) & isList(b),
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
  if(isUndefined(res),
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
    if(!isUndefined(res),
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
dgs3d.alg.polarPl = (q,P) => dgs3dRP3Normalize(q*P);
dgs3d.alg.polarLn = (q,l) => (
  regional(Q); Q = adjoint4(q);
  dgs3dRP3Normalize(dgs3dLineFromDualMatrix(Q*dgs3dLineMatrix(l)*Q));
);
dgs3d.alg.polarPt = (q,p) => dgs3dRP3Normalize(adjoint4(q)*p);
// q: quadric, P: point => plane, visible: bool = should object be drawn
dgs3dPolarPlane(q,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("polarPl",[q,P],visible->visible,color->color,alpha->alpha);
);
// q: quadric, l: line => line, visible: bool = should object be drawn
dgs3dPolarLine(q,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("polarLn",[q,l],size->size,visible->visible,color->color,alpha->alpha);
);
// q: quadric, p: plane => point, visible: bool = should object be drawn
dgs3dPolarPoint(q,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("polarPt",[q,p],size->size,visible->visible,color->color,alpha->alpha);
);
dgs3d.alg.conicPolarLn = (c,P) => (
  regional(q,p);
  [q,p] = c;
  q = q + transpose([p])*[p];
  dgs3dRP3Normalize(dgs3dDualLine(dgs3dEpsilon44(q*P,p)))
);
dgs3d.alg.conicPolarPt = (c,l) => (
  regional(q,p,Q);
  [q,p] = c; 
  Q = adjoint4(q + transpose([p])*[p]); // polar degenerates if q is othrogonal to p
  dgs3dRP3Normalize(dgs3dEpsilon46(p,dgs3dLineFromDualMatrix(Q*dgs3dLineMatrix(l)*Q)));
);
// c: conic, P: point => line, visible: bool = should object be drawn
dgs3dConicPolarLine(c,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewLine("conicPolarLn",[c,P],size->size,visible->visible,color->color,alpha->alpha);
);
// c: conic, l: line => point, visible: bool = should object be drawn
dgs3dConicPolarPoint(c,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure co-planar
  dgs3dNewPoint("conicPolarPt",[c,l],size->size,visible->visible,color->color,alpha->alpha);
);
dgs3d.alg.biQuadricPolarLn = (b,P) => (
  dgs3dRP3Normalize(dgs3dDualLine(dgs3dEpsilon44((b_1)*P,(b_2)*P)))
);
// b: bi-quadric, p: point => line, visible: bool = should object be drawn
dgs3dBiQuadricPolarLine(b,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("biQuadricPolarLn",[b,P],size->size,visible->visible,color->color,alpha->alpha);
);


dgs3dScaleMatrixColumns(M,v):=(
  apply(M,r,apply(1..length(v),k,r_k*v_k))
);
// map e1 -> A_1, e2 -> A_2, e3 -> A_3, e4 -> A_4, (1,1,1,1) -> A_5
dgs3dHalfTrafo(A1,A2,A3,A4,A5):=(
  regional(T);
  T = transpose((A1,A2,A3,A4));
  dgs3dScaleMatrixColumns(T,linearSolve(T,A5));
);
// q: mat4, P: vec4
dgs3d.alg.quadricLines = (q,P) => (
  regional(p,T,S);
  p = q*P;
  T = dgs3dMapPinfTo(p);
  S = T*q*transpose(T); // transform q (by T^-1 = T^T)
  // decompose top-left 3x3 matrix
  apply(dgs3dDecompose2DConic(apply(S_(1..3),#_(1..3))),
    dgs3dRP3Normalize(dgs3dLineFromMatrix(transpose(T)*
      dgs3dLineMatrix((0,0,#_1,0,#_2,#_3))//dgs3dDualLine(dgs3dEpsilon44((#_1,#_2,#_3,0),(0,0,0,1)));
    *(T)))
  );
);
// q: quadric, P: point => 2 x line, visible: bool = should object be drawn
dgs3dQuadricLines(q,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  // TODO: ensure P on q
  dgs3dNewLineSet("quadricLines",[q,P],2,
    size->size,visible->visible,color->color,alpha->alpha,incidences->[q,P]);
);
dgs3d.alg.completeCayleyOctent = (p1,p2,p3,p4,p5,p6,p7) => (
  regional(T,S,v,A,B);
  // find transform that maps first 5 points to e_1,e_2,e_3,e_4,(1,1,1,1)
  T = dgs3dHalfTrafo(p1,p2,p3,p4,p5);
  S = inverse(T);
  A = S * p6;
  B = S * p7;
  // compute 8th point in transformed context then transform back
  // use equation from: QUARTIC CURVES AND THEIR BITANGENTS (arXiv:1008.4104v2): Proposition 7.1
  dgs3dRP3Normalize(T*[(
    A_2*B_3- A_2*B_4- A_3*B_2+ A_3*B_4+ A_4*B_2- A_4*B_3
    )/(
    A_2*A_3*B_2*B_4
    - A_2*A_3*B_3*B_4
    - A_2*A_4*B_2*B_3
    + A_2*A_4*B_3*B_4
    + A_3*A_4*B_2*B_3
    - A_3*A_4*B_2*B_4
    ),
    (
    A_1*B_3- A_1*B_4- A_3*B_1+ A_3*B_4+ A_4*B_1- A_4*B_3
    )/(
    A_1*A_3*B_1*B_4
    - A_1*A_3*B_3*B_4
    - A_1*A_4*B_1*B_3
    + A_1*A_4*B_3*B_4
    + A_3*A_4*B_1*B_3
    - A_3*A_4*B_1*B_4
    ),
    (
    A_1*B_2- A_1*B_4- A_2*B_1+ A_2*B_4+ A_4*B_1- A_4*B_2
    )/(
    A_1*A_2*B_1*B_4
    - A_1*A_2*B_2*B_4
    - A_1*A_4*B_1*B_2
    + A_1*A_4*B_2*B_4
    + A_2*A_4*B_1*B_2
    - A_2*A_4*B_1*B_4
    ),
    (
    A_1*B_2- A_1*B_3- A_2*B_1+ A_2*B_3+ A_3*B_1- A_3*B_2
    )/(
    A_1*A_2*B_1*B_3
    - A_1*A_2*B_2*B_3
    - A_1*A_3*B_1*B_2
    + A_1*A_3*B_2*B_3
    + A_2*A_3*B_1*B_2
    - A_2*A_3*B_1*B_3
  )]);
);
// pts: [point; 7] => point
dgs3dCompleteCayleyOctent(pts,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("completeCayleyOctent",pts,size->size,visible->visible,color->color,alpha->alpha);
);


dgs3dComputeQuadricBy9(pts):=(
  regional(v,ptsSq);
  ptsSq = apply(pts,dgs3dSqCoords(#));
  v = transpose(kernel(append(ptsSq,(0,0,0,0,0,0,0,0,0,0))))_1;
  ((2*v_1,v_2,v_3,v_4),(v_2,2*v_5,v_6,v_7),(v_3,v_6,2*v_8,v_9),(v_4,v_7,v_9,2*v_10));
);
dgs3d.alg.quadricBy9Pt = (P1,P2,P3,P4,P5,P6,P7,P8,P9) => (
  dgs3dRP3Normalize(dgs3dComputeQuadricBy9([P1,P2,P3,P4,P5,P6,P7,P8,P9]))
);
dgs3d.alg.quadricBy9Pl = (p1,p2,p3,p4,p5,p6,p7,p8,p9) => (
  dgs3dRP3Normalize(adjoint4(dgs3dComputeQuadricBy9([p1,p2,p3,p4,p5,p6,p7,p8,p9])))
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
  dgs3dNewQuadric("quadricBy9Pt",pts,visible->visible,color->color,alpha->alpha,incidences->pts);
);
// pts: [plane; 9] => quadric, visible: bool = should object be drawn
quadricBy9Planes(planes,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dQuadric9plane(planes,visible->visible,color->color,alpha->alpha);
);
dgs3dQuadric9plane(planes,visible->true,color->cglNada,alpha->cglNada):=(
  if(length(planes)!=9,
    cglLogWarning("wrong number of planes expected 9 got "+length(planes));
  );
  dgs3dNewQuadric("quadricBy9Pl",visible->visible,color->color,alpha->alpha,tangencies->planes);
);
dgs3d.alg.planesAsQuadric = (p,q) => (
  regional(M);
  M = transpose([p])*[q];
  dgs3dRP3Normalize(M+transpose(M));
);
// degenerate quadric given by two planes
// p: plane -> quadric
dgs3dPlanesAsQuadric(p,q,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("planesAsQuadric",[p,q],visible->visible,color->color,alpha->alpha);
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
dgs3dComputeConicBy5(p,pts,dual->false):=(
  regional(T,a,b,c,d,e,G,H,M,v,w,r);
  // transform p to p-inf & project points to p
  T = dgs3dMapPinfTo(p);
  // find conic in RP2
  [a,b,c,d,e] = apply(pts,(T*#)_(1..3));
  G = transpose([cross(d,a)])*[cross(b,e)];
  H = transpose([cross(d,b)])*[cross(a,e)];
  M = (c*G*c)*H-(c*H*c)*G;
  M = M + transpose(M);
  if(dual,
    M = adjoint3(M);
  );
  M = conjugate(max(M,max(#,(|#|,#)))_2)*M; // scale by conjugate of maximum entry to avoid scalar multiples of real matrix
  // find v,r such that (M v;v r)*(p_1,p_2,p_3,0) = (0,0,0,0)
  w = T*(p_1,p_2,p_3,0);
  if(w_4 != 0,
    v = -(M*w_(1..3))/w_4;
    r = -(v*w_(1..3))/w_4;
  ,
    v = (0,0,0);
    r = 0;
  );
  // transform quadric back
  transpose(T)*((M_1_1,M_1_2,M_1_3,v_1),(M_2_1,M_2_2,M_2_3,v_2),(M_3_1,M_3_2,M_3_3,v_3),(v_1,v_2,v_3,r))*T;
);

dgs3d.alg.conicBy5P = (P1,P2,P3,P4,P5) => (
  regional(p);
  // find common plane
  p = dgs3dRP3Normalize(dgs3dEpsilon444(P1,P2,P3));
  // find quadric in plane
  [dgs3dRP3Normalize(dgs3dComputeConicBy5(p,[P1,P2,P3,P4,P5])),p]
);
dgs3d.alg.conicBy5L = (l1,l2,l3,l4,l5) => (
  regional(K,p,A,B,C,D,E);
  // find common plane
  K = dgs3dLineMatrix(dgs3dDualLine(l1))*dgs3dLineMatrix(l2);
  p = dgs3dRP3Normalize(max(K,(#*#,#))_2);
  [dgs3dRP3Normalize(dgs3dComputeConicBy5(p,
    apply((l1,l2,l3,l4,l5),dgs3dEpsilon46(p,dgs3dDualLine(#))),
  dual->true)),p];
);
dgs3d.alg.biQuadricBy8 = (P1,P2,P3,P4,P5,P6,P7,P8) => (
  [
    dgs3dRP3Normalize(dgs3dComputeQuadricBy9([P1,P2,P3,P4,P5,P6,P7,P8,(random(),random(),random(),random())])),
    dgs3dRP3Normalize(dgs3dComputeQuadricBy9([P1,P2,P3,P4,P5,P6,P7,P8,(random(),random(),random(),random())]))
  ]
);

// TODO? ensure co-planar
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
  dgs3dNewConic("conicBy5P",[A,B,C,D,E],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->false,incidences->[A,B,C,D,E]);
);
dgs3dConic5lines(A,B,C,D,E,size->cglNada,visible->true,xcolor->cglNada,alpha->cglNada):=(
  dgs3dNewConic("conicBy5L",[A,B,C,D,E],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->false,tangencies->[A,B,C,D,E]);
);
biQuadricBy8Points(pts,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dBiQuadric8points(pts,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dBiQuadric8points(pts,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewBiQuadric("biQuadricBy8",pts,
    size->size,visible->visible,color->color,alpha->alpha,isCircle->false,incidences->pts);
);
dgs3d.alg.coneByConicPoint = (c,P) => (
  regional(q,p,T,A,v,x);
  [q,p] = c;
  T = dgs3dMapPinfTo(p);
  P = T*P;
  P = P/P_4;
  A = T*q*transpose(T);
  A = apply(A_(1..3),#_(1..3));
  x = P_(1..3);
  v = -A * x;
  transpose(T)*(
    (A_1_1,A_1_2,A_1_3,v_1),
    (A_2_1,A_2_2,A_2_3,v_2),
    (A_3_1,A_3_2,A_3_3,v_3),
    (v_1,v_2,v_3,x*A*x)
  )*T
);
dgs3d.alg.quadricInPencil = (q1,q2,P) => (dgs3dRP3Normalize((P*q1*P)*q2 - (P*q2*P)*q1));
// c: conic, P: point
dgs3dConeByConicPoint(c,P,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("coneByConicPoint",[c,P],visible->visible,color->color,alpha->alpha,incidences->[c,P]);
);
// cone of all tagent lines to q through p
// q: quadric, P: point (macro operation)
dgs3dTangentCone(q,P,visible->true,color->cglNada,alpha->cglNada):=(
  regional(polar,tangencyConic);
  polar = polar3d(q,P,visible->false);
  dgs3dQuadricInPencil(q,dgs3dPlanesAsQuadric(polar,polar,visible->false),P,
    visible->visible,color->color,alpha->alpha,incidences->[P]);
);
// find quadric in pecil through q1 and q2 that does through P
// q1: quadric, q2: quadric, P: point -> quadric
dgs3dQuadricInPencil(q1,q2,P,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("quadricInPencil",[q1,q2,P],visible->visible,color->color,alpha->alpha,incidences->[P]);
);

dgs3d.alg.quadricPlanes = (q) => (
  regional(B);
  B = apply(q_(1..3),#_(1..3));
  apply(transpose(eigenvectors(B)),n,
    (n_1*(n*B*n),n_2*(n*B*n),n_3*(n*B*n),n*q_4_(1..3))
  );
);
dgs3d.alg.quadricAxes = (q) => (
  apply(pairs(dgs3d.alg.quadricPlanes.(q)),
    dgs3dDualLine(dgs3dEpsilon44(#_1,#_2))
  );
);
dgs3d.alg.quadricCenter = (q) => (
  dgs3dRP3Normalize(adjoint4(q)_4)
);
// q: quadric => symmetry planes, 
dgs3dQuadricPlanes(q,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlaneSet("quadricPlanes",[q],3,size->size,visible->visible,color->color,alpha->alpha);
);
// q: quadric => symmetry axes, 
dgs3dQuadricAxes(q,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLineSet("quadricAxes",[q],3,size->size,visible->visible,color->color,alpha->alpha);
);
// q: quadric => point, 
dgs3dQuadricCenter(q,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("quadricCenter",[q],size->size,visible->visible,color->color,alpha->alpha);
);
////////////////
// Euclidean Operations
////////////////

dgs3d.alg.parallelLine = (l,Pt) => (
  dgs3dRP3Normalize(dgs3dEpsilon44(Pt,dgs3dEpsilon46((0,0,0,1),l)))
);
dgs3d.alg.parallelPlane = (pl,Pt) => (
  dgs3dRP3Normalize(dgs3dEpsilon46(Pt,dgs3dEpsilon44((0,0,0,1),pl)))
);
dgs3d.alg.parallel2L = (l1,l2) => (
  regional(n1,n2);
  n1 = dgs3dLineDirection(l1);
  n2 = dgs3dLineDirection(l2);
  dgs3dRP3Normalize(dgs3dPlaneWithNormalThroughPoint(cross(n1,n2),dgs3dEpsilon46((n2_1,n2_2,n2_3,0),l2)));
);
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
// l: line, P: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dParallelLine(l,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("parallelLine",[l,P],size->size,visible->visible,color->color,alpha->alpha,incidences->[P]);
);
// P: plane, p: point => plane; size:real = radius, visible: bool = should object be drawn
dgs3dParallelPlane(p,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("parallelPlane",[p,P],visible->visible,color->color,alpha->alpha,incidences->[P]);
);
// parallel to l1 through l2
// l1,l2: line => plane; visible: bool = should object be drawn
dgs3dParallel2Line(l1,l2,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("parallel2L",[l1,l2],visible->visible,color->color,alpha->alpha,incidences->[l2]);
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
// p: vec3|vec4 line/normal, P: point
dgs3d.alg.orthogonalLine = (p,P) => dgs3dRP3Normalize(dgs3dEpsilon44(P,P+(p_1,p_2,p_3,0)));
dgs3d.alg.orthogonalPlaneLine = (p,l) => (
  regional(n1);
  n1 = dgs3dLineDirection(l);
  dgs3dRP3Normalize(dgs3dPlaneWithNormalThroughPoint(
    cross(p_(1..3),n1),
    dgs3dEpsilon46((n1_1,n1_2,n1_3,0),l)
  ));
);
dgs3d.alg.orthogonalPlane = (l,P) => (dgs3dRP3Normalize(dgs3dPlaneWithNormalThroughPoint(dgs3dLineDirection(l),P)));
dgs3d.alg.orthogonal2L = (l1,l2) => (
  regional(n1,n2,n,q);
  n1 = dgs3dLineDirection(l1);
  n2 = dgs3dLineDirection(l2);
  n = cross(n1,n2);
  // intersect lines with planes through 0 normal to line
  q = dgs3dEpsilon46(dgs3dPlaneWithNormalThroughPoint(
    cross(n1,n),
    dgs3dEpsilon46((n1_1,n1_2,n1_3,0),l1)
  ),l2);
  dgs3dRP3Normalize(dgs3dEpsilon44(q,q+(n_1,n_2,n_3,0)));
);
// p: plane, P: point => line; size:real = radius, visible: bool = should object be drawn
dgs3dOrthogonalLine(p,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  regional(obj);
  dgs3dNewLine("orthogonalLine",[p,P],size->size,visible->visible,color->color,alpha->alpha,incidences->[p,P]);
);
// plane orthogonal to p through l
// p: plane, l: line => plane; visible: bool = should object be drawn
dgs3dOrthogonalPL(p,l,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("orthogonalPlaneLine",[p,l],visible->visible,color->color,alpha->alpha,incidences->[l]);
);
// l: line, p: point => line; visible: bool = should object be drawn
dgs3dOrthogonalPlane(l,P,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("orthogonalPlane",[l,P],visible->visible,color->color,alpha->alpha,incidences->[p]);
);
// l1: line, l2: line => line; size:real = radius, visible: bool = should object be drawn
dgs3dOrthogonal2L(l1,l2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("orthogonal2L",[l1,l2],size->size,visible->visible,color->color,alpha->alpha,incidences->[l1,l2]);
);
dgs3d.alg.midpoint = (p1,p2) => (
  dgs3dRP3Normalize(if(p1_4 != 0 % p2_4 != 0,
    p1*p2_4+p2*p1_4;
  ,if(p1_3 != 0 % p2_3 != 0,
    p1*p2_3+p2*p1_3;
  ,if(p1_2 != 0 % p2_2 != 0,
    p1*p2_2+p2*p1_2;
  ,
    p1+p2;
  ))));
);
dgs3d.alg.midpoint3 = (p1,p2,delta) => (
  dgs3dRP3Normalize(if(p1_4 != 0 % p2_4 != 0,
    (1-delta)*p1*p2_4+delta*p2*p1_4;
  ,if(p1_3 != 0 % p2_3 != 0,
    (1-delta)*p1*p2_3+delta*p2*p1_3;
  ,if(p1_2 != 0 % p2_2 != 0,
    (1-delta)*p1*p2_2+delta*p2*p1_2;
  ,
    (1-delta)*p1+delta*p2;
  ))));
);
// p1,p2: point => point; size:real = radius, visible: bool = should object be drawn, delta: real -> distance at which point should be draw, default is 0.5
dgs3dMidpoint(p1,p2,delta->cglNada,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  if(isUndefined(delta),
    dgs3dNewPoint("midpoint",[p1,p2],size->size,visible->visible,color->color,alpha->alpha);
  ,
    dgs3dNewPoint("midpoint3",[p1,p2,dgs3dNewNumber(delta)],
      size->size,visible->visible,color->color,alpha->alpha);
  );
);
// trafo for mirroring at x
// point|line|plane -> trafo, sphere -> mTrafo
dgs3dMirrorAt(x):=(
  if(x.type == "point",
    dgs3dMirrorAtPoint(x);
  ,if(x.type == "line",
    dgs3dMirrorAtLine(x);
  ,if(x.type == "plane",
    dgs3dMirrorAtPlane(x);
  ,if(x.type == "quadric" & x.isSphere == true,
    dgs3dMirrorAtSphere(x);
  ,
    cglLogError("cannot mirror at "+x.type);
  ))));
);
dgs3d.alg.mirrorAtPoint = (P) => (
  dgs3dRP3Normalize(((-P_4,0,0,2*P_1),(0,-P_4,0,2*P_2),(0,0,-P_4,2*P_3),(0,0,0,P_4)));
);
dgs3d.alg.mirrorAtLine = (l) => (
  regional(v,P,N,d);
  v = dgs3dLineDirection(l);
  P = dgs3dEpsilon46((v_1,v_2,v_3,0),l); // project (0,0,0,1) to line
  P = P_(1..3)/P_4;
  N = 2*transpose([v])*[v]/(v*v)-idmatrix(3);
  d = P - N*P;
  (
    (N_1_1,N_1_2,N_1_3,d_1),
    (N_2_1,N_2_2,N_2_3,d_2),
    (N_3_1,N_3_2,N_3_3,d_3),
    (0,0,0,1)
  );
);
dgs3d.alg.mirrorAtPlane = (p) => (
  regional(n,d,N,v);
  // x -> x - 2 (d+<x,n>/<n,n>)n
  n = p_(1..3);
  d = p_4;
  N = idmatrix(3)-2*transpose([n])*[n]/(n*n);
  v = -2*d*n/(n*n);
  (
    (N_1_1,N_1_2,N_1_3,v_1),
    (N_2_1,N_2_2,N_2_3,v_2),
    (N_3_1,N_3_2,N_3_3,v_3),
    (0,0,0,1)
  );
);
dgs3d.alg.mirrorAtSphere = (s) => (
  regional(M,rsp);
  [M,rsq] = dgs3dSphereToMidpointSqRadius(s);
  [rsq*idmatrix(3),M,M];
);
dgs3dMirrorAtPoint(P):=(
  dgs3dNewTrafo("mirrorAtPoint",[P]);
);
dgs3dMirrorAtLine(l):=(
  dgs3dNewTrafo("mirrorAtLine",[l]);
);
dgs3dMirrorAtPlane(p):=(
  dgs3dNewTrafo("mirrorAtPlane",[p]);
);
dgs3dMirrorAtSphere(s):=(
  dgs3dNewMobiusTrafo("mirrorAtSphere",[s]);
);
// mirror x at y
mirror3d(x,y,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dMirror(x,y,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dMirror(x,y,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dTransform(dgs3dMirrorAt(y),x,size->size,visible->visible,color->color,alpha->alpha)
);

dgs3dComputeSphereBy4Points(pts):=(
  regional(b,v);
  b = apply(pts,-(|#_(1..3)|^2));
  v = linearSolve(apply(pts,#*#_4),b);
  [[1,0,0,0.5*v_1],[0,1,0,0.5*v_2],[0,0,1,0.5*v_3],[0.5*v_1,0.5*v_2,0.5*v_3,v_4]]
);
dgs3dSphereToMidpointSqRadius(S):=(
  regional(M,r);
  // S = a * (I, -v; -v, v*v-r^2)
  S = S/S_1_1;
  M = -S_4_(1..3);
  r = M*M - S_4_4;
  [M,r];
);
dgs3d.alg.sphere4P = (A,B,C,D) => (dgs3dComputeSphereBy4Points([A,B,C,D]));
dgs3d.alg.sphereMR = (M,R) => (
  regional(v);
  v = (M_4*R_(1..3)/R_4-M_(1..3));
  [[M_4,0,0,-M_1],[0,M_4,0,-M_2],[0,0,M_4,-M_3],[-M_1,-M_2,-M_3,(M_1^2+M_2^2+M_3^2-v*v)/M_4]]
);
// A,B,C,D: point => quadric, visible: bool = should object be drawn
sphere3d(A,B,C,D,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dSphere4points(A,B,C,D,visible->visible,color->color,alpha->alpha);
);
dgs3dSphere4points(A,B,C,D,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("sphere4P",[A,B,C,D],
    visible->visible,color->color,alpha->alpha,isSphere->true,incidences->[A,B,C,D]);
);
// M,R: point => quadric, visible: bool = should object be drawn
sphere3dMR(M,R,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dSphere2P(M,R,visible->visible,color->color,alpha->alpha);
);
dgs3dSphere2P(M,R,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("sphereMR",[M,R],
    visible->visible,color->color,alpha->alpha,isSphere->true,incidences->[R]);
);

dgs3d.alg.circleBy3P = (A,B,C) => (
  regional(p,I,J);
  p = dgs3dEpsilon444(A,B,C); // plane through A,B,C
  if(p*p~=0, // A,B,C colinear -> pick any plane through A and B
    regional(d,v);
    d = B-A;
    v = min([(1,0,0,0),(0,1,0,0),(0,0,1,0),(1,1,1,1)],(abs(#*d),#))_2;
    p = dgs3dEpsilon444(A,B,C+v);
  );
  [I, J] = dgs3dIntersectQuadricDualLine(
    ((1,0,0,0),(0,1,0,0),(0,0,1,0),(0,0,0,0)), // circle at infinity
    dgs3dEpsilon44(p,(0,0,0,1)) // line at infinity in plane
  );
  [dgs3dComputeConicBy5(p,[A,B,C,I,J]),p]
);
circle3d(A,B,C,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dCircle3points(A,B,C,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dCircle3points(A,B,C,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic("circleBy3P",[A,B,C],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->true,incidences->[A,B,C]);
);

////////////////
// Distance Estimators
////////////////
// shader friendly version of quadric line intersection with line throuh P and Q close to P
// TODO: check if interpolation based algorithm can also be used in normal case
dgs3dSimpleIntersectQuadricLine(q,P,Q):=(
  regional(a,b,c,d,X1,X2);
  // (lP+Q)^T q (lP+Q) = l^2 PqP + 2l PqQ + QqQ
  a = P*q*P;
  b = P*q*Q;
  c = Q*q*Q;
  d = b*b-a*c;
  if(d<0,
    Q-(b/a)*P
  ,
    X1 = ((-b + re(sqrt(d)))/a)*P+Q;
    X2 = ((-b - re(sqrt(d)))/a)*P+Q;
    if(dgs3dSimpleProjDistanceSq(X1,P)<dgs3dSimpleProjDistanceSq(X2,P),X1,X2);
  )
);
dgs3dSimpleConicProjectionStep(conicQuadric,conicPlane,planePoint,iterPoint):=(
  regional(polarPlane,polarLine,normalPlane,Q);
  polarPlane = conicQuadric*iterPoint;
  polarLine = dgs3dDualLine(dgs3dEpsilon44(polarPlane,conicPlane));
  normalPlane = dgs3dPlaneWithNormalThroughPoint(dgs3dLineDirection(polarLine),planePoint);
  Q = dgs3dEpsilon46(normalPlane,polarLine);
  dgs3dSimpleIntersectQuadricLine(conicQuadric,planePoint,Q);
);
// estimate squared-distance to intersection curve of quadric and plane
dgs3dDistanceQuadricPlane(conicQuadric,conicPlane,samplePoint):=(
  regional(planePoint,P,v);
  planePoint = dgs3dProjectPointToPlane0(samplePoint,conicPlane);
  P = dgs3dSimpleConicProjectionStep(conicQuadric,conicPlane,planePoint,planePoint);
  // TODO: two steps gives more accurate curve, but leads to nummerical problems
  //P = dgs3dSimpleConicProjectionStep(conicQuadric,conicPlane,planePoint,P);
  v = (P / P_4 - samplePoint / samplePoint_4);
  v*v
);
// TODO? try porting iterative projection approach from dgs3dTryProjectPointToBiQuadric to shader
// estimate squared-distance to intersection curve of quadric and quadric
dgs3dDistanceQuadricQuadric(Q1,Q2,coords):=(
  regional(pol1,pol2,l,v,plane,P);
  // 1. get polar planes
  pol1 = Q1*coords;
  pol2 = Q2*coords;
  // 2. compute distance to intersection line
  l = dgs3dDualLine(dgs3dEpsilon44(pol1,pol2));
  v = dgs3dEpsilon46((0,0,0,1),l);
  plane = dgs3dPlaneWithNormalThroughPoint(v_(1..3),coords);
  P = dgs3dEpsilon46(plane,l);
  P = (P / P_4 - coords / coords_4);
  0.25*(P*P)
);
dgs3d.alg.meetQP = (q,p) => (
  regional(T);
  // find a quadric with the same intersection that is "less similar" to p
  T = dgs3dMapPinfTo(p);
  R = T*q*transpose(T);
  R_4 = (0,0,0,0);
  R_1_4 = R_2_4 = R_3_4 = 0;
  [dgs3dRP3Normalize(transpose(T)*R*T),p];
);
dgs3d.alg.meetQQ = (q1,q2) => ([q1,q2]);
// q: quadric, p: plane => conic; size:real = radius, visible: bool = should object be drawn
dgs3dMeetQP(q,p,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic("meetQP",[q,p],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->q:"isSphere",incidences->[q,p]);
);
// q1: quadric, q2: quadric => biquadric; size:real = radius, visible: bool = should object be drawn
dgs3dMeet2Q(q1,q2,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewBiQuadric("meetQQ",[q1,q2],size->size,visible->visible,color->color,alpha->alpha,
    isCircle->q1:"isSphere"&q2:"isSphere",incidences->[q1,q2]);
);
// ? quadric by mix of points, lines and planes

////////////////
// Transformations
////////////////
dgs3d.alg.trafoBy5Pt = (A1,A2,A3,A4,A5,B1,B2,B3,B4,B5) => (
  dgs3dRP3Normalize(dgs3dHalfTrafo(B1,B2,B3,B4,B5)*inverse(dgs3dHalfTrafo(A1,A2,A3,A4,A5)));
);
// map e1,e2,e3,e4 -> As_1,As_2,As_3,As_4
dgs3dAffineHalfTrafo(As):=(
  transpose(apply(As,dgs3ddehom4(#)))
);
dgs3d.alg.affineTrafoBy4Pt = (A1,A2,A3,A4,B1,B2,B3,B4) => (
  dgs3dRP3Normalize(
    dgs3dAffineHalfTrafo((B1,B2,B3,B4))*
    inverse(dgs3dAffineHalfTrafo((A1,A2,A3,A4)))
  );
);
dgs3dTransformBy5P(As,Bs):=(
  dgs3dNewTrafo("trafoBy5Pt",concat(As,Bs))
);
dgs3dAffineTransformBy4P(As,Bs):=(
  dgs3dNewTrafo("affineTrafoBy4Pt",concat(As,Bs))
);
// mobius transform mapping inf -> p1, 0 -> p2, e1 -> p3 and e1-e2-plane to sphere through (p1,p2,p3,p4) where (p1,p2,p3,p4) = As
dgs3dComputeHalfMobiusTrafo(A1,A2,A3,A4):=(
  regional(c,v1,v2,v3,p4,m1,s,f4,m2,m3);
  // determine möbius transform T(v) = sM(v-a)/<v-a,v-a> + c
  // 1. T(inf) = c
  c = A1_(1..3);
  v1 = A2_(1..3) - c;
  v2 = A3_(1..3) - c;
  v3 = A4_(1..3) - c;
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
dgs3dComputeComposeMobiusInverse(T1,T0):=(
  regional(M1,a1,c1,M0,a0,c0,L,p,q);
  [M0,a0,c0] = T0;
  [M1,a1,c1] = T1;
  if(|a1-a0|<1e-10,
    L = M1*transpose(M0)/(M0_1*M0_1);
    p = c1 - L*c0;
    [((L_1_1,L_1_2,L_1_3,p_1),(L_2_1,L_2_2,L_2_3,p_2),(L_3_1,L_3_2,L_3_3,p_3),(0,0,0,1))]
  ,
    // S*T^-1(p) = inf -> p = T(S^-1(inf)) = T(a1)
    p = M0*(a1-a0)/((a1-a0)*(a1-a0))+c0; // p = T(a1) -> S*T^-1(p) = S(a1)  = inf
    q = M1*(a0-a1)/((a0-a1)*(a0-a1))+c1; // S(a0) = S*T^-1(inf)
    // compute (S*T^-1(e_i+p)) -q to get columns of L // TODO? is there a simple equation
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
      dgs3dComputeComposeMobiusInverse(S,dgs3dComputeInverseMobius(T));
    )
  )
);
dgs3d.alg.mobiusTrafoBy4Pt = (A1,A2,A3,A4,B1,B2,B3,B4) => (
  [A1,A2,A3,A4,B1,B2,B3,B4] = apply([A1,A2,A3,A4,B1,B2,B3,B4],dgs3ddehom4(#));
  dgs3dComputeComposeMobiusInverse(
    dgs3dComputeHalfMobiusTrafo(B1,B2,B3,B4),
    dgs3dComputeHalfMobiusTrafo(A1,A2,A3,A4)
  );
);
dgs3dMobiusTransformBy4P(As,Bs):=(
  dgs3dNewMobiusTrafo("mobiusTrafoBy4Pt",concat(As,Bs))
);
dgs3d.alg.mobiusTransformPt = (T,P) => (dgs3dComputeApplyMobiusTrafo(T,P));
dgs3d.alg.mobiusTransformPl = (T,v) => (
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
dgs3d.alg.mobiusTransformSphere = (T,s) => (
  if(length(T)==1,
    T = adjoint4(T_1);
    transpose(T)*s*T
  ,
    regional(MT,p,q,a,v,c,k,l,r);
    (MT,q,p) = T; // decompose inverse trafo
    // write s as a<x,x> + <x,v> + c = 0
    a = (s_1_1+s_2_2+s_3_3)/3;
    v = (s_1_4,s_2_4,s_3_4)+s_4_(1..3);
    c = s_4_4;
    k = a*q*q + q*v + c;
    l = MT*(2*a*q + v);
    // k <y,y> + 2<y,l/2-kp> + k<p,p>-<p,l> = 0
    v = 0.5*l - k*p;
    r = k*(p*p)-p*l + a*(MT_1*MT_1);
    ((k,0,0,v_1),(0,k,0,v_2),(0,0,k,v_3),(v_1,v_2,v_3,r));
  );
);
// find plane in pencil through two spheres
dgs3dSpherePencileBase(S1,S2):=(
  regional(S,plane);
  if(S1_1_1==0,
    plane = S1;
    S = S2;
  ,
    plane = S2_1_1*S1-S1_1_1*S2; // make top-left 3x3 submatrix zero
    S = S1_1_1*S1+S2_1_1*S2; // swap factors and one single to ensure linearly independent choice
  );
  (S,(plane_1_4+plane_4_1,plane_2_4+plane_4_2,plane_3_4+plane_4_3,plane_4_4));
);
dgs3dFind2PlanesThroughLine(l):=(
  transpose(kernel(dgs3dLineMatrix(dgs3dDualLine(l))))
);
dgs3d.alg.mobiusTransformLn = (T,l) => (
  regional(p1,p2);
  (p1,p2) = dgs3dFind2PlanesThroughLine(l);
  // intersect transformed planes
  dgs3dSpherePencileBase(dgs3d.alg.mobiusTransformPl.(T,p1),dgs3d.alg.mobiusTransformPl.(T,p2));
);
dgs3dSphereThroughCircle(q,p):=(
  regional(P);
  // add multiple of degenerate quadric given by p to ensure q is a sphere
  P = transpose([p])*[p];
  q - if(|P_1_2|>|P_1_3| & |P_1_2|>|P_2_3|,
    q_1_2/P_1_2;
  ,if(|P_1_3|>|P_2_3|,
    q_1_3/P_1_3;
  ,
    q_2_3/P_2_3;
  )) * P;
);
dgs3d.alg.mobiusTransformCircle = (T,c) => (
  regional(q,p);
  (q,p) = c;
  // intersect transformed plane and sphere
  dgs3dSpherePencileBase(
    dgs3d.alg.mobiusTransformPl.(T,p),
    dgs3d.alg.mobiusTransformSphere.(T,dgs3dSphereThroughCircle(q,p))
  );
);
dgs3d.alg.mobiusTransformCircle2 = (T,b) => (
  // TODO? are the arguments guaranteed to be spheres
  dgs3dSpherePencileBase(
    dgs3d.alg.mobiusTransformSphere.(T,b_1),
    dgs3d.alg.mobiusTransformSphere.(T,b_2)
  )
);
dgs3d.alg.mobiusTransformTrafo = (T,S) => (
  dgs3dComputeComposeMobius(T,dgs3dComputeComposeMobius(S,dgs3dComputeInverseMobius(T)))
);
dgs3d.alg.mobiusTransformQuadric = (T,q) => (
  if(length(T)==1,
    T = adjoint4(T_1);
    [lambda((spacePos,M),spacePos*M*spacePos),transpose(T)*q*T]
  ,
    regional(M,a,c);
    [M,a,c] = T;
    [lambda((spacePos,data),x=(spacePos-data.p);
      x*transpose(data.M)*data.A*data.M*x
        +(x*x)*(2*data.q*data.A+data.b)*data.M*x
        +(x*x)^2*(data.q*data.A*data.q+data.b*data.q+data.c)
    ),{
      "M": M,
      "p": a,
      "q": c,
      "A": apply(q_(1..3),#_(1..3)),
      "b": (q_1_4+q_4_1,q_2_4+q_4_2,q_3_4+q_4_2),
      "c": q_4_4
    }]
  );
);
dgs3dMobiusTransformPoint(T,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("mobiusTransformPt",[T,P],size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dMobiusTransformPlane(T,p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("mobiusTransformPl",[T,p],visible->visible,color->color,alpha->alpha,isSphere->true)
);
dgs3dMobiusTransformSphere(T,s,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("mobiusTransformSphere",[T,s],visible->visible,color->color,alpha->alpha,isSphere->true)
);
dgs3dMobiusTransformLine(T,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic("mobiusTransformLn",[T,l],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->true)
);
dgs3dMobiusTransformCircle(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic("mobiusTransformCircle",[T,c],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->true)
);
dgs3dMobiusTransformCircle2(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic("mobiusTransformCircle2",[T,c],
    size->size,visible->visible,color->color,alpha->alpha,isCircle->true)
);
dgs3dMobiusTransformTransform(T,S,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewMobiusTrafo("mobiusTransformTrafo",(T,S))
);
dgs3dMobiusTransformQuadric(T,q,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewSurface("mobiusTransformQuadric",[T,q],
    visible->visible,color->color,alpha->alpha)
);

transform3d(T,x,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dTransform(T,x,size->size,visible->visible,color->color,alpha->alpha);
);
dgs3dTransform(T,x,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
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
dgs3d.alg.transformPt = (T,P) => (
  dgs3dRP3Normalize(T*P)
);
dgs3d.alg.transformLn = (T,l) => (
  dgs3dRP3Normalize(dgs3dLineFromMatrix(transpose(T)*dgs3dLineMatrix(l)*T))
);
dgs3d.alg.transformPl = (T,p) => (
  dgs3dRP3Normalize(transpose(inverse(T))*p)
);
dgs3d.alg.transformQuadric = (T,q) => (
  T = inverse(T);
  dgs3dRP3Normalize(transpose(T)*q*T)
);
dgs3d.alg.transformConic = (T,c) => (
  regional(q,p);
  T = inverse(T);
  (q,p) = c;
  [dgs3dRP3Normalize(transpose(T)*q*T),dgs3dRP3Normalize(transpose(T)*p)];
);
dgs3d.alg.transformBiquadric = (T,b) => (
  T = inverse(T);
  apply(b,dgs3dRP3Normalize(transpose(T)*#*T));
);
dgs3d.alg.transformTrafo = (T,S) => (
  dgs3dRP3Normalize(T*S*inverse(T))
);
dgs3dTransformPoint(T,P,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPoint("transformPt",[T,P],size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dTransformLine(T,l,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewLine("transformLn",[T,l],size->size,visible->visible,color->color,alpha->alpha)
);
dgs3dTransformPlane(T,p,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewPlane("transformPl",[T,p],visible->visible,color->color,alpha->alpha)
);
dgs3dTransformQuadric(T,q,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewQuadric("transformQuadric",[T,q],visible->visible,color->color,alpha->alpha)
);
dgs3dTransformConic(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewConic("transformConic",[T,c],visible->visible,color->color,alpha->alpha,isCircle->false)
);
dgs3dTransformBiQuadric(T,c,size->cglNada,visible->true,color->cglNada,alpha->cglNada):=(
  dgs3dNewBiQuadric("transformBiquadric",[T,c],visible->visible,color->color,alpha->alpha,isCircle->false)
);
dgs3dTransformTrafo(T,S):=(
  dgs3dNewTrafo("transform",(T,S))
);

////////////////
// run by name
////////////////

DGS3DaLGORITHMS = {
  // projective
  "freePoint": lambda((coords),dgs3dFreePoint(coords)),
  "freeLine": lambda((coords),dgs3dFreeLine(coords)),
  "freePlane": lambda((coords),dgs3dFreePlane(coords)),
  "freeQuadric": lambda((coords),dgs3dFreeQuadric(coords)),
  "onLine": lambda((line,initPoint),dgs3dPointOnLine(line,initPoint)),
  "onPlane": lambda((plane,initPoint),dgs3dPointOnPlane(plane,initPoint)),
  "onQuadric": lambda((quadric,initPoint),dgs3dPointOnQuadric(quadric,initPoint)),
  "onConic": lambda((conic,initPoint),dgs3dPointOnConic(conic,initPoint)),
  "onBiQuadric": lambda((biQuadric,initPoint),dgs3dPointOnBiQuadric(biQuadric,initPoint)),
  "joinPP": lambda((point1,point2),dgs3dJoin2P(point1,point2)),
  "joinPL": lambda((point,line),dgs3dJoinPL(point,line)),
  "join3P": lambda((point1,point2,point3),dgs3dJoin3P(point1,point2,point3)),
  "meetPP": lambda((plane1,plane2),dgs3dMeet2P(plane1,plane2)),
  "meetPL": lambda((plane,line),dgs3dMeetPL(plane,line)),
  "meet3P": lambda((plane1,plane2,plane3),dgs3dMeet2P(plane1,plane2,plane3)),
  // projective-coplanar
  "joinLL": lambda((line1,line2),dgs3dJoin2L(line1,line2)),
  "meetLL": lambda((line1,line2),dgs3dMeet2L(line1,line2)),
  // quadrics
  "join3L": lambda((line1,line2,line3),dgs3dJoin3L(line1,line2,line3)),
  "quadricBy9Pt": lambda((points),dgs3dQuadric9point(points)),
  "quadricBy9Pl": lambda((planes),dgs3dQuadric9plane(planes)),
  "planesAsQuadric": lambda((plane1,plane2),dgs3dPlanesAsQuadric(plane)),
  "sphere4P": lambda((point1,point2,point3,point4),dgs3dSphere4points(point1,point2,point3,point4)),
  "sphere2P": lambda((midPoint,radiusPoint),dgs3dSphere2P(midPoint,radiusPoint)),
  "meetQL": lambda((quadric,line),dgs3dMeetQL(quadric,line)),
  "meetQP": lambda((quadric,plane),dgs3dMeetQP(quadric,plane)),
  "meetQQ": lambda((quadric1,quadric2),dgs3dMeet2Q(quadric1,quadric2)),
  "meetQPP": lambda((quadric,plane1,plane2),dgs3dMeetQpp(quadric,plane1,plane2)),
  "meetQQP": lambda((quadric1,quadric2,plane),dgs3dMeetQQp(quadric1,quadric2,plane)),
  "meet3Q": lambda((quadric1,quadric2,quadric3),dgs3dMeet3Q(quadric1,quadric2,quadric3)),
  "polarPt": lambda((quadric,plane),dgs3dPolarPoint(quadric,plane)),
  "polarLn": lambda((quadric,line),dgs3dPolarLine(quadric,line)),
  "polarPl": lambda((quadric,point),dgs3dPolarPlane(quadric,point)),
  "quadricLines": lambda((quadric,point),dgs3dQuadricLines(quadric,point)),
  "completeCayleyOctent": lambda((points),dgs3dCompleteCayleyOctent(points)),
  "quadricInPencil": lambda((quadric1,quadric2,throughPoint),dgs3dQuadricInPencil(quadric1,quadric2,throughPoint)),
  // conics/biquadrics
  "circleBy3P": lambda((point1,point2,point3),dgs3dCircle3points(point1,point2,point3)),
  "biQuadricBy8": lambda((points),dgs3dBiQuadric8points(points)),
  "coneByConicPoint": lambda((conic,point),dgs3dConeByConicPoint(conic,point)),
  "meetCP": lambda((conic,plane),dgs3dMeetCP(conic,plane)),
  "meetQC": lambda((quadric,conic),dgs3dMeetQuadricConic(quadric,conic)),
  "meetBP": lambda((biQuadric,plane),dgs3dMeetBiQuadricPlane(biQuadric,plane)),
  "meetBQ": lambda((biQuadric,quadric),dgs3dMeetBiQuadricQuadric(biQuadric,quadric)),
  "biQuadricPolarLn": lambda((biQuadric,point),dgs3dBiQuadricPolarLine(biQuadric,point)),
  // conic-coplanar
  "conicBy5P": lambda((point1,point2,point3,point4,point5),dgs3dConic5points(point1,point2,point3,point4,point5)),
  "conicBy5L": lambda((line2,line2,line3,line4,line5),dgs3dConic5points(line2,line2,line3,line4,line5)),
  "meetCL": lambda((conic,line),dgs3dMeetCL(conic,line)),
  "meetCC": lambda((conic1,conic2),dgs3dMeetConicConic(conic1,conic2)),
  "conicPolarPt": lambda((conic,line),dgs3dConicPolarPoint(conic,line)),
  "conicPolarLn": lambda((conic,point),dgs3dConicPolarLine(conic,point)),
  // euclidean
  "midpoint": lambda((point1,point2),dgs3dMidpoint(point1,point2)),
  "midpoint3": lambda((point1,point2,ratio),dgs3dMidpoint(point1,point2,delta->ratio)),
  "mirrorAtPoint": lambda((point),dgs3dMirrorAtPoint(point)),
  "mirrorAtLine": lambda((line),dgs3dMirrorAtLine(line)),
  "mirrorAtPlane": lambda((plane),dgs3dMirrorAtPlane(plane)),
  "mirrorAtSphere": lambda((sphere),dgs3dMirrorAtSphere(sphere)),
  "parallelLine": lambda((line,throughPoint),dgs3dParallelLine(line,throughPoint)),
  "parallelPlane": lambda((plane,throughPoint),dgs3dParallelPlane(plane,throughPoint)),
  "parallel2L": lambda((line,throughLine),dgs3dParallel2L(line,throughLine)),
  "orthogonalLine": lambda((plane,throughPoint),dgs3dOrthogonalLine(plane,throughPoint)),
  "orthogonalPlane": lambda((line,throughPoint),dgs3dOrthogonalPlane(line,throughPoint)),
  "orthogonalPlaneLine": lambda((plane,throughLine),dgs3dOrthogonalPL(plane,throughLine)),
  "orthogonal2L": lambda((line1,line2),dgs3dOrthogonal2L(line1,line2)),
  // euclidean-quadric
  "quadricCenter": lambda((quadric),dgs3dQuadricCenter(quadric)),
  "quadricAxes": lambda((quadric),dgs3dQuadricAxes(quadric)),
  "quadricPlanes": lambda((quadric),dgs3dQuadricPlanes(quadric)),
  // transformations
  "mobiusTrafoBy4Pt": lambda((As,Bs),dgs3dMobiusTransformBy4P(As,Bs)),
  "trafoBy5Pt": lambda((As,Bs),dgs3dTransformBy5P(As,Bs)),
  "affineTrafoBy4Pt": lambda((As,Bs),dgs3dAffineTransformBy4P(As,Bs)),
  "mobiusTransformPt": lambda((mTrafo,x),dgs3dMobiusTransformPoint(mTrafo,x)),
  "mobiusTransformPl": lambda((mTrafo,x),dgs3dMobiusTransformPlane(mTrafo,x)),
  "mobiusTransformSphere": lambda((mTrafo,x),dgs3dMobiusTransformSphere(mTrafo,x)),
  "mobiusTransformLn": lambda((mTrafo,x),dgs3dMobiusTransformLine(mTrafo,x)),
  "mobiusTransformCircle": lambda((mTrafo,x),dgs3dMobiusTransformCircle(mTrafo,x)),
  "mobiusTransformCircle2": lambda((mTrafo,x),dgs3dMobiusTransformCircle2(mTrafo,x)),
  "mobiusTransformTrafo": lambda((mTrafo,x),dgs3dMobiusTransformTransform(mTrafo,x)),
  "mobiusTransformQuadric": lambda((mTrafo,x),dgs3dMobiusTransformQuadric(mTrafo,x)),
  "transformPt": lambda((trafo,x),dgs3dTransformPoint(trafo,x)),
  "transformLn": lambda((trafo,x),dgs3dTransformLine(trafo,x)),
  "transformPl": lambda((trafo,x),dgs3dTransformPlane(trafo,x)),
  "transformQuadric": lambda((trafo,x),dgs3dTransformQuadric(trafo,x)),
  "transformConic": lambda((trafo,x),dgs3dTransformConic(trafo,x)),
  "transformBiquadric": lambda((trafo,x),dgs3dTransformConic(trafo,x)),
  "transformTrafo": lambda((trafo,x),dgs3dTransformTrafo(trafo,x))
};
dgs3dNormalizeModifiers(obj3d):=(
  obj3d.color = cglColor(obj3d.color);
  obj3d.redraw.(obj3d);
  obj3d
);
dgs3dSetModifiers(obj3d,modifiers):=(
  if(!isJSON(obj3d),obj3d,
    apply(modifiers,v,k,obj3d:k = modifiers:k);
    dgs3dNormalizeModifiers(obj3d)
  );
);
// algorithm: string, args: list, modifiers: JSON
dgs3dCreate(algorithm,args,modifs):=(
  dgs3dSetModifiers(eval(DGS3DaLGORITHMS:algorithm,args),modifs);
);

////////////////
// find
////////////////

// TODO? find restricted to certain kinds of objecst (e.g find point or line)
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
  dgs3dFind(x,y,[(cglValOrDefault(dgs3dObjectsByType.point,{}),dgs3dFindPointDist)])
);
dgs3dFind(x,y):=(
  dgs3dFind(x,y,[
    (cglValOrDefault(dgs3dObjectsByType.point,{}),dgs3dFindPointDist),
    (cglValOrDefault(dgs3dObjectsByType.line,{}),dgs3dFindLineDist),
    (cglValOrDefault(dgs3dObjectsByType.plane,{}),dgs3dFindPlaneDist)
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

// TODO: ? support redefining objects (? modifier on creator functions, do dependency-tree update in newObject)

// TODO: test-cases for:
// * quadric by 9 planes
// * transformations
// * load/store
// * delete