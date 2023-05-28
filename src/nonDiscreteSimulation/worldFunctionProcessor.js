let fd = require('fluent-data');
let solver = require('./solver.js');


// I think it's going to be important to better apply a '+' or '-' to 
// a propName.  That's may be hard if the '-' isn't right next to the
// variable name.  So we may have to require the negative be right next
// to the variable or a special function name be used to identify 
// deposit or extraction.  So '3(-x)' or '3ext(x)' instead of just '-3x'.
//
// But the pure math may work itself out.  
// -2x = y
// x = -y/2
// If y is positive, x would be negative, and so you would extract from x
//
// Pausing on the above note and focus on getting time funcs.  Just 
// assume extraction of sources and deposits into targets.

// How am I going to resolve things when there are multiple funcs?  I
// don't wan't to do a queue, because that will make it order dependent.
// I think some sort of composition is necessary.  
//
// But I think the composition will be simple.  Add up all the sources
// for the sources.  On the other side, add up all the targets.
//
// func1 = '2*happiness <- metal^2 + 2*energy'
// func2 = '7*widgets <- knowledge^2 + 3*tools
// composite = 2*happiness + 7*widgets <- metal^2 + 2*energy + knowledge^2 + 3*tools
//
// One concern is that more complex equations may be too sensitive for the solver.
// Possible that inTermsOf's can be additively composed as well, but I"m not sure


