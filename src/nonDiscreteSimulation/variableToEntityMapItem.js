module.exports = class entityToVariableMapItem {

    variable;
    entity;
    remainRate;
    solutions = [];

    get property () { return this.entity[this.variable.name]; }
    get flowRate () { return this.property.flowRate; }
    get remainRate () {
        !this.variable.isSource ? undefined
        : `${this.property.value} - ${this.property.flowRate}`;
    }

    constructor(variable, entity) {
        
        this.variable = variable;
        this.entity = entity;

        // maybe this can be worked around in the future (perhaps default to '0'), but not today. 
        if (this.property.flowRate == undefined)
            throw 'flowrate cannot be undefined';

    }
        
}