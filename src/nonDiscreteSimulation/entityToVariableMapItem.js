module.exports = class entityToVariableMapItem {

    variable;
    entity;
    get entityPropertyValue () { return this.entity[this.variable.name]; }

    constructor(variable, entity) {
        this.variable = variable;
        this.entity = entity;
    }
        
}