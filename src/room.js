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

        this.communicants = []; // communicating objects
        this.recievers = []; // functions acting on communication objects

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

    pushReciever(...recievers) {
        for (let reciever of recievers) { 
            if (typeof reciever !== 'function')
                throw 'reciever must be a function';
            this.recievers.push(reciever.bind(this));            
        }
        return this;
    }

    pushCommunicant(...communicants) {
        for (let communicant of communicants) { 
            if (typeof communicant === 'function')
                throw 'communicant should not be a function';
            this.communicants.push(communicant);            
        }
        return this;
    }

    recieve () {
        
        for(let reciever of this.recievers)
        for(let communicant of this.communicants) {
            reciever(communicant);
        }

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