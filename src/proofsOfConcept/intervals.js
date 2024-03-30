let fd = require('fluent-data')
let interval = require('./interval')

// IMPORTS FROM FLUENT-DATA

let isString = input =>
    typeof input === 'string' 
    || input instanceof String;

// equality by values (fluent-data -> general.js)

let eq = (obj1, obj2) => {

    if (obj1 == undefined && obj2 != undefined) return false;
    if (obj1 != undefined && obj2 == undefined) return false;
    if (obj1 == undefined && obj2 == undefined) return true;

    if (isString(obj1) && isString(obj2))
        return obj1 == obj2;

    let obj1Keys = Object.keys(obj1);
    let obj2Keys = Object.keys(obj2);
    
    if (obj1Keys.length != obj2Keys.length)
        return false;

    if (obj1Keys.length == 0 && obj2Keys.length == 0)
        return obj1 == obj2;

    for(let key of obj1Keys) {
        if(!eq(obj1[key], obj2[key]))
            return false;
    }

    return true;

}

// Thanks domino at https://stackoverflow.com/questions/18884249
let isIterable = (input, includeStrings = false) => 
    !includeStrings && isString(includeStrings) ? false
    : Symbol.iterator in Object(input);

// LOCAL CODE

// TODO: replace 'function' with 'range' to implement intermediate type
// Range will allow a better member-of comparison if range1 < range2 can be identified
// Because function1 < function2 cannot be identified


function asInterval (obj) {
    return obj instanceof interval
        ? obj
        : new interval(obj)
}

function asIntervals(obj) {
    if (obj instanceof intervals)
        return obj
    else if (!isString(obj) && isIterable(obj))
        return new intervals(...obj)
    else 
        return new intervals(asInterval(obj))
}

// for intervals, not for export
function includesInterval(
    sup, // as in, maybe it's a superset 
    sub // as in, maybe it's a subset
) {

    let outOfBoundTests = [ 
        sub.l < sup.l,
        sub.u > sup.u,
        sub.l === sup.l && sub.li && !sup.li,
        sub.u === sup.u && sub.ui && !sup.ui
    ]

    return !outOfBoundTests.some(test => test)
}

// for intervals, not for export
function distinct(incomingIntervals) {

    let distincts = []
    let sorted = fd(incomingIntervals).sort(itv => [itv.l, !itv.li])
    
    for(let incoming of sorted) {

        let lastDistinct = distincts[distincts.length - 1]
        
        if (lastDistinct === undefined) {
            distincts.push(incoming)
            continue
        }

        let whichStartsFirst = 
            incoming.l < lastDistinct.l ? incoming
            : incoming.l > lastDistinct.l ? lastDistinct
            : incoming.l !== lastDistinct.l ? 'Not Comparable'
            : incoming.li ? incoming // Doesn't matter if also lastDistinct
            : lastDistinct // Doesn't matter if also incoming
            
        let whichEndsLast = 
            incoming.u > lastDistinct.u ? incoming
            : incoming.u < lastDistinct.u ? lastDistinct
            : incoming.l !== lastDistinct.l ? 'Not Comparable'
            : incoming.ui ? incoming // Doesn't matter if also lastDistinct
            : lastDistinct // Doesn't matter if also incoming

        if ([whichStartsFirst,whichEndsLast].includes('Not Comparable')) 
            throw 'incoming and lastDistinct do not seem to be comparable'

        let whichStartsSecond = 
            whichStartsFirst == incoming 
            ? lastDistinct 
            : incoming 

        let isOverlapping = 
            whichStartsFirst.u > whichStartsSecond.l 
            || (
                whichStartsFirst.u === whichStartsSecond.l
                // We'll call perfectly adjacent 'overlapping' for our purposes.
                // So only if neither is inclusive do we leave a gap (an infinitesimal).
                && (whichStartsFirst.ui || whichStartsSecond.li)
            )  

        // since it's pre-sorted, non-overlap means incoming is later 
        if (!isOverlapping) {
            distincts.push(incoming)
            continue
        }
            
        // Overlap means we should extend previous
        // Due to presorting, lastdistinct already has correct lower settings
        lastDistinct.u = incoming.u
        lastDistinct.ui = incoming.ui

    }

    return distincts
}

class intervals {
    
    constructor(...maybeIntervals) {
        this.intervals = [] 
        if (maybeIntervals.length > 0)
            this.merge(...maybeIntervals)
    }

    // Merges interval(s) into the instance.
    // This implementation keeps intervals simplified and ordered.
    merge (...maybeIntervals) {

        // allow .merge(bool, min, max, bool) notation
        if (typeof maybeIntervals[0] === 'boolean') {
            if (typeof maybeIntervals[3] !== 'boolean')
                throw `interval construction notation not correct`
            let i = new interval(...maybeIntervals)
            maybeIntervals = [i]
        }

        // flatten and convert non-intervals into intervals
        let incomings = []
        for(let maybeInterval of maybeIntervals) {

            // Possible, but ambiguous and not worth it at the moment  
            if (isIterable(maybeInterval) && !isString(maybeInterval))
                throw `maybeInterval cannot have iterables.  ` +  
                    `Pass iterables with the spread operator if necessary`
            
            // if it's a set of intervals, loop and pass in each
            else if (maybeInterval instanceof intervals) 
                for(let itvl of maybeInterval.intervals)
                    incomings.push(itvl)

            // if it's a single interval, just pass it in as is
            else if (maybeInterval instanceof interval)
                incomings.push(maybeInterval)
                    
            // otherwise, see if it can be converted, and pass
            else 
                incomings.push(new interval(maybeInterval)) 
            
        }

        this.intervals = distinct([...this.intervals, ...incomings])
        
        return this
    }

    
    has (other) {
        /*
            - Intervals are always simplified, meaning
              no overlaps, and if there are gaps, they
              are true gaps.
            - So in a comparison, any relevant interval 
              that is only partially in a comparative will 
              not be 'rescued' by some third interval.   
        */

        let otherIntervals = asIntervals(other)
        
        // is every interval in 'other' ...
        return otherIntervals.intervals.every(oi =>
            // ... included within some interval in 'this'? 
            this.intervals.some(ti => includesInterval(ti,oi))
        ) 
    }

    in (other) {
        let otherIntervals = asIntervals(other)
        // is any interval in 'this' ...
        return this.intervals.every(ti =>
            // ... not included within some interval in 'other'? 
            otherIntervals.intervals.some(oi => includesInterval(oi,ti))
        ) 

    }

    toString(pretty = false) {
        return this.intervals
        .map(i => i.toString())
        .join(`,${pretty ? `\r\n` : ''}`)
    }

    log(caption, pretty) {
        let stringified = this.toString(pretty)
        if (caption) 
            stringified = caption + (pretty ? `\n` : '') + stringified
        console.log(stringified)
        return this
    }
    // remove
    // join, leftJoin, fullJoin
}

module.exports = intervals