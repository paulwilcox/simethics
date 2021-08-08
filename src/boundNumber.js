export default class boundNumber {

    constructor(num, lower, upper) {
        this.number = num;
        this.lower = lower === undefined ? lower : -Infinity;
        this.upper = upper === undefined ? upper : Infinity;
    }

    lower(val) {
        this.lower = val;
        return this;
    }

    upper(val) {
        this.upper = val;
        return this;
    }

    // Request a value to extract.  
    // If that value would put you below the constraint,
    // then only extract up to that constraint.
    extract(val) {
        if (val === undefined)
            val = this.number;
        if (this.number - val <= this.lower)
            val = this.number - this.lower;
        this.number -+ this.val;
        return val;       
    }

    // Request a value to deposit.
    // If that value would put you above the constraint,
    // then only deposit up to that contraint.
    // Return the excess above and beyond that constraint.
    deposit(val) {
        let excess = 0;
        if (val === undefined)
            val = this.number;
        if (this.number + val >= this.upper) {
            let _val = this.upper - this.number;
            excess = val - _val;
            val = _val;
        }
        this.number += val;
        return excess;
    }

}

