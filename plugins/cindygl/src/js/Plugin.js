function m4FlatTranspose(M) {
    return [M[0][0],M[1][0],M[2][0],M[3][0],M[0][1],M[1][1],M[2][1],M[3][1],
        M[0][2],M[1][2],M[2][2],M[3][2],M[0][3],M[1][3],M[2][3],M[3][3]];
}
// a flattened version of the inverse transpose of M
function m4InverseFlatTranspose(M){
  let adjM = [
    (M[1][1]*M[2][2]*M[3][3]-M[1][1]*M[2][3]*M[3][2]-M[1][2]*M[2][1]*M[3][3]+M[1][2]*M[2][3]*M[3][1]+M[1][3]*M[2][1]*M[3][2]-M[1][3]*M[2][2]*M[3][1]),
    -(M[1][0]*M[2][2]*M[3][3]-M[1][0]*M[2][3]*M[3][2]-M[1][2]*M[2][0]*M[3][3]+M[1][2]*M[2][3]*M[3][0]+M[1][3]*M[2][0]*M[3][2]-M[1][3]*M[2][2]*M[3][0]),
    (M[1][0]*M[2][1]*M[3][3]-M[1][0]*M[2][3]*M[3][1]-M[1][1]*M[2][0]*M[3][3]+M[1][1]*M[2][3]*M[3][0]+M[1][3]*M[2][0]*M[3][1]-M[1][3]*M[2][1]*M[3][0]),
    -(M[1][0]*M[2][1]*M[3][2]-M[1][0]*M[2][2]*M[3][1]-M[1][1]*M[2][0]*M[3][2]+M[1][1]*M[2][2]*M[3][0]+M[1][2]*M[2][0]*M[3][1]-M[1][2]*M[2][1]*M[3][0]),
    -(M[0][1]*M[2][2]*M[3][3]-M[0][1]*M[2][3]*M[3][2]-M[0][2]*M[2][1]*M[3][3]+M[0][2]*M[2][3]*M[3][1]+M[0][3]*M[2][1]*M[3][2]-M[0][3]*M[2][2]*M[3][1]),
    (M[0][0]*M[2][2]*M[3][3]-M[0][0]*M[2][3]*M[3][2]-M[0][2]*M[2][0]*M[3][3]+M[0][2]*M[2][3]*M[3][0]+M[0][3]*M[2][0]*M[3][2]-M[0][3]*M[2][2]*M[3][0]),
    -(M[0][0]*M[2][1]*M[3][3]-M[0][0]*M[2][3]*M[3][1]-M[0][1]*M[2][0]*M[3][3]+M[0][1]*M[2][3]*M[3][0]+M[0][3]*M[2][0]*M[3][1]-M[0][3]*M[2][1]*M[3][0]),
    (M[0][0]*M[2][1]*M[3][2]-M[0][0]*M[2][2]*M[3][1]-M[0][1]*M[2][0]*M[3][2]+M[0][1]*M[2][2]*M[3][0]+M[0][2]*M[2][0]*M[3][1]-M[0][2]*M[2][1]*M[3][0]),
    (M[0][1]*M[1][2]*M[3][3]-M[0][1]*M[1][3]*M[3][2]-M[0][2]*M[1][1]*M[3][3]+M[0][2]*M[1][3]*M[3][1]+M[0][3]*M[1][1]*M[3][2]-M[0][3]*M[1][2]*M[3][1]),
    -(M[0][0]*M[1][2]*M[3][3]-M[0][0]*M[1][3]*M[3][2]-M[0][2]*M[1][0]*M[3][3]+M[0][2]*M[1][3]*M[3][0]+M[0][3]*M[1][0]*M[3][2]-M[0][3]*M[1][2]*M[3][0]),
    (M[0][0]*M[1][1]*M[3][3]-M[0][0]*M[1][3]*M[3][1]-M[0][1]*M[1][0]*M[3][3]+M[0][1]*M[1][3]*M[3][0]+M[0][3]*M[1][0]*M[3][1]-M[0][3]*M[1][1]*M[3][0]),
    -(M[0][0]*M[1][1]*M[3][2]-M[0][0]*M[1][2]*M[3][1]-M[0][1]*M[1][0]*M[3][2]+M[0][1]*M[1][2]*M[3][0]+M[0][2]*M[1][0]*M[3][1]-M[0][2]*M[1][1]*M[3][0]),
    -(M[0][1]*M[1][2]*M[2][3]-M[0][1]*M[1][3]*M[2][2]-M[0][2]*M[1][1]*M[2][3]+M[0][2]*M[1][3]*M[2][1]+M[0][3]*M[1][1]*M[2][2]-M[0][3]*M[1][2]*M[2][1]),
    (M[0][0]*M[1][2]*M[2][3]-M[0][0]*M[1][3]*M[2][2]-M[0][2]*M[1][0]*M[2][3]+M[0][2]*M[1][3]*M[2][0]+M[0][3]*M[1][0]*M[2][2]-M[0][3]*M[1][2]*M[2][0]),
    -(M[0][0]*M[1][1]*M[2][3]-M[0][0]*M[1][3]*M[2][1]-M[0][1]*M[1][0]*M[2][3]+M[0][1]*M[1][3]*M[2][0]+M[0][3]*M[1][0]*M[2][1]-M[0][3]*M[1][1]*M[2][0]),
    (M[0][0]*M[1][1]*M[2][2]-M[0][0]*M[1][2]*M[2][1]-M[0][1]*M[1][0]*M[2][2]+M[0][1]*M[1][2]*M[2][0]+M[0][2]*M[1][0]*M[2][1]-M[0][2]*M[1][1]*M[2][0]),
  ];
  let invDet = 1/(M[0][0]*adjM[0]+M[0][1]*adjM[1]+M[0][2]*adjM[2]+M[0][3]*adjM[3]);
  for(let i=0;i<16;i++)adjM[i]*=invDet;
  return adjM;
}
// try evaluating expr, return nada if evaluation fails
// silences all errors& warnings that occur during evaluation
function tryEvaluate(expr,api,def) {
    let value = def;
    const oldLog = console.log;
    try{
        // this is evil:
        //  redefine console.log to silence error messages during `api.evaluate` call
        console.log = function() {};
        value = api.evaluate(expr);
    } catch (ignored) {
        // if evaluation failed use result as expression
    } finally {
        // restore console.log to previous value
        console.log = oldLog;
    }
    return value;
}

/**
 * @param {Renderer} renderer rendering program
 * @param { { type: * } } boundingBox bounding box of rendered object in 3D space
 * @param {Map<string,*>} plotModifiers
 * @param { Set<string> } tags tags assigned to this Object
 * @constructor
 */
function CindyGL3DObject(renderer,boundingBox,plotModifiers,tags) {
    /**@type {number} */
    this.id = CindyGL3DObject.NEXT_ID++;
    this.renderer = renderer;
    this.boundingBox = boundingBox;
    this.plotModifiers = plotModifiers;
    this.data = new Map();
    this.visible = true;
}
CindyGL3DObject.NEXT_ID=0;

let cglLogLevel = 3;
function cglLogError(...args){
    if(cglLogLevel<0)return;
    console.error(...args);
}
function cglLogWarning(...args){
    if(cglLogLevel<1)return;
    console.warn(...args);
}
function cglLogInfo(...args){
    if(cglLogLevel<2)return;
    console.info(...args);
}
function cglLogDebug(...args){
    if(cglLogLevel<3)return;
    console.debug(...args);
}

