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

// TODO: replace 'function' with 'range' to implement intermediate type
// Range will allow a better member-of comparison if range1 < range2 can be identified
// Because function1 < function2 cannot be identified
class range {
    constructor(array) {
        if (!Array.isArray(vals)) 
            throw `please pass an array`
    }
}

// 'this' should be a world/room 
function memberOf (other) {

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
        if (typeof thisVal !== 'function' && typeof otherVal === 'function')
            if (!otherVal(thisVal))
                return false
            else 
                continue
        if(!eq(thisVal, otherVal))
            return false          

    }

    return true

}

class room {

    add(...items) {

        for(let item of items) {

            if (item === undefined || item === null)
                throw `can't pass undefined or null`
            if (item.id === undefined) 
                throw `passed item must have an 'id' property`
            if (
                typeof item !== 'object' 
                || typeof item === 'string' 
                || typeof item === 'function' 
                || Array.isArray(item)
            )
                throw `passed item must be an object in the traditional sense`
            
            if (item.memberOf === undefined)
                item.memberOf = memberOf
            // Just as you wouldn't overwrite a built-in object 
            // property anywhere else, don't do it here.
            this[item.id] = item 

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
    isMammal: r.rusty.memberOf(r.mammal)
})

console.log({
    goldie: r.goldie,
    isMammal: r.goldie.memberOf(r.mammal)
})
