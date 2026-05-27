# CindyGL3D

CindyGl3D is an extension of CindyGL that allows to render 3-dimensional scenes containing multiple objects

It consists of an extension of the CindyGL-plugging together with wrapper functions written in CindyScript, provided in the file `cgl3d.cjs` located in the scripts folder.

## 3D-Objects



## Functions

### Manipulating the 3D scene

#### reset 3d scene: `reset3d()`
  removes all objects from the current scene

#### render 3d scene: `render3d()`
  <!--TODO: render3d-->
  
#### zoom and rotation
  * `rotate3d(dx,dy)` -> rotates 3d scene by `dx` radians around the y-Axis and `dy` radians around the z-Axis
  <!-- TODO? more general transforms-->
  * `zoom3d(zoomFactor)` -> scales all coordinates in the scene by the given `zoomFactor`

#### removing 3d-objects
  <!--TODO? allow manual adding of objects in public API-->
  * `delete3d(id)` -> completely 3d-object with the given `id` from the scene
  * `hide3d(id)` -> makes the 3d-objects with the given `id` invisible
  * `show3d(id)` -> makes the 3d-objects with the given `id` visible

### Drawing
All drawing function create one or multiple 3d-object within the current scene and return the ids of the created objects.

##### Common drawing modifiers
* `color` -> the surface color, has to be one of:
  - A list of 3/4 floats in the interval `[0,1]` representing the RGB-values of the color, with the fourth value being optionally used as a alpha component
  - A color-name as accepted by `cglColor`
  - A color-expression created by `cglColorExpr`
  - A texture-value created by `cglTexture`
* `texture` -> texture to use for the surface, mutually exclusive with `color` can be either an image-name or a texture-value created by `cglTexture`
* `colorBack` `textureBack` like `color` and `texture` but only applied to the "back-side" (surface normals pointing in view-direction) of the rendered surface
* `alpha` -> transparency value of the object, when the surface-color already has a alpha-component the two values are combined
* `light` -> function used to compute the surface lighting of the object from the surface color, surface-normal and view-direction given as parameters `(color,direction,normal)`. Predefined values for commonly defined values can be found in `cgl3d.light`
  - `cgl3d.light.none` -> use surface-color without modifications
  - `cgl3d.light.simple` -> slightly darken color depending on normal-direction
  - `cgl3d.light.normal` -> debug: use normal-vector as surface-color
  - `cgl3d.light.depth` -> debug: use depth-value as surface-color
  - `cgl3d.light.default` -> default lighting engine
  - `cgl3d.light.default2` -> slight variation of default
* `plotModifiers` -> modifiers to be applied to functions/shaders that are executed on the created 3D-objects

#### Spheres
* `draw3d(center)` -> alias for `sphere3d(center)`
* `sphere3d(center)` -> draw sphere with given center point and the default radius
* `sphere3d(center,radius)` -> draw a sphere with the given center and radius

Modifiers:
* `size` -> radius of the sphere (not for 2-argument version of `sphere3d`)
* `projection` -> Function mapping surface-normal to texture coordinates.
  Pre-defined values:
    - `cgl3d.projection.sphereStereographicC` apply stereographic projection to surface and returning texture-position as a single complex number
    - `cgl3d.projection.sphereEquirect` Converts normal-vector of a pair of angles (latitude&longitude) normalized to the interval `[0,1]`

#### Cylinders
* `draw3d(point1,point2)` -> draw a cylinder with the two end-points `point1` and `point2`
* `cylinder3d(center,orientation)` -> draw a cylinder with the given center and orientation, the endpoints of the cylinder are the two points `center+orientation` and `center-orientation`
* `cylinder3d(center,orientation,radius)` -> draw a cylinder with the given center and orientation and radius 

Modifiers:
* `size` -> radius of the cylinder (not for 3-argument version of `cylinder3d`)
* `colors` / `colorsBack` -> colors at the end-points of the cylinder, the surface color will be interpolated between samples
* `caps` -> style to use for rendering the ends of the cylinder
  Supported values include:
  - `cgl3d.cylinderCap.open` render a open cylinder
  - `cgl3d.cylinderCap.flat` cut cylinder at a flat-surface orthogonal to the orientation
  - `cgl3d.cylinderCap.round` add round end-caps to cylinder
* `cap1` `cap2` -> individually modify the two end-cap styles
* `direction1` -> direction to use as starting angle for surface-coordinate system
* `projection` -> function that maps `(surfaceNormal,height,cylinderOrientation)` to a texture coordinate, where `height` is the height along the cylinder normalized to the interval `[-1,1]`

#### Curves
* `connect3d(points)` -> join points by cylinders
* `curve3d(expr:(t),from,to)` -> draw a sampled curve

Modifiers:
* `colors` `colorsBack` -> colors at the sample points, the surface color will be interpolated between samples
* `samples` -> number of sample points to use (only for `curve3d`)
* `size` -> radius of the cylinders
* `caps` `cap1` `cap2` -> which caps should be used at the end of the curve, similar to `caps` modifiers on cylinder
* `joints` -> which connection type should be used between the segments, supported values are:
  - `cgl3d.connect.round` -> insert spheres at the connection points between cylinders
  - `cgl3d.connect.flat` -> extend cylinders until they meet in a flat surface
* `closed` -> if true the last point will be connected to first point

#### Tori
* `circle3d(center,orientation,radius)` -> alias for `torus3d`
* `torus3d(center,orientation,radius)` -> draw a torus with the default minor-radius
* `torus3d(center,orientation,radius1,radius2)` -> draw a torus with the given `center` point in the plane given by `orientation`, with major radius `radius1` and minor-radius `radius2`