let CindyGL = function(api) {

    //////////////////////////////////////////////////////////////////////
    // API bindings
    nada = api.nada;

    //myfunctions = api.getMyfunctions();

    api.defineFunction("compile", 1, (args, modifs) => {
        let expr = args[0];
        let cb = new CodeBuilder(api);
        let plotModifiers = get3DPlotModifiers(modifs);
        let code = cb.generateColorPlotProgram(expr,plotModifiers,false);
        cglLogDebug(code);
        return {
            ctype: 'string',
            value: code
        };
        //console.log(myfunctions);
    });

    api.defineFunction("use8bittextures", 0, (args, modifs) => {
        use8bittextures = true;
        can_use_texture_float = can_use_texture_half_float = false;
        cglLogInfo("Switching to 8-bit textures mode.");
        return api.nada;
    });

    /**
     * argument canvaswrapper is optional. If it is not given, it will render on glcanvas
     */
    function compileAndRender(prog,a, b, width, height,boundingBox, canvaswrapper,plotModifiers) {
        let renderer=compile(prog,boundingBox,plotModifiers,new Map(),false);
        renderer.render2d(a, b, width, height, boundingBox, plotModifiers, canvaswrapper);
        if (canvaswrapper)
            canvaswrapper.generation = Math.max(canvaswrapper.generation, canvaswrapper.canvas.generation + 1);
    }
    /**
     * @param {CindyJS.anyval} prog
     * @param boundingBox
     * @param {Map<string,*>} plotModifiers values of plot-modifier arguments
     * @param {Map<string,{values: Array<*>,eltType: *}>} vModifiers vertex modifiers
     * @param {boolean} mode3D
     * @returns {Renderer}
     */
    function compile(prog,boundingBox,plotModifiers,vModifiers,mode3D) {
        /**@type {Map<string,{type: *,isuniform: boolean,used: boolean}>} */
        const modifierTypes = new Map();
        /**@type {Map<string,{type: *,isuniform: boolean,used: boolean}>} */
        const mergedTypes = new Map();
        plotModifiers.forEach((value,key) => {
            let valType = guessTypeOfValue(value);
            modifierTypes.set(key, {type: valType,isuniform: true,used: false});
            mergedTypes.set(key, {type: valType,isuniform: true,used: false});
        });
        vModifiers.forEach((value,key) => {
            modifierTypes.set(key, {type: value.eltType,isuniform: false,used: false});
            mergedTypes.set(key, {type: value.eltType,isuniform: false,used: false});
        });
        if (typeof(prog.renderers)==="undefined") prog.renderers = [];
        /**@type {Renderer} */
        let renderer;
        let foundMatch = false;
        for(const candidate of prog.renderers){
            renderer = candidate;
            // ensure modifier types are compatible with previous modifiers
            let prevModifiers=renderer.modifierTypes;
            if(prevModifiers.size != modifierTypes.size)
                continue; // different sets of modifiers -> try next renderer
            let changed = false;
            let compatible = true;
            for(const key of mergedTypes.keys()){
                const value = modifierTypes.get(key);
                if(prevModifiers.has(key)) {
                    let prevVal = prevModifiers.get(key);
                    if(prevVal.isuniform != value.isuniform){
                        compatible = false;
                        break;
                    }
                    let commonType = lca(value.type,prevVal.type);
                    if(commonType===false){
                        // incompatible modifier types
                        compatible = false;
                        break;
                    } else if(! typesareequal(commonType, prevVal.type)) {
                        changed = true;
                        cglLogDebug(`changed type of modifier ${key} to ${typeToString(commonType)}`);
                    }
                    mergedTypes.get(key).type = commonType;
                } else {
                    // different sets of modifiers
                    compatible = false;
                    break;
                }
            }
            if(!compatible)
                continue; // different sets of modifiers  -> try next renderer
            if(changed) {
                renderer.updateModifierTypes(mergedTypes);
            }
            foundMatch = true;
            break;
        }
        if(!foundMatch){
            cglLogDebug("create new Renderer for modifiers: ",modifierTypes);
            renderer = new Renderer(api, prog, boundingBox, modifierTypes,mode3D);
            prog.renderers.push(renderer);
            modifierTypes.forEach((value,key)=>{
                if(!value.used){
                    cglLogInfo(`modifier ${key} is never used`)
                }
            });
        }
        return renderer;
    }
    /** ensure all plot-modifiers have correct data-type */
    function updateModifierTypes(obj3d) {
        obj3d.renderer = compile(obj3d.renderer.expression,obj3d.boundingBox,obj3d.plotModifiers,new Map(),true)
    }
    function toCjsNumber(x) {
        return {
            ctype: 'number',
            value: {
                'real': x,
                'imag': 0
            }
        };
    }
    function toCjs(value) {
        if(typeof(value) === "number"){
            return toCjsNumber(value);
        }
        if(typeof(value) === "boolean"){
            return {
                ctype: "boolean",
                value: value
            };
        }
        if(value instanceof Array){
            return {
                ctype: 'list',
                value: value.map(toCjs)
            };
        }
        console.log("unknown CindyScript value: ",value);
        return nada;
    }
    function toJsVal(value) {
        if(value["ctype"] == "list") {
            return value["value"].map(toJsVal)
        } else if(value["ctype"] == "number") {
            return coerce.toReal(value,0);
        } else if(value["ctype"] == "boolean" || value["ctype"] == "string") {
            return value["value"]
        }
        console.log("cannot convert CindyScript value ",value," to Javascript");
        return undefined;
    }

    /**
     * @param {CindyJS.anyval} paramArg
     * @returns {Array<CindyJS.anyval>}
     *  */
    function lambdaParams(paramArg){
        if(paramArg['ctype'] === "list") {
            return paramArg['value'];
        } else if(paramArg['ctype'] === "function" && paramArg['oper'] === "genList"){
            return paramArg['args'];
        } else {
            return [paramArg];
        }
    }
    /** replace all occurences of names in argValues in the given expression with their corresponding value
        @param {Map<string,CindyJS.anyval>} argValues
    */
    function replaceVariables(expr,argValues){
        if(expr['ctype'] === 'variable') {
            const name = expr['name'];
            // TODO? are there any unhandled cases of variable shadowing
            if(argValues.has(name))
                return argValues.get(name);
            // name not matched
            return expr;
        } else if(expr['ctype'] === 'field') {
            // create copy of expression
            let newExpr = Object.assign({}, expr);
            // do not replace key for field
            newExpr['obj'] = replaceVariables(expr['obj'],argValues);
            return newExpr;
        } else if(expr['ctype'] === 'userdata') {
            // create copy of expression
            let newExpr = Object.assign({}, expr);
            newExpr['key'] = replaceVariables(expr['key'],argValues);
            newExpr['obj'] = replaceVariables(expr['obj'],argValues);
            return newExpr;
        } else if(expr.hasOwnProperty('args')) {
            let newArgs;
            if(expr['ctype'] === 'function' && ["repeat$2", "forall$2", "apply$2", "sum$2", "product$2"].includes(expr['oper'])) {
                // treat loop-body as seperate scope
                let argValues2 = /** @type {Map<string,CindyJS.anyval>}*/ (new Map(argValues));
                argValues2.delete("#");
                newArgs = [replaceVariables(expr['args'][0],argValues),replaceVariables(expr['args'][1],argValues2)];
            } else if(expr['ctype'] === 'function' && ["repeat$3", "forall$3", "apply$3", "sum$3", "product$3"].includes(expr['oper'])) {
                const itrName = expr['args'][1]['name'];
                // treat loop-body as seperate scope
                let argValues2 = /** @type {Map<string,CindyJS.anyval>}*/ (new Map(argValues));
                argValues2.delete(itrName);
                newArgs = [replaceVariables(expr['args'][0],argValues),expr['args'][1],replaceVariables(expr['args'][2],argValues2)];
            } else if(expr['ctype'] === 'function' && expr['oper'] === "lambda$2") {
                const params = lambdaParams(expr['args'][0]);
                // seperate scope within body -> create copy of argValues
                let argValues2 = /** @type {Map<string,CindyJS.anyval>}*/ (new Map(argValues));
                params.forEach(v=>{
                    argValues2.delete(v['name']);
                });
                newArgs = [replaceVariables(expr['args'][0],argValues),replaceVariables(expr['args'][1],argValues2)];
            } else if(expr['oper'] === "=" && argValues.has(expr['args'][0]['name'])) {
                let argVal = argValues.get(expr['args'][0]['name']);
                if(argVal['name'] && argVal['name'].includes("_")) {
                    // regional variable
                    newArgs = expr['args'].map((oldArg)=>replaceVariables(oldArg,argValues));
                } else {
                    // TODO? how to handle (conditional) assignment to lambda parameter
                    cglLogError(`assignment to lambda parameter "${expr['args'][0]['name']}" is not supported`);
                }
            } else if(expr['oper'] === ":=") {
                const lhs = expr['args'][0];
                const rhs = expr['args'][1];
                const params = lhs['args'] === undefined ? [] : lhs['args'];
                // seperate scope for function body
                let argValues2 = /** @type {Map<string,CindyJS.anyval>}*/ (new Map(argValues));
                params.forEach(v=>{
                    argValues2.delete(v['name']);
                });
                newArgs = [lhs,replaceVariables(rhs,argValues2)];
            } else if(expr['ctype'] === 'function' && getPlainName(expr['oper']) === "regional") {
                newArgs = expr['args'].map(v=>{
                    let renamed = /** @type CindyJS.anyval*/(Object.assign({}, v));
                    // regional variables in api.evaluate leak into enclosing scope
                    // -> set name to invalid identifier to ensure variable stays within eval-block
                    renamed['name']=`0_${v['name']}`;
                    argValues.set(v['name'],renamed); // regional shaddows argument
                    return renamed;
                });
            } else {
                newArgs = expr['args'].map((oldArg)=>replaceVariables(oldArg,argValues));
            }
            // create copy of expression
            let newExpr = Object.assign({}, expr);
            newExpr['args'] = newArgs;
            if(expr['modifs'] !== undefined) {
                let newMods = {};
                Object.entries(expr['modifs']).forEach(([key,oldMod])=>{
                    newMods[key]=replaceVariables(oldMod,argValues);
                });
                newExpr['modifs'] = newMods;
            }
            return newExpr;
        }
        // TODO is this enough to replace all lambda params
        return expr;
    }

    api.defineFunction("forcerecompile", 0, (args, modifs) => {
        requiredcompiletime++;
        return nada;
    });

    /**
     * plots colorplot on whole main canvas in CindyJS coordinates
     */
    api.defineFunction("colorplot", 1, (args, modifs) => {
        initGLIfRequired();

        var prog = args[0];
        let plotModifiers=get3DPlotModifiers(modifs);

        let iw = api.instance['canvas']['width']; //internal measures. might be multiple of api.instance['canvas']['clientWidth'] on HiDPI-Displays
        let ih = api.instance['canvas']['height'];

        compileAndRender(prog,computeLowerLeftCorner(api), computeLowerRightCorner(api), iw, ih,Renderer.noBounds(),null,plotModifiers);
        let csctx = api.instance['canvas'].getContext('2d');

        csctx.save();
        csctx.setTransform(1, 0, 0, 1, 0, 0);
        csctx.drawImage(glcanvas, 0, 0, iw, ih, 0, 0, iw, ih);
        csctx.restore();

        return nada;
    });


    /**
     * plots colorplot on main canvas in CindyJS coordinates in the rectangle bounded by two points (as in Cinderella: coloplot(<expr>, <vec>, <vec>))
     */
    api.defineFunction("colorplot", 3, (args, modifs) => {
        initGLIfRequired();

        var prog = args[0];
        let plotModifiers=get3DPlotModifiers(modifs);
        var a = api.extractPoint(api.evaluateAndVal(args[1]));
        var b = api.extractPoint(api.evaluateAndVal(args[2]));

        var ll = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y)
        }; //lower left pt
        var lr = {
            x: Math.max(a.x, b.x),
            y: Math.min(a.y, b.y)
        }; //lower right pt
        var ul = {
            x: Math.min(a.x, b.x),
            y: Math.max(a.y, b.y)
        }; //upper left pt

        let iw = api.instance['canvas']['width']; //internal measures. (works also on HiDPI-Displays)
        let ih = api.instance['canvas']['height'];

        let cul = computeUpperLeftCorner(api);
        let clr = computeLowerRightCorner(api);

        let fx = Math.abs((a.x - b.x) / (clr.x - cul.x)); //x-ratio of screen that is used
        let fy = Math.abs((a.y - b.y) / (clr.y - cul.y)); //y-ratio of screen that is used

        compileAndRender(prog,ll, lr, iw * fx, ih * fy,Renderer.noBounds(), null,plotModifiers);
        let csctx = api.instance['canvas'].getContext('2d');

        let pt = {
            x: Math.min(a.x, b.x),
            y: Math.max(a.y, b.y)
        };
        let m = api.getInitialMatrix();

        var xx = iw * (ul.x - cul.x) / (clr.x - cul.x);
        var yy = ih * (ul.y - cul.y) / (clr.y - cul.y);

        csctx.save();
        csctx.setTransform(1, 0, 0, 1, 0, 0);
        csctx.drawImage(glcanvas, 0, 0, iw * fx, ih * fy, xx, yy, iw * fx, ih * fy);
        csctx.restore();
        return nada;
    });

    /**
     * plots on a given canvas and assumes that it lies on CindyJS-table with corners having coordinates a and b.
     */
    api.defineFunction("colorplot", 4, (args, modifs) => {
        initGLIfRequired();
        let plotModifiers=get3DPlotModifiers(modifs);

        var a = api.extractPoint(api.evaluateAndVal(args[0]));
        var b = api.extractPoint(api.evaluateAndVal(args[1]));
        var name = api.evaluateAndVal(args[2]);
        var prog = args[3];

        if (!a.ok || !b.ok || name.ctype !== 'string') {
            return nada;
        }
        let imageobject = api.getImage(name['value'], true);
        //let canvaswrapper = generateWriteCanvasWrapperIfRequired(imageobject, api);
        let canvaswrapper = generateCanvasWrapperIfRequired(imageobject, api, false);
        var cw = imageobject.width;
        var ch = imageobject.height;
        compileAndRender(prog, a, b, cw, ch,Renderer.noBounds(), canvaswrapper,plotModifiers);

        return nada;
    });

    /**
     * plots on a given canvas and assumes that it lies on CindyJS-table sharing the two bottom corners of main canvas
     */
    api.defineFunction("colorplot", 2, (args, modifs) => {
        initGLIfRequired();
        let plotModifiers=get3DPlotModifiers(modifs);

        var a = computeLowerLeftCorner(api);
        var b = computeLowerRightCorner(api);
        var name = api.evaluateAndVal(args[0]);
        var prog = args[1];

        if (name.ctype !== 'string') {
            return nada;
        }

        let imageobject = api.getImage(name['value'], true);
        //let canvaswrapper = generateWriteCanvasWrapperIfRequired(imageobject, api);
        let canvaswrapper = generateCanvasWrapperIfRequired(imageobject, api, false);
        var cw = imageobject.width;
        var ch = imageobject.height;
        compileAndRender(prog, a, b, cw, ch, Renderer.noBounds() ,canvaswrapper,plotModifiers);


        return nada;
    });

    function readModifierList(modValue,modName,modifiers,addModifier) {
        let modList;
        if(modValue["ctype"] === "list") {
            modList = modValue['value'];
            modList = modList.map(v => {
                if(v['ctype'] !== 'list' || v['value'].length != 2) {
                    cglLogError("unexpected entry in modifier list expected [key,value] got: ",v);
                    return [undefined,undefined];
                }
                let key = v["value"][0];
                if(key['ctype'] !== "string") {
                    cglLogError("unexpected key for modifier list expected string got: ",key);
                    return;
                }
                key = key['value'];
                return [key,v["value"][1]];
            });
        } else if(modValue["ctype"] === "JSON") {
            modList = Object.entries(modValue['value']);
        } else {
            cglLogError(`unexpected value for '${modName}' expected list or dict got: `,modValue);
            modList=[];
        }
        modList.forEach(([key,value])=>{
            addModifier(modifiers,key,value);
        });
        return modifiers;
    }
    /**
     * get plot modifers from object
     * @param {Object} callModifiers
     * @returns {Map<string,*>}
     */
    function get3DPlotModifiers(callModifiers){
        let modifiers = new Map();
        // TODO? warn for duplicate elements
        function addUmodifier(modifiers,modName,modValue) {
            if(CodeBuilder.builtIns.has(modName)){
                cglLogWarning("modifier is shadowed by built-in: "+modName);
            }
            modifiers.set(modName,modValue);
        }
        if(callModifiers.hasOwnProperty("plotModifiers")){
            modifiers=readModifierList(api.evaluate(callModifiers["plotModifiers"]),"plotModifiers",modifiers,addUmodifier);
        }
        return modifiers;
    }
    /**
     * get vertex modifers from object
     * @param {Object} callModifiers
     * @param {number} vCount
     * @returns {Map<string,{values: Array<*>,eltType: *}>}
     */
    function get3DPlotVertexModifiers(callModifiers,vCount,plotModifiers){
        let modifiers = new Map();
        function addVmodifier(modifiers,modName,modValue) {
            if(plotModifiers.has(modName)){
                cglLogWarning("vertex modifer is shadowed by uniform modifier: "+modName);
                return;
            }
            if(CodeBuilder.builtIns.has(modName)){
                cglLogWarning("modifer is shadowed by built-in: "+modName);
            }
            let valList = coerce.toList(modValue,[]);
            if(valList.length != vCount){
                cglLogError(`vertex modifier should be list with one element for each vertex: ${modName}`);
                cglLogError(`expected: ${vCount} got: ${valList.length}`);
                return;
            }
            // compute common element type
            let eltType = valList.map(guessTypeOfValue).reduce(lca);
            // promote int to float to allow interpolation
            eltType = replaceIntbyFloat(eltType);
            modifiers.set(modName,{values: valList,eltType: eltType});
        }
        if(callModifiers.hasOwnProperty("vModifiers")){
            modifiers=readModifierList(api.evaluate(callModifiers["vModifiers"]),"vModifiers",modifiers,addVmodifier);
        }
        return modifiers;
    }
    /**
     * @param {Object} callModifiers
     * @returns {Set<string>}
     */
    function get3DPlotTags(callModifiers){
        let tags = new Set();
        if(callModifiers.hasOwnProperty("tags")){
            let tagList = coerce.toList(api.evaluateAndVal(callModifiers["tags"]));
            tagList.forEach((tagValue)=>{
                tags.add(coerce.toString(tagValue));
            });
        }
        return tags;
    }
    /**
     * @param {*} modifs
     * @param {string} name
     * @param {number} defValue
     * @returns {number} */
    function getRealModifier(modifs,name,defValue) {
        if(!modifs.hasOwnProperty(name))
            return defValue;
        return coerce.toReal(api.evaluateAndVal(modifs[name]),defValue);
    }
    /**
     * @param {*} modifs
     * @param {string} name
     * @param {Array<number>} defValue
     * @returns {Array<number>} */
    function getPoint2DModifier(modifs,name,defValue) {
        if(!modifs.hasOwnProperty(name))
            return defValue;
        let val0 = api.evaluateAndVal(modifs[name]);
        val0 = coerce.toList(val0);
        if(val0 === null)
            return defValue;
        /**@type {Array<number>} */
        let val = val0.map(coerce.toReal);
        if(val.length < 2) {
            cglLogWarning(`not enough elements for point ${name} expected 2 got ${val.length}`);
            return val.length > 0 ? [val[0],val[0]] : defValue;
        } else if(val.length > 2) {
            cglLogWarning("point has to many components, truncating");
            return val.slice(0,2);
        }
        return val;
    }

    /**
     * plots colorplot on whole main canvas in CindyJS coordinates
     * uses the z-coordinate for the nearest pixel as depth information
     */
    api.defineFunction("cgl3dNewObject", 1, (args, modifs) => {
        initGLIfRequired();
        var prog = args[0];
        let plotModifiers=get3DPlotModifiers(modifs);
        let compiledProg=compile(prog,Renderer.noBounds(),plotModifiers,new Map(),true);
        let obj3d=new CindyGL3DObject(compiledProg,Renderer.noBounds(),plotModifiers,get3DPlotTags(modifs));
        obj3d.data.set("opaqueIf",api.evaluate(modifs['opaqueIf'] || nada));
        return {"ctype":"cgl3dObject","value":obj3d};
    });
    function verticesFromCJS(vertices){
        vertices = coerce.toList(vertices);
        if(!(vertices instanceof Array)||vertices.length == 0){
            // no array or no vertices
            return undefined;
        }
        let eltType = vertices[0]['ctype'];
        // flatten vertex list
        // TODO! check if all components have same size
        if(eltType === 'list') {
            // nested list
            vertices = vertices.flatMap(v=>{
                let xyz=coerce.toList(v);
                if(!Array.isArray(xyz)||xyz.length!=3){
                    let contentType="vertices";
                    if(Array.isArray(xyz)&&xyz.length>0&&xyz[0]['ctype']=='list'){
                        contentType = "triangles";
                    }
                    cglLogWarning(`${contentType} should be lists of length 3`);
                    return [];
                }
                return xyz;
            });
            eltType = vertices[0]['ctype'];
            // doubly nested list
            if(eltType === 'list') {
                vertices = vertices.flatMap(v=>{
                    let xyz=coerce.toList(v);
                    if(!Array.isArray(xyz)||xyz.length!=3){
                        cglLogWarning("vertices should be lists of length 3");
                        return [];
                    }
                    return xyz;
                });
                eltType = vertices[0]['ctype'];
            }
        }
        if(eltType === 'number') {
            vertices = vertices.map(coerce.toReal);
            if(vertices.length % 3 !== 0){
                cglLogError("the number of coordinates should be divisible by 3");
            }else if(vertices.length % 9 !== 0){
                cglLogError("the number of vertices should be divisible by 3");
            }
        } else {
            cglLogError(`unexpected type for vertex-coordinate: ${eltType}`);
            return undefined;
        }
        return vertices;
    }
    /**
     * plots colorplot on whole main canvas in CindyJS coordinates
     * uses the z-coordinate for the nearest pixel as depth information
     *
     * renderes the given colorplot function on a triangual mesh given in the second parameter.
     * the triangles can be given in one of the following three formats:
     *   - [x1,y1,z1,x2,y2,z2,...]      list of vertex coordinates
     *   - [v1,v2,v3,v4,...]            list of vertices
     *   - [[v1,v2,v3],[u1,u2,u3],...]  list of triangles
     */
    api.defineFunction("cgl3dNewMesh", 2, (args, modifs) => {
        initGLIfRequired();
        let prog = args[0];
        let plotModifiers = get3DPlotModifiers(modifs);
        let vertices = verticesFromCJS(api.evaluateAndVal(args[1]));
        if(vertices === undefined) {
            cglLogWarning("invalid vertex data",args[1]);
            return nada;
        }
        let vCount = vertices.length/3;
        if(vCount < 3) {
            cglLogWarning("not enough vertices for triangle");
            return nada; // not enough vertices
        }
        let vModifiers = get3DPlotVertexModifiers(modifs,vCount,plotModifiers);
        let boundingBox = Renderer.boundingTriangles(vertices,vModifiers);
        let compiledProg = compile(prog,boundingBox,plotModifiers,vModifiers,true);
        let obj3d=new CindyGL3DObject(compiledProg,boundingBox,plotModifiers,get3DPlotTags(modifs));
        obj3d.data.set("opaqueIf",api.evaluate(modifs['opaqueIf'] || nada));
        return {"ctype":"cgl3dObject","value":obj3d};
    });
    /**
     * plots colorplot in region bounded by sphere
     * uses the z-coordinate for the nearest pixel as depth information
     * args:  <expr> <center> <radius>
     */
    api.defineFunction("cgl3dNewSphere", 3, (args, modifs) => {
        initGLIfRequired();
        var prog = args[0];
        let plotModifiers=get3DPlotModifiers(modifs);
        var center = coerce.toDirection(api.evaluateAndVal(args[1]));
        var radius = api.evaluateAndVal(args[2])["value"]["real"];
        let boundingBox = Renderer.boundingSphere(center,radius);
        let compiledProg=compile(prog,boundingBox,plotModifiers,new Map(),true);
        let obj3d=new CindyGL3DObject(compiledProg,boundingBox,plotModifiers,get3DPlotTags(modifs));
        obj3d.data.set("opaqueIf",api.evaluate(modifs['opaqueIf'] || nada));
        return {"ctype":"cgl3dObject","value":obj3d};
    });
    /**
     * plots colorplot in region bounded by cylinder
     * uses the z-coordinate for the nearest pixel as depth information
     * args:  <expr> <center> <delta> <radius>
     *   center -> center point of cylinder
     *   delta  -> vector pointing from center to one endpoint (endpoints are center+delta and center-delta)
     *   radius -> radius of cylinder
     */
    api.defineFunction("cgl3dNewCylinder", 4, (args, modifs) => {
        initGLIfRequired();
        let prog = args[0];
        let plotModifiers=get3DPlotModifiers(modifs);
        let center = coerce.toDirection(api.evaluateAndVal(args[1]));
        let delta = coerce.toDirection(api.evaluateAndVal(args[2]));
        let radius = api.evaluateAndVal(args[3])["value"]["real"];
        let overhang = 0;
        if (modifs.hasOwnProperty("overhang")) {
            overhang = api.evaluateAndVal(modifs["overhang"])["value"]["real"];
        }
        let boundingBox = Renderer.boundingCylinder(center,delta,radius,overhang);
        let compiledProg=compile(prog,boundingBox,plotModifiers,new Map(),true);
        let obj3d=new CindyGL3DObject(compiledProg,boundingBox,plotModifiers,get3DPlotTags(modifs));
        obj3d.data.set("opaqueIf",api.evaluate(modifs['opaqueIf'] || nada));
        return {"ctype":"cgl3dObject","value":obj3d};
    });
    /**
     * plots colorplot in region bounded by cuboid
     * uses the z-coordinate for the nearest pixel as depth information
     * args:  <expr> <center> <v1> <v2> <v3>
     *   cuboid is given by the 8 corners: center +- v1 +- v2 +- v3
     */
    api.defineFunction("cgl3dNewCuboid", 5, (args, modifs) => {
        initGLIfRequired();
        var prog = args[0];
        let plotModifiers=get3DPlotModifiers(modifs);
        var center = coerce.toDirection(api.evaluateAndVal(args[1]));
        var v1 = coerce.toDirection(api.evaluateAndVal(args[2]));
        var v2 = coerce.toDirection(api.evaluateAndVal(args[3]));
        var v3 = coerce.toDirection(api.evaluateAndVal(args[4]));
        let boundingBox = Renderer.boundingCuboid(center,v1,v2,v3);
        let compiledProg=compile(prog,boundingBox,plotModifiers,new Map(),true);
        let obj3d=new CindyGL3DObject(compiledProg,boundingBox,plotModifiers,get3DPlotTags(modifs));
        obj3d.data.set("opaqueIf",api.evaluate(modifs['opaqueIf'] || nada));
        return {"ctype":"cgl3dObject","value":obj3d};
    });

    // TODO? automatic update of coordinate system to match render region of screen

    function getDefinedValueOrNull(expr) {
        if (expr === undefined || expr === null) return null;
        let val = api.evaluateAndVal(expr);
        if (val['ctype'] !== "undefined") return val;
        return null;
    }
    api.defineFunction("cgl3dStartRender", 0, (args, modifs) => {
        let image = null;
        if (modifs["image"] !== undefined) {
            let imageVal = api.evaluateAndVal(modifs["image"]);
            if (imageVal['ctype'] === "string") {
                image = api.getImage(imageVal['value'], true);
            } else {
                if (imageVal['ctype'] !== "undefined") {
                    cglLogWarning("expected image name got: ",imageVal);
                }
            }
        }
        let transform = getDefinedValueOrNull(modifs["transform"]);
        if (transform !== null) {
            transform = coerce.toList(transform).map((val)=>coerce.toList(val).map(coerce.toReal));
        } else {
            transform = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        }
        let bounds = getDefinedValueOrNull(modifs["bounds"]);
        if (bounds !== null) bounds = coerce.toList(bounds).map(coerce.toReal);
        let pixelBounds = [];
        let canvaswrapper;
        if (image !== null) {
            canvaswrapper = generateCanvasWrapperIfRequired(image, api, false);
            if(bounds === null) {
                pixelBounds = [0,0,image.width,image.height];
            } else {
                pixelBounds = bounds;
            }
        } else {
            canvaswrapper = null;
            if(bounds === null) {
                pixelBounds = [0,0,api.instance['canvas']['width'],api.instance['canvas']['height']];
            } else {
                let cul = computeUpperLeftCorner(api);
                let clr = computeLowerRightCorner(api);
                let [x0,y0,w,h] = bounds;
                let fx = api.instance['canvas']['width'] * Math.abs(w / (clr.x - cul.x)); //x-ratio of screen that is used
                let fy = api.instance['canvas']['height'] * Math.abs(h / (clr.y - cul.y)); //y-ratio of screen that is used
                let xx = api.instance['canvas']['width'] * (x0 - cul.x) / (clr.x - cul.x);
                let yy = api.instance['canvas']['height'] * ((y0+h) - cul.y) / (clr.y - cul.y);
                // internal measures. might be multiple of api.instance['canvas']['clientWidth'] on HiDPI-Displays
                pixelBounds = [xx,yy,fx,fy];
            }
        }
        let iw = pixelBounds[2];
        let ih = pixelBounds[3];
        initGLIfRequired();
        let layerCount = getRealModifier(modifs,"layers",0);
        Renderer.resetCachedState();
        gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);
        if (CindyGL.sceneRenderer !== null) cglLogWarning("once one rendering pass can be active at a given type, call `cgl3dFinishRender` before calling `cgl3dStartRender` a second time");
        CindyGL.sceneRenderer = (layerCount != 0) ?
             new Cgl3dLayeredSceneRenderer(iw,ih,canvaswrapper,layerCount) :
            new Cgl3dSimpleSceneRenderer(iw,ih,canvaswrapper);
        CindyGL.sceneRenderer.pixelBounds = pixelBounds;
        CindyGL.sceneRenderer.transform =  m4FlatTranspose(transform);
        CindyGL.sceneRenderer.inverseTrafo = m4InverseFlatTranspose(transform);
        return nada;
    });
    function getRenderObjects(arg) {
        arg = api.evaluateAndVal(arg);
        if (arg['ctype'] === "JSON") {
            // TODO: how expensive is this
            return Object.values(arg['value'])
        } else if (arg['ctype'] === "list") {
            return arg['value']
        } else if (arg['ctype'] === "cgl3dObject") {
            return [arg];
        } else {
            cglLogError("unsupported argument for render: ",arg);
        }
    }
    api.defineFunction("cgl3dRenderOpaque", 1, (args, modifs) => {
        if (CindyGL.sceneRenderer === null){
            cglLogError("no active rendering pass, call `cgl3dStartRender` before calling `cgl3dRenderOpaque`");
            return nada;
        }
        CindyGL.sceneRenderer.renderOpaque(getRenderObjects(args[0]));
        return nada;
    });
    api.defineFunction("cgl3dRenderTranslucent", 1, (args, modifs) => {
        if (CindyGL.sceneRenderer === null){
            cglLogError("no active rendering pass, call `cgl3dStartRender` before calling `cgl3dRenderOpaque`");
            return nada;
        }
        // TODO: reintroduce depth-sorting for mesh-triangles
        CindyGL.sceneRenderer.renderTranslucent(getRenderObjects(args[0]));
        return nada;
    });
    api.defineFunction("cgl3dFinishRender", 0, (args, modifs) => {
        if (CindyGL.sceneRenderer === null){
            cglLogError("no active rendering pass, call `cgl3dStartRender` before calling `cgl3dFinishRender`");
            return nada;
        }
        let bounds = CindyGL.sceneRenderer.pixelBounds;
        finishRender3d(bounds[0],bounds[1],bounds[2],bounds[3],CindyGL.sceneRenderer.iw,CindyGL.sceneRenderer.ih,modifs);
        return nada;
    });
    function finishRender3d(x0,y0,x1,y1,iw,ih,modifs){
        if(CindyGL.sceneRenderer.canvaswrapper!=null) {
          gl.flush(); //renders stuff to canvaswrapper
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          CindyGL.sceneRenderer.canvaswrapper.swap(); // swap textures after rendering
          CindyGL.sceneRenderer = null;
          return;
        }
        //  finish rendering
        let csctx = api.instance['canvas'].getContext('2d');
        csctx.save();
        csctx.setTransform(1, 0, 0, 1, 0, 0);
        csctx.drawImage(glcanvas, 0, 0, iw, ih, x0, y0, x1, y1);
        csctx.restore();
        CindyGL.sceneRenderer = null;
    };

    const OBJECT_BOUND_KEYS = ["center","radius","orientation"];
    api.defineFunction("cgl3dObjectId", 1, (args, modifs) => {
        let arg = api.evaluate(args[0]);
        if(arg['ctype'] !== "cgl3dObject") return nada;
        return toCjsNumber(arg['value'].id);
    });
    api.defineFunction("cgl3dObjectGet", 2, (args, modifs) => {
        let obj = api.evaluate(args[0]);
        if(obj['ctype'] !== "cgl3dObject") return nada;
        let key = api.evaluate(args[1]);
        if(key['ctype'] !== "string") return nada;
        const keyVal = key["value"];
        if (OBJECT_BOUND_KEYS.includes(keyVal))
            return toCjs(obj["value"].boundingBox[keyVal]);
        if (keyVal === "visible")
            return toCjs(obj["value"].visible);
        return obj["value"].data.get(key["value"]) || nada;
    });
    function setObjectKey(obj,key,value) {
        if(obj['ctype'] === "list") {
            obj["value"].forEach(o=>setObjectKey(o,key,value));
            return;
        }
        if(obj['ctype'] !== "cgl3dObject") return;
        const objVal = obj["value"]
        function setKey(objVal,key,value) {
            const keyVal = key["value"];
            if(objVal.boundingBox.hasOwnProperty(keyVal) && OBJECT_BOUND_KEYS.includes(keyVal)) {
                const jsVal = toJsVal(value);
                if (jsVal !== undefined && jsVal !== null) {
                    objVal.boundingBox[keyVal] = jsVal;
                }
            }
            if (keyVal === "visible") {
                if (value["ctype"] !== "boolean") {
                    cglLogError("expected boolean got: "+value["ctype"]);
                    return nada;
                }
                obj["value"].visible = value["value"];
            }
            obj["value"].data.set(key["value"],value);
        }
        if (key['ctype'] === "string") {
            setKey(objVal,key,value)
            return nada;
        } else if (key['ctype'] === "list") {
            if (value["ctype"] !== "list" || value["value"].length !== key["value"].length)
                return; // TODO? warning
            key['value'].forEach((eltKey,index)=>{
                setKey(objVal,eltKey,value.value[index]);
            });
        }
    }
    api.defineFunction("cgl3dObjectSet", 3, (args, modifs) => {
        const obj = api.evaluate(args[0]);
        const key = api.evaluate(args[1]);
        const value = api.evaluate(args[2]);
        setObjectKey(obj,key,value);
        return nada;
    });
    api.defineFunction("cgl3dObjectGetModifier", 2, (args, modifs) => {
        let obj = api.evaluate(args[0]);
        if(obj['ctype'] !== "cgl3dObject") return nada;
        let key = api.evaluate(args[1]);
        if(key['ctype'] === "list") {
            return toCjs(key['value'].map((eltKey)=>{
                if(eltKey["ctype"] !== "string") return nada;
                return obj["value"].plotModifiers.get(eltKey["value"]);
            }));
        }
        if(key['ctype'] !== "string") return nada;
        return obj["value"].plotModifiers.get(key["value"]); 
    });
    function setObjectModifier(obj,key,value) {
        if(obj['ctype'] === "list") {
            obj["value"].forEach(o=>setObjectModifier(o,key,value));
            return;
        }
        if(obj['ctype'] !== "cgl3dObject") return;
        const objVal = obj["value"];
        if(key['ctype'] === "list") {
            if (value["ctype"] !== "list" || value["value"].length !== key["value"].length)
                return; // TODO? warning
            value = value["value"];
            key['value'].forEach((eltKey,index)=>{
                if(eltKey["ctype"] !== "string") return;
                let eltValue = value[index];
                if (eltValue["ctype"] === "undefined") {
                    objVal.plotModifiers.delete(eltKey["value"]);
                } else {
                    objVal.plotModifiers.set(eltKey["value"],eltValue);
                }
            });
        } else if(key['ctype'] === "string") {
            if (value["ctype"] === "undefined") {
                objVal.plotModifiers.delete(key["value"]);
            } else {
                objVal.plotModifiers.set(key["value"],value);
            }
        } else {return;}
        updateModifierTypes(objVal);
        // TODO: update modifier-types if neccessary
        return;
    }
    api.defineFunction("cgl3dObjectSetModifier", 3, (args, modifs) => {
        const obj = api.evaluate(args[0]);
        const key = api.evaluate(args[1]);
        const value = api.evaluate(args[2]);
        setObjectModifier(obj,key,value);
        return nada;
    });
    // custom error class for errors produced by calling cglDiscard
    class CglDiscardError extends Error {
        constructor(message) {
            super(message);
            this.name = this.constructor.name;
            Error.captureStackTrace(this, this.constructor);
        }
    }
    api.defineFunction("cglDiscard", 0, (args, modifs) => {
        // stop of current code-branch when hitting cglDiscard() outside compiled code
        throw new CglDiscardError("unexpected `cglDiscard()` statement outside compiled code");
    });
    // catch error created by calling cglDiscard and return default value
    // TODO: catching discard-error does not properly handle regional variables
    //  this problem is probably not fixable without support in cindy-script kernel
    api.defineFunction("cglEvalOrDiscard", 1, (args, modifs) => {
        let defValue = modifs['default'];
        if(defValue === undefined) {
            defValue = nada;
        }
        try{
            let value = api.evaluate(args[0]);
            if(value['ctype'] === 'lambda'){
                if(value['params'].length>0) {
                    cglLogWarning("cglTryEval expression should not take parameters");
                }
                value = value['body'];
            }
            return api.evaluateAndVal(value);
        } catch(error) {
            if (error instanceof CglDiscardError) {
                return defValue;
            }
            throw error;
        }
    });
    function asName(csVal) {
        if(csVal['ctype'] === 'variable') {
            return csVal['name'];
        } else if(csVal['ctype'] === 'string') {
            return csVal['value'];
        } else {
            cglLogError("unexpected value for name:",csVal);
        }
    }
    function parseInterfaceArgs(csVal) {
        let argList = lambdaParams(csVal);
        // use :<param-list> to mark parameter as function
        return argList.map(val => (
            val['ctype'] === 'userdata' ?{
                name: asName(val['obj']),
                args: lambdaParams(val['key']),
            } :{
                name: asName(val),
                args: null
            }
        ));
    }
    // avoid evaluating non-lambda expressions when possible to prevent unintended side effects
    function tryResolveLambda(value) {
        // lambda can only be the result of evaluating a variable, function, user-data or element-access
        if(value['ctype'] === "variable" || value['ctype'] === "function" || value['ctype'] === "userdata"
                || value['ctype'] === "field" || (value['ctype'] === "infix" && value['oper'] === '_'))
            value = tryEvaluate(value,api,value);
        if(value['ctype'] === 'lambda') {
            return value;
        }
        return nada;
    }
    /**
     * @param {Array<*>} params 
     * @param {boolean} tryUnwrap don't wrap if expr is already a lambda
     */
    function wrapLambda(expr,params,tryUnwrap) {
        if(tryUnwrap) {
            let value = tryResolveLambda(expr);
            if(value['ctype'] === 'lambda') {
                if(value['params'].length === params.length) {
                    return value;
                }
                cglLogError("lambda expression has wrong number of arguments: "+
                    `got: ${value['params'].length} expected: ${params.length} (${params.map(p=>p['name']).join(",")})`
                );
                // TODO? add dummy parameters if given lambda does not have enough paramters
            }
        }
        return {
            "ctype": "lambda",
            "params": params,
            "body": cloneExpression(expr),
            "modifs": {}
        };
    }
    /* cglInterface(<name>,<implName>,<args>,<modifs>)
         function wrapper to simplify user interaction with Cindygl3d implementation in CindyScript
    */
    api.defineFunction("cglInterface",4,(args,modifs) => {
        // name of wrapper function
        let fn_name = asName(args[0]);
        // name of implementation function
        let fn_impl = asName(args[1]).toLowerCase(); // cs expects lowercase name
        // list of function arguments
        let fn_args = parseInterfaceArgs(args[2]);
        // list of expected modifiers
        let fn_modifs = parseInterfaceArgs(args[3]);
        // create wrapper-function with given signature
        api.defineFunction(fn_name,fn_args.length,(args,modifs) => {
            let callArgs = new Array(args.length);
            // convert function-arguments (marked with parameter-list as user-data) to lambda
            for(let i=0;i<fn_args.length;i++) {
                if (fn_args[i].args != null) {
                    callArgs[i] = wrapLambda(args[i],fn_args[i].args,true);
                } else {
                    callArgs[i] = args[i];
                }
            }
            let callMods = {};
            let modValues = {};
            for(let i=0;i<fn_modifs.length;i++) {
                const modName = fn_modifs[i].name;
                let mod = modifs[modName];
                if(mod === undefined) {
                    // set missing modifiers to nada to avoid collision with global
                    callMods[modName]=nada;
                } else if (fn_modifs[i].args != null) {
                    // convert function-arguments (marked with parameter-list as user-data) to lambda
                    callMods[modName]=wrapLambda(mod,fn_modifs[i].args,true);
                    modValues[modName]=callMods[modName];
                } else {
                    callMods[modName]=mod;
                    modValues[modName]=api.evaluate(mod);
                }
            }
            callMods["cglModifs"]={ctype:"JSON",value:modValues};
            Object.entries(modifs).forEach(([name, value])=>{
                if(callMods.hasOwnProperty(name))
                    return;
                callMods[name] = value;
            });
            // create fake ir for cindy-script call to implementation function
            // the given object entries should be enough to trick the interpreter into calling the implemntation with the given arguments and modifiers
            let call = {
                "ctype": 'function',
                "oper": `${fn_impl}$${callArgs.length}`, // add parameter count to procedure name
                "args": callArgs,
                "modifs": callMods
            };
            return api.evaluate(call);
        });
    });
    api.defineFunction("cglTryDetermineDegree",1,(args,modifs) => {
        let arg = api.evaluate(args[0]);
        if(arg['ctype'] !== 'lambda') {
            cglLogError("expected lambda expression, if the first argument should be used as an expression add checked variables as second parameter");
            return nada;
        }
        const degreeData = tryDetermineDegree(arg['body'],arg['params'].map(asName));
        if(degreeData.degree === undefined)
            return nada;
        return toCjsNumber(degreeData.degree);
    });
    api.defineFunction("cglTryDetermineDegree",2,(args,modifs) => {
        let params = api.evaluate(args[1]);
        if(params["ctype"] === "list") {
            params = params.value.map(asName);
        } else {
            params=[asName(params)];
        }
        const degreeData = tryDetermineDegree(args[0],params);
        if(degreeData.degree === undefined)
            return nada;
        return toCjsNumber(degreeData.degree);
    });

    // debugging helper, print expression before and after evalualtion
    api.defineFunction("cglDebugPrint", 1, (args, modifs) => {
        console.log(args[0],api.evaluate(args[0]),api.evaluateAndVal(args[0]));
        return nada;
    });
    // functions for printing error/warning messages from within cindy-script code
    api.defineFunction("cglLogError", 1, (args, modifs) => {
        let str = api.evaluateAndVal(args[0]);
        cglLogError(api.instance["niceprint"](str,modifs));
        return nada;
    });
    api.defineFunction("cglLogWarning", 1, (args, modifs) => {
        let str = api.evaluateAndVal(args[0]);
        cglLogWarning(api.instance["niceprint"](str,modifs));
        return nada;
    });
    api.defineFunction("cglLogInfo", 1, (args, modifs) => {
        let str = api.evaluateAndVal(args[0]);
        cglLogInfo(api.instance["niceprint"](str,modifs));
        return nada;
    });

    api.defineFunction("setpixel", 4, (args, modifs) => {

        var name = coerce.toString(api.evaluateAndVal(args[0]));
        var x = coerce.toInt(api.evaluateAndVal(args[1]));
        var y = coerce.toInt(api.evaluateAndVal(args[2]));

        var color = coerce.toColor(api.evaluateAndVal(args[3]));
        if (!name) return nada;
        let imageobject = api.getImage(name, true);
        //let canvaswrapper = generateWriteCanvasWrapperIfRequired(imageobject, api);
        let canvaswrapper = generateCanvasWrapperIfRequired(imageobject, api, false);

        if (isFinite(x) && isFinite(y) && name && canvaswrapper && color) {
            canvaswrapper.setPixel(x, y, color);
        }
        return nada;
    });
    // input
    // 1.) list of colors
    // 2.) list of lists of colors
    // versions: (img,pixels), (img,x,y,w,h,pixels)
    function writePixels(name,x,y,w,h,colorArg,modifs) {
        initGLIfRequired();
        let flipRows = modifs['flipRows'] !== undefined && coerce.toBool(api.evaluateAndVal(modifs['flipRows']),false)
        if (!name) return nada;
        if (colorArg['ctype'] !== "list") return nada;
        // TODO? support list of floats as input
        if (colorArg['value'][0]['ctype'] !== "list") return nada;
        let imageobject = api.getImage(name, true);
        if(w === undefined) w = imageobject.width;
        if(h === undefined) h = imageobject.height;
        let colorList;
        if (colorArg['value'][0]['value'][0]['ctype'] !== "list") {
            colorList = colorArg['value'];
            if (flipRows) {
                for(let iy = 0; iy < h/2; iy++) {
                    let r0 = w*iy;
                    let r1 = w*(h-iy-1);
                    // swap list elements
                    for(let ix = 0; ix < w ; ix++) {
                        let i0 = r0 + ix;
                        let i1 = r1 + ix;
                        [colorList[i0], colorList[i1]] = [colorList[i1], colorList[i0]];
                    }
                }
            }
        } else {
            let rowList = colorArg['value'].map(r=>r['value']);
            // TODO? check shape
            if (flipRows) {
                rowList = rowList.slice().reverse();
            }
            colorList = rowList.flatten()
        }
        let isError = false;
        let colors = colorList.map(color=>{
            let elts = coerce.toList(color,[color]).map(coerce.toReal);
            if (elts.length == 4) {
                return elts;
            } else if (elts.length == 3) {
                return [elts[0],elts[1],elts[2],1]
            } else if (elts.length == 1) {
                return [elts[0],elts[0],elts[0],1];
            }
            isError= true; return [0,0,0,1]
        });
        //let canvaswrapper = generateWriteCanvasWrapperIfRequired(imageobject, api);
        let canvaswrapper = generateCanvasWrapperIfRequired(imageobject, api, false);

        if (isFinite(x) && isFinite(y) && isFinite(w) && isFinite(h) && name && canvaswrapper && (!isError)) {
            canvaswrapper.setPixels(x, y, w, h, colors);
        }
        return toCjsNumber(w*h);
    }
    api.defineFunction("writepixels", 2, (args, modifs) => {
        var name = coerce.toString(api.evaluateAndVal(args[0]));
        var colorArg = api.evaluateAndVal(args[1]);
        return writePixels(name,0,0,undefined,undefined,colorArg,modifs);
    });
    api.defineFunction("writepixels", 6, (args, modifs) => {
        var name = coerce.toString(api.evaluateAndVal(args[0]));
        var x = coerce.toInt(api.evaluateAndVal(args[1]));
        var y = coerce.toInt(api.evaluateAndVal(args[2]));
        var w = coerce.toInt(api.evaluateAndVal(args[3]));
        var h = coerce.toInt(api.evaluateAndVal(args[4]));

        var colorArg = api.evaluateAndVal(args[5]);
        return writePixels(name,x,y,w,h,colorArg,modifs);
    });
    // input
    // versions: (img,pixels), (img,x,y,w,h,pixels)
    function readPixels(name,x,y,w,h,modifs) {
        initGLIfRequired();
        // default flip to true for compatability with readPixels in CindJS-core
        let flipRows = modifs['flipRows'] === undefined || coerce.toBool(api.evaluateAndVal(modifs['flipRows']),false)
        if (!name) return nada;
        let imageobject = api.getImage(name, true);
        if(w === undefined) w = imageobject.width;
        if(h === undefined) h = imageobject.height;
        let canvaswrapper = generateCanvasWrapperIfRequired(imageobject, api, false);
        if ( name && canvaswrapper) {
          let pixels = canvaswrapper.readRawPixels(x, y, w, h);
          let res = new Array(pixels.length/4);
          let is_rgb = api.evaluateAndVal(modifs["rgb"]);
          // directly map pixels to rgb values
          // for large arrays this is sigificantly faster (and more memory efficent) than doing the transformation in CindyScript
          if(is_rgb["ctype"] === "boolean" && is_rgb["value"]) {
            let mod_skipTransparent = api.evaluateAndVal(modifs["skipTransparent"]);
            let skip_transparent = mod_skipTransparent["ctype"] === "boolean" && mod_skipTransparent["value"];
            let j=0;
            for(let r=0;r<h;r++)for(let c=0;c<w;c++){
                let i0 = 4*(w*r+c); // color index
                if (flipRows) i0 = 4*(w*(h-r-1)+c);
                if(skip_transparent && pixels[i0+3]==0){
                    continue;
                }
                res[j++] = toCjs(toFloat([pixels[i0+0],pixels[i0+1],pixels[i0+2]]));
            }
            res.length = j;
          } else {
            for(let r=0;r<h;r++)for(let c=0;c<w;c++){
              let i = w*r+c; // pixel index
              let i0 = 4*i; // color index
              if (flipRows) i0 = 4*(w*(h-r-1)+c);
              res[i] = toCjs(toFloat([pixels[i0],pixels[i0+1],pixels[i0+2],pixels[i0+3]]));
            }
          }
          return {
            "ctype": "list",
            "value":res
          };
        }
        return nada;
    }
    // gets the raw pixels data of the given image
    // unlike `readpixles` this function will not adjust the order of the images rows
    // this makes this function faster in usecases where the order of rows is not relevant
    // TODO: it makes more sence to add a `reverseRows` modifer to `readpixels` instead of creating a seperate function at plugin level
    api.defineFunction("cglReadRawPixels", 1, (args, modifs) => {
        var name = coerce.toString(api.evaluateAndVal(args[0]));
        // make flipRows default to false for raw-pixels
        if (modifs['flipRows'] === undefined) modifs['flipRows'] = toCjs(false);
        return readPixels(name,0,0,undefined,undefined,modifs);
    });
    api.defineFunction("readPixels", 5, (args, modifs) => {
        var name = coerce.toString(api.evaluateAndVal(args[0]));
        var x = coerce.toInt(api.evaluateAndVal(args[1]));
        var y = coerce.toInt(api.evaluateAndVal(args[2]));
        var w = coerce.toInt(api.evaluateAndVal(args[3]));
        var h = coerce.toInt(api.evaluateAndVal(args[4]));
        return readPixels(name,x,y,w,h,modifs);
    });


    // --- CindyXR support ---

    /**
     * Plots colorplot on one view of the main canvas in CindyJS coordinates.
     */
    api.defineFunction("colorplotxr", 2, (args, modifs) => {
        initGLIfRequired();

        let viewIndex = api.evaluate(args[0])["value"]["real"];
        var prog = args[1];

        if (typeof(prog.renderer)=="undefined") {
            prog.renderer = new Renderer(api, prog,Renderer.noBounds(),new Map(),false);
        }
        prog.renderer.renderXR(viewIndex);

        return nada;
    });
}

// Exports for CindyXR
CindyGL.gl = null;
CindyGL.generateCanvasWrapperIfRequired = generateCanvasWrapperIfRequired;
CindyGL.sceneRenderer = null;
CindyGL.initGLIfRequired = initGLIfRequired;
CindyJS.registerPlugin(1, "CindyGL", CindyGL);
