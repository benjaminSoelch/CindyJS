dgs3dPrepare():=(
    sx = mouse().x;
    sy = mouse().y;
    rotating = false;
    dragging = false;
    zoom = 1.0;
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
dgs3dHandleZoom(zoom):=(
  // TODO update line-lengths/ visible points depending on zoom level
);
dgs3dMovementAxes(point):=(
  regional(normal,l);
  if(length(point:"parents")>0,
    if(length(point:"parents")==1,
      l = point:"parents"_1;
      if(l:"type" == "line",
        [l:"parents"_2:"center"-l:"parents"_1:"center"]
      ,
        cglLogError("unimplemented: moving point depending on "+(l:"type"));
      );
    ,
      cglLogError("unimplemented: restricted movement");
    )
  ,
    // TODO what is a good way to choose 2 movement axes for free movement
    normal = cglViewNormal();
    d1 = cross(normal,if(normal_1>normal_2,(0,1,0),(1,0,0)));
    d2 = cross(normal,d1);
    (d1,d2)
  );
);
dgs3dPreFrame():=(
    regional(mx,my,dx,dy,axes,viewPos,movePlaneOffset,movePlaneNormal,d2,oldDirection,newDirection,oldT,newT,oldPos,newPos,truePos,oldRadius,updateQueue);
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
      if(length(axes)==2,
        // compute intersections with movement plane for old and new view-ray
        movePlaneNormal = cross(axes_1,axes_2);
        movePlaneOffset = movePlaneNormal * target:"center";
        oldT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * newDirection);
        oldPos = viewPos + oldT*oldDirection;
        newPos = viewPos + newT*newDirection;
        // keep movement relative to click position (instead of center)
        truePos = target:"center";
        newPos = newPos+(truePos-oldPos);
        // update position
        target:"center" = newPos;
        oldRadius = cglGetBounds(target:"drawId"):"radius";
        cglUpdateBounds(target:"drawId",newPos,oldRadius);
        // TODO more efficient data-structure for queue
        updateQueue = updateQueue ++ target:"children";
      ,if(length(axes)==1,
        // move point in plane spanned by axis and line normal to axis
        d2 = cross(axes_1,cglViewNormal());
        movePlaneNormal = cross(axes_1,d2);
        movePlaneOffset = movePlaneNormal * target:"center";
        oldT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * oldDirection);
        newT = (movePlaneOffset - movePlaneNormal * viewPos) / (movePlaneNormal * newDirection);
        oldPos = viewPos + oldT*oldDirection;
        newPos = viewPos + newT*newDirection;
        // remove movement component orthogonal to axis
        newPos = newPos - ((newPos-oldPos)*d2)/(d2*d2) * d2;
        // keep movement relative to click position (instead of center)
        truePos = target:"center";
        newPos = newPos+(truePos-oldPos);
        target:"center" = newPos;
        updateQueue = append(updateQueue, target);
      ,
        cglLogError("unimplemented: "+length(axes)+"D movement");
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
dgs3dMovablePoints = [];

// TODO? store definition used to compute object together with parents
dgs3dNewObject(type,parents):=(
  regional(obj);
  obj = {"type":type, "drawId": -1, "parents": parents, "children": [], "recompute": cglLazy(self,)};
  forall(parents,parent,
    parent:"children" = append(parent:"children",obj);
  );
  obj;
);

// p: real3 -> (x,y,z) ; size: read -> radius, pinned: bool -> fixed position?
cglInterface(point3d,dgs3dNewPoint,(p),(size,pinned));
dgs3dNewPoint(p):=(
  regional(obj);
  obj = dgs3dNewObject("point",[]);
  obj:"drawId" = draw3d(p,size->size);
  obj:"center" = p;
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints = append(dgs3dMovablePoints,obj);
  );
  obj
);

// p1: point, p2: point, size:real -> radius
cglInterface(join3d,dgs3dJoin2P,(p1,p2),(size));
dgs3dJoin2P(p1,p2):=(
  regional(obj);
  obj = dgs3dNewObject("line",[p1,p2]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"cylinderSize");
  // TODO? store line-coordinates
  obj:"recompute" = cglLazy(self,  
    if(self:"drawId"==-1,
      self:"drawId" = draw3d((self:"parents"_1):"center",(self:"parents"_2):"center",size->self:"radius")
    ,
      cglUpdateBounds(self:"drawId",(self:"parents"_1):"center",(self:"parents"_2):"center",self:"radius")
    );
  );
  cglEval(obj:"recompute",obj);
  obj
);

// p0: real3 (x,y,z), l: line , size: real -> radius, pinned:bool -> fixed position
cglInterface(pointOnLine3d,dgs3dPointOnLine,(p0,l),(size,pinned));
dgs3dPointOnLine(p0,l):=(
  regional(obj);
  obj = dgs3dNewObject("point",[l]);
  obj:"radius" = cglValOrDefault(size,cglDefaults:"sphereSize");
  obj:"center" = p0;
  obj:"recompute" = cglLazy(self,
    regional(p,l,p1,p2,n);
    // project old-position onto line
    p = self:"center";
    cglDebugPrint(self);
    l = self:"parents"_1;
    p1 = l:"parents"_1:"center";
    p2 = l:"parents"_2:"center";
    n = p2-p1;
    p = p1 + n*(p*n-p1*n)/(n*n);
    self:"center" = p;
    if(self:"drawId"==-1,
      self:"drawId" = draw3d(p,size->self:"radius");
    ,
      cglUpdateBounds(self:"drawId",p,self:"radius")
    );
  );
  cglEval(obj:"recompute",obj);
  if(cglValOrDefault(pinned,false),
    obj:"movable" = false;
  ,
    obj:"movable" = true;
    dgs3dMovablePoints = append(dgs3dMovablePoints,obj);
  );
  obj
);

// TODO more "algorithms":
//  * plane by three points
//  * point on plane
//  * plane by line and point
//  * point by three planes
//  * line by two planes
//  * point by two lines ! not projectively invariant
// ? quadric by 9 points
// * point on quadric
// ? line+quadric

dgs3dFind(x,y):=(
  regional(root,dir,res,dist);
  root = cglSpacePoint(x,y); // TODO name
  dir = normalize(cglDirection(x,y));
  res = cglUndefinedVal();
  dist = 1e400; // infinity
  forall(dgs3dMovablePoints,pt,
    bounds = cglGetBounds(pt:"drawId"); // TODO? use point coords or draw coords
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