let renameFunc = require('../general.js').renameFunc;

module.exports = class communicator {

    constructor(
        name,
        communicantMaker,
        reciever
    ) {
        
        this.name = name;
        
        // Extend communicantMaker so that whatever communicant object 
        // it makes, it has the 'name' and 'isCommunicant' properties.
        let oldMaker = communicantMaker;
        communicantMaker = () => {
            let communicant = oldMaker.apply(this, arguments);
            communicant.name = communicant.name || name;
            communicant.isCommunicant = true;
            return communicant;
        }
        this.makeCommunicant = communicantMaker; // must return a communicant

        renameFunc(reciever, reciever.name || name);
        if (typeof reciever !== 'function')
            throw 'reciever must be a function.';
        reciever.isReciever = true;
        this.reciever = reciever; 

    }

}