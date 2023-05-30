let solver = require('./solver');
let variableToEntityMapItem = require('./variableToEntityMapItem');
let solution = require('./solution');

module.exports = class {

    name;
    isSource = false; // Is the variable a source in the master relation?
    isTarget = false; // Is the variable a target in the master relation?
    entityMap = []; // What world entities actually relate to the variable (matched using entity property names)
    solutions = []; // The merged relation solved in terms of the variable (multiple possible, usually only one)
    masterFlowRate; // The composition of all flow rates from the mapped entities
    #world;

    constructor({
        world,
        name, 
        isSource,
        isTarget
    }) {

        this.#world = world;
        this.name = name;
        this.isSource = isSource;
        this.isTarget = isTarget;

        // populate this.entityMap
        for (let entity of world.entities) 
            if (entity[name] !== undefined) {
                let mapItem = new variableToEntityMapItem (this, entity);
                this.entityMap.push(mapItem);
            }

        this.solutions = solver(this.#world.masterRelation.replace('->', '='))
            .solveFor(name)
            .get()
            .map(f => {
                let _solution = new solution(); 
                _solution.algebraic = `${name} = ${f}`;
                return _solution;
            })
            
        this.masterFlowRate =
            '(' + 
                this.entityMap
                .map(mapItem => `(${mapItem.flowRate})`)
                .join('+') + 
            ')';

    }

}