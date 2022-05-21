let garbagables = require('./garbagables.js');
let g = require('./general.js');

// TODO: consider renaming 'items' to 'children', and 'allItems' to 'items'

class room {

    static base = null;
    static loops = 0;
    static maxLoops = null;

    constructor(name) {

        if (room.base === null)
            room.base = this;

        if (name)
            this.name = name;

        this.items = new garbagables(this);

        // TODO: Getting the communicants and recievers outside the room 
        // makes coding more managable.  However, can I represent object
        // creation that includes these communicants and recievers in the
        // object set?  When the mind wants to create an object, but 
        // that object represents more of a process or action, or a state
        // of openness, representing communicants (actions) and recievers
        // (listening) is necessary.
        //
        // Hopefully resolved by 'allItems'
        this.communications = {}; // { key: { communicants: [], recievers: [] } }

    }

    static create (name) { 
        return new room(name); 
    }

    get allItems () {
        let result = new garbagables(this);
        result.push(...this.items);
        for(let com of Object.values(this.communications)) {
            result.push(...com.communicants);
            result.push(...com.recievers);
        }
        return result;
    }

    push(...items) {

        for (let item of items) { 
            
            if (typeof item === 'function') 
                throw 'Item should not be a function.  ' + 
                    'Consider a communicator/reciever ' + 
                    'strategy instead.'; 
            
            if (item.isReciever === true)           this.pushReciever(item);
            else if (item.isCommunicant === true)   this.pushCommunicant(item);
            else                                    this.items.push(item);

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
        g.renameFunc(reciever, name);
        reciever.isReciever = true;
        reciever = reciever.bind(this);
        this.communications[name].recievers.push(reciever); 
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
        this.communications[name].communicants.push(communicant);            
        return this;

    }

    _addCommunicationKey(key) {
        if (!this.communications[key])
            this.communications[key] = { 
                recievers: new garbagables(this),
                communicants: new garbagables(this)
            };
    }

    recieve () {
        
        // run the core reciever logic
        for (let communication of Object.values(this.communications))
        for (let reciever of communication.recievers)
        for (let communicant of communication.communicants) 
            reciever(communicant);

        // recurse to children
        for(let item of this.items) {
            if (item.recieve)
                item.recieve();            
        }

        return this;

    }

}

module.exports = room;