let fd = require('fluent-data');
let variables = require('./variables');

module.exports = class world {

    entities;
    relations;
    masterRelation;
    variables;

    constructor(
        entities,
        relations // an array of directional relations (eg. 'w + x <- y + z'
    ) {

        this.entities = entities;        
        this.relations = relations;

        this.#composeRelationsIntoMaster();
        this.variables = new variables(this);
                
        // For each caught property, get the earliest positive time for which the 
        // function would resut in the value of the property going out of own boundaries 
        for (let mapItem of this.variables.entityMap) {

            let firstEscape = null;
            let prop = mapItem.property;

            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            for (let solution of mapItem.solutions) {
                let escapeTime = prop.getFirstEscape(solution.substituted);
                if (escapeTime != 0 && (firstEscape == null || escapeTime < firstEscape))
                    firstEscape = escapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (firstEscape == null)
                firstEscape = 0;

            // boundaries imposed by the giving object
            if (mapItem.remainRate) {
                let escapeTime = prop.getFirstEscape(mapItem.remainRate);
                if (escapeTime < firstEscape)
                    firstEscape = escapeTime;
            }

            mapItem.firstEscape = firstEscape;

        }

    }

    log () {
        console.log(
            fd(this.variables.entityMap)
                .get(mapItem => ({ 
                    name: mapItem.variable.name, 
                    firstEscape: fd.round(mapItem.firstEscape, 1e-4)
                }))
        );
    }

    // Requires an array of arrow-style relations (e.g. 'x + y -> x + w')
    // Returns a composition of the relations        
    #composeRelationsIntoMaster() {

        let sources = [];
        let targets = [];

        for (let relation of this.relations) {
            let parts = 
                relation.includes('<-') ? relation.split('<-').reverse()
                : relation.includes('->') ? relation.split('->')
                : null;
            if (parts == null)
                throw 'All relations must have the -> or <- relator';
            sources.push(`(${parts[0]})`);
            targets.push(`(${parts[1]})`);
        }
        
        this.masterRelation = `${sources.join(' + ')} -> ${targets.join(' + ')}`; 

    }

}