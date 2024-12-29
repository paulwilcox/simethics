let intervals = require('./intervals')

/*
    Implicit Instancing:
    - An instance of a type is not declared.
    - Rather, an entity is declared directly, a type declared seperately, and then an instance is analyzed to determine if it is that type
    // I've learned this is what duck typing is.  

    Intermediate constraints in abstraction:
    - A type system that can constrain in more immediate ways than is typical in languages.
    - For instance, a class typically constrains a variable to be a number, or a string, and so on.
    - Othwerwise, instances on the property are allowed.  So an abstract class can have a number set to '5'. and so on.
    - I'm looking for an abstraction that allows (for instance) a number between 3 and 5.  So that the constraint is neither whole type nor instance
    - At present, the solution is if it's not an instance, then the slot as a function states that the constraint is not complete
*/

function has (parent, child) {
    let childKeys = Object.keys(child)
    let parentKeys = 
        Object.keys(parent)
        .filter(key => key != 'functions')
    
    return parentKeys.every(pKey => {
        let pVal = parent[pKey]
        let cVal = child[pKey]
        if (typeof pVal === 'function')
            return true
        if (!childKeys.includes(pKey))
            return false
        if (pVal.has)
            return pVal.has(cVal)
        return pVal === cVal
    }) 
}

function setParent(child, parent) {
    if (!has(parent, child)) 
        throw ('cannot be parent')
    Object.setPrototypeOf(child, parent)
    if(!Object.keys(child).includes('functions')) 
        child.functions = [];
    // but what if a child funciton should override a parent function?
    for(let func of parent.functions) {
        let bound = func.bind(child)
        child.functions.push(bound)
    }    
}

let posNegHaver = {
    neg: new intervals(true, -Infinity, 0, false),
    pos: new intervals(false, 0, Infinity, true),
    functions: [
        // can't be arrow functions because those set static 'this' meaning
        function(arg) { return arg === 'net' ? this.pos + this.neg : null },
        function(arg) { return arg === 'greet' ? 'hello' : null }
    ],
    net: function(arg) { return arg === 'net' ? this.pos + this.neg : null }
}

let directions = {
    neg: -1,
    zero: 0,
    pos: 3
}

if (has(posNegHaver, directions)) 
    setParent(directions, posNegHaver)

console.log(directions.functions[0]('net'))

return 

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