Modifiers:
  - `size` -> minor-radius of torus (not for 4-argument version of `torus3d`)
  - `arcRange` -> alias for `angle1range`
  - `angle1range` -> range of angles along torus-arc that should be rendered
  - `angle2range` -> range of angles along minor circle that should be rendered
  - `direction1` -> direction to use as starting angle for surface-coordinate system

#### Polygons
* `draw3d(p1,p2,p3)` -> alias for `triangle3d(p1,p2,p3)`
* `triangle3d(p1,p2,p3)` -> draw a single triangle
* `polygon3d(vertices)` -> draw a polygon given as a sequence of points

Modifiers:
* `colors` `colorsBack` -> colors of the vertices, the surface color will be interpolated between vertices
* `uv` -> texture coordinates of vertices
* `normal` -> normal vector of surface (ignored if `normals` is given)
* `normals` -> vertex normals, either an array containing one normal vector per vertex or the result of calling `cglNormalExpr`
* `normalType` -> how normal vectors should be computed, will be ignored if it does not fit the normal-vector data passed through the `normal` and `normals` modifiers:
  - `cgl3d.normalType.flat` a single normal for the whole polygon
  - `cgl3d.normalType.triangle` one normal per triangle
  - `cgl3d.normalType.vertex` one normal per vertex
  - `cgl3d.normalType.pixel` normals are computed on a per-pixel basis
* `triangulation` triangulation method used for polygon (only for `polygon3d`) supported values include:
  - `cgl3d.triangulate.corner` connect every vertex to the first given vertex
  - `cgl3d.triangulate.spiral` create a triangle from each sequence of three consecutive vertices cutting out the middle vertex until no more vertices are left 
  - `cgl3d.triangulate.center` connect every vertex to an additional vertex at the center of the polygon
* `vertexModifiers` -> values attached to each vertex, the value at a given point will be interpolated between vertices

#### Triangular-Mesh
* `triangles3d(triangles)` -> draw a collection of triangles either given as a list of vertices or as a list of vertex-triples

<!--TODO: API: improve normals handling for triangles/mesh/polygon-->
Modifiers:
* `colors` `colorsBack` -> colors of the vertices, the surface color will be interpolated between vertices
* `uv` -> texture coordinates of vertices
* `normals` -> triangle normals
* `vertexModifiers` -> values attached to each vertex, the value at a given point will be interpolated between vertices

#### Rectangular Mesh
* `mesh3d(gridPoints)` -> draw a square mesh given as a 2D-array of grid-points

Modifiers:
* `colors` `colorsBack` -> colors of the vertices, the surface color will be interpolated between vertices
* `uv` -> texture coordinates of vertices
* `normals` -> normal vector data, interpreted according to normalType.
 For vertex and triangle for face normal the normal vector of the top-left vertex will be used, for triangle normals the top-left and bottom right
* `normalType` -> how normal vectors should be computed:
  - `cgl3d.normalType.face` one normal for each rectangular face
  - `cgl3d.normalType.triangle` one normal per triangle
  - `cgl3d.normalType.vertex` one normal per vertex
  - `cgl3d.normalType.pixel` normals are computed on a per-pixel basis
topology
* `vertexModifiers` -> values attached to each vertex, the value at a given point will be interpolated between vertices

#### Surfaces

* `surface3d(expr:(x,y,z))` -> draw an implicit surface given by the solution set of the equation `expr==0`

Modifiers:
* `dF:(x,y,z)` normal-vector at given (x,y,z)-coordinates
* `cutoffRegion` region where the surface should be rendered, possible values include:
  - `cgl3d.cutoff.screenSphere` largest centered sphere fitting in screen, updates with zoom
  - `cgl3d.cutoff.screenCylinder` largest centered cylinder fitting in screen, updates with zoom
  - `cgl3d.cutoff.screenCylinder.(orientation)` largest centered cylinder rotated in given `orientation` fitting in screen, updates with zoom
  - `cgl3d.cutoff.screenCube` largest axis-aligned centered cube fitting in screen, updates with zoom

  - `cgl3d.cutoff.sphere.(center,radius)` render within sphere with given `center` and radius
  - `cgl3d.cutoff.cylinder.(center,orientation,radius)` render within cylinder with given `center`, `orientation` and `radius`
  - `cgl3d.cutoff.cube.(center,sideLength)` render within axis-aligned cube with given `center` and `side-length`
  - `cgl3d.cutoff.cube.(center,sideLength,up,front)` render within cube with given `center` and `side-length` aligned in directions `up` and `front`
  - `cgl3d.cutoff.cuboid.(center,v1,v2,v3)` render within cuboid with given `center` and axes given by `v1`, `v2` and `v3`

* `degree` which algebraic degree should be used to approximate the surface, when `degree` is negative the maximum stable degree will be used
* `layers` how many independent layers of the object should be rendered

#### Plotting
* `plot3d(f:(x,y))` -> plot the 2D-function `(x,y) -> f(x,y)`
* `complexplot3d(f:(z))` / `cplot3d(f:(z))` -> plot the Complex function `z -> f(z)`
    The rendered surface if the magnitude of the function while the default surface-texture is the phase value of the function

Modifiers:
* `df:(x,y)` / `df:(z)` optional derivative of rendered function, can be used to get better normal vectors (by default the derivative is approximated numerically)
* `cutoffRegion` `degree` `layers` same modifiers as for `surface3d`