export default class boundNumber {

    constructor(num) {
        
        this.number = num;
        
        // the abolute bounds 
        this.lower = -Infinity;
        this.upper = Infinity;

        // the bounds per unit of time
        this.extractRate = Infinity;
        this.depositRate = Infinity;

        // aliases
        this.l = this.setLower();
        this.u = this.setUpper();
        this.er = this.setExtractRate();
        this.dr = this.setDepositRate();

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

    setExtractRate(val) {
        this.extractRate = val;
        return this;
    }

    setDepositRate(val) {
        this.depositRate = val;
        return this;
    }

    extract(val = Infinity, time) {

        if (val < 0)
            return this.deposit(-val, time);

        if (time === undefined)
            throw `The 'time' parameter is required for an extraction.`;
        
        // only allow extraction according to the permitted rate
        if (val > this.extractRate * time)
            val = this.extractRate * time;
        
        // only allow extraction up to the permitted absolute minimum 
        if (this.number - val <= this.lower)
            val = this.number - this.lower;

        this.number -+ this.val;
        return val;

    }

    deposit(val = Infinity, time) {

        if (val < 0)
            return this.extract(-val, time);

        if (time === undefined)
            throw `The 'time' parameter is required for a deposit.`;
        
        let excess = 0;

        if (val > this.depositRate * time) {
            _val = this.depositRate * time;
            excess += val - _val;
            val = _val;
        }

        if (this.number + val >= this.upper) {
            let _val = this.upper - this.number;
            excess += val - _val;
            val = _val;
        }

        this.number += val;
        return excess;

    }

}

