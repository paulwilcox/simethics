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
    get u () { return this.upper }
    get li () { return this.lowerIsInclusive }
    get ui () { return this.upperIsInclusive }

    includesInterval(other) {

        if (!other instanceof interval)
            throw `'other' must be an interval`

        // Change in language for brevity and clarity
        let sub = other // sub, as in maybe it's a subset
        let sup = this // same, exept superset
        let lIsInf = (itvl) => itvl.l === -Infinity && itvl.li
        let uIsInf = (itvl) => itvl.u === Infinity && itvl.ui

        return lIsInf(sub) && !lIsInf(sup) ? false
            : uIsInf(sub) && !uIsInf(sup) ? false
            : sub.l < sup.l ? false
            : sub.u > sup.u ? false
            : true 

    }

}

class intervals {
    
    constructor() {
        this.intervals = [] 
    }
    
    /*
        - 'push' isn't right, because we can't do 
          the inverse (or are we going to 'pop' infinitesimals?)
        - Also, we may want to make 'distinct' private and run
          it always on all inserts, so 'merge' may be best.
        - For this strategy, for each incoming, find all overlapping,
          do the distinct, and replace existing overlapping with 
          distinct results.  
    */
    push (...maybeIntervals) {
        for(let maybeInterval of maybeIntervals) {
            
            if (maybeInterval instanceof interval) {
                this.intervals.push(maybeInterval)
                continue
            }

            let nonIntervals = 
                isIterable(maybeInterval) ? maybeInterval : [maybeInterval]

            for(let ni of nonIntervals) {
                let degenerateInterval = new interval(true, ni, ni, true)
                this.intervals.push(degenerateInterval)
            } 

        }    
    }

    // Uses presorting.  
    // So a binary search tree would be more efficient.  
    // Likely implement this though in fluent-data.
    distinct() {

        let result = new intervals()
        let distincts = result.intervals
        let sorted = fd(this.intervals).sort(itv => [itv.l, !itv.li])
        
        for(let incoming of sorted) {

            let lastDistinct = distincts[distincts.length - 1]
            
            if (lastDistinct === null) {
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
                    && whichStartsFirst.ui || whichStartsSecond.li
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

        return result

    }

    // pop
    // includes
    // in
}

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