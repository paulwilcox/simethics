let solver = require('./solver');

module.exports = class {

    name;
    entityMap = [];
    isSource = false;
    isTarget = false;
    funcs = [];
    #world;

    constructor({
        world,
        name, 
        entityMap,
        isTarget,
        funcs
    }) {
        this.#world = world;
        this.name = name;
        this.isSource = this.isSource;
        this.isTarget = isTarget;
        this.funcs = solver(world.masterRelation.replace('->', '='))
            .solveFor(name)
            .get()
            .map(f => new String(`${name} = ${f}`));
    }

}