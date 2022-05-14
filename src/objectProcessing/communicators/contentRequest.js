let communicator = require('./commiunicator.js');

var makeCommunicant = function (
    sender, 
    searchKeysAndIntensities
) { return {
    sender: sender,
    searchKeysAndIntensities // { 'regex1': Number, 'regex2': Number }
}; }

// use non-arrow syntax to allow re-bind to calling obj 
var reciever = function(communicant) {

    if (!communicant.sender) throw 'communicant.sender is not defined';
    if (!communicant.searchKeysAndIntensities) 
        throw 'communicant.searchKeysAndIntensities is not defined';

    let searchers = 
        Object.entries(communicant.searchKeysAndIntensities)
        .map(entry => {
            let regex = new RegExp(entry[0]);
            let intensity = entry[1];
            let test = (itemName) => regex.test(itemName) ? intensity : 0; 
            return { regex, intensity, test }
        });
        
    let maxMatchedIntensity = (itemName) => Math.max(
        ...searchers.map(s => s.test(itemName)) 
    );

    let items = 
        this
        .filter(item => 
            item !== communicant && 
            item !== communicant.sender && 
            !isNaN(item.value) 
        )
        .map(item => {

            let itemClone = JSON.parse(JSON.stringify(item));

            // To model a continuous version of object permanence.
            // To model the requirement to put in effor to see something
            itemClone.value *= maxMatchedIntensity(item.name); 

            return itemClone;

        });

    communicant.sender.pushCommunicant('content response', { items });
    communicant.garbage = true; 

}

class contentRequest extends communicator {

    constructor() {
        super('contentRequest', makeCommunicant, reciever);
    }

}

module.exports = new contentRequest(); 