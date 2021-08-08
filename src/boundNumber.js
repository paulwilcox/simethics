export default class boundNumber {

    constructor(num, lower, upper) {
        this.number = num;
        this.lower = -Infinity;
        this.upper = Infinity;
        if (this.lower !== undefined)
            this.setLower(lower);
        if(this.upper !== undefined)
            this.setUpper(upper);
    }

    setLower(val) {
        if (val > this.upper) 
            throw `Cannot set lower to ${val} because upper is ${this.upper}`;
        this.lower = val;
        return this;
    }

    setUpper(val) {
        if (val < this.lower)
            throw `Cannot set upper to ${val} because lower is ${this.lower}`;
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

