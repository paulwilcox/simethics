module.exports = class entityToVariableMapItem {

    variable;
    entity;
    solutions = [];

    get property () { return this.entity[this.variable.name]; }
    get flowRate () { return this.property.flowRate; }

    constructor(variable, entity) {        
        this.variable = variable;
        this.entity = entity;
    }
        
}