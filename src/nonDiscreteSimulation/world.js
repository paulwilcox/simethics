let fd = require('fluent-data');
let variable = require('./variable');
let solution = require('./solution');

module.exports = class {

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
        this.#processRelationVariables();
    }

    tick(
        
        // pass null to tick until the next element escapes its bounds 
        timeChange = null,
        
        // to prevent infinite loops 
        maxSubTicks = 1000

    ) {

        if (maxSubTicks <= 0) 
            throw 'maxSubTics is exauhsted';

        let earliestEscapeTime = 
            fd(this.#entityMap).reduce({ 
                // TODO: Implement min/max in fluentdata
                minEscape: (accum, mapItem) => mapItem.escapeTime < accum ? mapItem.escapeTime : accum,
                ['minEscape.seed']: Infinity 
            })
            .get()
            .minEscape;

        timeChange = 
            timeChange === null 
            ? earliestEscapeTime 
            : timeChange;

        // tick the individual properties to change their values
        for (let mappedItem of this.#entityMap)
            mappedItem.property.tick(timeChange);

        // TODO: Get the escaping element properties and manage them.
        // Otherwise, you can't go past the first default tick!
        // Below gets the parent elements.  Just to get started.
        // It brings things to mind.  Namely, there may need to be
        // a bubbling up on state change.  Maybe just the property
        // 'dies'.  But maybe the whole element does.
        /*
            let escapingElements = 
                fd(this.#entityMap)
                .filter(mappedItem => 
                    mappedItem.escapeTime == earliestEscapeTime
                )
                .get()
            console.log(escapingProperties.length);
        */
        // It may be more like we send out an hasTicked event
        // for any element to subscribe to, and then it does
        // what it needs.  This is where (from what I recall
        // of it) the 'objectProcessing' work makes attempts.
        // So some sort of merge of these projects.

        // to pass onto the next tick
        let timeOverage = 
            earliestEscapeTime < timeChange
            ? timeChange - earliestEscapeTime
            : 0; 

        return timeOverage > 0
            ? this.tick(timeOverage, maxSubTicks - 1)
            : this;
            
    }

    // TODO: move this to main and then make a real log().
    // Problem is #entityMap is private.
    log () {

        let rnd = (val) => fd.round(val, 1e-4);
        let showEnts = mapItem => ({ 
            name: mapItem.variable.name, 
            value: rnd(mapItem.property.value),
            escapeTime: rnd(mapItem.escapeTime)
        });

        fd(this.#entityMap)
            .log(null, 'Elements before tick', showEnts);

        this.tick()

        fd(this.#entityMap)
            .log(null, 'Elements after tick', showEnts);

    }

    // flattens the variable-level entityMaps so there is a master map
    get #entityMap () {
        let self = this;
        return {
            [Symbol.iterator]: function* () {
                for(let variable of self.variables) {
                    yield* variable.entityMap;
                }
        }};
    }

    #processRelationVariables() {
        // These first two only need to be reprocessed when new 
        // relations are set.  But I believe it's cheap enough to
        // process.  So for the time being at least, they get
        // processed with the rest.
        this.#composeRelationsIntoMaster();
        this.#extractRelationVariables();
        this.#substituteVariableSolutions();
        this.#substitutePropertySolutions();
        this.#calculateEscapeTimes();
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


    // Finds variable identifiers in the master relation string
    // and identifies some of their basic properties.
    #extractRelationVariables() {
        
        let getVariablesFromString = (str,type) => 
            str
            .match(/[A-Z,a-z,_]+/g)
            .map(name => ({ name, type }));

        let _world = this;
        let [sources, targets] = this.masterRelation.split('->')

        this.variables = 
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

        for(let variable of this.variables)
        for(let solution of variable.solutions) {

            solution.substituted = solution.algebraic;

            for(let otherVariable of this.variables) {
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

        for (let mapItem of this.#entityMap) {

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

    // For each caught property, get the earliest positive time for which the 
    // function would result in the value of the property going out of its own boundaries 
    #calculateEscapeTimes() {

        for (let mapItem of this.#entityMap) {

            let earliestEscape = null;
            let prop = mapItem.property;

            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            for (let solution of mapItem.solutions) {
                let escapeTime = prop.getEscapeTime(solution.substituted);
                if (escapeTime != 0 && (earliestEscape == null || escapeTime < earliestEscape))
                    earliestEscape = escapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (earliestEscape == null)
                earliestEscape = 0;

            // boundaries imposed by the giving object
            if (mapItem.variable.isSource) {
                let remainRate = `${mapItem.property.value} - ${mapItem.property.flowRate}`;
                let escapeTime = prop.getEscapeTime(remainRate);
                if (escapeTime < earliestEscape)
                    earliestEscape = escapeTime;
            }

            mapItem.escapeTime = earliestEscape;

        }

    }

}
