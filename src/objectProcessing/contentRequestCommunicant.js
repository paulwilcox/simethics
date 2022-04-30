let communicant = require('./communicant.js');

module.exports = class contentRequestCommunicant extends communicant {

    constructor() {
        this.name = 'contentRequest';
        this.sender = null;
        this.searchRegex = null;
        this.searchIntensity = 0;
    }

}