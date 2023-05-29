let solver = require('./solver');
let entityToVariableMapItem = require('./entityToVariableMapItem');

module.exports = class {

    name;
    isSource = false; // Is the variable a source in the master relation?
    isTarget = false; // Is the variable a target in the master relation?
    entityMap = []; // What world entities actually relate to the variable (matched using entity property names)
    funcs = []; // The merged relation solved in terms of the variable (multiple possible, usually only one)
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

        // match world entity properties this variable from the master relation. 
        for (let entity of world.entities) 
            if (entity[name] !== undefined) {
                let mapItem = new entityToVariableMapItem (this, entity);
                this.entityMap.push(mapItem);
            }

        // Solve the master relation solved in terms of the variable (multiple possible, usually only one)
        this.funcs = solver(world.masterRelation.replace('->', '='))
            .solveFor(name)
            .get()
            .map(f => new String(`${name} = ${f}`));

    }

}