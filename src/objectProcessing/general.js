module.exports = {

    // Function names are otherwise read-only.  
    renameFunc: function (func, newName) {
        Object.defineProperty(func, 'name', { value: newName });
    }

}