let fd = require('fluent-data')

/*
    Implicit Instancing:
    - An instance of a type is not declared.
    - Rather, an entity is declared directly, a type declared seperately, and then an instance is analyzed to determine if it is that type

    Intermediate constraints in abstraction:
    - A type system that can constrain in more immediate ways than is typical in languages.
    - For instance, a class typically constrains a variable to be a number, or a string, and so on.
    - Othwerwise, instances on the property are allowed.  So an abstract class can have a number set to '5'. and so on.
    - I'm looking for an abstraction that allows (for instance) a number between 3 and 5.  So that the constraint is neither whole type nor instance
    - At present, the solution is if it's not an instance, then the slot as a function states that the constraint is not complete
*/

// IMPORTS FROM FLLUENT-DATA

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

// Max Leizerovich: stackoverflow.com/questions/31128855
let setEquals = (a, b) =>
    a.size === b.size 
    && [...a].every(value => b.has(value));

// Thanks domino at https://stackoverflow.com/questions/18884249
let isIterable = (input, includeStrings = false) => 
    !includeStrings && isString(includeStrings) ? false
    : Symbol.iterator in Object(input);

// LOCAL CODE

// TODO: replace 'function' with 'range' to implement intermediate type
// Range will allow a better member-of comparison if range1 < range2 can be identified
// Because function1 < function2 cannot be identified
class interval {

    constructor(lowerIsInclusive, lower, upper, upperIsInclusive) {
        
        // if only one argument is passed, it should either be ...
        // ... an interval, in which case just copy it, or 
        // ... a non-interval, in which case, if primitive, 
        //     make a degenerate interval out of it
        if (
            lowerIsInclusive !== undefined && 
            lower === undefined &&
            upper === undefined && 
            upperIsInclusive === undefined
        ) {
            let obj = lowerIsInclusive
            let objType = typeof obj
            if (obj instanceof interval) {
                lowerIsInclusive = obj.lowerIsInclusive
                upperIsInclusive = obj.upperIsInclusive
                lower = obj.lower
                upper = obj.upper
            }
            else if (['number','string'].includes(objType)) {
                lowerIsInclusive = true
                upperIsInclusive = true
                lower = obj
                upper = obj
            }
            else 
                throw `obj type (${objType}) cannot be converted to an interval.`    
        }

        this.lowerIsInclusive = lowerIsInclusive
        this.upperIsInclusive = upperIsInclusive
        this.lower = lower
        this.upper = upper
        
        if (this.lower > this.upper) 
            throw 'lower cannot be greater than upper'

        this.length = 
            this.lower == this.upper && this.lowerIsInclusive && this.upperIsInclusive ? 1
            : this.lower == this.upper ? 0
            : Infinity

    }

    // aliases
    get l () { return this.lower }
    set l (value) { this.lower = value }
    get u () { return this.upper }
    set u (value) { this.upper = value }
    get li () { return this.lowerIsInclusive }
    set li (value) { this.lowerIsInclusive = value }
    get ui () { return this.upperIsInclusive }
    set ui (value) { this.upperIsInclusive = value }

    toString() {
        return `${this.lowerIsInclusive ? '⟦' : '⦅'}` + 
            `${this.lower},` + 
            `${this.upper}` + 
            `${this.upperIsInclusive ? '⟧' : '⦆'}` 
    }

}

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

let numbers = 
    new intervals()
    .merge(true, 5, 9, true)
    .merge(false, 7, Infinity, true)
    .merge(true, 1, 3, false)
    .log('Numbers:', true)

let words = 
    new intervals()
    .merge(false, "beach", "node", true)
    .merge(true, "minion", "ponder", true)
    .log('\nWords:', true)

console.log(`\ntests`, [
    !numbers.has(-3),
    !numbers.has(0.5),
    numbers.has(1),
    numbers.has(2.2),
    !numbers.has(3),
    !numbers.has(4),
    numbers.has(5),
    numbers.has(999999),
    numbers.has(Infinity),
])

console.log(`\nwordTtests`, [
    !words.has("apple"),
    !words.has("beach"),
    words.has("monty"),
    words.has("ponder"),
    !words.has("zebra")
])

return 


/*
// 'this' should be bound to a world/room 
function isContinedBy (other) {

    if (other.members !== undefined)
        return other.members(this);

    let thisKeys = Object.keys(this);
    let otherKeys = Object.keys(other);
    
    // If 'other' requires more properties than this even has,
    // then this is certainly not a member of other
    if (thisKeys.length < otherKeys.length)
        return false

    for(let key of otherKeys) {

        thisVal = this[key]
        otherVal = other[key]

        if (key === 'id') 
            continue 

        if (thisVal === undefined)
            return false
        
        // TODO: But they could both be functions, with one having a broader range than the other.
        // We need it so that memberOf takes this into account.
        if (typeof thisVal !== 'range' && typeof otherVal === 'range')
            if (!thisVal)
                return false
            else 
                continue
        if(!eq(thisVal, otherVal))
            return false          

    }

    return true

}
*/

class room {

    add(...items) {

        for(let oItem of items) {

            if (oItem === undefined || oItem === null)
                throw `can't pass undefined or null`
            if (oItem.id === undefined) 
                throw `passed oItem must have an 'id' property`
            if (
                typeof oItem !== 'object' 
                || typeof oItem === 'string' 
                || typeof oItem === 'function' 
                || Array.isArray(oItem)
            )
                throw `passed oItem must be an object in the traditional sense`
            
            if (oItem.isMemberOf === undefined)
                oItem.isMemberOf = isContinedBy
            // Just as you wouldn't overwrite a built-in object 
            // property anywhere else, don't do it here.
            this[oItem.id] = oItem 

        }

        return this

    }

}


let entities = [

    // Presence of members() circumvents normal memberof identification logic
    // I'm using it here to register some primitives
    { id: 'number', members: obj => typeof(obj) === 'number' }, 
    { id: 'bool', members: obj => typeof(obj) === 'boolean' }, 

    // { id: 'mammal', intellect: obj => obj.number, hasFur: obj => obj.bool },
    { id: 'mammal', intellect: obj => obj > 0, hasFur: obj => obj === true },
    { id: 'goldie', intellect: 2, hasFur: false },
    { id: 'rusty', intellect: 4, hasFur: true }
]

let r = new room().add(...entities)

console.log({
    rusty: r.rusty,
    isMammal: r.rusty.isMemberOf(r.mammal)
})

console.log({
    goldie: r.goldie,
    isMammal: r.goldie.isMemberOf(r.mammal)
})
