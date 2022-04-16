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

    push(...children) {
        for (let child of children) { 

            if (typeof child === 'function') {
                this.recievers.push(child.bind(this));
                continue;
            }

            setParent(child, this);
            super.push(child);
            
        }
        return this;
    }

    recieve () {
        
        // loop each reciever and each child object
        for(let reciever of this.recievers)
        for(let c = this.length - 1; c >= 0; c--) {

            let child = this[c];
            
            // process the child's recievers
            if(child.recieve)
                child.recieve();            

            // process the current object's recievers
            reciever(child);

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