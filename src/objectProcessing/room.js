let renameFunc = require('./general.js').renameFunc;

class room extends Array {

    static base = null;
    static loops = 0;
    static maxLoops = null;

    constructor(name) {

        super();

        if (room.base === null)
            room.base = this;

        if (name)
            this.name = name;

        // TODO: Getting the communicants and recievers outside the room 
        // makes coding more managable.  However, can I represent object
        // creation that includes these communicants and recievers in the
        // object set?  When the mind wants to create an object, but 
        // that object represents more of a process or action, or a state
        // of openness, representing communicants (actions) and recievers
        // (listening) is necessary.
        this.communicatons = {}; // { key: { communicants: [], recievers: [] } }

    }

// TODO: Better garbage collection.
// Need to add it to the core array.
// Don't like the way it's happening inside 'recieve'.
// I'd rather clean up anytime the core objects are queried, from anywhere.
// Thinking of overriding symbol.iterator and related, but that may not quite be right. 

    static create (name) { 
        return new room(name); 
    }

    push(...items) {

        for (let item of items) { 
            
            if (typeof item === 'function') 
                throw 'Item should not be a function.  ' + 
                    'Consider a communicator/reciever ' + 
                    'strategy instead.'; 
            else if (item.isReciever === true) 
                this.pushReciever(item);
            else if (item.isCommunicant === true)
                this.pushCommunicant(item);
            else {
                setParent(item, this);
                super.push(item);
            }

        }

        return this;

    }

    pushReciever(name, reciever) {

        if ((typeof name !== 'string' || name instanceof String)) {
            reciever = name;
            name = reciever.name;
            if (!name) 
                throw 'Ad-hoc created reciever must at least have a name';
        }

        if (typeof reciever !== 'function') 
            throw 'reciever must be a function';

        this._addCommunicationKey(name);
        renameFunc(reciever, name);
        reciever.isReciever = true;
        reciever = reciever.bind(this);
        this.communicatons[name].recievers.push(reciever); 
        return this;

    }

    pushCommunicant(name, communicant) {

        if ((typeof name !== 'string' || name instanceof String)) {
            communicant = name;
            name = communicant.name;
            if (!communicant.name) 
                throw 'Ad-hoc created communicant must at least have a name';
        }

        if (typeof communicant === 'function')
            throw 'communicant should not be a function';

        this._addCommunicationKey(name);
        communicant.name = name;
        communicant.isCommunicant = true;
        this.communicatons[name].communicants.push(communicant);            
        return this;

    }

    _addCommunicationKey(key) {
        if (!this.communicatons[key])
            this.communicatons[key] = { 
                recievers: [],
                communicants: []
            };
    }

    recieve () {
        
        // run the core reciever logic
        for (let communication of Object.values(this.communicatons))
        for (let reciever of communication.recievers)
        for (let communicant of communication.communicants) {
            if (!communicant.garbage)
                reciever(communicant);
        }

        // loop object children backwards
        for(let c = this.length - 1; c >= 0; c--) {

            let child = this[c];

            // garbage collect
            if (child.garbage) {
                this.splice(c,1);
                setParent(child, null);
            }
            
            // process the child's recievers
            else if (child.recieve)
                child.recieve();            

        }

        return this;

    }

}

// A true property is polluting console.log 
// (stackoverflow.com/q/37973290)
function setParent(obj, value) {
    Object.defineProperty( 
        obj, 
        'parent', 
        { 
            get: function() { return value; }.bind(value),
            configurable: true
        }
    );
}

module.exports = room;