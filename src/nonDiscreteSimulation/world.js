let fd = require('fluent-data');
let solver = require('./solver.js');

module.exports = class world {

    constructor(
        entities,
        relations // an array of directional relations (eg. 'w + x <- y + z'
    ) {

        this.entities = entities;        
        this.relations = relations;
        this.masterRelation = this._composeRelations();
        this.masterRelationVariables = [];
        this.caughtProps = []; 

        this._identifyRelationVariables();
        this._catchProperties(); 
        
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
        let flowFuncSummators = this.masterRelationVariables.map(v => ({
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
        for(let v of this.masterRelationVariables)
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
                let tEscapeTime = getFirstEscape(tFunc, prop);
                if (tEscapeTime != 0 && (firstEscape == null || tEscapeTime < firstEscape))
                    firstEscape = tEscapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (firstEscape == null)
                firstEscape = 0;

            // boundaries imposed by the giving object
            if (c.remainFunc) {
                let remainEscape = getFirstEscape(c.remainFunc, prop);
                if (remainEscape < firstEscape)
                    firstEscape = remainEscape;
            }

            c.firstEscape = firstEscape;

        }

    }

    log () {
        console.log(this.caughtProps.map(c => ({ 
            name: c.getParentVariable().name, 
            firstEscape: fd.round(c.firstEscape, 1e-4)
        })));
    }

    /* 
        Requires an array of arrow-style relations (e.g. 'x + y -> x + w')
        Returns a composition of the relations        
    */
    _composeRelations() {

        let sources = [];
        let targets = [];

        for (let relation of this.relations) {
            let parts = 
                relation.includes('<-') ? relation.split('<-').reverse()
                : relation.includes('->') ? relation.split('->')
                : null;
            if (parts == null)
                throw 'All relations must have the -> or <- relator';
            sources.push(`(${parts[0]})`);
            targets.push(`(${parts[1]})`);
        }
        
        return new String(`${sources.join(' + ')} -> ${targets.join(' + ')}`); 

    }

    /*
        Finds variable identifiers in the master relation string, identifies
        some of their properties and maps them to entities in the world.

        Returns an array of variables.
        The structure of each variable is as follows: 
            
            name:           The name of the variable.. 
            caughtProps:    An array with references to any caught world properties
                            that can be associated with the variable name.  It 
                            starts out as empty but gets filled when properties are
                            caught.
            isSource:       True if the variable is an input to the relation. 
            isTarget:       False if the variable is an output of the relation. 
            funcs:          The merged relation solved in terms of the variable.
                            It is an array because many solutions may be possible, 
                            but very frequently it will only have one element.
    */
    _identifyRelationVariables() {
        
        let getVariablesFromString = (str,type) => 
            str
            .match(/[A-Z,a-z,_]+/g)
            .map(name => ({ name, type }));

        let [sources, targets] = this.masterRelation.split('->')

        this.masterRelationVariables = 
            fd([
                ...getVariablesFromString(sources, 'source'),
                ...getVariablesFromString(targets, 'target')
            ])
            .group(v => v.name)
            .reduce(({
                name: fd.first(v => v.name),
                caughtProps: fd.first(v => []),
                isSource: (agg,next) => !!agg || next.type === 'source',
                isTarget: (agg,next) => !!agg || next.type === 'target'
            }))
            .get();

        // Relations from the perspective of the variable.
        // Usually just one, but the solution could produce more than one.
        for (let variable of this.masterRelationVariables) 
            variable.funcs =          
                solver(this.masterRelation.replace('->', '='))
                .solveFor(variable.name)
                .get()
                .map(f => new String(`${variable.name} = ${f}`));

    }

    /* 

        Summary:    Matches world properties to the relevant variables in a 
                    relation.  These are then found in the caughtProps field
                    in the world as well as the caughtProps
                    field of each variable name.  
                    
        Remarks:    The matches in the caughtProps fields aren't the properties
                    themselves.  Rather, they're helper objects for working 
                    with them.  They have the following properties.

                    getProperty:        Get the property that is relevant to
                                        the relation in question.
                    getParentVariable:  Get the variable in the relation that 
                                        is related to the caught property.    
                    getParentObject:    Get the world object that the caught
                                        property is a part of. 

    */
    _catchProperties() {
        for (let mrVariable of this.masterRelationVariables)
        for (let entity of this.entities) 
            if (entity[mrVariable.name] !== undefined) {
                let prop = { 
                    getProperty: () => entity[mrVariable.name],
                    getParentVariable: () => mrVariable, 
                    getParentEntity: () => entity
                };
                this.caughtProps.push(prop);
                mrVariable.caughtProps.push(prop);
            }
    }

}

// Get the earliest (current or future) time at which the 
// timeFunction will go out of bounds with respect to 
// boundNum's lower and upper limits. 
function getFirstEscape (
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
        : getEscapeTimesForFiniteBoundary(timeFunction, boundary, boundaryType);

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
function getEscapeTimesForFiniteBoundary (
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