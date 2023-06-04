let fd = require('fluent-data');
let variable = require('./variable');
let variableSolution = require('./variableSolution');
let boundNumberSolution = require('./boundNumberSolution');

module.exports = class {

    masterRelation;
    relations;
    entities;
    variables;

    // flattens the variable-level boundNumbers so there is a master map
    get boundNumbers () {
        let self = this;
        return {
            [Symbol.iterator]: function* () {
                for(let variable of self.variables) {
                    yield* variable.boundNumbers;
                }
        }};
    }

    get inBoundNumbers () {
        let self = this;
        return {
            [Symbol.iterator]: function* () {
                for(let variable of self.variables) {
                    yield* variable.inBoundNumbers;
                }
        }};
    }
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
            fd(this.inBoundNumbers)
                .filter(boundNumber => !boundNumber.hasEscaped)
                .reduce({ 
                    // TODO: Implement min/max in fluentdata
                    minEscape: (accum, boundNumber) => boundNumber.escapeTime < accum ? boundNumber.escapeTime : accum,
                    ['minEscape.seed']: Infinity 
                })
                .get()
                .minEscape;

        if (earliestEscapeTime <= 0) 
            throw 'Cannot tick.  ' + 
                'The escape time for a bound number ' + 
                'with hasEscaped = false has a value <= 0.  ' + 
                'Check your custom onEscape() settings and ' +
                'ensure this is handled properly.';

        timeChange = 
            timeChange === null 
            ? earliestEscapeTime 
            : timeChange;

        // tick the individual properties to change their values
        for (let boundNumber of this.inBoundNumbers) {
            boundNumber.tick(timeChange);
            if (boundNumber.escapeTime == earliestEscapeTime)
                boundNumber.onEscape(boundNumber);
        }

        this.#processRelationVariables();

        // TODO: Other things may depend on each other after
        // changes in values.
        // It may be like we send out a hasTicked event
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

    log (title) {

        let rnd = (val) => fd.round(val, 1e-4);

        fd(this.boundNumbers)
            .log(
                null,
                title, 
                boundNumber => ({ 
                    name: boundNumber.variable.name, 
                    value: rnd(boundNumber.value),
                    upperBound: boundNumber.upperBound,
                    escapeTime: rnd(boundNumber.escapeTime),
                    hasEscaped: boundNumber.hasEscaped
                })
            );

    }

    // this helps track the solution subtitution process
    logSolutions() {

        console.log('')
        console.log('Master Relation:')
        console.log('  ' + this.masterRelation);
        
        console.log('');
        for (let variable of this.variables) {
            console.log('Variable: ' + variable.name);
            for (let varSol of variable.variableSolutions) {
                console.log('  - algebraic: ' + varSol.algebraic); 
                console.log('  - substituted: ' + varSol.substituted); 
                for (let bnSol of varSol.boundNumberSolutions) {
                    console.log('      > ' + bnSol.value)
                    console.log('          escapeTime: ' + bnSol.escapeTime)
                }
            }
        }

    }

    #processRelationVariables() {
        // These first two only need to be reprocessed when new 
        // relations are set.  But I believe it's cheap enough to
        // process.  So for the time being at least, they get
        // processed with the rest.
        this.#composeRelationsIntoMaster();
        this.#extractRelationVariables();
        this.#substituteVariableSolutions();
        this.#substituteBoundNumberSolutions();
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
    //   variable for later parsing at the boundNumber-level.  
    // - For instance: 
    //     > Algebraic: happiness = 10*(-rock+3*energy)
    //     > Turns into:   happiness = 10*(-0.5t+3*(5t+3t)) 
    //     > Given that:   rock.flowRate = 0.5t & energyA.flowRate = 5t & energyB.flowRate = 3t
    // - Sort of.  There will probably be more parentheses
    // - Notice that 'happiness', the 'current' variable, is untouched.
    #substituteVariableSolutions () {

        for(let variable of this.variables)
        for(let variableSolution of variable.variableSolutions) {

            variableSolution.substituted = variableSolution.algebraic;

            for(let otherVariable of this.variables) {
                if (variable.name === otherVariable.name)
                    continue;
                variableSolution.substituted = 
                    variableSolution.substituted.replace(
                        new RegExp(otherVariable.name,'g'),
                        otherVariable.masterFlowRate
                    ); 
            }

        }

    }

    // Take the boundNumber-level solutions and subtract the flowrates of others of the same type
    // - For instance:
    //     > Variable-Level: happiness = 10*(-0.5t+3*(5t+3t)) 
    //     > Turns into:     bnCangeInValue = 10*(-0.5t+3*(5t+3t)) -3t
    //     > Given that:     happinessA.flowRate = 7t & happinessB.flowRate = 3t & happinessA is current
    #substituteBoundNumberSolutions () {

        for (let boundNumber of this.inBoundNumbers) {

            let variable = boundNumber.variable;

            let masterFlowRateFromOthers = 
                '(' + 
                    variable.inBoundNumbers
                    .filter(otherBoundNumber => 
                        otherBoundNumber != boundNumber
                        && !otherBoundNumber.hasEscaped 
                    )
                    .map(otherBoundNumber => `(${otherBoundNumber.flowRate})`)
                    .join(' + ') + 
                ')';

            for (let variableSolution of variable.variableSolutions) {
                
                let solution = new boundNumberSolution();
                solution.variableSolution = variableSolution;
                variableSolution.boundNumberSolutions.push(solution);

                solution.value = 
                    variableSolution.substituted.replace(
                        new RegExp(variable.name,'g'),
                        'bnCangeInValue'
                    );

                if (masterFlowRateFromOthers != '()')
                    solution.value += ' - ' + masterFlowRateFromOthers;

                boundNumber.boundNumberSolutions.push(solution);

            }

        }

    }

    // For each caught boundNumber, get the latest positive time for which the 
    // function would result in the value of the boundNumber going out of its own boundaries 
    #calculateEscapeTimes() {

        for (let boundNumber of this.inBoundNumbers) {

            let latestEscapeTime = 0;
            
            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, get the one that takes the longest to escape. 
            for (let solution of boundNumber.boundNumberSolutions) {
                let escapeTime = boundNumber.getEscapeTime(solution.value);
                solution.escapeTime = escapeTime;
                if (escapeTime > latestEscapeTime)
                    latestEscapeTime = escapeTime;
            }

            boundNumber.escapeTime = latestEscapeTime;

        }

    }

}
