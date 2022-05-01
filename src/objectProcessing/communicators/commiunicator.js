module.exports = class communicator {
    constructor(
        name,
        communicantMaker,
        reciever
    ) {
        this.name = name;
        this.makeCommunicant = communicantMaker;
        this.reciever = reciever;
    }
}