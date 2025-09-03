// TODO? add functions to notify script of mouse movements
// -> move mouse handling from example to library functions
// onMouseDown
// onMouseMove
// onZoom
// onFrame
// onReset

// TODO? object groups
//cglGroupStart(); // -> start new group, returns groupId
//cglGroupEnd(); // -> end current group, returns groupId

find3d(x,y):=(
   root = cglSpacePoint(x,y); // TODO name
   dir = normalize(cglDirection(x,y));
   res = [];
   dst = 1e400; // TODO? is there a better way to set a value to infinity 
   forall(cglListObjects(movable->true),objId,
     bounds = cglGetBounds(objId);
     if(bounds_"type" == 2, // sphere // TODO ensure bound-types align with javascript version
       d = cglEvalOrDiscard(cglSphereDepths(root,dir,bounds_"center",bounds_"radius")_1);
       if(!isundefined(d),
        if(d_1 < dst,
          dst = d;
          res = [objId];
        ,if(d_1 == dst,
          res = append(res,objId);
        ))
       );
     ,
       cglLogInfo("unsupported object type in find: "+(bounds_"type"));
     )
   );
   res;
);