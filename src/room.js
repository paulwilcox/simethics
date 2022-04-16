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

        this.communicatons = {}; // { key: { communicants: [], recievers: [] } }

    }

    static create (name) { 
        return new room(name); 
    }

    push(...items) {
        for (let item of items) { 
            if (typeof item === 'function')
                throw 'item should not be a function'; // this may change if use case arises
            setParent(item, this);
            super.push(item);            
        }
        return this;
    }

    pushReciever(name, action) {
        if (typeof action !== 'function')
            throw 'reciever action must be a function';
        this._addCommunicationKey(name);
        this.communicatons[name].recievers.push(action.bind(this)); 
        return this;
    }

    pushCommunicant(name, communicant) {
        if (typeof communicant === 'function')
            throw 'communicant should not be a function';
        this._addCommunicationKey(name);
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
        
        for (let communication of Object.values(this.communicatons))
        for (let reciever of communication.recievers)
        for (let communicant of communication.communicants) {
            reciever(communicant);
        }

        // loop object children backwards
        for(let c = this.length - 1; c >= 0; c--) {

            let child = this[c];
            
            // process the child's recievers
            if(child.recieve)
                child.recieve();            

            // garbage collect
            if (child.garbage) {
                this.splice(c,1);
                setParent(child, null);
            }

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