module.exports = class worldFunctionProcessor {

    constructor(
        world,
        worldFuncs // an array of directional functions (eg. 'w + x <- y + z'
    ) {

        this.world = world;        
        this.func = this.mergeAndParseFunctions(worldFuncs);
        this.caughtProps = []; 
        this.catchProperties(this.world, this.func);                

        // calibrate the caught prop flow functions
        for (let c of this.caughtProps) {

            let prop = c.getProperty();
            let propStrVal = prop.value.toString();

            c.flowFunc = prop.flowRate || propStrVal;
            c.remainFunc = 
                !c.getParentVariable().isSource ? undefined
                : prop.flowRate === undefined ? propStrVal
                : `${propStrVal} - ${prop.flowRate}`;

        }

        // variable-level flow func summing equations
        let flowFuncSummators = this.func.variables.map(v => ({
            variableName: v.name,
            flowFuncSum: 
                '(' + 
                    v.caughtProps
                    .map(p => `(${p.flowFunc})`)
                    .join('+') + 
                ')'
        }));

        // Time-replace variable-level functions with the appropriate summing equations.
        // This will replace everything on the right-hand side, preserving the left hand
        // variable for later parsing at the property-level.  
        for(let v of this.func.variables)
        for(let vf in v.funcs) {
            let timeReplaced = v.funcs[vf];
            for(let ffs of flowFuncSummators) {
                if (v.name === ffs.variableName)
                    continue;
                timeReplaced = timeReplaced.replace(
                    new RegExp(ffs.variableName,'g'),
                    ffs.flowFuncSum
                ); 
            }
            v.funcs[vf].timeReplaced = timeReplaced;
        }

        // Time-replace property-level functions with the appropriate summing equations
        for (let c of this.caughtProps) {

            let v = c.getParentVariable();
            let timeFuncs = [];
            let ffOfOthersSummator = 
                '(' + 
                    v.caughtProps
                    .filter(cp => cp != c)
                    .map(cp => `(${cp.flowFunc})`)
                    .join(' + ') + 
                ')';

            for (let vFunc of v.funcs) {
                let timeReplaced = vFunc.timeReplaced;
                timeReplaced = timeReplaced.replace(
                    new RegExp(v.name,'g'),
                    c.flowFunc
                );
                timeReplaced += ' - ' + ffOfOthersSummator;
                timeFuncs.push(timeReplaced);
            }

            c.timeFuncs = timeFuncs;

        }
        
        // For each caught property, get the earliest positive time for which the 
        // function would resut in the value of the property going out of own boundaries 
        for (let c of this.caughtProps) {

            let firstEscape = null;
            let prop = c.getProperty();

            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            for (let tFunc of c.timeFuncs) {
                let tEscapeTime = this.getFirstEscape(tFunc, prop);
                if (tEscapeTime != 0 && (firstEscape == null || tEscapeTime < firstEscape))
                    firstEscape = tEscapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (firstEscape == null)
                firstEscape = 0;

            // boundaries imposed by the giving object
            if (c.remainFunc) {
                let remainEscape = this.getFirstEscape(c.remainFunc, prop);
                if (remainEscape < firstEscape)
                    firstEscape = remainEscape;
            }

            c.firstEscape = firstEscape;

        }

        // TODO: Uncatch some properties.  
        //  - For each variable, uncatch any properties with a firstEscape = 0.
        //  - If any variable no longer has caught properties, the whole merged function cannot be activated.
        //  - Else, find the global firstEscape, use that as the time to move forward.
        //  - Start focusing on how to move forward by transferring value between properties.
        // TODO: Different values and constraints on metal cannot force a firstEscape <> infinity.  
        //  - Instead, it just changes the first escape of happiness.  Why?
        // TODO: I don't think when we uncatch properties we kill the whole merged function.
        //  - Perhaps we just set flow rates to 0 and reprocess? 
        console.log(this.caughtProps.map(c => ({ 
            name: c.getParentVariable().name, 
            firstEscape: fd.round(c.firstEscape, 1e-4)
        })));

    }

    /* 

        Requires an array of arrow-style functions (e.g. 'x + y -> x + w')

        Returns a string representing the merged function.  This string is an 
        object with the following subproperties.
        
            sources:        A string representing the part of the merged function 
                            with the source variables. 
            targets:        A string representing the part of the merged function 
                            with the target variables.
            variables:      An array of objects continaing information about each
                            variable in the function. 
                        
        The structure of each variable is as follows: 
            
            name:           The name of the variable.. 
            caughtProps:    An array with references to any caught world properties
                            that can be associated with the variable name.  It 
                            starts out as empty but gets filled when properties are
                            caught.
            isSource:       True if the variable is an input to the function. 
            isTarget:       False if the variable is an output of the function. 
            funcs:          The merged function solved in terms of the variable.
                            It is an array because many solutions may be possible, 
                            but very frequently it will only have one element.
        
    */
    mergeAndParseFunctions(funcs) {

        let sources = [];
        let targets = [];

        for (let func of funcs) {
            let parts = 
                func.includes('<-') ? func.split('<-').reverse()
                : func.includes('->') ? func.split('->')
                : null;
            sources.push(`(${parts[0]})`);
            targets.push(`(${parts[1]})`);
        }
        
        sources = sources.join(' + ');
        targets = targets.join(' + ');

        let func = new String(`${sources} -> ${targets}`); 
        func.sources = sources;
        func.targets = targets; 
        
        let getVarFromString = (str,type) => 
            str
            .match(/[A-Z,a-z,_]+/g)
            .map(name => ({ name, type }));

        func.variables = 
            fd([
                ...getVarFromString(sources, 'source'),
                ...getVarFromString(targets, 'targers')
            ])
            .group(v => v.name)
            .reduce(({
                name: fd.first(v => v.name),
                caughtProps: fd.first(v => []),
                isSource: (agg,next) => !!agg || next.type === 'source',
                isTarget: (agg,next) => !!agg || next.type === 'target'
            }))
            .get();

        // Functions from the perspective of the variable.
        // Usually just one, but the solution could produce more than one.
        for (let v of func.variables) 
            v.funcs =          
                solver(func.replace('->', '='))
                .solveFor(v.name)
                .get()
                .map(f => new String(`${v.name} = ${f}`));

        return func;

    }

    /* 

        Summary:    Matches world properties to the relevant variables in a 
                    function.  These are then found in the caughtProps field
                    in the worldFunctionProcessor as well as the caughtProps
                    field of each variable name.  
                    
        Remarks:    The matches in the caughtProps fields aren't the properties
                    themselves.  Rather, they're helper objects for working 
                    with them.  They have the following properties.

                    getProperty:        Get the property that is relevant to
                                        the function in question.
                    getParentVariable:  Get the variable in the function that 
                                        is related to the caught property.    
                    getParentObject:    Get the world object that the caught
                                        property is a part of. 

    */
    catchProperties(world, mergedFunction) {
        for (let v of mergedFunction.variables)
        for (let obj of world) 
            if (obj[v.name] !== undefined) {
                let prop = { 
                    getProperty: () => obj[v.name],
                    getParentVariable: () => v, 
                    getParentObject: () => obj
                };
                this.caughtProps.push(prop);
                v.caughtProps.push(prop);
            }
    }

    // Get the earliest (current or future) time at which the 
    // timeFunction will go out of bounds with respect to 
    // boundNum's lower and upper limits. 
    getFirstEscape (
        timeFunction,
        boundNum 
    ) {
    
        // If timeFunc isn't even in bounds at t = 0, return '0' to indicate 
        // that you can't make use of the equation even a little bit.
        let t0val = solver(timeFunction).evaluateToFloat({t: 0}).get();
        if (t0val === undefined) return 0; 
        if (t0val < boundNum.lower) return 0;
        if (t0val > boundNum.upper) return 0;

        // if boundNum boundary makes all possible values out of bounds, 
        // return '0' to indicate that you can't make use of the equation
        // even a little bit.  Yes, infinite boundNum values might work but
        // unless I see a reason to support these, I'm ignoring them.
        if (boundNum.lower === Infinity || boundNum.upper === -Infinity)
            return 0;

        // Allow escape times function to work with infinite boundaries
        let getEscapeTimesForBoundary = (boundary, boundaryType) => 
              boundary == undefined ? [] // there is no boundary, all values would work
            : !isFinite(boundary) ? [] // basically there is no boundary
            : this.getEscapeTimesForFiniteBoundary(timeFunction, boundary, boundaryType);

        // Get all times that timeFunction crosses the lower and upper boundaries
        let escapeTimes = [
            ...getEscapeTimesForBoundary(boundNum.lower, 'lower'),
            ...getEscapeTimesForBoundary(boundNum.upper, 'upper'),
            Infinity 
        ];

        return fd(escapeTimes)
            .filter(et => et >= 0) // we don't worry about going back in time
            .sort(et => et)
            .reduce(fd.first(et => et)) 
            .get();            
    
    }

    // Gets the time-values at which a time-based function touches the upper or 
    // lower boundary (as appropriate) of a boundNum.  Then, if this touch 
    // represents a move to escape a boundary, it outputs the time value.
    getEscapeTimesForFiniteBoundary (
        timeFunction, // the time (t) based function (will be parsed to only include right side)
        boundary, // the constraint value
        boundaryType // 'lower' or 'upper'
    ) {

        let timeExpression = timeFunction.replace(/^.+=/, ''); 
        let differential = solver(`diff( ${timeExpression}, t )`);
        let solvedForTs = solver(`${timeExpression} = ${boundary}`).solveFor('t').get();
        let escapeTimes = [];

        for (let solvedForT of solvedForTs) {
            
            solvedForT = solver.fromNerdamerObj(solvedForT);
            let t = solvedForT.evaluateToFloat(solvedForT).get();
            let derivative = solvedForT.evaluateToFloat(differential, {t}).get();
            
            if (derivative === undefined)
                continue;
            
            // When t touches the boundary, is it really escaping the bounds?
            // Or is it just touching or entering?
            let isEscape = 
                boundaryType == 'lower' 
                ? derivative < 0 
                : derivative > 0; 
            
            if (isEscape)
                escapeTimes.push(t);

        }

        return escapeTimes;

    }

}


