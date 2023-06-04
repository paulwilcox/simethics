let fd = require('fluent-data');
let solver = require('./solver');

module.exports = class boundNumber {

    // core properties
    value;
    lower;
    upper;
    flowRate;

    // mapping and workflow properties
    variable;
    entity;
    boundNumberSolutions = [];
    escapeTime;
    // If true, will be ignored on the next tick.
    // Different than value == lower || value == upper
    // in that it equals one of those and would pass
    // if time continues further.  
    // Can be discovered via derivative at the value, 
    // but probably much less costly to simply identify 
    // it at time of escape.
    hasEscaped = false;
    // Set behavior when an element escapes.
    // Default is to just set the hasEscaped property.
    // But perhaps, for instance you'd like it to: 
    //   > 'bounce' instead.  You can instead add to 
    //     the value and set has escaped to true.
    //   > 'empty' in advance.  You can set the value
    //     to the lower bound, then set hasEscaped to
    //     true.  So that it dies empty if it passes
    //     the upper bound. 
    onEscape = (boundNumber) => {
        boundNumber.hasEscaped = true;
    } 

    // These makee usage less verbose
    //   let n = require('./boundNumber').n;
    //   let committment = {
    //      sweat = n(5).l(0).u(10).f('2t'),
    //      blood = n(2).l(0).u(8).f('3t/2')
    //   }
    static n = (val = 0) => new boundNumber().setValue(val);
    v(val) { this.setValue(val); return this; }
    l(val) { this.setLower(val); return this; }
    u(val) { this.setUpper(val); return this; }
    f(val) { this.setFlowRate(val); return this; }

    constructor() {
        this.value = 0;
        this.lower = -Infinity;
        this.upper = Infinity;
        this.flowRate = '0t'; 
    }

    setValue(val) {
        if (val < this.lower)
            throw `Cannot set value to ${val} because lower is ${this.lower}`;
        if (val > this.upper)
            throw `Cannot set value to ${val} because upper is ${this.upper}`;
        this.value = val;
        return this;
    }

    setLower(val) {
        if (val > this.upper) 
            throw `Cannot set lower to ${val} because upper is ${this.upper}`;
        if (val > this.value)
            throw `Cannot set lower to ${val} because value is ${this.value}`;
        this.lower = val;
        return this;
    }

    setUpper(val) {
        if (val < this.lower)
            throw `Cannot set upper to ${val} because lower is ${this.lower}`;
        if (val < this.value)
            throw `Cannot set upper to ${val} because value is ${this.value}`;
        this.upper = val;
        return this;
    }

    setFlowRate(flowRate) {
        if (flowRate === undefined)
            throw 'flowRate must cannot be undefined';
        this.flowRate = flowRate;
        return this;
    }

    tick(timeChange) {
        if (this.hasEscaped)
            throw 'Cannot tick a bound number that has escaped';
        let valChange = 
            solver(this.flowRate)
            .evaluateToFloat({t: timeChange})
            .get();
        this.setValue(this.value + valChange);
        return this;
    }

    // Get the earliest (current or future) time at which the 
    // timeFunction will go out of bounds with respect to 
    // boundNum's lower and upper limits. 
    getEscapeTime (
        timeFunction
    ) {

        // If timeFunc isn't even in bounds at t = 0, return '0' to indicate 
        // that you can't make use of the equation even a little bit.
        let t0val = solver(timeFunction).evaluateToFloat({t: 0}).get();
        if (t0val === undefined) return 0; 
        if (t0val < this.lower) return 0;
        if (t0val > this.upper) return 0;

        // Get all times that timeFunction crosses the lower and upper boundaries
        let escapeTimes = [
            ...this.#getEscapeTimesForBoundary(timeFunction, this.lower, 'lower'),
            ...this.#getEscapeTimesForBoundary(timeFunction, this.upper, 'upper')
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
    #getEscapeTimesForBoundary (
        timeFunction, // the time (t) based function (will be parsed to only include right side)
        boundary, // the constraint value
        boundaryType // 'lower' or 'upper'
    ) {

// TODO: energy has both a lower and an upper, 
// and a raw flow rate that goes positive with time.  
// So why does it not have finite escape times?
// And why is 't' below always evaluating to negative?
if(boundary == 96) // eneregy, upper (shouldn't be infinity)
    console.log('debugging here');

        let escapeTimes = [];

        // Infinite boundaries close possibilites.  Return early.
        if (!isFinite(boundary)) {
            let escapeTime =
                boundary == undefined ? Infinity // it will never escape if there is no boundary
                : boundaryType == 'lower' && boundary == -Infinity ? Infinity // it will always be inbounds
                : boundaryType == 'upper' && boundary == Infinity ? Infinity // it will always be inbounds
                : boundaryType == 'lower' && boundary == Infinity ? 0 // it will never be in bounds
                : boundaryType == 'upper' && boundary == -Infinity ? 0 // it will never be in bounds
                : null
            if (escapeTime == null)
                throw 'unexpected escape time with infinite boundary';
            escapeTimes.push(escapeTime);
            return escapeTimes;
        }

        let timeExpression = timeFunction.replace(/^.+=/, ''); 
        let differential = solver(`diff( ${timeExpression}, t )`);
        let solvedForTs = solver(`${timeExpression} = ${boundary}`).solveFor('t').get();

        for (let solvedForT of solvedForTs) {
            
            let _solvedForT = solver.fromNerdamerObj(solvedForT);
            let t = _solvedForT.evaluateToFloat(solvedForT).get();
            let derivative = _solvedForT.evaluateToFloat(differential, {t}).get();
            
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

        if (escapeTimes.length == 0)
            escapeTimes.push(Infinity); // it will never escape

        return escapeTimes;

    }


}


