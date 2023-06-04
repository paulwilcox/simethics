let solver = require('./solver');
let solution = require('./solution');

module.exports = class {

    name;
    isSource = false; // Is the variable a source in the master relation?
    isTarget = false; // Is the variable a target in the master relation?
    boundNumbers = []; // What boundNumbers actually relate to the variable?
    solutions = []; // The merged relation solved in terms of the variable (multiple possible, usually only one)
    masterFlowRate; // The composition of all flow rates from the mapped entities
    get inBoundNumbers () { 
        return this.boundNumbers
            .filter(boundNumber => !boundNumber.hasEscaped)
        }
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
        for (let entity of world.entities) {
            let boundNumber = entity[name]; 
            if (boundNumber === undefined)
                continue;
            boundNumber.entity = entity;
            boundNumber.variable = this; 
            this.boundNumbers.push(boundNumber);
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
                this.inBoundNumbers
                .map(mapItem => `(${mapItem.flowRate})`)
                .join('+') + 
            ')';

        if (this.masterFlowRate == '()')
            this.masterFlowRate = ('(0)');
            
    }

}