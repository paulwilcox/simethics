module.exports = function boundNumberMaker(timeRef) {
    return (num) => new boundNumber(timeRef).setValue(num); 
}

class boundNumber {

    constructor() {
        
        this.value = undefined;
        this.lower = -Infinity;
        this.upper = Infinity;
        this.flowRate = null; // e.g. '5t'

    }

    getFlowResultFunc (
        direction // '+' or '-'
    ) {
        return `${this.value} ${direction} ${this.flowRate}`; 
    }

    // aliases
    v(val) { this.setValue(val); return this; }
    l(val) { this.setLower(val); return this; }
    u(val) { this.setUpper(val); return this; }
    f(val) { this.setFlowRate(val); return this; }

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

