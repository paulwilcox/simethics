let fd = require('fluent-data');
let variable = require('./variable');
let solution = require('./solution');

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

        let bnLogs = [];
        for(let bn of this.boundNumbers)
        for(let sol of bn.solutions) 
            bnLogs.push({
                bnSol: sol.substituted,
                varName: bn.variable.name,
                varSolAlg: sol.parent.algebraic,
                varSolSub: sol.parent.substituted
            });
        let varsReGrouped = 
            fd(bnLogs)
            .group(bnLog => bnLog.varName)
            .group(bnLog => bnLog.varSolAlg)
            .get()
        
        console.log('')
        console.log('Master Relation:')
        console.log('  ' + this.masterRelation);
        console.log('');
        for(let varSols of varsReGrouped) {
            console.log('Variable: ' + varSols[0][0].varName);
            for(let bnSols of varSols) {
                console.log('  - algebraic: ' + bnSols[0].varSolAlg)
                console.log('  - substituted: ' + bnSols[0].varSolSub)
                for(let row of bnSols) {
                    console.log('      > ' + row.bnSol)
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

    // Substitute boundNumber-level solutions with the actual values of the 'current' variable
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

            for (let variableSolution of variable.solutions) {
                let boundNumberSolution = new solution();
                boundNumberSolution.parent = variableSolution;
                boundNumberSolution.substituted = 
                    variableSolution.substituted.replace(
                        new RegExp(variable.name,'g'),
                        boundNumber.flowRate
                    );
                if (masterFlowRateFromOthers != '()')
                    boundNumberSolution.substituted += ' - ' + masterFlowRateFromOthers;
                boundNumber.solutions.push(boundNumberSolution);
            }

        }

    }

    // For each caught boundNumber, get the earliest positive time for which the 
    // function would result in the value of the boundNumber going out of its own boundaries 
    #calculateEscapeTimes() {

        for (let boundNumber of this.inBoundNumbers) {

            let earliestEscape = null;

            // Get the earliest time that a function escapes caught prop boundaries.
            // When multiple solutions exist, eliminate any that are not applicable.
            // If it is already out of bounds at t = 0, it is not applicable.
            for (let solution of boundNumber.solutions) {
                let escapeTime = boundNumber.getEscapeTime(solution.substituted);
                if (escapeTime != 0 && (earliestEscape == null || escapeTime < earliestEscape))
                    earliestEscape = escapeTime;
            }

            // If no first escape solutions are applicable, set the earliest escape time to 0.
            if (earliestEscape == null)
                earliestEscape = 0;

            // boundaries imposed by the giving object
            if (boundNumber.variable.isSource) {
                let remainRate = `${boundNumber.value} - ${boundNumber.flowRate}`;
                let escapeTime = boundNumber.getEscapeTime(remainRate);
                if (escapeTime < earliestEscape)
                    earliestEscape = escapeTime;
            }

            boundNumber.escapeTime = earliestEscape;

        }

    }

}
