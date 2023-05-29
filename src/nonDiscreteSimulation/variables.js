let fd = require('fluent-data');
let variable = require('./variable');
let solution = require('./solution');

module.exports = class {

    #world;
    #variables; // private because we want to implement class iteration based on it

    constructor(world) {
        this.#world = world;
        this.#variables = this.#extractRelationVariables();
        this.#substituteVariableSolutions();
        this.#substitutePropertySolutions();
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
            .get(row => new variable(row));

        return variables;

    }    

    // Substitute variable-level solutions with the actual values of the 'other' variables
    // - This will replace everything on the right-hand side, preserving the left hand
    //   variable for later parsing at the property-level.  
    // - For instance: 
    //     > Algebraic: happiness = 10*(-rock+3*energy)
    //     > Turns into:   happiness = 10*(-0.5t+3*(5t+3t)) 
    //     > Given that:   rock.flowRate = 0.5t & energyA.flowRate = 5t & energyB.flowRate = 3t
    // - Sort of.  There will probably be more parentheses
    // - Notice that 'happiness', the 'current' variable, is untouched.
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

    // Substitute property-level solutions with the actual values of the 'current' variable
    // - This will finish the job and replace the left hand side of variable-level solutions
    // - For instance:
    //     > Variable-Level: happiness = 10*(-0.5t+3*(5t+3t)) 
    //     > Turns into:     10t = 10*(-0.5t+3*(5t+3t)) 
    //     > Given that:     happiness.flowRate = 10t & there is only 1 happiness entity
    // - If there are other happiness entities, the others get subtracted.  
    // - For instance:
    //     > Variable-Level: happiness = 10*(-0.5t+3*(5t+3t)) 
    //     > Turns into:     7t = 10*(-0.5t+3*(5t+3t)) -3t
    //     > Given that:     happinessA.flowRate = 7t & happinessB.flowRate = 3t & happinessA is current
    #substitutePropertySolutions () {

        for (let mapItem of this.entityMap) {

            let variable = mapItem.variable;

            let masterFlowRateFromOthers = 
                '(' + 
                    variable.entityMap
                    .filter(otherMapItem => otherMapItem != mapItem)
                    .map(otherMapItem => `(${otherMapItem.flowRate})`)
                    .join(' + ') + 
                ')';

            for (let variableSolution of variable.solutions) {
                let propertySolution = new solution();
                propertySolution.substituted = 
                    variableSolution.substituted.replace(
                        new RegExp(variable.name,'g'),
                        mapItem.flowRate
                    );
                propertySolution.substituted += ' - ' + masterFlowRateFromOthers;
                mapItem.solutions.push(propertySolution);
            }

        }

    }
}
