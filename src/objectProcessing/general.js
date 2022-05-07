module.exports = {

    // Function names are otherwise read-only.  
    renameFunc: function (func, newName) {
        Object.defineProperty(func, 'name', { value: newName });
    },

    arraySum: function(array, func) {
        let agg = 0;
        for (let element of array) 
            agg += func(element);
        return agg;
    }

}