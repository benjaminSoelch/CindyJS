cglCubesLookup = apply(1..16,[7,7,7,7,7,7,0]);
cglCubesLookup_1 = [7,7,7,7,7,7,0];
cglCubesLookup_2 = [3, 5, 6,7,7,7,1];
cglCubesLookup_3 = [2, 6, 4,7,7,7,1];
cglCubesLookup_4 = [2, 3, 4, 4, 3, 5,2];
cglCubesLookup_5 = [1, 4, 5,7,7,7,1];
cglCubesLookup_6 = [1, 4, 3, 3, 4,6,2];
cglCubesLookup_7 = [1, 2, 5, 5, 2, 6,2];
cglCubesLookup_8 = [1, 2, 3, 7,7,7,1];

cglCubesLookup_9 = [1, 3,2,  7,7,7,1];
cglCubesLookup_10 = [1, 5,2,  2,5,  6,2];
cglCubesLookup_11 = [1, 3, 4,  4,3,6,2];
cglCubesLookup_12 = [1, 5,4, 7,7,7,1];
cglCubesLookup_13 = [2, 4,3,  3,4,  5,2];
cglCubesLookup_14 = [2,  4,6,7,7,7,1];
cglCubesLookup_15 = [3, 6,5, 7,7,7,1];
cglCubesLookup_16 = [7,7,7,7,7,7,0];

cglCubesLookup(index):=(
    regional(mirror,res);
    if(index==0 % index == 15,
    [7,7,7,7,7,7,0]
    ,
    mirror = index>=8;
    if(mirror,
        index = 15-index
    );
    res = if(index>=4,
        if(index==4,
        cglCubesLookup_5;
        ,if(index==5,
        cglCubesLookup_6;
        ,if(index==6,
        cglCubesLookup_7;
        ,// index==7,
        cglCubesLookup_8;
        )))
    ,
        if(index==0,
        cglCubesLookup_1;
        ,if(index==1,
        cglCubesLookup_2;
        ,if(index==2,
        cglCubesLookup_3;
        ,// index==3,
        cglCubesLookup_4;
        )))
    );
    if(mirror,
        (res_3,res_2,res_1,res_6,res_5,res_4,res_7)
    ,
        res;
    )
    )
);
cglCubesEdgeIndex(tri,k):=(
    if(k<3,
    if(k==0,
        tri_1
    ,if(k==1,
        tri_2
    ,// k== 2
        tri_3
    ))
    ,
    if(k==3,
        tri_4
    ,if(k==4,
        tri_5
    ,// k== 5
        tri_6
    ))
    )
);

cglCubesSimplex(p1,p2,p3,p4,k):=(
    regional(f1,f2,p,id,i,sign,triangles,q1,q2,q12,f12);
    id = 0;
    forall((p1,p2,p3,p4),p,
    sign = expr:(p_1,p_2,p_3)<0;
    id = 2*id + if(sign,1,0);
    );
    triangles = cglCubesLookup(id);
    i = cglCubesEdgeIndex(triangles,k);
    if(i==7,
    (0,0,0,0)
    ,
    // pick edge depending on index
    if(i<4,
        if(i==1,
        q1 = p1; q2 = p2;
        ,if(i==2,
        q1 = p1; q2 = p3;
        , // i==3
        q1 = p1; q2 = p4;
        ))
    ,
        if(i==4,
        q1 = p2; q2 = p3;
        ,if(i==5,
        q1 = p2; q2 = p4;
        , // i==6
        q1 = p3; q2 = p4;
        ))
    );
    f1 = expr:(q1_1,q1_2,q1_3);
    f2 = expr:(q2_1,q2_2,q2_3);
    // FIXME: in some rare cases points f(q1) and f(q2) have same sign
    //   this seems to happen when the value at one (or both) of the vertices is close to zero
    //   using linear approximation in these cases removed most of the artifacts
    if((f1<0) != (f2 < 0),
        // bisection search
        forall(1..4,
        q12 = (q1+q2)/2;
        f12 = expr:(q12_1,q12_2,q12_3);
        if((f1<0)!=(f12<0),
            q2 = q12; f2 = f12;
        ,
            q1 = q12; f1 = f12;
        );
        );
    );
    // linearly approximate f along remaining segment
    p = q1 - (f1/(f2-f1))*(q2-q1);
    (p_1,p_2,p_3,1)
    )
);
cglCubesCube(x0,y0,z0,x1,y1,z1,type2,l,k):=(
    if(type2,
    if(l<2,
        if(l==0,
        cglCubesSimplex((x0,y0,z0),(x1,y0,z0),(x0,y1,z0),(x0,y0,z1),k)
        ,// l==1
        cglCubesSimplex((x1,y0,z0),(x0,y1,z0),(x0,y0,z1),(x1,y1,z1),k)
        )
    ,
        if(l==2,               
        cglCubesSimplex((x1,y1,z1),(x1,y0,z0),(x0,y1,z0),(x1,y1,z0),k)
        ,if(l==3,
        cglCubesSimplex((x1,y1,z1),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1),k)
        ,// l == 4
        cglCubesSimplex((x1,y1,z1),(x0,y1,z1),(x0,y1,z0),(x0,y0,z1),k)
        ))
    );
    ,
    if(l<2,
        if(l==0,
        cglCubesSimplex((x0,y1,z1),(x1,y0,z1),(x1,y1,z0),(x1,y1,z1),k)
        ,// l==1
        cglCubesSimplex((x0,y0,z0),(x0,y1,z1),(x1,y0,z1),(x1,y1,z0),k)
        )
    ,
        if(l==2,
        cglCubesSimplex((x0,y1,z1),(x1,y0,z1),(x0,y0,z1),(x0,y0,z0),k)
        ,if(l==3,
        cglCubesSimplex((x0,y1,z1),(x0,y1,z0),(x1,y1,z0),(x0,y0,z0),k)
        ,// l == 4
        cglCubesSimplex((x1,y0,z0),(x1,y0,z1),(x1,y1,z0),(x0,y0,z0),k)
        ))
    );
    );
);
cglCubesComputeVertex(xlk,yz,N):=(
    regional(x,y,z,xl,xp,yp,zp,k,l,type2);
    k = mod(xlk,6);
    xl = floor(xlk / 6);
    l = mod(xl,5);
    x = floor(xl / 5);
    z = mod(yz,N);
    y = floor(yz/N);
    type2 = mod(x+y+z,2)==1;
    xp = x0 + ((x+1)/N) * (x1-x0);
    yp = y0 + ((y+1)/N) * (y1-y0);
    zp = z0 + ((z+1)/N) * (z1-z0);
    x = x0 + (x/N) * (x1-x0);
    y = y0 + (y/N) * (y1-y0);
    z = z0 + (z/N) * (z1-z0);
    cglCubesCube(x,y,z,xp,yp,zp,type2,l,k);
);

