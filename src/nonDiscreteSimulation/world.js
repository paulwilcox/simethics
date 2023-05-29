let fd = require('fluent-data');
let solver = require('./solver');
let entityToVariableMapItem = require('./entityToVariableMapItem');
let relationVariable = require('./relationVariable');

module.exports = class world {

    entities;
    relations;
    masterRelation;
    masterRelationVariables = [];
    #entityToVariableMap = [];

    constructor(
        entities,
        relations // an array of directional relations (eg. 'w + x <- y + z'
    ) {

        this.entities = entities;        
        this.relations = relations;

        this.#composeRelationsIntoMaster();
        this.#identifyRelationVariables();
        this.#mapEntitiesToVariables(); 
        
        // calibrate the caught prop flow functions
        for (let mapItem of this.#entityToVariableMap) {

            let prop = mapItem.entityPropertyValue;

            mapItem.flowFunc = prop.flowRate || propStrVal;
            mapItem.remainFunc = 
                !mapItem.variable.isSource ? undefined
                : prop.flowRate === undefined ? propStrVal
                : `${prop.value} - ${prop.flowRate}`;

        }

        // variable-level flow func summing equations
        let flowFuncSummators = 
            this.masterRelationVariables
            .map(variable => ({
                variableName: variable.name,
                flowFuncSum: 
                    '(' + 
                        variable.entityMap
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
        for (let mapItem of this.#entityToVariableMap) {

            let variable = mapItem.variable;
            let timeFuncs = [];
            let ffOfOthersSummator = 
                '(' + 
                    variable.entityMap
                    .filter(otherMapItem => otherMapItem != mapItem)
                    .map(otherMapItem => `(${otherMapItem.flowFunc})`)
                    .join(' + ') + 
                ')';

            for (let vFunc of variable.funcs) {
                let timeReplaced = vFunc.timeReplaced;
                timeReplaced = timeReplaced.replace(
                    new RegExp(variable.name,'g'),
                    mapItem.flowFunc
                );
                timeReplaced += ' - ' + ffOfOthersSummator;
                timeFuncs.push(timeReplaced);
            }

            mapItem.timeFuncs = timeFuncs;

        }
        
        // For each caught property, get the earliest positive time for which the 
        // function would resut in the value of the property going out of own boundaries 
        for (let mapItem of this.#entityToVariableMap) {

            let firstEscape = null;
            let prop = mapItem.entityPropertyValue;

            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            for (let tFunc of mapItem.timeFuncs) {
                let tEscapeTime = getFirstEscape(tFunc, prop);
                if (tEscapeTime != 0 && (firstEscape == null || tEscapeTime < firstEscape))
                    firstEscape = tEscapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (firstEscape == null)
                firstEscape = 0;

            // boundaries imposed by the giving object
            if (mapItem.remainFunc) {
                let remainEscape = getFirstEscape(mapItem.remainFunc, prop);
                if (remainEscape < firstEscape)
                    firstEscape = remainEscape;
            }

            mapItem.firstEscape = firstEscape;

        }

    }

    log () {
        console.log(this.#entityToVariableMap.map(mapItem => ({ 
            name: mapItem.variable.name, 
            firstEscape: fd.round(mapItem.firstEscape, 1e-4)
        })));
    }

    /* 
        Requires an array of arrow-style relations (e.g. 'x + y -> x + w')
        Returns a composition of the relations        
    */
    #composeRelationsIntoMaster() {

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
        
        this.masterRelation = `${sources.join(' + ')} -> ${targets.join(' + ')}`; 

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
    #identifyRelationVariables() {
        
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
            .reduce({
                world: fd.first(v => this),
                name: fd.first(v => v.name),
                entityMap: fd.first(v => []),
                isSource: (agg,next) => !!agg || next.type === 'source',
                isTarget: (agg,next) => !!agg || next.type === 'target'
            })
            .get(row => new relationVariable(row));

    }

    // Matches world properties to the relevant variables in the master relation. 
    // Loads both the main class map and a map on each variable
    #mapEntitiesToVariables() {
        for (let variable of this.masterRelationVariables)
        for (let entity of this.entities) 
            if (entity[variable.name] !== undefined) {
                let mapItem = new entityToVariableMapItem (variable, entity);
                this.#entityToVariableMap.push(mapItem);
                variable.entityMap.push(mapItem);
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