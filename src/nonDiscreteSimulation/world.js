let fd = require('fluent-data');
let solver = require('./solver');
let relationVariables = require('./relationVariables');

module.exports = class world {

    entities;
    relations;
    masterRelation;
    variables;

    constructor(
        entities,
        relations // an array of directional relations (eg. 'w + x <- y + z'
    ) {

        this.entities = entities;        
        this.relations = relations;

        this.#composeRelationsIntoMaster();
        this.variables = new relationVariables(this);
        
        // Time-replace property-level functions with the appropriate summing equations
        for (let mapItem of this.variables.entityMap) {

            let variable = mapItem.variable;

            let ffOfOthersSummator = 
                '(' + 
                    variable.entityMap
                    .filter(otherMapItem => otherMapItem != mapItem)
                    .map(otherMapItem => `(${otherMapItem.flowRate})`)
                    .join(' + ') + 
                ')';

            for (let solution of variable.solutions) {
                let substituted = solution.substituted;
                substituted = substituted.replace(
                    new RegExp(variable.name,'g'),
                    mapItem.flowRate
                );
                substituted += ' - ' + ffOfOthersSummator;
                mapItem.timeSolutions.push(substituted);
            }

        }
        
        // For each caught property, get the earliest positive time for which the 
        // function would resut in the value of the property going out of own boundaries 
        for (let mapItem of this.variables.entityMap) {

            let firstEscape = null;
            let prop = mapItem.property;

            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            for (let solution of mapItem.timeSolutions) {
                let tEscapeTime = getFirstEscape(solution, prop);
                if (tEscapeTime != 0 && (firstEscape == null || tEscapeTime < firstEscape))
                    firstEscape = tEscapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (firstEscape == null)
                firstEscape = 0;

            // boundaries imposed by the giving object
            if (mapItem.remainRate) {
                let remainEscape = getFirstEscape(mapItem.remainRate, prop);
                if (remainEscape < firstEscape)
                    firstEscape = remainEscape;
            }

            mapItem.firstEscape = firstEscape;

        }

    }

    log () {
        console.log(
            fd(this.variables.entityMap)
                .get(mapItem => ({ 
                    name: mapItem.variable.name, 
                    firstEscape: fd.round(mapItem.firstEscape, 1e-4)
                }))
        );
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