getTriangles(vertices):=(
    regional(triangles);
    // TODO: can this loop be made faster
    triangles = apply(select(vertices,v,v_4>0),v,(v_1,v_2,v_3));
);
triangulateCube(x0,y0,z0,x1,y1,z1,N):=(
    regional(L,R,vertices,triangles);
    createimage("buffer", N*6*5, N*N);
    L = [0, 0]; //bottom left corner
    R = [N*6*5, 0]; //bottom right corner
    colorplot(L, R, "buffer", cglCubesComputeVertex(floor(x),floor(y),N),plotModifiers->{
        "expr":expr,
        "x0": x0,"y0": y0,"z0": z0,"x1": x1,"y1": y1,"z1": z1,
        "N": N
    });
    // readpixels needs to reverse the row-order when source image is generated using CindyGL
    //   not reversing the pixels leads to a significant speedup
    // TODO?: add modifiers to readpixels instead of separate function at plugin level
    vertices = cglReadRawPixels("buffer",rgb->true,skipTransparent->true);
    //triangles = getTriangles(readpixels("buffer"));
);

cglInterface(triangulate3d,"cglTriangulate",(expr:(x,y,z),p0,p1,N),(gpu));
cglTriangulate(expr,p0,p1,N):=(
    regional(tmp,i,vertices,triangles,parts,n,ix,iy,iz);
    x0 = p0_1;
    y0 = p0_2;
    z0 = p0_3;
    x1 = p1_1;
    y1 = p1_2;
    z1 = p1_3;
    if(isundefined(gpu),
      gpu = true
    );
    triangles = if(gpu,
    // split into sub-cubes with side length <= 50
    if(N <= 50,
        triangulateCube(x0,y0,z0,x1,y1,z1,N);
    ,
        parts = ceil((N-5)/ 40);
        n = round(N/parts);
        flatten(apply(0..(parts-1),ix,
        apply(0..(parts-1),iy,
            apply(0..(parts-1),iz,
            triangulateCube(
                x0 + (ix/parts) * (x1-x0),
                y0 + (iy/parts) * (y1-y0),
                z0 + (iz/parts) * (z1-z0),
                x0 + ((ix+1)/parts) * (x1-x0),
                y0 + ((iy+1)/parts) * (y1-y0),
                z0 + ((iz+1)/parts) * (z1-z0),
                n
            )
            );
        );
        ),levels->3);
    );
    ,
    // TODO? (optionally?) use octtree approach instead of linear search
    // compute marching cube vertices
    vertices = flatten(
        apply(0..(N*N-1),yz,
        apply(0..(N*5*6-1),xlk,
            cglCubesComputeVertex(xlk,yz,N);
        )
        )
    );
    getTriangles(vertices);
    );
);