let nerdamer = require('nerdamer');
require('../node_modules/nerdamer/Algebra.js');
require('../node_modules/nerdamer/Calculus.js');
require('../node_modules/nerdamer/Solve.js');

class _solver {

    constructor(obj) {
        this.value = obj;
    }

    simplify() {
        this.value = nerdamer(`simplify(${this.value})`);
        return this;
    }

    solveFor(...args) {
        this.value = this.value.solveFor(...args);
        return this;
    }

    // nerdamer.eval, except returns undefined on divide-by-zero errors
    evaluate (...args) {
        try {
            this.value = this.value.evaluate(...args);
        }
        catch (e) {
            if (e.message.startsWith('Division by zero is not allowed'))
                this.value = undefined;
        }
        return this;
    }

    evaluateToFloat(...args) {
        try {
            this.value = this.value.evaluate(...args);
            this.value = parseFloat(this.value.toDecimal());
        }
        catch (e) {
            if (e.message.startsWith('Division by zero is not allowed'))
                this.value = undefined;
        }
        return this;
    }

    get() {
        return this.value;
    }

}

function solver (...args) {
    return new _solver(nerdamer(...args));
}
solver.fromNerdamerObj = function (obj) {
    return new _solver(obj);
}

module.exports = solver;