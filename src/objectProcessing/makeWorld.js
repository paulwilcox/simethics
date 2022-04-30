module.exports.makeWorld = (name = 'world') => 
    room.create(name)
    .pushReciever(
        'content request',
        function (communicant) {

            if (!communicant.sender) throw 'communicant.sender is not defined';
            if (!communicant.searchRegex) throw 'communicant.searchRegex is not defined';
            if (!communicant.searchIntensity) throw 'communicant.searchIntensity is not defined';

            let searchRegex = new RegExp(communicant.searchRegex);

            let items = 
                this
                .filter(item => 
                    item !== communicant && 
                    item !== communicant.sender && 
                    !isNaN(item.value) && 
                    searchRegex.test(item.name)
                )
                .map(e => {

                    let itemClone = JSON.parse(JSON.stringify(item));
                    
                    // To model a continuous version of object permanence.
                    // To model the requirement to put in effor to see something
                    itemClone.value *= communicant.searchIntensity; 

                    return itemClone;

                });

            communicant.sender.pushCommunicant('content response', { items });
            communicant.garbage = true; 

        }

    );