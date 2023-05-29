let fd = require('fluent-data');
let relationVariable = require('./relationVariable');

module.exports = class {

    #world;
    #variables; // private because we want to implement class iteration based on it

    constructor(world) {
        this.#world = world;
        this.#variables = this.#extractRelationVariables();
        this.#substituteVariableSolutions();
    }

    [Symbol.iterator]() {
        return this.#variables[Symbol.iterator]();
    }

    // flattens the variable-level entityMaps so there is a master map
    get entityMap () {
        let self = this;
        return {
            [Symbol.iterator]: function* () {
                for(let variable of self) {
                    yield* variable.entityMap;
                }
        }};
    }

    // Finds variable identifiers in the master relation string
    // and identifies some of their basic properties.
    #extractRelationVariables() {
        
        let getVariablesFromString = (str,type) => 
            str
            .match(/[A-Z,a-z,_]+/g)
            .map(name => ({ name, type }));

            let _world = this.#world;
            let [sources, targets] = _world.masterRelation.split('->')

        let variables = 
            fd([
                ...getVariablesFromString(sources, 'source'),
                ...getVariablesFromString(targets, 'target')
            ])
            .group(v => v.name)
            .reduce({
                world: fd.first(v => _world),
                name: fd.first(v => v.name),
                isSource: (agg,next) => !!agg || next.type === 'source',
                isTarget: (agg,next) => !!agg || next.type === 'target'
            })
            .get(row => new relationVariable(row));

        return variables;

    }    

    // Time-replace variable-level functions with the appropriate summing equations.
    // This will replace everything on the right-hand side, preserving the left hand
    // variable for later parsing at the property-level.  
    #substituteVariableSolutions () {

        for(let variable of this.#variables)
        for(let solution of variable.solutions) {

            solution.substituted = solution.algebraic;

            for(let otherVariable of this.#variables) {
                if (variable.name === otherVariable.name)
                    continue;
                solution.substituted = 
                    solution.substituted.replace(
                        new RegExp(otherVariable.name,'g'),
                        otherVariable.masterFlowRate
                    ); 
            }

        }
    }
}
