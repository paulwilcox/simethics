module.exports = function boundNumberMaker(timeRef) {
    return (num) => new boundNumber(timeRef).setValue(num); 
}

class boundNumber {

    constructor(timeRef) {
        
        this.timeRef = timeRef;
        this.value = undefined;
        
        // the absolute bounds 
        this.lower = -Infinity;
        this.upper = Infinity;

        // the bounds per unit of time
        this.flowRate = null; // 5/t 

        // aliases
        this.v = this.setValue;
        this.l = this.setLower;
        this.u = this.setUpper;
        this.f = this.setFlowRate;
        
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

    setFlowRate(fimeFunc) {
        this.flowRate = timeFunc;
        return this;
    }

}

