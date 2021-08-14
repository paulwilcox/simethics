module.exports = function boundNumberMaker(timeRef) {
    return (num) => new boundNumber(timeRef).setValue(num); 
}

class boundNumber {

    constructor(timeRef) {
        
        this.timeRef = timeRef;
        this.value = undefined;
        
        // the abolute bounds 
        this.lower = -Infinity;
        this.upper = Infinity;

        // the bounds per unit of time
        this.extractRate = Infinity;
        this.depositRate = Infinity;

        // aliases
        this.v = this.setValue;
        this.l = this.setLower;
        this.u = this.setUpper;
        this.er = this.setExtractRate;
        this.dr = this.setDepositRate;

    }

    setValue(val) {
        if (val < this.lower)
            throw `Cannot set value to ${val} because lower is ${this.lower}`;
        if (val > this.upper)
            throw `Cannot set value to ${val} because upper is ${this.upper}`;
        this.value = val;
        return this;
    }

    setLower(val) {
        if (val > this.upper) 
            throw `Cannot set lower to ${val} because upper is ${this.upper}`;
        if (val > this.value)
            throw `Cannot set lower to ${val} because value is ${this.value}`;
        this.lower = val;
        return this;
    }

    setUpper(val) {
        if (val < this.lower)
            throw `Cannot set upper to ${val} because lower is ${this.lower}`;
        if (val < this.value)
            throw `Cannot set upper to ${val} because value is ${this.value}`;
        this.upper = val;
        return this;
    }

    setExtractRate(val, timeUnits = 1) {
        this.extractRate = val / timeUnits;
        return this;
    }

    setDepositRate(val, timeUnits = 1) {
        this.depositRate = val / timeUnits;
        return this;
    }

    extract(val = Infinity) {

        if (val < 0)
            return this.deposit(-val, this.timeRef.change);

        if (time === undefined)
            throw `The 'time' parameter is required for an extraction.`;
        
        // only allow extraction according to the permitted rate
        if (val > this.extractRate * this.timeRef.change)
            val = this.extractRate * this.timeRef.change;
        
        // only allow extraction up to the permitted absolute minimum 
        if (this.value - val <= this.lower)
            val = this.value - this.lower;

        this.value -+ this.val;
        return val;

    }

    deposit(val = Infinity) {

        if (val < 0)
            return this.extract(-val, this.timeRef.change);

        if (time === undefined)
            throw `The 'time' parameter is required for a deposit.`;
        
        let excess = 0;

        if (val > this.depositRate * this.timeRef.change) {
            _val = this.depositRate * this.timeRef.change;
            excess += val - _val;
            val = _val;
        }

        if (this.value + val >= this.upper) {
            let _val = this.upper - this.value;
            excess += val - _val;
            val = _val;
        }

        this.value += val;
        return excess;

    }

}

